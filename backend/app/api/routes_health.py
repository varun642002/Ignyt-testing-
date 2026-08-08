"""Liveness/readiness. Public (no auth) so load balancers and uptime checks can hit them."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text

from ..config import Settings, get_settings
from ..db.base import engine
from ..schemas.common import HealthResponse, ReadyCheck, ReadyResponse

router = APIRouter(tags=["health"])


def _classify(exc: BaseException) -> str:
    """Reduce a driver exception to one of a fixed set of words.

    The driver's own message names the host, the user, and often the database. /ready is
    public, so none of that can be returned. These categories separate the mistakes that
    actually get made — a wrong hostname, a wrong password, a TLS mismatch — while telling an
    attacker nothing they could not learn by trying to connect themselves.
    """
    name = type(exc).__name__
    text_ = f"{name}: {exc}".lower()
    chain = []
    cur: BaseException | None = exc
    while cur is not None:
        chain.append(f"{type(cur).__name__}: {cur}".lower())
        cur = cur.__cause__ or cur.__context__
    blob = " ".join(chain)

    if "sslmode" in blob or "unexpected keyword" in blob:
        return "bad_connection_parameter"
    if "getaddrinfo" in blob or "gaierror" in blob or "name or service not known" in blob \
            or "could not translate host name" in blob:
        return "host_not_found"
    if "password" in blob or "authentication" in blob or "role" in blob and "does not exist" in blob:
        return "authentication_failed"
    if "does not exist" in blob and "database" in blob:
        return "database_not_found"
    if "ssl" in blob or "certificate" in blob:
        return "tls_error"
    if "timeout" in blob or "timed out" in blob:
        return "timeout"
    if "refused" in blob or "connectionreset" in blob or "closed in the middle" in blob:
        return "connection_refused"
    if "no such table" in blob or "undefinedtable" in blob or "relation" in blob and "does not exist" in blob:
        return "migrations_not_run"
    return "unknown"


@router.get("/health", response_model=HealthResponse)
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, environment=settings.environment)


@router.get("/ready", response_model=ReadyResponse)
async def ready(settings: Settings = Depends(get_settings)) -> ReadyResponse:
    """Readiness. Deliberately does NOT depend on get_db.

    It used to, and that made this endpoint useless in exactly the situation it exists for: the
    route caught the SELECT failure and reported "degraded", then get_db committed the session
    on the way out, that raised, and the whole thing became a 500. The endpoint built to explain
    a database outage was reporting an internal error instead — indistinguishable, from outside,
    from the app being broken in some entirely different way.

    Taking a connection from the engine directly keeps the failure inside this function, where
    it can be caught and named.
    """
    db_ok = True
    db_error: str | None = None
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:      # noqa: BLE001 — every failure is reportable, none is fatal
        db_ok = False
        db_error = _classify(exc)

    auth_ok = settings.auth_configured
    status = "ready" if (db_ok and auth_ok) else "degraded"
    return ReadyResponse(
        status=status,
        checks=ReadyCheck(database=db_ok, auth_configured=auth_ok, database_error=db_error),
    )
