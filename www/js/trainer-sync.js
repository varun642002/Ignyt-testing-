/* =========================================================
   IGNYT COACH SYNC  —  window.IgnytTrainerSync

   Talks to IGNYT Coach, the trainer platform, so a coach's assigned workouts and meal plans
   appear in this app, and what the user actually did goes back the other way.

   NAMING. This is NOT js/coach/*, which is the app's own AI coach engine (IgnytCoachEngine).
   That is an offline programme generator; this is a network client for a human trainer's
   dashboard. Two different things that both reasonably want the word "coach", so this one is
   "trainer" throughout.

   WHAT IT TOUCHES
     reads    hx_workout_log, hx_food_log, hx_bodylog, hx_water_log   (never written)
     writes   hx_routines            — coach-assigned routines merged in by id
              hx_trainer_link        — link state (new key)
              hx_trainer_meal_plans  — assigned meal plans (new key)
              hx_trainer_targets     — coach's calorie/macro targets (new key)
              hx_trainer_schedule    — upcoming scheduled sessions (new key)
              hx_trainer_cursor      — sync bookkeeping (new key)

   hx_routines is the only EXISTING key this module writes, and it is the whole point of the
   feature — an assigned plan has to land in the routine list or the user cannot start it.
   The merge is strictly id-scoped: coach records carry ids prefixed "coach:", and nextId()
   only ever issues Date.now()-derived numbers, so a coach id cannot collide with a
   user-authored one. User routines are never read, rewritten or reordered by this file.

   The coach's calorie and macro targets are deliberately NOT written into hx_nutrition.
   That key holds the user's own macro split as percentages; overwriting it would silently
   replace a setting the user chose with one they did not, and there would be no way back.
   The targets are stored separately for a screen to read when one exists.

   FAILURE POSTURE
   Nothing here throws into the app. Every entry point resolves to a result object, network
   errors are recorded and reported, and a failed sync leaves local data exactly as it was.
   This runs alongside a workout in progress; it must never be the reason one is lost.
========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- config */

  var LINK_KEY     = "hx_trainer_link";
  var CURSOR_KEY   = "hx_trainer_cursor";
  var PLANS_KEY    = "hx_trainer_meal_plans";
  var TARGETS_KEY  = "hx_trainer_targets";
  var SCHEDULE_KEY = "hx_trainer_schedule";
  var BASE_KEY     = "hx_trainer_api_base";

  var COACH_ID_PREFIX = "coach:";

  /* Server-side caps from the push schema. Exceeding them is a 422 for the WHOLE request, so
     a user with three years of history would never sync at all rather than syncing slowly. */
  var LIMITS = { workouts: 2000, foodLog: 5000, measurements: 2000, waterLog: 1000 };

  /* Incremental window for routine syncs. The server is idempotent on the app's own record
     ids, so re-sending is free — which means a generous window costs bandwidth and buys
     correctness when a user edits something from last week. The first sync ignores this and
     sends everything up to the caps above. */
  var WINDOW_DAYS = 30;

  var REQUEST_TIMEOUT_MS = 20000;

  /* The trainer API is a DIFFERENT SERVICE from the one js/config.js addresses (that one is
     the Integration Service on :8001). Same emulator problem though: 10.0.2.2 is the alias
     Android maps to the host's loopback, and 127.0.0.1 inside the emulator is the emulator. */
  function defaultBase() {
    var isCapacitor = window.IgnytConfig ? window.IgnytConfig.isCapacitor
                                         : /^capacitor:/.test(location.protocol);
    return isCapacitor ? "http://10.0.2.2:8000/v1" : "http://127.0.0.1:8000/v1";
  }

  function apiBase() {
    var stored = readRaw(BASE_KEY);
    return String(stored || defaultBase()).replace(/\/+$/, "");
  }

  /* ---------------------------------------------------------------- storage */

  function readRaw(key) {
    try { return localStorage.getItem(key) || ""; } catch (e) { return ""; }
  }

  function readJson(key, fallback) {
    if (window.IgnytStorageUtils) return window.IgnytStorageUtils.readJson(key, fallback);
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn("[trainer-sync] could not write " + key, e); return false; }
  }

  function readArray(key) {
    var value = readJson(key, []);
    return Array.isArray(value) ? value : [];
  }

  function getLink()   { return readJson(LINK_KEY, null); }
  function getCursor() { return readJson(CURSOR_KEY, {}) || {}; }

  function patchLink(patch) {
    var next = Object.assign({}, getLink() || {}, patch);
    writeJson(LINK_KEY, next);
    return next;
  }

  /* ---------------------------------------------------------------- helpers */

  function num(value) {
    if (value === "" || value === null || value === undefined) return null;
    var n = Number(value);
    return isFinite(n) ? n : null;
  }

  /** "YYYY-MM-DD" for a Date, in LOCAL time.
   *  toISOString() would convert to UTC first, which puts an 8pm workout in IST on the wrong
   *  day. The app logs dates locally (new Date().toISOString().slice(0,10) is used at the
   *  finish site, but every comparison downstream is against local day strings), so windowing
   *  has to agree with what the user sees. */
  function localDateStr(date) {
    var d = date || new Date();
    var month = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + month + "-" + day;
  }

  function windowStartDate(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return localDateStr(d);
  }

  /** Epoch ms for a record, preferring a real timestamp over a date-only string. */
  function timestampOf(record, timeField, dateField) {
    var t = num(record[timeField]);
    if (t) return t;
    var ds = record[dateField];
    if (typeof ds === "string" && /^\d{4}-\d{2}-\d{2}/.test(ds)) {
      // Midday, not midnight: a naive midnight parse in a negative-offset timezone lands on
      // the previous day, which would file the record under the wrong date on the server.
      var parsed = new Date(ds.slice(0, 10) + "T12:00:00");
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    }
    return null;
  }

  /* ---------------------------------------------------------------- transport */

  function isNetworkAvailable() {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  /** Firebase ID token from the native bridge. Null when unavailable — not signed in, not
   *  native, or Firebase not configured in this build. */
  function idToken(forceRefresh) {
    if (!window.IgnytAuth || typeof window.IgnytAuth.getIdToken !== "function") {
      return Promise.resolve(null);
    }
    return window.IgnytAuth.getIdToken(!!forceRefresh).catch(function () { return null; });
  }

  function ApiError(code, message, status) {
    this.name = "TrainerApiError";
    this.code = code || "unknown";
    this.message = message || "Request failed.";
    this.status = status || 0;
  }
  ApiError.prototype = Object.create(Error.prototype);

  /* Dev identity, for a backend running AUTH_MODE=insecure-uid. Same escape hatch and same
     reasoning as window.IGNYT_DEV_UID in js/config.js: the backend refuses this header
     outright when ENVIRONMENT=production, so it cannot become a hole from this side, and a
     real Firebase token always wins over it below. */
  function devUid() {
    return readRaw("hx_trainer_dev_uid") || "";
  }

  function request(path, options, retrying) {
    var opts = options || {};
    return idToken(!!retrying).then(function (token) {
      var dev = token ? "" : devUid();

      if (!token && !dev) {
        // Deliberately a typed refusal rather than an unauthenticated request: without a
        // token the server would answer 401 and the user would see "unauthorized" when the
        // real problem is that they are not signed in to IGNYT at all.
        throw new ApiError("not_signed_in", "Sign in to IGNYT to sync with your coach.", 0);
      }

      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

      var headers = token ? { "Authorization": "Bearer " + token }
                          : { "X-Ignyt-Uid": dev };
      if (opts.body !== undefined) headers["Content-Type"] = "application/json";

      return fetch(apiBase() + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller ? controller.signal : undefined
      }).then(function (response) {
        if (timer) clearTimeout(timer);

        // One retry with a force-refreshed token. A token that expired mid-session is the
        // common 401 here and it fixes itself; retrying more than once would just hammer.
        if (response.status === 401 && !retrying) {
          return request(path, options, true);
        }

        if (response.status === 204) return null;

        return response.json().catch(function () { return null; }).then(function (body) {
          if (!response.ok) {
            var err = (body && body.error) || {};
            throw new ApiError(err.code, err.message || ("Request failed (" + response.status + ")."), response.status);
          }
          return body;
        });
      }).catch(function (error) {
        if (timer) clearTimeout(timer);
        if (error instanceof ApiError) throw error;
        if (error && error.name === "AbortError") {
          throw new ApiError("timeout", "The coach service did not respond in time.", 0);
        }
        throw new ApiError("network", "Could not reach the coach service.", 0);
      });
    });
  }

  /* ================================================================ PUSH
     Local records -> the shapes services/ignyt_sync.py expects.

     Every mapping below exists because the two field names differ. They are listed
     explicitly rather than spread, so a rename on either side fails visibly here instead of
     silently dropping a column on the server.                                             */

  /** Sets the user actually performed.
   *
   *  `done` is the critical filter. A live session carries every PLANNED set, including ones
   *  never completed; pushing those would inflate server-side volume, compliance and personal
   *  records with work that did not happen. Warm-ups are sent (typed as "warmup") and the
   *  server excludes them from volume itself, so the two sides agree on one definition. */
  function mapSets(exercise) {
    var sets = Array.isArray(exercise.sets) ? exercise.sets : [];
    var out = [];
    for (var i = 0; i < sets.length; i++) {
      var s = sets[i];
      if (!s || !s.done) continue;
      out.push({
        weight: num(s.weight),
        reps: num(s.reps),
        rpe: num(s.rpe),
        duration: num(s.duration != null ? s.duration : s.seconds),
        distance: num(s.distance),
        type: (s.type || "working")
      });
    }
    return out;
  }

  function mapWorkouts(records) {
    var out = [];
    for (var i = 0; i < records.length; i++) {
      var w = records[i];
      if (!w || w.id == null) continue;

      var exercises = [];
      var source = Array.isArray(w.exercises) ? w.exercises : [];
      for (var j = 0; j < source.length; j++) {
        var ex = source[j];
        if (!ex || !ex.name) continue;
        var sets = mapSets(ex);
        if (!sets.length) continue;   // an exercise with nothing completed is not evidence
        exercises.push({ name: String(ex.name), sets: sets });
      }

      out.push({
        id: String(w.id),
        // `title` is what the user named the session; the server field is `name`.
        name: w.title || "Workout",
        // finishedAt is epoch ms and is what actually happened; `date` is a day string and
        // loses the time. The server accepts both, so send the better one.
        date: w.finishedAt || timestampOf(w, "startedAt", "date"),
        // MINUTES on this side, SECONDS on the server. Getting this wrong makes every
        // session look 60x too short and nothing would flag it.
        duration: num(w.durationMin) != null ? Math.round(num(w.durationMin) * 60) : null,
        notes: w.notes || "",
        exercises: exercises
      });
    }
    return out;
  }

  function mapFood(records) {
    var out = [];
    for (var i = 0; i < records.length; i++) {
      var f = records[i];
      if (!f || f.id == null || !f.name) continue;
      out.push({
        id: String(f.id),
        date: f.at || timestampOf(f, "at", "date"),
        meal: f.meal || "other",
        name: String(f.name),
        // `grams` is the canonical amount; `quantity` mirrors it at the write site but grams
        // is the one the serving converter maintains.
        quantity: num(f.grams != null ? f.grams : f.quantity) || 1,
        unit: f.servingUnit || "g",
        calories: num(f.calories) || 0,
        protein: num(f.protein) || 0,
        carbs: num(f.carbs) || 0,
        fat: num(f.fat) || 0,
        fibre: num(f.fibre) || 0
      });
    }
    return out;
  }

  /* Local field -> server field. The server's own map keys off these names. */
  var MEASUREMENT_FIELDS = {
    weight: "weight",
    bodyfat: "bodyFat",          // lowercase f locally, camel on the wire
    muscleMass: "muscleMass",
    visceralFat: "visceralFat",
    neck: "neck",
    shoulders: "shoulders",
    chest: "chest",
    waist: "waist",
    hips: "hips",
    leftArm: "leftArm",
    rightArm: "rightArm",
    leftThigh: "leftThigh",
    rightThigh: "rightThigh",
    leftCalf: "calf"             // the server stores a single calf measurement
  };

  function mapMeasurements(records) {
    var out = [];
    for (var i = 0; i < records.length; i++) {
      var b = records[i];
      if (!b || !b.date) continue;

      var entry = { date: timestampOf(b, "at", "date") };
      var touched = false;

      for (var local in MEASUREMENT_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(MEASUREMENT_FIELDS, local)) continue;
        // Values come from DOM inputs and are strings; num() normalises and drops blanks.
        var value = num(b[local]);
        if (value === null) continue;
        entry[MEASUREMENT_FIELDS[local]] = value;
        touched = true;
      }

      if (!touched) continue;     // a row with only sleep/hrv is not a body measurement
      if (b.notes) entry.notes = String(b.notes);
      out.push(entry);
    }
    return out;
  }

  /** Water is stored as one row PER ADDITION ({id, date, ml}), but the server keeps one total
   *  per day and upserts on (client, date). Sending the raw rows would make the last one win
   *  and report 250 ml for a day the user drank two litres, so the sum happens here. */
  function mapWater(records) {
    var byDate = Object.create(null);
    for (var i = 0; i < records.length; i++) {
      var w = records[i];
      if (!w || !w.date) continue;
      var ml = num(w.ml);
      if (ml === null) continue;
      byDate[w.date] = (byDate[w.date] || 0) + ml;
    }

    // The user's own daily goal, so the coach sees intake against what this app was asking
    // for rather than against nothing. Read defensively: settings may not be loaded yet.
    var goal = null;
    try {
      goal = num(window.state && window.state.settings && window.state.settings.waterTargetMl);
    } catch (e) { goal = null; }

    var out = [];
    for (var date in byDate) {
      if (!Object.prototype.hasOwnProperty.call(byDate, date)) continue;
      var entry = { date: date, total: Math.round(byDate[date]) };
      if (goal) entry.goal = goal;
      out.push(entry);
    }
    return out;
  }

  /** Records on or after `since` (a local YYYY-MM-DD). Null `since` means everything. */
  function withinWindow(records, since, dateField) {
    if (!since) return records;
    var out = [];
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var value = record && record[dateField || "date"];
      if (typeof value === "string" && value.slice(0, 10) >= since) out.push(record);
    }
    return out;
  }

  function collectPushPayload() {
    var cursor = getCursor();
    // First sync sends the whole history (capped); later ones send a rolling window, which is
    // enough to carry edits because the server upserts on the app's own record ids.
    var since = cursor.lastPushAt ? windowStartDate(WINDOW_DAYS) : null;

    var workouts = mapWorkouts(withinWindow(readArray("hx_workout_log"), since).slice(0, LIMITS.workouts));
    var food     = mapFood(withinWindow(readArray("hx_food_log"), since).slice(0, LIMITS.foodLog));
    var body     = mapMeasurements(withinWindow(readArray("hx_bodylog"), since).slice(0, LIMITS.measurements));
    var water    = mapWater(withinWindow(readArray("hx_water_log"), since).slice(0, LIMITS.waterLog));

    return {
      workouts: workouts,
      foodLog: food,
      measurements: body,
      waterLog: water,
      appVersion: (window.IGNYT_APP_VERSION || ""),
      full: !since
    };
  }

  /* ================================================================ PULL
     Coach-assigned records into local storage.                                             */

  function isCoachRecord(record) {
    return !!(record && typeof record.id === "string" && record.id.indexOf(COACH_ID_PREFIX) === 0);
  }

  /** Merge assigned routines into hx_routines.
   *
   *  Replaces the coach-owned slice wholesale and leaves everything else untouched, so a
   *  routine the coach un-assigned disappears while nothing the user wrote is affected. New
   *  coach routines go on top (they are the thing that just changed and the reason the user
   *  opened the app); user routines keep their existing relative order. */
  function mergeRoutines(incoming) {
    var existing = readArray("hx_routines");
    var userRoutines = [];

    for (var i = 0; i < existing.length; i++) {
      if (!isCoachRecord(existing[i])) userRoutines.push(existing[i]);
    }

    var coachRoutines = Array.isArray(incoming) ? incoming.slice() : [];

    // Run the app's own normaliser when it is available, so coach records enter storage in
    // exactly the shape every reader downstream expects rather than merely a compatible one.
    if (typeof window.normalizeRoutine === "function") {
      var normalised = [];
      for (var j = 0; j < coachRoutines.length; j++) {
        try {
          var record = window.normalizeRoutine(coachRoutines[j]);
          if (record) normalised.push(record);
        } catch (e) {
          normalised.push(coachRoutines[j]);   // a normaliser change must not lose the plan
        }
      }
      coachRoutines = normalised;
    }

    var merged = coachRoutines.concat(userRoutines);

    if (typeof window.enforceRoutineIntegrity === "function") {
      try { merged = window.enforceRoutineIntegrity(merged); } catch (e) { /* keep merged */ }
    }

    writeJson("hx_routines", merged);
    return { coach: coachRoutines.length, user: userRoutines.length };
  }

  /** Refresh the running app so a synced plan appears without a reload.
   *
   *  app.js reloads hx_routines on the `storage` event, but that only fires in OTHER tabs —
   *  a same-document write is invisible to it. So the live state is updated directly, and
   *  only when it is safe: re-rendering during a live session or with the routine editor open
   *  would discard uncommitted work, which is exactly the guard app.js applies itself. */
  function refreshLiveState() {
    var state = window.state;
    if (!state) return false;

    if (state.session || state.routineBuilder) return false;

    try {
      state.routines = readArray("hx_routines");
      if (typeof window.render === "function") window.render();
      return true;
    } catch (e) {
      console.warn("[trainer-sync] could not refresh the routine list", e);
      return false;
    }
  }

  function applyPull(payload) {
    var summary = { routines: 0, mealPlans: 0, scheduled: 0, rendered: false };
    if (!payload) return summary;

    // Only touch hx_routines when the server actually sent routines. An incremental pull with
    // nothing changed returns an empty list, and treating that as "the coach removed
    // everything" would wipe the user's plan on every quiet sync.
    if (Array.isArray(payload.routines) && payload.routines.length) {
      var result = mergeRoutines(payload.routines);
      summary.routines = result.coach;
    }

    if (Array.isArray(payload.mealPlans) && payload.mealPlans.length) {
      writeJson(PLANS_KEY, payload.mealPlans);
      summary.mealPlans = payload.mealPlans.length;
    }

    if (payload.targets) writeJson(TARGETS_KEY, payload.targets);

    if (Array.isArray(payload.schedule)) {
      writeJson(SCHEDULE_KEY, payload.schedule);
      summary.scheduled = payload.schedule.length;
    }

    if (summary.routines) summary.rendered = refreshLiveState();
    return summary;
  }

  /* ================================================================ public API */

  var _inFlight = null;

  function isLinked() {
    var link = getLink();
    return !!(link && link.linked && link.clientId);
  }

  /** Redeem a coach-issued code. The coach reads out 8 characters; this binds the signed-in
   *  IGNYT account to their client record, server-side, using this device's own token. */
  function link(code) {
    var cleaned = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 4) {
      return Promise.resolve({ ok: false, code: "invalid_code", message: "Enter the code your coach gave you." });
    }

    return request("/sync/link", {
      method: "POST",
      body: { code: cleaned, platform: "android" }
    }).then(function (body) {
      patchLink({
        linked: true,
        clientId: body.clientId,
        clientName: body.clientName,
        coachName: body.coachName || null,
        organizationName: body.organizationName || null,
        organizationLogoUrl: body.organizationLogoUrl || null,
        brandPrimary: body.brandPrimary || null,
        linkedAt: Date.now(),
        lastError: null
      });
      // Pull straight away: the user just typed a code and expects to see their plan, not to
      // wait for the next background sync. The link itself has already succeeded at this
      // point, so a failed first sync is reported alongside it rather than instead of it —
      // "your code was wrong" and "your plan has not downloaded yet" need different fixes.
      return sync("link").then(function (syncResult) {
        return { ok: true, link: getLink(), sync: syncResult };
      });
    }).catch(function (error) {
      return { ok: false, code: error.code, message: error.message };
    });
  }

  function unlink() {
    try {
      localStorage.removeItem(LINK_KEY);
      localStorage.removeItem(CURSOR_KEY);
      localStorage.removeItem(PLANS_KEY);
      localStorage.removeItem(TARGETS_KEY);
      localStorage.removeItem(SCHEDULE_KEY);
    } catch (e) { /* non-fatal */ }

    // Coach-assigned routines go with the link. Leaving them would strand a plan the user
    // can no longer sync, update, or ask anyone about.
    var remaining = readArray("hx_routines").filter(function (r) { return !isCoachRecord(r); });
    writeJson("hx_routines", remaining);
    refreshLiveState();

    return { ok: true };
  }

  /** Push local activity, then pull assigned work. One call, in that order — pushing first
   *  means the coach's dashboard reflects this session before the user reads any feedback. */
  function sync(trigger) {
    if (!isLinked()) {
      return Promise.resolve({ ok: false, code: "not_linked", message: "Not connected to a coach." });
    }
    if (!isNetworkAvailable()) {
      return Promise.resolve({ ok: false, code: "offline", message: "No connection. Your data is saved locally." });
    }
    // Coalesce: visibilitychange and a workout finish can land together, and two concurrent
    // syncs would race on the same cursor.
    if (_inFlight) return _inFlight;

    var cursor = getCursor();
    var payload = collectPushPayload();
    var pushed = payload.workouts.length + payload.foodLog.length +
                 payload.measurements.length + payload.waterLog.length;

    var run = Promise.resolve()
      .then(function () {
        if (!pushed) return null;
        return request("/sync/push", {
          method: "POST",
          body: {
            workouts: payload.workouts,
            foodLog: payload.foodLog,
            measurements: payload.measurements,
            waterLog: payload.waterLog,
            appVersion: payload.appVersion
          }
        });
      })
      .then(function (pushResult) {
        var since = cursor.lastPullAt || null;
        var path = "/sync/pull" + (since ? "?since=" + encodeURIComponent(since) : "");
        return request(path, { method: "GET" }).then(function (pullBody) {
          return { push: pushResult, pull: pullBody };
        });
      })
      .then(function (results) {
        var applied = applyPull(results.pull);
        var now = Date.now();

        writeJson(CURSOR_KEY, Object.assign({}, cursor, {
          lastPushAt: pushed ? now : cursor.lastPushAt,
          // The server's own clock, echoed back, is what `since` is compared against on the
          // next pull. Using this device's clock would drop records whenever it drifts.
          lastPullAt: (results.pull && results.pull.syncedAt) || cursor.lastPullAt,
          lastSyncAt: now,
          lastTrigger: trigger || "manual"
        }));

        patchLink({ lastSyncAt: now, lastError: null });

        return {
          ok: true,
          pushed: results.push || null,
          applied: applied,
          trigger: trigger || "manual"
        };
      })
      .catch(function (error) {
        patchLink({ lastError: { code: error.code, message: error.message, at: Date.now() } });
        // A sync that fails changes nothing locally. Reported, not thrown — a background
        // trigger must not surface as an unhandled rejection in a fitness app.
        console.warn("[trainer-sync] " + (trigger || "manual") + " failed: " + error.message);
        return { ok: false, code: error.code, message: error.message };
      })
      .then(function (result) {
        _inFlight = null;
        return result;
      });

    _inFlight = run;
    return run;
  }

  /** Pending check-ins, with whatever custom questions the coach configured. */
  function checkIns() {
    if (!isLinked()) return Promise.resolve([]);
    return request("/sync/check-ins", { method: "GET" })
      .catch(function () { return []; });
  }

  function submitCheckIn(checkInId, answers) {
    if (!isLinked()) {
      return Promise.resolve({ ok: false, code: "not_linked", message: "Not connected to a coach." });
    }
    return request("/sync/check-ins/" + encodeURIComponent(checkInId), {
      method: "POST",
      body: answers || {}
    }).then(function (body) {
      return { ok: true, message: (body && body.message) || "Check-in submitted." };
    }).catch(function (error) {
      return { ok: false, code: error.code, message: error.message };
    });
  }

  function messages() {
    if (!isLinked()) return Promise.resolve([]);
    return request("/sync/messages", { method: "GET" }).catch(function () { return []; });
  }

  function sendMessage(text) {
    var body = String(text || "").trim();
    if (!body) return Promise.resolve({ ok: false, code: "empty", message: "Write something first." });
    if (!isLinked()) {
      return Promise.resolve({ ok: false, code: "not_linked", message: "Not connected to a coach." });
    }
    return request("/sync/messages", { method: "POST", body: { body: body } })
      .then(function (message) { return { ok: true, message: message }; })
      .catch(function (error) { return { ok: false, code: error.code, message: error.message }; });
  }

  /* ---------------------------------------------------------------- triggers */

  var MIN_INTERVAL_MS = 5 * 60 * 1000;   // never more than once every five minutes

  function syncIfDue(trigger) {
    if (!isLinked()) return;
    var cursor = getCursor();
    if (cursor.lastSyncAt && (Date.now() - cursor.lastSyncAt) < MIN_INTERVAL_MS) return;
    sync(trigger);
  }

  function startTriggers() {
    // Foreground. The moment a user opens the app is when a newly assigned plan should be
    // there, and it costs nothing when `since` says nothing changed.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") syncIfDue("foreground");
    });

    // Reconnect after a dead spot — the gym basement case.
    window.addEventListener("online", function () { syncIfDue("online"); });

    // A finished workout is the highest-value thing to send, and the coach seeing it promptly
    // is the point of the product. Bypasses the interval floor for that reason.
    window.addEventListener("ignyt:workout-finished", function () {
      if (isLinked()) sync("workout-finished");
    });
  }

  function boot() {
    startTriggers();
    // One attempt at launch, subject to the interval floor.
    if (isLinked()) syncIfDue("launch");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* ---------------------------------------------------------------- exports */

  window.IgnytTrainerSync = Object.freeze({
    // state
    isLinked: isLinked,
    getLink: getLink,
    getStatus: function () {
      var cursor = getCursor();
      var link = getLink();
      return {
        linked: isLinked(),
        clientName: link ? link.clientName : null,
        coachName: link ? link.coachName : null,
        organizationName: link ? link.organizationName : null,
        lastSyncAt: cursor.lastSyncAt || null,
        lastTrigger: cursor.lastTrigger || null,
        lastError: link ? (link.lastError || null) : null,
        syncing: !!_inFlight
      };
    },

    // coach content the app can render
    getTargets:   function () { return readJson(TARGETS_KEY, null); },
    getMealPlans: function () { return readArray(PLANS_KEY); },
    getSchedule:  function () { return readArray(SCHEDULE_KEY); },
    isCoachRoutine: isCoachRecord,

    // actions
    link: link,
    unlink: unlink,
    sync: sync,
    checkIns: checkIns,
    submitCheckIn: submitCheckIn,
    messages: messages,
    sendMessage: sendMessage,

    // dev/support: point at a different backend without a rebuild, same as IgnytConfig does
    setApiBase: function (url) {
      try { localStorage.setItem(BASE_KEY, String(url || "")); } catch (e) {}
      return apiBase();
    },
    getApiBase: apiBase,
    setDevUid: function (uid) {
      try { localStorage.setItem("hx_trainer_dev_uid", String(uid || "")); } catch (e) {}
      return devUid();
    },

    // exposed for tests — pure functions over local shapes, no I/O
    _map: Object.freeze({
      workouts: mapWorkouts,
      food: mapFood,
      measurements: mapMeasurements,
      water: mapWater
    })
  });
}());
