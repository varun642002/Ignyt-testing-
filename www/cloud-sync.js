/* =========================================================
   IGNYT CLOUD SYNC — offline-first Firestore backup + multi-device
   sync for signed-in users.

   Phase 2B: fitness profile, nutrition targets, app settings — synced
   as sections of the single doc users/{uid}.
   Phase 2C: per-record collections under users/{uid}/:
     workouts/{id}         <- hx_workout_log   (stable id = Date.now() at creation)
     routines/{id}         <- hx_routines      (stable id)
     prs/{id}              <- hx_prs           (stable random string id)
     bodylog/{id}          <- hx_bodylog       (stable id)  [weight/progress history]
     races/{id}            <- hx_race_log      (stable id)
     customExercises/{id}  <- hx_custom_exercises (no local id; the app's natural key is
                              the exercise NAME -> docId = encodeURIComponent(lowercased
                              name). No local migration needed or performed.)
   Plus a planProgress section in users/{uid} (completed map + activeWeek/activeLevel)
   with a per-key union merge for the completed map.

   DELIBERATELY NOT SYNCED: food log, water log, favorite foods (food domain — later
   phase), achievements (derived, recomputable), active session / rest duration / UI
   state (device-local), ALL Health Connect data/state/cache, auth tokens (never stored
   anywhere by IGNYT).

   RECORD SYNC POLICY (3-way, per record, using content hashes of the last-synced
   version kept in hx_cloud_sync_state, keyed to the uid):
     - cloud record unknown locally, never seen before -> insert locally (Case B/D-merge)
     - local record not in cloud -> upload (Case A); identical content -> no-op (Case C)
     - only cloud changed since last sync -> adopt cloud version
     - only local changed -> push local
     - BOTH changed (or first sync with same id but different content) -> LOCAL WINS and
       is pushed; the device in hand shows what the user believes is true. Documented
       trade-off: no unresolved-conflict UI in this phase.
   DELETIONS: tombstones. A record deleted locally (its id is in our synced-hash map but
   gone from the local array) is written as {deleted:true, deletedAt} — never removed
   from Firestore. Other devices remove their local copy when they pull the tombstone,
   and the tombstone persists forever so an old offline device can never resurrect the
   record. Tombstoned ids are marked "T" locally and never re-pushed or re-adopted.
   Edit-vs-delete race: the tombstone wins; documented limitation.

   Malformed/unvalidated records (local or cloud) are skipped for sync but NEVER removed
   from local storage. Records over ~300KB serialized are kept local-only (Firestore's
   1MB doc limit) and logged.

   INCREMENTAL PULL: one query per category per sync — updatedAt > (lastPulledAt - 10min
   overlap window for device clock skew). lastPulledAt only advances on server-confirmed
   (non-cache) reads. No full-database rereads after the first sync.

   OFFLINE + TRIGGERS: unchanged from Phase 2B — Firestore disk cache + durable write
   queue, no retry loops, triggers are sign-in/session-restore (auth event), foreground
   resume (>=5 min), ONE 90s change-watcher interval (visible tab only), manual Sync Now.
   A single _busy guard means there is never more than one sync in flight.
========================================================= */

