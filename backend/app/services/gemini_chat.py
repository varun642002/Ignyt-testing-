"""IGNYT AI Coach — the Gemini chat call, with tool calling.

WHY THIS SERVICE RETURNS TOOL CALLS INSTEAD OF PERFORMING THEM
The obvious design is backend-executes-tool, and it is wrong for this app: there is no
server-side copy of the user's fitness data. `app/db/models.py` has exactly three tables —
users, ai_scan_usage, community_foods — and the food log, body log, workout history and
streak all live in localStorage on the device (with optional Firestore sync the user owns).
A backend `addFoodLog()` would have nothing to write to.

So the split is:
    this service   holds the API key, the tool SCHEMA, auth, the rate limit and the usage
                   counter — everything that must not be on a phone
    the device     holds the data and the ACTION REGISTRY (www/js/ai/actions.js) that runs
                   the call and re-validates every argument

That keeps both properties the brief actually asks for: the key is never shipped to a client,
and the model can only ever name one of a fixed set of actions. What it gives up is a
server-side audit log of mutations, which cannot exist for data the server never sees.

COST CONTROL IS STRUCTURAL, not a setting. The system instruction is short and constant. The
caller sends a bounded slice of context chosen on the device, never the database. History is
capped at the last few turns rather than replayed in full. max_output_tokens is set low
because the product wants short answers anyway — the brief's "avoid long paragraphs" and the
cost ceiling happen to be the same instruction.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from ..config import Settings
from ..core.errors import AppError

logger = logging.getLogger(__name__)

_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class AiUnavailable(AppError):
    """Gemini could not be reached, or answered with something unusable."""

    status_code = 503
    code = "ai_unavailable"


class AiNotConfigured(AppError):
    """No API key. A deployment problem, not a user problem — say so distinctly."""

    status_code = 503
    code = "ai_not_configured"


# --------------------------------------------------------------------------------------
# The tool schema.
#
# This list IS the contract with the model, and it mirrors the client registry in
# www/js/ai/actions.js one-for-one. Both must be edited together: a tool named here that the
# client does not implement produces a call the device refuses, and an action the client has
# but this omits is one the model will never think to use.
#
# Descriptions are written for the model, not for a developer. "grams" says grams because a
# model told only "amount" will cheerfully pass "2" meaning two bananas.
# --------------------------------------------------------------------------------------
TOOLS: List[Dict[str, Any]] = [
    {
        "name": "getUserProfile",
        "description": "The user's name, age, height, current and target weight, equipment and training days.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "getProgress",
        "description": "Recent weight entries and the net change. Use for any question about weight, trend or progress.",
        "parameters": {
            "type": "object",
            "properties": {"days": {"type": "integer", "description": "How many days back. Default 30."}},
        },
    },
    {
        "name": "getFoodLog",
        "description": "Everything logged on a date, with calorie and macro totals.",
        "parameters": {
            "type": "object",
            "properties": {"date": {"type": "string", "description": "YYYY-MM-DD. Omit for today."}},
        },
    },
    {
        "name": "getTodayWorkout",
        "description": "The workout in progress, or today's planned session.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "getWorkoutHistory",
        "description": "Recent completed workouts with volume and duration.",
        "parameters": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "description": "How many. Default 8, max 30."}},
        },
    },
    {
        "name": "getStreak",
        "description": "The user's current training streak in days.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "getIGNYTScore",
        "description": "Today's IGNYT Score and level.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "getGoals",
        "description": "The user's active goal and target weight.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "searchFood",
        "description": "Look a food up in the IGNYT database to get its real per-100g nutrition. "
                       "Always prefer this over estimating nutrition yourself.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "The food name."}},
            "required": ["query"],
        },
    },
    {
        "name": "addFoodLog",
        "description": "Log a food the user says they ate. Call once per distinct food. If the user gave no "
                       "amount at all, omit both grams and quantity — the app will ask rather than guessing.",
        "parameters": {
            "type": "object",
            "properties": {
                # Split from the amount deliberately. Told only "the name as the user said it",
                # the model sent food="2 eggs" and food="3 roti" — commonly in Hindi and
                # Hinglish, where the count and the noun are one phrase — and the search then
                # looked up a string containing a digit.
                "food": {"type": "string",
                         "description": "The food ONLY, with no number and no unit. "
                                        "'2 eggs' -> 'egg'. '3 roti' -> 'roti'. 'half a banana' -> 'banana'."},
                # Preferred over grams for anything countable. The app owns the per-food weights
                # (egg 50 g, roti 40 g, banana 118 g) and converts, so the model never has to
                # invent one — which it cannot do reliably for regional foods.
                "quantity": {"type": "number",
                             "description": "HOW MANY, when the user counted them: '2 eggs' -> 2, "
                                            "'3 roti' -> 3, 'half a banana' -> 0.5. Prefer this over grams."},
                "unit": {"type": "string",
                         "description": "What is being counted: piece, egg, idli, dosa, slice, cup. "
                                        "Defaults to piece."},
                "grams": {"type": "number",
                          "description": "Use ONLY when the user actually gave a weight, e.g. '200g of chicken'."},
                "meal": {"type": "string", "description": "Breakfast, Lunch, Dinner or Snacks. Omit to use the time of day."},
                "date": {"type": "string", "description": "YYYY-MM-DD. Omit for today."},
            },
            "required": ["food"],
        },
    },
    {
        "name": "updateFoodLog",
        "description": "Change the amount of an already-logged food.",
        "parameters": {
            "type": "object",
            "properties": {
                "entryId": {"type": "string", "description": "The id from getFoodLog."},
                "grams": {"type": "number", "description": "The corrected amount in grams."},
            },
            "required": ["entryId", "grams"],
        },
    },
    {
        "name": "deleteFoodLog",
        "description": "Remove a logged food. The app will ask the user to confirm before anything is deleted.",
        "parameters": {
            "type": "object",
            "properties": {"entryId": {"type": "string", "description": "The id from getFoodLog."}},
            "required": ["entryId"],
        },
    },
    {
        "name": "logWeight",
        "description": "Record the user's body weight in KILOGRAMS. Convert from pounds before calling.",
        "parameters": {
            "type": "object",
            "properties": {
                "weightKg": {"type": "number", "description": "Weight in kg."},
                "date": {"type": "string", "description": "YYYY-MM-DD. Omit for today."},
            },
            "required": ["weightKg"],
        },
    },
    {
        "name": "startWorkout",
        "description": "Open and begin today's planned workout. Use for 'start my workout' or "
                       "'let's train'. Takes the user to the workout screen.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "completeWorkout",
        "description": "Finish and save the workout currently in progress.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "updateSteps",
        "description": "Report the user's step count. IGNYT reads steps from Health Connect and does NOT store typed ones, so this returns today's measured figure when it exists and otherwise explains that. Do not promise the user their number was saved.",
        "parameters": {
            "type": "object",
            "properties": {
                "steps": {"type": "integer", "description": "Step count."},
                "date": {"type": "string", "description": "YYYY-MM-DD. Omit for today."},
            },
            "required": ["steps"],
        },
    },
]


# --------------------------------------------------------------------------------------
# The system instruction.
#
# Short on purpose: it is resent on every single turn, so each sentence here is a recurring
# cost. Everything that can be enforced in code is enforced in code instead — the argument
# ranges, the confirmation rules and the action allow-list all live where a model cannot
# talk its way past them.
# --------------------------------------------------------------------------------------
SYSTEM_INSTRUCTION = (
    "You are IGNYT AI, a fitness coach inside the IGNYT app.\n"
    "STYLE: very short. Bullet points over paragraphs. Lead with the number that answers the "
    "question. Never write more than about 60 words unless asked to explain something in depth.\n"
    "TOOLS: when the user reports doing something (ate, weighed, walked, finished a workout), "
    "call the matching tool rather than describing what they could do. When a question depends "
    "on their data, fetch it with a tool instead of guessing or asking them to tell you.\n"
    "NUTRITION: never invent calories or macros for a food. Use searchFood or addFoodLog, which "
    "read the real database.\n"
    "DATES: the context carries today's date. Work every relative date out from that value — "
    "'yesterday' is the day before it. Never guess a date from your own sense of when now is; "
    "you do not have one.\n"
    "SAFETY: you are not a doctor. For pain, injury, medication, eating disorders or any medical "
    "question, do not diagnose and do not give confident medical advice — say plainly that it "
    "needs a professional, and keep any fitness guidance conservative. Never tell someone to "
    "train through significant pain."
)


def _payload(
    message: str,
    context: Optional[Dict[str, Any]],
    history: List[Dict[str, str]],
    tool_results: Optional[List[Dict[str, Any]]],
    max_tokens: int,
) -> Dict[str, Any]:
    """Build the generateContent body.

    Context arrives already minimised by the device — this service does not get to decide
    what personal data is in scope, because it never has more than the caller sent.
    """
    contents: List[Dict[str, Any]] = []

    for turn in history:
        role = "model" if turn.get("role") == "assistant" else "user"
        text = str(turn.get("text") or "")[:600]
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})

    user_parts: List[Dict[str, Any]] = []
    if context:
        user_parts.append({"text": "Context (only what is relevant to this request):\n"
                                   + json.dumps(context, separators=(",", ":"))[:2000]})
    user_parts.append({"text": message[:2000]})
    contents.append({"role": "user", "parts": user_parts})

    # A second pass: the device ran the tools and is handing back what they returned.
    if tool_results:
        parts = [
            {"functionResponse": {"name": r.get("action", "unknown"),
                                  "response": {"result": r.get("result")}}}
            for r in tool_results[:6]
        ]
        contents.append({"role": "user", "parts": parts})

    return {
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": contents,
        "tools": [{"functionDeclarations": TOOLS}],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": 0.4,          # a coach should not be inventive about numbers
        },
    }


def _parse(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Pull text and/or function calls out of a Gemini response.

    Returns {"text": str|None, "toolCalls": [{"action","args"}]}. A response with neither is
    treated as unusable rather than shown as an empty bubble.
    """
    try:
        candidates = payload.get("candidates") or []
        if not candidates:
            raise AiUnavailable("The AI returned no answer.")
        parts = (candidates[0].get("content") or {}).get("parts") or []
    except (AttributeError, TypeError, IndexError) as exc:
        raise AiUnavailable("The AI returned something unreadable.") from exc

    text_bits: List[str] = []
    calls: List[Dict[str, Any]] = []
    for part in parts:
        if "text" in part and part["text"]:
            text_bits.append(str(part["text"]))
        fc = part.get("functionCall")
        if fc and fc.get("name"):
            calls.append({"action": str(fc["name"]), "args": fc.get("args") or {}})

    text = "\n".join(text_bits).strip() or None
    if not text and not calls:
        raise AiUnavailable("The AI returned an empty answer.")
    return {"text": text, "toolCalls": calls}


