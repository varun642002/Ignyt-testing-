"""
Typed application errors and a single JSON error envelope.

Every error the client sees looks like:
    {"error": {"code": "<machine_code>", "message": "<human message>"}}
so the frontend can branch on `code` (see ai-workflow/NOTION_INTEGRATION_PHASE1.md §6).
"""
from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base for all deliberately-raised, client-facing errors."""

    code = "internal"
    status_code = 500
    message = "Internal error"

    def __init__(self, message: str | None = None, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message or self.message)
        if message:
            self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class Unauthorized(AppError):
    code = "unauthorized"
    status_code = 401
    message = "Authentication required."


class Forbidden(AppError):
    code = "forbidden"
    status_code = 403
    message = "Not allowed."


class NotConnected(AppError):
    code = "not_connected"
    status_code = 409
    message = "This integration is not connected."


class ValidationFailed(AppError):
    code = "validation_error"
    status_code = 422
    message = "Invalid request."


def error_body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))


async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    # Never leak internals to the client; details go to structured logs upstream.
    return JSONResponse(status_code=500, content=error_body("internal", "Internal error."))
