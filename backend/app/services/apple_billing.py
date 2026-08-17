"""Apple StoreKit 2 transaction verification.

    verify_transaction(settings, signed_transaction) -> the same dict play_billing returns

WHY LOCAL VERIFICATION AND NOT THE APP STORE SERVER API. StoreKit 2 hands the client a JWS —
a signed statement from Apple about a transaction — and the signature is the proof. Verifying it
here needs no Apple credentials, no network call, and cannot be knocked out by an Apple API
outage. The Server API is still worth adding later for refunds and renewal state, but it is not
required to answer "did this person actually buy this".

THE SIGNATURE IS THE WHOLE SECURITY BOUNDARY. A JWS payload is base64 — anyone can write
`{"productId": "ignyt_premium.yearly"}` and send it. What they cannot do is sign it with Apple's
private key. So this module refuses every shortcut that would skip the chain:

  * the certificate chain in the x5c header is verified up to Apple's root, which must be
    supplied out of band (APPLE_ROOT_CA_PATH). No root, no verification, no entitlement.
  * the leaf's signature over `header.payload` is checked with ES256.
  * only then is the payload read, and its bundleId must match ours — a validly signed
    transaction for SOMEBODY ELSE'S APP is still not a purchase of ours.

FAIL CLOSED. Every failure path raises rather than returning a default. A verifier that returns
"not entitled" on error is safe; one that returns "entitled" on error, or silently skips a step
it could not perform, hands out the product for free. The one thing that must never happen is a
missing root certificate quietly degrading into "trust whatever was sent".
"""

from __future__ import annotations

import base64
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils as asym_utils

from ..config import Settings
from ..core.errors import AppError

logger = logging.getLogger(__name__)


class AppleBillingNotConfigured(AppError):
    """No Apple root certificate, so nothing can be verified."""

    status_code = 503
    code = "apple_billing_not_configured"


class AppleVerificationFailed(AppError):
    """The JWS did not verify, or is not for this app."""

    status_code = 400
    code = "apple_verification_failed"


def _b64url(segment: str) -> bytes:
    """JWS uses base64url without padding; Python's decoder insists on padding."""
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def _load_chain(x5c: List[str]) -> List[x509.Certificate]:
    if not x5c:
        raise AppleVerificationFailed("Transaction carries no certificate chain.")
    try:
        # x5c entries are standard base64 DER (NOT base64url) per RFC 7515.
        return [x509.load_der_x509_certificate(base64.b64decode(c)) for c in x5c]
    except Exception as exc:  # noqa: BLE001 - any parse failure is a refusal
        raise AppleVerificationFailed("Certificate chain could not be read.") from exc


def _verify_chain(chain: List[x509.Certificate], root: x509.Certificate) -> x509.Certificate:
    """Walk leaf -> ... -> root, checking each signature and each validity window.

    Returns the leaf, whose public key signs the JWS. The chain Apple sends is
    [leaf, intermediate, root]; the root it sends is NOT trusted on its own -- it is compared
    against the one we hold, because a chain that vouches for itself proves nothing.
    """
    now = datetime.now(timezone.utc)
    for cert in chain:
        if cert.not_valid_before_utc > now or cert.not_valid_after_utc < now:
            raise AppleVerificationFailed("A certificate in the chain is not currently valid.")

    if chain[-1].fingerprint(hashes.SHA256()) != root.fingerprint(hashes.SHA256()):
        raise AppleVerificationFailed("Chain does not terminate at the expected Apple root.")

    for i in range(len(chain) - 1):
        child, parent = chain[i], chain[i + 1]
        try:
            parent.public_key().verify(
                child.signature,
                child.tbs_certificate_bytes,
                ec.ECDSA(child.signature_hash_algorithm),
            )
        except InvalidSignature as exc:
            raise AppleVerificationFailed("Certificate chain signature is invalid.") from exc
    return chain[0]


