"""
Catalogue lookup and the daily scan allowance.

MATCH ORDER, AND WHY
    1. Community Foods, exact search key   — foods real users have already confirmed
    2. Community Foods, prefix / contains  — the same food written slightly differently
    3. miss -> caller asks Gemini to estimate

The brief says future scans should search Community Foods first, and that is what this does.
It is also the cheap path: an exact key match is one indexed lookup, where the alternative is
a second network round trip to a vision model.

The SHIPPED catalogue (www/data/food/clean_foods.json) is not queried here. It lives in the
app bundle, not in this database, so the client checks it locally before ever uploading —
which is faster than a round trip and works with no signal. See `matched_local` in the scan
request: the client tells us what it already matched so we do not pay for an AI call the
device could answer itself.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..core.errors import AppError
from ..db.models import AiScanUsage, CommunityFood, User


class ScanLimitReached(AppError):
    code = "scan_limit_reached"
    status_code = 429
    message = "You've used all of today's AI scans. They reset at midnight UTC."


class PremiumRequired(AppError):
    code = "premium_required"
    status_code = 402
    message = "AI food scanning is a Premium feature."


def search_key(name: str) -> str:
    """Normalise a food name to its lookup key.

    Accents folded, punctuation dropped, whitespace collapsed, lowercased. "Palak Paneer",
    "palak  paneer" and "Palak-Paneer" have to be one key or the community table fills up with
    the same food under three spellings.
    """
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9\s]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


async def find_community_food(db: AsyncSession, name: str) -> Optional[CommunityFood]:
    """Exact key first, then a contains match. Highest-confirmed wins among equals."""
    key = search_key(name)
    if not key:
        return None

    exact = await db.execute(
        select(CommunityFood)
        .where(CommunityFood.search_key == key)
        .order_by(CommunityFood.confirmations.desc())
        .limit(1)
    )
    hit = exact.scalar_one_or_none()
    if hit:
        return hit

    # Looser pass. Bounded to keys of a sensible length so a one-word key like "rice" does not
    # match everything containing the word.
    if len(key) < 4:
        return None
    loose = await db.execute(
        select(CommunityFood)
        .where(CommunityFood.search_key.contains(key))
        .order_by(CommunityFood.confirmations.desc())
        .limit(1)
    )
    return loose.scalar_one_or_none()


async def scan_usage_today(db: AsyncSession, user: User) -> AiScanUsage:
    """The user's counter row for today, created if this is their first scan of the day."""
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(AiScanUsage).where(AiScanUsage.user_id == user.id, AiScanUsage.day == today)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = AiScanUsage(user_id=user.id, day=today, count=0)
        db.add(row)
        await db.flush()
    return row


async def assert_can_scan(db: AsyncSession, user: User, settings: Settings) -> AiScanUsage:
    """Entitlement and allowance, checked BEFORE any upload is processed or AI call is made.

    Order matters: refusing a free user costs nothing, so it happens first. Both checks run
    before the image is read, so a user who cannot scan never pays the upload.
    """
    if not user.is_premium:
        raise PremiumRequired()
    usage = await scan_usage_today(db, user)
    if usage.count >= settings.ai_scan_daily_limit:
        raise ScanLimitReached()
    return usage


def remaining_scans(usage_count: int, settings: Settings) -> int:
    return max(0, settings.ai_scan_daily_limit - usage_count)


async def save_community_food(
    db: AsyncSession,
    *,
    user: User,
    name: str,
    calories: float,
    protein: Optional[float] = None,
    carbs: Optional[float] = None,
    fat: Optional[float] = None,
    fibre: Optional[float] = None,
    sugar: Optional[float] = None,
    sodium: Optional[float] = None,
    serving_grams: Optional[float] = None,
    serving_label: Optional[str] = None,
    category: Optional[str] = None,
) -> CommunityFood:
    """Save a user-confirmed food, or reinforce the existing one.

    A second user confirming the same food bumps `confirmations` rather than inserting a
    duplicate — otherwise the table degenerates into one row per scan and the lookup that is
    supposed to get faster over time gets slower.
    """
    key = search_key(name)
    existing = await db.execute(select(CommunityFood).where(CommunityFood.search_key == key).limit(1))
    row = existing.scalar_one_or_none()
    if row is not None:
        row.confirmations += 1
        return row

    row = CommunityFood(
        search_key=key,
        name=name.strip(),
        category=category,
        calories=calories,
        protein=protein,
        carbs=carbs,
        fat=fat,
        fibre=fibre,
        sugar=sugar,
        sodium=sodium,
        serving_grams=serving_grams,
        serving_label=serving_label,
        created_by=user.id,
    )
    db.add(row)
    await db.flush()
    return row
