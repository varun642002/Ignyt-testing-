"""
/v1/ready must survive a dead database and say why.

It previously could not: it depended on get_db, which commits on the way out, so a connection
failure turned the readiness endpoint itself into a 500. The endpoint that exists to explain an
outage was indistinguishable from the app being broken some other way.
"""
from __future__ import annotations

import pytest

from app.api.routes_health import _classify


@pytest.mark.parametrize("message, expected", [
    ("connect() got an unexpected keyword argument 'sslmode'", "bad_connection_parameter"),
    ("[Errno 11001] getaddrinfo failed",                        "host_not_found"),
    ("could not translate host name \"dpg-abc\" to address",    "host_not_found"),
    ("password authentication failed for user \"ignyt\"",       "authentication_failed"),
    ("SSL error: certificate verify failed",                    "tls_error"),
    ("connection attempt timed out",                            "timeout"),
    ("connection was closed in the middle of operation",        "connection_refused"),
    ("relation \"users\" does not exist",                       "migrations_not_run"),
])
def test_failures_are_classified(message, expected):
    assert _classify(Exception(message)) == expected


def test_classification_follows_the_exception_chain():
    """SQLAlchemy wraps driver errors, so the useful text is never on the outermost object."""
    try:
        try:
            raise TypeError("connect() got an unexpected keyword argument 'sslmode'")
        except TypeError as inner:
            raise RuntimeError("(sqlalchemy) could not connect") from inner
    except RuntimeError as outer:
        assert _classify(outer) == "bad_connection_parameter"


def test_unrecognised_failure_is_not_guessed_at():
    assert _classify(Exception("something entirely new")) == "unknown"


@pytest.mark.parametrize("message", [
    "password authentication failed for user \"ignyt\"",
    "could not translate host name \"dpg-abc-a.oregon-postgres.render.com\" to address",
    "FATAL: database \"ignyt_prod\" does not exist",
])
def test_classification_leaks_no_connection_details(message):
    """/ready is public. The category must never carry the host, user or database name."""
    out = _classify(Exception(message))
    assert " " not in out and out.islower()
    for secret in ["ignyt", "render.com", "dpg-", "password", "oregon"]:
        assert secret not in out


@pytest.mark.anyio
async def test_ready_reports_degraded_instead_of_500(client, monkeypatch):
    """The regression that mattered: a dead database must yield 200 degraded, never a 500."""
    import app.api.routes_health as rh

    class DeadEngine:
        def connect(self):
            raise OSError("[Errno 11001] getaddrinfo failed")

    monkeypatch.setattr(rh, "engine", DeadEngine())
    r = await client.get("/v1/ready")
    assert r.status_code == 200, f"readiness must not 500 when the database is down: {r.text}"
    body = r.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"] is False
    assert body["checks"]["database_error"] == "host_not_found"


@pytest.mark.anyio
async def test_ready_is_clean_when_the_database_works(client):
    r = await client.get("/v1/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["checks"]["database"] is True
    assert body["checks"]["database_error"] is None
