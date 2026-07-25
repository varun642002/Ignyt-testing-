# Bug Fix Summary — Production Stabilization Sprint

Branch: `feature/production-stabilization-sprint` @ `0e7c237`

## Issues fixed (10/11)
1. Start Workout button — `querySelector` only bound the first of 2-3 identical buttons; switched to `querySelectorAll`.
2. Favourites button — no click handler existed for `data-workout-filter`; added one.
3. Workout category chips (Push/Pull/Legs/Upper/Lower) — same missing handler as #2, fixed together.
4. Health Hub — removed its Tools-tab entry point; code/routes retained in repo, untouched.
5. Default body weight — `101` → `0` for new users; existing users unaffected (saved value always wins).
6. Privacy Policy back nav — was a real `<a target="_blank">` navigation with nowhere for back to go; converted to an in-app overlay.
7. Medical Disclaimer back nav — same fix as #6.
8. Body Progress image viewer back nav — closed via the new global back handler.
9. Global Android back button — added `@capacitor/app` + `handleHardwareBack()`, a single dispatcher that closes the topmost open overlay (dialogs, sheets, exercise picker, notifications panel, Hyrox views, legal viewer, image viewer, timer) instead of exiting the app.
10. Workout number readability — KG/REPS/RPE inputs, set numbers, workout timer, rest timer font sizes increased.
11. Medical Records export (Android) — `exportFile()` used the same blob-URL `<a download>` trick already known (per app.js's own `downloadFile()` comment) to silently no-op in the native WebView. Added `IgnytShare.shareFile` (Kotlin) and wired native Android to it.

## Not fixed
- Medical Records **rename** — investigated end-to-end (click handler, `window.prompt`, persistence, Capacitor's `onJsPrompt` support). No defect found; verified working in testing.

## Files modified
`www/app.js`, `www/index.html`, `www/css/pages/workout.css`, `www/js/health-uploads.js`, `www/sw.js`, `android/app/src/main/java/com/varun/ignyt/share/SharePlugin.kt`, `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, `package.json`/`package-lock.json` (`@capacitor/app` added), `ARCHITECTURE.md`, `tests/regression/stabilization-sprint.spec.js`

## Tests added
`tests/regression/stabilization-sprint.spec.js` — 9 tests (Start Workout, filter chips, Health Hub unreachable, weight=0, Privacy/Disclaimer overlay + close, hardware-back closes topmost overlay, hardware-back closes image viewer, no console errors).

## Build status
- `node --check`: pass (app.js, health-uploads.js, sw.js)
- Playwright (chromium): 53/55 pass, 1 pre-existing unrelated failure (`ai-coach` route, stale before this sprint), 1 intentionally-skipped visual baseline
- `npx cap sync android`: pass, `@capacitor/app@8.1.1` registered
- `gradlew assembleDebug`: **BUILD SUCCESSFUL**

## Remaining known issues
- Medical Records rename (see above).
- Pre-existing stale `ai-coach` regression test (unrelated to this sprint).
