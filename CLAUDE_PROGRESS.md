# CLAUDE_PROGRESS.md

## CURRENT STATE — 2 Aug 2026 — iOS compiles on CI; Android 1.0.42 awaiting upload

**Branch:** feature/exercise-library-rebuild (pushed, clean)
**Head:** 8b0add8 "Build on Node 22; the Capacitor CLI requires it"

### iOS — new this session

There is NO MAC and none is available. Varun has an iPhone, which is a test device only.
Every iOS build runs on Codemagic's cloud Macs. Do not suggest Xcode, the simulator, or
xcode-select — anything Xcode would do by ticking a box has to be written into the repo
by hand instead.

- iOS platform scaffolded (Capacitor 8 / SwiftPM, no CocoaPods). Bundle id and display
  name already matched Android; version set to 1.0.42 / 10500 to match.
- Package.swift had Windows backslash paths from being generated on Windows — Swift Package
  Manager would have failed to resolve before compiling anything. Fixed.
- HealthKit plugin written: all 29 methods of the Android HealthConnectPlugin, registered
  under the same JS name "HealthConnect" so www/health-connect.js is unchanged.
- App.entitlements + CODE_SIGN_ENTITLEMENTS committed by hand, because the Xcode capability
  checkbox is not reachable.
- codemagic.yaml: ios-compile-check (unsigned, free) and ios-testflight (signed).

**FIRST SUCCESSFUL iOS BUILD, 2 Aug 2026.** Codemagic build 2, commit 8b0add8, 1m 20s on a
Mac mini M2. Confirmed from the log that all three Swift files are in the target —
AppDelegate, HealthConnectPlugin, HealthKitManager — and 534 web files synced. App bundle
11.64 MB.

**What that proves:** syntax, HealthKit API signatures, async/await, and that the
project.pbxproj edit registering the files worked.

**What it does NOT prove:** that the plugin is found at runtime. CAPBridgedPlugin
registration resolves at launch, so Capacitor.Plugins.HealthConnect may still be undefined
in JS. Permissions, reads and writes are all unverified.

**Two deliberate semantic gaps, documented in the source — not bugs:**
- iOS never reveals whether a READ permission was granted, so getPermissionStatus reports
  what it can and sets readAuthorizationIsUnknowable.
- kcalPerDay carries HealthKit's cumulative basal burn, not Health Connect's kcal/day rate.

**Still Android-only:** notifications, cloud sync, auth, share. Inert on iOS.

### Android

Release AAB built and verified: IGNYT-1.0.42-vc10500.aab, 14.9 MB, signed.
versionCode is now derived from versionName (major*10000 + minor*100 + patch + offset 458)
after Play rejected 10 and then 11 as already used.

Play warns the release drops 17,548 devices. Investigated and ruled out this build as the
cause — manifest and variables.gradle byte-identical to the vc9 release, all three artifacts
on disk declare minSdk 26 / targetSdk 36 with zero uses-feature and zero native ABIs. It is
minSdk 26, which Health Connect requires. Varun chose to proceed.

### Pending — needs the user

1. Upload IGNYT-1.0.42-vc10500.aab to Play.
2. Apple Developer Program ($99/yr) — enrol via the Apple Developer iOS app or the web.
   Then enable HealthKit on the App ID at developer.apple.com (browser, no Mac needed),
   create the App Store Connect API key, and add it to Codemagic as
   "ignyt-app-store-connect" to unlock the ios-testflight workflow.
3. Play reviewer account — Claude declined (password handling).
4. Play Integrity API on ignyt-fitness2.
5. feature/coach-sync is EXCLUDED from every merge until Varun lifts the hold.
   feature/premium-ui-modular-redesign was deliberately not merged: 244 commits behind,
   36 conflicts, and it would regress the launcher icon to the old bronze figure.

**Next action:** none pending on Claude. Awaiting the Play upload result, or the Apple
enrolment before iOS can go further.

---


## CURRENT STATE — 1 Aug 2026 — release 1.0.41 built, awaiting upload

**Feature request:** food measurement units per food type, egg foods, duplicate removal,
exercise images, then a release build.

**Branch:** feature/exercise-library-rebuild (pushed, clean, level with origin)
**Head:** e979a1d "Derive versionCode from versionName"

**Build result:** BUILD SUCCESSFUL.
**Artifact:** android/app/build/outputs/bundle/release/IGNYT-1.0.41-vc10041.aab
  14.9 MB, signed with android/app/ignyt-release.jks, R8 + resource shrinking on,
  sha256 starts 4afa5785, zip verified intact.
**Version:** versionName 1.0.41, versionCode 10041 — decoded from the built manifest
  (attribute 0x0101021B), not read from build.gradle.

**Completed this session**
- Exercise library trimmed 458 -> 452; every remaining exercise has an image.
  445 photos + 7 instruction posters. Retired names' muscles moved to LEGACY_MUSCLE_MAP
  (290 -> 296) so logged history keeps its attribution.
- Instruction posters render uncropped on the How To tab at their own aspect; the Library
  row and detail header keep the icon badge (a poster is unreadable at 38px).
- Food quantity field: type="number" -> type="text" + inputmode="decimal", because a number
  input reports selectionStart as null and cannot be selected or caret-positioned. Typing 150
  into a field pre-filled with 100 was giving 100150.
- Empty/invalid quantity now shows an em dash and disables Add, instead of silently
  displaying — and logging — the food's default 100 g.
- Add-food flicker: results list is patched row by row instead of innerHTML-replaced on every
  keystroke; serving presets and the unit select update in place instead of calling render().
- Per-food measurement forms (21 of them) replacing the one universal unit list. All 3,162
  foods classify; none lacks units; none offers a unit that cannot convert to grams.
- Fixed two long-standing arithmetic bugs found while checking conversions: portions entries
  were read as "grams per ONE unit" when the catalogue writes each food's basis (1 ml of soft
  drink resolved to 100 g, so a glass was 25 kg); and defaultFoodPortion returned a flat
  amount of 1 for any non-gram serving unit, opening every drink at "1 ml" and 0 kcal.
- Merged the 3 genuinely duplicated foods (same product under two biscuit categories, hidden
  by a curly vs straight apostrophe). MERGED_FOOD_IDS redirects the retired ids so logged
  entries stay editable. Did NOT delete the 1,313 foods that merely share macros — those are
  distinct products carrying per-category placeholder values.
- Added rice/flatbread/dosa portions and egg sizes, weights checked against published tables.
- Added the 5 egg foods (Whole, Boiled, Fried, White, Yolk) with USDA figures; the catalogue
  had 14 foods named "egg" and no actual egg.
- versionCode is now derived from versionName (major*10000 + minor*100 + patch) after Play
  rejected 10 and then 11 as already used — the hand-kept counter was not a record of what
  Play had seen.

**Pending — needs the user, not Claude**
1. UPLOAD IGNYT-1.0.41-vc10041.aab to Play. Claude cannot do this: it needs Play Console
   sign-in and Claude does not handle credentials.
2. Play warns the release drops support for 17,548 devices. Investigated and ruled out any
   cause in this build: the merged manifest and variables.gradle are byte-identical to the
   vc9 release, both bundles declare minSdk 26 / targetSdk 36, zero uses-feature, zero native
   ABIs, identical 27 permissions. minSdk 26 has been constant in every commit of this repo,
   so the comparison is against a release predating this history. minSdk 26 is the floor for
   androidx.health.connect connect-client and is pinned by CLAUDE.md. User chose to proceed.
3. Play reviewer account — user must create it; Claude declined (password handling).
4. Play Integrity API still to be enabled on ignyt-fitness2.
5. Branch consolidation: ~9 branches outstanding. feature/coach-sync is EXCLUDED until Varun
   lifts the hold — do not merge it anywhere.

**Next action:** none pending on Claude. Awaiting the user's upload result, or the next
feature request.

---


## SHA-256 fingerprint check — added, BUILD SUCCESSFUL

Verified on this machine (debug keystore, `~/.android/debug.keystore`):

    SHA-1    44:7C:FA:B0:43:F2:7D:6A:1F:93:DE:CF:47:90:A1:EB:2B:FB:14:78
    SHA-256  B7:55:60:B3:6A:5B:D5:73:39:61:43:F2:7D:95:D1:D2:31:A9:A4:DF:12:25:AD:BB:26:07:5C:F7:56:3F:1A:F0

