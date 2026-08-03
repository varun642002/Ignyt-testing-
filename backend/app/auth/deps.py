"""
`current_user` dependency: authenticates a request and returns the local User row,
creating it on first contact. This is the single choke-point through which every
protected route obtains a trusted identity.
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings, get_settings
from ..core.errors import Unauthorized
from ..db.models import User
from ..db.session import get_db
from .firebase import verify_id_token


async def _resolve_uid(
    authorization: Optional[str],
    x_ignyt_uid: Optional[str],
    settings: Settings,
) -> tuple[str, Optional[str]]:
    """Return (firebase_uid, email) from a verified token, or raise Unauthorized."""
    if settings.auth_mode == "firebase":
        if not authorization or not authorization.lower().startswith("bearer "):
            raise Unauthorized("Missing bearer token.")
        claims = verify_id_token(authorization.split(" ", 1)[1].strip(), settings)
        return claims["uid"], claims.get("email")

    # insecure-uid: dev only; config.assert_ready() already forbids it in production.
    if not x_ignyt_uid:
        raise Unauthorized("Missing X-Ignyt-Uid (dev auth mode).")
    return x_ignyt_uid, None


async def current_user(
    authorization: Optional[str] = Header(default=None),
    x_ignyt_uid: Optional[str] = Header(default=None),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> User:
    firebase_uid, email = await _resolve_uid(authorization, x_ignyt_uid, settings)

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(firebase_uid=firebase_uid, email=email)
        db.add(user)
        await db.flush()  # assign PK now; get_db commits at request end
    elif email and user.email != email:
        user.email = email
    return user
