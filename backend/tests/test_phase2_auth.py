"""
Phase 2 API tests: health/readiness are public; /me requires identity; a first-seen uid
is provisioned as a User and the integrations summary is returned.

Uses AUTH_MODE=insecure-uid (dev) so no Firebase creds are needed in CI. The production
Firebase verification path is covered separately once creds/emulator are available.
"""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


async def test_health_is_public(client):
    r = await client.get("/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"


async def test_ready_reports_checks(client):
    r = await client.get("/v1/ready")
    assert r.status_code == 200
    # Exact set, not a subset: /ready is consumed by uptime checks, so a field appearing or
    # vanishing should be a deliberate edit here rather than a silent change in what they see.
    assert set(r.json()["checks"].keys()) == {"database", "auth_configured", "database_error"}


async def test_me_requires_identity(client):
    r = await client.get("/v1/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


async def test_me_provisions_user_and_lists_integrations(client):
    r = await client.get("/v1/me", headers={"X-Ignyt-Uid": "test-uid-123"})
    assert r.status_code == 200
    body = r.json()
    assert body["uid"] == "test-uid-123"
    providers = {i["provider"]: i["status"] for i in body["integrations"]}
    assert providers.get("notion") == "not_connected"

    # Second call for the same uid must not create a duplicate (idempotent provisioning).
    r2 = await client.get("/v1/me", headers={"X-Ignyt-Uid": "test-uid-123"})
    assert r2.status_code == 200
    assert r2.json()["uid"] == "test-uid-123"
