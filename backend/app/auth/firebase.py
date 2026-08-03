"""
Firebase Admin initialization + ID-token verification.

The backend trusts ONLY the uid inside a token that firebase-admin cryptographically verifies
against Google's public keys. A client-supplied uid is never accepted (see auth/deps.py).
"""
from __future__ import annotations

import json
import threading

from ..config import Settings
from ..core.errors import Unauthorized

_lock = threading.Lock()
_ready = False


def ensure_firebase(settings: Settings) -> None:
    """Initialize the Firebase Admin app once (idempotent, thread-safe)."""
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


def verify_id_token(token: str, settings: Settings) -> dict:
    """Return the decoded token claims (incl. 'uid'), or raise Unauthorized."""
    ensure_firebase(settings)
    from firebase_admin import auth as fb_auth

    try:
        decoded = fb_auth.verify_id_token(token, check_revoked=False)
    except Exception:
        raise Unauthorized("Invalid or expired sign-in token.", code="unauthorized")
    if not decoded.get("uid"):
        raise Unauthorized("Invalid sign-in token.", code="unauthorized")
    return decoded
