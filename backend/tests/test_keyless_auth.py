"""
Keyless Firebase ID-token verification, tested by forging tokens.

The only honest way to test an authentication check is to attack it. Every case below mints a
REAL RSA-signed JWT with one thing wrong and asserts it is refused — a test that only feeds it
a valid token proves nothing, because a function that returns the claims unconditionally would
pass it.

The signing key here is generated in-process and its certificate is injected into the cache, so
nothing touches the network and no Google credentials exist anywhere in this file.

`test_forged_issuer_is_rejected` is the load-bearing one. google.auth.jwt.decode ignores `iss`
entirely, so that check lives in our code and nothing but this test holds it there.
"""
from __future__ import annotations

import base64
import json
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from google.auth import crypt, jwt as google_jwt

from app.auth import firebase as fb
from app.config import Settings
from app.core.errors import Unauthorized

PROJECT = "ignyt-fitness2"
KID = "test-signing-key"


def _keypair(kid: str = KID):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    signer = crypt.RSASigner.from_string(pem, kid)
    pub = key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return signer, pub


@pytest.fixture()
def signing(monkeypatch):
    """A signer, plus its cert wired into the cache so no HTTP happens."""
    signer, pub = _keypair()
    monkeypatch.setattr(fb, "_cert_cache", _StubCache({KID: pub}))
    return signer


class _StubCache:
    def __init__(self, certs):
        self.certs = certs
        self.refreshes = 0

    def get(self, *, force_refresh=False):
        if force_refresh:
            self.refreshes += 1
        return self.certs


def _settings(project_id: str = PROJECT) -> Settings:
    return Settings(
        AUTH_MODE="firebase",
        FIREBASE_CREDENTIALS="",
        FIREBASE_PROJECT_ID=project_id,
    )


def _claims(**overrides) -> dict:
    now = int(time.time())
    base = {
        "iss": "https://securetoken.google.com/" + PROJECT,
        "aud": PROJECT,
        "sub": "firebase-uid-abc123",
        "iat": now - 60,
        "exp": now + 3600,
        "auth_time": now - 60,
        "email": "varun@example.com",
    }
    base.update(overrides)
    return base


def _token(signer, claims=None, *, kid=KID, alg="RS256") -> str:
    tok = google_jwt.encode(signer, claims or _claims(), header={"kid": kid, "alg": alg})
    return tok.decode() if isinstance(tok, bytes) else tok


# --------------------------------------------------------------------------------------------
# The happy path
# --------------------------------------------------------------------------------------------

def test_valid_token_is_accepted(signing):
    out = fb.verify_id_token(_token(signing), _settings())
    assert out["uid"] == "firebase-uid-abc123"
    assert out["email"] == "varun@example.com"


def test_uid_mirrors_sub(signing):
    """deps.py reads claims['uid']; the raw JWT only has 'sub'. Mapping it is what keeps the
    keyless path a drop-in for firebase_admin."""
    out = fb.verify_id_token(_token(signing, _claims(sub="someone-else")), _settings())
    assert out["uid"] == out["sub"] == "someone-else"


# --------------------------------------------------------------------------------------------
# Binding the token to THIS project. Google signs every Firebase project with one key, so
# these two claims are the entire difference between authentication and an open door.
# --------------------------------------------------------------------------------------------

def test_another_projects_token_is_rejected(signing):
    """Correctly signed, unexpired, real — but minted for a different Firebase project."""
    with pytest.raises(Unauthorized):
        fb.verify_id_token(_token(signing, _claims(aud="some-other-app")), _settings())


def test_forged_issuer_is_rejected(signing):
    """google.auth.jwt.decode does NOT check iss — proven by forging one. This check exists
    only in our code, and only this test keeps it there."""
    with pytest.raises(Unauthorized):
        fb.verify_id_token(
            _token(signing, _claims(iss="https://securetoken.google.com/attacker-project")),
            _settings(),
        )


def test_issuer_must_match_exactly_not_merely_contain(signing):
    with pytest.raises(Unauthorized):
        fb.verify_id_token(
            _token(signing, _claims(iss="https://evil.example.com/" + PROJECT)),
            _settings(),
        )


# --------------------------------------------------------------------------------------------
# Signature
# --------------------------------------------------------------------------------------------

def test_token_signed_by_a_different_key_is_rejected(signing):
    """The attacker signs a perfectly-shaped token with their own key and presents our kid."""
    other_signer, _ = _keypair()
    with pytest.raises(Unauthorized):
        fb.verify_id_token(_token(other_signer), _settings())


def test_alg_none_is_rejected(signing):
    """The classic JWT attack: claim no algorithm and send an empty signature."""
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "none", "kid": KID}).encode()
    ).rstrip(b"=")
    payload = base64.urlsafe_b64encode(json.dumps(_claims()).encode()).rstrip(b"=")
    with pytest.raises(Unauthorized):
        fb.verify_id_token((header + b"." + payload + b".").decode(), _settings())


def test_non_rs256_algorithm_is_rejected(signing):
    with pytest.raises(Unauthorized):
        fb.verify_id_token(_token(signing, alg="HS256"), _settings())


def test_unknown_kid_is_rejected_after_a_refresh(monkeypatch):
    """An unrecognised key id triggers one refetch — then it really is invalid."""
    signer, pub = _keypair(kid="rotated-away")
    cache = _StubCache({KID: pub})
    monkeypatch.setattr(fb, "_cert_cache", cache)
    with pytest.raises(Unauthorized):
        fb.verify_id_token(_token(signer, kid="rotated-away"), _settings())
    assert cache.refreshes == 1, "should refetch once before giving up"


