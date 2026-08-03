/* =========================================================
   STRENGTH SCORE, LEVELS AND LIFETIME STATS

   Everything the Personal Records screen shows about "how strong am I" comes from here, and
   every number is defined rather than felt. A score nobody can explain is a score nobody
   should trust, so the formula is stated in one place and shown to the user on request.

   WHAT THE SCORE IS
       volume lifted (tonnes)  x 1
     + working sets / 10
     + PRs x 5
     + longest streak x 2

   It is a measure of accumulated work, not of how much someone can lift, and it is compared
   only against their own past. It is deliberately NOT a percentile: this app has no data
   about anyone else, so "stronger than 80% of users" would be an invention. The brief asked
   for levels named Beginner through Legend and those are here — as bands of this score, which
   is a statement about a user's own training history and nothing more.

   WHAT IS DELIBERATELY MISSING
   The brief asked each card to show "Estimated success 78%" for beating a record. There is no
   honest way to compute that. It would need fatigue, sleep, nutrition, programme context and
   a population model, none of which this app has, and a made-up probability that a user then
   fails to hit is worse than no number at all. What replaces it is the real gap — "+2.5 kg to
   beat it" — which is true, useful, and directly actionable.
========================================================= */

window.IgnytStrength = (function () {
  "use strict";

  var LEVELS = [
    { from: 0,    name: "Beginner",     color: "#94a3b8" },
    { from: 150,  name: "Novice",       color: "#22c55e" },
    { from: 500,  name: "Intermediate", color: "#2563eb" },
    { from: 1200, name: "Advanced",     color: "#7c3aed" },
    { from: 2500, name: "Elite",        color: "#f59e0b" },
    { from: 5000, name: "Legend",       color: "#ef4444" }
  ];

  /** The formula, in words, for showing next to the number. */
  var FORMULA = "Tonnes lifted + sets÷10 + PRs×5 + longest streak×2. It measures the work you have put in, and is only ever compared with your own past.";

  function score(s) {
    if (!s) return 0;
    var tonnes = (s.workoutLog || []).reduce(function (a, w) { return a + (w.volume || 0); }, 0) / 1000;
    var sets = (s.workoutLog || []).reduce(function (a, w) {
      return a + (w.exercises || []).reduce(function (x, e) { return x + ((e.sets || []).length); }, 0);
    }, 0);
    var prs = (s.prs || []).length;
    var streak = longestStreak(s);
    return Math.round(tonnes + sets / 10 + prs * 5 + streak * 2);
  }

  function level(forScore) {
    var out = LEVELS[0];
    for (var i = 0; i < LEVELS.length; i++) if (forScore >= LEVELS[i].from) out = LEVELS[i];
    return out;
  }

  /** How far into the current band, and what is next — a level with no visible next step
   *  stops motivating the moment it is reached. */
  function levelProgress(forScore) {
    var cur = level(forScore);
    var idx = LEVELS.indexOf(cur);
    var next = LEVELS[idx + 1] || null;
    if (!next) return { current: cur, next: null, percent: 100, toNext: 0 };
    var span = next.from - cur.from;
    return {
      current: cur, next: next,
      percent: Math.max(0, Math.min(100, Math.round((forScore - cur.from) / span * 100))),
      toNext: Math.max(0, next.from - forScore)
    };
  }

  function longestStreak(s) {
    var days = {};
    (s.workoutLog || []).forEach(function (w) {
      days[new Date(w.startedAt || w.date).toDateString()] = 1;
    });
    var list = Object.keys(days).map(function (d) { return new Date(d).getTime(); }).sort(function (a,b) { return a-b; });
    if (!list.length) return 0;
    var best = 1, run = 1;
    for (var i = 1; i < list.length; i++) {
      run = (list[i] - list[i-1] <= 86400000 * 1.5) ? run + 1 : 1;
      if (run > best) best = run;
    }
    return best;
  }

  /* ---- lifetime ------------------------------------------------------------------------ */

  function lifetime(s) {
    if (!s) return null;
    var log = s.workoutLog || [];
    var sets = 0, reps = 0, minutes = 0, volume = 0;
    var muscles = {};
    log.forEach(function (w) {
      minutes += w.durationMin || 0;
      volume += w.volume || 0;
      (w.exercises || []).forEach(function (e) {
        (e.sets || []).forEach(function (st) {
          sets++;
          reps += Number(st.reps) || 0;
        });
        if (typeof getMuscle === "function" && e.name) muscles[getMuscle(e.name)] = 1;
      });
    });
    return {
      workouts: log.length,
      volumeKg: Math.round(volume),
      sets: sets,
      reps: reps,
      hours: Math.round(minutes / 60 * 10) / 10,
      muscleGroups: Object.keys(muscles).length,
      prs: (s.prs || []).length,
      achievements: (s.achievements || []).length,
      longestStreak: longestStreak(s)
    };
  }

  /* ---- month over month, against the user's own previous month only ------------------- */

  function monthCompare(s) {
    if (!s) return null;
    var DAY = 86400000, now = Date.now();
    function slice(fromDaysAgo, toDaysAgo) {
      var lo = now - fromDaysAgo * DAY, hi = now - toDaysAgo * DAY;
      var w = (s.workoutLog || []).filter(function (x) {
        var t = new Date(x.startedAt || x.date).getTime(); return t >= lo && t < hi;
      });
      var p = (s.prs || []).filter(function (x) { return x.achievedAt >= lo && x.achievedAt < hi; });
      return {
        workouts: w.length,
        volumeKg: Math.round(w.reduce(function (a,x) { return a + (x.volume||0); }, 0)),
        prs: p.length
      };
    }
    var thisM = slice(30, 0), lastM = slice(60, 30);
    function delta(a, b) { return b === 0 ? null : Math.round((a - b) / b * 100); }
    return {
      thisMonth: thisM, lastMonth: lastM,
      volumeChangePct: delta(thisM.volumeKg, lastM.volumeKg),
      workoutChangePct: delta(thisM.workouts, lastM.workouts),
      prChange: thisM.prs - lastM.prs
    };
  }

  function prsThisMonth(s) {
    var cutoff = Date.now() - 30 * 86400000;
    return (s.prs || []).filter(function (p) { return p.achievedAt >= cutoff; }).length;
  }

  /* ---- per exercise ------------------------------------------------------------------- */

  /**
   * Everything known about one lift. Only from logged sets — nothing modelled.
   */
  function exerciseInsight(s, name) {
    if (!s || !name) return null;
    var sessions = 0, best = 0, totalW = 0, wCount = 0, lastAt = 0;
    /* Improvement is first-ever session against best-ever, both read from logged sets. An
       earlier version took "first" from the PR's previousValue and "best" from the sets,
       which mixes two sources and can report a LOSS to someone who has only improved —
       the PR carries the heaviest single lift, the sets carry every working weight. */
    var earliestAt = Infinity, earliestBest = 0;

    (s.workoutLog || []).forEach(function (w) {
      var found = false, sessionBest = 0;
      (w.exercises || []).forEach(function (e) {
        if (e.name !== name) return;
        found = true;
        (e.sets || []).forEach(function (st) {
          var kg = Number(st.weight) || 0;
          if (kg > 0) {
            totalW += kg; wCount++;
            if (kg > best) best = kg;
            if (kg > sessionBest) sessionBest = kg;
          }
        });
      });
      if (!found) return;
      sessions++;
      var t = new Date(w.startedAt || w.date).getTime();
      if (t > lastAt) lastAt = t;
      if (t < earliestAt && sessionBest > 0) { earliestAt = t; earliestBest = sessionBest; }
    });
    if (!sessions) return null;

    var prs = (s.prs || []).filter(function (p) { return p.exerciseName === name; })
                           .sort(function (a,b) { return a.achievedAt - b.achievedAt; });
    // A PR can be heavier than anything in the set log if history was imported or edited.
    var heaviest = best;
    prs.forEach(function (p) { if (p.type === "weight" && p.value > heaviest) heaviest = p.value; });

    return {
      name: name,
      sessions: sessions,
      bestKg: Math.round(heaviest * 10) / 10,
      averageKg: wCount ? Math.round(totalW / wCount * 10) / 10 : null,
      // Needs at least two sessions to mean anything: one session is a starting point, not a change.
      improvementKg: (sessions >= 2 && earliestBest > 0)
        ? Math.round((heaviest - earliestBest) * 10) / 10 : null,
      prCount: prs.length,
      lastTrainedAt: lastAt || null
    };
  }

  /**
   * What it would take to beat a record.
   * A real gap and a real next target — never a predicted chance of success, which this app
   * has no basis to estimate and which is demoralising to miss.
   */
  function nextTarget(pr) {
    if (!pr || !(pr.value > 0)) return null;
    if (pr.type === "reps") return { increment: 1, unit: "rep", target: pr.value + 1 };

    /* Session volume is a total, not a lift, so a plate increment is meaningless against it —
       "beat 5,200 kg by 2.5 kg" is not a target anyone can train toward. It gets the next
       round hundred instead, which is a session you can actually plan. */
    if (pr.type === "volume") {
      var next = Math.ceil((pr.value + 1) / 100) * 100;
      return { increment: next - pr.value, unit: "kg", target: next, proportional: true };
    }

    // 2.5 kg is the smallest jump most gyms can actually make with plates.
    var step = pr.value >= 40 ? 2.5 : 1;
    return { increment: step, unit: "kg", target: Math.round((pr.value + step) * 10) / 10 };
  }

  return {
    LEVELS: LEVELS, FORMULA: FORMULA,
    score: score, level: level, levelProgress: levelProgress,
    lifetime: lifetime, monthCompare: monthCompare, prsThisMonth: prsThisMonth,
    exerciseInsight: exerciseInsight, nextTarget: nextTarget, longestStreak: longestStreak
  };
})();
