"""Google Play subscription verification.

WHY THIS EXISTS
Until now `User.is_premium` was a column nothing ever wrote. The client asked Play whether it
was entitled and kept the answer to itself, which is fine for showing or hiding a button and
worthless as a security boundary — a modified app simply says yes. This is the piece that lets
the SERVER decide, by asking Google directly.

THE ONLY THING THE CLIENT IS TRUSTED WITH IS THE PURCHASE TOKEN, and that is not a claim, it
is a receipt: an opaque string Play issues for a real purchase, which we hand straight back to
Google. A forged token fails verification. A replayed token belongs to whoever bought it, and
is bound to one account here the first time it is seen.

WHAT GOOGLE IS ASKED
purchases.subscriptionsv2.get returns the subscription's state and expiry. We treat
SUBSCRIPTION_STATE_ACTIVE and SUBSCRIPTION_STATE_IN_GRACE_PERIOD as entitled, because a grace
period is Google still trying to take the money and the user has not lost anything yet.
A trial is ACTIVE with a paid-state of "free trial", so the seven-day trial needs no special
handling — it is simply an active subscription that has not been charged yet.

WHAT THIS DELIBERATELY DOES NOT DO
It does not subscribe to Real-Time Developer Notifications. Without RTDN a cancellation is
noticed at the next verification rather than the moment it happens, which is why the stored
entitlement carries an EXPIRY and is re-checked, instead of being a boolean set once and
trusted forever. RTDN is the correct next step and is a Pub/Sub topic plus one more endpoint.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from ..config import Settings
from ..core.errors import AppError

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_PLAY_V2 = (
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
    "/{package}/purchases/subscriptionsv2/tokens/{token}"
)
_SCOPE = "https://www.googleapis.com/auth/androidpublisher"

# Google's own names for the states we accept. Grace period counts: the subscription has not
# lapsed, Google is simply retrying payment, and taking the app away mid-retry punishes a user
# whose card expired rather than one who cancelled.
_ENTITLING_STATES = {
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
}


class BillingNotConfigured(AppError):
    """No service-account credentials. A deployment gap, not a user problem."""

    status_code = 503
    code = "billing_not_configured"


class VerificationFailed(AppError):
    """Google refused the token, or it is not for this app."""

    status_code = 400
    code = "purchase_invalid"


class BillingUnavailable(AppError):
    """Google could not be reached. Distinct from 'your purchase is bad'."""

    status_code = 503
    code = "billing_unavailable"


def _credentials(settings: Settings) -> Dict[str, Any]:
    raw = settings.play_service_account_json
    if not raw:
        raise BillingNotConfigured("Play verification is not configured on this server.")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        # Never echo the value — it is a private key.
        raise BillingNotConfigured("PLAY_SERVICE_ACCOUNT_JSON is not valid JSON.") from exc


async def _access_token(settings: Settings) -> str:
    """Mint a short-lived access token from the service account.

    google-auth builds and signs the JWT. Doing that by hand would mean implementing RS256
    signing and clock-skew handling in a file whose failure mode is "anyone gets premium".
    """
    try:
        from google.oauth2 import service_account          # noqa: WPS433 - optional dependency
        from google.auth.transport.requests import Request  # noqa: WPS433
    except ImportError as exc:                              # pragma: no cover - env-dependent
        raise BillingNotConfigured(
            "google-auth is not installed on this server; Play verification cannot run."
        ) from exc

    info = _credentials(settings)
    try:
        creds = service_account.Credentials.from_service_account_info(info, scopes=[_SCOPE])
        # Blocking, but only on a token refresh (roughly hourly), not per request.
        creds.refresh(Request())
        return creds.token
    except Exception as exc:  # noqa: BLE001 - any credential failure is one failure to us
        logger.warning("play credential refresh failed: %s", type(exc).__name__)
        raise BillingNotConfigured("Play credentials were rejected by Google.") from exc


def _expiry(payload: Dict[str, Any]) -> Optional[datetime]:
    """When this entitlement stops being true.

    subscriptionsv2 puts the expiry on the line item, not the top level, because a
    subscription can carry several. The furthest one out is the one that matters.
    """
    latest: Optional[datetime] = None
    for item in payload.get("lineItems") or []:
        raw = item.get("expiryTime")
        if not raw:
            continue
        try:
            when = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except ValueError:
            continue
        if latest is None or when > latest:
            latest = when
    return latest


async def verify_subscription(settings: Settings, purchase_token: str) -> Dict[str, Any]:
    """Ask Google about a purchase token.

    Returns {entitled, state, expires_at, in_trial}. Raises rather than returning a falsy
    result when the answer is "we could not find out", so a Google outage can never be
    mistaken for "this user is not premium" and silently revoke a paying customer.
    """
    if not settings.play_package_name:
        raise BillingNotConfigured("PLAY_PACKAGE_NAME is not set.")

    token = await _access_token(settings)
    url = _PLAY_V2.format(package=settings.play_package_name, token=purchase_token)

    try:
        async with httpx.AsyncClient(timeout=settings.play_timeout_seconds) as client:
            resp = await client.get(url, headers={"Authorization": "Bearer " + token})
    except httpx.HTTPError as exc:
        logger.warning("play verify transport error: %s", type(exc).__name__)
        raise BillingUnavailable("Couldn't reach Google Play just now.") from exc

    if resp.status_code in (400, 404, 410):
        # Google knows this token and says it is not valid for this app.
        raise VerificationFailed("That purchase could not be verified.")
    if resp.status_code == 401 or resp.status_code == 403:
        # OUR credentials are wrong, not the user's purchase. Saying "your purchase is
        # invalid" here would send the user to support for a problem only we can fix.
        logger.error("play verify rejected our credentials: %s", resp.status_code)
        raise BillingNotConfigured("This server is not authorised to verify purchases.")
    if resp.status_code >= 500:
        raise BillingUnavailable("Google Play is unavailable right now.")
    if resp.status_code != 200:
        raise BillingUnavailable("Unexpected response from Google Play.")

    payload = resp.json()
    state = str(payload.get("subscriptionState") or "")
    expires = _expiry(payload)

    # Belt and braces: an ACTIVE state with an expiry in the past is not entitlement. Clock
    # skew between Google and us is seconds; this only rejects genuinely stale records.
    if expires is not None and expires <= datetime.now(timezone.utc):
        entitled = False
    else:
        entitled = state in _ENTITLING_STATES

    in_trial = any(
        (item.get("offerDetails") or {}).get("offerTags") or []
        and "trial" in json.dumps(item.get("offerDetails") or {}).lower()
        for item in (payload.get("lineItems") or [])
    )

    return {
        "entitled": entitled,
        "state": state or "UNKNOWN",
        "expires_at": expires.isoformat() if expires else None,
        "in_trial": bool(in_trial),
    }
