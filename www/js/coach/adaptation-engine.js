/* =========================================================
   IGNYT COACH — WEEKLY ADAPTATION (spec §6)

   Runs once a week and emits ONE adjustment.

   ONE, NOT SEVERAL, AND THAT IS THE DESIGN.
   Stacking "reduce volume" with "delay progression" and "drop a day" compounds into a week
   the user cannot tell they are still following. Three modest, individually-defensible
   adjustments multiply into a 45% cut, and the person opening the app sees a plan that looks
   nothing like the one they agreed to. The rules are ordered most-severe first and the first
   match returns.

   IT CONSUMES recovery-engine RATHER THAN REIMPLEMENTING IT.
   Readiness, per-muscle recovery, sleep debt, resting-heart-rate drift and overtraining
   detection are 489 lines that already work. This module asks that one for a number and turns
   it into a decision. Recomputing any of it here would put two answers to the same question in
   the codebase.

   EVERY BRANCH CARRIES A MESSAGE.
   A plan that changes silently reads as broken. The user who did everything right and finds
   next week easier will conclude the app lost their data. The message names the cause without
   assigning blame — "the week you actually have", never "you missed 2 sessions".
========================================================= */
window.IgnytCoachAdaptation = (function () {
  "use strict";

  var THRESHOLDS = {
    abandonedWeek: 0.5,     // under half the sessions
    partialWeek: 0.8,
    lowReadiness: 40,       // recovery-engine's 0-100 score
    highReadiness: 70,
    highSoreness: 7         // 0-10 self-report
  };

  function clampMultiplier(m) { return Math.max(0.5, Math.min(1.25, m)); }

  /**
   * @param {object} week      { completed, planned, allTargetsHit, days }
   * @param {object} recovery  { score, avgSoreness } — from recovery-engine.assess()
   * @returns {object} { volume, intensity, days, holdProgression, msg, reason }
   */
  function adaptNextWeek(week, recovery) {
    var planned = Number(week && week.planned) || 0;
    var completed = Number(week && week.completed) || 0;
    var readiness = recovery && isFinite(recovery.score) ? Number(recovery.score) : null;
    var soreness = recovery && isFinite(recovery.avgSoreness) ? Number(recovery.avgSoreness) : null;

    /* No plan to compare against — say nothing rather than adapt from nothing. */
    if (!planned) {
      return hold("No planned week to compare against yet.", "no_plan");
    }

    var rate = completed / planned;

    /* 1. ABANDONED WEEK — the most severe signal, and the one most likely to end in someone
          deleting the app. Resuming at full volume after a missed week is what causes the
          NEXT missed week, so the plan gets smaller and easier to start. */
    if (rate < THRESHOLDS.abandonedWeek) {
      return {
        volume: 0.70, intensity: 1.0, days: Math.max(2, (week.days || 3) - 1),
        holdProgression: true,
        reason: "abandoned_week",
        msg: "Lighter week ahead. Getting back in beats catching up."
      };
    }

    /* 2. LOW RECOVERY — trusted over attendance. Someone can complete every session while
          sleeping five hours a night, and that is exactly the person who should train less,
          not more. */
    if (readiness != null && readiness < THRESHOLDS.lowReadiness) {
      return {
        volume: 0.75, intensity: 0.95, days: week.days || null,
        holdProgression: true,
        reason: "low_recovery",
        msg: "Recovery is low — easing off this week so the work sticks."
      };
    }

    /* 3. HIGH SORENESS — volume stays, progression waits. Soreness means the last dose has not
          been absorbed yet; repeating it is the right response, adding to it is not. */
    if (soreness != null && soreness > THRESHOLDS.highSoreness) {
      return {
        volume: 1.0, intensity: 1.0, days: week.days || null,
        holdProgression: true,
        reason: "high_soreness",
        msg: "Repeating last week's numbers to let the soreness settle."
      };
    }

    /* 4. PARTIAL WEEK — trim to fit rather than pile up a backlog. */
    if (rate < THRESHOLDS.partialWeek) {
      return {
        volume: 0.85, intensity: 1.0, days: week.days || null,
        holdProgression: false,
        reason: "partial_week",
        msg: "Trimmed a little to fit the week you actually have."
      };
    }

    /* 5. EARNED PROGRESSION — everything done, every target hit, recovered. All three, because
          any one of them alone is not enough to justify adding load AND volume at once. */
    if (rate >= 1 && week.allTargetsHit && (readiness == null || readiness > THRESHOLDS.highReadiness)) {
      return {
        volume: 1.10, intensity: 1.025, days: week.days || null,
        holdProgression: false,
        reason: "earned_progression",
        msg: "Strong week — stepping it up."
      };
    }

    return hold("Holding steady.", "steady");

    function hold(msg, reason) {
      return { volume: 1.0, intensity: 1.0, days: week && week.days || null,
               holdProgression: false, reason: reason, msg: msg };
    }
  }

  /**
   * Pulls the week's numbers straight out of the log so callers do not have to assemble them
   * (and cannot assemble them inconsistently).
   *
   * Counts DISTINCT DAYS, not sessions. Two sessions logged on one day is one training day —
   * counting them as two makes a user who split a workout in half look twice as consistent as
   * they were, and would earn them a progression they did not.
   */
  function weekSummary(workoutLog, plannedSessions, days) {
    var now = Date.now(), WEEK = 7 * 86400000;
    var seen = {};
    (workoutLog || []).forEach(function (s) {
      if (!s) return;
      var t = s.startedAt || (s.date ? new Date(s.date + "T12:00:00").getTime() : 0);
      if (!t || now - t > WEEK) return;
      var key = s.date || new Date(t).toDateString();
      seen[key] = true;
    });
    return {
      completed: Object.keys(seen).length,
      planned: plannedSessions || 0,
      days: days || plannedSessions || 0,
      allTargetsHit: false          // set by the caller from overload-engine results
    };
  }

  function applyTo(sets, adjustment) {
    return Math.max(1, Math.round(sets * clampMultiplier(adjustment.volume)));
  }

  return Object.freeze({
    adaptNextWeek: adaptNextWeek,
    weekSummary: weekSummary,
    applyTo: applyTo,
    THRESHOLDS: THRESHOLDS
  });
})();