def test_key_rotation_recovers_without_logging_users_out(monkeypatch):
    """Google publishes a new signing key; our cache is stale. The refetch must rescue it,
    otherwise every user is signed out until the cache expires."""
    signer, pub = _keypair(kid="brand-new-key")

    class RotatingCache(_StubCache):
        def get(self, *, force_refresh=False):
            if force_refresh:
                self.refreshes += 1
                self.certs = {"brand-new-key": pub}   # Google's new key appears
            return self.certs

    cache = RotatingCache({"old-key": b"-----BEGIN PUBLIC KEY-----\nstale\n-----END PUBLIC KEY-----\n"})
    monkeypatch.setattr(fb, "_cert_cache", cache)
    out = fb.verify_id_token(_token(signer, kid="brand-new-key"), _settings())
    assert out["uid"] == "firebase-uid-abc123"
    assert cache.refreshes == 1


def test_garbage_is_rejected(signing):
    for junk in ["", "not-a-token", "a.b.c", "...", "Bearer something"]:
        with pytest.raises(Unauthorized):
            fb.verify_id_token(junk, _settings())


# --------------------------------------------------------------------------------------------
# Time
# --------------------------------------------------------------------------------------------

def test_expired_token_is_rejected(signing):
    now = int(time.time())
    with pytest.raises(Unauthorized):
        fb.verify_id_token(
            _token(signing, _claims(iat=now - 7200, exp=now - 3600)), _settings()
        )


def test_token_issued_in_the_future_is_rejected(signing):
    now = int(time.time())
    with pytest.raises(Unauthorized):
        fb.verify_id_token(
            _token(signing, _claims(iat=now + 3600, exp=now + 7200)), _settings()
        )


def test_future_auth_time_is_rejected(signing):
    with pytest.raises(Unauthorized):
        fb.verify_id_token(
            _token(signing, _claims(auth_time=int(time.time()) + 3600)), _settings()
        )


def test_small_clock_skew_is_tolerated(signing):
    """A token minted seconds ago on a host slightly ahead of ours must still work, or sign-in
    fails intermittently for reasons no one can reproduce."""
    now = int(time.time())
    out = fb.verify_id_token(_token(signing, _claims(iat=now + 5)), _settings())
    assert out["uid"] == "firebase-uid-abc123"


# --------------------------------------------------------------------------------------------
# Subject
# --------------------------------------------------------------------------------------------

@pytest.mark.parametrize("bad_sub", ["", "   ", None])
def test_empty_subject_is_rejected(signing, bad_sub):
    """sub IS the uid. An empty one would key every such user onto the same database row."""
    claims = _claims()
    if bad_sub is None:
        claims.pop("sub")
    else:
        claims["sub"] = bad_sub
    with pytest.raises(Unauthorized):
        fb.verify_id_token(_token(signing, claims), _settings())


# --------------------------------------------------------------------------------------------
# Configuration. Getting these wrong is how keyless mode would become an open door.
# --------------------------------------------------------------------------------------------

def test_missing_project_id_refuses_to_verify(signing):
    """Without an audience every Firebase token on earth verifies. That must never degrade
    into 'allow' — it raises rather than returning claims."""
    with pytest.raises(RuntimeError):
        fb.verify_id_token(_token(signing), _settings(project_id=""))


def test_startup_refuses_keyless_without_a_project_id():
    with pytest.raises(RuntimeError, match="FIREBASE_PROJECT_ID"):
        _settings(project_id="").assert_ready()


def test_startup_accepts_keyless_with_a_project_id():
    _settings().assert_ready()          # must not raise


def test_auth_configured_reflects_keyless_mode():
    assert _settings().auth_configured is True
    assert _settings(project_id="").auth_configured is False
    with_key = Settings(AUTH_MODE="firebase", FIREBASE_CREDENTIALS='{"type":"x"}', FIREBASE_PROJECT_ID="")
    assert with_key.auth_configured is True      # credentialed mode carries its own project id


def test_credentialed_mode_still_takes_the_sdk_path(monkeypatch):
    """Supplying a credential must keep using firebase_admin, untouched."""
    called = {}

    def fake_ensure(settings):
        called["ensured"] = True

    monkeypatch.setattr(fb, "ensure_firebase", fake_ensure)
    settings = Settings(AUTH_MODE="firebase", FIREBASE_CREDENTIALS='{"type":"service_account"}',
                        FIREBASE_PROJECT_ID=PROJECT)
    assert settings.firebase_keyless is False
    with pytest.raises(Exception):
        fb.verify_id_token("anything", settings)
    assert called.get("ensured") is True


# --------------------------------------------------------------------------------------------
# Failing closed
# --------------------------------------------------------------------------------------------

def test_cert_fetch_failure_denies_rather_than_allows(monkeypatch):
    """If Google is unreachable we cannot attribute a signature, so we refuse. The failure mode
    of an auth check must never be 'let them in'."""
    class DeadCache:
        def get(self, *, force_refresh=False):
            raise Unauthorized("Could not verify sign-in right now.", code="unauthorized")

    monkeypatch.setattr(fb, "_cert_cache", DeadCache())
    signer, _ = _keypair()
    with pytest.raises(Unauthorized):
        fb.verify_id_token(_token(signer), _settings())


def test_error_messages_leak_nothing(signing):
    """A 401 must not tell an attacker which check failed, nor anything about our setup."""
    forged = _token(signing, _claims(iss="https://evil.example.com"))
    try:
        fb.verify_id_token(forged, _settings())
        raise AssertionError("should have raised")
    except Unauthorized as e:
        blob = (str(e) + e.message).lower()
        for leak in ["securetoken", "googleapis", "cert", "kid", "signature", "issuer", "iss"]:
            assert leak not in blob, f"error message leaks {leak!r}: {e.message}"
