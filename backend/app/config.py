"""
Centralized configuration for the IGNYT Integration Service.

Every value comes from the environment (Pydantic Settings). Nothing sensitive is hard-coded.
See `.env.example` for the full list. `assert_ready()` fails fast at startup on missing
required secrets so the service never boots into a silently-broken state.

Phase 2 scope: only the settings needed for auth + persistence are *required*. OAuth/crypto
settings are declared here (so the shape is stable) but are validated in later phases.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    app_name: str = Field(default="IGNYT Integration Service", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")  # development|staging|production
    log_level: str = Field(default="info", alias="LOG_LEVEL")
    api_prefix: str = Field(default="/v1", alias="API_PREFIX")

    # --- Database ---
    # Async URL for the app (asyncpg / aiosqlite). Alembic derives a sync URL from this.
    # Local dev default = a file SQLite DB so the service runs with zero infra.
    database_url: str = Field(default="sqlite+aiosqlite:///./ignyt_integration.db", alias="DATABASE_URL")
    db_echo: bool = Field(default=False, alias="DB_ECHO")

    # --- CORS: exact origins allowed to call this API (the IGNYT web/app origins) ---
    cors_origins: str = Field(
        default="https://localhost,capacitor://localhost,http://localhost,http://localhost:4173",
        alias="CORS_ORIGINS",
    )

    # --- Identity (Firebase Admin) ---
    # "firebase" verifies a Firebase ID token (production). "insecure-uid" trusts an
    # X-Ignyt-Uid header — LOCAL DEV ONLY, and hard-refused when ENVIRONMENT=production.
    auth_mode: str = Field(default="firebase", alias="AUTH_MODE")
    # Firebase Admin credentials: a path to the service-account JSON, or the JSON content.
    firebase_credentials: str = Field(default="", alias="FIREBASE_CREDENTIALS")
    firebase_project_id: str = Field(default="", alias="FIREBASE_PROJECT_ID")

    # --- Crypto / OAuth (declared now; enforced in Phase 3) ---
    token_encryption_key: str = Field(default="", alias="TOKEN_ENCRYPTION_KEY")
    state_signing_secret: str = Field(default="", alias="STATE_SIGNING_SECRET")

    # --- AI food recognition (Gemini Vision) ---
    # The key lives HERE and only here. It is read from the environment, never returned by any
    # route, never logged, and never sent to the client — the app talks to this service, this
    # service talks to Gemini. `ai_configured` is what the client is told instead.
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    # An ALIAS, not a pinned version, and deliberately so. The previous default
    # `gemini-2.0-flash` was retired by Google and every scan started returning 503 with
    # nothing in our code having changed; `gemini-2.5-flash` is already refused for newly
    # issued keys ("no longer available to new users"). A pinned name is a scheduled outage on
    # somebody else's calendar. The trade-off is real — an alias can change behaviour under
    # you — which is why the response schema is enforced rather than assumed, so a model swap
    # surfaces as a typed parse error and not as silently wrong nutrition.
    # Pin a specific version here if you would rather have a fixed model and own the upgrades.
    gemini_model: str = Field(default="gemini-flash-latest", alias="GEMINI_MODEL")
    gemini_timeout_seconds: float = Field(default=20.0, alias="GEMINI_TIMEOUT_SECONDS")
    # How many nutrition estimates may be in flight at once. A plate of seven dishes was
    # costing 43 s of wall clock because each estimate waited for the one before it; the calls
    # are independent, so they should not. Bounded rather than unlimited: a big plate would
    # otherwise open a dozen simultaneous connections and earn a 429, turning a slow scan into
    # a failed one. Five is comfortably inside free-tier per-minute limits.
    ai_estimate_concurrency: int = Field(default=5, alias="AI_ESTIMATE_CONCURRENCY")
    # Premium allowance. Free users get none, per the brief; the counter resets on UTC date.
    ai_scan_daily_limit: int = Field(default=15, alias="AI_SCAN_DAILY_LIMIT")
    # Hard ceiling on an uploaded frame. The client compresses first; this is the backstop
    # that stops a hostile or broken client from streaming an unbounded body at us.
    max_upload_bytes: int = Field(default=6 * 1024 * 1024, alias="MAX_UPLOAD_BYTES")

    @property
    def ai_configured(self) -> bool:
        """Whether AI scanning can actually run. Safe to expose — it is a boolean, not a key."""
        return bool(self.gemini_api_key)

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def sync_database_url(self) -> str:
        """Sync SQLAlchemy URL for Alembic (migrations don't need async)."""
        url = self.database_url
        return (
            url.replace("+aiosqlite", "")
               .replace("+asyncpg", "+psycopg2")
        )

    def assert_ready(self) -> None:
        missing: List[str] = []
        if self.auth_mode == "firebase" and not self.firebase_credentials:
            missing.append("FIREBASE_CREDENTIALS (required when AUTH_MODE=firebase)")
        if self.auth_mode == "insecure-uid" and self.is_production:
            raise RuntimeError("AUTH_MODE=insecure-uid is forbidden in production.")
        if self.auth_mode not in ("firebase", "insecure-uid"):
            raise RuntimeError(f"Unknown AUTH_MODE: {self.auth_mode}")
        if missing:
            raise RuntimeError("Missing required environment variables: " + ", ".join(missing) + ". See backend/.env.example.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
