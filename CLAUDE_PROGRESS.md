# CLAUDE_PROGRESS.md

## START HERE — open the preview and LOOK before changing anything

Everything below was reasoned from screenshots. Nothing in the last stretch of work was seen
running. Two bugs the user reported were caused by my own earlier unverified changes, so the
first action in a new session is to start the dev server and look, not to edit.

### The open bug

**Settings toggle sits high in its row** — "close to the top, the bottom has more space, it needs
to be in the centre". Reported twice; not fixed, because no screenshot of the actual screen was
supplied, only the reference image, and the CSS says it should already be centred:
`.stg-row` is `display:flex; align-items:center` and `.stg-row__ctrl` is too.

Three candidates, different fixes:
1. the knob inside the track — `top:3px`, 26px track, 20px knob, mathematically centred, so it
   would be a shadow reading as asymmetric
2. the switch inside its row — something overriding `align-items`, or that row is not `.stg-row`
   at all (Settings has more than one row class)
3. the track inside its tap target — `.rm-switch` carries an invisible `inset:-8px` expander; if
   Settings gained something similar it would shift the visual centre

Measure it in the preview rather than guessing. The toggle DESIGN is settled — plain pale track,
white knob, no lamps, restored in `d4c2d6e`. Do not restyle it.

### STILL BROKEN — I reported this fixed and it is not

**Food Log bottom nav is still solid blue.** `55da132` added `"nutrition"` to the `isLightTab`
list in `www/app.js` ~7556, on the theory that the Food Log tab was missing from it and so fell
through to the wrong nav style. The user's screenshot AFTER that build still shows blue. So the
diagnosis was wrong, or incomplete, and it was reported as done on reasoning alone.

Start by reading what `bottom-nav--home-light` actually does in CSS and what the nav looks like
with and without it, rather than trusting that list. Note the user was on the LIGHT theme in the
later screenshot and dark in the earlier one, and the nav was blue in both — so the cause may
have nothing to do with the tab list at all.

### Requested, not built: add a diet plan's meals to the Food Log

"No option to add the diet plan to add in food logs." Correct — `IgnytDietPlans`
(`www/js/diet/diet-plans.js:538`) exposes `toggleMealDone`, `isMealDone` and `followedTotals`,
so a planned meal can be TICKED as eaten and counted toward the day, but nothing copies plan
items into `state.foodLog` as real entries.

Decide before coding: does "add to log" COPY the items (editable after, can drift from the plan)
or LINK them (stay in sync, but deleting one is ambiguous)? Copy is simpler and matches how the
rest of the log behaves. Also needs an answer for adding the same plan twice in one day.

Not started deliberately — it writes food-log data, and the last two unverified changes in this
area came back as regressions.

### Verify these, all shipped unseen

- **Settings toggle keeps scroll** (`67cce0e`) — tap a switch at the bottom of Settings; the page
  must not move. The restore is synchronous and scoped to that handler on purpose.
- **No flicker** (`7c27a0c` reverted the global version) — add food, add to a diet plan. If it
  still flickers the cause is older than today and the revert was wrong.
- **Profile weight** (`b7f74ee`) — the field is read-only by design; the note and Log weight
  button must appear even with no weight ever logged. That was the bug.
- **Food Log nav** (`55da132`) — dark pill, not solid blue.
- **iPhone bottom nav at 22px** — `www/index.html:507`. Needs iOS; no Mac here.
- **Fasting row right padding** — fixed by analogy with Settings; that screen was never looked at.

### The trap that nearly shipped

Reverting the two power-switch commits was NOT enough: the second had edited lines the first
added, so each revert undid part of the other and left ~2,300 characters stranded and still
rendering in each of the three CSS files. Caught by grepping afterwards and diffing against
`origin/main`. Do the same after any multi-commit revert here.

## Current request

The Settings toggle centring, described at the top. Nothing else is outstanding from the user.

## Current branch

`feature/diagnostics-screen` at `06361d3`. `main` at `18cf74c` — eleven commits unmerged.
Everything is committed and pushed. Nothing is in flight.

---

## THE TOGGLE REDESIGN — BUILT, THEN REVERTED. DO NOT REBUILD IT.

An earlier note here described a power-switch design (dark notched knob, red and green lamps
outside the track) as the next task. It was built across all three families in `e2efdcb`, the
user saw it on a device, and then chose the plain switch instead. Reverted in `d4c2d6e`.

The settled design is what the app has now: pale track, white knob, no lamps, no notch. The only
thing still wrong with it is the vertical centring at the top of this file.

Reference for anyone tempted: the three families and where they live.

| class | markup | css |
|---|---|---|
| `.stg-switch` | `settingToggle()` in `www/app.js` ~6373 | `www/css/pages/tools.css` |
| `.ft-switch` | fasting page | `www/css/pages/fasting.css` |
| `.rm-switch` | reminders page | `www/css/pages/reminders.css` |

Keep the `<button role="switch" aria-checked>` markup if this is ever revisited — it announces
state to screen readers, which the hidden-checkbox pattern most gallery switches use does not.

---

