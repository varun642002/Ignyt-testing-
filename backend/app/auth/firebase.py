"""
Firebase ID-token verification, in two modes.

The backend trusts ONLY the uid inside a token it has cryptographically verified against
Google's signing keys. A client-supplied uid is never accepted (see auth/deps.py).

WHY THERE ARE TWO MODES
Verifying a Firebase ID token is a signature check against Google's PUBLIC certificates. It
needs no secret of ours — the private half belongs to Google, and the certs are served
unauthenticated to anyone. The Admin SDK nonetheless requires a service-account credential
before it will do that check, so the key is a requirement of the library rather than of the
cryptography.

That distinction stops being academic when `constraints/iam.disableServiceAccountKeyCreation`
is enforced on the Google Cloud organization — now the default for newly created orgs. Key
creation is refused outright, and a deployment that can only authenticate with a key cannot
start at all.

So:

    FIREBASE_CREDENTIALS set    -> firebase_admin (unchanged, well-trodden path)
    FIREBASE_CREDENTIALS empty  -> keyless verification against the public certs,
                                   which needs FIREBASE_PROJECT_ID and nothing else

Both return the same claims dict, `uid` included, so callers cannot tell them apart.

WHAT KEYLESS MODE CHECKS, and why each one is here rather than assumed. Google signs the
tokens of EVERY Firebase project with the same `securetoken@system` key, so a valid signature
proves only "Firebase issued this", never "issued for us". The audience and issuer are what
bind a token to this project, and they are the difference between authentication and an open
door. The list follows Google's own published requirements for third-party verification:

    alg == RS256        header only; a token asking for another algorithm is not ours
    kid                 must name a live Google signing certificate
    signature           against that certificate
    aud == projectId    else it is another project's token
    iss == securetoken.google.com/projectId
    exp                 in the future
    iat                 in the past
    auth_time           in the past, when present
    sub                 non-empty; this is the uid

google.auth.jwt.decode covers the signature, the audience and exp/iat, and rejects algorithms
outside its table. It does NOT look at the issuer at all — verified by forging one and watching
it pass — so issuer, sub and auth_time are enforced here.
"""
from __future__ import annotations

import json
import threading
import time

from ..config import Settings
from ..core.errors import Unauthorized

_lock = threading.Lock()
_ready = False

# Google's public signing certificates for Firebase ID tokens. Not a secret: fetched with no
# credentials, by anyone. The private half never leaves Google.
_SECURETOKEN_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)
_ISSUER_PREFIX = "https://securetoken.google.com/"

# Server clocks drift, and a token minted one second ago on a host a little ahead of us should
# not read as "issued in the future". Small enough not to meaningfully extend a token's life.
_CLOCK_SKEW_SECONDS = 60

# Used only if the certs response carries no Cache-Control. Google always sends one; this is
# the backstop that stops a missing header from turning into a fetch on every request.
_CERTS_FALLBACK_TTL = 3600


def ensure_firebase(settings: Settings) -> None:
    """Initialize the Firebase Admin app once (idempotent, thread-safe).

    Only used in credentialed mode. Keyless verification needs no SDK state.
    """
    global _ready
    if _ready:
        return
    with _lock:
        if _ready:
            return
        import firebase_admin
        from firebase_admin import credentials

        raw = settings.firebase_credentials.strip()
        if not raw:
            raise RuntimeError("FIREBASE_CREDENTIALS is not set.")
        cred = credentials.Certificate(json.loads(raw) if raw.startswith("{") else raw)
        try:
            firebase_admin.get_app()
        except ValueError:
            options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
            firebase_admin.initialize_app(cred, options)
        _ready = True


class _CertCache:
    """Google's signing certificates, cached for as long as Google says they are good.

    Refetching on every request would add a round trip to Google to every authenticated call
    in the app, so the lifetime comes from the response's own Cache-Control rather than from
    a number picked here.

    `force_refresh` exists for key rotation. Google publishes a new signing key before it
    starts using it, but a cache populated just before a rotation can still hold a set that
    lacks the key a freshly minted token was signed with. Treating that as "invalid token"
    would log users out for as long as the cache lived, so an unknown `kid` triggers one
    refetch and a retry instead.
    """

    def __init__(self) -> None:
        self._certs: dict = {}
        self._expires_at = 0.0
        self._lock = threading.Lock()

    def get(self, *, force_refresh: bool = False) -> dict:
        with self._lock:
            if not force_refresh and self._certs and time.time() < self._expires_at:
                return self._certs
            certs, ttl = self._fetch()
            self._certs = certs
            self._expires_at = time.time() + ttl
            return self._certs

    @staticmethod
    def _fetch() -> tuple[dict, float]:
        import httpx

        try:
            resp = httpx.get(_SECURETOKEN_CERTS_URL, timeout=10.0)
            resp.raise_for_status()
            certs = resp.json()
        except Exception as exc:
            # Deliberately not falling back to a stale cache: if we cannot confirm which keys
            # are current we would rather fail closed than accept a signature we cannot
            # attribute. The message stays generic — the client learns nothing about our
            # infrastructure — while the cause is left in the exception chain for the logs.
            raise Unauthorized("Could not verify sign-in right now.", code="unauthorized") from exc

        if not isinstance(certs, dict) or not certs:
            raise Unauthorized("Could not verify sign-in right now.", code="unauthorized")

        ttl = _CERTS_FALLBACK_TTL
        cache_control = resp.headers.get("cache-control", "")
        for part in cache_control.split(","):
            part = part.strip()
            if part.startswith("max-age="):
                try:
                    ttl = max(60.0, float(part[len("max-age="):]))
                except ValueError:
                    pass
                break
        return certs, ttl


