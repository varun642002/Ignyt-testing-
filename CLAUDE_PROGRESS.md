# CLAUDE_PROGRESS.md

## Current task
Workout experience upgrade (18-task request: typography, Steps fix, active-workout stats
header, set management, swipe-to-delete, rest timer, finish flow, Workout Complete screen,
share cards, native sharing). Implementation complete; gradle build running.
QUEUED NEXT (received mid-task): full Progress page restructure into home + 8 detail views —
will start on its own branch after this task is built/committed/pushed.

## Current branch
feature/workout-experience-upgrade (from feature/cloud-workout-progress-sync tip f20f186).

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
