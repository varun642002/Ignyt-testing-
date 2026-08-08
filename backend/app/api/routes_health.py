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

    # Nothing matched. Fall back to the EXCEPTION CLASS NAMES — never their messages.
    #
    # "unknown" is useless to whoever is holding the outage, and the categories above can only
    # cover failures somebody thought of in advance. A chain like
    # "OperationalError<gaierror" names the fault precisely, while a message would carry the
    # host, the user and often the database name, which is exactly what must not appear on a
    # public endpoint.
    #
    # Class names are library identifiers, not infrastructure: they reveal that this is
    # SQLAlchemy talking to Postgres, which anyone can already infer from the service. Sliced
    # so a deep wrapper chain cannot turn into an unbounded response body.
    names = []
    cur = exc
    while cur is not None and len(names) < 4:
        n = type(cur).__name__
        if n not in names:
            names.append(n)
        cur = cur.__cause__ or cur.__context__
    return "unclassified:" + "<".join(names) + _redacted_detail(exc)


def _redacted_detail(exc: BaseException) -> str:
    """The driver's own message with every part of the connection string removed.

    A class name alone was not enough — `unclassified:ValueError` says the parameters were
    rejected but not which one, and each guess costs a deploy. The message names the problem
    exactly; it also names the host, the user, the password and the database, which is why it
    cannot be returned as-is from an endpoint that needs no authentication.

    So the URL is taken apart and each of its parts is struck out of the text by value. That is
    the safe direction to work in: rather than trying to recognise what a secret looks like, we
    remove the specific strings we know are secret. Anything left is the driver's own vocabulary.
    """
    from urllib.parse import unquote, urlsplit

    from ..config import get_settings

    message = str(exc)
    if not message:
        return ""

    secrets: list[str] = []
    try:
        parts = urlsplit(get_settings().database_url)
        for value in (parts.password, parts.username, parts.hostname, (parts.path or "").lstrip("/")):
            if value:
                secrets.append(value)
                decoded = unquote(value)
                if decoded != value:
                    secrets.append(decoded)
    except Exception:      # noqa: BLE001 — an unparseable URL must not break the health check
        return ""

    # Longest first, so a hostname is removed before a username that is a substring of it.
    for secret in sorted(set(secrets), key=len, reverse=True):
        if len(secret) >= 3:
            message = message.replace(secret, "[redacted]")

    message = " ".join(message.split())[:160]
    return " | " + message if message else ""


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
