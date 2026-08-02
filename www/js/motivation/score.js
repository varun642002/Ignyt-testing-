/* =========================================================
   THE IGNYT SCORE — one number for how today went.

   Points for things the app can actually see, a level band, and a coach that says exactly
   what is still available and what each thing is worth.

   WHAT IS SCORED AND WHAT IS NOT
   Every action below is detected from something already logged: a finished workout, a meal,
   a weigh-in, water, or steps and sleep from Health Connect. The brief also asked for
   meditation. It is not here, because IGNYT has no meditation tracking of any kind — awarding
   points for it would mean either never awarding them, or awarding them for nothing. Stretching
   IS scored, because the exercise library has a Mobility / Stretch category and a logged
   session from it is a real signal.

   HISTORY IS STORED, NOT RECOMPUTED
   Each day's score is written down when the day is scored. Recomputing yesterday from today's
   settings would let a changed goal or water target silently rewrite a week of history, and a
   score that moves after the fact is a score nobody can trust.

   PERSONALISATION AND WHAT IT COSTS
   The brief asked scoring to adapt to the user's goal, so a weight-loss user earns more from
   calorie adherence and steps, and a muscle-gain user more from protein and strength. That is
   implemented — but it means the same behaviour scores differently under different goals, so
   the number is only comparable with the user's own past, never with anyone else's. Nothing in
   this app compares users, so that is a cost worth paying.

   THE FLOOR IS DELIBERATE
   There are no negative points and nothing is ever deducted. A bad day scores low; it does not
   score against you.
========================================================= */

