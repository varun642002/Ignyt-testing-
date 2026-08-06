/* =========================================================
   IGNYT — HOME SCREEN WIDGET BRIDGE

   Builds the flat snapshot the native widgets render from, and pushes it when something they
   display has changed.

   WHY A PUSH AND NOT A PULL
   Widgets run in the launcher's process. They have no WebView, no JavaScript, and no way to
   read localStorage — so they can never ask this app a question. The only workable direction
   is this one: the app writes a snapshot, widgets render whatever was last written.

   WHY THIS IS THE BATTERY STORY
   Every widget declares updatePeriodMillis="0". Android's own periodic refresh cannot be set
   below 30 minutes and wakes the device whether or not anything changed. Pushing on change
   instead means a user who never opens IGNYT costs nothing at all, and one who logs a set sees
   it on the home screen immediately rather than up to half an hour later. Better on both axes,
   which is rare enough to be worth stating.

   THE PUSH IS GUARDED THREE WAYS, because render() runs on every tap:
     1. no widgets placed  -> skip entirely, the common case for most users
     2. snapshot unchanged -> skip, compared by value not by time
     3. debounced          -> a burst of state changes produces one write
========================================================= */
(function () {
  "use strict";

  var PLUGIN = "IgnytWidgets";
  var _lastJson = null;
  var _timer = null;
  var _placed = null;          // null = not yet asked
  var _lastPlacedCheck = 0;

  function plugin() {
    try {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[PLUGIN]) || null;
    } catch (e) { return null; }
  }

  function n(v) { var x = Number(v); return isFinite(x) ? x : null; }

  /* ---- the snapshot -------------------------------------------------------------------- */

  /**
   * Everything the ten widgets display, in one flat object.
   *
   * Missing values are emitted as null rather than 0, and every widget renders null as a dash.
   * "0 steps" and "Health Connect has not synced" are different facts; a step counter that
   * shows the first when it means the second is lying on someone's home screen.
   */
  function build() {
    /* Bare identifier, not window.state. `state` is a top-level const in app.js, and a
       top-level const lives in the global lexical scope rather than on window — window.state
       is permanently undefined. Reading it there made build() return null and the entire
       bridge quietly do nothing while every call still "succeeded". */
    var s = (typeof state !== "undefined") ? state : null;
    if (!s) return null;
    var snap = {};

    /* score + streak */
    try {
      var today = window.IgnytScore ? IgnytScore.today(s) : null;
      snap.score = {
        today: today ? Math.round(today.score) : null,
        target: 100,
        band: today && today.band ? today.band : "IGNYT Score",
        tasks: today && today.remaining ? today.remaining : ""
      };
    } catch (e) { snap.score = { today: null, target: 100 }; }

    try {
      var cur = typeof computeStreak === "function" ? computeStreak() : 0;
      var best = 0;
      try { best = window.IgnytStrength ? (IgnytStrength.longestStreak(s) || 0) : 0; } catch (e2) {}
      snap.streak = { current: cur || 0, best: Math.max(best || 0, cur || 0) };
    } catch (e) { snap.streak = { current: 0, best: 0 }; }

    /* today's session */
    try {
      var plan = typeof buildTodaysPlan === "function" ? buildTodaysPlan() : null;
      var live = s.session;
      var doneCount = 0, totalCount = 0;
      if (live && Array.isArray(live.exercises)) {
        totalCount = live.exercises.length;
        doneCount = live.exercises.filter(function (ex) {
          return (ex.sets || []).length && ex.sets.every(function (x) { return x.done; });
        }).length;
      } else if (plan && plan.exercises) {
        totalCount = plan.exercises.length;
      }
      snap.workout = {
        title: live ? (live.title || "Workout in progress")
             : (plan && !plan.isRest && plan.dayKey ? titleCaseDayKey(plan.dayKey) : ""),
        plan: plan && plan.template ? plan.template.name : "",
        done: doneCount, total: totalCount,
        inProgress: !!live
      };
    } catch (e) { snap.workout = { title: "", plan: "", done: 0, total: 0, inProgress: false }; }

    /* weight */
    try {
      var log = (s.bodylog || []).filter(function (b) { return b && n(b.weight); });
      var goal = null, pct = null;
      try {
        var g = window.IgnytGoals ? IgnytGoals.activeGoal() : null;
        if (g) {
          goal = n(g.targetWeight);
          if (log.length) pct = IgnytGoals.progressPct(g, n(log[0].weight));
        }
      } catch (e2) {}
      /* Week delta compares against the most recent entry at least 5 days old, not simply
         "the seventh row back" — someone who weighs in daily and someone who weighs in twice
         a month would otherwise get wildly different "weekly" numbers from the same code. */
      var weekDelta = null;
      if (log.length >= 2) {
        var cutoff = Date.now() - 5 * 86400000;
        var older = log.find(function (b) { return new Date(b.date + "T12:00:00").getTime() <= cutoff; });
        if (older) weekDelta = n(log[0].weight) - n(older.weight);
      }
      snap.weight = {
        current: log.length ? n(log[0].weight) : null,
        goal: goal, weekDelta: weekDelta, progressPct: pct,
        unit: typeof wUnit === "function" ? wUnit() : "kg"
      };
      /* Stored in kg; the widget shows whatever unit the app is set to, so convert here rather
         than teaching Kotlin about units. */
      if (snap.weight.unit === "lb") {
        ["current", "goal", "weekDelta"].forEach(function (k) {
          if (snap.weight[k] != null) snap.weight[k] = snap.weight[k] * 2.2046226218;
        });
      }
    } catch (e) { snap.weight = {}; }

    /* water */
    try {
      var todayKey = typeof todayStr === "function" ? todayStr() : "";
      var ml = (s.waterLog || []).filter(function (w) { return w && w.date === todayKey; })
                 .reduce(function (a, w) { return a + (n(w.ml) || 0); }, 0);
      snap.water = { ml: ml, goalMl: n(s.settings && s.settings.waterTargetMl) || 2500, bonus: 5 };
    } catch (e) { snap.water = { ml: 0, goalMl: 2500 }; }

    /* steps + sleep, from whatever Health Connect last synced */
    try {
      var hc = JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null");
      snap.steps = { today: hc && hc.steps ? n(hc.steps.steps) : null, goal: 10000 };
      var sleepHrs = hc && hc.sleep ? n(hc.sleep.hours) : null;
      if (sleepHrs == null) {
        var bl = (s.bodylog || []).find(function (b) { return b && n(b.sleep); });
        if (bl) sleepHrs = n(bl.sleep);
      }
      snap.sleep = { hours: sleepHrs, source: sleepHrs == null ? "Sleep" : "Last night" };
    } catch (e) { snap.steps = { today: null, goal: 10000 }; snap.sleep = { hours: null }; }

    /* recovery */
    try {
      var rec = window.IgnytCoachRecovery ? IgnytCoachRecovery.assess(s) : null;
      snap.recovery = { score: rec && isFinite(rec.score) ? Math.round(rec.score) : null };
    } catch (e) { snap.recovery = { score: null }; }

    /* macros */
    try {
      var dk = typeof todayStr === "function" ? todayStr() : "";
      var meals = (s.foodLog || []).filter(function (f) { return f && f.date === dk; });
      var sum = function (k) { return meals.reduce(function (a, f) { return a + (n(f[k]) || 0); }, 0); };
      var target = null;
      try { target = typeof profileCalorieTarget === "function" ? profileCalorieTarget() : null; } catch (e2) {}
      snap.macros = {
        kcal: meals.length ? Math.round(sum("kcal")) : null,
        kcalTarget: target ? Math.round(target) : null,
        protein: meals.length ? Math.round(sum("p")) : null,
        carbs: meals.length ? Math.round(sum("c")) : null,
        fat: meals.length ? Math.round(sum("f")) : null
      };
    } catch (e) { snap.macros = {}; }

    /* motivation — keyed to the date so the widget rotates each morning without a timer */
    try {
      var d = new Date();
      snap.motivation = {
        quote: (window.IgnytMessages && IgnytMessages.forDay(d.getHours() < 12 ? "morning" : "daily")) ||
               "Today is another chance to get stronger.",
        date: d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })
      };
    } catch (e) { snap.motivation = {}; }

    /* coach */
    try {
      var rc = window.IgnytCoachEngine ? IgnytCoachEngine.recommend(s) : null;
      snap.coach = {
        headline: rc && rc.action ? rc.action : (snap.workout.plan || "Open IGNYT for today's plan"),
        detail: rc && rc.detail ? rc.detail : (snap.workout.title || ""),
        why: rc && rc.why ? rc.why : ""
      };
    } catch (e) { snap.coach = {}; }

    return snap;
  }

  /* ---- pushing -------------------------------------------------------------------------- */

  function push(force) {
    var p = plugin();
    if (!p) return Promise.resolve(false);

    return placedCount().then(function (placed) {
      /* Nobody has a widget: do no work at all. This is the common case, and it is the
         difference between a feature that costs every user something and one that costs only
         the users who asked for it. */
      if (!placed && !force) return false;

      var snap = build();
      if (!snap) return false;
      var json = JSON.stringify(snap);
      if (json === _lastJson && !force) return false;   // value comparison, not a timestamp
      _lastJson = json;
      return p.push({ data: snap }).then(function () { return true; }).catch(function () { return false; });
    }).catch(function () { return false; });
  }

  /** Debounced. render() fires on every tap; the widgets do not need to know about each one. */
  function schedule() {
    if (!plugin()) return;
    clearTimeout(_timer);
    _timer = setTimeout(function () { push(false); }, 1200);
  }

  function placedCount() {
    var p = plugin();
    if (!p) return Promise.resolve(0);
    /* Cached for a minute. Asking the AppWidgetManager on every render would be a Binder round
       trip per tap, which is exactly the kind of cost this module exists to avoid. */
    if (_placed !== null && Date.now() - _lastPlacedCheck < 60000) return Promise.resolve(_placed);
    return p.status().then(function (r) {
      _placed = (r && r.data && r.data.placed) || 0;
      _lastPlacedCheck = Date.now();
      return _placed;
    }).catch(function () { return 0; });
  }

  /* ---- draining widget taps -------------------------------------------------------------- */

  /**
   * Applies anything queued by a widget while the app was closed.
   *
   * A widget cannot write to localStorage, so "+250ml" records intent and this turns it into a
   * real entry. Each queued action carries its own timestamp and is logged against the day it
   * was TAPPED, not today — tapping at 11pm and opening the app the next morning must not move
   * the water into the wrong day.
   */
  function drain() {
    var p = plugin();
    if (!p || typeof state === "undefined") return Promise.resolve(0);
    return p.drainActions().then(function (r) {
      var actions = (r && r.data && r.data.actions) || [];
      if (!actions.length) return 0;
      var applied = 0;
      actions.forEach(function (a) {
        if (a && a.type === "water" && Number(a.amount) > 0) {
          try {
            var when = a.at ? new Date(a.at) : new Date();
            var key = typeof dayKey === "function" ? dayKey(when) : new Date().toISOString().slice(0, 10);
            state.waterLog = state.waterLog || [];
            state.waterLog.push({ id: Date.now() + Math.random(), date: key, ml: Number(a.amount) });
            applied++;
          } catch (e) {}
        }
      });
      if (applied) {
        try { persist(); } catch (e) {}
        try { if (typeof render === "function") render(); } catch (e) {}
        push(true);
      }
      return applied;
    }).catch(function () { return 0; });
  }

  /* ---- deep links ------------------------------------------------------------------------ */

  /**
   * Consumes the destination MainActivity wrote to window.__ignytWidget.
   *
   * A property, not an event, and that is deliberate — the same reason the notification route
   * uses one. On a cold start the WebView may not exist when the intent arrives, and an event
   * fired at nobody is lost, which is the "widget tap does nothing the first time" bug.
   * Cleared once read so a reload cannot re-navigate somewhere the user did not just ask for.
   */
  function consumeDeepLink() {
    var w = null;
    try { w = window.__ignytWidget; } catch (e) {}
    if (!w || !w.dest) return false;
    try { delete window.__ignytWidget; } catch (e) { window.__ignytWidget = null; }
    try {
      var map = { home: "home", workout: "workout", nutrition: "nutrition", progress: "progress" };
      var tab = map[w.dest] || "home";
      state.tab = tab; state.page = tab;
      if (w.action === "start" && tab === "workout" && !state.session) {
        var btn = null;
        if (typeof render === "function") render();
        /* Fires the plan card's own start handler rather than duplicating session creation —
           two places building a session is how they end up disagreeing about its shape. */
        setTimeout(function () {
          btn = document.querySelector('[data-action="start-planned-session"]');
          if (btn) btn.click();
        }, 60);
        return true;
      }
      if (typeof render === "function") render();
      return true;
    } catch (e) { return false; }
  }

  window.IgnytWidgets = {
    push: push, schedule: schedule, build: build, drain: drain,
    consumeDeepLink: consumeDeepLink, placedCount: placedCount,
    available: function () { return !!plugin(); }
  };
})();