# Verbs that mean "the user is reporting something they did". Matching one of these makes a
# message extraction rather than reasoning: pull a number and a noun out of a sentence and
# call a tool. Deliberately narrow — it only has to catch the common phrasings, because the
# cost of a miss is a slightly more expensive call, never a wrong answer.
_EXTRACTION_HINTS = (
    "i ate", "i had", "i drank", "add ", "log ", "logged", "i weigh", "my weight",
    "i walked", "steps", "i finished", "i completed", "i did ", "record ", "delete ",
)


def _pick_model(settings: Settings, message: str, tool_results: Optional[List[Dict[str, Any]]]) -> str:
    """Choose the cheap model or the capable one.

    A HEURISTIC IS SAFE HERE AND WOULD NOT BE ELSEWHERE. This picks which model reads the
    sentence; it does not decide what happens to the user's data. Getting it wrong costs a
    slightly worse sentence or a slightly larger bill — the action still has to come back
    through the allow-list and then through the device's own validation. Intent detection,
    by contrast, is left entirely to the model, because a regex that decides to log a weight
    is a regex that eventually logs the wrong one.

    The second pass always uses the capable model: by then the tool results are in hand and
    the job is to say something useful about them, which is the reasoning half.
    """
    if tool_results:
        return settings.gemini_model
    low = message.strip().lower()

    # A QUESTION IS NEVER EXTRACTION, and this test has to come first. "Why did my weight
    # increase this week?" contains "my weight", which is one of the hints below — without
    # this line it routed a reasoning question to the cheapest model, which is precisely the
    # request that needs the better one. Caught by test_logging_commands_use_the_cheap_model.
    if low.endswith("?") or low.startswith(("why", "how", "what", "should", "can i", "is it", "when", "which")):
        return settings.gemini_model

    if len(low) <= 120 and any(h in low for h in _EXTRACTION_HINTS):
        return settings.gemini_model_light
    return settings.gemini_model


