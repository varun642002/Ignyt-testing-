# IGNYT release gates

Every release must show **evidence**, not assertion. A box is ticked by pasting the command and
its output into the release notes, not by someone remembering they checked.

Nothing in this repo is at 10/10 today. The Status column is what was actually measured, with the
date. Anything not measured says so rather than being left blank, because a blank box reads as
"probably fine" and that is how the last few regressions shipped.

---

## The bar

A release goes out only when **all** of these are true:

- every automated gate green
- no unresolved P0 or P1 findings
- real-device evidence collected for anything the browser cannot prove
- production monitoring live and alerting
- rollback rehearsed, not just documented

---

## Gates

### Security

| Gate | Status (2026-08-13) |
|---|---|
| Secrets only in managed stores | **Partial.** `GEMINI_API_KEY` is backend-only and has never been committed — full git history scanned. The only committed `AIza` value is the Firebase Web API key, public by design. It should be restricted by package + SHA-1 in Google Cloud; that is not done. |
| Gitleaks in CI | **No.** There is no CI workflow in this repo at all. |
| Dependency scanning in CI | **No.** `npm audit --omit=dev` run by hand: 1 high (brace-expansion, transitive). |
| SAST in CI | **No.** |
| Authorization / IDOR tests | **Yes, for the API.** `backend/tests/test_data_isolation.py` — 6 tests, two identities through the real app, including one that reads the route table so a future endpoint cannot start accepting a user id. |
| Rate limits | **Partial.** AI scan has a real per-user daily limit with DB-backed accounting. Other routes unverified. |
| Security headers | **Not measured.** |
| Key-rotation + incident process | **No.** Not written down anywhere. |

### Stability

| Gate | Status |
|---|---|
| Backend tests | **Green.** 120 passed, 14 skipped. |
| Chat/intent suite | **Green.** 48/48, `npm run test:chat`. Committed at `tools/chat-tests/run-suite.cjs` — it ran from a scratchpad until 2026-08-13, so the only frontend coverage this project had was outside the repo. |
| Browser tests | **Red.** 405 tests expect an authenticated app and open on the sign-in screen. |
| Android build | **Green.** `assembleDebug` and `bundleRelease` both clean, versionCode 10506. |
| iOS build | **Unverified here.** No Mac; goes through Codemagic. |
| Corrupt local data / offline / API failure / upgrade | **Not tested.** |
| Crash + error monitoring | **No.** |

### Performance

| Gate | Status |
|---|---|
| Startup, interaction, API latency, memory | **Nothing measured.** |
| Budgets enforced in CI | **No.** |

### Measured baseline (2026-08-13) — no budgets set yet

```
www total                          33 MB
data/food/clean_foods.json      10.42 MB    13,516 foods
data/knowledge.json              5.43 MB    11,579 entries
app.js                           1.33 MB
js/ai/intents.js                 0.64 MB    24,096 training examples
<script> tags in index.html           88
```

**Both big data files are already lazy** — `knowledge.ask()` awaits `load()` on first use, and
`food-catalogue.js` defers its parse deliberately. So the obvious "stop parsing 16 MB at boot"
win does not exist; it was already taken. Measure before assuming otherwise.

**The 88 script tags are the untested cost.** Nothing here has been timed on a device — that is
item 1 of the performance list and it is still not done. Do not set budgets from these byte
counts; bytes are not milliseconds.

**Stale comment worth fixing:** `www/js/food/food-catalogue.js:27` says clean_foods.json is
3.4 MB. It is 10.42 MB — it tripled through the food imports and the note never moved. Any
reasoning built on that figure is out by 3x.

### Test coverage

| Journey | Status |
|---|---|
| User isolation | **Covered** (backend, 6 tests). |
| Auth: sign-up, sign-in, logout, reset, token expiry | **Not covered.** Needs real Firebase tokens; the harness uses header identity. |
| Food CRUD + calculations | **Not covered.** One fuzz pass on `addFoodLog` found and fixed a parser that turned `"1e400"` into 1400 g. |
| Workouts, routines, PRs, progress | **Not covered.** |
| Cloud sync, billing, import/export, destructive actions | **Not covered.** |

### Code quality

| Gate | Status |
|---|---|
| Lint / format / static checks | **None configured.** No ESLint, no formatter, plain JS with no type checking. This is now the cheapest remaining gate — the test runner is in place, so a lint step has somewhere to sit. |
| Dead duplicate runtime files | **Verified obsolete, not yet removed.** See below. |
| Documented public interfaces | **Partial**, via comments. |

#### Root-level app.js / sw.js / index.html — verified obsolete (2026-08-13)

Checked rather than assumed, because deleting a runtime file on a hunch is how an app ships
broken:

```
root app.js         386 KB, last touched 2026-07-12 ("Add files via upload")
www/app.js          1.33 MB, touched today
capacitor.config    webDir: "www"          -- only www/ is ever packaged
APK assets/public/app.js == www/app.js     -- byte-identical, confirmed with cmp
references to root copies                  -- only its own stale index.html and sw.js
```

So the repo root holds a month-old fork of the app that nothing builds from and nothing else
references. Safe to remove — but as its own reviewed change with a regression run, not folded
into unrelated work.

`ios/App/App/public/` is a THIRD copy and is stale too, but it is **untracked** (0 files in
git) — a local artifact `cap sync ios` regenerates. Leave it alone; it is not a repo risk and
deleting it by hand just forces a re-sync.

### Maintainability

| Gate | Status |
|---|---|
| Architecture + storage docs | **No.** Storage keys are not enumerated anywhere. |
| Migration strategy | **Ad hoc.** Precedent exists (`defaultRest`), not generalised. |
| Release runbook / rollback plan | **No.** Rollback has never been rehearsed. |
| Changelog | **No.** Commit messages carry the reasoning; nothing aggregates it. |
| CI/CD | **No pipeline.** |

---

## Per-release evidence

Paste real output. "Ran the tests" is not evidence.

```
[ ] backend        cd backend && python -m pytest -q          → __ passed, __ skipped
[ ] chat suite     npm run test:chat                          → __/48
[ ] browser        __/405
[ ] android        ./gradlew.bat bundleRelease                → BUILD SUCCESSFUL, versionCode ____
[ ] npm audit      npm audit --omit=dev                       → __ critical, __ high
[ ] secret scan    gitleaks detect                            → __ findings
[ ] device matrix  which devices, which journeys, who ran it
[ ] monitoring     dashboard link, alert fired in test
[ ] rollback       rehearsed on ____ , took __ minutes
[ ] P0/P1 open     ____
```

## Version codes

`android/app/build.gradle` derives the code from the version name and asserts it clears the
highest already spent. That floor is hand-maintained, and forgetting to raise it has caused three
Play rejections. **Raise it in the same commit as the upload, not afterwards.**

Spent so far: 10500–10505. Current: 1.0.48 → 10506.
