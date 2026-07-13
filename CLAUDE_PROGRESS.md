# CLAUDE_PROGRESS.md

## Current feature request
Phase 2A: Google Sign-In and user account foundation. "Continue with Google", persistent
session restored across app restarts, signed-in account UI (photo/name/email/status/sign out),
graceful offline behavior, app fully usable signed out. NO cloud sync yet, NO AI coach, no
redesign, no localStorage resets, Health Connect untouched.

## Current branch
feature/google-signin-auth (created from feature/phase1-stabilization tip 5649d7b, which
includes Phase 1 stabilization + the dark-mode card contrast fix — both unmerged to main).

## Architecture selected (and why)
Hand-rolled Capacitor plugin `IgnytAuth` (AuthPlugin.kt) mirroring the project's proven
HealthConnectPlugin pattern, built on:
- **Firebase Authentication** (native Android SDK, BOM 33.7.0) — persistent session storage,
  offline session restore, future-proof identity for later cloud-sync phases.
- **androidx Credential Manager 1.3.0 + googleid 1.1.1** — the current, non-deprecated Google
  Sign-In API (legacy GoogleSignIn API is deprecated).
Why not @capacitor-firebase/authentication (Capawesome): repo has zero third-party Capacitor
plugins today; a hand-rolled plugin guarantees the "never rejects / never crashes" contract
even with NO google-services.json present (which is this repo's current state — the plugin
lazily checks FirebaseApp initialization and the default_web_client_id resource at runtime and
returns a clean error instead of throwing at startup).
Version pinning rationale: project pins kotlin_version 1.9.24; newer androidx.credentials
(1.5+/1.6) and Firebase BOM 34.x ship Kotlin 2.x metadata that the 1.9 compiler cannot read.
firebase-bom 33.7.0 / credentials 1.3.0 / googleid 1.1.1 is the Firebase-docs-blessed Kotlin
1.9-era set. Verified all versions exist on Google Maven before use.
No changes to: Capacitor 8.4.1, Health Connect 1.1.0, minSdk 26, compileSdk 36, targetSdk 36,
AGP 8.13.0, Gradle 8.14.3, Java/Kotlin target 21, package com.varun.ignyt.

## Completed work
1. NEW android/app/src/main/java/com/varun/ignyt/auth/AuthPlugin.kt — methods: isConfigured,
   getCurrentUser (offline session restore), signIn (Credential Manager → Google ID token →
   Firebase session; token never logged/stored/returned to JS), signOut (Firebase signOut +
   clearCredentialState). Every method resolves {success, data|error}; SupervisorJob +
   CoroutineExceptionHandler; per-exception-type user-readable errors (cancelled, no Google
   account, Play Services unavailable, interrupted, 30s timeout on the network exchange only).
2. MOD MainActivity.java — registerPlugin(AuthPlugin.class).
3. MOD android/app/build.gradle — firebase-bom 33.7.0, firebase-auth, credentials 1.3.0,
   credentials-play-services-auth 1.3.0, googleid 1.1.1, kotlinx-coroutines-play-services 1.7.3.
   The template's existing conditional google-services apply (only when google-services.json
   exists) was already present — build stays green without the file.
4. NEW www/auth.js — IgnytAuth JS module (same dual-env pattern as health-connect.js): cached
   account snapshot in NEW localStorage key hx_auth_account (uid/name/email/photo only — never
   tokens), busy/error state, signIn/signOut, one reconciliation pass per launch
   (refreshFromNative — no polling/retry loops), re-renders Settings when visible.
5. MOD www/index.html — <script src="auth.js"> added after existing scripts.
6. MOD www/app.js — renderAccountSection() (signed-out: "IGNYT Account" pitch + Continue with
   Google; signed-in: initials-fallback avatar + photo, name, email, status, Sign Out; web
   build: "available in Android app" note; HTML-escapes all Google-supplied strings) inserted
   at top of renderSettingsTab; click bindings for account-signin/account-signout.

