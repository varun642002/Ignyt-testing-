# Deploying the IGNYT backend

The FastAPI service in `backend/` holds every secret the app needs and every check the app
cannot be trusted to make itself: the Gemini key, Firebase token verification, the AI daily
allowance, and Play purchase verification. The Capacitor app talks only to this service.

All commands are **Windows PowerShell**. Where a command differs from the bash version you
find in most tutorials, it is written the PowerShell way rather than left for you to translate.

---

## 1. Local development

### First-time setup

```powershell
cd C:\Users\varun\Downloads\Ignyt-testing-\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If `Activate.ps1` is blocked, PowerShell's execution policy is the cause. This allows local
scripts for your user only, which is the narrowest fix:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Configure

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in `GEMINI_API_KEY`. For local work set `AUTH_MODE=insecure-uid`, which lets the app
identify itself with a plain `X-Ignyt-Uid` header instead of a real Firebase token. The server
**refuses that mode outright when `ENVIRONMENT=production`**, so it cannot follow you to
Render by accident.

`.env` is gitignored. Do not commit it.

### Run

```powershell
uvicorn app.main:app --reload --port 8001
```

The module is `app.main:app` — **not** `main:app`. `create_app()` builds the application and
`app = create_app()` publishes it at the bottom of `app/main.py`.

Check it:

```powershell
curl.exe http://127.0.0.1:8001/v1/health
Start-Process "http://127.0.0.1:8001/docs"
```

Use `curl.exe`, not `curl` — in PowerShell, bare `curl` is an alias for `Invoke-WebRequest`,
which takes different arguments and will confuse you at the worst moment.

### Run the tests

```powershell
python -m pytest -q
```

---

## 2. Deploy to Render

### 2.1 Push to GitHub

Render deploys from a branch. Nothing secret is in the repo — verified below in the checklist.

```powershell
cd C:\Users\varun\Downloads\Ignyt-testing-
git push origin feature/premium-subscription
```

### 2.2 Create the service

`render.yaml` at the repository root describes the whole thing, so use the blueprint flow
rather than filling in a form:

1. Render dashboard → **New** → **Blueprint**
2. Connect the GitHub repository `varun642002/Ignyt-testing-`
3. Pick the branch you pushed
4. Render reads `render.yaml` and proposes a web service (`ignyt-backend`) and a Postgres
   database (`ignyt-db`)
5. It will prompt for every value marked `sync: false` — those are the secrets, and Render
   stores them encrypted rather than reading them from git

If you would rather click through it manually, these are the only three settings that are easy
to get wrong:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Never hardcode the port. Render assigns `$PORT` and health checks fail if you ignore it.

### 2.3 Environment variables

Set in the Render dashboard, never in the repo:

| Variable | Required | What it is |
|---|---|---|
| `GEMINI_API_KEY` | **yes** | AI Coach and food scanning both stop without it |
| `FIREBASE_PROJECT_ID` | **yes** | `ignyt-fitness2`. Preset in the blueprint. Not a secret — it ships inside the APK — but startup fails without it, see §2.6 |
| `FIREBASE_CREDENTIALS` | **no** | Service-account JSON, one line. Leave unset to verify tokens against Google's public certificates instead — §2.6 |
| `DATABASE_URL` | auto | Wired from `ignyt-db` by the blueprint |
| `PLAY_SERVICE_ACCOUNT_JSON` | for billing | A **different** service account to the Firebase one — see §3 |
| `AI_REQUIRES_PREMIUM` | no | Leave `false` until a real purchase has been verified. See the warning in §3 |
| `CORS_ORIGINS` | preset | Capacitor's WebView origins |

`FIREBASE_CREDENTIALS` and `PLAY_SERVICE_ACCOUNT_JSON` are the **contents** of their JSON
files, not paths — there is no file on Render to point at. Both must start with `{`; that first
character is how `auth/firebase.py` tells JSON from a path.

This validates the file and puts it on the clipboard as one line:

```powershell
python -c "import json;d=json.load(open(r'.\firebase-service-account.json'));assert d['type']=='service_account';assert d['private_key'].startswith('-----BEGIN PRIVATE KEY-----');print(json.dumps(d,separators=(',',':')))" | Set-Clipboard
```

Validate rather than just reformat, because **`/v1/health` will not catch a bad paste**: it
reports `auth_ok` from `bool(firebase_credentials)`, which only asks whether the variable is
non-empty. A truncated or mangled value passes the health check and then fails on the first
real sign-in, where the error looks like an auth problem rather than a config one.

Stripping newlines by hand also works — the line breaks in the file are pretty-printing, while
the ones inside `private_key` are two-character `\n` escapes and survive:

```powershell
(Get-Content .\firebase-service-account.json -Raw) -replace "`r`n","" | Set-Clipboard
```

### 2.4 Run the migrations

The database starts empty. Alembic creates the tables, including the Play entitlement columns:

```powershell
$env:DATABASE_URL = "<the External Database URL from Render>"
cd C:\Users\varun\Downloads\Ignyt-testing-\backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

Use the **External** URL from Render's database page — the internal one is only reachable from
inside Render's network. `postgres://`, `postgresql://` and `postgresql+asyncpg://` are all
accepted; the service normalises whichever you paste.

### 2.6 Two ways to authenticate, and why

Verifying a Firebase ID token is a signature check against Google's **public** certificates. It
needs no secret of ours — the private half is Google's, and the certs are served to anyone,
unauthenticated. The Admin SDK still demands a service-account credential before it will do
that check, so the key is a requirement of the *library*, not of the *cryptography*.

That matters because Google now enables
`constraints/iam.disableServiceAccountKeyCreation` by default on new organizations. Key
creation is refused outright — "Key creation is not allowed on this service account" — and a
backend that can only authenticate with a key cannot be deployed at all.

So the mode follows from what you set, with no switch to throw:

| `FIREBASE_CREDENTIALS` | What happens |
|---|---|
| unset | **Keyless.** Tokens verified against Google's public certs. Needs only `FIREBASE_PROJECT_ID` |
| set | The Admin SDK path, unchanged |

Both return identical claims, so nothing downstream can tell them apart.

**`FIREBASE_PROJECT_ID` is mandatory in keyless mode and the server refuses to boot without
it.** Google signs the tokens of every Firebase project with the same key, so a valid signature
only proves "Firebase issued this" — never "issued for us". The project ID is the audience each
token is checked against; without it, every Firebase token in existence would verify. That is
not a degraded mode, it is an open door, so it is a startup failure rather than a warning.

Keyless mode additionally checks the issuer, `sub` and `auth_time` in our own code, because the
underlying library validates signature, audience and expiry but ignores the issuer entirely.
`tests/test_keyless_auth.py` proves each check by forging a token that violates it.

**If you would rather use a service account**, lift the org policy: Google Cloud Console →
[Organization Policies](https://console.cloud.google.com/iam-admin/orgpolicies) → select the
**organization** in the resource picker, not the project → *Disable service account key
creation* → Manage policy → Customize → Off. Needs `roles/orgpolicy.policyAdmin` at org level.

### 2.5 Verify

```powershell
curl.exe https://ignyt-backend.onrender.com/v1/health
Start-Process "https://ignyt-backend.onrender.com/docs"
```

`/v1/health` should return `{"status":"ok",...}`. On the free plan the first request after
15 minutes of inactivity takes ~30 seconds while the instance wakes.

---

## 3. Google Play purchase verification

The server decides who is Pro by asking Google. It needs its own credentials to do that, and
they are **not** the Firebase ones.

1. **Google Cloud Console** → the project linked to Play → **IAM & Admin** → **Service
   Accounts** → create one → **Keys** → **Add key** → JSON. Save it.
2. **Play Console** → **Users and permissions** → **Invite new user** → paste the service
   account's email → grant **View financial data, orders, and cancellation survey responses**.
3. Paste the JSON as `PLAY_SERVICE_ACCOUNT_JSON` in Render (one line, as in §2.3).

Permissions can take a few hours to propagate. Until they do, verification returns
`billing_not_configured` rather than telling a user their purchase is invalid — the two are
deliberately different errors, because one is your problem and one is theirs.

> **Do not set `AI_REQUIRES_PREMIUM=true` until you have verified at least one real purchase.**
> `is_premium` starts false for every account, so switching the gate on beforehand locks out
> every user including paying ones.

---

## 4. Point the app at the backend

`www/js/config.js` holds `PRODUCTION_BASE`. Set it once to your Render URL:

```javascript
var PRODUCTION_BASE = "https://ignyt-backend.onrender.com";
```

A packaged build uses that automatically. It is not a secret — it is a public HTTPS endpoint
that authenticates every request. The `GEMINI_API_KEY` must never appear in this file or
anywhere else under `www/`, `android/` or `ios/`.

Then rebuild:

```powershell
cd C:\Users\varun\Downloads\Ignyt-testing-
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

**To point a debug build somewhere else** without rebuilding — a LAN IP, a staging service —
set it at runtime and it persists:

```javascript
IgnytConfig.setApiBase("http://192.168.1.20:8001")
```

From Chrome DevTools with the device attached (`chrome://inspect`). A physical device cannot
reach `127.0.0.1` or `10.0.2.2`; it needs your machine's LAN address, and the backend must be
started with `--host 0.0.0.0` so it accepts connections from off-box.

---

## 5. Redeploying

`autoDeploy: true` is set, so:

```powershell
git push origin feature/premium-subscription
```

Render rebuilds and restarts. Watch it in the dashboard's Logs tab. If a deploy fails the
previous version keeps serving — a broken build does not take the API down.

Run `alembic upgrade head` again (§2.4) whenever a change adds a migration.

---

## 6. Security checklist

Run these before a release. The first two are the ones that actually matter.

```powershell
cd C:\Users\varun\Downloads\Ignyt-testing-

# 1. No .env is tracked, and none ever was
git ls-files | Select-String "\.env$"
git log --all --oneline -- backend/.env

# 2. No key-shaped string in anything git tracks
git grep -nE "AIza[0-9A-Za-z_-]{30,}|AQ\.[A-Za-z0-9_-]{20,}|-----BEGIN PRIVATE KEY-----"
```

Both should return nothing. If the second one flags `google-services.json` or
`firebase-rest-auth.js`, that is the **Firebase Web API key** and it is not a secret — it
identifies the project rather than authorising anything, and Firebase security rests on
Security Rules and App Check. Google publishes it in their own quickstarts.

The rest, verified in this repo at the time of writing:

- [x] `GEMINI_API_KEY` exists only as a Render environment variable
- [x] The key is sent to Google as an `x-goog-api-key` **header**, never `?key=` — a query
      string is logged by httpx at INFO, and was, until it was fixed
- [x] `AUTH_MODE=insecure-uid` raises at startup when `ENVIRONMENT=production`
- [x] Every AI request carries a verified Firebase token
- [x] The AI daily allowance is counted server-side against the authenticated account, so
      clearing storage or reinstalling does not reset it
- [x] Entitlement is decided from Google's answer, never from a client flag
- [x] A purchase token is bound to the first account that verifies it
- [x] CORS lists exact origins; no `*`
- [x] Error responses carry a code and a message, never a stack trace

---

## 7. When something is wrong

| Symptom | Cause |
|---|---|
| Startup fails: "Missing required environment variables" | `FIREBASE_CREDENTIALS` unset while `AUTH_MODE=firebase` |
| Startup fails: "asyncio extension requires an async driver" | An old build without the URL normalisation in `Settings.async_database_url` |
| `RuntimeError: AUTH_MODE=insecure-uid is forbidden in production` | Working as intended. Set `AUTH_MODE=firebase` |
| AI returns `ai_not_configured` | `GEMINI_API_KEY` is unset on Render |
| AI returns `ai_daily_limit` | 15 activities used. Resets at the user's local midnight |
| Billing returns `billing_not_configured` | `PLAY_SERVICE_ACCOUNT_JSON` unset, or Play permissions have not propagated |
| Billing returns `purchase_claimed` | That receipt is already linked to another account |
| First request each morning takes 30s | Free-plan cold start. Upgrade to Starter |
| App can't reach the backend on a device | `PRODUCTION_BASE` still points at localhost, or a debug override is set in localStorage |
