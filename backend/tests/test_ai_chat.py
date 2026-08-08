"""Tests for /v1/ai/chat.

Gemini is never called. Every test stubs services.gemini_chat.chat, because what is being
tested here is the gate around the model — auth, the daily allowance, the action allow-list
and the request bounds — and a test that depended on a live model would be testing Google.
"""

from __future__ import annotations

import pytest

from app.api import routes_ai
from app.services import gemini_chat


@pytest.fixture()
def stub_model(monkeypatch):
    """Replace the Gemini call. Returns a setter so each test picks the model's answer."""
    box = {"reply": {"text": "ok", "toolCalls": []}}

    async def fake_chat(**kwargs):
        box["seen"] = kwargs
        return box["reply"]

    monkeypatch.setattr(gemini_chat, "chat", fake_chat)
    return box


async def _register(client, uid: str):
    """Touching /v1/me is what creates the user row the allowance counter hangs off."""
    await client.get("/v1/me", headers={"X-Ignyt-Uid": uid})


# ------------------------------------------------------------------ auth


async def test_chat_requires_identity(client, stub_model):
    r = await client.post("/v1/ai/chat", json={"message": "hi"})
    assert r.status_code == 401


# ------------------------------------------------------------------ the allow-list


async def test_invented_tool_is_dropped_before_it_reaches_the_device(client, stub_model):
    """A model can name a function that does not exist. It must not reach the phone."""
    await _register(client, "u-allow")
    stub_model["reply"] = {
        "text": "done",
        "toolCalls": [
            {"action": "logWeight", "args": {"weightKg": 96.8}},
            {"action": "dropAllTables", "args": {}},
            {"action": "eval", "args": {"code": "1"}},
        ],
    }
    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-allow"},
                          json={"message": "log my weight as 96.8"})
    assert r.status_code == 200
    body = r.json()
    assert [c["action"] for c in body["toolCalls"]] == ["logWeight"]
    assert sorted(body["dropped"]) == ["dropAllTables", "eval"]


async def test_every_advertised_tool_is_allowed(client, stub_model):
    """The schema and the allow-list are the same list — a drift here is a dead tool."""
    assert routes_ai.ALLOWED_ACTIONS == {t["name"] for t in gemini_chat.TOOLS}
    assert "logWeight" in routes_ai.ALLOWED_ACTIONS
    assert len(routes_ai.ALLOWED_ACTIONS) >= 15


# ------------------------------------------------------------------ the daily allowance


async def test_daily_limit_is_enforced(client, stub_model, monkeypatch):
    from app.config import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "ai_chat_daily_limit", 2, raising=False)
    await _register(client, "u-limit")

    first = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-limit"}, json={"message": "1"})
    second = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-limit"}, json={"message": "2"})
    third = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-limit"}, json={"message": "3"})

    assert first.status_code == 200 and first.json()["remaining"] == 1
    assert second.status_code == 200 and second.json()["remaining"] == 0
    assert third.status_code == 429


async def test_tool_result_continuation_does_not_spend_a_second_message(client, stub_model, monkeypatch):
    """The device running a tool and posting the result is the SAME user turn.

    Charging for it would mean a question that needs data costs double, and the user would
    watch their allowance drop twice for one sentence.
    """
    from app.config import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "ai_chat_daily_limit", 1, raising=False)
    await _register(client, "u-cont")

    first = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-cont"}, json={"message": "how am I doing"})
    assert first.status_code == 200

    cont = await client.post(
        "/v1/ai/chat",
        headers={"X-Ignyt-Uid": "u-cont"},
        json={"message": "how am I doing",
              "toolResults": [{"action": "getProgress", "result": {"changeKg": -0.9}, "ok": True}]},
    )
    assert cont.status_code == 200, "the continuation must not be rate-limited"


# ------------------------------------------------------------------ request bounds


async def test_oversized_context_is_refused(client, stub_model):
    await _register(client, "u-ctx")
    r = await client.post(
        "/v1/ai/chat",
        headers={"X-Ignyt-Uid": "u-ctx"},
        json={"message": "hi", "context": {"junk": "x" * 5000}},
    )
    assert r.status_code == 422


async def test_message_length_is_bounded(client, stub_model):
    await _register(client, "u-len")
    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-len"}, json={"message": "x" * 3000})
    assert r.status_code == 422


async def test_history_is_capped_at_the_route(client, stub_model):
    """The schema refuses an unbounded conversation before it costs anything."""
    await _register(client, "u-hist")
    too_long = [{"role": "user", "text": f"turn {i}"} for i in range(30)]
    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-hist"},
                          json={"message": "and now?", "history": too_long})
    assert r.status_code == 422


def test_history_is_trimmed_before_it_reaches_the_model():
    """Cost control, tested where it actually happens.

    The trim lives in _payload(), not in the route — the route hands the whole (already
    length-capped) history down and the service sends only the tail. Asserting this through
    a stubbed service would have proved nothing, since the stub replaces the code that trims.
    """
    history = [{"role": "user" if i % 2 == 0 else "assistant", "text": f"turn {i}"} for i in range(10)]
    body = gemini_chat._payload(
        message="and now?", context=None, history=history[-6:], tool_results=None, max_tokens=400
    )
    # six history turns plus the current user message
    assert len(body["contents"]) == 7
    assert body["contents"][0]["parts"][0]["text"] == "turn 4", "should keep the LAST six, not the first"
    assert body["generationConfig"]["maxOutputTokens"] == 400


# ------------------------------------------------------------------ failure surfaces


async def test_model_failure_becomes_a_clean_503(client, monkeypatch):
    async def boom(**kwargs):
        raise gemini_chat.AiUnavailable("The AI is unavailable right now.")

    monkeypatch.setattr(gemini_chat, "chat", boom)
    await _register(client, "u-fail")
    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-fail"}, json={"message": "hi"})
    assert r.status_code == 503


async def test_missing_api_key_is_distinguishable_from_an_outage(client, monkeypatch):
    """A deployment problem and a provider outage need different messages."""

    async def unconfigured(**kwargs):
        raise gemini_chat.AiNotConfigured("AI is not configured on this server.")

    monkeypatch.setattr(gemini_chat, "chat", unconfigured)
    await _register(client, "u-nokey")
    r = await client.post("/v1/ai/chat", headers={"X-Ignyt-Uid": "u-nokey"}, json={"message": "hi"})
    assert r.status_code == 503
    # The app's error envelope nests under "error" — see core/errors.py's handler.
    assert r.json()["error"]["code"] == "ai_not_configured"


# ------------------------------------------------------------------ model routing


def test_logging_commands_use_the_cheap_model_and_questions_use_the_capable_one():
    """Extraction is most of the daily volume, so it is what routing has to get right."""
    from app.config import get_settings

    s = get_settings()
    light, full = s.gemini_model_light, s.gemini_model

    for extraction in ["I ate 200g of chicken", "log my weight as 96.8", "I walked 10000 steps",
                       "I finished my workout"]:
        assert gemini_chat._pick_model(s, extraction, None) == light, extraction

    for reasoning in ["Why did my weight increase this week?",
                      "How should I structure my training to lose fat while keeping strength?"]:
        assert gemini_chat._pick_model(s, reasoning, None) == full, reasoning


def test_the_second_pass_always_uses_the_capable_model():
    """By then the data is in hand and the job is reasoning about it, not extraction."""
    from app.config import get_settings

    s = get_settings()
    assert gemini_chat._pick_model(s, "I ate 200g of chicken",
                                   [{"action": "addFoodLog", "result": {}}]) == s.gemini_model