async def chat(
    settings: Settings,
    message: str,
    context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
    tool_results: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """One turn. Raises AiNotConfigured / AiUnavailable; never returns a partial result."""
    if not settings.gemini_api_key:
        raise AiNotConfigured("AI is not configured on this server.")

    body = _payload(
        message=message,
        context=context,
        history=(history or [])[-6:],   # last three exchanges; older turns are not resent
        tool_results=tool_results,
        max_tokens=settings.ai_chat_max_output_tokens,
    )
    url = _GENERATE_URL.format(model=_pick_model(settings, message, tool_results))

    try:
        async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
            # THE KEY GOES IN A HEADER, NEVER THE QUERY STRING.
            # Gemini accepts either. Passing it as ?key= leaks it into every place a URL gets
            # written down, and httpx logs the full request line at INFO — so the first real
            # call printed the live key into the server log in plaintext. Headers are not
            # logged by httpx, are not captured by proxy access logs, and do not survive in an
            # exception's repr. Observed, not theorised: it appeared in uvicorn's output the
            # first time this route answered.
            resp = await client.post(
                url,
                headers={"x-goog-api-key": settings.gemini_api_key},
                json=body,
            )
        if resp.status_code == 429:
            raise AiUnavailable("The AI is busy. Try again in a moment.")
        resp.raise_for_status()
    except httpx.TimeoutException as exc:
        raise AiUnavailable("The AI took too long to answer.") from exc
    except httpx.HTTPError as exc:
        # Deliberately does not include the response body: it can echo the API key back in an
        # error string, and this logger writes to files somebody else can read.
        logger.warning("gemini chat call failed: %s", type(exc).__name__)
        raise AiUnavailable("The AI is unavailable right now.") from exc

    return _parse(resp.json())
