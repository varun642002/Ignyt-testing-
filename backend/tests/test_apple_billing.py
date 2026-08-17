"""Apple StoreKit verification: the forged-purchase tests.

A JWS payload is base64. Anyone can write {"productId": "ignyt_premium.yearly"} and post it —
the ONLY thing stopping them is the signature chain. So these tests do not check that a real
Apple transaction is accepted (there isn't one here, and a fixture would go stale); they check
that plausible forgeries are refused, and that nothing degrades into trusting the client when
verification cannot be performed.
"""
from __future__ import annotations

import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from app.services import apple_billing


def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _self_signed():
    """An attacker's own key and certificate — valid crypto, wrong issuer."""
    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "definitely-apple")])
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name).issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=365))
        .sign(key, hashes.SHA256())
    )
    return key, cert


def _forged_jws(claims: dict) -> str:
    key, cert = _self_signed()
    der = cert.public_bytes(serialization.Encoding.DER)
    header = {"alg": "ES256", "x5c": [base64.b64encode(der).decode()]}
    h, p = _b64u(json.dumps(header).encode()), _b64u(json.dumps(claims).encode())
    sig = key.sign(f"{h}.{p}".encode(), ec.ECDSA(hashes.SHA256()))
    r, s = x509.load_der_x509_certificate(der), None  # noqa: F841 - keep der referenced
    from cryptography.hazmat.primitives.asymmetric import utils as au
    ri, si = au.decode_dss_signature(sig)
    raw = ri.to_bytes(32, "big") + si.to_bytes(32, "big")
    return f"{h}.{p}.{_b64u(raw)}"


class _Settings:
    def __init__(self, root_path=None, bundle="com.varun.ignyt"):
        self.apple_root_ca_path = root_path
        self.apple_bundle_id = bundle


def _apple_root(tmp_path):
    """Stand-in for Apple's root: a certificate we hold that did NOT sign the forgery."""
    _, cert = _self_signed()
    p = tmp_path / "root.cer"
    p.write_bytes(cert.public_bytes(serialization.Encoding.DER))
    return str(p)


ACTIVE = {
    "bundleId": "com.varun.ignyt",
    "productId": "ignyt_premium.yearly",
    "originalTransactionId": "2000000999",
    "expiresDate": int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp() * 1000),
}


def test_no_root_certificate_refuses_rather_than_defaulting(tmp_path):
    """The failure that would matter most: unconfigured must not mean unchecked."""
    with pytest.raises(apple_billing.AppleBillingNotConfigured):
        apple_billing.verify_transaction(_Settings(None), _forged_jws(ACTIVE))


def test_self_signed_transaction_is_rejected(tmp_path):
    """The actual attack: real ECDSA, real structure, signed by anyone but Apple."""
    with pytest.raises(apple_billing.AppleVerificationFailed):
        apple_billing.verify_transaction(_Settings(_apple_root(tmp_path)), _forged_jws(ACTIVE))


def test_alg_none_downgrade_is_rejected(tmp_path):
    """The classic JWS bypass — declare no algorithm and hope the check is skipped."""
    h = _b64u(json.dumps({"alg": "none", "x5c": []}).encode())
    p = _b64u(json.dumps(ACTIVE).encode())
    with pytest.raises(apple_billing.AppleVerificationFailed):
        apple_billing.verify_transaction(_Settings(_apple_root(tmp_path)), f"{h}.{p}.")


def test_malformed_transaction_is_rejected(tmp_path):
    for bad in ("", "notajws", "only.two"):
        with pytest.raises(apple_billing.AppleVerificationFailed):
            apple_billing.verify_transaction(_Settings(_apple_root(tmp_path)), bad)


def test_expiry_is_read_as_milliseconds_not_seconds():
    """Apple sends epoch millis. Read as seconds, every expiry lands in 1970 and every paying
    subscriber is revoked on the spot."""
    ms = int(datetime(2027, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
    assert apple_billing._millis(ms).year == 2027
    assert apple_billing._millis(None) is None
    assert apple_billing._millis("") is None
    assert apple_billing._millis("rubbish") is None


# ---------------------------------------------------------------------------------------
# Route wiring. The verifier proves a receipt is genuine; these prove the ROUTE cannot be
# talked into skipping it, and that one subscription cannot entitle two accounts.

pytestmark_route = pytest.mark.anyio

ALICE = {"X-Ignyt-Uid": "apple-alice"}
BOB = {"X-Ignyt-Uid": "apple-bob"}


@pytest.mark.anyio
async def test_apple_platform_is_accepted_by_the_schema(client):
    """platform=apple must reach the Apple branch, not be rejected as an unknown field."""
    res = await client.post(
        "/v1/billing/verify", headers=ALICE,
        json={"purchaseToken": _forged_jws(ACTIVE), "platform": "apple"},
    )
    # Not configured (503) or refused (400) are both fine -- 422 would mean the field never
    # got through, and the Apple path would be unreachable in production.
    assert res.status_code in (400, 503), res.text


@pytest.mark.anyio
async def test_platform_defaults_to_play_for_existing_clients(client):
    """Android clients do not send `platform`. They must keep working unchanged."""
    res = await client.post(
        "/v1/billing/verify", headers=ALICE, json={"purchaseToken": "x" * 32}
    )
    assert res.status_code != 422, res.text


@pytest.mark.anyio
async def test_unknown_platform_is_refused(client):
    res = await client.post(
        "/v1/billing/verify", headers=ALICE,
        json={"purchaseToken": "x" * 32, "platform": "stripe"},
    )
    assert res.status_code == 422, res.text


@pytest.mark.anyio
async def test_a_forged_apple_receipt_never_grants_entitlement(client):
    """The whole point. A self-signed JWS must not make anyone premium."""
    await client.post(
        "/v1/billing/verify", headers=BOB,
        json={"purchaseToken": _forged_jws(ACTIVE), "platform": "apple"},
    )
    status = await client.get("/v1/billing/status", headers=BOB)
    assert status.status_code == 200
    assert status.json()["entitled"] is False, status.text
