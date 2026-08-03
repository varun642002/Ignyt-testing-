"""Pydantic response models (Phase 2)."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class ReadyCheck(BaseModel):
    database: bool
    auth_configured: bool


class ReadyResponse(BaseModel):
    status: str
    checks: ReadyCheck


class IntegrationSummary(BaseModel):
    provider: str
    status: str  # connected | not_connected | error


class MeResponse(BaseModel):
    uid: str
    email: Optional[str] = None
    integrations: List[IntegrationSummary] = []
