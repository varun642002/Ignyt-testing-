/* =========================================================
   IGNYT FASTING — data layer for the Fasting Tracker

   Deliberately standalone. A fast is a period of time, not a meal and not a food entry, so
   nothing here reads or writes hx_food_log, hx_diet_plans or any nutrition key. Breaking a
   fast records that the fast ended — it never logs food on the user's behalf, because the app
   has no idea what they ate.

   ONE ACTIVE FAST AT A TIME. Two overlapping fasts is not a state a person can be in, and
   allowing it would make every duration, streak and average meaningless.

   TIME IS STORED AS EPOCH MILLIS, DURATIONS DERIVED.
   A fast records when it started and when it ended; elapsed and remaining are computed from
   the clock on every read. Nothing counts up in storage, so closing the app, killing it, or
   changing timezone cannot desynchronise a running fast from reality — the numbers are always
   derived from two fixed points.

   STORAGE
     hx_fast_active   the running fast, or null
     hx_fast_history  completed and stopped fasts, newest first
     hx_fast_prefs    notification preferences

   Additive: a build without this module behaves exactly as before.
========================================================= */
(function () {
  "use strict";

  var ACTIVE_KEY  = "hx_fast_active";
  var HISTORY_KEY = "hx_fast_history";
  var PREFS_KEY   = "hx_fast_prefs";

  var HOUR = 3600000;

  /* The published schedules, as fasting-hours : eating-hours. `hours` is what the timer counts
     against; the eating window is shown for context but is not itself tracked — a person is
     either fasting or they are not. */
  var SCHEDULES = [
    { id: "12:12", label: "12:12", hours: 12, eat: 12, blurb: "A gentle overnight fast." },
    { id: "14:10", label: "14:10", hours: 14, eat: 10, blurb: "A common step up from 12:12." },
    { id: "16:8",  label: "16:8",  hours: 16, eat: 8,  blurb: "The most widely used schedule.", popular: true },
    { id: "18:6",  label: "18:6",  hours: 18, eat: 6,  blurb: "A tighter eating window." },
    { id: "20:4",  label: "20:4",  hours: 20, eat: 4,  blurb: "Sometimes called the warrior schedule." },
    { id: "23:1",  label: "OMAD",  hours: 23, eat: 1,  blurb: "One meal a day (23:1)." },
    { id: "24h",   label: "24 Hours", hours: 24, eat: 0, blurb: "A full day, edge to edge." },
    { id: "36h",   label: "36 Hours", hours: 36, eat: 0, blurb: "An extended fast." },
    { id: "48h",   label: "48 Hours", hours: 48, eat: 0, blurb: "A long extended fast." },
    { id: "custom", label: "Custom", hours: null, eat: null, blurb: "Set your own length." }
  ];

  /* Commonly described phases of a fast, by elapsed hours.

     These are GENERAL INFORMATION, not a medical claim about a particular body. Individual
     metabolism varies enormously with the last meal, activity, sleep and health conditions, so
     the copy describes what is typically discussed at each point rather than asserting what is
     happening inside this user. The app carries a medical disclaimer; this stays consistent
     with it and never tells anyone a fast is safe for them. */
  var STAGES = [
    { from: 0,  label: "Digesting",      note: "Your body is still working through your last meal." },
    { from: 4,  label: "Blood sugar settling", note: "Insulin falls as digestion finishes." },
    { from: 12, label: "Glycogen running low", note: "Stored carbohydrate is largely used up by around this point." },
    { from: 16, label: "Fat metabolism",  note: "The body typically leans more on fat for fuel here." },
    { from: 24, label: "Ketosis",         note: "Ketone production is usually well underway by a full day." },
    { from: 36, label: "Extended fast",   note: "Long fasts are best done with medical guidance." }
  ];

  // ---------------------------------------------------------------- storage

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn("[fast] could not save " + key + ":", e); return false; }
  }

  function newId() {
    return "f_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function scheduleById(id) {
    return SCHEDULES.filter(function (s) { return s.id === id; })[0] || null;
  }

  // ---------------------------------------------------------------- active fast

  function active() {
    var f = readJson(ACTIVE_KEY, null);
    if (!f || !f.startAt) return null;
    return f;
  }

  /**
   * Starts a fast. `opts`: { scheduleId, hours, startAt, notes }
   * startAt may be in the past — someone who began at 8pm and opens the app at 10pm should be
   * able to say so rather than losing two hours. A start in the FUTURE is refused: a fast that
   * has not begun is not running, and treating it as active would show negative elapsed time.
   */
  function start(opts) {
    opts = opts || {};
    if (active()) return { ok: false, error: "You already have a fast running." };

    var sched = scheduleById(opts.scheduleId);
    var hours = opts.hours != null ? Number(opts.hours) : (sched ? sched.hours : null);
    if (!hours || isNaN(hours) || hours <= 0) return { ok: false, error: "Choose how long you're fasting for." };
    if (hours > 168) return { ok: false, error: "That's longer than a week — check the length." };

    var startAt = opts.startAt != null ? Number(opts.startAt) : Date.now();
    if (isNaN(startAt)) return { ok: false, error: "That start time isn't valid." };
    if (startAt > Date.now() + 60000) return { ok: false, error: "A fast can't start in the future." };

    var fast = {
      id: newId(),
      startAt: startAt,
      targetHours: hours,
      scheduleId: sched ? sched.id : "custom",
      label: sched && sched.id !== "custom" ? sched.label : (hours + "h"),
      notes: String(opts.notes || "")
    };
    if (!writeJson(ACTIVE_KEY, fast)) return { ok: false, error: "Could not save the fast." };
    return { ok: true, fast: fast };
  }

  /** Live figures for a running fast, derived from the clock every time they are asked for. */
  function progress(fast, now) {
    if (!fast) return null;
    now = now || Date.now();
    var targetMs = fast.targetHours * HOUR;
    var elapsed = Math.max(0, now - fast.startAt);
    var remaining = targetMs - elapsed;
    return {
      elapsedMs: elapsed,
      remainingMs: remaining,          // negative once the target is passed
      targetMs: targetMs,
      // Capped for the ring, uncapped in `rawPct` so "you went 20% past your goal" is knowable.
      pct: Math.min(100, Math.round(elapsed / targetMs * 100)),
      rawPct: Math.round(elapsed / targetMs * 100),
      complete: elapsed >= targetMs,
      endsAt: fast.startAt + targetMs,
      stage: stageFor(elapsed / HOUR)
    };
  }

  function stageFor(elapsedHours) {
    var hit = STAGES[0];
    STAGES.forEach(function (s) { if (elapsedHours >= s.from) hit = s; });
    return hit;
  }

  /**
   * Ends the active fast and files it in history.
   *
   * `completed` is not the user's opinion, it is whether the target was actually reached —
   * a fast stopped at 14h against a 16h target is recorded as stopped, because a history that
   * lets you mark short fasts "completed" cannot support an honest streak.
   */
  function end(notes) {
    var fast = active();
    if (!fast) return { ok: false, error: "No fast is running." };
    var now = Date.now();
    var p = progress(fast, now);
    var record = {
      id: fast.id,
      startAt: fast.startAt,
      endAt: now,
      durationMs: now - fast.startAt,
      targetHours: fast.targetHours,
      scheduleId: fast.scheduleId,
      label: fast.label,
      completed: p.complete,
      notes: String(notes != null ? notes : (fast.notes || ""))
    };
    var hist = history();
    hist.unshift(record);
    writeJson(HISTORY_KEY, hist);
    try { localStorage.removeItem(ACTIVE_KEY); } catch (e) {}
    return { ok: true, record: record };
  }

  /** Abandons a fast without filing it — for a mistaken start, not for giving up early.
   *  Giving up early is `end()`, which records the attempt honestly. */
  function discard() {
    if (!active()) return false;
    try { localStorage.removeItem(ACTIVE_KEY); } catch (e) {}
    return true;
  }

  /** Adjusts the start time of a running fast, for someone who began before opening the app. */
  function adjustStart(startAt) {
    var fast = active();
    if (!fast) return { ok: false, error: "No fast is running." };
    var t = Number(startAt);
    if (isNaN(t)) return { ok: false, error: "That time isn't valid." };
    if (t > Date.now() + 60000) return { ok: false, error: "A fast can't start in the future." };
    fast.startAt = t;
    return writeJson(ACTIVE_KEY, fast) ? { ok: true, fast: fast } : { ok: false, error: "Could not save." };
  }

  // ---------------------------------------------------------------- history

  function history() {
    var h = readJson(HISTORY_KEY, []);
    return Array.isArray(h) ? h.filter(Boolean) : [];
  }

  function removeFromHistory(id) {
    var h = history().filter(function (r) { return r.id !== id; });
    return writeJson(HISTORY_KEY, h);
  }

  function setNotes(id, notes) {
    var h = history();
    var r = h.filter(function (x) { return x.id === id; })[0];
    if (!r) return false;
    r.notes = String(notes || "");
    return writeJson(HISTORY_KEY, h);
  }

  // ---------------------------------------------------------------- analytics

  function dayKey(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  /** Consecutive days ending today (or yesterday, if today has no fast yet) on which a fast
   *  was COMPLETED. Counting stopped fasts would make the streak a measure of intent. */
  function streak() {
    var done = {};
    history().forEach(function (r) { if (r.completed) done[dayKey(r.endAt)] = true; });
    var cursor = new Date();
    // Today not done yet does not break a streak that is otherwise intact — the day is not over.
    if (!done[dayKey(cursor.getTime())]) cursor.setDate(cursor.getDate() - 1);
    var n = 0;
    while (done[dayKey(cursor.getTime())]) {
      n++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }

  /** Total fasting hours inside the last `days` days. Counts the portion of each fast that
   *  falls in the window, so a 24-hour fast spanning the boundary is not double-counted or
   *  attributed entirely to the wrong week. */
  function hoursInLast(days) {
    var since = Date.now() - days * 24 * HOUR;
    var total = 0;
    history().forEach(function (r) {
      var from = Math.max(r.startAt, since);
      var to = r.endAt;
      if (to > from) total += (to - from);
    });
    var live = active();
    if (live) {
      var lf = Math.max(live.startAt, since);
      if (Date.now() > lf) total += (Date.now() - lf);
    }
    return total / HOUR;
  }

  function stats() {
    var h = history();
    var completed = h.filter(function (r) { return r.completed; });
    var durations = h.map(function (r) { return r.durationMs; });
    var longest = durations.length ? Math.max.apply(null, durations) : 0;
    var avg = durations.length ? durations.reduce(function (a, b) { return a + b; }, 0) / durations.length : 0;
    return {
      total: h.length,
      completed: completed.length,
      stopped: h.length - completed.length,
      longestMs: longest,
      averageMs: avg,
      streak: streak(),
      hoursThisWeek: hoursInLast(7),
      hoursThisMonth: hoursInLast(30),
      last: h[0] || null
    };
  }

  /** Per-day fasting hours over the last `days`, oldest first — the series behind the chart. */
  function dailySeries(days) {
    var out = [];
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      var from = d.getTime(), to = from + 24 * HOUR;
      var hours = 0;
      history().forEach(function (r) {
        var s = Math.max(r.startAt, from), e = Math.min(r.endAt, to);
        if (e > s) hours += (e - s) / HOUR;
      });
      var live = active();
      if (live) {
        var ls = Math.max(live.startAt, from), le = Math.min(Date.now(), to);
        if (le > ls) hours += (le - ls) / HOUR;
      }
      out.push({ key: dayKey(from), label: "SMTWTFS"[d.getDay()], hours: hours });
    }
    return out;
  }

  // ---------------------------------------------------------------- preferences

  function prefs() {
    var p = readJson(PREFS_KEY, null);
    return Object.assign({ notifyStart: true, notifyHalf: false, notifyEnd: true, notifyDaily: false }, p || {});
  }

  function setPref(key, value) {
    var p = prefs();
    p[key] = !!value;
    return writeJson(PREFS_KEY, p);
  }

  window.IgnytFasting = {
    SCHEDULES: SCHEDULES, STAGES: STAGES, HOUR: HOUR,
    scheduleById: scheduleById,
    active: active, start: start, end: end, discard: discard, adjustStart: adjustStart,
    progress: progress, stageFor: stageFor,
    history: history, removeFromHistory: removeFromHistory, setNotes: setNotes,
    stats: stats, streak: streak, hoursInLast: hoursInLast, dailySeries: dailySeries,
    prefs: prefs, setPref: setPref
  };
})();
