# IGNYT Project Architecture Analysis

Analysis date: 2026-07-24  
Scope: repository source excluding generated dependencies/build output. This document is descriptive only; no application source was modified.

## 1. Repository and folder structure

```text
/
├─ www/                         # Canonical Capacitor web application (`webDir`)
│  ├─ index.html                # PWA shell, styles/script load order and boot splash
│  ├─ app.js                    # Main state, rendering, storage, calculations and handlers
│  ├─ css/                      # Tokens, base/layout/components/responsive and page styles
│  ├─ js/                       # Extracted page, health, goal, photo, upload and coach modules
│  ├─ auth.js, cloud-sync.js    # Native-auth/cloud wrappers
│  ├─ health-*.js               # Health Connect wrapper/integration
│  ├─ drive-backup.js           # Native Google Drive backup bridge
│  ├─ backup-encryption.js      # Browser WebCrypto encryption
│  ├─ sw.js, manifest.json      # PWA/offline implementation
│  └─ legal/                    # Privacy policy and medical disclaimer
├─ android/                     # Capacitor Android host and Kotlin native plugins
├─ assets/                      # Exercise artwork used by legacy/root source
├─ exercise-image-generator/    # Offline Python/CSV image-mapping utility, not app runtime
├─ tests/                       # Current Playwright framework worktree
├─ Ignyt-testing-/              # A nested, separate test-framework scaffold; not web runtime
├─ ai-workflow/                 # Workflow requests/plans/reports/reference material
├─ *.js, *.css, index.html      # Older root-level, parallel IGNYT implementation
├─ capacitor.config.json         # `appId: com.varun.ignyt`, `webDir: www`
└─ package.json                 # Capacitor and Playwright dependencies
```

### Source-of-truth boundary

`capacitor.config.json` makes `www/` the Android/PWA source of truth. Root `index.html`, `app.js`, `index.js`, `workout.js`, `nutrition.js`, CSS, and related modules are an older parallel implementation. They should not be assumed to ship in the Capacitor app. The duplicated generations are an important maintenance risk.

## 2. Application flow

1. Android launches `MainActivity.java`, which hosts Capacitor and the `www/` web bundle. A web boot splash in `www/index.html` briefly covers startup.
2. `www/index.html` loads CSS, then non-module scripts in dependency order: extracted page/health modules, `app.js`, then Health Connect/auth/cloud/backup integrations.
3. `app.js` creates a singleton in-memory `state` from `LS.get(...)`, runs migrations and onboarding resolution, registers timers/service worker, then calls `render()`.
4. `render()` calls `renderApp()`, replaces `#app`/`#main` HTML according to `state.tab`, then calls `attachHandlers()`. Most UI is therefore a full DOM rebuild per render.
5. User events mutate `state`, persist selected values through the `LS` wrapper/localStorage, and render again. Feature modules expose globals on `window` and receive dependencies from `app.js` rather than using ES imports.
6. Native-only operations are called through `window.Capacitor.Plugins.*`. Browser paths return failure/fallback states rather than performing native work.

## 3. Navigation flow

The top-level tab state is `state.tab`, persisted as `hx_tab`. Main destinations are:

| Entry | Route/state | Notes |
|---|---|---|
| Bottom navigation | `home`, `workout`, `progress`, `tools`, `profile` | Always rendered by `renderApp()` |
| Tools cards | `plan`, `library`, `goals`, `body`, `healthhub`, `health`, `uploads`, `nutrition`, `insights`, `settings` | `data-nav` cards; acts as the secondary navigation hub |
| Detail state | `bodyView`, `progressView`, `viewingSessionId`, `viewingExerciseDetail`, `viewingHyroxSchedule`, `viewingRaceMode`, etc. | Rendered as conditional subviews, generally with a back action |
| Module routes | `bloodwork`, `goals`, `uploads`, `healthhub` | Delegated to `window.IgnytBloodwork`, `IgnytGoals`, `IgnytHealthUploads`, `IgnytHealthDashboard` |

Navigation is event delegation/handler attachment over `data-nav`, `data-action`, and feature data attributes. It is not URL/router based; browser back/forward has no stated route synchronization.

## 4. Data flow

