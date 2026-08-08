"""IGNYT AI Coach — the chat endpoint.

WHAT THIS ROUTE IS RESPONSIBLE FOR
    the API key            never leaves this process
    identity               every request carries a verified Firebase token
    the daily allowance    counted per user per UTC day, in the existing ai_usage table
    the action allow-list  a tool name the model invents is dropped here, before the device
                           ever sees it, so the client is not the only thing standing between
                           a hallucinated action and the user's data
    request bounds         message length, history depth and context size are capped

WHAT IT DELIBERATELY DOES NOT DO
    execute actions. There is no server-side copy of the user's food log, body log or workout
    history — see the module docstring in services/gemini_chat.py. The device runs the action
    and re-validates the arguments a second time.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import current_user
from ..config import Settings, get_settings
from ..core.errors import AppError
from ..db.models import AiScanUsage, User
from ..db.session import get_db
from ..services import gemini_chat
from .routes_billing import is_entitled

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai"])

# Every action the model may name. Mirrors TOOLS in gemini_chat.py and the client registry in
# www/js/ai/actions.js. Kept as a set here so the check is a membership test rather than a
# scan of the schema on every response.
ALLOWED_ACTIONS = {t["name"] for t in gemini_chat.TOOLS}


class DailyLimitReached(AppError):
    status_code = 429
    code = "ai_daily_limit"


class NotEntitled(AppError):
    """AI Coach is a Pro feature and this account is not Pro."""

    status_code = 402
    code = "ai_requires_pro"


# ---------------------------------------------------------------------------- schemas


class HistoryTurn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    text: str = Field(max_length=600)


class ToolResult(BaseModel):
    action: str = Field(max_length=64)
    result: Any = None
    ok: bool = True


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Chosen on the device, per the brief's "send the minimum needed for this request". The
    # server caps the SIZE but cannot police the contents — it has no other copy to compare
    # against, which is exactly why the selection happens where the data lives.
    context: Optional[Dict[str, Any]] = None
    history: List[HistoryTurn] = Field(default_factory=list, max_length=10)
    toolResults: Optional[List[ToolResult]] = Field(default=None, max_length=6)
    # IANA zone, e.g. "Asia/Kolkata". Client-asserted on purpose — see _local_day: a forged
    # zone shifts WHEN the day rolls over, never how many requests a day holds.
    timezone: Optional[str] = Field(default=None, max_length=64)

    @field_validator("context")
    @classmethod
    def _bounded_context(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if v is None:
            return v
        import json

        if len(json.dumps(v, separators=(",", ":"))) > 4000:
            raise ValueError("context too large")
        return v


class Usage(BaseModel):
    daily_limit: int
    used_today: int
    remaining_today: int


class ChatResponse(BaseModel):
    text: Optional[str] = None
    toolCalls: List[Dict[str, Any]] = Field(default_factory=list)
    remaining: int          # kept for the existing client; same number as usage.remaining_today
    usage: Usage
    dropped: List[str] = Field(default_factory=list)


class UsageResponse(BaseModel):
    daily_limit: int
    used_today: int
    remaining_today: int
    reset_at: str


# ---------------------------------------------------------------------------- usage


def _local_day(tz_name: Optional[str]) -> date:
    """The user's own calendar date.

    The counter resets at THEIR midnight, not the server's. A user in Kolkata is 5.5 hours
    ahead of UTC, so a UTC day boundary would have reset their allowance mid-afternoon and
    again the following morning — visible as "my AI reset at 5:30am" or, worse, an allowance
    that appeared to reset twice. The timezone is client-asserted, which is fine: the worst a
    forged one buys is a reset at a different hour, not extra requests, because the count is
    still per-day and the day still advances exactly once every 24 hours.
    """
    if tz_name:
        try:
            return datetime.now(ZoneInfo(str(tz_name)[:64])).date()
        except Exception:
            pass                      # unknown zone -> fall through to UTC rather than 500
    return datetime.now(timezone.utc).date()


async def _read_usage(db: AsyncSession, user: User, day: date) -> int:
    row = (
        await db.execute(
            select(AiScanUsage).where(AiScanUsage.user_id == user.id, AiScanUsage.day == day)
        )
    ).scalar_one_or_none()
    return row.count if row else 0


async def _consume_slot(db: AsyncSession, user: User, day: date, limit: int) -> bool:
    """Take one slot for `day`. True if taken, False if the limit was already reached.

    CONCURRENCY IS THE WHOLE POINT OF THIS FUNCTION. Read-then-write loses the race: three
    requests arriving together all read 14, all decide there is room, and all write 15 — the
    user gets 17 for the price of 15. The fix is to let the DATABASE do the compare and the
    increment in one statement and then believe its rowcount.

        UPDATE ... SET count = count + 1 WHERE user_id=? AND day=? AND count < limit

    Exactly one concurrent statement can move the row from 14 to 15; the others match zero
    rows because the guard is evaluated under the row lock. rowcount is therefore the answer
    to "did I get a slot", not a hint.

    The INSERT path races too — two first-ever requests can both find no row — so a unique
    violation on (user_id, day) is treated as "someone else created it" and retried as an
    update rather than surfaced as an error. That uniqueness is already declared on the table.
    """
    upd = (
        update(AiScanUsage)
        .where(
            AiScanUsage.user_id == user.id,
            AiScanUsage.day == day,
            AiScanUsage.count < limit,
        )
        .values(count=AiScanUsage.count + 1)
    )
    res = await db.execute(upd)
    if res.rowcount:
        await db.commit()
        return True

    # No row updated: either there is no row yet, or the limit is genuinely reached.
    if await _read_usage(db, user, day) >= limit:
        await db.rollback()
        return False

    try:
        db.add(AiScanUsage(user_id=user.id, day=day, count=1))
        await db.commit()
        return True
    except IntegrityError:
        # Another request created the row between our read and our insert. Retry as an update,
        # which re-applies the same guarded compare.
        await db.rollback()
        res = await db.execute(upd)
        await db.commit()
        return bool(res.rowcount)


# ---------------------------------------------------------------------------- route


@router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(
    body: ChatRequest,
    user: User = Depends(current_user),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """One conversational turn.

    A turn that comes back with tool calls is not finished: the device runs them and posts
    again with toolResults, and THAT second call does not spend another unit of the daily
    allowance — it is the same user message. Only a request without toolResults counts.
    """
    # ENTITLEMENT, SERVER-SIDE, BEFORE ANYTHING IS SPENT. is_entitled() reads what Google told
    # us and when — never a client flag. Behind a setting because switching it on before any
    # purchase has been verified would lock out every user, paying ones included, since
    # is_premium defaults to false. See AI_REQUIRES_PREMIUM in config.py.
    if settings.ai_requires_premium and not is_entitled(user):
        raise NotEntitled("AI Coach is part of IGNYT Pro.")

    limit = settings.ai_chat_daily_limit
    day = _local_day(body.timezone)
    is_continuation = bool(body.toolResults)

    # CHECK BEFORE, COUNT AFTER. The first version incremented up front, which meant a Gemini
    # timeout or a 503 still burned a slot — the user paid for an answer they never got. So
    # the pre-flight only READS: it refuses at the limit without calling Gemini at all, which
    # is the other half of the requirement (a rejected request must not cost anything either).
    used = await _read_usage(db, user, day)
    if not is_continuation and used >= limit:
        raise DailyLimitReached(
            f"You've used today's {limit} AI Coach activities. Your AI Coach resets tomorrow."
        )

    out = await gemini_chat.chat(
        settings=settings,
        message=body.message,
        context=body.context,
        history=[t.model_dump() for t in body.history],
        tool_results=[t.model_dump() for t in (body.toolResults or [])],
    )

    # Gemini answered. NOW take the slot — and take it atomically, because between the read
    # above and this line other requests from the same user may have used the remainder.
    if not is_continuation:
        if not await _consume_slot(db, user, day, limit):
            # Lost the race: the allowance went while this call was in flight. The answer is
            # discarded rather than served, because serving it would put the user at 16.
            raise DailyLimitReached(
                f"You've used today's {limit} AI Coach activities. Your AI Coach resets tomorrow."
            )
        used += 1

    remaining = max(0, limit - used)

    # THE ALLOW-LIST. A model can name a function that does not exist — it is a language
    # model, not a compiler — and the device would refuse it anyway, but a refusal that
    # reaches the phone is a round trip and a confusing error bubble. Drop it here and tell
    # the client what was dropped so it can be logged rather than silently vanishing.
    kept: List[Dict[str, Any]] = []
    dropped: List[str] = []
    for call in out.get("toolCalls") or []:
        name = call.get("action")
        if name in ALLOWED_ACTIONS:
            kept.append(call)
        else:
            dropped.append(str(name))
    if dropped:
        logger.warning("dropped unknown tool call(s) from model: %s", ", ".join(dropped))

    return ChatResponse(
        text=out.get("text"),
        toolCalls=kept,
        remaining=remaining,
        usage=Usage(daily_limit=limit, used_today=used, remaining_today=remaining),
        dropped=dropped,
    )


@router.get("/ai/usage", response_model=UsageResponse)
async def ai_usage(
    tz: Optional[str] = None,
    user: User = Depends(current_user),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> UsageResponse:
    """Today's allowance, so the screen can show it without spending one to find out."""
    limit = settings.ai_chat_daily_limit
    day = _local_day(tz)
    used = await _read_usage(db, user, day)
    # Midnight at the START of the next local day, in that same zone.
    try:
        zone = ZoneInfo(str(tz)[:64]) if tz else timezone.utc
    except Exception:
        zone = timezone.utc
    reset = datetime.combine(day + timedelta(days=1), datetime.min.time()).replace(tzinfo=zone)
    return UsageResponse(
        daily_limit=limit,
        used_today=used,
        remaining_today=max(0, limit - used),
        reset_at=reset.isoformat(),
    )
