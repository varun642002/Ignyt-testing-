"""
AI food scanning routes.

    GET  /v1/food/scan-status     entitlement + today's allowance
    POST /v1/food/scan            multipart image -> recognised foods + nutrition
    POST /v1/food/community       save a user-confirmed AI estimate

THE PIPELINE, IN ORDER
    entitlement -> allowance -> validate upload -> Gemini identify -> per food:
    Community Foods lookup -> hit? use stored values : ask Gemini to estimate

Cheap checks run before expensive ones on purpose. A free user, or one who has used all
fifteen scans, is refused before the request body is even read — there is no reason to make
someone upload a photo we are going to reject.
"""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import current_user
from ..config import Settings, get_settings
from ..core.errors import ValidationFailed
from ..db.models import User
from ..db.session import get_db
from ..logging_config import get_logger
from ..schemas.food import (
    ConfirmFoodRequest,
    ConfirmFoodResponse,
    Nutrition,
    RecognisedFood,
    ScanResponse,
    ScanStatusResponse,
)
from ..services import food_matching, gemini_vision

router = APIRouter(prefix="/food", tags=["food"])
log = get_logger("ignyt.ai_food")

# Magic bytes, because a Content-Type header is client-asserted and therefore not evidence.
_SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",  # RIFF....WEBP; the WEBP tag is checked below
}


def _sniff_mime(data: bytes) -> str | None:
    for sig, mime in _SIGNATURES.items():
        if data.startswith(sig):
            if mime == "image/webp" and data[8:12] != b"WEBP":
                continue
            return mime
    return None


