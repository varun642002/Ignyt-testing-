"""
Authenticated identity route. `GET /me` verifies the caller's Firebase ID token, ensures a
local User row exists, and returns the identity + a per-provider connection summary.

Phase 2: the integrations list is derived structurally (no accounts table yet), so every
known provider reports "not_connected". Later phases replace this with real account status.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..db.models import User
from ..auth.deps import current_user
from ..schemas.common import IntegrationSummary, MeResponse

router = APIRouter(tags=["auth"])

# Providers the service knows about. NotionProvider implementation lands in Phase 3.
KNOWN_PROVIDERS = ["notion"]


@router.get("/me", response_model=MeResponse)
async def me(user: User = Depends(current_user)) -> MeResponse:
    integrations = [IntegrationSummary(provider=p, status="not_connected") for p in KNOWN_PROVIDERS]
    return MeResponse(uid=user.firebase_uid, email=user.email, integrations=integrations)
