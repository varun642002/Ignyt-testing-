/* =========================================================
   IGNYT CLOUD SYNC (Phase 2B) — offline-first Firestore backup of the
   fitness profile, nutrition targets, and app settings for signed-in
   users. Everything else (workout history, food log, weight log,
   Health Connect data/state, auth tokens, UI state) is deliberately
   NOT synced in this phase.

   Native side: IgnytCloudSync Capacitor plugin — a dumb pipe that
   reads/merge-writes exactly one document, users/{uid}. All policy
   lives here.

   Cloud document shape (single doc — no fragmentation, 1 read + 1
   merge-write per sync):
     users/{uid} = {
       schemaVersion: 1,
       updatedAt: <ms>,
       profile:   {...allowlist}, profileUpdatedAt:   <ms>,
       nutrition: {...allowlist}, nutritionUpdatedAt: <ms>,
       settings:  {...allowlist}, settingsUpdatedAt:  <ms>
     }

   CONFLICT POLICY (documented per Phase 2B spec):
   Three-way comparison per section using the serialized snapshot of
   the last successful sync (stored in hx_cloud_sync_state, keyed to
   the uid). Only the side that changed since that snapshot propagates:
     - cloud missing/invalid            -> push local        (Case A)
     - local empty, cloud valid         -> apply cloud       (Case B)
     - identical                        -> nothing           (Case C)
     - only local changed               -> push local
     - only cloud changed               -> apply cloud
     - both changed, or first sign-in
       with differing data (no snapshot)-> NON-DESTRUCTIVE MERGE:
       start from cloud, overlay this device's values (local wins on
       per-field conflicts — the device in hand is what the user sees),
       apply merged locally AND push it. No field of populated local
       data is ever replaced by emptiness, and cloud-only fields are
       adopted rather than lost.

   OFFLINE: local saves never wait on this file. Reads fall back to
   Firestore's disk cache; writes queue durably in Firestore and
   deliver on reconnect (surfaced as "queued"). Failures set a status
   flag and wait for the next natural trigger — no retry loops.

   TRIGGERS (all funnel through one guarded sync(); no overlap):
     - auth change (sign-in / session restore)  [event from auth.js]
     - manual "Sync Now" in Settings
     - app returning to foreground (>=5 min since last sync)
     - local change watcher: one 90s interval, visible tab only,
       cheap serialize-and-compare, syncs only when something changed
========================================================= */

