"""Structured JSON logging. One line per event, machine-parseable, no secrets ever logged."""
from __future__ import annotations

import logging
import sys

try:  # python-json-logger >= 3.1 moved the formatter to .json
    from pythonjsonlogger.json import JsonFormatter
except ImportError:  # older versions
    from pythonjsonlogger.jsonlogger import JsonFormatter

from .config import get_settings

_configured = False


def configure_logging() -> None:
    global _configured
    if _configured:
        return
    settings = get_settings()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            rename_fields={"asctime": "ts", "levelname": "level", "name": "logger"},
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    # Uvicorn access logs are noisy in JSON mode; keep them at WARNING.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    _configured = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