```text
UI event -> app/module handler -> in-memory state or feature-local model
        -> localStorage / IndexedDB -> render() -> rebuilt DOM
        -> optional native bridge or cloud/Drive synchronization
```

- Workout, nutrition, profile, routines, calculations, settings, progress, goals and most health metadata are JSON documents in localStorage.
- Body photographs and health-file blobs use IndexedDB; localStorage holds metadata/records.
- `HealthConnectIntegration` can import cached native data and export locally created workouts/weights on Android.
- `IgnytCloudSync` maps a subset of local keys into Firestore documents/collections through a native plugin.
- `IgnytDriveBackup` serializes a full backup, optionally encrypts it through `IgnytBackupCrypto`, then sends it through the Android Drive bridge.

## 5. LocalStorage usage

The primary `LS` wrapper in `www/app.js` JSON-parses/serializes values and is the main persistence boundary. Identified keys are:

| Domain | Keys |
|---|---|
| Core/profile | `hx_schema_version`, `hx_profile`, `hx_settings`, `hx_tab`, `hx_last_id`, `hx_onboarding_complete`, `hx_onboarding_wizard` |
| Workout/plan | `hx_workout_log`, `hx_active_session`, `hx_routines`, `hx_custom_exercises`, `hx_saved_exercises`, `hx_completed`, `hx_active_week`, `hx_active_level`, `hx_rest_duration`, `hx_prs`, `hx_race_log`, `hx_race_active` |
| Nutrition/body | `hx_nutrition`, `hx_food_log`, `hx_water_log`, `hx_bodylog`, `hx_favorite_foods`, `hx_favorite_exercises` |
| Progress | `hx_achievements`, `hx_habits`, `hx_habit_completions`, `hx_calc`, `hx_calc_history` |
| Import/migration bookkeeping | `hx_recent_commits`, `hx_rest_default_migrated_v1`, `hx_workout_dedupe_v1`, `hx_workout_dedupe_removed_v1`, `hx_workout_dedupe_notified_v1`, `hx_swipe_hint_seen` |
| Health/native cache | `hx_hc_state`, `hx_hc_dashboard_cache`, `hx_hc_insights_cache`, `hx_hc_exported_ids`, `hx_health_uploads`, `hx_health_records`, `hx_blood_reports` |
| Account/cloud/backup | `hx_auth_account`, `hx_cloud_sync_state`, `hx_drive_backup_state`, `hx_goals`, `hx_active_goal` |

`ALL_DATA_KEYS` in `app.js` defines the core backup/reset set. Feature modules own additional keys, so backup/reset completeness must be audited whenever a module adds data.

## 6. IndexedDB usage

| Module | Database/store role | Data |
|---|---|---|
| `js/body-photos-db.js` | `ignyt-body-photos` | Full body-photo blobs, generated thumbnails, metadata keyed by photo id |
| `js/health-uploads.js` | Health-upload blob database | Original medical-report image/PDF blobs; metadata remains in localStorage |
| `js/health/health-db.js` | Shared, versioned health blob database | Lazy-created named buckets for health-file/photo consumers |

These modules generally catch IndexedDB failure and surface an unavailable/empty state. `health-security.js` currently passes through to browser storage; it does not encrypt data or provide an app lock.

## 7. Service worker and offline behavior

`www/sw.js` uses cache name `ignyt-v75`.

- Install precaches the application shell, page CSS/JS, selected health modules, image, legal pages, Drive encryption/backup code and manifest/icons.
- Activate deletes old named caches and claims clients.
- Network-first applies to navigations, `index.html`, `app.js`, Health Connect integration/CSS and `css/`/`js/pages/` paths; cached shell is the fallback.
- Other requests are cache-first, then network.

The root `sw.js` is a separate legacy service worker and is not the Capacitor web bundle’s worker.

## 8. HTML and CSS inventory

### HTML

- `www/index.html`: production application shell and all runtime resource links.
- `www/legal/privacy-policy.html`, `www/legal/medical-disclaimer.html`: static legal pages.
- Root `index.html`: legacy app shell; not canonical for Capacitor.

### Production CSS (`www/css`)

