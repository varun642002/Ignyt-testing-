# CLAUDE_PROGRESS.md

## START HERE — open the preview and LOOK before changing anything

Everything below was reasoned from screenshots. Nothing in the last stretch of work was seen
running. Two bugs the user reported were caused by my own earlier unverified changes, so the
first action in a new session is to start the dev server and look, not to edit.

### THE BROWSER SUITE — read this before touching tests/pages/BasePage.js

Full suite: **187 passed, 5 skipped, 23 failed.** All 23 are `mobile-safari` + `workout`, and
all 23 are ONE bug: `[data-action="start-session"]` not found, because the app is still on Home
after `navigate('workout')`. The page snapshot in each `test-results/*/error-context.md` shows
Home. `trace.zip` is saved alongside — open it in the trace viewer; it shows the click landing.

**navigate() cannot currently prove arrival.** It ends at `expect(this.app).toBeVisible()`, and
`#app` is visible on every screen. So the navigation specs pass on mobile-safari while the app
never left Home. The 25 green navigation tests prove a button was clickable, nothing more.

**FOUR attempts at fixing this failed. Do not repeat them:**

1. *Seeding an authenticated session* (`hx_auth_account`) — a real defect in the fixture, kept,
   but not the cause. Commit `58956c9`.
2. *Matching `[data-nav]` and `[data-navtab]`* — fixed a genuine selector mismatch and took
   navigation from 25 red to 25 green. Commit `211e730`. Did not fix workout.
3. *Preferring the tab bar over in-page links* — `.first()` on a comma selector returns document
   order, a real hazard, but not the cause. Commit `c5d3d24`.
4. *Asserting the tab button has class `active`* — WRONG. That class is set only while DRAGGING
   the nav (`www/app.js:8695`); a tap sets no per-button class. Failed all 25 on every browser.
   Reverted in `52a322d`.
5. *Asserting `--nav-i` on `.nav-ind` equals the tab's DOM index* — the property IS what moves
   the pill (`syncBottomNav`), but the assertion failed 4 of 5 on mobile-chrome where navigation
   works. Either the value settles differently than polling expects, or it is not set on every
   tab change. NOT committed; `BasePage.js` was checked out clean and is green at 5 passed.

**THE TRACE HAS NOW BEEN OPENED. Here is what it says:**

```
queryCount  [data-navtab="workout"]          found
click       [data-navtab="workout"]          EXECUTED
expect      #app                             passed (always does)
expect      [data-action="start-session"]    FAILED
```

The click lands on the correct element and the app does not change tabs. So this is NOT a
selector problem, NOT an auth problem, and NOT a test problem. It is the app: on WebKit, a click
on the bottom nav does not navigate.

The handler is `nav.addEventListener("click", ...)` at `www/app.js:8577`. It does two things
before navigating, and one of them is eating the click:

1. **The drag-suppression guard**, `if(Date.now() - dragEndedAt < 350) return;` (line 8586).
   `dragEndedAt` is set on pointerup when `moved` is true, and `moved` requires 6px of
   horizontal travel (line 8729). Playwright moves the pointer BEFORE pointerdown, so `moved`
   should stay false -- but WebKit's pointer event sequence differs from Chromium's and this is
   the obvious suspect. Verify by logging `moved` and `dragEndedAt` from a WebKit run before
   changing anything.
2. **`goTo(btn.dataset.navtab)`** at line 8587 -- if the guard passes, the failure is inside
   goTo. Not yet read.

If it IS the guard, this is a REAL USER BUG on iOS, not a test artefact: a tap with any finger
travel would be swallowed for 350ms. Worth fixing on those grounds regardless of the suite.

**Traces are overwritten by later runs.** Regenerate with:
`npx playwright test tests/workout/set-logging.spec.js --project=mobile-safari`
then unzip `test-results/<folder>/trace.zip` and read `*.trace` as JSONL.

**INSTRUMENTED THE HANDLER ON WEBKIT. The result rules out the guard and points somewhere worse.**

Probes were added to the nav click handler (line 8586 area), pointerdown (8714) and pointerup
(8752), writing to `window.__navDbg`. Then a temporary spec clicked `[data-navtab="workout"]` on
mobile-safari and dumped the array. Instrumentation has been reverted; `www/app.js` is clean.

```
NAVDBG {"dbg":[], "tab":"(no window.state)", "startBtn":0}
```

**The array is EMPTY.** Not "the guard swallowed it" -- no pointerdown, no pointerup, no click
probe fired at all. The nav's listeners never ran.

So the 350ms drag guard is NOT the cause, and neither is goTo(). Ruled out.

The DOM is not the problem either, checked in the same way:

```
navCount 1 · btnCount 5 · all five inside nav.bottom-nav · classes: "bottom-nav
bottom-nav--home-light has-active"
```