@router.get("/scan-status", response_model=ScanStatusResponse)
async def scan_status(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ScanStatusResponse:
    """Drives the "AI Scans Today 12 / 15 Remaining" readout, and whether to show the button.

    `ai_configured` is a boolean derived from whether a key is set. The key itself is never
    part of any response.
    """
    usage = await food_matching.scan_usage_today(db, user)
    return ScanStatusResponse(
        ai_configured=settings.ai_configured,
        is_premium=user.is_premium,
        daily_limit=settings.ai_scan_daily_limit,
        used_today=usage.count,
        remaining=food_matching.remaining_scans(usage.count, settings),
    )


@router.post("/scan", response_model=ScanResponse)
async def scan_food(
    image: UploadFile = File(...),
    # Names the client already matched in its own bundled catalogue. Those are skipped here:
    # the device answered it locally, faster and free, and re-asking a vision model would be
    # slower and less accurate than the record we already hold.
    matched_local: str = Form(default=""),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ScanResponse:
    # 1. Entitlement and allowance, before the body is read.
    usage = await food_matching.assert_can_scan(db, user, settings)

    # 2. Validate the upload. Size ceiling enforced while reading so an oversized body is
    #    abandoned rather than buffered in full.
    data = await image.read(settings.max_upload_bytes + 1)
    if not data:
        raise ValidationFailed("No image was uploaded.")
    if len(data) > settings.max_upload_bytes:
        raise ValidationFailed(
            f"Image is too large. The limit is {settings.max_upload_bytes // (1024 * 1024)} MB — "
            "the app compresses photos before upload, so this usually means an unmodified original."
        )
    mime = _sniff_mime(data)
    if mime is None:
        raise ValidationFailed("That file is not a JPEG, PNG or WebP image.")

    # 3. Identify. Raises FoodNotRecognised / AiUnavailable, both of which the client
    #    already knows how to offer a retry or manual entry for.
    identified = await gemini_vision.identify_foods(settings, data, mime)

    # 4. Only now, after the call actually succeeded, does the scan count. Charging on entry
    #    would burn an allowance on an outage the user did not cause.
    usage.count += 1

    already_local = {food_matching.search_key(n) for n in matched_local.split("|") if n.strip()}

    # THREE PHASES, AND THE SPLIT IS NOT ARBITRARY.
    #
    # This was one sequential loop, and a seven-dish thali took 43 s of wall clock: each
    # nutrition estimate waited for the one before it even though none of them depend on each
    # other. The fix is to run the network calls together — but only those.
    #
    # Phase 1 (sequential) resolves what the DB can answer. It has to stay sequential because a
    # SQLAlchemy AsyncSession is NOT safe for concurrent use; firing these off with gather()
    # corrupts the session rather than speeding anything up, and it would fail intermittently,
    # which is the worst way to fail.
    #
    # Phase 2 (concurrent) is the part that is actually slow and actually independent: one HTTP
    # call per unmatched food, bounded by a semaphore.
    #
    # Phase 3 (sequential) reassembles in the ORIGINAL order. gather() preserves input order,
    # but the results have to be woven back into the full list, and a plate whose items came
    # back shuffled would be a strange thing to hand someone.

    slots: list[dict] = []
    for item in identified["foods"]:
        name = str(item.get("name", "")).strip()
        grams = float(item.get("estimated_grams") or 0) or 100.0
        ingredients = [str(i) for i in (item.get("ingredients") or [])]
        base = {
            "name": name,
            "ingredients": ingredients,
            "serving_label": item.get("serving_label"),
            "estimated_grams": grams,
            "confidence": max(0.0, min(1.0, float(item.get("confidence") or 0))),
        }

        # The client already has this one; it will use its own record.
        if food_matching.search_key(name) in already_local:
            slots.append({"base": base, "resolved": RecognisedFood(**base, nutrition_source="none")})
            continue

        hit = await food_matching.find_community_food(db, name)
        if hit is not None:
            slots.append({"base": base, "resolved": RecognisedFood(
                **base,
                nutrition_source="community",
                nutrition_confidence=1.0,   # a stored, human-confirmed record
                nutrition=Nutrition(
                    calories=hit.calories, protein=hit.protein, carbs=hit.carbs,
                    fat=hit.fat, fibre=hit.fibre, sugar=hit.sugar, sodium=hit.sodium,
                ),
            )})
            continue

        slots.append({"base": base, "resolved": None, "name": name, "ingredients": ingredients})

    pending = [s for s in slots if s["resolved"] is None]
    if pending:
        sem = asyncio.Semaphore(max(1, settings.ai_estimate_concurrency))

        async def estimate(slot: dict):
            async with sem:
                return await gemini_vision.estimate_nutrition(
                    settings, slot["name"], slot["ingredients"]
                )

        # return_exceptions: one food failing must not take the plate with it. The others are
        # still useful and the user can type the missing one in by hand.
        results = await asyncio.gather(*(estimate(s) for s in pending), return_exceptions=True)

        for slot, est in zip(pending, results):
            if isinstance(est, Exception):
                if not isinstance(est, gemini_vision.AiUnavailable):
                    raise est          # a real bug here should not be swallowed as "no data"
                log.warning("nutrition_estimate_failed", extra={"food": slot["name"]})
                slot["resolved"] = RecognisedFood(**slot["base"], nutrition_source="none")
                continue
            slot["resolved"] = RecognisedFood(
                **slot["base"],
                nutrition_source="ai_estimate",
                nutrition_confidence=max(0.0, min(1.0, float(est.get("confidence") or 0))),
                nutrition=Nutrition(
                    calories=float(est.get("calories") or 0),
                    protein=est.get("protein"), carbs=est.get("carbs"), fat=est.get("fat"),
                    fibre=est.get("fibre"), sugar=est.get("sugar"),
                ),
            )

    out: list[RecognisedFood] = [s["resolved"] for s in slots]

    return ScanResponse(
        foods=out,
        meal_type=identified.get("meal_type"),
        remaining=food_matching.remaining_scans(usage.count, settings),
        daily_limit=settings.ai_scan_daily_limit,
    )


@router.post("/community", response_model=ConfirmFoodResponse)
async def confirm_community_food(
    payload: ConfirmFoodRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> ConfirmFoodResponse:
    """Save an AI estimate the user has reviewed, so the next scan of it is a database hit.

    Deliberately NOT gated on premium. Anyone correcting a food is improving the shared
    catalogue, and putting a paywall in front of that would mean fewer corrections and a worse
    database for everyone.
    """
    row = await food_matching.save_community_food(
        db, user=user,
        name=payload.name, calories=payload.calories, protein=payload.protein,
        carbs=payload.carbs, fat=payload.fat, fibre=payload.fibre, sugar=payload.sugar,
        sodium=payload.sodium, serving_grams=payload.serving_grams,
        serving_label=payload.serving_label, category=payload.category,
    )
    return ConfirmFoodResponse(id=row.id, name=row.name, confirmations=row.confirmations)