- `tokens.css`: design tokens and themes.
- `base.css`, `layout.css`, `components.css`, `responsive.css`: shared foundation.
- `pages/home.css`, `workout.css`, `nutrition.css`, `progress.css`, `tools.css`, `profile.css`, `ai-coach.css`, `dark-mode.css`: route-specific presentation.
- `health-connect.css`: Health Connect UI styles.

Root `styles.css`, `components.css`, `responsive.css`, `utilities.css`, and `css/components.css` belong to the older parallel UI and should be treated as legacy until a build path proves otherwise.

## 9. JavaScript module inventory and reusable APIs

### Production runtime modules

| Module | Responsibility and reusable API/family |
|---|---|
| `www/app.js` | Application state, `LS`, migrations, backup/import/export, timers, workouts, nutrition, calculators, charts, renderers, event binding and service-worker registration. Key reusable helpers include `escHtml`, `csvEscape`, `debounce`, `formatDuration`, `todayStr`, `computeSessionVolume`, `detectPRs`, `profileMaintenance`, `calcBMR`, `calcMacros`, `render`, `renderApp`, `render*Tab`, `confirmDialog`, `showToast`, `attachHandlers`. |
| `www/js/pages/home.js` | `window.IgnytHome.render(...)`: home/dashboard adapter using dependencies supplied by `app.js`. |
| `www/js/pages/workout.js` | `window.IgnytWorkoutPage.render(...)`: workout-list/dashboard adapter. Active session remains in `app.js`. |
| `www/js/pages/progress.js` | `window.IgnytProgressPage.render(...)`: progress dashboard adapter; detail views remain in `app.js`. |
| `www/js/goals.js` | `window.IgnytGoals`: goal CRUD, activation, progress/recommendation calculations, render/attach. |
| `www/js/ai-coach.js` | `window.IgnytAiCoach`: deterministic, rule-based recommendations based on actual stored data. |
| `www/js/body-photos-db.js` | `window.IgnytBodyPhotosDB`: async `addPhoto`, `getAllMeta`, `getBlob`, `deletePhoto` and thumbnail storage. |
| `www/js/bloodwork.js` | `window.IgnytBloodwork`: blood report import/review/save/export, trends and educational insights. |
| `www/js/health-uploads.js` | `window.IgnytHealthUploads`: report upload, preview, category/review, metadata/blob management, render/attach. |
| `www/js/health/health-db.js` | `window.IgnytHealthDB`: shared async bucket/blob `put/get/delete` abstraction. |
| `www/js/health/health-models.js` | `window.IgnytHealthModels`: central Health Hub feature catalog and reuse/stub metadata. |
| `www/js/health/health-dashboard.js` | `window.IgnytHealthDashboard.render/attach`: Health Hub entry/dashboard. |
| `www/js/health/health-stub.js` | Honest unavailable-future-feature detail renderer. |
| `www/js/health/health-security.js` | `window.SecureStorage` and `window.AppLock` placeholders; current pass-through interfaces. |
| `www/js/health/body-scan-ai.js` | `window.IgnytBodyScanAI`: explicitly unavailable placeholder API; no model is implemented. |
| `www/health-connect.js` | `window.HealthConnect`: safe wrapper for native availability, permissions, read/sync, exercise/weight write, insights and disconnect. |
| `www/health-settings-integration.js` | `window.HealthConnectIntegration`: state/cache operations, Android export hooks, settings/dashboard integration via `MutationObserver`. |
| `www/auth.js` | `window.IgnytAuth`: native Google-sign-in/Firebase-account wrapper and local account cache. |
| `www/cloud-sync.js` | `window.IgnytCloudSync`: account-scoped Firestore backup/multi-device sync via native plugin. |
| `www/backup-encryption.js` | `window.IgnytBackupCrypto`: PBKDF2-SHA256 (250,000 iterations) and AES-256-GCM encrypt/decrypt payloads. |
| `www/drive-backup.js` | `window.IgnytDriveBackup`: Drive connect, backup, restore, scheduling and encrypted-payload coordination. |
| `www/sw.js` | Service worker install/activate/fetch strategy. |

### Main `app.js` reusable function families

The file contains several hundred functions. The authoritative exhaustive list is the declarations in `www/app.js`; the reusable families are:

