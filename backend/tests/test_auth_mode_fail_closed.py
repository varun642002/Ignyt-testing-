"""
AUTH_MODE=insecure-uid trusts the caller's X-Ignyt-Uid header as identity. Anything that lets
it start outside a developer machine is a total data-isolation bypass: any request could read
any user's data by changing a string.

The original guard refused it only when `is_production` was true, and `is_production` is
`environment.lower() == "production"` -- an exact-match denylist. Every other spelling, and an
unset ENVIRONMENT, sailed past. These tests pin the inverted rule: allowed only where the
environment is a RECOGNISED development one, refused everywhere else including names nobody
anticipated.

The near-miss spellings below are the point of the file. "prod" and "production-eu" are the
realistic ways a deploy gets labelled, and each one used to permit the bypass.
"""
from __future__ import annotations

import pytest

from app.config import Settings


def _settings(**kw) -> Settings:
    # firebase project id is required by other assert_ready() checks; supplied so this file
    # fails on the auth-mode rule alone and not on an unrelated missing value.
    kw.setdefault("FIREBASE_PROJECT_ID", "ignyt-test")
    return Settings(**kw)


@pytest.mark.parametrize("env", ["development", "dev", "local", "test", "testing"])
def test_insecure_uid_allowed_on_recognised_dev_environments(env):
    _settings(AUTH_MODE="insecure-uid", ENVIRONMENT=env).assert_ready()


@pytest.mark.parametrize(
    "env",
    [
        "production",      # the only one the old check caught
        "prod",            # the obvious short form
        "production-eu",   # a per-region deploy
        "Production ",     # trailing space from a pasted env var
        "staging",         # not production, still not a developer's laptop
        "",                # explicitly blank
        "anything-else",   # a name this code has never heard of
    ],
)
def test_insecure_uid_refused_everywhere_else(env):
    with pytest.raises(RuntimeError, match="insecure-uid"):
        _settings(AUTH_MODE="insecure-uid", ENVIRONMENT=env).assert_ready()


def test_error_says_what_is_wrong_and_why_it_matters():
    """A refusal at startup is read by someone under time pressure; it has to be actionable."""
    with pytest.raises(RuntimeError) as excinfo:
        _settings(AUTH_MODE="insecure-uid", ENVIRONMENT="prod").assert_ready()
    message = str(excinfo.value)
    assert "'prod'" in message          # what was actually set
    assert "development" in message     # what would be accepted
    assert "X-Ignyt-Uid" in message     # why it is refused


@pytest.mark.parametrize("env", ["production", "prod", "development", "anything-else"])
def test_firebase_mode_is_unaffected_by_environment_name(env):
    """The guard is about the bypass only. Real auth must start anywhere."""
    _settings(AUTH_MODE="firebase", ENVIRONMENT=env).assert_ready()
