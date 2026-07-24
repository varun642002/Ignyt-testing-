# Architecture

## Runtime layers

```text
www/index.html
  -> ordered global browser scripts
  -> www/app.js state + renderer + event binding
  -> localStorage / IndexedDB / service worker
  -> optional window.Capacitor native plugins
  -> Android Kotlin implementations
```

`capacitor.config.json` configures `www/` as the production web directory. The root-level legacy application is not the Capacitor source of truth.

## Web application

`www/index.html` loads shared CSS from `www/css/`, page styles, health styles, then browser scripts. Scripts are intentionally non-module and order-dependent.

`www/app.js` is the application core. It owns the global `state`, migrations, backup/import/export, calculations, most render functions, tab routing, timers, and `attachHandlers()`. `render()` replaces the active DOM then binds handlers.

Extracted modules attach documented globals to `window`:

| Area | Runtime modules |
|---|---|
| Page adapters | `js/pages/home.js`, `workout.js`, `progress.js` |
| Data/features | `js/goals.js`, `js/ai-coach.js`, `js/bloodwork.js`, `js/body-photos-db.js`, `js/health-uploads.js` |
| Health Hub | `js/health/health-models.js`, `health-dashboard.js`, `health-db.js`, `health-security.js`, `health-stub.js`, `body-scan-ai.js` |
| Shared utilities | `js/storage-utils.js`, `js/health/health-utils.js` |
| Native/browser bridges | `health-connect.js`, `health-settings-integration.js`, `auth.js`, `cloud-sync.js`, `drive-backup.js`, `backup-encryption.js` |

## Navigation

`state.tab` is the primary route state and is persisted as `hx_tab`. Bottom navigation provides Home, Workout, Progress, Tools, and Profile. Tools links to Plan, Library, Goals, Body, Health Connect, Uploads, Nutrition, Insights, and Settings. (Health Hub's route/code is still in the repo but disconnected from navigation for this release.) Conditional state values such as `progressView`, `bodyView`, `viewingSessionId`, and `viewingExerciseDetail` select detail screens.

Navigation is state/event based (`data-nav` and handlers), not URL-router based.

## Data and offline storage

- localStorage holds profile, workout, nutrition, settings, routine, goal, progress, account/cache, and metadata JSON under `hx_*` keys.
- IndexedDB holds binary body photos and health-upload blobs; metadata remains in localStorage.
- `www/sw.js` precaches the app shell and uses network-first behavior for shell/page assets, with cached fallback; other assets are cache-first.
- Browser storage is local to the current browser/device. Health and workout data are not end-to-end encrypted at rest by the current Health Hub security placeholder.

## Native Android layer

`android/` is the Capacitor host. Kotlin/Java plugins cover Health Connect, Google/Firebase authentication, cloud sync, Drive backup, notifications, and sharing. The Android app requires Java 21 and includes Health Connect client version `1.1.0`.

## Data synchronization

`IgnytAuth` establishes account identity. `IgnytCloudSync` uses the native bridge for selected Firestore profile/settings and record synchronization. `IgnytDriveBackup` creates/restores backups and can use `IgnytBackupCrypto` (PBKDF2 + AES-GCM) with a user-supplied passphrase. These paths require valid Android/Firebase/Google configuration and device verification.

## Constraints

- Preserve persistent key names and data shapes, or ship a backward-compatible migration.
- Do not represent a browser fallback as native feature verification.
- New scripts must be added in `www/index.html` in dependency order and, when needed offline, to `www/sw.js`.
