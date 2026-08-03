/* =========================================================
   IGNYT COACH — PROGRESSIVE OVERLOAD ENGINE

   Answers one question per exercise: what should the next session's numbers be?

   Everything it reads is already logged. It asks the user for nothing new, invents no data,
   and returns null rather than guessing when there is not enough history to say anything
   honest. "Add 2.5kg" produced from a single session is not a recommendation, it is a coin
   flip with a decimal point.

   DOUBLE PROGRESSION IS THE DEFAULT, AND WHY
   Reps climb to the top of the prescribed range at a fixed load; then load climbs and reps
   reset to the bottom. It is the most reliable rule available to a system that cannot watch
   bar speed or see a grinding rep. Pure linear loading (add weight every session regardless)
   works for about six weeks on a true beginner and then produces a stall it cannot detect,
   because it never asked whether the reps were actually completed.

   WHAT COUNTS AS A SET, AND WHAT DOES NOT
   Only type === "working" is progression data. This is not a detail — the app logs four set
   types and three of them would actively corrupt the signal:

     warmup   deliberately light. Averaging it in drags every number down.
     drop     deliberately lighter than the working set, immediately after it. Reading a drop
              set as "the last set was 40% lighter" looks exactly like a regression.
     failure  a set taken past the target on purpose. Treating it as a missed target would
              punish the user for pushing.

   The set that decides progression is the one the user was actually prescribed.

   ORDER OF CHECKS IS LOAD-BEARING
   Stall is tested before success. A lifter can hit the top of the rep range in a week that is
   still, over three weeks, going nowhere — and adding load to a stall is how people get hurt.
   The first matching rule wins and returns; the rules are written most-severe first so a
   dangerous condition can never be outvoted by a cosmetic one.
========================================================= */
window.IgnytCoachOverload = (function () {
  "use strict";

  var RULES = {
    /* Percentages, not fixed kilos. +2.5 kg is 1.4% of a 180 kg squat and 12% of a 20 kg
       overhead press — the same absolute jump is a rounding error on one lift and impossible
       on the other. Lower body carries the larger percentage because it tolerates it. */
    incrementUpper: 0.025,
    incrementLower: 0.05,
    deloadPct: 0.10,
    failureBackoff: 0.05,
    stallWeeks: 3,
    consecutiveFailures: 2,
    maxSets: 6,
    /* Smallest change a real gym can load: 1.25 kg per side of a barbell. Anything finer is
       a number the user cannot act on. */
    plateStepKg: 2.5,
    dumbbellStepKg: 2.0
  };

  /* Lower-body movements take the larger increment. Matched on the muscle the app already
     stores against every library entry, so this needs no new data. */
  var LOWER_MUSCLES = ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Adductors", "Abductors"];

  /* ---- reading the log ------------------------------------------------------------------ */

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  }

  /* Sets are logged with weight/reps as STRINGS straight off the inputs, and either can be
     "" for a set the user started and never filled in. Anything not fully specified is not
     evidence and is dropped rather than coerced to 0 — a 0 kg set would read as a catastrophic
     regression and trigger a deload. */
  function workingSets(exercise) {
    if (!exercise || !Array.isArray(exercise.sets)) return [];
    return exercise.sets.filter(function (s) {
      if (!s || s.type !== "working") return false;
      if (!s.done) return false;
      /* Strictly positive on both, not merely "parses as a number".
         A corrupt import got a weight of -50 through an earlier `!== null` check. Negative
         load yields a negative estimated 1RM, which reads as the steepest possible stall and
         prescribes a deload computed from a number that never existed.

         Zero is excluded for a different reason: this engine progresses by LOAD, and a
         genuinely unloaded movement (a pull-up logged at 0) cannot be progressed that way —
         it advances by leverage, which is a different rule set. Returning no recommendation
         is honest; returning "add 2.5% of nothing" is not. */
      return num(s.weight) > 0 && num(s.reps) > 0;
    }).map(function (s) {
      return { weight: num(s.weight), reps: num(s.reps), rpe: num(s.rpe) };
    });
  }

  /**
   * Every session that trained this exercise, newest first, as {date, startedAt, sets[]}.
   *
   * Names are resolved through the app's own resolver rather than compared directly. The
   * library has renamed movements over time ("Barbell Bench Press" -> "Bench Press (Barbell)"),
   * and a raw string match silently splits one exercise's history into two, each too short to
   * progress. Sessions are historical records and are never rewritten to fix this — resolution
   * happens at lookup, which is the same decision the rest of the app already made.
   */
  function historyFor(workoutLog, exerciseName) {
    var target = (typeof resolveExerciseName === "function")
      ? (resolveExerciseName(exerciseName) || exerciseName)
      : exerciseName;

    var out = [];
    (workoutLog || []).forEach(function (session) {
      if (!session || !Array.isArray(session.exercises)) return;
      session.exercises.forEach(function (ex) {
        if (!ex || !ex.name) return;
        var resolved = (typeof resolveExerciseName === "function")
          ? (resolveExerciseName(ex.name) || ex.name)
          : ex.name;
        if (resolved !== target) return;
        var sets = workingSets(ex);
        if (!sets.length) return;              // logged but empty — not evidence
        out.push({
          date: session.date,
          startedAt: session.startedAt || 0,
          sets: sets,
          topWeight: Math.max.apply(null, sets.map(function (s) { return s.weight; })),
          totalReps: sets.reduce(function (a, s) { return a + s.reps; }, 0),
          volume: sets.reduce(function (a, s) { return a + s.weight * s.reps; }, 0),
          e1rm: bestE1rm(sets)
        });
      });
    });
    out.sort(function (a, b) { return b.startedAt - a.startedAt; });   // newest first
    return out;
  }

  /* Epley — the same formula PR detection and Exercise Progress already use. Reusing it
     matters more than picking the theoretically best one: two 1RM numbers that disagree in
     different corners of the same app is a bug report waiting to happen. */
  function e1rm(weight, reps) {
    if (!weight || !reps) return 0;
    return weight * (1 + reps / 30);
  }
  function bestE1rm(sets) {
    return sets.reduce(function (m, s) { return Math.max(m, e1rm(s.weight, s.reps)); }, 0);
  }

  /* ---- rounding ------------------------------------------------------------------------- */

  /**
   * Round a computed load to something a real gym can actually load.
   *
   * 2.5% of 62.5 kg is 64.06 kg. Prescribing that tells the user the app has never seen a
   * weight room. Rounds to the nearest achievable increment and — importantly — never returns
   * the SAME load it was given: if the percentage increase rounds away to nothing, it steps up
   * one increment instead. A progression that silently prescribes last week's numbers reads as
   * the app having forgotten.
   */
  var LB_PER_KG = 2.2046226218;

  function roundLoad(kg, equipment, previousKg, unit) {
    /* Round in the unit the user's gym is actually plated in, then store back in kg.
       Rounding to 2.5 kg and converting produces "181.9 lb" for a pound user — a number no
       rack can make, from an app that looks like it has never seen one. A pound gym steps in
       5 lb (2.5 per side) and its dumbbells in 5 lb, so those are the increments to snap to. */
    var lb = unit === "lb";
    var step = lb
      ? (equipment === "dumbbell" ? 5 : 5) / LB_PER_KG
      : (equipment === "dumbbell" ? RULES.dumbbellStepKg : RULES.plateStepKg);

    var rounded = Math.round(kg / step) * step;
    /* Never hand back the load they already used. If the percentage increase rounds away to
       nothing, step up one increment — a "progression" that prescribes last week's numbers
       reads as the app having forgotten. */
    if (previousKg != null && rounded <= previousKg && kg > previousKg) {
      rounded = previousKg + step;
    }
    return Math.round(rounded * 1000) / 1000;
  }

  /* ---- the rules ------------------------------------------------------------------------- */

  function allSetsAt(session, targetReps) {
    return session.sets.length > 0 && session.sets.every(function (s) { return s.reps >= targetReps; });
  }
  function missedTarget(session, minReps) {
    return session.sets.some(function (s) { return s.reps < minReps; });
  }

  /* A stall is measured on estimated 1RM rather than on load alone, because someone adding
     reps at a fixed weight IS progressing and must not be told otherwise. Uses a tolerance
     band: e1RM wobbles by a percent or two from ordinary daily variation, and calling that
     "progress" would mean a stall is never detected at all. */
  function weeksWithoutProgress(history) {
    if (history.length < 2) return 0;
    var best = history[0].e1rm, weeks = 0, TOL = 1.01;
    for (var i = 1; i < history.length; i++) {
      if (history[i].e1rm * TOL >= best) {
        var days = (history[0].startedAt - history[i].startedAt) / 86400000;
        weeks = days / 7;
        best = Math.max(best, history[i].e1rm);
      } else break;
    }
    return weeks;
  }

  function isLowerBody(exerciseName) {
    try {
      if (typeof muscleOf === "function") {
        return LOWER_MUSCLES.indexOf(muscleOf(exerciseName)) !== -1;
      }
    } catch (e) {}
    return /squat|deadlift|lunge|leg |calf|hip thrust|glute/i.test(exerciseName || "");
  }

  function equipmentOf(exerciseName) {
    var n = (exerciseName || "").toLowerCase();
    if (n.indexOf("dumbbell") !== -1) return "dumbbell";
    if (n.indexOf("machine") !== -1 || n.indexOf("cable") !== -1) return "machine";
    return "barbell";
  }

  /**
   * The recommendation for one exercise.
   *
   * @param {Array}  workoutLog    state.workoutLog (newest first)
   * @param {string} exerciseName
   * @param {Object} slot          { reps:[min,max], maxSets } — from the template, or defaults
   * @returns {Object|null}        null when there is not enough history to say anything
   */
  function next(workoutLog, exerciseName, slot) {
    var s = slot || {};
    var repRange = s.reps || [8, 12];
    var minReps = repRange[0], maxReps = repRange[1];
    var maxSets = s.maxSets || RULES.maxSets;

    var history = historyFor(workoutLog, exerciseName);

    /* Nothing, or one session. One data point cannot distinguish "a good day" from "a trend",
       and the honest answer is to say so rather than to prescribe from it. */
    if (history.length === 0) return null;
    if (history.length === 1) {
      return {
        action: "establish",
        load: history[0].topWeight,
        reps: minReps,
        sets: history[0].sets.length,
        why: "Log this once more so there is something to compare against."
      };
    }

    var last = history[0], prev = history[1];
    var equipment = equipmentOf(exerciseName);
    var unit = s.unit || "kg";          // caller passes the user's display unit
    var lastLoad = last.topWeight;

    /* 1. STALLED — checked first, deliberately. A week that hits the top of the rep range can
          still sit inside a three-week plateau, and adding load to a plateau is the single
          most reliable way to turn one into an injury. */
    var stalled = weeksWithoutProgress(history);
    if (stalled >= RULES.stallWeeks) {
      return {
        action: "deload",
        load: roundLoad(lastLoad * (1 - RULES.deloadPct), equipment, null, unit),
        reps: minReps,
        sets: last.sets.length,
        why: "No progress in " + Math.round(stalled) + " weeks — taking 10% off to rebuild."
      };
    }

    /* 2. FAILED TWICE — two sessions, not one. A single missed target is usually sleep, food
          or a bad day, and cutting load for it teaches the user the app panics. */
    if (missedTarget(last, minReps) && missedTarget(prev, minReps)) {
      return {
        action: "backoff",
        load: roundLoad(lastLoad * (1 - RULES.failureBackoff), equipment, null, unit),
        reps: minReps,
        sets: last.sets.length,
        why: "Missed the target twice — dropping 5% to get the reps back."
      };
    }

    /* 3. STALLING BUT NOT STALLED — add volume before cutting load.
          This sits between "progressing" and "deload" on purpose. The first draft put it after
          the add-load rule, guarded on the PREVIOUS session hitting the top of the range, and
          it was unreachable: whenever that was true the add-load rule below had already fired
          on the current session and returned. A rule that cannot execute is worse than no rule,
          because it reads like the case is handled.

          Placed here it is both reachable and better coaching. Two weeks without moving the
          estimated 1RM means load is not the lever right now; adding a set buys another week of
          accumulated work before rule 1 takes 10% off, and more volume is a far cheaper
          intervention than a deload. */
    if (stalled >= RULES.stallWeeks - 1 && last.sets.length < maxSets) {
      return {
        action: "add_set",
        load: lastLoad,
        reps: Math.max.apply(null, last.sets.map(function (x) { return x.reps; })),
        sets: last.sets.length + 1,
        why: "Load has not moved in 2 weeks — adding a set before dropping the weight."
      };
    }

    /* 4. TOP OF RANGE ON EVERY SET — earn the load increase. */
    if (allSetsAt(last, maxReps)) {
      var pct = isLowerBody(exerciseName) ? RULES.incrementLower : RULES.incrementUpper;
      return {
        action: "add_load",
        load: roundLoad(lastLoad * (1 + pct), equipment, lastLoad, unit),
        reps: minReps,
        sets: last.sets.length,
        why: "Hit " + maxReps + " on every set — up in weight, back to " + minReps + " reps."
      };
    }

    /* 5. THE ORDINARY CASE — one more rep, same weight. */
    var target = Math.min(Math.max.apply(null, last.sets.map(function (x) { return x.reps; })) + 1, maxReps);
    return {
      action: "add_reps",
      load: lastLoad,
      reps: target,
      sets: last.sets.length,
      why: "Same weight, aim for " + target + " reps."
    };
  }

  /**
   * Weekly volume adjustment from attendance.
   *
   * Separate from next() on purpose: per-exercise progression answers "how heavy", this
   * answers "how much", and a user who trained twice out of five needs the second question
   * answered even if every set they did log went up.
   */
  function weeklyVolumeAdjustment(completed, planned) {
    if (!planned) return { multiplier: 1, why: "" };
    var rate = completed / planned;
    if (rate < 0.5) return { multiplier: 0.7, why: "Lighter week — getting back in beats catching up." };
    if (rate < 0.8) return { multiplier: 0.85, why: "Trimmed a little to fit the week you actually have." };
    return { multiplier: 1, why: "" };
  }

  return Object.freeze({
    next: next,
    historyFor: historyFor,
    workingSets: workingSets,
    weeklyVolumeAdjustment: weeklyVolumeAdjustment,
    roundLoad: roundLoad,
    e1rm: e1rm,
    weeksWithoutProgress: weeksWithoutProgress,
    RULES: RULES
  });
})();