Chain confirmed with apksigner against the built APK: its V2 signer cert SHA-1 is
`447cfab043f27d6a1f93decf4790a1eb2bfb1478`, which is byte-for-byte the `certificate_hash` in
`android/app/google-services.json`. So the debug build's SHA-1 IS registered on the
`ignyt-fitness2` project.

SHA-256 registration CANNOT be determined from any local file — Firebase writes only SHA-1
into google-services.json. Only the Console shows it. Hence the check is a runtime one:

- `AuthPlugin.checkSigning()` reads the running app's own certificate (signingInfo on API 28+,
  the deprecated `signatures` below it, since minSdk is 26) and returns both fingerprints.
- The app-not-authorized / MISSING_CLIENT_IDENTIFIER branch of `phoneErrorMessage()` now prints
  the actual SHA-256 to register, instead of telling the user to go find a value that is not on
  disk anywhere.
- Logged once per launch, and shown on-device under Settings > account card > "Build
  fingerprints", with a copy button (clipboard API + textarea fallback, since
  navigator.clipboard is unavailable in some WebView configs).

Fingerprints are public — derived from the certificate inside every copy of the APK.

## Phone auth + navigation + Tools move + Health Connect first — BUILD SUCCESSFUL, pushed

Branch `feature/v1.1`. The brief was "debug phone auth", but phone auth had never been
implemented — `AuthPlugin.kt` had no `PhoneAuthProvider` and `signInAction("otp")` only fired
a toast reading "not wired up yet". Built it, and fixed three real navigation bugs found on
the way.

Root causes of "stuck on Signing in…", all three independent:
1. `notifyUI()` in `www/auth.js` re-rendered ONLY when `state.tab === "settings"`. Sign-in also
   lives on Tools and the first-run screen, where the busy flag changed and nothing repainted.
2. `signInAction("google")` called `auth.signIn()` without awaiting — the promise was dropped,
   so a successful Google sign-in never advanced past the screen.
3. The busy guards (`if (_busy) return;`) returned `undefined`, and callers read `res.success`
   off it.

Built: `sendOtp`/`verifyOtp` on the native plugin (AtomicBoolean `settled` guard — Firebase's
`onVerificationCompleted` can fire before `onCodeSent`, and resolving a PluginCall twice is
itself a hang), JS wrappers with `finally`-clearing busy state, a two-step OTP screen, and one
`completeSignIn()` that every provider routes through so navigation cannot work on one path and
not another.

Also this session, per user request mid-turn:
- Tools removed from the bottom nav (6 tabs → 5), now reached from Profile → All Tools; added
  `.pg-back` so the demoted tab is not a dead end.
- Health Connect moved from onboarding step 10 to step 2. The step gates keyed off literal
  numbers (`=== 1`, `=== 9`, `=== 10`) and the reorder silently pointed them at the wrong
  screens — replaced with `obStepIndexOf(renderer)` so the order array is the only source of
  truth.

Verified in the browser pane with a stubbed Capacitor bridge: wrong code stays on the field and
shows the error, correct code navigates, busy always clears, zero console errors.

NOT verified on a real device — SMS delivery, Play Integrity and the reCAPTCHA fallback cannot
run outside a real Android device with Play Services. That is the one open risk.

## Batch 1 catalogue enrichment — 100 South Indian breakfast foods — BLOCKED ON SOURCES

Branch `feature/v1.1`. Brief's binding rules: never invent or estimate values; use only USDA /
IFCT / NIN / Open Food Facts (packaged only) / government databases; skip any food whose values
cannot be verified; do not duplicate a food that already exists.

Result: **1 of 100 addable.** Not a tooling problem — a source-coverage problem.

- 37 of the 100 already exist in `www/data/food/clean_foods.json` → skipped as duplicates.
- IFCT 2017 (`C:/Users/varun/Downloads/IFCT2017.pdf`) contains NONE of these dishes. Confirmed
  two ways: full-text scan of all 585 pages (the only "dosa" hits are "Dosa kaya", the Telugu
  word for cucumber), and IFCT's own front matter on p.26 — "All data except for poultry and
  egg pertains to raw food", 528 raw commodities. NIN publishes IFCT, so NIN adds nothing.
- USDA SR Legacy + Foundation (both on disk) carry only `Bread, chapati or roti` (2 rows).
  No idli, dosa, upma, pongal, vada, appam, puttu, paniyaram, idiyappam, poori, sevai.
- Open Food Facts is excluded by the brief itself — packaged foods only; these are homemade.
- The 37 existing rows cannot be enriched either: they hold macros only (0 of 23 micronutrients),
  and no permitted source has the micros.

Added: **Plain Chapati** (`ignyt:3208`), 25 verified nutrients from USDA fdcId 171844, 68 g
piece weight from the source, `verified: true` — the catalogue's first verified row. The 8
nutrients USDA does not report are left null, not estimated.

Note for whoever picks this up: the 37 existing South Indian rows are already labelled
`"sourceNote": "Representative recipe estimate (per 100 g, cooked)"` with `verified: false`.
The catalogue therefore already has a convention for unverifiable dishes. Extending it —
recipe-computed from IFCT raw ingredients, flagged `verified: false` — is the only route to the
remaining 62, and it needs the user's explicit go-ahead because the brief forbids estimation.

Next action: user decides between (a) ship the 1 verified food only, (b) supply a trusted
source file covering cooked Indian dishes, or (c) authorise recipe-computed rows marked
unverified. No APK built — a one-row data change does not warrant one.

## Earlier task (this session) — 8-item backlog, ALL COMPLETE, one branch per item, all pushed
Request: Cardio/Timed-Hold/Carry exercise logging, Notifications, Dark Mode, Splash Screen,
Export Data, Built-in Exercise Timer, Smart Exercise Logging, Testing. Google Drive
Backup/Sync (expanded scope) queued separately, blocked on user OAuth setup — not started.

- `feature/dark-mode-support` — real dark variants for all pg-light/wk-light/home-light
  screens (`www/css/pages/dark-mode.css`, isDarkTheme()-aware radar chart). Commit 38940b7.
- `feature/exercise-library-redesign` — Goal Wizard redesign (unrelated cleanup finished
  first). Commit 4f4f794.
- Smart Exercise Logging + Cardio/Hold/Carry fields (`exerciseLogType()`, `newSet()`,
  extended set-table rendering, CSV import/export) — same branch line as timer/export below.
- `feature/exercise-timer` — built-in hold timer (Start/Pause/Resume/Reset, auto-save).
- `feature/export-data-fix` (commit 308809f) — root cause: `<a download>` blob trick no-ops
  in native WebView. Fix: extended existing hand-rolled `SharePlugin.kt` (IgnytShare) with
  `shareText()`; `downloadFile()` in app.js now calls it on native. Added Nutrition CSV export.
- `feature/splash-screen` (commit 313fc1e) — native `installSplashScreen()` short hold +
  fade-out + WebView bg-color fix (no white flash) in MainActivity.java, handing off to a
  JS `#boot-splash` overlay (logo/IGNYT/spinner) for the rest of a ~2s hold, sessionStorage-
  gated to once per cold start.
- `feature/notifications-fix` (commit 438d48b) — root cause: reminders used the web
  `Notification` API only (undefined in native WebView, foreground-only elsewhere). Fix: new
  hand-rolled `com.varun.ignyt.notify` plugin (`IgnytNotify`) — AlarmManager + NotificationManager,
  `BootReceiver` re-arms after reboot, runtime POST_NOTIFICATIONS handling. app.js schedules/
  cancels native reminders on toggle change and reconciles at boot; old Notification-API path
  kept as browser/PWA fallback.

