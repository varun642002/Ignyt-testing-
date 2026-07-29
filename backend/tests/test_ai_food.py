"""
AI food scanning tests.

Gemini is stubbed. These verify OUR logic — entitlement, the daily allowance, upload
validation, the community-catalogue-before-AI order, and that a failure degrades usefully —
none of which should need a network call or an API key to test. The one thing that genuinely
requires a live key is whether Gemini identifies food correctly, and that is Google's contract
to keep, not something a unit test can assert.
"""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 512          # valid JPEG magic
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 512
NOT_AN_IMAGE = b"%PDF-1.4 this is not an image"


async def _premium(client, uid):
    """Provision a user and mark them premium (the app has no billing route yet)."""
    await client.get("/v1/me", headers={"X-Ignyt-Uid": uid})
    from sqlalchemy import select
    from app.db.base import SessionLocal
    from app.db.models import User

    async with SessionLocal() as db:
        user = (await db.execute(select(User).where(User.firebase_uid == uid))).scalar_one()
        user.is_premium = True
        await db.commit()


@pytest.fixture()
def fake_gemini(monkeypatch):
    """Stand in for Gemini. Records calls so tests can assert it was NOT called."""
    from app.services import gemini_vision

    calls = {"identify": 0, "estimate": 0}

    async def identify(settings, image_bytes, mime_type):
        calls["identify"] += 1
        return {
            "foods": [{"name": "Palak Paneer", "ingredients": ["spinach", "paneer"],
                       "serving_label": "1 bowl", "estimated_grams": 220, "confidence": 0.88}],
            "meal_type": "Dinner",
        }

    async def estimate(settings, name, ingredients=None):
        calls["estimate"] += 1
        return {"calories": 180, "protein": 8, "carbs": 6, "fat": 14, "fibre": 2,
                "sugar": 2, "confidence": 0.6}

    monkeypatch.setattr(gemini_vision, "identify_foods", identify)
    monkeypatch.setattr(gemini_vision, "estimate_nutrition", estimate)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-not-real")

    from app.config import get_settings
    get_settings.cache_clear()
    yield calls
    get_settings.cache_clear()


# --- entitlement ---------------------------------------------------------------------

async def test_scan_requires_identity(client):
    r = await client.post("/v1/food/scan", files={"image": ("m.jpg", JPEG, "image/jpeg")})
    assert r.status_code == 401


async def test_free_user_cannot_scan(client, fake_gemini):
    await client.get("/v1/me", headers={"X-Ignyt-Uid": "free-user"})
    r = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "free-user"},
                          files={"image": ("m.jpg", JPEG, "image/jpeg")})
    assert r.status_code == 402
    assert r.json()["error"]["code"] == "premium_required"
    # Refused before any AI call — a rejected user must not cost us a request.
    assert fake_gemini["identify"] == 0


async def test_scan_status_reports_allowance(client):
    await _premium(client, "status-user")
    r = await client.get("/v1/food/scan-status", headers={"X-Ignyt-Uid": "status-user"})
    assert r.status_code == 200
    body = r.json()
    assert body["is_premium"] is True
    assert body["daily_limit"] == 15
    assert body["remaining"] == 15
    # The key must never appear in a response, only whether one is configured.
    assert set(body.keys()) == {"ai_configured", "is_premium", "daily_limit", "used_today", "remaining"}
    assert "key" not in str(body).lower() or body["ai_configured"] in (True, False)


# --- upload validation ---------------------------------------------------------------

async def test_rejects_non_image(client, fake_gemini):
    await _premium(client, "upload-user")
    r = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "upload-user"},
                          files={"image": ("x.pdf", NOT_AN_IMAGE, "image/jpeg")})
    # A truthful Content-Type is not evidence; the bytes are.
    assert r.status_code == 422
    assert fake_gemini["identify"] == 0


async def test_rejects_oversized_image(client, fake_gemini, monkeypatch):
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "1024")
    from app.config import get_settings
    get_settings.cache_clear()
    await _premium(client, "big-user")
    r = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "big-user"},
                          files={"image": ("m.jpg", JPEG + b"\x00" * 4096, "image/jpeg")})
    assert r.status_code == 422
    get_settings.cache_clear()


