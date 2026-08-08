/* =========================================================
   IGNYT SUPPLEMENTS — data layer

   A supplement is a STANDING INSTRUCTION ("2 scoops of whey, after training, most days"); a
   dose is one instance of following it on a date. Keeping those separate is what makes the
   rest work: editing the instruction must not rewrite what you already took, and a history
   built from ticks rather than from the current settings still reads correctly after you
   change the dosage.

   INVENTORY IS COUNTED DOWN BY DOSES TAKEN, NOT BY DAYS ELAPSED.
   "Days remaining" is derived from what is left and how much a day actually costs, so skipping
   doses extends the estimate exactly as it does in reality. A calendar countdown would drift
   from the tub within a week.

   STORAGE
     hx_supplements        the standing instructions
     hx_supplement_log     { "YYYY-MM-DD": { [supplementId]: takenAtMs } }
========================================================= */
(function () {
  "use strict";

  var LIST_KEY = "hx_supplements";
  var LOG_KEY  = "hx_supplement_log";

  var CATEGORIES = [
    { id: "protein",      label: "Protein",       icon: "cup" },
    { id: "creatine",     label: "Creatine",      icon: "bolt" },
    { id: "preworkout",   label: "Pre Workout",   icon: "flame" },
    { id: "postworkout",  label: "Post Workout",  icon: "droplet" },
    { id: "multivitamin", label: "Multivitamin",  icon: "pill" },
    { id: "fishoil",      label: "Fish Oil",      icon: "fish" },
    { id: "vitamind",     label: "Vitamin D",     icon: "sun" },
    { id: "vitaminc",     label: "Vitamin C",     icon: "apple" },
    { id: "magnesium",    label: "Magnesium",     icon: "moon" },
    { id: "zma",          label: "ZMA",           icon: "moon" },
    { id: "electrolytes", label: "Electrolytes",  icon: "spice" },
    { id: "ashwagandha",  label: "Ashwagandha",   icon: "leaf" },
    { id: "collagen",     label: "Collagen",      icon: "star" },
    { id: "other",        label: "Other",         icon: "bottle" }
  ];

  var UNITS = ["g", "mg", "mcg", "IU", "ml", "scoop", "capsule", "tablet", "softgel", "sachet"];

  var TIMINGS = [
    { id: "anytime",       label: "Anytime" },
    { id: "with-food",     label: "With food" },
    { id: "empty-stomach", label: "Empty stomach" },
    { id: "pre-workout",   label: "Before workout" },
    { id: "post-workout",  label: "After workout" },
    { id: "before-sleep",  label: "Before sleep" }
  ];

  /* Frequency is stored as a day list for the same reason the reminder engine does it: daily,
     weekdays, weekends and "training days" all reduce to days, so one comparison answers
     "is this due today" for every case. */
  var FREQUENCIES = [
    { id: "daily",    label: "Every day",  days: [0,1,2,3,4,5,6] },
    { id: "weekdays", label: "Weekdays",   days: [1,2,3,4,5] },
    { id: "weekends", label: "Weekends",   days: [0,6] },
    { id: "custom",   label: "Custom days", days: null }
  ];

  function readJson(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) || fallback) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn("[supplements] could not save " + key + ":", e); return false; }
  }
  function newId() { return "sup_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function dayKey(ms) {
    var d = new Date(ms == null ? Date.now() : ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  function categoryById(id) {
    return CATEGORIES.filter(function (c) { return c.id === id; })[0] || CATEGORIES[CATEGORIES.length - 1];
  }

  // ---------------------------------------------------------------- the list

  function normalise(s) {
    if (!s || !s.id) return null;
    return {
      id: s.id,
      name: String(s.name || "Supplement"),
      brand: String(s.brand || ""),
      category: s.category || "other",
      dosage: s.dosage != null ? Number(s.dosage) : null,
      unit: s.unit || "capsule",
      quantity: s.quantity != null ? Number(s.quantity) : 1,   // units per dose
      frequency: s.frequency || "daily",
      days: Array.isArray(s.days) ? s.days : [0,1,2,3,4,5,6],
      time: s.time || "",
      timing: s.timing || "anytime",
      notes: String(s.notes || ""),
      remind: !!s.remind,
      // Inventory is optional. A supplement with no count tracked reports null days remaining
      // rather than zero — "unknown" and "you have run out" must not look the same.
      inventory: s.inventory != null ? Number(s.inventory) : null,
      createdAt: s.createdAt || Date.now()
    };
  }

  function all() {
    var raw = readJson(LIST_KEY, []);
    return (Array.isArray(raw) ? raw : []).map(normalise).filter(Boolean);
  }
  function get(id) { return all().filter(function (s) { return s.id === id; })[0] || null; }
  function saveAll(list) { return writeJson(LIST_KEY, list); }

  function add(fields) {
    var list = all();
    var rec = normalise(Object.assign({ id: newId(), createdAt: Date.now() }, fields || {}));
    if (!rec) return null;
    list.push(rec);
    return saveAll(list) ? rec : null;
  }

  function update(id, patch) {
    var list = all();
    var i = -1;
    list.forEach(function (s, idx) { if (s.id === id) i = idx; });
    if (i === -1) return false;
    list[i] = normalise(Object.assign({}, list[i], patch));
    return saveAll(list);
  }

  /** Removes the supplement. History is deliberately KEPT: the doses were really taken, and
   *  deleting a product should not rewrite what happened. Orphaned entries are ignored by
   *  every read, so they cost nothing but stay recoverable. */
  function remove(id) {
    return saveAll(all().filter(function (s) { return s.id !== id; }));
  }

  function daysFor(s) {
    var f = FREQUENCIES.filter(function (x) { return x.id === s.frequency; })[0];
    if (f && f.days) return f.days;
    return Array.isArray(s.days) ? s.days : [0,1,2,3,4,5,6];
  }

  function isDueOn(s, dateStr) {
    var d = new Date(dateStr + "T12:00:00");
    if (isNaN(d)) return false;
    return daysFor(s).indexOf(d.getDay()) !== -1;
  }

  function dueToday() {
    var key = dayKey();
    return all().filter(function (s) { return isDueOn(s, key); });
  }

  // ---------------------------------------------------------------- the log

  function log() { return readJson(LOG_KEY, {}) || {}; }

  function isTaken(id, dateStr) {
    var day = log()[dateStr || dayKey()];
    return !!(day && day[id]);
  }

  /** Toggles a dose. Taking one decrements inventory; untaking gives it back, so a mistap
   *  costs nothing — an inventory that only ever went down would drift low every time someone
   *  tapped the wrong row. */
  function toggle(id, dateStr) {
    var key = dateStr || dayKey();
    var store = log();
    var day = store[key] || {};
    var sup = get(id);
    var nowTaken;

    if (day[id]) { delete day[id]; nowTaken = false; }
    else { day[id] = Date.now(); nowTaken = true; }

    if (Object.keys(day).length) store[key] = day; else delete store[key];
    writeJson(LOG_KEY, store);

    if (sup && sup.inventory != null) {
      var per = sup.quantity || 1;
      var next = sup.inventory + (nowTaken ? -per : per);
      update(id, { inventory: Math.max(0, Math.round(next * 100) / 100) });
    }
    return nowTaken;
  }

  // ---------------------------------------------------------------- analytics

  /** How many units a day costs, for the inventory estimate. A supplement taken twice a week
   *  burns through a tub far slower than a daily one, so this is per-week averaged. */
  function unitsPerDay(s) {
    var perDose = s.quantity || 1;
    var daysAWeek = daysFor(s).length || 7;
    return perDose * daysAWeek / 7;
  }

  function daysRemaining(s) {
    if (s.inventory == null) return null;          // not tracked, not zero
    var rate = unitsPerDay(s);
    if (!rate) return null;
    return Math.floor(s.inventory / rate);
  }

  /** Today's completion across everything actually due today. Supplements not due today are
   *  excluded from BOTH sides — counting a Monday-only supplement against a Tuesday would cap
   *  a perfect day below 100%. */
  function todayProgress() {
    var due = dueToday();
    var key = dayKey();
    var done = due.filter(function (s) { return isTaken(s.id, key); });
    return {
      done: done.length, total: due.length,
      pct: due.length ? Math.round(done.length / due.length * 100) : 0
    };
  }

  /** Per-day completion over the last `days`, oldest first — the series behind the chart.
   *  Days with nothing due are marked so the chart can skip them rather than draw a zero that
   *  looks like a miss. */
  function series(days) {
    var out = [];
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      var key = dayKey(d.getTime());
      // Same rule as missed(): a day before a supplement was added had nothing due from it.
      var due = all().filter(function (s) { return dayKey(s.createdAt) <= key && isDueOn(s, key); });
      var done = due.filter(function (s) { return isTaken(s.id, key); });
      out.push({
        key: key, label: "SMTWTFS"[d.getDay()],
        due: due.length, done: done.length,
        pct: due.length ? Math.round(done.length / due.length * 100) : null
      });
    }
    return out;
  }

  /** Consecutive days ending today (or yesterday, if today is not finished) on which every
   *  due supplement was taken. Days with nothing due do not break a streak — there was
   *  nothing to miss — but they do not extend it either. */
  function streak() {
    var cursor = new Date();
    var n = 0;
    var todayKey = dayKey(cursor.getTime());
    var todayDue = all().filter(function (s) { return isDueOn(s, todayKey); });
    var todayDone = todayDue.filter(function (s) { return isTaken(s.id, todayKey); });
    if (!todayDue.length || todayDone.length < todayDue.length) cursor.setDate(cursor.getDate() - 1);

    for (var guard = 0; guard < 400; guard++) {
      var key = dayKey(cursor.getTime());
      var due = all().filter(function (s) { return isDueOn(s, key); });
      if (due.length) {
        var done = due.filter(function (s) { return isTaken(s.id, key); });
        if (done.length < due.length) break;
        n++;
      }
      cursor.setDate(cursor.getDate() - 1);
      // Stop at the oldest supplement — before that there was nothing to take.
      var oldest = Math.min.apply(null, all().map(function (s) { return s.createdAt; }).concat([Date.now()]));
      if (cursor.getTime() < oldest - 86400000) break;
    }
    return n;
  }

  /** Missed doses in the last `days` — due, and not ticked. Today is excluded: the day is not
   *  over, so nothing is missed yet. */
  function missed(days) {
    var out = [];
    var now = new Date();
    for (var i = days; i >= 1; i--) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      var key = dayKey(d.getTime());
      all().forEach(function (s) {
        // Nothing can be missed before the supplement existed. Without this, adding one today
        // reports a week of missed doses and a 0% adherence the user never had a chance at.
        if (dayKey(s.createdAt) > key) return;
        if (isDueOn(s, key) && !isTaken(s.id, key)) out.push({ date: key, id: s.id, name: s.name });
      });
    }
    return out;
  }

  function stats() {
    var s30 = series(30).filter(function (d) { return d.due > 0; });
    var avg = s30.length ? Math.round(s30.reduce(function (a, d) { return a + d.pct; }, 0) / s30.length) : 0;
    return {
      count: all().length,
      today: todayProgress(),
      streak: streak(),
      adherence30: avg,
      missed7: missed(7).length,
      lowStock: all().filter(function (x) {
        var r = daysRemaining(x); return r != null && r <= 7;
      })
    };
  }

  window.IgnytSupplements = {
    CATEGORIES: CATEGORIES, UNITS: UNITS, TIMINGS: TIMINGS, FREQUENCIES: FREQUENCIES,
    categoryById: categoryById, dayKey: dayKey,
    all: all, get: get, add: add, update: update, remove: remove,
    daysFor: daysFor, isDueOn: isDueOn, dueToday: dueToday,
    isTaken: isTaken, toggle: toggle, log: log,
    daysRemaining: daysRemaining, unitsPerDay: unitsPerDay,
    todayProgress: todayProgress, series: series, streak: streak, missed: missed, stats: stats
  };
})();