window.IgnytScore = (function () {
  "use strict";

  var HISTORY_KEY = "hx_score_history";
  var DAILY_CAP = 200;          // headroom above the ~162 a perfect day earns

  var ACTIONS = {
    workout:     { points: 30, label: "Workout completed" },
    strength:    { points: 15, label: "Strength session" },
    cardio:      { points: 15, label: "Cardio session" },
    sleep:       { points: 15, label: "Sleep goal" },
    steps:       { points: 20, label: "Step goal" },
    protein:     { points: 10, label: "Protein goal" },
    calories:    { points: 10, label: "Calories on target" },
    water:       { points: 10, label: "Water goal" },
    challenge:   { points: 10, label: "Daily challenge" },
    weight:      { points: 5,  label: "Weight logged" },
    stretch:     { points: 5,  label: "Mobility work" },
    streak:      { points: 5,  label: "Streak bonus" },
    meals:       { points: 3,  label: "Meal logged", per: true, max: 4 }
  };

  var LEVELS = [
    { from: 0,   name: "Needs Improvement", color: "#94a3b8", line: "Plenty of the day left. One small thing moves this." },
    { from: 40,  name: "Good Start",        color: "#22c55e", line: "Good start. A couple more and this becomes a strong day." },
    { from: 70,  name: "Great Progress",    color: "#0891b2", line: "Solid day. You're doing the things that add up." },
    { from: 100, name: "Excellent",         color: "#2563eb", line: "Excellent day. This is what a consistent week looks like." },
    { from: 130, name: "Elite",             color: "#7c3aed", line: "Outstanding. Almost everything you could log today is logged." },
    { from: 160, name: "Legendary",         color: "#f59e0b", line: "A near-perfect day. Rare, and entirely yours." }
  ];

  /* Which two things a goal rewards more. 1.5x on two categories, nothing reduced — the point
     is to point someone at what matters for their goal, not to punish them for the rest. */
  var GOAL_EMPHASIS = [
    { match: /lose|fat loss|recomposition/i,               keys: ["calories", "steps"] },
    { match: /build muscle|hypertrophy|bodybuilding/i,     keys: ["protein", "strength"] },
    { match: /strength|power|powerlifting/i,               keys: ["strength", "protein"] },
    { match: /endurance|stamina|marathon|10k|5k|running/i, keys: ["cardio", "steps"] },
    { match: /hyrox|cross training|ocr|functional/i,       keys: ["workout", "cardio"] },
    { match: /mobility|flexibility/i,                      keys: ["stretch", "workout"] }
  ];

  function emphasisFor(goal) {
    if (!goal) return [];
    for (var i = 0; i < GOAL_EMPHASIS.length; i++) {
      if (GOAL_EMPHASIS[i].match.test(goal)) return GOAL_EMPHASIS[i].keys;
    }
    return [];
  }

  /* Day keys must match the ones the app WRITES.

     app.js stamps every food and water entry with todayStr() -- new Date().toISOString()
     .slice(0,10), a UTC date -- and computeStreak()/activityDates() key off the same UTC
     slice, so the app is internally consistent. This module built its key from
     getFullYear()/getMonth()/getDate() instead, a LOCAL date, and the two disagree for as
     long as the timezone is ahead of UTC: in IST, every day from 00:00 to 05:30.

     Measured live at 00:16 IST: 5,600 ml of water and a logged meal, both invisible to the
     score, because it was looking for "2026-08-03" while the app had written "2026-08-02".
     Water and meals vanished from the breakdown for five and a half hours a day.

     One formatting rule, identical to the app's, for both the no-argument and the with-date
     case -- an earlier attempt at this fix noon-anchored the with-date path and left the
     no-argument path alone, which made dateKey() and dateKey(today) disagree inside the very
     window it was meant to fix. */
  function dateKey(d) {
    return (d ? new Date(d) : new Date()).toISOString().slice(0, 10);
  }

  function healthCache() {
    try { return JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null"); }
    catch (e) { return null; }
  }

  /* ---- what happened today ------------------------------------------------------------ */

  /**
   * Which actions are done, from real logs. Anything the app cannot see is absent rather than
   * assumed false — sleep with no Health Connect data is "unknown", and an unknown is not
   * offered as a suggestion, because telling someone to log something they cannot log is worse
   * than staying quiet.
   */
  function detect(s) {
    var today = dateKey();
    var out = { done: {}, unavailable: {} };
    if (!s) return out;

    var sessions = (s.workoutLog || []).filter(function (w) {
      return dateKey(new Date(w.startedAt || w.date)) === today;
    });
    if (sessions.length) out.done.workout = 1;

    // Session kind, from the exercise library's own categories — not guessed from the name.
    sessions.forEach(function (w) {
      (w.exercises || []).forEach(function (e) {
        /* The rebuilt exercise library records "Cardio" and "Mobility" as primary muscles, so
           getMuscle() answers what kind of work this was without a second lookup table. */
        var muscle = typeof getMuscle === "function" ? getMuscle(e.name) : null;
        if (muscle === "Cardio") out.done.cardio = 1;
        else if (muscle === "Mobility") out.done.stretch = 1;
        else if (muscle) out.done.strength = 1;
      });
    });

    var meals = (s.foodLog || []).filter(function (f) { return f.date === today; });
    if (meals.length) out.done.meals = Math.min(ACTIONS.meals.max, meals.length);

    if ((s.bodylog || []).some(function (b) { return dateKey(new Date(b.date)) === today; })) out.done.weight = 1;

    var waterMl = (s.waterLog || []).filter(function (w) { return w.date === today; })
                    .reduce(function (a, w) { return a + (w.ml || 0); }, 0);
    var waterTarget = (s.settings && s.settings.waterTargetMl) || 2500;
    if (waterMl >= waterTarget) out.done.water = 1;

    var bodyweight = (s.profile && s.profile.weight) || 0;
    if (bodyweight > 0) {
      var protein = meals.reduce(function (a, f) { return a + (Number(f.protein) || 0); }, 0);
      if (protein >= bodyweight * 1.6) out.done.protein = 1;
    } else { out.unavailable.protein = "Set your weight to track a protein target"; }

    var kcal = meals.reduce(function (a, f) { return a + (Number(f.calories) || 0); }, 0);
    var kcalTarget = typeof profileCalorieTarget === "function" ? profileCalorieTarget() : 0;
    if (kcalTarget > 0 && kcal > 0 && Math.abs(kcal - kcalTarget) / kcalTarget <= 0.05) out.done.calories = 1;

    var hc = healthCache();
    var steps = hc && hc.steps ? hc.steps.steps : null;
    if (steps == null) out.unavailable.steps = "Connect Health Connect for steps";
    else if (steps >= 10000) out.done.steps = 1;

    var sleepMin = hc && hc.sleep ? hc.sleep.minutes : null;
    if (sleepMin == null) out.unavailable.sleep = "Connect Health Connect for sleep";
    else if (sleepMin >= 7 * 60) out.done.sleep = 1;

    if (typeof computeStreak === "function" && computeStreak() >= 3) out.done.streak = 1;

    if (window.IgnytReview) {
      var ch = IgnytReview.challenges(s) || [];
      if (ch.length && ch.every(function (c) { return c.done; })) out.done.challenge = 1;
    }
    return out;
  }

  /** Today's score, its parts, and its level. */
  function today(s) {
    var d = detect(s);
    var emphasis = emphasisFor(s && s.onboarding && s.onboarding.primaryGoal);
    var breakdown = [], total = 0;

    Object.keys(ACTIONS).forEach(function (key) {
      var def = ACTIONS[key];
      var count = d.done[key] || 0;
      if (!count) return;
      var base = def.per ? def.points * count : def.points;
      var boosted = emphasis.indexOf(key) !== -1;
      var pts = boosted ? Math.round(base * 1.5) : base;
      total += pts;
      breakdown.push({ key: key, label: def.label, points: pts, boosted: boosted, count: count });
    });

    total = Math.min(DAILY_CAP, total);
    return {
      score: total,
      level: levelFor(total),
      breakdown: breakdown.sort(function (a, b) { return b.points - a.points; }),
      done: d.done,
      unavailable: d.unavailable,
      emphasis: emphasis
    };
  }

  function levelFor(n) {
    var out = LEVELS[0];
    for (var i = 0; i < LEVELS.length; i++) if (n >= LEVELS[i].from) out = LEVELS[i];
    return out;
  }

  function nextLevel(n) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].from > n) return LEVELS[i];
    return null;
  }

  /* ---- the coach ---------------------------------------------------------------------- */

  /**
   * What is still available today, largest first, with what each is worth.
   * Things the app cannot measure are excluded — suggesting "log your sleep" to someone
   * without Health Connect is an instruction they cannot follow.
   */
  function suggestions(s, pre) {
    var t = pre || today(s);
    var emphasis = t.emphasis;
    var out = [];
    Object.keys(ACTIONS).forEach(function (key) {
      if (t.done[key] && !(ACTIONS[key].per && t.done[key] < ACTIONS[key].max)) return;
      if (t.unavailable[key]) return;
      if (key === "streak") return;             // earned by history, not by an action today
      var def = ACTIONS[key];
      var remaining = def.per ? (def.max - (t.done[key] || 0)) : 1;
      var base = def.per ? def.points * remaining : def.points;
      var pts = emphasis.indexOf(key) !== -1 ? Math.round(base * 1.5) : base;
      out.push({ key: key, label: def.per ? "Log " + remaining + " more meal" + (remaining!==1?"s":"") : def.label, points: pts });
    });
    return out.sort(function (a, b) { return b.points - a.points; });
  }

  /** One line naming the gap to the next band, when there is one worth naming. */
  function coachLine(s, pre) {
    var t = pre || today(s);
    var next = nextLevel(t.score);
    if (!next) return t.level.line;
    var gap = next.from - t.score;
    var available = suggestions(s, t).reduce(function (a, x) { return a + x.points; }, 0);
    if (available < gap) return t.level.line;   // do not promise a band that is out of reach
    return "You're " + gap + " point" + (gap!==1?"s":"") + " from " + next.name + ".";
  }

  /* ---- history ------------------------------------------------------------------------ */

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  /** Writes today's score down. Called on render; only ever raises the stored value, because
   *  a day's score should not fall because a meal was corrected late in the evening. */
  function record(s, pre) {
    var t = pre || today(s);
    var h = readHistory();
    var k = dateKey();
    if (!h[k] || t.score > h[k]) {
      h[k] = t.score;
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) { /* non-fatal */ }
    }
    return t;
  }

  function stats(s, pre) {
    var h = readHistory();
    var k = dateKey();
    var t = (pre || today(s)).score;
    var yKey = dateKey(new Date(Date.now() - 86400000));
    var vals = Object.keys(h).map(function (d) { return h[d]; });
    var best = vals.length ? Math.max.apply(null, vals.concat([t])) : t;

    function avg(days) {
      var sum = 0, n = 0;
      for (var i = 0; i < days; i++) {
        var key = dateKey(new Date(Date.now() - i * 86400000));
        var v = (key === k) ? t : h[key];
        if (v != null) { sum += v; n++; }
      }
      return n ? Math.round(sum / n) : null;
    }

    // Consecutive days scoring at least 40 — "Good Start" or better.
    var streak = 0;
    for (var i = 0; i < 400; i++) {
      var key = dateKey(new Date(Date.now() - i * 86400000));
      var v = (key === k) ? t : h[key];
      if (v != null && v >= 40) streak++;
      /* Today is skipped over rather than counted against: at 9am nobody has scored 40 yet, and
         a streak that reads 0 every morning and 12 every evening is not a streak. Yesterday and
         earlier do end it. */
      else if (i > 0) break;
    }

    return {
      today: t, yesterday: h[yKey] != null ? h[yKey] : null,
      best: best, weekAverage: avg(7), monthAverage: avg(30), streak: streak,
      daysRecorded: Object.keys(h).length
    };
  }

  /**
   * Everything a screen needs, from ONE pass over the logs.
   *
   * The four calls below each used to recompute today() — six walks of the whole workout and
   * food log to draw one ring. A cache was the obvious fix and the wrong one: state is mutated
   * and re-rendered inside a single synchronous block (log a meal, call render()), so any cache
   * keyed on the state object hands back a score from before the meal. Verified in the running
   * app — 60g of protein logged, score stayed at 77 instead of moving to 92. Computing once and
   * passing the result down has the same cost and cannot go stale.
   */
  function summary(s) {
    var t = record(s);                       // scores the day and writes it to history
    return {
      today: t,
      score: t.score,
      level: t.level,
      stats: stats(s, t),
      suggestions: suggestions(s, t),
      coachLine: coachLine(s, t)
    };
  }

  return {
    ACTIONS: ACTIONS, LEVELS: LEVELS, DAILY_CAP: DAILY_CAP,
    detect: detect, today: today, levelFor: levelFor, nextLevel: nextLevel,
    suggestions: suggestions, coachLine: coachLine,
    record: record, stats: stats, summary: summary,
    /** Test seam. */
    _reset: function () { try { localStorage.removeItem(HISTORY_KEY); } catch (e) {} }
  };
})();