_cert_cache = _CertCache()


def _decode_with_certs(token: str, certs: dict, audience: str) -> dict:
    """Signature + audience + exp/iat, via google-auth. Raises on any failure."""
    from google.auth import jwt as google_jwt

    return google_jwt.decode(
        token,
        certs=certs,
        audience=audience,
        clock_skew_in_seconds=_CLOCK_SKEW_SECONDS,
    )


def _verify_keyless(token: str, settings: Settings) -> dict:
    """Verify a Firebase ID token against Google's public certs. No service account needed."""
    from google.auth import jwt as google_jwt

    project_id = (settings.firebase_project_id or "").strip()
    if not project_id:
        # Without a project id there is no audience to check, and every Firebase token on
        # earth would verify — they all share Google's signing key. That is not a degraded
        # mode, it is an open door, so it is a configuration error rather than a 401.
        # config.assert_ready() refuses to start in this state; this is the second line.
        raise RuntimeError(
            "FIREBASE_PROJECT_ID is required when FIREBASE_CREDENTIALS is unset."
        )

    try:
        header = google_jwt.decode_header(token)
    except Exception as exc:
        raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized") from exc

    # Pin the algorithm, and require a key id.
    #
    # BOTH ARE CURRENTLY REDUNDANT, and that is recorded here so nobody "simplifies" them back
    # out on the assumption they are load-bearing. Mutation testing (disable the check, see
    # whether any test fails) says both survive: google-auth picks its verifier by looking the
    # `alg` header up in a table, so `none` and `HS256` are already refused as unsupported
    # algorithms, and a missing `kid` already falls through the cert lookup below.
    #
    # They stay because both facts are properties of a library we do not control, and the cost
    # of being wrong about them is authentication bypass. Firebase issues RS256 and nothing
    # else, so saying so explicitly is a line of code against a dependency changing its mind.
    if header.get("alg") != "RS256":
        raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized")

    kid = header.get("kid")
    if not kid:
        raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized")

    certs = _cert_cache.get()
    if kid not in certs:
        # Possibly a rotation we have not picked up yet. One refetch, then it really is invalid.
        certs = _cert_cache.get(force_refresh=True)
        if kid not in certs:
            raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized")

    try:
        claims = _decode_with_certs(token, {kid: certs[kid]}, project_id)
    except Unauthorized:
        raise
    except Exception as exc:
        raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized") from exc

    # --- the checks google-auth does not do -------------------------------------------------
    # Issuer. Verified by experiment that google.auth.jwt.decode ignores `iss` entirely, so
    # without this a token whose issuer is any string at all passes as long as the audience
    # matches.
    if claims.get("iss") != _ISSUER_PREFIX + project_id:
        raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized")

    # Subject. This IS the uid, and an empty one would key every such user onto the same row.
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        raise Unauthorized("Invalid sign-in token.", code="unauthorized")

    # auth_time: when the user actually authenticated. A value in the future is not something
    # Firebase mints. Optional in the token, so only checked when present.
    auth_time = claims.get("auth_time")
    if auth_time is not None:
        try:
            if float(auth_time) > time.time() + _CLOCK_SKEW_SECONDS:
                raise Unauthorized("Invalid sign-in token.", code="unauthorized")
        except (TypeError, ValueError) as exc:
            raise Unauthorized("Invalid sign-in token.", code="unauthorized") from exc

    # firebase_admin exposes the subject as `uid`; callers read that. Mirror it so the two
    # modes are indistinguishable from the outside.
    claims["uid"] = sub
    return claims


def verify_id_token(token: str, settings: Settings) -> dict:
    """Return the decoded token claims (incl. 'uid'), or raise Unauthorized.

    Dispatches on whether a service-account credential was configured. Both paths verify
    against Google's signing keys; they differ only in which code does it.
    """
    if not settings.firebase_credentials.strip():
        return _verify_keyless(token, settings)

    ensure_firebase(settings)
    from firebase_admin import auth as fb_auth

    try:
        decoded = fb_auth.verify_id_token(token, check_revoked=False)
    except Exception:
        raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized")
    if not decoded.get("uid"):
        raise Unauthorized("Invalid sign-in token.", code="unauthorized")
    return decoded
