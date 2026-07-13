# CLAUDE_PROGRESS.md

## Current feature request
Fix dark-mode contrast bug on the Home Health Connect dashboard cards: card titles ("Heart
Rate", "Sleep", "Weight", …) and primary metric values ("62 bpm", "6h 28m", "100.8 kg",
"No data", …) rendered black/dark on the dark card background. Requirements: titles and
primary values near-white in dark mode, secondary text stays muted gray, preserve hierarchy,
do not break light mode, no broad `body *` rules, no theme-system rewrite.

## Current branch
feature/phase1-stabilization (continued — this is a UI stabilization fix of the same kind as
the Phase 1 pass, found while the user was testing this branch's build; the branch is unmerged
so continuing here keeps one coherent stabilization deliverable).

## Root cause (verified, not assumed)
`hcCard()` in `www/app.js` (~line 3532) renders every Home health card as a native
`<button class="hc-home-card">`. Native buttons do NOT inherit CSS `color` — the UA stylesheet
forces `color: ButtonText` (black on Android WebView). The app resets color for
`input,select,textarea` (`www/index.html` line 146) and every other button class in the app
(`.btn-ghost`, `.cat-chip`, `.nav-btn`, `.week-chip`, `.more-sheet-card`, …) sets its own
color — but `.hc-home-card` had NO color rule anywhere. The card title span and primary value
div carry no inline color (they were written to inherit), so they fell back to UA black.
In light mode this coincidentally looked correct (black on white), which is why only dark
mode was broken.

## Fix applied
One targeted rule appended to `www/health-connect.css`:
`.hc-home-card{color:var(--text); font-family:inherit;}`
- `color:var(--text)` → titles/values are #F2F1ED (near-white) in dark mode and #16161A in
  light mode, automatically via the existing theme variables. No `!important` needed: author
  rules beat UA rules, and the button's inline style does not set `color`.
- `font-family:inherit` → buttons also don't inherit font-family (UA serves Arial); this makes
  card text match the app font. No layout risk: sizes/weights are all set inline per element.
- Everything secondary inside the card (range label, source, unit, timestamp, "No data",
  chevron) already sets `color:var(--muted)` inline, so hierarchy is preserved unchanged.

## Scope audit (all other Health Connect surfaces checked — no other instance of the bug)
- Health dashboard detail view (`renderHealthDashboard`): all divs/spans with explicit
  var(--text)/var(--muted)/var(--mint) colors — unaffected.
- Insights tiles (`hcInsightTile` / `renderHealthInsightMetrics`): `.stat-card` divs with
  explicit colors — unaffected.
- Food Log Health Connect calorie budget line (app.js ~4756): div with explicit
  var(--muted) — unaffected.
- Settings Health Connect card (`health-settings-integration.js`, `.hc-card` classes): divs,
  colors from health-connect.css vars — unaffected.
- Charts (`svgLineChart`, `svgBarChart`, `svgSleepStages`): stroke/fill via theme vars —
  untouched.
- Grepped all `<button` usages in app.js: every other button gets color from its class;
  `.hc-home-card` was the only offender.

## Files changed
- www/health-connect.css (added `.hc-home-card` color/font rule + explanatory comment)
- CLAUDE_PROGRESS.md (this file)

## Build attempts
1. `npx cap sync android` — succeeded.
2. `cd android; .\gradlew.bat clean assembleDebug` — **BUILD SUCCESSFUL in 1m 53s**
   (100 actionable tasks: 90 executed, 10 up-to-date).

## Current build result
BUILD SUCCESSFUL. APK at android/app/build/outputs/apk/debug/app-debug.apk.

## Errors encountered
None so far this session.

## Fixes applied
See "Fix applied" above.

## Commit status
Not yet committed (waiting for BUILD SUCCESSFUL per CLAUDE.md).

## Push status
Not yet pushed.

## Exact next action
Commit www/health-connect.css + CLAUDE_PROGRESS.md on feature/phase1-stabilization, push to
origin, report to user. Then begin the newly requested Phase 2A task (Google Sign-In / user
account foundation) on a fresh branch feature/google-signin-auth.

---

## Previous completed task (Phase 1 stabilization) — for history
Full Phase 1 stabilization audit completed, built (BUILD SUCCESSFUL), committed (f8a6d79) and
pushed to origin/feature/phase1-stabilization in the prior session. Fixed: Health Connect
native crash risk (unguarded grantedPermissions, no SupervisorJob), missing manifest
`<queries>` block, Insights "No data" vs "Permission required" distinction, Week/Month/Year
mislabeled snapshot data, pluginScope leak, 32px tap targets, sw offline fallback, 0-calorie
food rejection, food-row overflow, dead CSS removal. Out-of-scope items documented there:
average sleeping heart rate (feature, not bug), Food Log date navigation/edit-in-place
(missing features). Root-level `app.js`/`index.html` are a separate GitHub Pages PWA
deployment — out of scope; the Android app uses `www/`.