## Data safety
No existing hx_* key read, written, renamed, or migrated. Only NEW key: hx_auth_account.
Google identity kept fully separate from fitness profile (hx_profile). Nothing auto-uploads.

## Pending work
- Gradle build verification (in progress).
- Commit + push after BUILD SUCCESSFUL.
- User-side setup (cannot be done from this machine): Firebase Console project with Android
  app com.varun.ignyt + SHA-1/SHA-256 fingerprints, download google-services.json into
  android/app/, enable Google provider in Firebase Auth. Sign-in cleanly reports "not
  configured" until then.

## Files changed
- android/app/src/main/java/com/varun/ignyt/auth/AuthPlugin.kt (NEW)
- android/app/src/main/java/com/varun/ignyt/MainActivity.java
- android/app/build.gradle
- www/auth.js (NEW)
- www/index.html
- www/app.js
- CLAUDE_PROGRESS.md

## Dependencies added
firebase-bom:33.7.0 (→ firebase-auth 23.1.0), androidx.credentials:credentials:1.3.0,
androidx.credentials:credentials-play-services-auth:1.3.0, googleid:1.1.1,
kotlinx-coroutines-play-services:1.7.3. No npm dependencies added.

## Firebase configuration status
CONFIGURED by user (2026-07-13): Firebase project created, Android app com.varun.ignyt
registered, debug SHA-1 + SHA-256 added, Google provider enabled, google-services.json placed
at android/app/google-services.json. File validated (without printing secrets): project_id
present, client for com.varun.ignyt found, 1 web OAuth client (type 3 → generates
default_web_client_id consumed by AuthPlugin), 1 Android OAuth client (type 1, SHA-backed),
api_key present. It is public client config (no private keys) and android/.gitignore's
google-services.json line is commented out (trackable by design) — being committed.

## Google Sign-In configuration status
Code complete (commit c1372d5) + Firebase config now present. Rebuilding so the conditional
google-services gradle plugin activates and generates default_web_client_id. No code changes
required — AuthPlugin looks the resource up dynamically at runtime.

## Build attempts
1. `npx cap sync android` — succeeded.
2. `cd android; .\gradlew.bat clean assembleDebug` (pre-Firebase-config) — **BUILD SUCCESSFUL
   in 2m 36s** (100 tasks). No new compiler warnings from AuthPlugin.kt.
3. After user added google-services.json: `npx cap sync android` + clean assembleDebug —
   **BUILD SUCCESSFUL in 1m** (101 tasks — :app:processDebugGoogleServices now runs).
   Verified default_web_client_id was generated into
   app/build/generated/res/processDebugGoogleServices/values/values.xml.

## Build result
BUILD SUCCESSFUL with Firebase config active. APK at
android/app/build/outputs/apk/debug/app-debug.apk.

## Errors encountered
None yet this task.

## Fixes applied
None needed yet.

## Git commit status
Not committed (waiting for BUILD SUCCESSFUL).

## Git push status
Not pushed.

## Exact next action
Commit android/app/google-services.json + this file, push feature/google-signin-auth, final
report. Everything after that is REAL-DEVICE TESTING by the user (sign-in flow, session
restore after restart, offline behavior, cancel flow, sign out) — code is build-verified only.

---

## Previous completed tasks — history
- Dark-mode Health Connect card contrast fix: root cause was native <button> not inheriting
  color (UA ButtonText black); fixed with .hc-home-card{color:var(--text);font-family:inherit}
  in www/health-connect.css. Commit 5649d7b on feature/phase1-stabilization, pushed, BUILD
  SUCCESSFUL.
- Phase 1 stabilization: committed f8a6d79, pushed. Fixed HC native crash risk, manifest
  <queries>, Insights honesty (No data vs Permission required; Week/Month/Year), tap targets,
  sw offline fallback, 0-kcal food entries, dead CSS. Root-level app.js/index.html are a
  separate GitHub Pages PWA — out of scope; Android app uses www/.
