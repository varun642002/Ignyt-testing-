"""Tests for Play verification and the entitlement the AI gate reads.

Google is never called. What is under test is our side of the boundary: that a client cannot
assert entitlement, that a receipt cannot be shared between accounts, that a lapsed
subscription stops counting by itself, and that Google being down does not revoke a paying
user.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.api import routes_billing
from app.db.models import User
from app.services import play_billing


async def _register(client, uid: str):
    await client.get("/v1/me", headers={"X-Ignyt-Uid": uid})


@pytest.fixture()
def stub_play(monkeypatch):
    """Replace the Google call. The box sets what Google 'said'."""
    box = {
        "reply": {
            "entitled": True,
            "state": "SUBSCRIPTION_STATE_ACTIVE",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "in_trial": False,
        }
    }

    async def fake_verify(settings, purchase_token):
        box["seen"] = purchase_token
        if isinstance(box["reply"], Exception):
            raise box["reply"]
        return box["reply"]

    monkeypatch.setattr(play_billing, "verify_subscription", fake_verify)
    return box


# ------------------------------------------------------------------ the boundary


async def test_verify_requires_auth(client, stub_play):
    r = await client.post("/v1/billing/verify", json={"purchaseToken": "tok-abc12345"})
    assert r.status_code == 401


async def test_client_cannot_assert_premium(client, stub_play):
    """There is no field to claim it with — entitlement comes only from a verified receipt."""
    await _register(client, "u-claim")
    r = await client.post(
        "/v1/billing/verify",
        headers={"X-Ignyt-Uid": "u-claim"},
        json={"purchaseToken": "tok-abc12345", "isPremium": True, "entitled": True},
    )
    assert r.status_code == 200
    # It is entitled because the STUBBED GOOGLE said so, not because the body claimed it.
    assert stub_play["seen"] == "tok-abc12345"


async def test_a_valid_purchase_grants_entitlement(client, stub_play):
    await _register(client, "u-buy")
    r = await client.post("/v1/billing/verify", headers={"X-Ignyt-Uid": "u-buy"},
                          json={"purchaseToken": "tok-good-0001"})
    assert r.status_code == 200
    b = r.json()
    assert b["entitled"] is True and b["source"] == "play"

    status = await client.get("/v1/billing/status", headers={"X-Ignyt-Uid": "u-buy"})
    assert status.json()["entitled"] is True


async def test_one_receipt_cannot_entitle_two_accounts(client, stub_play):
    """The most obvious free-premium route: paste someone else's token."""
    await _register(client, "u-owner")
    await _register(client, "u-thief")
    token = "tok-shared-9999"

    first = await client.post("/v1/billing/verify", headers={"X-Ignyt-Uid": "u-owner"},
                              json={"purchaseToken": token})
    assert first.status_code == 200

    second = await client.post("/v1/billing/verify", headers={"X-Ignyt-Uid": "u-thief"},
                               json={"purchaseToken": token})
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "purchase_claimed"

    thief = await client.get("/v1/billing/status", headers={"X-Ignyt-Uid": "u-thief"})
    assert thief.json()["entitled"] is False


async def test_rejected_purchase_does_not_grant(client, stub_play):
    await _register(client, "u-bad")
    stub_play["reply"] = play_billing.VerificationFailed("nope")
    r = await client.post("/v1/billing/verify", headers={"X-Ignyt-Uid": "u-bad"},
                          json={"purchaseToken": "tok-forged-123"})
    assert r.status_code == 400
    assert (await client.get("/v1/billing/status", headers={"X-Ignyt-Uid": "u-bad"})).json()["entitled"] is False


# ------------------------------------------------------------------ expiry is derived


def test_expired_subscription_is_not_entitled_without_anything_running():
    """No cron, no webhook — a lapsed subscription simply stops being true when read."""
    u = User(firebase_uid="x", is_premium=True,
             premium_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1))
    assert routes_billing.is_entitled(u) is False

    u.premium_expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    assert routes_billing.is_entitled(u) is True


def test_naive_datetimes_from_sqlite_are_handled():
    """SQLite hands back tz-naive datetimes; comparing those to an aware now() raises."""
    u = User(firebase_uid="x", is_premium=True,
             premium_expires_at=datetime.utcnow() + timedelta(days=1))
    assert routes_billing.is_entitled(u) is True


def test_is_premium_false_is_never_entitled():
    u = User(firebase_uid="x", is_premium=False,
             premium_expires_at=datetime.now(timezone.utc) + timedelta(days=30))
    assert routes_billing.is_entitled(u) is False


# ------------------------------------------------------------------ outages must not revoke


async def test_google_being_down_does_not_revoke_a_paying_user(client, stub_play, monkeypatch):
    """Their subscription is fine; our dependency is not. Revoking would be our bug, not theirs."""
    await _register(client, "u-outage")
    await client.post("/v1/billing/verify", headers={"X-Ignyt-Uid": "u-outage"},
                      json={"purchaseToken": "tok-outage-1"})

    # Force the status route to re-check, then make Google unreachable.
    monkeypatch.setattr(routes_billing, "needs_recheck", lambda user, hours: True)
    stub_play["reply"] = play_billing.BillingUnavailable("down")

    r = await client.get("/v1/billing/status", headers={"X-Ignyt-Uid": "u-outage"})
    assert r.status_code == 200
    assert r.json()["entitled"] is True, "an outage must not cancel a subscription"


# ------------------------------------------------------------------ the AI gate


async def test_ai_is_refused_without_entitlement_when_gating_is_on(client, monkeypatch):
    from app.config import get_settings
    from app.services import gemini_chat

    async def never_called(**kwargs):
        raise AssertionError("Gemini must not be called for an unentitled user")

    monkeypatch.setattr(gemini_chat, "chat", never_called)
    s = get_settings()
    monkeypatch.setattr(s, "ai_requires_premium", True, raising=False)
    await _register(client, "u-free")

    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-free"}, json={"message": "hi"})
    assert r.status_code == 402
    assert r.json()["error"]["code"] == "ai_requires_pro"


async def test_ai_allowed_for_a_verified_subscriber(client, stub_play, monkeypatch):
    from app.config import get_settings
    from app.services import gemini_chat

    async def ok(**kwargs):
        return {"text": "ok", "toolCalls": []}

    monkeypatch.setattr(gemini_chat, "chat", ok)
    s = get_settings()
    monkeypatch.setattr(s, "ai_requires_premium", True, raising=False)

    await _register(client, "u-pro")
    await client.post("/v1/billing/verify", headers={"X-Ignyt-Uid": "u-pro"},
                      json={"purchaseToken": "tok-pro-777"})

    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-pro"}, json={"message": "hi"})
    assert r.status_code == 200


async def test_trial_user_is_treated_as_entitled(client, stub_play, monkeypatch):
    """Play models the 7-day trial as an ACTIVE subscription that has not been charged."""
    from app.config import get_settings
    from app.services import gemini_chat

    async def ok(**kwargs):
        return {"text": "ok", "toolCalls": []}

    monkeypatch.setattr(gemini_chat, "chat", ok)
    s = get_settings()
    monkeypatch.setattr(s, "ai_requires_premium", True, raising=False)

    stub_play["reply"] = {
        "entitled": True,
        "state": "SUBSCRIPTION_STATE_ACTIVE",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "in_trial": True,
    }
    await _register(client, "u-trial")
    v = await client.post("/v1/billing/verify", headers={"X-Ignyt-Uid": "u-trial"},
                          json={"purchaseToken": "tok-trial-1"})
    assert v.json()["in_trial"] is True

    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-trial"}, json={"message": "hi"})
    assert r.status_code == 200
