/* =========================================================
   WEEKLY CHALLENGE MODE

   One challenge a week, Monday to Sunday, with a target set from the user's own recent
   history and progress measured against real logs.

   WHY THE TARGET IS PERSONAL AND NOT FIXED
   "Six workouts this week" is trivial for one person and impossible for another, and a
   challenge nobody can finish is just a weekly reminder that they are failing. Every target
   here is derived from what this user actually did over the previous four weeks: usually
   their own average plus one, floored so it still asks for something and capped so it stays
   humane. Someone with no history gets a stated starter target instead of an invented one.

   WHY ONE CHALLENGE AND NOT FIVE
   Five weekly goals is a list of chores. One is a challenge. The daily challenges in
   review.js already cover breadth — this covers commitment.

   THE WEEK IS ISO, MONDAY-BASED
   A challenge that resets midweek is not a weekly challenge. The key is year-Www so the
   same week always resolves to the same challenge and the same XP award, and XP is keyed on
   it so a completed week pays exactly once no matter how often the screen repaints.

   NOTHING IS EVER PUNISHED
   A missed week simply ends. There is no penalty, no lost progress and no broken-streak
   message — the next Monday starts a new one.
========================================================= */

window.IgnytWeekly = (function () {
  "use strict";

  var DAY = 86400000;

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

  /** Monday 00:00 of the week containing d. */
  function weekStart(d) {
    var x = new Date(d || Date.now());
    x.setHours(0,0,0,0);
    var dow = (x.getDay() + 6) % 7;        // Monday = 0
    x.setDate(x.getDate() - dow);
    return x;
  }

  /**
   * Monday-based week key, e.g. "2026-W31". Used for the challenge choice and the XP key.
   *
   * The week number is counted in whole DAYS, not milliseconds. Dividing a millisecond
   * difference by 7 days looks equivalent and is not: on a daylight-saving weekend the gap
   * between two Mondays is 7 days ± 1 hour, and the floor of that can land two consecutive
   * weeks on the same number — which would hand them the same challenge and, worse, the same
   * XP key, so the second week would pay nothing. Rounding a day count cannot do that.
   *
   * This is not strictly ISO 8601 week numbering (that has rules about which week owns
   * January 1st). It does not need to be. It only needs to be stable for seven days, unique,
   * and increasing, and it is all three.
   */
  function weekKey(d) {
    var start = weekStart(d);
    var jan1 = new Date(start.getFullYear(), 0, 1);
    var days = Math.round((start - jan1) / DAY);
    return start.getFullYear() + "-W" + String(Math.floor(days / 7) + 1).padStart(2, "0");
  }

  function daysLeft() {
    var end = weekStart().getTime() + 7 * DAY;
    return Math.max(0, Math.ceil((end - Date.now()) / DAY));
  }

  /* ---- reading the logs ---------------------------------------------------------------- */

  function sessionsBetween(s, from, to) {
    return (s.workoutLog || []).filter(function (w) {
      var t = new Date(w.startedAt || w.date).getTime();
      return t >= from && t < to;
    });
  }

  function foodBetween(s, from, to) {
    return (s.foodLog || []).filter(function (f) {
      var t = new Date(f.date + "T12:00:00").getTime();
      return t >= from && t < to;
    });
  }

  /* Distinct days in [from,to) on which the predicate holds for that day's entries.
     Walks with setDate() rather than adding 86,400,000 ms, so a daylight-saving change cannot
     make the cursor skip a day or land on the same one twice. */
  function daysMatching(s, from, to, forDay) {
    var n = 0, cur = new Date(from), end = new Date(to), now = Date.now();
    while (cur.getTime() < end.getTime() && cur.getTime() < now + DAY) {
      /* Anchored to noon before keying. cur is a LOCAL midnight, and midnight in a UTC+
         timezone is the previous day in UTC -- keying it directly would shift the whole week
         back by one. Noon is far enough from both edges to land on the intended day for any
         real offset. This is the only place that walks days rather than reading a stored one. */
      var anchored = new Date(cur); anchored.setHours(12, 0, 0, 0);
      if (forDay(dateKey(anchored))) n++;
      cur.setDate(cur.getDate() + 1);
    }
    return n;
  }

  function scoreHistory() {
    try { return JSON.parse(localStorage.getItem("hx_score_history") || "{}") || {}; }
    catch (e) { return {}; }
  }

  /* ---- the four previous weeks, for setting a fair target ------------------------------- */

  /**
   * The user's own baseline. Averaged over the four completed weeks BEFORE this one — the
   * current week is excluded, because a target that moves as you train it is not a target.
   */
  function baseline(s) {
    var thisWeek = weekStart().getTime();
    var weeks = [];
    for (var i = 1; i <= 4; i++) {
      var from = thisWeek - i * 7 * DAY, to = from + 7 * DAY;
      var sess = sessionsBetween(s, from, to);
      var food = foodBetween(s, from, to);
      var days = {};
      sess.forEach(function (w) { days[dateKey(new Date(w.startedAt || w.date))] = 1; });
      food.forEach(function (f) { days[f.date] = 1; });
      weeks.push({
        workouts: sess.length,
        volumeKg: sess.reduce(function (a, w) { return a + (w.volume || 0); }, 0),
        minutes: sess.reduce(function (a, w) { return a + (w.durationMin || 0); }, 0),
        activeDays: Object.keys(days).length,
        hadData: sess.length > 0 || food.length > 0
      });
    }
    var known = weeks.filter(function (w) { return w.hadData; });
    if (!known.length) return null;                 // no history: starter targets, stated as such
    function avg(k) { return known.reduce(function (a, w) { return a + w[k]; }, 0) / known.length; }
    return {
      weeksOfHistory: known.length,
      workouts: avg("workouts"),
      volumeKg: avg("volumeKg"),
      minutes: avg("minutes"),
      activeDays: avg("activeDays"),
      bestVolumeKg: Math.max.apply(null, known.map(function (w) { return w.volumeKg; }))
    };
  }

  /* ---- the challenges ------------------------------------------------------------------ */

  /* Each returns {target, unit} from the baseline, and measures its own progress. A challenge
     whose target cannot be set honestly returns null and is skipped for that user — better a
     different challenge than a made-up number. */
  var POOL = [
    {
      id: "workouts", icon: "🔥", name: "Train more than usual",
      describe: function (t) { return "Complete " + t + " workout" + (t !== 1 ? "s" : "") + " this week"; },
      target: function (b) {
        // One more than usual, but never fewer than 3 and never more than 6 — past six the
        // challenge stops being ambitious and starts being bad advice.
        if (!b) return 3;
        return Math.max(3, Math.min(6, Math.round(b.workouts) + 1));
      },
      progress: function (s, from, to) { return sessionsBetween(s, from, to).length; },
      unit: "workouts"
    },
    {
      id: "volume", icon: "🏋️", name: "Beat your best week",
      describe: function (t) { return "Lift " + Number(t).toLocaleString() + " kg in total this week"; },
      target: function (b) {
        if (!b || !(b.bestVolumeKg > 0)) return null;       // no lifting history to beat
        return Math.ceil(b.bestVolumeKg * 1.05 / 100) * 100; // 5% up, rounded to a plannable hundred
      },
      progress: function (s, from, to) {
        return Math.round(sessionsBetween(s, from, to).reduce(function (a, w) { return a + (w.volume || 0); }, 0));
      },
      unit: "kg"
    },
    {
      id: "activeDays", icon: "📅", name: "Show up all week",
      describe: function (t) { return "Log something on " + t + " different days"; },
      target: function (b) { return b ? Math.max(4, Math.min(7, Math.round(b.activeDays) + 1)) : 4; },
      progress: function (s, from, to) {
        var days = {};
        sessionsBetween(s, from, to).forEach(function (w) { days[dateKey(new Date(w.startedAt || w.date))] = 1; });
        foodBetween(s, from, to).forEach(function (f) { days[f.date] = 1; });
        return Object.keys(days).length;
      },
      unit: "days"
    },
    {
      id: "minutes", icon: "⏱️", name: "Put the hours in",
      describe: function (t) { return "Train for " + t + " minutes this week"; },
      target: function (b) {
        if (!b || !(b.minutes > 0)) return null;
        return Math.ceil((b.minutes * 1.1) / 15) * 15;      // 10% up, to the nearest quarter hour
      },
      progress: function (s, from, to) {
        return Math.round(sessionsBetween(s, from, to).reduce(function (a, w) { return a + (w.durationMin || 0); }, 0));
      },
      unit: "min"
    },
    {
      id: "protein", icon: "🥩", name: "Hit protein all week",
      describe: function (t) { return "Reach your protein target on " + t + " days"; },
      target: function (b, s) {
        // Needs a bodyweight to have a protein target at all.
        return (s && s.profile && s.profile.weight > 0) ? 5 : null;
      },
      progress: function (s, from, to) {
        var need = (s.profile && s.profile.weight || 0) * 1.6;
        if (!need) return 0;
        var byDay = {};
        foodBetween(s, from, to).forEach(function (f) {
          byDay[f.date] = (byDay[f.date] || 0) + (Number(f.protein) || 0);
        });
        return daysMatching(s, from, to, function (k) { return (byDay[k] || 0) >= need; });
      },
      unit: "days"
    },
    {
      id: "water", icon: "💧", name: "Stay hydrated",
      describe: function (t) { return "Hit your water goal on " + t + " days"; },
      target: function () { return 5; },
      progress: function (s, from, to) {
        var need = (s.settings && s.settings.waterTargetMl) || 2500;
        var byDay = {};
        (s.waterLog || []).forEach(function (w) { byDay[w.date] = (byDay[w.date] || 0) + (w.ml || 0); });
        return daysMatching(s, from, to, function (k) { return (byDay[k] || 0) >= need; });
      },
      unit: "days"
    },
    {
      id: "score", icon: "⭐", name: "Keep the score up",
      describe: function (t) { return "Score 70 or more on " + t + " days"; },
      target: function (b, s) {
        // Only offered once there is a week of scores to know it is reachable.
        var h = scoreHistory();
        return Object.keys(h).length >= 7 ? 4 : null;
      },
      progress: function (s, from, to) {
        var h = scoreHistory();
        var live = window.IgnytScore ? IgnytScore.today(s).score : null;
        var todayKey = dateKey();
        return daysMatching(s, from, to, function (k) {
          var v = (k === todayKey && live != null) ? Math.max(live, h[k] || 0) : h[k];
          return v != null && v >= 70;
        });
      },
      unit: "days"
    }
  ];

  /* ---- this week ----------------------------------------------------------------------- */

  /**
   * The current week's challenge, or null if none can be set honestly.
   * @returns {object|null} {id, icon, name, label, target, current, unit, percent, done,
   *                         daysLeft, weekKey, personalised, xp}
   */
  function current(s) {
    if (!s) return null;
    var b = baseline(s);
    var key = weekKey();

    /* Only challenges that can state a real target for THIS user are eligible, then one is
       chosen by the week number so it is stable all week and rotates from week to week. */
    var eligible = POOL.map(function (c) {
      var target = c.target(b, s);
      return target ? { def: c, target: target } : null;
    }).filter(Boolean);
    if (!eligible.length) return null;

    var n = Number(key.split("-W")[1]) || 0;
    var pick = eligible[n % eligible.length];

    var from = weekStart().getTime(), to = from + 7 * DAY;
    var cur = pick.def.progress(s, from, to);
    var done = cur >= pick.target;

    return {
      id: pick.def.id,
      icon: pick.def.icon,
      name: pick.def.name,
      label: pick.def.describe(pick.target),
      target: pick.target,
      current: cur,
      unit: pick.def.unit,
      percent: Math.max(0, Math.min(100, Math.round(cur / pick.target * 100))),
      done: done,
      daysLeft: daysLeft(),
      weekKey: key,
      /* Told to the user plainly. A target built from four weeks of their own training is a
         different promise from a starter number, and conflating the two is how "personalised"
         becomes a marketing word. */
      personalised: !!b,
      weeksOfHistory: b ? b.weeksOfHistory : 0,
      xp: (window.IgnytXP && IgnytXP.AWARDS.weeklyChallenge) ? IgnytXP.AWARDS.weeklyChallenge.xp : 250
    };
  }

  /**
   * Pays and celebrates a finished week, exactly once.
   * Safe to call from a render path: the XP ledger is keyed on the week, so repainting the
   * screen cannot award twice.
   */
  function settle(s) {
    var c = current(s);
    if (!c || !c.done) return c;
    var awarded = window.IgnytXP ? IgnytXP.award("weeklyChallenge", c.weekKey) : null;
    if (awarded && window.IgnytCelebrate) {
      IgnytCelebrate.celebrate({
        kind: "milestone",
        icon: c.icon,
        title: "Weekly challenge complete",
        body: c.label + " — done.",
        stat: "+" + awarded.xp + " XP"
      });
    }
    return c;
  }

  /** Completed weekly challenges, newest first — the record of weeks held together. */
  function history() {
    var ledger = {};
    try { ledger = JSON.parse(localStorage.getItem("hx_xp_ledger") || "{}") || {}; }
    catch (e) { return []; }
    return Object.keys(ledger)
      .filter(function (id) { return id.indexOf("weeklyChallenge:") === 0; })
      .map(function (id) { return { weekKey: id.split(":")[1], at: ledger[id].at || null }; })
      .sort(function (a, b) { return a.weekKey < b.weekKey ? 1 : -1; });
  }

  return {
    POOL: POOL,
    weekStart: weekStart, weekKey: weekKey, daysLeft: daysLeft,
    baseline: baseline, current: current, settle: settle, history: history
  };
})();