# --- the pipeline --------------------------------------------------------------------

async def test_scan_returns_ai_estimate_on_catalogue_miss(client, fake_gemini):
    await _premium(client, "scan-user")
    r = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "scan-user"},
                          files={"image": ("m.jpg", JPEG, "image/jpeg")})
    assert r.status_code == 200, r.text
    body = r.json()
    food = body["foods"][0]
    assert food["name"] == "Palak Paneer"
    assert food["estimated_grams"] == 220
    assert food["nutrition_source"] == "ai_estimate"
    assert food["nutrition"]["calories"] == 180
    assert body["meal_type"] == "Dinner"
    assert body["remaining"] == 14          # the scan was counted
    assert fake_gemini["estimate"] == 1


async def test_confirmed_food_is_used_instead_of_ai_next_time(client, fake_gemini):
    await _premium(client, "community-user")
    h = {"X-Ignyt-Uid": "community-user"}

    save = await client.post("/v1/food/community", headers=h, json={
        "name": "Palak Paneer", "calories": 165, "protein": 9, "carbs": 7, "fat": 12,
    })
    assert save.status_code == 200, save.text

    before = fake_gemini["estimate"]
    r = await client.post("/v1/food/scan", headers=h, files={"image": ("m.jpg", PNG, "image/png")})
    food = r.json()["foods"][0]
    assert food["nutrition_source"] == "community"
    assert food["nutrition"]["calories"] == 165      # the stored value, not the AI's 180
    assert fake_gemini["estimate"] == before          # and no second AI call was made


async def test_confirming_twice_reinforces_rather_than_duplicates(client):
    await _premium(client, "dup-user")
    h = {"X-Ignyt-Uid": "dup-user"}
    payload = {"name": "Dup Test Food", "calories": 100}
    a = await client.post("/v1/food/community", headers=h, json=payload)
    b = await client.post("/v1/food/community", headers=h, json=payload)
    assert a.json()["id"] == b.json()["id"]
    assert b.json()["confirmations"] == a.json()["confirmations"] + 1


async def test_locally_matched_foods_skip_the_ai_estimate(client, fake_gemini):
    """The device already had this food, so the server must not pay for an estimate."""
    await _premium(client, "local-user")
    before = fake_gemini["estimate"]
    r = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "local-user"},
                          files={"image": ("m.jpg", JPEG, "image/jpeg")},
                          data={"matched_local": "Palak Paneer"})
    assert r.json()["foods"][0]["nutrition_source"] == "none"
    assert fake_gemini["estimate"] == before


async def test_daily_limit_is_enforced_and_counts_only_successes(client, fake_gemini, monkeypatch):
    monkeypatch.setenv("AI_SCAN_DAILY_LIMIT", "2")
    from app.config import get_settings
    get_settings.cache_clear()

    await _premium(client, "limit-user")
    h = {"X-Ignyt-Uid": "limit-user"}
    f = {"image": ("m.jpg", JPEG, "image/jpeg")}

    assert (await client.post("/v1/food/scan", headers=h, files=f)).json()["remaining"] == 1
    assert (await client.post("/v1/food/scan", headers=h, files=f)).json()["remaining"] == 0

    third = await client.post("/v1/food/scan", headers=h, files=f)
    assert third.status_code == 429
    assert third.json()["error"]["code"] == "scan_limit_reached"
    get_settings.cache_clear()


async def test_ai_outage_does_not_consume_an_allowance(client, monkeypatch):
    """An outage the user did not cause must not cost them a scan."""
    from app.services import gemini_vision

    async def boom(settings, image_bytes, mime_type):
        raise gemini_vision.AiUnavailable()

    monkeypatch.setattr(gemini_vision, "identify_foods", boom)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-not-real")
    from app.config import get_settings
    get_settings.cache_clear()

    await _premium(client, "outage-user")
    h = {"X-Ignyt-Uid": "outage-user"}
    before = (await client.get("/v1/food/scan-status", headers=h)).json()["remaining"]

    r = await client.post("/v1/food/scan", headers=h, files={"image": ("m.jpg", JPEG, "image/jpeg")})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "ai_unavailable"

    after = (await client.get("/v1/food/scan-status", headers=h)).json()["remaining"]
    assert after == before
    get_settings.cache_clear()


