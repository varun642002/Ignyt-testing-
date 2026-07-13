# CLAUDE_PROGRESS.md

## Current task
Phase 2C: cloud backup + multi-device sync for workout/progress data. Implementation
complete; gradle build running. (Phase 2B was completed, committed de1c3ec, and pushed on
feature/firestore-profile-settings-sync earlier this session.)

## Current branch
feature/cloud-workout-progress-sync (from feature/firestore-profile-settings-sync tip de1c3ec).

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