One nav, five buttons, all children of it, and `has-active` present -- so syncBottomNav has run.
The element Playwright clicks is the right element, in the right parent.

**Therefore: the nav element in the DOM does not carry the click/pointer listeners on WebKit.**
The listeners are attached in buildBottomNav (www/app.js:8556 onward). Either that attachment
path does not run on WebKit, or the nav that receives listeners is later replaced by one that
does not -- removeBottomNav()/buildBottomNav() are both called from render paths, and a rebuild
that skips re-attachment would look exactly like this.

**buildBottomNav LOGGED. It runs, and the listeners are on the right element:**

```
BUILDDBG {"log":[{"ev":"buildBottomNav"},{"ev":"listenersAttached"}],
          "listenerNavStillInDom":true,"listenerNavIsDomNav":true}
```

So "never attached" and "attached then replaced" are both ruled out.

**Then the click handler's FIRST line was logged, and this is the finding:**

```
ENTRYDBG click-entry: target="NAV", targetClass="bottom-nav ...", btnFound=false
```

`e.target` is the NAV ITSELF, so `e.target.closest("[data-navtab]")` returns null and the handler
returns on its first line. That is why every earlier probe looked like "nothing fired" -- they
were all placed AFTER this early return.

**But hit-testing says that should not happen:**

```
HITDBG topAtCentre="svg", topIsBtnOrChild=true, btnPointerEvents="auto",
       stack=[svg, BUTTON.nav-btn, NAV.bottom-nav], rect={x:89,y:594,w:70,h:53}
```

`document.elementFromPoint` at the button's centre returns the SVG icon, which IS inside the
button. There is no overlay, no pointer-events:none, and no pseudo-element covering the bar
(checked: no `bottom-nav::after`/`::before` exists).

**So: the hit test resolves to the button's SVG, and the dispatched click's target is NAV.**
Those cannot both be right. Two candidates left:

1. **WebKit event retargeting from the SVG.** `e.target` for a click on an SVG child may resolve
   differently than elementFromPoint suggests, and `closest()` from an SVG element is the classic
   place this bites. Test directly: log `e.target.tagName` AND `e.target.parentElement` in the
   handler, and try `e.composedPath()` instead of `closest()`.
2. **Playwright dispatching at a different point than the centre** -- the button is 70x53 at
   y=594; check the viewport height for the mobile-safari project and whether the nav is partly
   below the fold at click time.

**LIKELY FIX IF IT IS (1):** the handler should not depend on `closest()` from whatever child was
hit. `e.composedPath().find(el => el.dataset && el.dataset.navtab)` is robust to SVG targets, and
would be a real iOS fix, not a test workaround -- a user tapping the icon rather than the label
would hit the same path.

**Previously NEXT:** log from inside buildBottomNav itself -- does it run on WebKit, how many times, and is
the element it attaches to still the one in the DOM afterwards (`document.contains(nav)`). That
distinguishes "never attached" from "attached to an element that was replaced".

Ruled out so far, do not retry: the selector, the auth fixture, the tab-bar preference, the
`active` class assertion, the `--nav-i` assertion, the 350ms drag guard, goTo(), and a duplicate
or missing nav in the DOM.

**Regenerating traces:** `npx playwright test tests/workout/set-logging.spec.js --project=mobile-safari`
then unzip `test-results/<folder>/trace.zip` and read `*.trace` as JSONL. Traces are overwritten
by later runs.

**Previously, where to start:** open a trace from a failing mobile-safari workout test. That shows whether
the click landed, whether the tab state changed, and what rendered — which distinguishes "the
click missed" from "the click worked and the app did not re-render" from "the app navigated and
came back". Guessing at assertions without that has now cost four attempts.

### TWO REQUESTS OPEN, NEITHER DONE

**A. Log Entry should be FIRST on the Log Weight page.** Current order in `renderBodyTab()`
(`www/app.js`): page title -> stat cards -> Trend chart -> "Recent Entries" -> **"Log Entry"** ->
"Body Scan Archive". The Log Entry block is the ~28 lines from the
`<div class="rh-section-head"><span>Log Entry</span></div>` line to just before the Body Scan
Archive section head, and it is self-contained.

ATTEMPTED AND REVERTED. A script moved it above the stats row by anchoring on the string
"Track your progress" — which appears TWICE in app.js, in two different functions. It matched the
wrong one and spliced the block into an unrelated template, breaking the file. Reverted clean
(`node --check` passes). If you retry: anchor on line numbers found relative to the "Log Weight"
title inside renderBodyTab, or on a string that is unique, and run `node --check` before anything
else.