### Environment fix (affects ALL future builds in this repo, not just this session)
Gradle 8.14.3's daemon cannot compile build/settings Groovy scripts when JAVA_HOME is JDK 25
(this machine's default) — `Unsupported class file major version 69`. Fixed via
`org.gradle.java.home=C:\Program Files\Android\Android Studio\jbr` (a real local JDK 21) in
`android/gradle.properties`. Does not change the project's pinned Java/Kotlin target (still 21).

### Architectural note for future sessions
This project deliberately uses ONLY hand-rolled native Kotlin Capacitor plugins
(HealthConnectPlugin, AuthPlugin, CloudSyncPlugin, SharePlugin, now NotifyPlugin) — NO
third-party Capacitor plugins. `@capacitor/filesystem`/`@capacitor/share` were tried and
reverted this session: they ship Kotlin ≥2.1 metadata, incompatible with this project's
pinned `kotlin_version = '1.9.24'` (required for Health Connect). Do not reintroduce them;
extend the existing hand-rolled plugins instead.

### Build status
Every branch above individually reached BUILD SUCCESSFUL (`npx cap sync android` +
`gradlew.bat assembleDebug`) before commit. None merged to main.

### Known gaps / next action for the user
1. None of the 3 native-only branches (export, splash, notifications) have been exercised on
   a real Android device or emulator in this environment — only build-verified + browser-pane
   logic-verified (the native code paths themselves can't run outside `window.Capacitor`).
2. Google Drive Backup/Sync (expanded scope: cloud sync across devices, user accounts,
   conflict resolution, incremental backups, scheduled backups, version history/rollback,
   passphrase E2E encryption) is fully speced but NOT started — blocked on the user setting
   up a real Google Cloud OAuth Client ID.
3. These branches are independent siblings (not stacked) — merge order/conflict resolution
   into main is still the user's call.

---

## Previous task — COMPLETE, commit c47a297, pushed
Branch: `feature/health-insights-autosync` (from `feature/phase2-refinement` tip e92977b).
Request: Insights page with real Day/Week/Month/Year Health Connect data; auto-sync on
launch/foreground/Home-Insights-Food Log open/5-min interval; auto-update HC active calories
in the Food Log; preserve all 17 HC metrics + the Steps fix; keep connect-client at 1.1.0.

### What was found before writing anything
- `feature/phase2-refinement` had uncommitted WIP unrelated to this request: a complete
  "Edit Routine" feature (rename/reorder/edit-sets, `www/app.js` + `www/js/pages/workout.js`)
  and a `www/sw.js` cache bump to v22. Not discarded — committed first as its own commit
  (`ac67248`) on the new branch before starting this feature, so nothing was lost and history
  stays clean.
- The Health tab (`renderHealthDashboard` in app.js) already had a Day/Week/Month/Year
  "Insights" mini-section, but its own code comment documented the real bug: Week/Month/Year
  just relabeled the same "today" snapshot (or showed "No data") because the native side had
  no period-aggregate call — only `syncNow()` (today/latest only). This session's native work
  fixes that gap for real, it doesn't just add a new empty page.
- The Nutrition/Food Log tab was fully implemented in app.js (including the exact "add real
  HC active calories to the calorie budget" logic now being asked for) but unreachable —
  hidden behind a hard `return` + "Coming soon" placeholder from Phase 2 Batch A. Asked the
  user via AskUserQuestion whether to re-enable it (since that reverses a recent deliberate
  decision); got no reply, proceeded with the recommended option (re-enable) since it's the
  only way to actually fulfill "auto-update active calories in the Food Log" — flagged clearly
  in the final report for the user to review.

### What was built
- **Native** (`HealthConnectManager.kt`, `HealthConnectPlugin.kt`): existing
  `getTodaySteps/ActiveCalories/Distance/ExerciseSessionCount/HeartRate/Hydration/Nutrition`
  refactored into range-parameterized private helpers (`stepsFor(range)` etc.) with their
  public signatures/behavior UNCHANGED (today's fixed range, same callers) — this is how the
  17 metrics and the Steps `aggregate(COUNT_TOTAL)` fix stay intact, verified by keeping every
  existing call site as a one-line wrapper around the same original logic. Added
  `periodRange(period)` (rolling day/7d/30d/365d), new `sleepPeriodFor`/`weightPeriodFor`
  (period totals/change, distinct from the existing single-latest readers which are untouched),
  and `getInsights(period)` which assembles all of it (each field independently
  try/catch-guarded, same pattern as `syncNow`). Point-in-time vitals (BP, SpO2, body temp,
  body fat, height, lean mass, BMR, respiratory rate) intentionally reuse the existing
  `getLatestX()` readers unscoped — same "genuine latest known reading on every tab" design
  the Health dashboard's own code comment already established, not something this session
  changed. New `HealthConnectPlugin.getInsights` PluginMethod, no `ensurePermissions` gate
  (matches `syncNow`'s partial-permission-friendly pattern), attaches `grantedPermissions` for
  the JS "Permission required" tile logic.
- **JS**: `health-connect.js` gets a `getInsights(period)` wrapper.
  `health-settings-integration.js` gets an Insights fetch/cache layer (`hx_hc_insights_cache`
  localStorage key, in-memory `_insightsData`/`_insightsBusy` per period) and
  `refreshWhenConnected()` now also fetches Insights for the active range when the Insights
  tab is open — reusing the SAME existing launch/foreground/5-min-interval/nav-event triggers
  (all of which already existed from a prior session; only extended, not rebuilt). `app.js`
  adds `renderInsightsTab()` (Tools > Insights; Day/Week/Month/Year chips; honest
  No-data/Permission-required states; no fabricated charts), adds "insights" to the nav-sync
  event list and `MORE_TABS`, re-enables `renderNutritionTab()` (deleted the placeholder
  return), and flips `settings.exerciseCalorieBudget` default `false→true` so the existing
  (now-reachable) "add real HC active calories to Food Log budget" logic is on by default.
  Bottom nav stays exactly Home/Workout/Progress/Health (Batch A decision, unchanged);
  Insights and Food Log are reachable via Tools, same pattern as Health Connect/Body/Settings.
  `sw.js` CACHE bumped to v23.
- **Verification**: `node --check` on all 4 changed JS files passed. Browser-driven (web
  build, `npx http-server www`): Insights honestly shows "only available in the IGNYT Android
  app" with a working Back button (HealthConnect.isNativeAndroid() is false on web, by
  design); Food Log now renders its full real UI (was blank/placeholder before) including the
  "Health Connect active calories: Permission required" line (correct — web has no native HC);
  no console errors either screen. Native Insights period-aggregate correctness (real device,
  actual Health Connect data across Day/Week/Month/Year) was NOT verified — no Android device
  available in this environment; only build-verified.

### Build attempts
1. `npx cap sync android` — succeeded.
2. `android\gradlew.bat clean assembleDebug` — **BUILD SUCCESSFUL in 1m 54s** (101 tasks; only
   the 2 pre-existing `HealthConnectPlugin.kt` deprecation warnings, no new warnings from this
   session's Kotlin changes).

### Commit / push status
- `ac67248` — Edit Routine WIP (pre-existing, committed as-is, unrelated to this feature).
- `c47a297` — Insights + auto-sync + Food Log active-calories feature.
- Pushed `feature/health-insights-autosync` to `origin`. NOT merged to main (per instructions).

### Known limitations / next action for the user
1. Real-device verification still needed: connect Health Connect on an actual phone, confirm
   Day/Week/Month/Year in Insights show genuinely different numbers (not just structurally
   correct code) and that Food Log's calorie budget picks up real active calories.
2. Food Log re-enablement was a judgment call (recommended option, no explicit user
   confirmation received) — review and say if it should go back behind a placeholder instead.
3. `exerciseCalorieBudget` default flip to `true` only affects NEW installs / users who never
   touched that setting; anyone who already has `hx_settings` saved with it `false` keeps their
   existing choice (that's how all the other setting defaults in this app already behave).

## Premium UI pass 6 — what was done (this session)
1. Re-verified branch/clean tree; confirmed `AGENTS.md` still does not exist. Verified the
   PNG genuinely exists before any code change: `ls www/assets/images/athletes/` showed
   `home-athlete.png`, 2,638,708 bytes. Read the PNG header directly (IHDR chunk bytes) to
   confirm real dimensions — 1024x1536 (2:3 portrait) — and viewed the file to confirm it's a
   valid, sensible athlete photo (not corrupt/placeholder).
2. `www/js/pages/home.js`: changed the hero `<img src>` from
   `assets/images/athletes/home-athlete.webp` to `assets/images/athletes/home-athlete.png`
   (the only required app-code change) and added `decoding="async"` so this ~2.5MB decode
   doesn't block the main thread. The pass-5 `onerror` fallback (collapses the image wrap to
   `display:none` on load failure) is unchanged and still in place as a safety net.
3. `www/css/pages/home.css`: resized `.home-hero__image-wrap` from 118x150/92x128 to
   126x189 (≥375px) / 98x147 (≤374px) — both exactly the source PNG's real 2:3 ratio, so
   `object-fit:contain` fills the box edge-to-edge with minimal letterboxing instead of
   shrinking the athlete into empty space, per the "visually prominent" requirement.
   `object-fit:contain` + `object-position:bottom right` (no stretch, upper body/face
   anchored bottom-right) were already correct from pass 5 and are unchanged.
4. Real bug found and fixed during verification (not from a stated requirement, but directly
   relevant to "do not clip the user name" / "no text-image collision"): tested a long,
   single-word profile name ("Christopherson", no spaces) at 320px. `white-space:normal`
   alone cannot break an unbroken word, so the name's rendered width (209px) exceeded its
   148px column and, with `overflow:visible`, painted past its own box toward the image
   column — not a hard CSS clip, but a real visual collision risk on real devices with long
   names. Fixed by adding `overflow-wrap:anywhere` to `.home-hero__text` (inherited by
   `.home-name`/`.home-greeting`/streak line) — re-verified afterward: scrollWidth now equals
   clientWidth (148=148), zero overlap with the image at 320px. Short/normal names are
   unaffected (word-wrap behavior only kicks in when a token can't otherwise fit).
5. `www/sw.js`: added `./assets/images/athletes/home-athlete.png` to the `ASSETS` precache
   list now that the file genuinely exists (pass 5 deliberately did NOT add the nonexistent
   `.webp` path, since `cache.addAll()` fails atomically on any single 404 and would have
   broken offline support app-wide). Bumped `CACHE` to `ignyt-v12`.
6. Verification (browser-driven, this is a visual-fidelity + real-asset change):
   - `read_network_requests` confirmed a genuine `200 OK` for
     `assets/images/athletes/home-athlete.png` (old `.webp` path still 404s, as expected).
   - Checked all 6 required widths (320/360/375/390/412/430px): at each, confirmed no
     horizontal page overflow, no text/image bounding-box overlap, hero card fully within
     viewport, and the image wrap's computed `display` is `block` (loaded and visible, not
     hidden by the onerror fallback) with the expected breakpoint size.
   - `img.naturalWidth/naturalHeight` confirmed 1024x1536 (matches the real file, proving the
     browser actually decoded the real PNG, not a cached/stale asset).
   - Android WebView asset path: after `npx cap sync android`, verified with `ls` that
     `android/app/src/main/assets/public/assets/images/athletes/home-athlete.png` exists at
     the exact expected relative path (2,638,708 bytes, matching the source file exactly).
   - Screenshot capture is still unavailable in this environment (as in pass 4) — verification
     used the DOM/accessibility tree, computed styles, and `getBoundingClientRect()` math, not
     a rendered image. This is not a substitute for an actual visual check on a real device.
7. Noted but not acted on: the source PNG is 2.52MB, unoptimized for mobile (no resizing/
   compression). This directly increases APK size and Home's asset payload. Did not
   re-encode/compress the user-supplied file without being asked to — flagged as a
   recommendation in the final report instead.

## Premium UI pass 5 — what was done (this session)
1. Re-verified branch/clean tree; confirmed `AGENTS.md` still does not exist (full-tree
   search). Root-caused the missing athlete image before writing any code: grepped the
   entire `www/` tree for any existing reference to an athlete/hero image (none found — no
   broken `<img>`, no `background-image`, nothing) and globbed every image file in the repo
   (`www/icon-192.png`, `www/icon-512.png`, and Android launcher/splash assets only — no
   `www/assets/` directory exists at all, no fitness photography or muscle-anatomy imagery
   anywhere in the project). Conclusion: this is not a path/CSS/CSP/service-worker/WebView
   bug — the asset was simply never added to the project. Checked for a CSP meta tag in
   `www/index.html` that could block image loads — none exists, ruled out.
2. Restructured the Home hero (`www/js/pages/home.js`) into `.home-hero__row` (flex,
   text left / image right): greeting, name, streak, and the achievement/PR celebration
   banners are unchanged and untouched inside `.home-hero__text`. Added
   `.home-hero__image-wrap` containing a scrim div and an `<img>` pointed at the exact
   required path `assets/images/athletes/home-athlete.webp` (relative, matching this
   project's existing convention for `icon-192.png`/`css/tokens.css` etc.), with an inline
   `onerror` that sets the wrap's `display:none` — so when the file is missing (today) the
   layout is pixel-identical to the pre-existing text-only hero, and once a real file is
   placed at that exact path it will appear automatically with no further code change.
   No broken-image icon, no orphaned gradient, nothing fabricated.
3. CSS (`www/css/pages/home.css`): `.home-hero__athlete` uses `object-fit:contain` (never
   stretches) with `object-position:bottom right` (preserves upper body/face in frame if the
   source photo is taller than the card slot). `.home-hero__scrim` is a left-to-right
   gradient using the existing `--color-surface-elevated` token, sitting between text and
   image for legibility once an image exists. Image slot is a fixed 118×150px box (92×128px
   under 375px, matching this app's existing `max-width:374px` narrow-device convention) so
   it can never collide with or push out hero text; `.home-hero__text` keeps `min-width:0`
   for the same overflow-root-cause protection used elsewhere in this codebase.
4. Deliberately did NOT add the asset path to `www/sw.js`'s precache list: the service
   worker's install handler calls `caches.addAll(ASSETS)`, which fails atomically if any
   single URL 404s -- adding a path that doesn't exist yet would break the *entire* service
   worker install and take down offline support app-wide, not just the missing image. This
   will be added (with a `CACHE` version bump, same pattern as prior passes) in the same
   commit that actually adds the real image file.
5. Browser-driven verification (this is a visual-fidelity change, so build success alone
   isn't enough): served `www/` statically, loaded fresh, confirmed via
   `read_network_requests` a genuine `404 Not Found` for
   `assets/images/athletes/home-athlete.webp` (correct relative path resolution, not a typo
   or case mismatch), confirmed `.home-hero__image-wrap` computed `display:none` after the
   `onerror` fired, confirmed hero text renders unchanged, and confirmed no horizontal
   overflow at both 375px and 320px (narrowest target width).

## Premium UI pass 4 — what was done (this session)
1. Re-verified branch/clean tree; confirmed neither `AGENTS.md` nor the referenced
   `ignyt-premium-ui-redesign.json` exist anywhere in this repo (full-tree search) — proceeded
   on CLAUDE.md. The requested reference redesign is a very large scope (full navy/blue
   palette swap, athlete/muscle-anatomy imagery, Workout/Nutrition/Progress sub-tab
   reorganization into Overview/Performance/Body/Health etc.) — scoped this session to the
   most concretely specified, verifiable, safe piece: Home's "Today's Progress" card, plus a
   design-token evolution usable by later passes. Sub-tab reorganization of Workout/Nutrition/
   Progress and any athlete/anatomy imagery were deliberately NOT attempted this session (see
   Known limitations in the final report) — they need real licensed/generated image assets
   this environment cannot produce, and each sub-tab regroup is its own significant, testable
   change per the established incremental methodology.
2. Design tokens (`www/css/tokens.css`): added `--color-accent-blue` (#32b8f4) and
   `--color-accent-cyan` (#55d8ff) alongside the existing orange `--color-primary` (kept as
   the primary brand/CTA color, matching both the pre-existing "preserve IGNYT orange
   identity" instruction and the reference image itself, which uses orange for its Start
   button/streak accent and blue only for data/progress visuals). Nudged `--color-bg`/
   `--color-surface*`/`--color-border` a few hex steps toward a navy-black tone (e.g.
   `--color-surface` `#121418`→`#10131a`) — a small, reversible value shift, not a palette
   replacement, since a full swap can't be verified without a real device this session.
3. Home "Today's Progress" (`www/js/pages/home.js`, `www/css/pages/home.css`): replaced the
   old weekly-plan-percentage ring with a circular ring (CSS conic-gradient, no images/canvas)
   showing a genuinely computed "today" blend, plus stacked Calories/Protein/Steps rows to its
   right — matching the reference layout. Documented formula in code: average of whichever of
   {calorie adherence = eaten/target, protein progress = protein/target, step progress =
   steps/10,000} are genuinely available today, each capped at 100%; calorie/protein are
   always includable (macroTargets() always has profile-based defaults); steps is included
   only when Health Connect has actually synced a value today, otherwise omitted from the
   average entirely (never assumed/fabricated) and the row itself reads "Not synced". The
   10,000 steps denominator is a documented fixed convention default (matches the reference
   image's own 9,823/10,000 and common fitness-app practice) — no configurable step goal
   exists in Settings today; only the denominator is a constant, the step count shown is
   always real Health Connect data. Weekly plan progress (`Week N of 8 · Phase`) was not
   deleted — moved to the section-heading subtitle next to "Today's Progress" instead of
   being the ring's value.
4. Added a "Recovery & hydration" row (Sleep, HRV, Water) below Next Workout, replacing the
   old 2×2 metrics grid that mixed calorie/protein/steps/sleep. Sleep reuses the existing
   Health Connect cache read; HRV reads `latestWeight.hrv` (the field already recorded by the
   existing body-log entry model, per the mobile-UI-pass HRV/Sleep decision — no new field);
   Water reuses the existing `todayWater()`/`waterTargetMl` (same values Nutrition already
   shows). No "Recovery score" was added — the JSON explicitly required documenting any
   recovery-score formula, and no such computation exists anywhere in the current codebase;
   inventing one would be fabricated data, so it was left out rather than guessed at.
   `renderHomeTab`'s ctx builder in app.js was extended with `water`/`waterTarget` only (two
   new, already-existing-elsewhere values passed through) — no new storage keys, no changed
   calculations to any existing screen.
5. Visual/behavioral verification: since this is a visual-fidelity task, served `www/` as a
   plain static site (`npx serve`) and drove it in the Browser pane rather than relying on
   build success alone. Confirmed: fresh install renders the new card with correct honest
   empty states (`0% Goal`, `Not synced` for steps/sleep, `No data` for HRV — no placeholder
   numbers); computed styles confirmed the ring is a true circle using the new blue token via
   `conic-gradient`; no horizontal overflow at both 375px and 320px viewport widths (the
   narrowest target width) before or after populating stat values. Screenshot capture itself
   was unavailable in this environment (consistently timed out) — verification used the DOM/
   accessibility tree and computed styles instead of a rendered image; this does not replace
   an actual visual/real-device check, called out as such in the final report.

## Premium UI pass 3 — what was done
1. Re-verified branch (`feature/premium-ui-modular-redesign`), clean working tree, and
   confirmed AGENTS.md does not exist anywhere in this repo (searched full tree excluding
   node_modules/.git) — proceeded on CLAUDE.md, the project's actual rules file.
2. Bug fix — duplicate navigation path: `renderMoreSheet`'s Tools sheet had a "Fuel" card
   (`{id:"nutrition", label:"Fuel", ...}`) pointing at the exact same `nutrition` tab that
   is already on the primary bottom nav. Left over from before the nav restructuring, this
   meant (a) two different-looking entry points landed on the identical screen, and (b)
   `MORE_TABS` still listing `"nutrition"` made the Tools gear icon show as "active"
   simultaneously with the Nutrition nav button when viewing that tab. Removed the duplicate
   card and the `"nutrition"` entry from `MORE_TABS` (app.js ~3529, ~3576). Nutrition remains
   fully reachable — only the redundant duplicate shortcut was removed, no feature lost.
   Updated one stale "Fuel tab" copy reference (Body/Profile tab, ~line 5109) to "Nutrition
   tab" for consistency. Verified no other "Fuel" references remain anywhere in www/.
3. Modularization — Workout tab (partial, incremental): extracted the Workout tab's idle/
   session-list view (Start Empty Workout CTA + Recent Sessions list) into NEW
   `www/js/pages/workout.js`, `window.IgnytPages.renderWorkoutList(ctx)`, mirroring home.js's
   dependency-injection adapter pattern exactly (state/helpers passed in, no logic rewritten,
   same template output verified line-for-line against the original). `renderWorkoutTab` in
   app.js now delegates to it for the list state only. Deliberately did NOT touch the routing
   checks (exercise picker / workout complete / session detail) or the large (~1,600 line),
   deeply stateful active-session renderer (sets, supersets, rest timer, plate calc,
   swipe-to-delete) — those stay in app.js for a future dedicated incremental pass, per
   "extract incrementally and safely." Swapped the list's `row-between`/`eyebrow-label`
   section header for the shared `.section-heading` premium component (already used by Home)
   for visual consistency — output structure/classes elsewhere in the list are unchanged.
4. Registered the new script in `www/index.html` (loaded after home.js, before app.js) and
   added it to `www/sw.js`'s precache list, bumping `CACHE` to `ignyt-v11` so the new asset
   ships on next load (same pattern used when home.js was added).
5. Verified: `node --check` on app.js + both page modules passed; full diff reviewed (only
   the 4 intended files changed, no accidental content); secret/credential scan on the diff
   and new file found nothing.

## Current branch
feature/premium-ui-modular-redesign (branched from feature/mobile-ui-refinements).

## Premium UI pass 2 — what was done (this session)
1. Audited git status/log/diff and the full current architecture before changing anything
   (renderApp tab router, renderMoreSheet Tools sheet, nav bar, all renderXTab functions)
   to confirm feature parity from the prior session was intact: Home/Workout/Nutrition/
   Progress/AI Coach primary nav + Tools sheet (Plan, Library, Your Profile, Fuel, Settings,
   Health Connect) all still wired in renderApp's tab switch — nothing regressed or hidden.
2. Extended `www/css/components.css` only (no other file touched) with premium-token-based
   rules for components shared across Workout/Nutrition/Progress/Plan/Library/Profile/
   Settings/Health/Tools screens that the first pass's page-specific CSS files (home.css,
   workout.css, nutrition.css, progress.css, profile.css) had not yet covered: `.btn-accent`/
   `.btn-steel` CTA shadow, `.search-bar`/`.lib-item`/`.routine-card` card treatment,
   `.more-sheet` rounded top + `.more-sheet-card` elevation, `.cat-chip`/`.muscle-chip` pill
   radius, `.day-tab`/`.week-chip` radius, `.dialog-box`/`.toast` radius, `.ex-picker-avatar`
   pill radius, and a subtle glow on the rest-timer ring. This is additive CSS layered after
   the legacy inline `<style>` block (existing precedence pattern), so it changes visuals only
   — no class names, markup, or app.js logic were touched, and no storage keys or Health
   Connect/Firebase code paths were touched.
3. Deliberately did NOT attempt further JS extraction (e.g. Workout tab into its own module)
   this session — `renderWorkoutTab` is large (~1,600 lines) and interaction-heavy (active
   session, supersets, rest timer, plate calc, exercise menu, swipe-to-delete); moving it
   safely deserves its own dedicated incremental pass with its own build/verification cycle,
   consistent with "extract incrementally and safely." Flagged as the next step below.

## Premium UI modular redesign — what was done
1. Added modular CSS layers under `www/css/`: tokens, base, layout, shared components,
   responsive guards, plus page-owned Home/Workout/Nutrition/Progress/Profile/AI styles.
   Tokens centralize premium dark surfaces, IGNYT orange, typography, spacing, radii,
   shadows, safe areas and nav height; light-theme token values are retained.
2. Extracted the redesigned Home presentation into `www/js/pages/home.js`. The new
   `renderHomeTab()` is an adapter that passes existing state/calculation/Health Connect
   renderers into the module; the old Home renderer remains as `renderLegacyHomeTab()` only
   as a safe fallback. No storage keys, calculations, or Health Connect reads changed.
3. Home is now structured as greeting/profile, genuine goal progress, calorie/protein/steps/
   sleep metric cards, next workout, quick actions and an expandable existing Health Connect
   detail feed. Missing Health Connect values truthfully read `Not synced`.
4. Primary navigation is now Home / Workout / Nutrition / Progress / AI Coach. The header
   opens Tools (the existing More sheet), which retains Training Plan, Library, Profile,
   Fuel, Settings and Health Connect; no existing destination was removed. AI Coach is an
   explicit unavailable shell, not fabricated functionality.
5. Updated service-worker cache version/assets so the modular CSS and Home script work
   offline and are network-first refreshed alongside the app shell.

## Files changed
- `www/app.js`, `www/index.html`, `www/sw.js`
- New: `www/js/pages/home.js`
- New: `www/css/tokens.css`, `base.css`, `layout.css`, `components.css`, `responsive.css`
- New: `www/css/pages/home.css`, `workout.css`, `nutrition.css`, `progress.css`,
  `profile.css`, `ai-coach.css`
- `CLAUDE_PROGRESS.md`

## Build attempts
1. `node --check www/app.js` and `node --check www/js/pages/home.js` — passed.
2. `npx cap sync android` — succeeded.
3. `android\\gradlew.bat clean assembleDebug` — **BUILD SUCCESSFUL** (101 tasks).

## Commit status / push status
- Commit: `43f96cf Modernize premium UI foundation and navigation`
- Push: `origin/feature/premium-ui-modular-redesign` — successful.

## Build attempts (pass 2)
1. `node --check www/app.js` and `node --check www/js/pages/home.js` — passed (app.js was
   not modified in pass 2; check re-run as a sanity confirmation only).
2. `npx cap sync android` — succeeded.
3. `android\gradlew.bat clean assembleDebug` — **BUILD SUCCESSFUL in 36s** (101 tasks; only
   the 2 pre-existing HealthConnectPlugin.kt deprecation warnings, unchanged from prior runs).
4. Committed `642f883`, pushed to `origin/feature/premium-ui-modular-redesign`.

## Build attempts (pass 4, this session)
1. `node --check` on `www/app.js` and `www/js/pages/home.js` — passed.
2. Browser-driven visual/behavioral verification (see pass 4 notes above) — passed: correct
   honest empty states, blue conic-gradient ring rendering, no horizontal overflow at 375px
   or 320px.
3. `npx cap sync android` — succeeded.
4. `android\gradlew.bat clean assembleDebug` — **BUILD SUCCESSFUL in 59s** (101 tasks; only
   the 2 pre-existing HealthConnectPlugin.kt deprecation warnings).
5. Full diff reviewed before staging — exactly `www/app.js`, `www/css/tokens.css`,
   `www/css/pages/home.css`, `www/js/pages/home.js` — no accidental/unrelated content, no
   secrets.

## Exact next action (pass 4)
1. Real-device UI verification (see checklist in the final report): confirm the ring/stat
   layout renders correctly on an actual phone (this session's verification used browser DOM/
   computed-style checks, not a rendered screenshot or a real device); confirm the small
   background/border token shift doesn't look off in either theme; confirm the Recovery &
   hydration row (Sleep/HRV/Water) shows genuine data once Health Connect + a body-log entry
   exist.
2. Not attempted this session, still open: Workout/Nutrition/Progress sub-tab reorganization
   (Overview/Performance/Body/Health etc.) requested in the reference-redesign spec, and any
   athlete/muscle-anatomy imagery (no licensed/generated assets available in this
   environment — would need to be supplied by the user).

## Build attempts (pass 3, this session)
1. `node --check` on `www/app.js`, `www/js/pages/home.js`, `www/js/pages/workout.js` — all
   passed.
2. `npx cap sync android` — succeeded.
3. `android\gradlew.bat clean assembleDebug` — **BUILD SUCCESSFUL in 1m 13s** (101 tasks;
   only the 2 pre-existing HealthConnectPlugin.kt deprecation warnings).
4. Full diff reviewed before staging — exactly `www/app.js`, `www/index.html`, `www/sw.js`
   (modified) and `www/js/pages/workout.js` (new) — no accidental/unrelated content, no
   secrets.

## Exact next action
1. Real-device UI and integration verification (see checklist in the final report): confirm
   the Tools sheet no longer shows a separate "Fuel" card and the gear icon no longer
   double-highlights on the Nutrition tab; confirm the Workout tab's session list renders
   and behaves identically to before (Start Empty Workout, Recent Sessions, Show All/Less,
   delete, tap-to-view-detail, PR celebration banner) at 320–430px; then the same standing
   checklist as before — active-workout set entry/swipes, Health Connect connect/sync/
   exports, Firebase sign-in/cloud sync, and offline reload.
2. Next incremental modularization step (not yet started): extract the active-session
   renderer (sets, supersets, rest timer, plate calc, exercise menu — the remainder of
   `renderWorkoutTab`, ~1,600 lines) into `www/js/pages/workout.js` alongside the list view
   already moved — then Nutrition, then Progress, one coherent slice per session with its
   own build/verify/commit cycle.

## Current branch
feature/mobile-ui-refinements (from feature/progress-page-restructure tip a178d0f).

## Mobile UI pass — what was done
1. SET READABILITY: headers 14px, set number 19px (17px <375px), PREVIOUS 15px semibold
   brightened (var(--text) @ .78 opacity — no longer dim muted) and compacted
   ("30kg×13"), inputs 18px semibold w/ visible placeholders, RPE 16px; grid columns
   rebalanced (40px set / minmax(0,1fr) prev / 58+54 inputs / 46 RPE / 44 check) with
   ellipsis-not-overflow prev; ≤374px media query steps sizes down; profile/body form
   inputs 13→16px. Completed rows keep full-strength values (tint only).
2. SWIPE-ONLY DELETE: permanent red X removed from rows entirely (checkbox always shown);
   deletion = swipe-left reveal (existing pointer-event engine: 14px deliberate threshold,
   vertical-scroll wins, snap open/close, overswipe clamp, one row max, swipe-right
   closes) + NEW once-only document-level outside-tap closer (capture phase, added once —
   no per-render accumulation) + NEW accessible fallback "Remove Last Set" in the existing
   ⋮ exercise menu. Deleting the final remaining set now explains via toast instead of
   silently ignoring.
3. YOUR PROFILE: More card renamed "Body — Weight & measurements" → "Your Profile —
   Profile, body log & measurements" (nav id "body" kept for all existing references,
   incl. the Home Log Weight quick action — verified they all route here). Page already
   had the target structure (Basic Profile → Body Composition → Log Entry → History);
   Body History now shows latest 5 + "View All (N)" toggle (transient
   state.showAllBodyHistory). Sleep/HRV kept — genuinely part of the existing bodylog
   entry model with existing user data. NO data/keys/handlers changed: hx_bodylog and
   hx_profile untouched; log-body still updates profile weight → calories/macros; HC
   weight integration untouched.
4. PROGRESS OVERFLOW ROOT CAUSE (found, not papered over): weeklyBarChart is a flex row
   where every bar carries an intrinsic-width value label and flex children default to
   min-width:auto — the analytics ranges added 13-52 buckets, whose labels forced the row
   (hence page) wider than the viewport, shifting/cutting everything. FIXES: min-width:0
   + overflow:hidden on bar children, labels only when ≤9 buckets (else latest bar only),
   >16 buckets aggregate into ≤13 genuine sum-buckets, bar duration labels now h m.
   Also .grid2 → repeat(2,minmax(0,1fr)) + .stat-card{min-width:0;overflow:hidden} (same
   min-width:auto trap for large stat numbers), and main{overflow-x:hidden} as a guard
   AFTER the real causes were fixed. Radar (260px) and sparklines (width:100% viewBox)
   verified fit ≥320px.
5. Files: www/app.js, www/index.html, CLAUDE_PROGRESS.md.

## Previous completed (this session)
- a178d0f Progress restructure; cc8e209 workout upgrade — see history below.

## Progress restructure — what was done
- renderProgressTab replaced (marker-based splice, node --check verified) with a router:
  home (Progress title+subtitle, This Week card: Workouts[/goal], Training Time h m,
  Weekly Volume, Current Streak — thisWeekStats, NaN-guarded "No data") + 8 .prog-cat-card
  buttons (emoji icon, title, subtitle, chevron, 64px+ tap target).
- Detail views (each = existing section markup moved into its own function; ALL existing
  calculations/charts reused; lazy by construction — only the open view's template renders;
  charts are inline SVG strings, no instances to destroy):
  - PRs: total count, search (debounced 250ms, focus-preserving), 10-at-a-time Show More;
    the "+N more in your export" string is gone.
  - Achievements: unlocked X/Y, unlocked (newest first, full dates) then locked 🔒 list from
    ACHIEVEMENT_DEFS; logic AUDITED CORRECT (count-based, idempotent, can't unlock early) —
    honest note added that dates = unlock-in-IGNYT day (import day for CSV history).
  - Workout Analytics: 7D/4W/8W/3M/6M/1Y/All range chips; summary (workouts, time h m,
    volume, completed sets, est. calories, avg frequency); weekly activity chart with
    sets/duration/volume metric chips; muscle radar (30d, real mappings only); This Month
    vs Last Month with comparisonLabel() — NaN/Infinity impossible: prev>0 → %, prev=0 &
    cur>0 → "New", both 0 → "No change"; minutes now h m (fixes "670m"); All-Time section
    (old Overview stats preserved: streaks, totals).
  - Exercise Progress: search + selector, Best Weight / Best est 1RM (Epley) / Best Reps
    from FULL history, both trend sparklines, last-5-session history rows.
  - Body: latest weight + all-time change, weight trend sparkline, latest measurements
    (bodyfat/waist/chest/arms/hips/thighs/neck — only fields that actually exist in
    entries), Body Distribution (existing, with its week nav).
  - Nutrition: 30/60/90d chips, avg kcal + protein per LOGGED day (divide by logged-day
    count — no zero-division), both sparklines, specified empty state.
  - Calendar: existing month grid; active days now tappable (data-cal-day only on genuine
    activity days), selected-day panel shows that day's workouts (title/duration/volume/
    exercises/completed sets — tapping opens the workout detail) + plan check-off count.
  - Plan Progress: overall % + n of N (relabeled honestly as "plan exercises checked off"),
    HYROX-sessions-this-week row, per-week bars.
- Navigation: data-progress-view / progress-back handlers (per-render binding = no listener
  accumulation), scroll position saved on enter and restored on back, transient view state
  resets on back. Bottom nav untouched. Android hardware back = pre-existing app-wide
  behavior, unchanged (documented limitation).
- Bug fixes: NaN%/Infinity% impossible (comparisonLabel), raw-minutes displays → fmtMinutes
  h m, volume strings get a space before the unit, per-section try/catch in the router so
  one broken view can't blank the tab.
- Data safety: zero storage keys added/renamed/removed; all transient (progressView,
  prSearch, prShowCount, exProgressSearch, analyticsRange, nutritionRange,
  calendarSelectedDate) lives on state but is never persisted (persist() writes a fixed
  key list — verified).
- Files: www/app.js, www/index.html (.prog-cat-card CSS), CLAUDE_PROGRESS.md.

## Workout upgrade — what was done
1. STEPS ROOT CAUSE (verified in code): native getTodaySteps() was already correct
   (aggregate COUNT_TOTAL, local-timezone day range, null-vs-0); but HealthConnectPlugin
   syncNow() NEVER put a "steps" field in the payload (only steps7Days for the chart),
   while every UI reads d.steps.steps → Steps always "No data". FIX: added
   data.put("steps", safeOrNull { manager.getTodaySteps() }...) to syncNow.
   Refresh triggers already existed (launch, visibilitychange, 5-min single interval,
   home/insights nav event, manual Sync Now) — verified, unchanged, no new timers.
2. Volume/sets now count ONLY completed (done) non-warmup sets (computeSessionVolume
   changed, computeCompletedSets added); finish flow and live header use them.
3. Active workout: live stats bar (Duration timestamp-based w/ single DOM-node ticker —
   pre-existing; Volume; completed Sets). getPreviousSet now prefers genuinely completed
   history sets ("–" when none).
4. Rest timer rewritten TIMESTAMP-based (endsAt source of truth; visibilitychange resume
   catch-up; fired flag = one beep; no duplicate intervals).
5. Swipe-to-delete: set rows wrapped (.set-row-wrap + behind Delete button reusing the
   existing data-del-set handler); pointer-events engine (touch+mouse), 14px deliberate
   threshold, vertical scroll wins via touch-action:pan-y + dy guard, max one open row.
   Non-swipe fallbacks: existing X for empty sets, pointer(mouse)-drag works too.
6. Finish flow: double-tap guard (_finishingSession), confirmDialog when 0 completed sets,
   completed-only stats, then navigates to NEW Workout Complete screen. HC export unchanged
   (id-deduped observer). renderApp() persists on every render (verified) → save durable.
7. Workout Complete screen: real stats grid, PR list (genuine detectPRs output), exercise
   breakdown (N× name, completed only), muscles trained (real getMuscle metadata, skipped
   when unknown), 3 swipeable share cards (scroll-snap + dots + 3 theme choices), Share
   Image / Save Image / Copy Summary. Share images drawn by hand on canvas (1080×1350) from
   the saved workout only. Native share: tried @capacitor/share+filesystem@8 first — BUILD
   FAILED (@capacitor/filesystem ships Kotlin 2.1 code; project pins Kotlin 1.9.24).
   Uninstalled both (package.json restored byte-identical) and hand-rolled SharePlugin.kt
   (IgnytShare: shareImage via existing manifest FileProvider + ACTION_SEND chooser;
   saveImage via MediaStore Downloads on API29+/app pictures dir on 26-28 — both
   permissionless). Fallbacks: navigator.share → clipboard copy.
8. Typography scale (index.html + inline): title 30px, buttons 16px, stat values 24px,
   set inputs 16px, set numbers 16px, prev 13px, exercise names 19px, hc card titles 17px /
   values 28px, chips 14px, set-check 34px tap target; grid columns widened to match.
9. Files: HealthConnectPlugin.kt, package.json/package-lock.json, www/app.js,
   www/index.html, CLAUDE_PROGRESS.md (+ android capacitor gradle files from cap sync).
   Junk empty files "node" and "npm" found in repo root (0 bytes, not created by this work) —
   left untracked, not committed.

## Build attempts (workout upgrade)
1. node --check on app.js + cloud-sync.js — OK.
2. Build with @capacitor/share+filesystem — **FAILED**: capacitor-filesystem
   compileDebugKotlin, "metadata 2.1.0, expected 1.9.0" (kotlin-stdlib 2.1 dependency vs
   project Kotlin 1.9.24). Root cause identified from full log.
3. Fix: removed both npm plugins, hand-rolled SharePlugin.kt instead (zero new deps,
   matches project plugin architecture). cap sync cleaned module refs (verified).
4. Rebuild — **BUILD SUCCESSFUL in 54s** (101 tasks; SharePlugin.kt clean; only the two
   pre-existing HealthConnectPlugin warnings).

## Exact next action
Commit + push feature/workout-experience-upgrade, final report. THEN the queued Progress
restructure on feature/progress-page-restructure. Progress AUDIT ALREADY DONE:
- renderProgressTab (app.js ~4536-4726) = 13 vertical sections; helpers all reusable:
  computeStreak/computeLongestStreak/computeWeeklyActivity/computeMuscleDistribution/
  thisWeekStats/monthlyComparison/bodyWeightTrend/exerciseProgressTrend/calorieProteinTrend/
  renderBodyDistribution/renderCalendarMonth/weeklyBarChart/radarChart/sparklineChart
  (all inline-SVG string charts — no Chart.js instances to destroy; lazy rendering =
  only rendering the open view's template).
- Achievement logic verified CORRECT (count-based checks, idempotent, never early);
  confusing dates = achievedAt is the unlock day, which for CSV-imported history is the
  import day — honest behavior, will document, not "fix" into fabricated dates.
- Real Task-11 bugs found: monthlyComparison shows +100% when last month 0 (→ "New"/"No
  change"), raw minutes ("670m" → h m), PR list "+N more in your export" string (→ paged
  Show More), volume strings missing space before unit in history rows.
- Plan: transient state.progressView router; home = This Week summary card (workouts/
  training time h m/weekly volume/current streak from thisWeekStats) + 8 category cards
  (PRs, Achievements, Workout Analytics, Exercise Progress, Body, Nutrition, Calendar,
  Plan Progress); each detail view = existing section markup moved into its own function
  + back button; scroll position saved/restored on back; analytics range selector maps to
  computeWeeklyActivity weeks; achievements view shows unlocked + locked (from
  ACHIEVEMENT_DEFS) with counts; PR view: search + 10-at-a-time Show More.

## Previous task (Phase 2C — COMPLETE, commit f20f186, pushed)

## Phase 2C — what was built
- MOD CloudSyncPlugin.kt: two new methods, both restricted natively to the collection
  allowlist {workouts, routines, prs, bodylog, races, customExercises}:
  - listCollection(name, since): incremental pull, updatedAt > since, 25s timeout,
    fromCache flag passed through. Single-field inequality → no composite index needed.
  - writeRecords(name, records[≤450]): one Firestore WriteBatch of merge-sets; 15s
    timeout → {queued:true} (Firestore durable offline queue).
- MOD www/cloud-sync.js (major extension):
  - RECORD_CATEGORIES mapping the six local arrays to subcollections with per-category
    validate()/idOf()/sort(). customExercises docId = encodeURIComponent(lowercased name)
    (name is the app's natural key — NO local ID migration needed, none performed).
  - Per-record 3-way sync via content hashes (stableStringify + djb2:length) of the
    last-synced version, stored per uid in hx_cloud_sync_state.records. Only the changed
    side propagates; both-changed → LOCAL WINS and is pushed (documented; no unresolved-
    conflict UI this phase). Identical content → no-op (no duplicates — stable doc ids
    make writes idempotent merge-sets).
  - DELETIONS: tombstones {deleted:true, deletedAt} kept in Firestore forever; other
    devices remove their copy on pull; tombstoned ids marked "T" locally, never re-pushed
    or re-adopted (edit-vs-delete race → tombstone wins; same-name re-created custom
    exercise stays local-only — both documented).
  - Invalid local records: skipped for sync, ALWAYS preserved locally. Malformed cloud
    docs: skipped, never fatal. Records >300KB serialized: kept local-only, logged.
    Cloud docs with schemaVersion > 1: not interpreted.
  - Pull cursor lastPulledAt advances only on server-confirmed (non-cache) reads, with a
    10-min overlap window for device clock skew.
  - NEW planProgress section in users/{uid}: {completed map "wk|day|ex"→ms, activeWeek,
    activeLevel}; custom validator + per-key UNION merge of completed (uncheck can be
    resurrected only if both devices changed between syncs — documented).
  - Sync-state save only after full success → failed syncs repeat idempotent writes, never
    lose track. localChangedSinceLastSync() extended to hash-compare all six categories.
- Firestore rules: NO change needed — 2B rules already cover users/{userId}/{document=**}.
- Triggers/UI: unchanged from 2B (auth event, foreground ≥5min, single 90s watcher, manual
  Sync Now; one _busy guard). Status row already shows queued/offline/failed states.

## Phase 2C — excluded (deliberate)
foodLog, waterLog, favoriteFoods (food domain — later phase), achievements (derived,
recomputable from workoutLog), active session/restDuration/UI state (device-local), ALL
Health Connect data/state/cache (untouched, privacy), auth tokens (never stored).

## Phase 2C build attempts
1. npx cap sync android + gradlew clean assembleDebug — **BUILD SUCCESSFUL in 1m 49s**
   (101 tasks; no new warnings; APK present).

## Verification classification (2C)
Statically verified + build verified ONLY. NOT Firebase-verified, NOT real-device-verified,
NOT multi-device-verified. Requires: Firestore database created + rules deployed (see Phase
2B console actions), then single-device and multi-device testing per the final report.

## Exact next action
Committed + pushed (this step); everything further is user-side testing.

---

## Phase 2B (COMPLETE — commit de1c3ec, pushed)

## Phase 2B — audit findings
- Local schema: SCHEMA_VERSION=1 (hx_schema_version), runMigrations() hook at boot.
- hx_profile: weight,height,age,gender,activityMultiplier,goalDelta,name,hyroxExperience,
  trainingDays,equipment[] (defaults merged at boot).
- hx_nutrition: proteinPct,carbPct,fatPct,fibreTarget (macro targets — profile-scope).
- hx_settings: 14 syncable preference fields + 3 device-local reminder bookkeeping fields
  (lastWorkoutReminderDate,lastHydrationReminderDate,lastWeeklyReportAt — EXCLUDED).
- No per-field timestamps exist locally → conflict policy cannot be naive last-write-wins.

## Phase 2B — what was built
- Cloud schema: SINGLE doc users/{uid} = {schemaVersion:1, updatedAt, profile+profileUpdatedAt,
  nutrition+nutritionUpdatedAt, settings+settingsUpdatedAt}. No fragmentation; 1 read + 1
  merge-write per sync.
- NEW android/.../cloudsync/CloudSyncPlugin.kt — dumb safe pipe: getUserDoc (20s timeout,
  fromCache flag), setUserDoc (SetOptions.merge() — structurally cannot delete unsent fields;
  12s timeout → {queued:true} = Firestore's durable offline queue). Machine-readable error
  prefixes (offline:/permission-denied:/unauthenticated:/not-found:/failed-precondition:).
  Never rejects; same SupervisorJob pattern as other plugins.
- MOD MainActivity.java (registerPlugin), MOD android/app/build.gradle (+firebase-firestore
  via existing BOM 33.7.0 — no other dependency changes).
- NEW www/cloud-sync.js — the whole sync policy: explicit per-section field ALLOWLISTS with
  type validation applied to BOTH local and cloud data; 3-way sync per section using
  last-synced serialized snapshots stored in NEW localStorage key hx_cloud_sync_state (keyed
  to uid, cleared on sign-out); only the changed side propagates; both-changed / first-sync
  conflict → non-destructive union merge with LOCAL winning per-field, applied AND pushed.
  Populated local data is never overwritten by empty cloud data (empty cloud → Case A upload).
  Cloud schemaVersion > 1 → read nothing, push-only. Triggers: ignyt:auth-changed event
  (from auth.js sign-in/restore/sign-out), foreground resume (≥5 min throttle), single 90s
  change-watcher interval (visible tab only, serialize-compare), manual Sync Now. One _busy
  guard = no concurrent syncs; no retry loops (failures wait for next natural trigger).
- MOD www/auth.js — dispatches ignyt:auth-changed on sign-in, per-launch session restore,
  sign-out. MOD www/index.html — <script src="cloud-sync.js">.
- MOD www/app.js — renderCloudSyncRow() in the signed-in account card: Synced·time /
  Syncing… / Saved—will upload when online / Offline / Sync failed (friendly text only,
  never raw Firebase errors) + Sync Now button; binding for data-action="cloud-sync-now".
- NEW firestore.rules — owner-only: users/{userId} and all subcollections require
  request.auth != null && request.auth.uid == userId; everything else default-deny.
  NOT DEPLOYED (no Firebase CLI auth on this machine) — manual step below.

## Phase 2B — excluded from sync (deliberate)
Workout history/plans/routines, food log, water log, favorite foods, body log, PRs,
achievements, race log, calc inputs, active session, Health Connect state/cache/records,
auth tokens (never stored anywhere), UI state, reminder bookkeeping dates.

## Firebase Console actions REQUIRED (user, manual)
1. Create the Firestore database: Console → Firestore Database → Create database →
   production mode → pick region (then it exists; until then sync shows "Cloud database not
   set up yet").
2. Deploy firestore.rules: Console → Firestore → Rules → paste repo file → Publish.
Both are REQUIRED before sync can succeed on a device.

## Phase 2B — build attempts
1. npx cap sync android + gradlew clean assembleDebug — BUILD SUCCESSFUL in 2m 14s
   (101 tasks; only the 2 pre-existing HealthConnectPlugin warnings; CloudSyncPlugin.kt clean).

## Build result
BUILD SUCCESSFUL. APK: android/app/build/outputs/apk/debug/app-debug.apk.

## Verification classification
Statically verified + build verified ONLY. NOT Firebase-verified (needs the two console
actions), NOT device-tested, NOT multi-device-tested.

## Git commit status / push status
About to commit the 8 Phase 2B files and push feature/firestore-profile-settings-sync.

## Exact next action
1. Commit + push Phase 2B (this step).
2. Phase 2C on feature/cloud-workout-progress-sync. Audit ALREADY DONE:
   - workoutLog: {id:Date.now() number, date, startedAt, finishedAt, durationMin, volume,
     exercises[{name,sets[{weight,reps,done,rpe,type}],...}], notes, title} — stable ids;
     EDITABLE IN PLACE with no timestamp bump → change detection must be content-hash based.
   - routines: {id:Date.now(), name, exercises[]} — stable ids.
   - prs: {id: base36+random string, exerciseName,type,value,previousValue,improvementPct,
     workoutId,achievedAt,weightContext} — stable ids.
   - bodylog: {id:Date.now(), date, weight, sleep, hrv, ...} — stable ids.
   - raceLog: {id:Date.now(), date, totalMs, segments[]} — stable ids.
   - customExercises: {name,cat,presc,unit,muscle} — NO id; name IS the app's natural key →
     use slug(name) as doc id, no local migration needed.
   - completed (plan progress): flat map "week|day|exerciseName" → Date.now(); syncs as a
     section via the 2B doc engine (custom validator), union-merge caveat documented.
   - EXCLUDE: foodLog + waterLog + favoriteFoods (food domain, per spec), achievements
     (derived, recomputable), session/restDuration (device state), HC everything.
   Plan: extend CloudSyncPlugin with listCollection(name, sinceMs)/writeRecords(name, records)
   restricted to an allowlist of subcollection names {workouts,routines,prs,bodylog,races,
   customExercises} under users/{uid}; extend cloud-sync.js with a per-record engine:
   doc = {id, schemaVersion, updatedAt, deleted?, deletedAt?, data:{record}}; per-record
   content hashes in sync state for 3-way logic; tombstone soft-deletes; incremental pull via
   updatedAt > (lastPulledAt - 10min overlap); batched writes; same triggers/_busy guard.
   Then build, commit, push, full 2B+2C final report.

---

## Completed history
- Phase 2A Google Sign-In + Firebase config: commits c1372d5 + 1a0e58d on
  feature/google-signin-auth, pushed, BUILD SUCCESSFUL, default_web_client_id verified
  generated. Real-device sign-in test still pending on user.
- Dark-mode HC card contrast fix: 5649d7b on feature/phase1-stabilization, pushed.
- Phase 1 stabilization: f8a6d79, pushed.