- Storage and migration: `LS.get/set`, `persist`, `runMigrations`, `resolveOnboardingStatus`, `buildFullBackupPayload`, `validateBackupPayload`, `applyBackupPayload`, CSV validators/importers/exporters.
- Timers: `ensureRaceTimerRunning`, `startTimer`, `tickRestTimer`, hold-timer functions, `formatTime`, `formatDuration`, vibration/beep helpers.
- Workout domain: exercise lookup/parser helpers, plan generation, PR detection, set/session summary and volume functions, history/streak/activity computations, routine editor/reordering functions.
- Health/nutrition/profile domain: BMR/LBM/BMI/body-fat/heart-rate/macro calculators, water/food/trend/target calculations, adaptive recommendation functions.
- Presentation: chart builders (`sparklineChart`, `axisAreaChart`, bars/radar/calendar), renderer functions for every tab/detail view, picker/sheet/dialog/toast components.
- UI wiring: `render`, `renderApp`, `attachHandlers`, onboarding wiring, swipe/drag support, theme application and navigation helpers.

### Non-runtime/legacy JavaScript

- Root `app.js`, `index.js`, `dashboard.js`, `workout.js`, `nutrition.js`, `settings.js`, `storage.js`, `ui.js`, `forms.js`, `tables.js`, `charts.js`, `charts-ui.js`, `dialogs.js`, `modals.js`, `navigation.js`, `timer.js`, `toast.js`, `utils.js`, `constants.js`, and root `sw.js` are the legacy implementation.
- `exercise-image-generator/*.py` are offline inspection/matching/generation tools, not application runtime.
- `tests/` and nested `Ignyt-testing-/tests/` are automation support, not product modules.

## 10. Native Android architecture

`android/app/src/main/java/com/varun/ignyt/` provides Capacitor plugins:

- `healthconnect/HealthConnectPlugin.kt` and `HealthConnectManager.kt`: Android Health Connect integration.
- `auth/AuthPlugin.kt`: native auth bridge.
- `cloudsync/CloudSyncPlugin.kt`: cloud synchronization bridge.
- `drivebackup/DriveBackupPlugin.kt`, `DriveRestClient.kt`, scheduling/receiver classes: Drive backup.
- `notify/*`: reminder scheduling and notifications.
- `share/SharePlugin.kt`: native sharing.
- `MainActivity.java`: Capacitor activity entry point.

Real permissions, Health Connect records, Google sign-in, scheduled notifications, Drive backup and native lifecycle require Android-device verification; the browser application cannot prove them.

## 11. Missing documentation

1. No single architecture document maps the canonical `www/` source, root legacy source, and native Android layer.
2. No storage schema/version document describes every `hx_*` key, owner, JSON shape, retention, backup inclusion, or migration policy.
3. No route/state diagram documents tabs and the many conditional detail states.
4. No API contract documents native Capacitor plugin method names, permissions, errors, and web fallbacks.
5. No service-worker release/cache-version procedure exists.
6. No documented cloud/Firebase deployment, authentication, encryption-key/passphrase recovery, or restore conflict policy was found.
7. No accessibility conformance target, keyboard specification, or automated accessibility baseline is documented.
8. No clear ownership/retirement plan exists for the root legacy app or nested test scaffold.

## 12. Technical debt and maintainability issues

- `www/app.js` is a very large global-script file that owns state, business logic, HTML templates, styles-in-strings, event binding and integration orchestration. This makes regression isolation difficult.
- Every `render()` rebuilds the app DOM and reattaches handlers. It is simple but increases rendering cost and can lose focus/scroll/input state unless specially handled.
- Global `window.*` module contracts and ordered non-module scripts have hidden dependencies that static tooling cannot enforce.
- Production and legacy duplicate source trees create ambiguity, duplicated fixes and potential deployment mistakes.
- Multiple storage ownership models (`LS`, direct `localStorage`, feature modules) make migrations/backups/reset semantics harder to reason about.
- Inline styles/templates are widespread, limiting style reuse and visual review.
- Existing Playwright work is still new/uncommitted and separate from the nested test scaffold; one supported framework should be selected and documented.

## 13. Bugs and correctness risks discovered by inspection

These are source-observed risks, not claims of reproduced production incidents.