def _verify_signature(leaf: x509.Certificate, header_b64: str, payload_b64: str, sig_b64: str) -> None:
    """ES256 over `header.payload`.

    JWS packs an ECDSA signature as r||s, fixed width. cryptography wants DER, so the halves are
    re-encoded rather than passed through -- handing it the raw form fails in a way that looks
    like a bad signature rather than a format mistake, which is a miserable thing to debug.
    """
    raw = _b64url(sig_b64)
    if len(raw) != 64:
        raise AppleVerificationFailed("Signature is not the expected ES256 length.")
    r = int.from_bytes(raw[:32], "big")
    s = int.from_bytes(raw[32:], "big")
    try:
        leaf.public_key().verify(
            asym_utils.encode_dss_signature(r, s),
            f"{header_b64}.{payload_b64}".encode("ascii"),
            ec.ECDSA(hashes.SHA256()),
        )
    except InvalidSignature as exc:
        raise AppleVerificationFailed("Transaction signature is invalid.") from exc


def _millis(value: Any) -> Optional[datetime]:
    """Apple sends epoch MILLISECONDS. Treating them as seconds puts expiry in 1970 and
    revokes every paying subscriber, so the unit is converted explicitly."""
    if value in (None, ""):
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000.0, tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


def verify_transaction(settings: Settings, signed_transaction: str) -> Dict[str, Any]:
    """Verify a StoreKit 2 JWS and report entitlement in play_billing's shape.

    Returning the same keys is deliberate: routes_billing already knows how to store
    entitled/expires_at/state/in_trial, and a second shape would mean a second code path
    through the part of the server that decides who has paid for what.
    """
    root_path = getattr(settings, "apple_root_ca_path", None)
    if not root_path:
        raise AppleBillingNotConfigured("Apple root certificate is not configured.")
    try:
        with open(root_path, "rb") as fh:
            root = x509.load_der_x509_certificate(fh.read())
    except Exception as exc:  # noqa: BLE001
        raise AppleBillingNotConfigured("Apple root certificate could not be read.") from exc

    parts = signed_transaction.split(".")
    if len(parts) != 3:
        raise AppleVerificationFailed("Malformed transaction.")
    header_b64, payload_b64, sig_b64 = parts

    try:
        header = json.loads(_b64url(header_b64))
    except Exception as exc:  # noqa: BLE001
        raise AppleVerificationFailed("Transaction header could not be read.") from exc
    if header.get("alg") != "ES256":
        # Refusing anything else is what stops the classic "alg": "none" downgrade.
        raise AppleVerificationFailed("Unexpected signing algorithm.")

    leaf = _verify_chain(_load_chain(header.get("x5c") or []), root)
    _verify_signature(leaf, header_b64, payload_b64, sig_b64)

    # Only now is the payload worth reading.
    try:
        claims = json.loads(_b64url(payload_b64))
    except Exception as exc:  # noqa: BLE001
        raise AppleVerificationFailed("Transaction payload could not be read.") from exc

    expected_bundle = getattr(settings, "apple_bundle_id", None)
    if expected_bundle and claims.get("bundleId") != expected_bundle:
        # Correctly signed, genuinely Apple -- and for a different app.
        raise AppleVerificationFailed("Transaction is for a different application.")

    expires = _millis(claims.get("expiresDate"))
    revoked = _millis(claims.get("revocationDate"))
    now = datetime.now(timezone.utc)

    entitled = revoked is None and expires is not None and expires > now
    state = "revoked" if revoked else ("active" if entitled else "expired")

    return {
        "entitled": entitled,
        "expires_at": expires.isoformat() if expires else None,
        "state": state,
        # offerType 1 is an introductory offer, which is how the 7-day free trial arrives.
        "in_trial": claims.get("offerType") == 1,
        # Short, stable, and the same across renewals -- the right key for "who owns this
        # subscription", where the multi-kilobyte JWS is not.
        "original_transaction_id": claims.get("originalTransactionId"),
        "product_id": claims.get("productId"),
    }