## UNVERIFIED VISUAL CHANGES — check these in a preview first

Three changes shipped today were reasoned from screenshots, not seen rendered. A new session
should start the preview server and look at them before doing anything else:

1. **iPhone bottom nav at 22px** — `www/index.html:507`,
   `bottom:max(10px, calc(env(safe-area-inset-bottom,0px) - 12px))`. Second adjustment to this
   value. If still wrong, the number to change is the `12`. Cannot be checked on Android (zero
   inset) — needs iOS, which goes through Codemagic, no Mac here.
2. **Settings toggle right padding, 12px** — `www/css/pages/tools.css:268`. Confirmed as a bug by
   the user; the 12px value is a judgement.
3. **Fasting toggle right padding, 12px** — `www/css/pages/fasting.css:187`. Fixed BY ANALOGY
   with the settings row, same zero-horizontal-padding shape. **Nobody has looked at this screen.**
   If its card already pads its children, 12px is now too far in.

Also unverified: the **central scroll reset** (`76a4df2`). Two things to check —
Home → Habit Tracker opens at the top, AND Progress → a detail → back still returns you to where
you were in the Progress list. The second is what regresses if the call-ordering assumption was
wrong.

---

## Where the assistant stands (do not lose this)

**IGNYT AI now ships OFF by default** (`aiChatOn`, positive key so a missing value reads as off).
Everything below only affects users who opt in, which is why merging it to main was low-risk.

Measured on 2,000 supplied questions: **93.1% get an answer, but a hand-read sample of 14 was
only ~70% correct.** Coverage is not accuracy, and the coverage number was the easier thing to
measure. Do not quote 93% as a quality figure.