1. The service worker precache list omits runtime scripts such as `auth.js`, `cloud-sync.js`, `health-connect.js`, and `health-settings-integration.js`. Some are network-first but not precached, so a first offline launch or cleared cache can lack them.
2. The root and `www/` applications can diverge. Editing the root files will not affect the configured Capacitor app; editing only `www/` may leave legacy browser usage stale.
3. The project contains an explicitly unimplemented Body Scan AI interface and security placeholders. Any UI that exposes them must continue to present unavailable status rather than imply an implemented capability.
4. `app.js` full DOM replacement is known to be capable of destroying focused inputs. The code contains a specialized stable exercise-picker-results update, indicating this class of defect has occurred and remains a general regression risk elsewhere.
5. Date-based calculations need careful local-time handling. The code has a dedicated `habitDateStr()` to avoid UTC/local date drift, while older date utilities remain elsewhere; consistency should be audited before changing historical calculations.

## 14. Security and privacy issues

1. Health, workout and profile data are stored in browser localStorage/IndexedDB. `health-security.js` explicitly says encryption and app lock are not enforced. Device compromise, shared-device access or webview debugging can expose sensitive data.
2. User-controlled/imported data is rendered through extensive `innerHTML` templating. Escaping helpers exist (`escHtml`, module-local `esc`), but a complete sink-by-sink audit is needed to ensure every interpolated field is escaped and URL/image values are constrained.
3. Client-side Firebase/Drive/native bridge code needs a security review of authorization, Firestore rules, token lifecycle, backup sharing and restore validation. `firestore.rules` exists, but it is not a substitute for deployed-rule verification.
4. Backups can be encrypted with a user passphrase using AES-GCM/PBKDF2, which is a positive design; the passphrase is intentionally unrecoverable. UX must communicate loss/recovery consequences clearly.
5. `android/app/google-services.json` is tracked. Firebase client configuration is normally public, but repository access and Firebase API restrictions should still be reviewed; no secrets should be inferred or published from it.

## 15. Performance issues

- Full `#app` re-rendering and repeated listener attachment increase work as screen complexity/data volume grows.
- Several views compute histories, trends, charts, achievements and aggregates synchronously from localStorage arrays; large workout/food/photo histories may cause noticeable UI pauses.
- SVG/chart HTML and large exercise lists are assembled as strings; list virtualization/pagination is not evident.
- Photos are sensibly blob-backed and thumbnails are generated/lazily fetched, reducing one major memory risk.
- The service worker uses `caches.addAll`; a single failed precache request can make install fail. Versioning is manual (`ignyt-v75`).

## 16. Accessibility issues

- Semantic buttons and some `aria-label` attributes are present, but extensive HTML-string construction makes consistency difficult to guarantee.
- Icon-only controls must be audited for an accessible name, focus visibility and minimum touch target on all routes.
- Modal, picker, drawer, timer and lightbox behavior needs formal focus trapping, focus restore, Escape handling and screen-reader announcement verification.
- Chart SVGs and color-coded progress/health states need text alternatives and non-color cues.
- Dark/light token contrast, dynamic toast/error messages, drag/reorder controls and mobile navigation require automated and manual keyboard/screen-reader testing.

## 17. Recommended improvement roadmap

1. Declare `www/` as the only production web source in README/CI and archive or clearly label the root legacy tree after a controlled migration decision.
2. Break `app.js` into ES modules around state/storage, domain services, render components and event controllers; introduce explicit contracts rather than global script order.
3. Define a versioned storage schema registry with key owner, JSON shape, migrations, backup/reset inclusion and privacy classification.
4. Add a service-worker manifest-generation/revision process and test fresh-offline installation as well as upgrade behavior.
5. Enforce health-data protections: Android Keystore-backed encryption, optional biometric/PIN app lock, secure backup/export UX, and documented threat model.
6. Establish a CSP-compatible escaping/sanitization strategy and audit every `innerHTML`, URL and file-preview sink.
7. Reduce full-render churn with targeted component updates for text entry, long lists and timers; profile large data scenarios.
8. Consolidate automation into one supported Playwright framework, add deterministic fixtures, and run browser tests independently in CI. Keep native verification as a separate device matrix.
9. Add automated accessibility scanning plus manual keyboard, TalkBack/VoiceOver and contrast review to release criteria.
10. Document native plugin contracts, permission boundaries and Firebase/Drive operational procedures before broad release.