const IgnytCloudSync = (() => {

  const SYNC_STATE_KEY = "hx_cloud_sync_state";
  const CLOUD_SCHEMA_VERSION = 1;
  const FOREGROUND_MIN_INTERVAL_MS = 5 * 60 * 1000;
  const WATCHER_INTERVAL_MS = 90 * 1000;

  /* ---------- section definitions: explicit allowlists + types ---------- */
  // "string[]" = array of strings. Anything not listed here never leaves the device.
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
    }
  };

  /* ---------- tiny utils ---------- */

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

  /** Validates one section's raw object (local OR cloud — same rules both ways) against its
   *  allowlist. Returns only allowlisted keys with correct types; unknown keys and wrong
   *  types are dropped, never fatal. Returns {} for anything that isn't a plain object. */
  function cleanSection(sectionKey, raw) {
    const spec = SECTIONS[sectionKey].fields;
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

  // Key-sorted serialization so semantically-equal objects always compare equal.
  function serialize(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
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

  /** Turns native error strings (prefixed machine-readably by CloudSyncPlugin) into a
   *  status + a short message safe to show users. */
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
      if (syncState.uid !== uid) syncState = { uid: uid, snapshots: {} }; // never reuse another account's snapshots
      if (!syncState.snapshots) syncState.snapshots = {};

      const cloudDoc = (readResult.data && readResult.data.exists && readResult.data.doc) ? readResult.data.doc : null;
      // Unknown future cloud schema: read nothing from it (fields may mean something else
      // now), but pushing our own well-formed current-version fields is still safe (merge).
      const cloudReadable = !cloudDoc || Number(cloudDoc.schemaVersion || 1) <= CLOUD_SCHEMA_VERSION;

      const now = Date.now();
      const push = {};       // sections to upload
      let appliedAny = false;

      for (const sectionKey of Object.keys(SECTIONS)) {
        const local = cleanSection(sectionKey, SECTIONS[sectionKey].read());
        const cloud = cloudReadable && cloudDoc ? cleanSection(sectionKey, cloudDoc[sectionKey]) : {};
        const localStr = serialize(local);
        const cloudStr = serialize(cloud);
        const snapshot = syncState.snapshots[sectionKey] || null;
        const localEmpty = Object.keys(local).length === 0;
        const cloudEmpty = Object.keys(cloud).length === 0;

        if (localStr === cloudStr) {
          // Case C: identical — just refresh the snapshot.
          syncState.snapshots[sectionKey] = localStr;
          continue;
        }
        if (cloudEmpty) {
          // Case A: cloud missing/empty/unreadable — upload, never delete anything.
          if (!localEmpty) { push[sectionKey] = local; syncState.snapshots[sectionKey] = localStr; }
          continue;
        }
        if (localEmpty) {
          // Case B: local empty, cloud has data — adopt cloud.
          SECTIONS[sectionKey].apply(cloud);
          syncState.snapshots[sectionKey] = cloudStr;
          appliedAny = true;
          continue;
        }
        // Both sides have data and differ (Case D):
        if (snapshot !== null && localStr === snapshot) {
          // Local unchanged since last sync -> the cloud moved (another device). Adopt cloud.
          SECTIONS[sectionKey].apply(cloud);
          syncState.snapshots[sectionKey] = cloudStr;
          appliedAny = true;
        } else if (snapshot !== null && cloudStr === snapshot) {
          // Cloud unchanged since last sync -> this device moved. Push local.
          push[sectionKey] = local;
          syncState.snapshots[sectionKey] = localStr;
        } else {
          // Both changed, or first sign-in with pre-existing data on both sides:
          // non-destructive merge, local values win per-field conflicts.
          const merged = cleanSection(sectionKey, Object.assign({}, cloud, local));
          SECTIONS[sectionKey].apply(merged);
          push[sectionKey] = merged;
          syncState.snapshots[sectionKey] = serialize(merged);
          appliedAny = true;
        }
      }

      if (appliedAny && typeof persist === "function") persist();

      let queued = false;
      if (Object.keys(push).length > 0) {
        const payload = { schemaVersion: CLOUD_SCHEMA_VERSION, updatedAt: now };
        for (const sectionKey of Object.keys(push)) {
          payload[sectionKey] = push[sectionKey];
          payload[sectionKey + "UpdatedAt"] = now;
        }
        const writeResult = await callNative("setUserDoc", { data: payload });
        if (!writeResult.success) {
          const cls = classifyError(writeResult.error);
          setStatus(cls.status, cls.detail);
          return; // snapshots not saved -> the same changes are retried on the next trigger
        }
        queued = !!(writeResult.data && writeResult.data.queued);
      }

      syncState.lastSyncAt = now;
      saveSyncState(syncState);
      setStatus(queued ? "queued" : "synced");
      if (appliedAny && typeof render === "function") render(); // one repaint, whatever the tab shows
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
      const local = serialize(cleanSection(sectionKey, SECTIONS[sectionKey].read()));
      if (local !== (syncState.snapshots[sectionKey] || null)) return true;
    }
    return false;
  }

  let _watcherStarted = false;
  function startTriggers() {
    if (_watcherStarted) return; // no duplicate timers/listeners
    _watcherStarted = true;

    // Sign-in / session-restore / sign-out (dispatched by auth.js).
    window.addEventListener("ignyt:auth-changed", (ev) => {
      const signedIn = !!(ev.detail && ev.detail.signedIn);
      if (signedIn) {
        sync("auth-change");
      } else {
        clearSyncState(); // never carry one account's snapshots into another's session
        setStatus("signed-out");
      }
    });

    // Foreground resume, throttled.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !signedInUid()) return;
      const last = loadSyncState().lastSyncAt || 0;
      if (Date.now() - last >= FOREGROUND_MIN_INTERVAL_MS) sync("foreground");
    });

    // Change watcher: ONE interval, visible tab only, cheap compare, sync only on real change.
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
