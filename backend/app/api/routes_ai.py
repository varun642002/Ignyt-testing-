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
from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import current_user
from ..config import Settings, get_settings
from ..core.errors import AppError
from ..db.models import AiScanUsage, User
from ..db.session import get_db
from ..services import gemini_chat

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai"])

# Every action the model may name. Mirrors TOOLS in gemini_chat.py and the client registry in
# www/js/ai/actions.js. Kept as a set here so the check is a membership test rather than a
# scan of the schema on every response.
ALLOWED_ACTIONS = {t["name"] for t in gemini_chat.TOOLS}


class DailyLimitReached(AppError):
    status_code = 429
    code = "ai_daily_limit"


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

    @field_validator("context")
    @classmethod
    def _bounded_context(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if v is None:
            return v
        import json

        if len(json.dumps(v, separators=(",", ":"))) > 4000:
            raise ValueError("context too large")
        return v


class ChatResponse(BaseModel):
    text: Optional[str] = None
    toolCalls: List[Dict[str, Any]] = Field(default_factory=list)
    remaining: int
    dropped: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------- usage


async def _consume_allowance(db: AsyncSession, user: User, limit: int) -> int:
    """Count one message against today's allowance and return what is left.

    Reuses ai_scan_usage rather than adding a table. One row per user per UTC day already
    exists with exactly the semantics needed, and the reset stays implicit — a new day has no
    row, so nothing has to run at midnight. Scans and chats share the row's counter only if
    both are enabled; they are separate products today, and if that changes this wants its
    own column rather than a second table.
    """
    today = date.today()
    row = (
        await db.execute(
            select(AiScanUsage).where(AiScanUsage.user_id == user.id, AiScanUsage.day == today)
        )
    ).scalar_one_or_none()

    used = row.count if row else 0
    if used >= limit:
        raise DailyLimitReached(f"You've used today's {limit} AI messages. It resets at midnight UTC.")

    if row is None:
        row = AiScanUsage(user_id=user.id, day=today, count=1)
        db.add(row)
    else:
        row.count = used + 1
    await db.commit()
    return max(0, limit - (used + 1))


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
    is_continuation = bool(body.toolResults)
    remaining = settings.ai_chat_daily_limit
    if not is_continuation:
        remaining = await _consume_allowance(db, user, settings.ai_chat_daily_limit)

    out = await gemini_chat.chat(
        settings=settings,
        message=body.message,
        context=body.context,
        history=[t.model_dump() for t in body.history],
        tool_results=[t.model_dump() for t in (body.toolResults or [])],
    )

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
        dropped=dropped,
    )
