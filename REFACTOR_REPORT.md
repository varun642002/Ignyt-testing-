# IGNYT Refactor Report

Date: 2026-07-24

## Scope and safety boundary

This was a conservative, behavior-preserving refactor of the canonical production web bundle (`www/`). It does not alter the UI, storage keys, stored JSON shapes, navigation, native bridge contracts, or available features. The root-level legacy application was intentionally left untouched because `capacitor.config.json` specifies `www/` as the deployed web directory.

## Changes made

### 1. Consolidated repeated JSON localStorage code

Added `www/js/storage-utils.js`, loaded before feature modules. It exposes:

- `IgnytStorageUtils.readJson(key, fallback)`
- `IgnytStorageUtils.readArray(key)`
- `IgnytStorageUtils.writeJson(key, value)`

The helper preserves the previous behavior: malformed/missing JSON returns the existing fallback; failed writes remain non-fatal. The following modules now use it rather than repeating local `try`/`JSON.parse`/`localStorage` helpers:

- `www/js/goals.js`
- `www/js/bloodwork.js`
- `www/js/health-uploads.js`

No localStorage key was renamed, removed, or migrated.

### 2. Consolidated duplicate Health Hub HTML escaping

Added `www/js/health/health-utils.js`, loaded before the Health Hub dashboard and stub modules. It exposes `IgnytHealthUtils.escapeHtml(value)`.

`www/js/health/health-dashboard.js` and `www/js/health/health-stub.js` now share that one implementation instead of maintaining identical `esc` functions. Rendered output is unchanged; this reduces the chance of an escaping fix reaching one module but not the other.

### 3. Preserved offline behavior for the added modules

`www/sw.js` now precaches the two shared runtime modules. This keeps the new script dependencies available under the existing offline strategy.

### 4. Readability improvements

- Added concise file-level comments explaining the role and boundary of each new shared utility.
- Replaced vague local parameter names in the touched storage wrappers with `goals`, `metadata`, and `records`.

## Intentionally not changed

- No UI markup, labels, styles, routes, feature flags, data models, localStorage keys, IndexedDB stores, Android/Kotlin code, Firebase/Drive/Health Connect integration, or service-worker strategy was redesigned.
- No code was deleted merely because it appeared unused. `PROJECT_ANALYSIS.md` identifies duplicate legacy/root sources and placeholders, but removing either safely requires a build/deployment audit and feature-level regression evidence.
- The large `www/app.js` renderer was not split in this increment. Its global script ordering and full-DOM render model make a broad extraction a higher-risk change that should be performed in separately verified phases.

## Verification performed

- `node --check` passed for all changed/new JavaScript modules:
  - `www/js/storage-utils.js`
  - `www/js/health/health-utils.js`
  - `www/js/goals.js`
  - `www/js/bloodwork.js`
  - `www/js/health-uploads.js`
  - `www/js/health/health-dashboard.js`
  - `www/js/health/health-stub.js`
  - `www/sw.js`
- `npm run test -- --list` successfully discovered 95 project-expanded Playwright tests in 9 spec files.
- `git diff --check` passed.

This is static/framework verification only. Full independent browser regression testing and real Android-device validation remain required before any release claim.
