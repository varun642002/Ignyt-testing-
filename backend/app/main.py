"""
FastAPI application factory for the IGNYT Integration Service.

Phase 2 mounts: health/readiness (public) and auth (/me, protected). OAuth, integrations and
metrics routers are added in later phases. CORS is locked to the configured IGNYT origins;
config is validated at startup (fail-fast) except under pytest.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import routes_auth, routes_food, routes_health
from .config import get_settings
from .core.errors import AppError, app_error_handler, unhandled_error_handler
from .logging_config import configure_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()
    log = get_logger("ignyt.integration")
    # Fail fast on misconfiguration in real runs; tests set IGNYT_SKIP_STARTUP_CHECK=1.
    if not os.getenv("IGNYT_SKIP_STARTUP_CHECK"):
        settings.assert_ready()
    log.info("service_start", extra={"environment": settings.environment, "auth_mode": settings.auth_mode})
    yield
    log.info("service_stop")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.2.0",  # Phase 2
        lifespan=lifespan,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,  # we use bearer tokens, not cookies
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Ignyt-Uid"],
    )

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    prefix = settings.api_prefix
    app.include_router(routes_health.router, prefix=prefix)
    app.include_router(routes_auth.router, prefix=prefix)
    app.include_router(routes_food.router, prefix=prefix)
    return app


app = create_app()
