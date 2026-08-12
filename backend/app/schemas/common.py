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
    # WHY the database is unreachable, as one of a fixed set of words — never the driver's
    # message. A raw exception string carries the host, the user and sometimes the database
    # name, and /ready is public so uptime checks can reach it. These categories are enough to
    # tell a DNS mistake from a password mistake from a TLS mistake, which is the entire
    # question when a deploy comes up with a green /health and a dead database, and they say
    # nothing an attacker can use. Absent when the database is fine.
    database_error: str | None = None


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