async def test_missing_key_reports_not_configured_rather_than_crashing(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    from app.config import get_settings
    get_settings.cache_clear()

    await _premium(client, "nokey-user")
    r = await client.get("/v1/food/scan-status", headers={"X-Ignyt-Uid": "nokey-user"})
    assert r.json()["ai_configured"] is False

    scan = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "nokey-user"},
                             files={"image": ("m.jpg", JPEG, "image/jpeg")})
    assert scan.status_code == 503
    assert scan.json()["error"]["code"] == "ai_not_configured"
    get_settings.cache_clear()


# --- concurrency -----------------------------------------------------------------------

async def test_nutrition_estimates_run_concurrently(client, monkeypatch):
    """Four foods, each estimate sleeping 200 ms.

    Sequential that is >=800 ms; concurrent it is ~200. Asserting on elapsed time rather than
    on the code's shape, because "did we actually overlap" is the only thing that matters and
    a refactor could make it sequential again without touching the call site.
    """
    import asyncio
    import time

    from app.services import gemini_vision

    async def identify(settings, image_bytes, mime_type):
        return {"foods": [{"name": f"Test Food {i}", "estimated_grams": 100, "confidence": 0.9}
                          for i in range(4)],
                "meal_type": "Lunch"}

    async def slow_estimate(settings, name, ingredients=None):
        await asyncio.sleep(0.2)
        return {"calories": 100, "protein": 5, "carbs": 10, "fat": 3, "confidence": 0.7}

    monkeypatch.setattr(gemini_vision, "identify_foods", identify)
    monkeypatch.setattr(gemini_vision, "estimate_nutrition", slow_estimate)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-not-real")
    from app.config import get_settings
    get_settings.cache_clear()

    await _premium(client, "concurrent-user")
    t0 = time.perf_counter()
    r = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "concurrent-user"},
                          files={"image": ("m.jpg", JPEG, "image/jpeg")})
    elapsed = time.perf_counter() - t0

    assert r.status_code == 200, r.text
    assert len(r.json()["foods"]) == 4
    assert elapsed < 0.6, f"estimates look sequential: {elapsed:.2f}s for 4 x 200ms"
    get_settings.cache_clear()


async def test_one_failed_estimate_does_not_sink_the_plate(client, monkeypatch):
    """The second food's estimate blows up; the other three must still come back with data."""
    from app.services import gemini_vision

    async def identify(settings, image_bytes, mime_type):
        return {"foods": [{"name": f"Food {i}", "estimated_grams": 100, "confidence": 0.9}
                          for i in range(4)],
                "meal_type": "Lunch"}

    async def flaky(settings, name, ingredients=None):
        if name == "Food 1":
            raise gemini_vision.AiUnavailable()
        return {"calories": 120, "protein": 4, "carbs": 12, "fat": 4, "confidence": 0.8}

    monkeypatch.setattr(gemini_vision, "identify_foods", identify)
    monkeypatch.setattr(gemini_vision, "estimate_nutrition", flaky)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-not-real")
    from app.config import get_settings
    get_settings.cache_clear()

    await _premium(client, "flaky-user")
    r = await client.post("/v1/food/scan", headers={"X-Ignyt-Uid": "flaky-user"},
                          files={"image": ("m.jpg", JPEG, "image/jpeg")})
    assert r.status_code == 200
    foods = r.json()["foods"]
    # Order must survive the gather, and only the failing one loses its numbers.
    assert [f["name"] for f in foods] == ["Food 0", "Food 1", "Food 2", "Food 3"]
    assert foods[1]["nutrition_source"] == "none"
    assert foods[1]["nutrition"] is None
    assert all(foods[i]["nutrition"]["calories"] == 120 for i in (0, 2, 3))
    get_settings.cache_clear()
