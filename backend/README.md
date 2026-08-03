# IGNYT Integration Service

A standalone **FastAPI** service that lets each IGNYT user connect third-party integrations
(Notion first) via OAuth, with encrypted token storage and an offline-tolerant sync engine.
Provider-agnostic by design — new integrations plug in without re-architecture.

> **Status: Phase 2 (Authentication).** Health/readiness + Firebase-verified `/me` are
> implemented. OAuth, Notion sync, workers, metrics, and rate limiting arrive in Phases 3–6.
> Full design: `../ai-workflow/NOTION_INTEGRATION_PHASE1.md`.

## Why this exists
IGNYT is an offline-first Capacitor app with **no backend**. Notion OAuth is a confidential-
client flow — the `client_secret` and token exchange cannot live in the app — so a server is
genuinely required. This service is that server, and it verifies the user with the Firebase ID
token the app already has (never trusting a client-supplied uid).

## Requirements
- Python 3.12+
- (Production) Postgres 14+ and a Firebase service-account JSON

## Quick start (local, no Firebase, no Postgres)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: set AUTH_MODE=insecure-uid  (dev-only identity via X-Ignyt-Uid header)
alembic upgrade head                                   # creates the SQLite schema
uvicorn app.main:app --reload
```
Then:
```bash
curl http://localhost:8000/v1/health
curl -H "X-Ignyt-Uid: dev-user-1" http://localhost:8000/v1/me
```
Interactive API docs: http://localhost:8000/docs

## Production identity (Firebase)
Set `AUTH_MODE=firebase` and `FIREBASE_CREDENTIALS` (path to, or inline contents of, the
service-account JSON from Firebase Console → Project settings → Service accounts). The app
sends `Authorization: Bearer <Firebase ID token>`; the service verifies it with firebase-admin
and provisions a `users` row keyed by the verified uid. `insecure-uid` is refused when
`ENVIRONMENT=production`.

## Tests
```bash
pip install -r requirements.txt
pytest            # Phase-2 suite: health public, /me auth + idempotent user provisioning
```

## API (Phase 2)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/health` | public | liveness |
| GET | `/v1/ready` | public | readiness (db + auth config) |
| GET | `/v1/me` | Bearer / X-Ignyt-Uid | verify identity, provision user, list integrations |

Error envelope: `{"error": {"code": "...", "message": "..."}}`.

## Environment variables
See `.env.example`. Required in Phase 2: `AUTH_MODE`, and `FIREBASE_CREDENTIALS` when
`AUTH_MODE=firebase`. `TOKEN_ENCRYPTION_KEY` / `STATE_SIGNING_SECRET` become required in Phase 3.

## Migrations
Alembic uses a sync driver derived from `DATABASE_URL` (SQLite dev / Postgres prod). Create a
new migration after adding models: `alembic revision --autogenerate -m "..."`, then
`alembic upgrade head`.

## Deployment (outline; full guide in Phase 6)
Container image is provided (`Dockerfile`). Any Python host works — Render / Railway / Fly.io /
Cloud Run. Run `alembic upgrade head` on release, then `uvicorn app.main:app`. Set all secrets
via the host's secret manager; never bake them into the image. HTTPS is required in production.