const IgnytCloudSync = (() => {

  const SYNC_STATE_KEY = "hx_cloud_sync_state";
  const CLOUD_SCHEMA_VERSION = 1;
  const FOREGROUND_MIN_INTERVAL_MS = 5 * 60 * 1000;
  const WATCHER_INTERVAL_MS = 90 * 1000;
  const PULL_OVERLAP_MS = 10 * 60 * 1000;
  const MAX_RECORD_BYTES = 300000;
  const TOMBSTONE = "T";

  /* ---------- doc sections (users/{uid} fields) ---------- */

  const SECTIONS = {
    profile: {
      fields: {
        weight: "number", height: "number", age: "number", gender: "string",
        activityMultiplier: "number", goalDelta: "number", name: "string",
        hyroxExperience: "string", trainingDays: "number", equipment: "string[]"
      },
      read: () => (typeof state !== "undefined" ? state.profile : null),
      apply: (clean) => { Object.assign(state.profile, clean); }
    },
    nutrition: {
      fields: { proteinPct: "number", carbPct: "number", fatPct: "number", fibreTarget: "number" },
      read: () => (typeof state !== "undefined" ? state.nutrition : null),
      apply: (clean) => { Object.assign(state.nutrition, clean); }
    },
    settings: {
      // lastWorkoutReminderDate / lastHydrationReminderDate / lastWeeklyReportAt are
      // deliberately absent: device-local reminder bookkeeping, not user preferences.
      fields: {
        sounds: "boolean", vibration: "boolean", defaultRest: "number", keepAwake: "boolean",
        plateCalc: "boolean", rpeTracking: "boolean", autoStartRest: "boolean",
        waterTargetMl: "number", workoutReminders: "boolean", hydrationReminders: "boolean",
        weeklyReports: "boolean", theme: "string", weightUnit: "string",
        exerciseCalorieBudget: "boolean"
      },
      read: () => (typeof state !== "undefined" ? state.settings : null),
      apply: (clean) => { Object.assign(state.settings, clean); }
    },
    // Phase 2C: Hyrox plan progress. completed is a flat map
    // "week|day|exerciseName" -> completion timestamp (ms).
    planProgress: {
      clean: (raw) => {
        const out = {};
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
        if (raw.completed && typeof raw.completed === "object" && !Array.isArray(raw.completed)) {
          const map = {};
          for (const key of Object.keys(raw.completed)) {
            const value = raw.completed[key];
            if (key.length <= 200 && typeof value === "number" && isFinite(value)) map[key] = value;
          }
          out.completed = map;
        }
        if (typeof raw.activeWeek === "number" && isFinite(raw.activeWeek)) out.activeWeek = raw.activeWeek;
        if (typeof raw.activeLevel === "string") out.activeLevel = raw.activeLevel;
        return out;
      },
      // Union of completion keys so neither device's ticked-off exercises are lost; the
      // documented caveat is that an UNcheck can be resurrected if both sides changed
      // between syncs (rare: requires concurrent edits on two devices).
      merge: (cloud, local) => {
        const merged = Object.assign({}, cloud, local);
        merged.completed = Object.assign({}, cloud.completed || {}, local.completed || {});
        return merged;
      },
      read: () => (typeof state !== "undefined"
        ? { completed: state.completed, activeWeek: state.activeWeek, activeLevel: state.activeLevel }
        : null),
      apply: (clean) => {
        if (clean.completed) state.completed = clean.completed;
        if (clean.activeWeek != null) state.activeWeek = clean.activeWeek;
        if (clean.activeLevel) state.activeLevel = clean.activeLevel;
      }
    }
  };

  /* ---------- record categories (users/{uid}/{collection}/{docId}) ---------- */
  // validate() is the minimum shape a record must have to travel; failing records stay
  // local, untouched. sort keeps newest-first ordering the app's UI expects.
  const RECORD_CATEGORIES = {
    workouts: {
      read: () => state.workoutLog, write: (arr) => { state.workoutLog = arr; },
      idOf: (r) => String(r.id),
      validate: (r) => !!r && (typeof r.id === "number" || typeof r.id === "string")
        && typeof r.date === "string" && Array.isArray(r.exercises),
      sort: (a, b) => Number(b.id) - Number(a.id)
    },
    routines: {
      read: () => state.routines, write: (arr) => { state.routines = arr; },
      idOf: (r) => String(r.id),
      validate: (r) => !!r && (typeof r.id === "number" || typeof r.id === "string")
        && typeof r.name === "string" && Array.isArray(r.exercises),
      sort: (a, b) => Number(b.id) - Number(a.id)
    },
    prs: {
      read: () => state.prs, write: (arr) => { state.prs = arr; },
      idOf: (r) => String(r.id),
      validate: (r) => !!r && (typeof r.id === "string" || typeof r.id === "number")
        && typeof r.exerciseName === "string",
      sort: (a, b) => (Number(b.achievedAt) || 0) - (Number(a.achievedAt) || 0)
    },
    bodylog: {
      read: () => state.bodylog, write: (arr) => { state.bodylog = arr; },
      idOf: (r) => String(r.id),
      validate: (r) => !!r && (typeof r.id === "number" || typeof r.id === "string")
        && typeof r.date === "string",
      sort: (a, b) => Number(b.id) - Number(a.id)
    },
    races: {
      read: () => state.raceLog, write: (arr) => { state.raceLog = arr; },
      idOf: (r) => String(r.id),
      validate: (r) => !!r && (typeof r.id === "number" || typeof r.id === "string")
        && typeof r.date === "string" && Array.isArray(r.segments),
      sort: (a, b) => Number(b.id) - Number(a.id)
    },
    customExercises: {
      read: () => state.customExercises, write: (arr) => { state.customExercises = arr; },
      idOf: (r) => encodeURIComponent(String(r.name).trim().toLowerCase()),
      validate: (r) => !!r && typeof r.name === "string" && r.name.trim().length > 0,
      sort: null // creation order is fine; the library UI sorts/filters itself
    }
  };

  /* ---------- utils ---------- */

  function isNative() {
    return typeof window.Capacitor !== "undefined"
      && typeof window.Capacitor.isNativePlatform === "function"
      && window.Capacitor.isNativePlatform()
      && window.Capacitor.getPlatform() === "android";
  }

  async function callNative(methodName, options) {
    if (!isNative()) return { success: false, error: "Cloud sync is only available in the IGNYT Android app." };
    const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytCloudSync;
    if (!plugin || typeof plugin[methodName] !== "function") {
      return { success: false, error: `IgnytCloudSync.${methodName} is not available.` };
    }
    try {
      return await plugin[methodName](options || {});
    } catch (e) {
      return { success: false, error: "Native call failed: " + (e && e.message ? e.message : String(e)) };
    }
  }

  function signedInUid() {
    const account = window.IgnytAuth && IgnytAuth.getAccount();
    return account && account.uid ? account.uid : null;
  }

  function cleanSection(sectionKey, raw) {
    const section = SECTIONS[sectionKey];
    if (section.clean) return section.clean(raw);
    const spec = section.fields;
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    for (const key of Object.keys(spec)) {
      const value = raw[key];
      if (value === undefined || value === null) continue;
      const type = spec[key];
      if (type === "string[]") {
        if (Array.isArray(value) && value.every(v => typeof v === "string")) out[key] = value.slice();
      } else if (type === "number") {
        if (typeof value === "number" && isFinite(value)) out[key] = value;
      } else if (typeof value === type) {
        out[key] = value;
      }
    }
    return out;
  }

  /** Deterministic serialization: recursively key-sorted, so semantically-equal objects
   *  serialize identically regardless of key insertion order (or which device wrote them). */
  function stableStringify(value) {
    if (value === null || typeof value !== "object") {
      return value === undefined ? "null" : JSON.stringify(value);
    }
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort()
      .filter(k => value[k] !== undefined)
      .map(k => JSON.stringify(k) + ":" + stableStringify(value[k]))
      .join(",") + "}";
  }

  /** Short content hash (djb2 + length) so hx_cloud_sync_state stays small even with a
   *  large workout history. Used only for change detection, never for security. */
  function contentHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return h + ":" + str.length;
  }

  function loadSyncState() {
    try { return JSON.parse(localStorage.getItem(SYNC_STATE_KEY) || "null") || {}; }
    catch (e) { return {}; }
  }
  function saveSyncState(s) {
    try { localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(s)); } catch (e) { /* non-fatal */ }
  }
  function clearSyncState() {
    try { localStorage.removeItem(SYNC_STATE_KEY); } catch (e) { /* non-fatal */ }
  }

  /* ---------- status (consumed by the Settings account card) ---------- */

  // "idle" | "syncing" | "synced" | "queued" | "offline" | "failed" | "signed-out"
  let _status = "idle";
  let _statusDetail = null; // short human-readable string, never a raw Firebase error
  let _busy = false;

  function setStatus(status, detail) {
    _status = status;
    _statusDetail = detail || null;
    if (typeof state !== "undefined" && typeof render === "function" && state.tab === "settings") render();
  }

  function classifyError(errorText) {
    const text = String(errorText || "");
    if (text.indexOf("offline:") === 0) return { status: "offline", detail: "Offline — changes stay saved on this device." };
    if (text.indexOf("permission-denied:") === 0) return { status: "failed", detail: "Cloud permissions issue — Firestore security rules may not be deployed yet." };
    if (text.indexOf("unauthenticated:") === 0) return { status: "failed", detail: "Session expired — sign in again to sync." };
    if (text.indexOf("not-found:") === 0 || text.indexOf("failed-precondition:") === 0) {
      return { status: "failed", detail: "Cloud database not set up yet — create Firestore in the Firebase Console." };
    }
    return { status: "failed", detail: "Sync failed — will retry automatically later." };
  }

  // Internal marker so record-sync failures carry the native error text up to sync().
  function SyncHalt(errorText) { this.errorText = errorText; }

  /* ---------- per-record engine (Phase 2C) ---------- */

  async function syncRecordCategory(category, syncState, now) {
    const cfg = RECORD_CATEGORIES[category];
    if (!syncState.records) syncState.records = {};
    const catState = syncState.records[category] || (syncState.records[category] = { lastPulledAt: 0, hashes: {} });
    if (!catState.hashes) catState.hashes = {};

    const rawLocal = cfg.read();
    const localArr = Array.isArray(rawLocal) ? rawLocal : [];
    const localMap = new Map();
    const invalidLocals = []; // never synced, but ALWAYS preserved in local storage
    for (const record of localArr) {
      if (cfg.validate(record)) localMap.set(cfg.idOf(record), record);
      else invalidLocals.push(record);
    }

    // -- pull (incremental) --
    const since = Math.max(0, (catState.lastPulledAt || 0) - PULL_OVERLAP_MS);
    const pullResult = await callNative("listCollection", { name: category, since: String(since) });
    if (!pullResult.success) throw new SyncHalt(pullResult.error);
    const items = (pullResult.data && pullResult.data.items) || [];
    const fromCache = !!(pullResult.data && pullResult.data.fromCache);

    let changedLocal = false;
    let maxSeen = catState.lastPulledAt || 0;

    for (const item of items) {
      // Validate the cloud envelope + payload; malformed docs are skipped, never fatal.
      if (!item || typeof item.docId !== "string" || !item.docId) continue;
      if (typeof item.updatedAt === "number" && item.updatedAt > maxSeen) maxSeen = item.updatedAt;
      if (Number(item.schemaVersion || 1) > CLOUD_SCHEMA_VERSION) continue; // newer app wrote this; don't interpret
      const docId = item.docId;
      const lastHash = catState.hashes[docId];

      if (item.deleted === true) {
        if (localMap.has(docId)) { localMap.delete(docId); changedLocal = true; }
        catState.hashes[docId] = TOMBSTONE; // never re-push, never re-adopt
        continue;
      }
      const cloudRecord = item.data;
      if (!cfg.validate(cloudRecord) || cfg.idOf(cloudRecord) !== docId) continue;
      const cloudHash = contentHash(stableStringify(cloudRecord));
      const local = localMap.get(docId);

      if (local === undefined) {
        if (lastHash === undefined) {
          // Never seen here -> new record from another device. Adopt.
          localMap.set(docId, cloudRecord);
          catState.hashes[docId] = cloudHash;
          changedLocal = true;
        }
        // else: it WAS synced here and the user deleted it locally -> the deletion wins;
        // a tombstone is pushed in the push phase below.
      } else {
        const localHash = contentHash(stableStringify(local));
        if (localHash === cloudHash) {
          catState.hashes[docId] = cloudHash; // identical (Case C)
        } else if (lastHash !== undefined && localHash === lastHash) {
          // Only the cloud changed since our last sync -> adopt cloud version.
          localMap.set(docId, cloudRecord);
          catState.hashes[docId] = cloudHash;
          changedLocal = true;
        }
        // else: local changed (or first-sync divergence) -> LOCAL WINS, pushed below.
      }
    }

    // -- push (content-hash diff) --
    const writes = [];
    for (const [docId, record] of localMap) {
      if (catState.hashes[docId] === TOMBSTONE) continue; // resurrecting a tombstoned id is not allowed
      const serialized = stableStringify(record);
      if (serialized.length > MAX_RECORD_BYTES) {
        console.warn(`[IgnytCloudSync] ${category}/${docId} exceeds ${MAX_RECORD_BYTES} bytes serialized; kept local-only.`);
        continue;
      }
      const h = contentHash(serialized);
      if (catState.hashes[docId] === h) continue;
      writes.push({ docId: docId, doc: { id: docId, schemaVersion: CLOUD_SCHEMA_VERSION, updatedAt: now, deleted: false, data: record } });
      catState.hashes[docId] = h;
    }
    // Local deletions -> tombstones (ids we synced before that are gone from the array).
    for (const docId of Object.keys(catState.hashes)) {
      if (!localMap.has(docId) && catState.hashes[docId] !== TOMBSTONE) {
        writes.push({ docId: docId, doc: { id: docId, schemaVersion: CLOUD_SCHEMA_VERSION, updatedAt: now, deleted: true, deletedAt: now } });
        catState.hashes[docId] = TOMBSTONE;
      }
    }

    let queued = false;
    for (let i = 0; i < writes.length; i += 400) {
      const writeResult = await callNative("writeRecords", { name: category, records: writes.slice(i, i + 400) });
      if (!writeResult.success) throw new SyncHalt(writeResult.error);
      queued = queued || !!(writeResult.data && writeResult.data.queued);
    }

    // -- write back locally (validated records + untouched invalid ones) --
    if (changedLocal) {
      let arr = Array.from(localMap.values());
      if (cfg.sort) arr.sort(cfg.sort);
      cfg.write(arr.concat(invalidLocals));
    }

    // Advance the pull cursor only on a server-confirmed read; a cache-served read may be
    // missing newer server docs, so it must not move the cursor.
    if (!fromCache) catState.lastPulledAt = Math.max(maxSeen, catState.lastPulledAt || 0, now - 60000);
    else if (maxSeen > (catState.lastPulledAt || 0)) catState.lastPulledAt = maxSeen;

    return { queued: queued, changedLocal: changedLocal };
  }

  /* ---------- the one sync routine ---------- */

  async function sync(trigger) {
    if (_busy) return;                       // no concurrent syncs, ever
    if (!isNative()) return;
    const uid = signedInUid();
    if (!uid) { setStatus("signed-out"); return; }

    _busy = true;
    setStatus("syncing");
    try {
      const readResult = await callNative("getUserDoc");
      if (!readResult.success) {
        const cls = classifyError(readResult.error);
        setStatus(cls.status, cls.detail);
        return;
      }

      let syncState = loadSyncState();
      if (syncState.uid !== uid) syncState = { uid: uid, snapshots: {}, records: {} }; // never reuse another account's state
      if (!syncState.snapshots) syncState.snapshots = {};

      const cloudDoc = (readResult.data && readResult.data.exists && readResult.data.doc) ? readResult.data.doc : null;
      const cloudReadable = !cloudDoc || Number(cloudDoc.schemaVersion || 1) <= CLOUD_SCHEMA_VERSION;

      const now = Date.now();
      const push = {};
      let appliedAny = false;

      for (const sectionKey of Object.keys(SECTIONS)) {
        const local = cleanSection(sectionKey, SECTIONS[sectionKey].read());
        const cloud = cloudReadable && cloudDoc ? cleanSection(sectionKey, cloudDoc[sectionKey]) : {};
        const localStr = stableStringify(local);
        const cloudStr = stableStringify(cloud);
        const snapshot = syncState.snapshots[sectionKey] || null;
        const localEmpty = Object.keys(local).length === 0;
        const cloudEmpty = Object.keys(cloud).length === 0;

        if (localStr === cloudStr) {
          syncState.snapshots[sectionKey] = localStr;                    // Case C
          continue;
        }
        if (cloudEmpty) {                                                // Case A
          if (!localEmpty) { push[sectionKey] = local; syncState.snapshots[sectionKey] = localStr; }
          continue;
        }
        if (localEmpty) {                                                // Case B
          SECTIONS[sectionKey].apply(cloud);
          syncState.snapshots[sectionKey] = cloudStr;
          appliedAny = true;
          continue;
        }
        if (snapshot !== null && localStr === snapshot) {                // only cloud moved
          SECTIONS[sectionKey].apply(cloud);
          syncState.snapshots[sectionKey] = cloudStr;
          appliedAny = true;
        } else if (snapshot !== null && cloudStr === snapshot) {         // only local moved
          push[sectionKey] = local;
          syncState.snapshots[sectionKey] = localStr;
        } else {                                                         // Case D: both moved
          const rawMerged = SECTIONS[sectionKey].merge
            ? SECTIONS[sectionKey].merge(cloud, local)
            : Object.assign({}, cloud, local);
          const merged = cleanSection(sectionKey, rawMerged);
          SECTIONS[sectionKey].apply(merged);
          push[sectionKey] = merged;
          syncState.snapshots[sectionKey] = stableStringify(merged);
          appliedAny = true;
        }
      }

      let queued = false;
      if (Object.keys(push).length > 0) {
        const payload = { schemaVersion: CLOUD_SCHEMA_VERSION, updatedAt: now };
        for (const sectionKey of Object.keys(push)) {
          payload[sectionKey] = push[sectionKey];
          payload[sectionKey + "UpdatedAt"] = now;
        }
        const writeResult = await callNative("setUserDoc", { data: payload });
        if (!writeResult.success) {
          if (appliedAny && typeof persist === "function") persist();
          const cls = classifyError(writeResult.error);
          setStatus(cls.status, cls.detail);
          return; // sync state not saved -> same changes retry on the next trigger
        }
        queued = !!(writeResult.data && writeResult.data.queued);
      }

      // Phase 2C: record categories. A failure mid-way surfaces as a status; already-
      // written batches are harmless to repeat (merge writes are idempotent) because the
      // sync state is only persisted after full success.
      try {
        for (const category of Object.keys(RECORD_CATEGORIES)) {
          const result = await syncRecordCategory(category, syncState, now);
          queued = queued || result.queued;
          appliedAny = appliedAny || result.changedLocal;
        }
      } catch (halt) {
        if (!(halt instanceof SyncHalt)) throw halt;
        if (appliedAny && typeof persist === "function") persist();
        const cls = classifyError(halt.errorText);
        setStatus(cls.status, cls.detail);
        return;
      }

      if (appliedAny && typeof persist === "function") persist();

      syncState.lastSyncAt = now;
      saveSyncState(syncState);
      setStatus(queued ? "queued" : "synced");
      if (appliedAny && typeof render === "function") render(); // one repaint at the end
    } catch (e) {
      // Absolute backstop — a sync bug must never take the app down with it.
      console.warn("[IgnytCloudSync] sync failed:", e);
      setStatus("failed", "Sync failed — will retry automatically later.");
    } finally {
      _busy = false;
    }
  }

  /* ---------- triggers ---------- */

  function localChangedSinceLastSync() {
    const syncState = loadSyncState();
    if (syncState.uid !== signedInUid() || !syncState.snapshots) return true;
    for (const sectionKey of Object.keys(SECTIONS)) {
      const local = stableStringify(cleanSection(sectionKey, SECTIONS[sectionKey].read()));
      if (local !== (syncState.snapshots[sectionKey] || null)) return true;
    }
    const recordsState = syncState.records || {};
    for (const category of Object.keys(RECORD_CATEGORIES)) {
      const cfg = RECORD_CATEGORIES[category];
      const catState = recordsState[category];
      if (!catState || !catState.hashes) return true;
      const rawLocal = cfg.read();
      const localArr = Array.isArray(rawLocal) ? rawLocal : [];
      let validCount = 0;
      for (const record of localArr) {
        if (!cfg.validate(record)) continue;
        validCount++;
        const h = catState.hashes[cfg.idOf(record)];
        if (h === undefined || h === TOMBSTONE) return true;      // new or resurrected-by-user
        if (h !== contentHash(stableStringify(record))) return true; // edited
      }
      // deletions: fewer live local records than non-tombstone hash entries
      const liveHashes = Object.values(catState.hashes).filter(v => v !== TOMBSTONE).length;
      if (validCount !== liveHashes) return true;
    }
    return false;
  }

  let _watcherStarted = false;
  function startTriggers() {
    if (_watcherStarted) return; // no duplicate timers/listeners
    _watcherStarted = true;

    window.addEventListener("ignyt:auth-changed", (ev) => {
      const signedIn = !!(ev.detail && ev.detail.signedIn);
      if (signedIn) {
        sync("auth-change");
      } else {
        clearSyncState(); // never carry one account's snapshots/hashes into another's session
        setStatus("signed-out");
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !signedInUid()) return;
      const last = loadSyncState().lastSyncAt || 0;
      if (Date.now() - last >= FOREGROUND_MIN_INTERVAL_MS) sync("foreground");
    });

    window.setInterval(() => {
      if (document.visibilityState !== "visible" || _busy || !signedInUid()) return;
      if (localChangedSinceLastSync()) sync("local-change");
    }, WATCHER_INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startTriggers);
  } else {
    startTriggers();
  }

  return {
    isNativeAndroid: isNative,
    syncNow: () => sync("manual"),
    isBusy: () => _busy,
    getStatus: () => ({
      status: signedInUid() ? _status : "signed-out",
      detail: _statusDetail,
      lastSyncAt: (loadSyncState().uid === signedInUid() ? loadSyncState().lastSyncAt : null) || null
    })
  };
})();

window.IgnytCloudSync = IgnytCloudSync;
