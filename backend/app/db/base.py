"""SQLAlchemy 2.0 async engine + session factory, and the declarative Base."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from ..config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_settings = get_settings()

engine = create_async_engine(
    # async_database_url, not database_url: a managed Postgres URL arrives without a driver
    #     and create_async_engine cannot open it. See Settings.async_database_url.
    _settings.async_database_url,
    echo=_settings.db_echo,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
