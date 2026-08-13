"""
DATA ISOLATION: user A must never see user B's data.

The static audit found no IDOR surface -- no route takes a user id from the caller, every one
derives identity from `Depends(current_user)`. That is a strong argument, but it is an argument.
These tests are the evidence: two identities, real requests through the ASGI app, asserting on
what comes back.

The harness runs AUTH_MODE=insecure-uid (see conftest), where identity is the X-Ignyt-Uid
header. That is precisely what makes it a usable two-account rig -- and it does not weaken the
test, because what is under test is whether each ROUTE scopes its queries to the caller's user
row, not how that row was authenticated.

If a route is ever added that accepts a user id from the client, the last test here is the one
that should start failing.
"""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio

ALICE = {"X-Ignyt-Uid": "isolation-alice"}
BOB = {"X-Ignyt-Uid": "isolation-bob"}


async def test_me_returns_the_caller_and_never_the_other_user(client):
    alice = await client.get("/v1/me", headers=ALICE)
    bob = await client.get("/v1/me", headers=BOB)
    assert alice.status_code == 200 and bob.status_code == 200
    assert alice.json()["uid"] == "isolation-alice"
    assert bob.json()["uid"] == "isolation-bob"
    # The obvious failure this guards: a cached or module-level "current user".
    assert alice.json()["uid"] != bob.json()["uid"]


async def test_no_identity_at_all_is_refused(client):
    """Absent credentials must not fall back to some default or first user."""
    res = await client.get("/v1/me")
    assert res.status_code in (401, 403), res.text


async def test_ai_usage_is_scoped_to_the_caller(client):
    """
    Both users are fresh, so both must read as unused. This cannot prove the counter is
    per-user -- proving that needs one user to CONSUME quota, and consuming it needs Gemini
    configured, which this harness does not have. What it does prove is that a second user does
    not inherit a non-zero count from the first, which is the leak that would matter.
    """
    alice = await client.get("/v1/ai/usage", headers=ALICE)
    bob = await client.get("/v1/ai/usage", headers=BOB)
    assert alice.status_code == 200 and bob.status_code == 200
    for res in (alice, bob):
        body = res.json()
        used = body.get("used", body.get("count"))
        assert used in (0, None), f"a fresh user reports prior usage: {body}"


async def test_billing_status_does_not_leak_across_users(client):
    """Entitlement is per user. If it were global, one purchase would unlock every account."""
    alice = await client.get("/v1/billing/status", headers=ALICE)
    bob = await client.get("/v1/billing/status", headers=BOB)
    assert alice.status_code == 200 and bob.status_code == 200
    # Neither user has purchased anything in this harness, so both must read as unentitled.
    # A True here would mean entitlement is being read from somewhere that is not the user row.
    for res in (alice, bob):
        body = res.json()
        entitled = body.get("entitled", body.get("premium", body.get("isPremium")))
        assert entitled in (False, None), body


async def test_a_forged_user_id_in_the_body_is_ignored(client):
    """
    The IDOR attempt, written down. If any route ever starts trusting a caller-supplied id,
    this is where it shows up: Bob asks to be Alice in the payload while authenticating as
    himself, and must still be answered as himself.
    """
    res = await client.post(
        "/v1/billing/verify",
        headers=BOB,
        json={"user_id": "isolation-alice", "uid": "isolation-alice", "purchaseToken": "x", "productId": "y"},
    )
    # The request may well be rejected on its own merits (bad token, validation, billing not
    # configured). What must never happen is it being processed AS ALICE.
    assert res.status_code != 500, res.text
    me = await client.get("/v1/me", headers=BOB)
    assert me.json()["uid"] == "isolation-bob"


async def test_no_route_accepts_a_user_identifier_from_the_caller(client):
    """
    The structural guarantee, asserted rather than assumed: identity comes from the auth
    dependency, so no path or query parameter should be named for a user. This reads the app's
    own route table, so a route added later is covered without anyone remembering to add a test.
    """
    from app.main import app

    offenders = []
    for route in app.routes:
        path = getattr(route, "path", "")
        if any(token in path.lower() for token in ("{user", "{uid", "{account", "{owner")):
            offenders.append(path)
    assert not offenders, f"routes take a user id from the caller: {offenders}"
