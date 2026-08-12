"""
Connection-string normalisation.

Every case here is a URL shape a hosting provider actually hands out. They are tested because
each one failed at some point, and because the failure mode is unusually bad: the URL is only
opened when a request touches the database, so /v1/health stays green while every real route
returns 500. The symptom points nowhere near the cause.
"""
from __future__ import annotations

import pytest

from app.config import Settings


def _s(url: str) -> Settings:
    return Settings(DATABASE_URL=url)


# --------------------------------------------------------------------------------------------
# Driver naming. A managed Postgres URL arrives with no driver in it and create_async_engine
# cannot open one — it raises at import, so the service never starts.
# --------------------------------------------------------------------------------------------

@pytest.mark.parametrize("given", [
    "postgresql://u:p@dpg-abc-a/ignyt",      # Render
    "postgres://u:p@dpg-abc-a/ignyt",        # Heroku, still emitted in the wild
])
def test_async_url_names_the_driver(given):
    assert _s(given).async_database_url.startswith("postgresql+asyncpg://")


def test_async_url_leaves_an_explicit_driver_alone():
    url = "postgresql+asyncpg://u:p@h/db"
    assert _s(url).async_database_url == url


def test_sqlite_is_untouched():
    url = "sqlite+aiosqlite:///./ignyt.db"
    assert _s(url).async_database_url == url


# --------------------------------------------------------------------------------------------
# sslmode. Render puts `?sslmode=require` on the External Database URL — the one shown most
# prominently on the dashboard, and so the one most likely to be pasted. asyncpg has no such
# keyword and raises TypeError at CONNECT time, long after startup has reported healthy.
# --------------------------------------------------------------------------------------------

def test_sslmode_is_renamed_for_asyncpg():
    out = _s("postgresql://u:p@h/db?sslmode=require").async_database_url
    assert "ssl=require" in out
    assert "sslmode" not in out


@pytest.mark.parametrize("mode", ["disable", "allow", "prefer", "require", "verify-ca", "verify-full"])
def test_every_libpq_sslmode_is_renamed(mode):
    out = _s(f"postgresql://u:p@h/db?sslmode={mode}").async_database_url
    assert f"ssl={mode}" in out and "sslmode" not in out


def test_other_query_parameters_survive_the_rename():
    out = _s("postgresql://u:p@h/db?sslmode=require&application_name=ignyt").async_database_url
    assert "ssl=require" in out
    assert "application_name=ignyt" in out


def test_unknown_sslmode_value_is_not_silently_downgraded():
    """A typo must not be guessed at. Passing it through unchanged makes the driver reject it
    loudly, which is better than connecting with weaker transport security than was asked for."""
    out = _s("postgresql://u:p@h/db?sslmode=banana").async_database_url
    assert "sslmode=banana" in out
    assert "ssl=banana" not in out


def test_credentials_survive_normalisation():
    """A password containing @ or / is percent-encoded; naive string surgery would corrupt it
    and the failure would look like a wrong password rather than a mangled URL."""
    out = _s("postgresql://u:p%40ss%2Fword@h/db?sslmode=require").async_database_url
    assert "p%40ss%2Fword" in out


# --------------------------------------------------------------------------------------------
# Alembic runs on psycopg2, which DOES understand sslmode and does NOT understand ssl. The two
# URLs must therefore differ — and migrations run on deploy, so a mistake here breaks first.
# --------------------------------------------------------------------------------------------

def test_sync_url_keeps_sslmode_for_psycopg2():
    s = _s("postgresql://u:p@h/db?sslmode=require")
    assert "sslmode=require" in s.sync_database_url
    assert "ssl=require" not in s.sync_database_url


def test_sync_url_normalises_the_legacy_scheme():
    """SQLAlchemy dropped postgres:// in 1.4 and raises rather than guessing."""
    assert _s("postgres://u:p@h/db").sync_database_url.startswith("postgresql://")


def test_sync_url_swaps_async_drivers_for_sync_ones():
    assert "+psycopg2" in _s("postgresql+asyncpg://u:p@h/db").sync_database_url
    assert "+aiosqlite" not in _s("sqlite+aiosqlite:///./x.db").sync_database_url
