"""Purchase verification and the entitlement the rest of the server trusts.

    POST /v1/billing/verify    client presents a Play purchase token; we ask Google
    GET  /v1/billing/status    what this server currently believes, and why

THE CLIENT NEVER ASSERTS ENTITLEMENT. It presents a receipt. Everything else on the server —
the AI gate included — reads `is_entitled()` below, which is derived from what Google said and
when, never from anything the app claimed.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import current_user
from ..config import Settings, get_settings
from ..core.errors import AppError
from ..db.models import User
from ..db.session import get_db
from ..services import play_billing

logger = logging.getLogger(__name__)
router = APIRouter(tags=["billing"])


class PurchaseAlreadyClaimed(AppError):
    """This token belongs to a different account."""

    status_code = 409
    code = "purchase_claimed"


class VerifyRequest(BaseModel):
    # Play tokens are long opaque strings. Bounded so a hostile client cannot post a novel.
    purchaseToken: str = Field(min_length=8, max_length=512)


class EntitlementResponse(BaseModel):
    entitled: bool
    source: Optional[str] = None
    expires_at: Optional[str] = None
    state: Optional[str] = None
    in_trial: bool = False


def is_entitled(user: User) -> bool:
    """The single answer the rest of the server uses.

    DERIVED, NOT STORED. is_premium alone would keep a cancelled subscriber premium forever,
    because nothing tells us the moment they cancel — there is no RTDN listener yet. Reading
    the expiry on every check means a lapsed subscription stops being entitled by itself, with
    no job to run and nothing to go wrong if the service was down when it happened.
    """
    if not user.is_premium:
        return False
    if user.premium_expires_at is None:
        return True                      # non-expiring grant (manual/test), still explicit
    expires = user.premium_expires_at
    if expires.tzinfo is None:           # SQLite hands back naive datetimes
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > datetime.now(timezone.utc)


def needs_recheck(user: User, hours: int) -> bool:
    if user.premium_last_checked_at is None:
        return True
    last = user.premium_last_checked_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - last > timedelta(hours=hours)


@router.post("/billing/verify", response_model=EntitlementResponse)
async def verify_purchase(
    body: VerifyRequest,
    user: User = Depends(current_user),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> EntitlementResponse:
    """Verify a Play purchase token and record what Google said."""
    # A token belongs to whoever first verified it. Without this, one purchase could be pasted
    # into any number of accounts — the single most obvious way to get premium for free.
    clash = (
        await db.execute(
            select(User).where(
                User.play_purchase_token == body.purchaseToken, User.id != user.id
            )
        )
    ).scalar_one_or_none()
    if clash is not None:
        logger.warning("purchase token replay attempt by user %s", user.id)
        raise PurchaseAlreadyClaimed("That purchase is already linked to another account.")

    result = await play_billing.verify_subscription(settings, body.purchaseToken)

    user.play_purchase_token = body.purchaseToken
    user.is_premium = bool(result["entitled"])
    user.premium_source = "play"
    user.premium_last_checked_at = datetime.now(timezone.utc)
    user.premium_expires_at = (
        datetime.fromisoformat(result["expires_at"]) if result.get("expires_at") else None
    )
    await db.commit()

    return EntitlementResponse(
        entitled=is_entitled(user),
        source="play",
        expires_at=result.get("expires_at"),
        state=result.get("state"),
        in_trial=bool(result.get("in_trial")),
    )


@router.get("/billing/status", response_model=EntitlementResponse)
async def billing_status(
    user: User = Depends(current_user),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> EntitlementResponse:
    """What this server believes right now, re-checking with Google when the answer is stale.

    A failed re-check does NOT revoke access. Google being unreachable is our problem, and
    taking the app away from a paying subscriber during someone else's outage is the worst
    possible reading of "we could not confirm".
    """
    if user.play_purchase_token and needs_recheck(user, settings.play_recheck_hours):
        try:
            result = await play_billing.verify_subscription(settings, user.play_purchase_token)
            user.is_premium = bool(result["entitled"])
            user.premium_last_checked_at = datetime.now(timezone.utc)
            user.premium_expires_at = (
                datetime.fromisoformat(result["expires_at"]) if result.get("expires_at") else None
            )
            await db.commit()
        except AppError as exc:
            logger.info("entitlement re-check skipped: %s", getattr(exc, "code", "error"))

    return EntitlementResponse(
        entitled=is_entitled(user),
        source=user.premium_source,
        expires_at=user.premium_expires_at.isoformat() if user.premium_expires_at else None,
    )