**B. Back-swipe should be ENABLED on iPhone and Android.** The user has confirmed the iOS
edge-swipe chevron is WANTED, so the earlier note about disabling it is wrong — do not disable it.
Android already has a handler: `AppPlugin.addListener("backButton", ...)` at `www/app.js:23090`.
iOS has no `ios` section in capacitor.config.json at all, so whatever Capacitor's default is,
applies. NOT CHANGED — it is a behaviour change on a platform this session cannot build or test,
and the SPA's own back stack and WKWebView history are two different things that need
reconciling before the gesture is trusted.

### REPORTED FROM A DEVICE, NOT YET FIXED (2026-08-13)

Four reports. One was data and is done; three are iPhone visual/behavioural and need a device.

1. **Egg small/medium/large — FIXED.** `Egg` had NO portions at all and `Whole Egg`/`Boiled Egg`
   had a single `piece: 50g`, so there was no size to choose. Added small 38 g, medium 44 g,
   large 50 g (USDA edible-portion weights, shell removed) to `Egg`, `Whole Egg`, `Boiled Egg`,
   `Egg (Whole)` and `Egg, hen`, plus a `g` portion on the three rows that had none. Large keeps
   50 g deliberately, so anything already logged as a piece does not shift.

2. **Calendar flickers — NOT FIXED.** Almost certainly the same class as the food-log flicker:
   a re-render that changes content height, where restoring scroll makes the page paint at one
   offset then jump. The global restore is height-gated now (`d0233ca`), so if the calendar
   still flickers, the height gate is not catching that path. Look at what the calendar re-renders
   on — month switching changes row count, so height changes legitimately.

3. **Achievements need updating on iPhone — NOT FIXED, and unclear.** Ask what "updating" means:
   stale data, wrong layout, or missing new achievements. Do not guess.

4a. **THE "ALIGNMENT" AND "STRAY ARROW" ARE ONE THING: an in-progress iOS back-swipe.**

   Evidence, in the order it accumulated:
   - `❯` appears NOWHERE in www/ — not in any js, html or css. It is not ours.
   - `expectNoHorizontalOverflow()` across home/workout/nutrition/progress/tools passes on
     mobile-chrome AND mobile-safari. Six tests, no overflow at any tested viewport.
   - The clipping in the screenshots is on the LEFT ("ECENT SESSIONS"), and the chevron is on
     the LEFT edge. Overflow clips the RIGHT. A left-clip means the page was dragged RIGHT.

   So the screenshots were taken mid back-swipe: iOS's edge-swipe navigation affordance is the
   `❯`, and the "misalignment" is the page sliding out from under it. Nothing to fix in CSS.

   **The real question is whether that gesture should exist at all.** IGNYT is a single-page
   app; a webview back-swipe walks WKWebView history, not app state, so it can strand a user
   outside the app's own navigation. Capacitor exposes this — set `ios.allowsBackForwardNavigationGestures`
   to false in capacitor.config.json (the file currently has NO ios section at all, so the
   default applies). NOT DONE HERE: unverifiable without a Mac, and it is a behaviour change on
   a platform this session cannot test.

   The truncated selects (`Centimeters (cn`, `12 Hour (AM/PM`) are the same drag, not separate.
   If they persist in a screenshot taken at rest, they ARE a real width bug — reopen then.

4b. **iPhone screenshots supplied. Three distinct faults, only one fixed:**

   - **A stray `❯` control on the left edge**, half off-screen, overlapping content. Visible on
     the Workout tab and Personal Info. Looks like a drawer/panel handle positioned outside the
     viewport. NOT FIXED — find what renders `❯` and why it sits at x<0.
   - **Horizontal overflow.** "RECENT SESSIONS" renders as "ECENT SESSIONS", and selects
     truncate mid-word: `Daily exercise o|`, `Centimeters (cn`, `12 Hour (AM/PM`. The page is
     wider than the viewport, or a container is shifted left. NOT FIXED — `BasePage.js` already
     has `expectNoHorizontalOverflow()`; point it at these screens and it will catch this.
   - **Goal wizard contradicted itself — FIXED (labelling, not maths).** The form showed
     "1 Jan 2027 · 141 days remaining" while the summary card below showed "Target date
     31 Dec 2026 · Days remaining 139". Both numbers were correct: the first is the chosen date
     minus the goal start, the second is `cp.completion` (where the current weekly rate lands
     you) minus now. The card was labelling a PROJECTION as the target. Renamed to "Projected
     finish" and "Days to finish" (`www/js/goals.js:271`).

4. **Alignment issues in many places on iPhone — NOT FIXED.** This is the one that needs a
   device or a WebKit preview. Three CSS changes shipped this session were reasoned from
   screenshots and never seen rendered (fasting row padding, iPhone nav at 22 px, settings
   padding at 12 px) — any of them could be contributing. Check those three first before
   treating it as a new problem.

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
