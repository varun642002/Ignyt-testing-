"""
Pytest fixtures. Runs the app against an in-memory-ish SQLite file with AUTH_MODE=insecure-uid
so the Phase-2 suite needs no Firebase credentials and no Postgres.
"""
from __future__ import annotations

import os

import pytest

# Configure BEFORE importing the app (settings are read at import time).
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("AUTH_MODE", "insecure-uid")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_ignyt_integration.db")
os.environ.setdefault("IGNYT_SKIP_STARTUP_CHECK", "1")


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session", autouse=True)
async def _create_schema():
    from app.db.base import Base, engine
    from app.db import models  # noqa: F401  (register models)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture()
async def client():
    import httpx
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
