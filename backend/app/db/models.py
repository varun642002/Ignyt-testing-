"""
ORM models.

Phase 2 defines only `User` — the trust anchor keyed by the verified Firebase uid. Later
phases add integration_accounts, oauth_tokens, task_mappings, sync_queue, sync_runs,
conflict_log, audit_log and error_log (each via its own Alembic migration), exactly as laid
out in ai-workflow/NOTION_INTEGRATION_PHASE1.md §4.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    # The verified Firebase uid. This is the ONLY identity we trust; it is set from a
    # server-verified ID token, never from a client-asserted value.
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, server_default=func.now()
    )

    # Free users get no AI scans at all, per the brief, so entitlement has to be a real
    # column rather than something inferred client-side — a client-asserted "I am premium"
    # is not an entitlement, it is a request.
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0", nullable=False)

    def __repr__(self) -> str:  # pragma: no cover - debug aid
        return f"<User id={self.id} firebase_uid={self.firebase_uid!r}>"


class AiScanUsage(Base):
    """One row per user per UTC day. The daily allowance counter.

    Counting rows in a usage table rather than storing "scans_left" on the user means the
    reset is implicit: a new day has no row, so it starts at zero with no scheduled job to
    run and nothing to go wrong if the service was down at midnight.
    """

    __tablename__ = "ai_scan_usage"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_ai_scan_usage_user_day"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, server_default=func.now()
    )


class CommunityFood(Base):
    """A food the AI estimated and a user then confirmed.

    The brief's flow: if a scan finds no match in the shipped catalogue, Gemini estimates the
    nutrition, the user edits and confirms, and the result is saved here so the NEXT scan of
    the same thing is a database hit rather than another AI call. That makes the catalogue
    grow from real use, and it makes repeat scans free, fast and consistent.

    Values are per 100 g, matching every other food record in this product, so the same
    serving maths applies with no special case.
    """

    __tablename__ = "community_foods"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    # Lowercased, punctuation-stripped name — what lookups match on. Indexed because it is
    # the hot path on every single scan.
    search_key: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)

    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat: Mapped[float | None] = mapped_column(Float, nullable=True)
    fibre: Mapped[float | None] = mapped_column(Float, nullable=True)
    sugar: Mapped[float | None] = mapped_column(Float, nullable=True)
    sodium: Mapped[float | None] = mapped_column(Float, nullable=True)

    serving_grams: Mapped[float | None] = mapped_column(Float, nullable=True)
    serving_label: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Provenance, kept so a bad entry can be traced and so the UI can be honest about where a
    # number came from. `confirmations` is how many separate users have saved this same food —
    # a cheap trust signal that costs one integer.
    source: Mapped[str] = mapped_column(String(32), default="ai_confirmed", nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    confirmations: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, server_default=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover - debug aid
        return f"<CommunityFood {self.name!r} {self.calories}kcal/100g>"
