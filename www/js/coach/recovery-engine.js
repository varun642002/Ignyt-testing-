/* =========================================================
   IGNYT COACH — RECOVERY ENGINE

   Answers one question: how hard should today be?

   Output is a score 0-100 plus a load multiplier the plan generator applies to volume and
   intensity. Everything feeding it is either already logged or already synced — nothing here
   asks the user for anything new.

   MUSCLE-LEVEL RECOVERY, NOT JUST A DAY SCORE
   A single daily number cannot answer "should I train legs today". Someone who squatted
   yesterday and benched four days ago is recovered for one and not the other. So the engine
   also returns hoursSince and a readiness value PER MUSCLE, which is what lets the split
   generator avoid stacking the same muscle two days running.

   MISSING INPUTS LOWER CONFIDENCE, THEY DO NOT LOWER THE SCORE
   If sleep was never recorded, that is not evidence of poor sleep. Treating absent data as
   bad would make the engine progressively more cautious the less it knows, which is exactly
   backwards. Absent inputs are skipped and the score is computed from what exists.
========================================================= */
(function () {
  "use strict";

  /* Hours to full readiness after a hard session, by muscle size. Large muscles trained
     heavily need longer; small muscles and cardio recover faster. */
  var RECOVERY_HOURS = {
    "Quadriceps": 72, "Hamstrings": 72, "Glutes": 72, "Back": 72, "Lats": 72,
    "Chest": 60, "Shoulders": 48, "Triceps": 48, "Biceps": 48,
    "Calves": 36, "Abdominals": 36, "Forearms": 36, "Adductors": 60,
    "Cardio": 24, "Mobility": 12
  };
  var DEFAULT_RECOVERY_HOURS = 48;

  function hoursBetween(a, b) { return Math.abs(a - b) / 36e5; }

  function sessionTime(s) {
    var t = Date.parse(s && (s.finishedAt || s.date || s.at));
    return isFinite(t) ? t : null;
  }

  /**
   * Per-muscle readiness from the workout log.
   * @returns {Object<string,{hoursSince:number, readiness:number, lastVolume:number}>}
   */
  function muscleReadiness(workoutLog, muscleOf, now) {
    var out = Object.create(null);
    var t = now || Date.now();

    (workoutLog || []).forEach(function (s) {
      var when = sessionTime(s);
      if (when == null) return;
      var hrs = hoursBetween(t, when);
      if (hrs > 240) return;                      // older than ten days tells us nothing useful

      (s.exercises || []).forEach(function (ex) {
        var muscle = (typeof muscleOf === "function" ? muscleOf(ex.name) : null) || ex.muscle || "Other";
        // Volume as sets actually completed — a logged-but-unfinished exercise did not
        // create fatigue.
        var sets = (ex.sets || []).filter(function (st) { return st && st.done; }).length;
        if (!sets) return;

        var prev = out[muscle];
        if (!prev || hrs < prev.hoursSince) {
          out[muscle] = { hoursSince: Math.round(hrs), lastVolume: sets, readiness: 0 };
        } else if (prev) {
          prev.lastVolume += sets;
        }
      });
    });

    Object.keys(out).forEach(function (m) {
      var need = RECOVERY_HOURS[m] || DEFAULT_RECOVERY_HOURS;
      // High volume extends the window: 20 hard sets is not the same insult as 4.
      var scaled = need * (1 + Math.min(0.5, Math.max(0, (out[m].lastVolume - 8) / 24)));
      out[m].readiness = Math.max(0, Math.min(100, Math.round((out[m].hoursSince / scaled) * 100)));
    });

    return out;
  }

  /**
   * Whole-body recovery.
   * @param {object} input { workoutLog, muscleOf, sleepHours, restingHeartRate,
   *                         soreness (0-10), healthCache }
   * @returns {{score:number, band:string, loadMultiplier:number, factors:Array, muscles:object}}
   */
  function assess(input) {
    var now = Date.now();
    var log = (input && input.workoutLog) || [];
    var muscles = muscleReadiness(log, input && input.muscleOf, now);
    var factors = [];

    /* Start neutral and move from there. 70 is "train as planned". */
    var score = 70;

    /* --- days since the last session --- */
    var lastAt = null;
    log.forEach(function (s) { var t = sessionTime(s); if (t != null && (lastAt == null || t > lastAt)) lastAt = t; });
    if (lastAt != null) {
      var since = hoursBetween(now, lastAt);
      if (since < 12) { score -= 18; factors.push({ k: "recent-session", d: -18, why: "trained within the last 12 hours" }); }
      else if (since < 24) { score -= 8; factors.push({ k: "recent-session", d: -8, why: "trained yesterday" }); }
      else if (since > 96) { score += 10; factors.push({ k: "well-rested", d: 10, why: "no session in four days" }); }
      else { score += 5; factors.push({ k: "spaced", d: 5, why: "a full day of rest since the last session" }); }
    }

    /* --- consecutive training days --- */
    var streak = 0;
    for (var d = 0; d < 7; d++) {
      var dayStart = now - (d + 1) * 864e5, dayEnd = now - d * 864e5;
      var trained = log.some(function (s) { var t = sessionTime(s); return t != null && t > dayStart && t <= dayEnd; });
      if (trained) streak++; else break;
    }
    if (streak >= 5) { score -= 15; factors.push({ k: "streak", d: -15, why: streak + " training days in a row" }); }
    else if (streak >= 3) { score -= 6; factors.push({ k: "streak", d: -6, why: streak + " days in a row" }); }

    /* --- weekly volume against the trailing average --- */
    var week = log.filter(function (s) { var t = sessionTime(s); return t != null && now - t < 7 * 864e5; }).length;
    var prevWeek = log.filter(function (s) {
      var t = sessionTime(s); return t != null && now - t >= 7 * 864e5 && now - t < 14 * 864e5;
    }).length;
    if (prevWeek > 0 && week > prevWeek * 1.5) {
      score -= 10;
      factors.push({ k: "volume-spike", d: -10, why: "this week's session count is well above last week's" });
    }

    /* --- sleep, only if it was actually recorded --- */
    var sleep = Number(input && input.sleepHours);
    if (isFinite(sleep) && sleep > 0) {
      if (sleep < 6) { score -= 12; factors.push({ k: "sleep", d: -12, why: "under 6 hours of sleep" }); }
      else if (sleep < 7) { score -= 5; factors.push({ k: "sleep", d: -5, why: "slightly short on sleep" }); }
      else if (sleep >= 8) { score += 8; factors.push({ k: "sleep", d: 8, why: "8+ hours of sleep" }); }
    }

    /* --- self-reported soreness, if the UI ever collects it --- */
    var sore = Number(input && input.soreness);
    if (isFinite(sore) && sore > 0) {
      if (sore >= 7) { score -= 15; factors.push({ k: "soreness", d: -15, why: "high reported soreness" }); }
      else if (sore >= 4) { score -= 6; factors.push({ k: "soreness", d: -6, why: "moderate soreness" }); }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    var band = score >= 80 ? "high" : score >= 60 ? "normal" : score >= 40 ? "reduced" : "low";
    /* The multiplier the plan generator applies to volume. Deliberately gentle: recovery
       estimates from this little data should nudge a session, not gut it. */
    var loadMultiplier = score >= 80 ? 1.1 : score >= 60 ? 1 : score >= 40 ? 0.8 : 0.6;

    return {
      score: score, band: band, loadMultiplier: loadMultiplier,
      factors: factors, muscles: muscles,
      consecutiveDays: streak,
      sessionsThisWeek: week,
      /* Deload is a recommendation, not an instruction — three weeks of climbing volume with
         poor recovery is the classic signature, and catching it early is the point. */
      deloadSuggested: score < 45 && streak >= 4
    };
  }

  window.IgnytCoachRecovery = Object.freeze({
    assess: assess,
    muscleReadiness: muscleReadiness,
    RECOVERY_HOURS: RECOVERY_HOURS
  });
}());
