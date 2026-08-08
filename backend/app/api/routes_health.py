"""Liveness/readiness. Public (no auth) so load balancers and uptime checks can hit them."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings, get_settings
from ..db.session import get_db
from ..schemas.common import HealthResponse, ReadyCheck, ReadyResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, environment=settings.environment)


@router.get("/ready", response_model=ReadyResponse)
async def ready(
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> ReadyResponse:
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    auth_ok = settings.auth_configured
    status = "ready" if (db_ok and auth_ok) else "degraded"
    return ReadyResponse(status=status, checks=ReadyCheck(database=db_ok, auth_configured=auth_ok))