The failure mode is **"right topic, wrong question"** — an answer to a different question about
the same subject. Two gates were added and both work: retrieval must know the word you asked
about (IDF coverage on the user's own words, not the synonym expansion), and an open question
cannot be answered by a yes/no entry (question-form penalty ×0.35).

**A margin gate was tried and reverted** (`f46a16e`). Rejecting near-ties cost 29 points of
coverage and fixed only 2 of 5 known-wrong answers. The other three were not close calls — they
won outright. That negative result matters: no ranking rule over word overlap separates them.

**The path forward is RAG, and half of it is built.** `IgnytSearch.candidates(text, n)` returns
the top few entries ungated, for a model to choose between. Measured on the five known-wrong
answers, it splits them cleanly:

- **Retrieval failures (fixable by grounding a model in the shortlist)**: "how many carbs should
  I eat a day" has the exact right entry at position 4; "will burpees help me get fitter" at
  position 3.
- **Content gaps (not fixable by RAG)**: "what muscles does the lateral raise work" — all six
  candidates are about lateral raises and not one names a muscle. The entry does not exist.

**Nothing calls `candidates()` yet.** `EXTERNAL_AI` is `false` in `www/js/ai/service.js`, so no
Gemini call happens at all. Turning it on has a known cost the user has already rejected once:
AI-first made every message wait ~6s on a sleeping backend ("ai is thinking not giving answers").

---

## Production audit — where it got to

The user asked for a 32-phase production audit. Two phases are done:

**Phase 25, data isolation — DONE.** Firestore rules are owner-only and deny by default. No API
route accepts a user id from the caller; identity always comes from `Depends(current_user)`.
Six tests in `backend/tests/test_data_isolation.py` prove it with two users through the real app,
including one that reads the route table so a future endpoint cannot quietly start accepting a
user id. **Found and fixed a P2**: `AUTH_MODE=insecure-uid` takes identity from a request header
and was refused only when `ENVIRONMENT` read exactly `"production"` — `prod`, `production-eu` and
an unset value all permitted it. Now an allowlist of known dev environments; 17 tests.

**Phase 6/22, input validation — STARTED, one action only.** Fuzzed `addFoodLog` with 21 hostile
values. Good news: nothing ever stored NaN or Infinity. Found and fixed: `num()` stripped every
non-digit from strings, so `"1e400"` became `"1400"` and logged 1400g of chicken at 2310 kcal
with no error. `Number(true)` is 1, so a boolean logged one gram.

**Still untested**: weight, sets, reps, dates, CSV import, profile data, workout names. `num()`
is shared so they inherit the fix, but their own paths have not been fuzzed.

Next-highest value from the user's list, in order: automated test layers for food/workout/
progress/storage (there is currently NO coverage outside the chat suite), then Android/Capacitor
hardening, then dead-code cleanup last once tests exist to catch mistakes.

---

## Standing constraints — read before touching anything

- **`feature/coach-sync` must not be merged anywhere** until the user says so. Verified absent
  from `main` and from `feature/diagnostics-screen`. Check again before any merge.
- **Never push feature work directly to `main`.** Merges to main have been done twice, both times
  explicitly requested, both via a temporary `git worktree` because the working tree has
  uncommitted files that block `git checkout main`. Do not stash the user's work.
- **`GEMINI_API_KEY` never leaves the backend.** Verified: it has never been committed. The only
  key in git history is the Firebase Web API key, which is public by design and ships in every
  APK — it does not need rotating, but it should be restricted by package + SHA-1 in Google Cloud.
- **iOS builds go through Codemagic.** There is no Mac. Never suggest Xcode.
- **Google Sign-In was removed for the third time** (`40b483f`) after an attempt that failed with
  everything correct — plugin applied, `default_web_client_id` generated, all three Credential
  Manager libraries present, three fingerprints registered including Play's. Do not re-add it on
  a hunch; the reasons are recorded in `AuthPlugin.kt` and `android/app/build.gradle`.
- **Version codes**: `1.0.48` → `10506`, floor asserts `> 10505`. 10505 was built and handed over
  but its upload was never confirmed — the comment says so rather than claiming an upload that
  may not have happened. Bump the name before building any AAB.

## Build commands

```
npx cap sync android
cd android && ./gradlew.bat assembleDebug        # or bundleRelease for the AAB
```

Chat/intent suite (48 tests) is driven from a harness in the session scratchpad, not the repo —
it is not checked in. Backend: `cd backend && python -m pytest -q` (120 passed, 14 skipped).

Bump the service worker cache in `www/sw.js` on any `www/` change so installed clients update.
Currently `ignyt-v465`.

---

# PRODUCTION CHECKLIST (user's 12 items) — with what is already known

Recorded so the next session starts from measurements rather than re-deriving them. Findings
below are from this session unless marked otherwise.

**1. Browser tests open on the sign-in screen.** 405 tests expect an authed app. Not started.
Note before building the fixture: `skipSignIn()` was deliberately removed (there is a comment
about it in `www/app.js`) because Play review could not tell whether an account was required.
The fixture must authenticate, not bypass the gate.

**2. Rotate the Gemini key + Gitleaks in CI.** IMPORTANT CORRECTION TO THE PREMISE: the key has
NEVER been committed. Verified by scanning all of git history — the only `AIza`-prefixed value
ever committed is the Firebase Web API key (`AIzaSyBf3Is97T...`), which is public by design and
ships inside every APK. It does not need rotating; it SHOULD be restricted by package name +
SHA-1 in Google Cloud. A key sitting in a gitignored local `backend/.env` is where it belongs.
Rotate anyway if that file has been shared around, but this is hygiene, not an active leak.
Gitleaks in CI is still worth adding — the value is preventing a future mistake.

**3. npm audit.** Measured `npm audit --omit=dev`: ONE high (brace-expansion DoS, transitive,
tooling only). The "five high" figure presumably includes dev dependencies. Confirm which set
matters before upgrading the Capacitor chain — Capacitor is pinned at 8.4.1 and CLAUDE.md
forbids changing the toolchain versions without explicit authorization.

**4. AI food scanning.** Backend exists and is wired: `routes_food.py` has `/scan` and
`/scan-status`, gated on `gemini_api_key` being configured, with a per-user daily limit
(`ai_scan_daily_limit`, default 15) and real usage accounting in `AiScanUsage`. The frontend
row asks scan-status once and renders nothing when the server has no key — so it already hides
itself honestly. The decision is product, not code.

**5. Android build verification.** NOT BROKEN in this session — `./gradlew.bat assembleDebug`
and `bundleRelease` both ran clean many times, most recently for versionCode 10506. If it fails
elsewhere it is a machine-local JDK issue, not the repo.

**6. Auth E2E.** Partly done for the isolation half: `backend/tests/test_data_isolation.py` has
six tests proving user A cannot reach user B through the API, including one that reads the route
table so a future endpoint cannot start accepting a user id. What is NOT covered: sign-up,
sign-in, logout, password reset, token expiry — all of which need real Firebase tokens rather
than the header-based dev identity the test harness uses.

**7. Physical device testing.** Agreed and unavoidable. Add to the list: EVERY visual change in
the last stretch of this session was reasoned from screenshots, and three came back as
regressions. See the top of this file.

**8. Frontend quality gates.** There is currently NO lint config, NO formatter, NO type checking
(plain JS, no TS), and no bundle-size check. The only automated frontend coverage in the repo is
the chat/intent suite, and even that is driven from a scratchpad harness that is NOT checked in.
Checking that harness in would be a cheap first win.

**9. Duplicate root files.** Do not delete on sight. `capacitor.config` and the Android build
copy `www/` into assets — confirm by checking what `npx cap sync` copies before removing
anything at the repo root.

**10. Privacy/storage governance.** Storage keys seen this session: `hx_settings`, `hx_habits`,
`hx_auth_seen`, `hx_tab`, `hx_ios_auth_tokens`, plus `state.foodLog`, `state.bodylog`,
`state.prs`, `state.habitCompletions`. That is not the full set — enumerate from `LS.records(`
and `LS.set(` call sites rather than from this list.

**11. Security testing in CI.** There is no CI workflow in the repo at all as far as this session
saw. That is the first thing to establish before adding scanners to it.

**12. Performance budgets.** One number worth knowing: `www/data/knowledge.json` is 5.4 MB and
`clean_foods.json` holds 13,516 foods. Both are parsed and indexed on the phone at startup. If
startup time is a budget, those two files are where to look first.
