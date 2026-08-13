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

Redesign the toggle switches to match a reference design supplied by the user (a card from
uiverse.io). NOT STARTED — deliberately. See "Blocked on" below.

## Current branch

`feature/diagnostics-screen` at `994c99a`. `main` at `18cf74c`.
Everything is committed and pushed. Nothing is in flight.

---

## THE TOGGLE REDESIGN (the actual next task)

### What the user wants

A screenshot of the OFF state was supplied. Read from it:

- **Track**: light grey pill (~#C8C8C8) with a subtle inner shadow, so it reads as recessed
- **Knob**: dark charcoal (~#333), nearly the full height of the track, with a **vertical notch
  line down its centre** — a power-switch motif
- **Two indicator dots OUTSIDE the track**: red on the left, hollow white on the right
- Off state = knob left, red dot lit

### Blocked on

**The ON state was never supplied.** Unknown: whether the red dot goes dark and the white lights,
whether the white turns green, and whether the knob or track changes colour. That is half the
design. Ask for the on-state screenshot before writing any CSS.

### What this touches — it is not a one-file change

Three switch families, each with its own markup site and its own stylesheet:

| class | markup | css |
|---|---|---|
| `.stg-switch` | `settingToggle()` in `www/app.js` ~6373 | `www/css/pages/tools.css:277` |
| `.ft-switch` | fasting page | `www/css/pages/fasting.css:187` |
| `.rm-switch` | reminders page | `www/css/pages/reminders.css:42` |

The current switch is a 46×26 track with a 20px knob and nothing else. The reference adds two
indicator dots that do not exist in the markup, so **this needs new HTML in three places**, not
just CSS.

### Two decisions to make before building

1. **Keep the `<button role="switch" aria-checked>` markup.** Uiverse switches are almost always
   a hidden `<input type=checkbox>` + `<label>`, which does not announce state to screen readers.
   IGNYT's button version is the more accessible one. Port the visual CSS onto it; do not adopt
   their markup wholesale.

2. **The indicator dots make every switch wider.** In Settings the switch is pinned right by
   `margin-left:auto` in a row that also holds a label and a description. Check the widest labels
   ("Workout Recommendations", "Auto-Start Rest Timer") on a narrow phone before committing — the
   description text already wraps.

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
