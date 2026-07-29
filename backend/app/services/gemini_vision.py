"""
Gemini Vision food recognition.

THE KEY NEVER LEAVES THIS PROCESS. It is read from settings (environment), used to sign one
outbound HTTPS call, and is never returned by a route, never logged, and never echoed in an
error message. The client is told `ai_configured: true|false` and nothing more.

WHAT GEMINI IS ASKED FOR, AND WHAT IT IS NOT
Per the brief, identification only: food name, ingredients, serving size, estimated grams,
meal type, confidence. Nutrition is NOT requested on the first pass, because the catalogue is
the authority whenever it has the food — asking a model to invent numbers we already hold
would be slower, cost more, and be less accurate.

`estimate_nutrition()` is the second, conditional call: it runs only when the catalogue has no
match, and the result is labelled AI-estimated all the way to the screen.

RESPONSE SHAPE IS ENFORCED, NOT HOPED FOR
Both calls use responseMimeType=application/json with an explicit responseSchema, so the model
returns parseable JSON rather than prose containing JSON. The parse is still defensive — a
model that returns something unexpected must surface as a clean typed error the UI can offer a
retry for, not a 500.
"""
from __future__ import annotations

import base64
import json
from typing import Any, Dict, List, Optional

import httpx

from ..config import Settings
from ..core.errors import AppError
from ..logging_config import get_logger

log = get_logger("ignyt.ai_food")

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class AiUnavailable(AppError):
    """Gemini could not be reached, or is not configured. The UI offers retry + manual entry."""

    code = "ai_unavailable"
    status_code = 503
    message = "AI scanning is temporarily unavailable. You can enter this meal manually."


class AiNotConfigured(AppError):
    code = "ai_not_configured"
    status_code = 503
    message = "AI scanning is not configured on this server."


class FoodNotRecognised(AppError):
    """The model looked and did not find food. Distinct from a failure — retrying the same
    photo will not help, so the UI should suggest a better photo or manual entry."""

    code = "food_not_recognised"
    status_code = 422
    message = "We couldn't identify any food in that photo. Try a clearer, closer shot."


# --- structured output schemas -------------------------------------------------------

_IDENTIFY_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "foods": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "ingredients": {"type": "array", "items": {"type": "string"}},
                    "serving_label": {"type": "string"},
                    "estimated_grams": {"type": "number"},
                    "confidence": {"type": "number"},
                },
                "required": ["name", "estimated_grams", "confidence"],
            },
        },
        "meal_type": {"type": "string"},
        "is_food": {"type": "boolean"},
    },
    "required": ["foods", "is_food"],
}

_NUTRITION_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "calories": {"type": "number"},
        "protein": {"type": "number"},
        "carbs": {"type": "number"},
        "fat": {"type": "number"},
        "fibre": {"type": "number"},
        "sugar": {"type": "number"},
        "confidence": {"type": "number"},
    },
    "required": ["calories", "protein", "carbs", "fat", "confidence"],
}

_IDENTIFY_PROMPT = (
    "You are a food identification system for a fitness app. Look at the photo and identify "
    "every distinct food item you can see.\n"
    "For each item give: the common consumer name people would search for (not a scientific "
    "or brand name unless the brand is clearly visible), its main visible ingredients, a "
    "human serving description such as '1 bowl' or '2 rotis', your estimate of its weight in "
    "grams, and your confidence from 0 to 1.\n"
    "Estimate weight from visible portion size against reference objects in frame (plate, "
    "cutlery, hand). Be conservative: a typical restaurant plate of rice is 150-250 g.\n"
    "Also give the most likely meal_type, one of: Breakfast, Lunch, Dinner, Snack, "
    "Pre Workout, Post Workout.\n"
    "Set is_food to false if the photo contains no food at all.\n"
    "Do NOT estimate calories or macronutrients. Identification only."
)

_NUTRITION_PROMPT = (
    "Give typical nutrition PER 100 GRAMS for the food described below. Use standard "
    "composition-table values for the generic form of this food. Numbers only, no ranges.\n"
    "Include your confidence from 0 to 1 — be honest, a dish you are unsure about should "
    "score low.\n\nFood: {name}\nIngredients: {ingredients}"
)


def _extract_json(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Pull the JSON object out of a Gemini generateContent response.

    Defensive on purpose: a shape change upstream must become a typed AiUnavailable that the
    UI can retry, never an unhandled exception that becomes a 500 with no guidance.
    """
    try:
        parts = payload["candidates"][0]["content"]["parts"]
        text = "".join(p.get("text", "") for p in parts).strip()
    except (KeyError, IndexError, TypeError) as exc:
        log.warning("gemini_unexpected_shape", extra={"error": str(exc)})
        raise AiUnavailable("The AI service returned an unexpected response.") from exc

    if not text:
        raise AiUnavailable("The AI service returned an empty response.")

    # responseMimeType=application/json means this should already be bare JSON. Strip a
    # ```json fence anyway — models occasionally add one and failing on it would be a
    # self-inflicted outage.
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[1] if "\n" in text else text
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        log.warning("gemini_bad_json", extra={"error": str(exc)})
        raise AiUnavailable("The AI service returned malformed data.") from exc


async def _call_gemini(
    settings: Settings,
    parts: List[Dict[str, Any]],
    schema: Dict[str, Any],
) -> Dict[str, Any]:
    if not settings.gemini_api_key:
        raise AiNotConfigured()

    url = GEMINI_ENDPOINT.format(model=settings.gemini_model)
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema,
            # Low temperature: this is a measurement task, not a creative one. The same plate
            # should not produce a different weight on each attempt.
            "temperature": 0.1,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
            # Key goes in a header, not the query string — query strings end up in proxy and
            # access logs.
            resp = await client.post(url, json=body, headers={"x-goog-api-key": settings.gemini_api_key})
    except httpx.TimeoutException as exc:
        raise AiUnavailable("The AI service took too long to respond. Please try again.") from exc
    except httpx.HTTPError as exc:
        log.warning("gemini_transport_error", extra={"error": type(exc).__name__})
        raise AiUnavailable() from exc

    if resp.status_code == 429:
        raise AiUnavailable("The AI service is rate limited right now. Please try again shortly.")
    if resp.status_code >= 400:
        # Log the status, never the body — an upstream error body can echo the request, and
        # the request carries the key header on some proxies.
        log.warning("gemini_http_error", extra={"status": resp.status_code})
        raise AiUnavailable()

    return _extract_json(resp.json())


async def identify_foods(settings: Settings, image_bytes: bytes, mime_type: str) -> Dict[str, Any]:
    """Identify the foods in a photo. Returns {"foods": [...], "meal_type": str|None}."""
    parts = [
        {"text": _IDENTIFY_PROMPT},
        {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode("ascii")}},
    ]
    data = await _call_gemini(settings, parts, _IDENTIFY_SCHEMA)

    if not data.get("is_food", True):
        raise FoodNotRecognised()
    foods = [f for f in (data.get("foods") or []) if f.get("name")]
    if not foods:
        raise FoodNotRecognised()

    return {"foods": foods, "meal_type": data.get("meal_type")}


async def estimate_nutrition(
    settings: Settings, name: str, ingredients: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Per-100 g nutrition for a food the catalogue does not have.

    Only called on a catalogue miss. Everything it returns is surfaced to the user as
    "AI Estimated" and is editable before it is saved.
    """
    prompt = _NUTRITION_PROMPT.format(name=name, ingredients=", ".join(ingredients or []) or "unspecified")
    return await _call_gemini(settings, [{"text": prompt}], _NUTRITION_SCHEMA)
