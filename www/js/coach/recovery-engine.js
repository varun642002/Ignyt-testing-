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

  /* =========================================================
     §29 — READINESS

     Everything below extends assess() rather than replacing it. assess() keeps its exact
     shape because coach.js already depends on it; readiness() wraps it and adds the sleep
     analysis, muscle map, overtraining detection and the actual "what should I do today"
     decision.

     THE HONEST PART OF THIS
     A readiness score built from an app's own logs is a genuinely useful signal about
     training load. It is NOT a physiological readiness measurement — that needs HRV and
     morning resting heart rate, which this app cannot currently read. So the score is
     presented as what it is: a training-load reading, with its confidence stated and its
     inputs listed. Dressing it up as a whoop-style recovery percentage would be claiming a
     measurement that was never taken.
  ========================================================= */

  /* ---------------------------------------------------------
     Sleep analysis engine
  --------------------------------------------------------- */
  var SLEEP_TARGET = 8;

  /**
   * @param {Array<{date:string, hours:number}>|number} history recent nights, or a single
   *        figure when that is all there is
   */
  function analyseSleep(history) {
    var nights = [];
    if (typeof history === "number" && history > 0) nights = [{ hours: history }];
    else if (Array.isArray(history)) nights = history.filter(function (n) { return n && Number(n.hours) > 0; });

    if (!nights.length) {
      return { available: false, why: "no sleep data recorded", score: null, avgHours: null,
               deficitHours: null, consistency: null, trend: null, recommendations: [] };
    }

    var hours = nights.map(function (n) { return Number(n.hours); });
    var avg = hours.reduce(function (a, b) { return a + b; }, 0) / hours.length;

    /* Deficit is cumulative against the target, floored at zero — you cannot bank surplus
       sleep, so a 10-hour Saturday does not repay a 5-hour Tuesday. */
    var deficit = hours.reduce(function (a, h) { return a + Math.max(0, SLEEP_TARGET - h); }, 0);

    /* Consistency matters independently of duration: seven 6-hour nights is easier to adapt
       to than alternating 4s and 9s. Measured as spread, inverted. */
    /* Needs at least three nights to mean anything. One night has zero variance and would
       score a perfect 100 — mathematically true and completely misleading, since a single
       data point says nothing about how consistent someone is. */
    var consistency = null;
    if (hours.length >= 3) {
      var mean = avg;
      var variance = hours.reduce(function (a, h) { return a + Math.pow(h - mean, 2); }, 0) / hours.length;
      var sd = Math.sqrt(variance);
      consistency = Math.max(0, Math.min(100, Math.round(100 - sd * 25)));
    }

    var trend = null;
    if (hours.length >= 4) {
      var half = Math.floor(hours.length / 2);
      // history is newest-first, so the FIRST half is the recent one.
      var recent = hours.slice(0, half).reduce(function (a, b) { return a + b; }, 0) / half;
      var older = hours.slice(half).reduce(function (a, b) { return a + b; }, 0) / (hours.length - half);
      trend = recent > older + 0.4 ? "improving" : recent < older - 0.4 ? "declining" : "steady";
    }

    var score = Math.max(0, Math.min(100, Math.round(
      (Math.min(1, avg / SLEEP_TARGET) * 70) + ((consistency == null ? 70 : consistency) * 0.3)
    )));

    var recs = [];
    if (avg < 6) recs.push("Averaging " + avg.toFixed(1) + " h. Training volume should come down until this improves.");
    else if (avg < 7) recs.push("Averaging " + avg.toFixed(1) + " h — an earlier bedtime would do more for progress than an extra set.");
    if (consistency != null && consistency < 60) recs.push("Bedtime is inconsistent. A fixed wake time is the easiest lever.");
    if (deficit >= 6) recs.push("About " + Math.round(deficit) + " h of accumulated deficit over " + hours.length + " nights.");
    if (trend === "declining") recs.push("Sleep has been trending down this week.");

    return {
      available: true, score: score, nights: hours.length,
      avgHours: Math.round(avg * 10) / 10,
      deficitHours: Math.round(deficit * 10) / 10,
      consistency: consistency, trend: trend, recommendations: recs
    };
  }

  /* ---------------------------------------------------------
     Muscle recovery map + timeline
  --------------------------------------------------------- */
  function muscleStatus(readinessPct) {
    if (readinessPct >= 100) return "Ready";
    if (readinessPct >= 75) return "Recovered";
    if (readinessPct >= 45) return "Recovering";
    return "Fatigued";
  }

  /**
   * A displayable map for every muscle the log knows about, with an estimated time to full
   * recovery rather than only a percentage — "ready in 14 h" is actionable, "62%" is not.
   */
  function recoveryMap(muscles) {
    return Object.keys(muscles || {}).map(function (m) {
      var r = muscles[m];
      var need = RECOVERY_HOURS[m] || DEFAULT_RECOVERY_HOURS;
      var remaining = Math.max(0, Math.round(need - r.hoursSince));
      return {
        muscle: m,
        readiness: r.readiness,
        status: muscleStatus(r.readiness),
        hoursSince: r.hoursSince,
        hoursRemaining: remaining,
        eta: remaining === 0 ? "ready now"
          : remaining < 24 ? "ready in ~" + remaining + " h"
          : "ready in ~" + Math.round(remaining / 24 * 10) / 10 + " days"
      };
    }).sort(function (a, b) { return a.readiness - b.readiness; });
  }

  /* ---------------------------------------------------------
     Overtraining detection
  --------------------------------------------------------- */
  function detectOvertraining(input) {
    var signals = [];
    var log = (input && input.workoutLog) || [];
    var now = Date.now();

    if (input.consecutiveDays >= 6) {
      signals.push({ k: "consecutive", severity: 2, why: input.consecutiveDays + " consecutive training days" });
    }
    /* Volume climbing three weeks running with no down week is the classic build-up. */
    var wk = [0, 1, 2].map(function (i) {
      return log.filter(function (s) {
        var t = Date.parse(s.finishedAt || s.date);
        return isFinite(t) && now - t >= i * 7 * 864e5 && now - t < (i + 1) * 7 * 864e5;
      }).length;
    });
    if (wk[0] > wk[1] && wk[1] > wk[2] && wk[2] > 0) {
      signals.push({ k: "ramp", severity: 1, why: "session count has risen three weeks running with no lighter week" });
    }
    if (input.sleep && input.sleep.available && input.sleep.avgHours < 6.5) {
      signals.push({ k: "sleep", severity: 2, why: "sleep averaging under 6.5 h" });
    }
    /* Resting heart rate elevated against the user's own baseline, not a population number. */
    if (input.restingHeartRate && input.baselineRestingHeartRate &&
        input.restingHeartRate > input.baselineRestingHeartRate + 7) {
      signals.push({ k: "rhr", severity: 2,
        why: "resting heart rate " + Math.round(input.restingHeartRate - input.baselineRestingHeartRate) + " bpm above your baseline" });
    }
    if (input.strengthDeclining) {
      signals.push({ k: "performance", severity: 2, why: "top-set performance is trending down" });
    }
    var missed = input.missedSessions || 0;
    if (missed >= 3) {
      signals.push({ k: "adherence", severity: 1, why: missed + " planned sessions missed — often the first sign of accumulated fatigue" });
    }

    var weight = signals.reduce(function (a, s) { return a + s.severity; }, 0);
    return {
      signals: signals,
      level: weight >= 5 ? "high" : weight >= 3 ? "moderate" : weight >= 1 ? "low" : "none",
      /* Deload is recommended on evidence, not on a calendar. */
      recommendDeload: weight >= 4,
      recommendRestDay: weight >= 5
    };
  }

  /* ---------------------------------------------------------
     Recovery actions
  --------------------------------------------------------- */
  var ACTION_LIBRARY = {
    sleep:      { label: "Earlier bedtime", detail: "Aim to be asleep 45 minutes earlier tonight." },
    hydration:  { label: "Hydration", detail: "Front-load fluids before mid-afternoon." },
    walk:       { label: "Easy walk", detail: "20-30 minutes, flat, conversational." },
    mobility:   { label: "Mobility", detail: "10 minutes on the areas trained hardest this week." },
    foamroll:   { label: "Foam rolling", detail: "5 minutes, 30 s per area, on the sorest muscles." },
    stretch:    { label: "Stretching", detail: "Hold each position 30-45 s; don't force range." },
    breathing:  { label: "Breathing", detail: "5 minutes of slow nasal breathing, longer exhale than inhale." },
    contrast:   { label: "Contrast shower", detail: "Alternate 1 min warm / 30 s cold, three rounds." },
    nutrition:  { label: "Protein", detail: "Recovery stalls without enough protein — check today's total." },
    deload:     { label: "Deload week", detail: "Keep the movements, halve the sets, stop well short of failure." }
  };

  function recoveryActions(ctx) {
    var out = [];
    var add = function (k) { if (ACTION_LIBRARY[k] && out.length < 5) out.push(Object.assign({ key: k }, ACTION_LIBRARY[k])); };

    if (ctx.sleep && ctx.sleep.available && ctx.sleep.avgHours < 7) add("sleep");
    if (ctx.overtraining.recommendDeload) add("deload");
    if (ctx.score < 55) { add("walk"); add("breathing"); }
    if (ctx.sorestMuscle) { add("foamroll"); add("stretch"); }
    add("mobility");
    add("hydration");
    if (out.length < 3) add("nutrition");
    return out;
  }

  /* ---------------------------------------------------------
     The daily decision
  --------------------------------------------------------- */
  var SESSION_TYPES = [
    { key: "heavy",    label: "Heavy strength session", min: 82 },
    { key: "moderate", label: "Moderate workout",       min: 65 },
    { key: "light",    label: "Light workout",          min: 50 },
    { key: "cardio",   label: "Easy cardio only",       min: 38 },
    { key: "mobility", label: "Mobility session",       min: 25 },
    { key: "rest",     label: "Complete rest",          min: 0 }
  ];

  function chooseSession(score, overtraining) {
    if (overtraining.recommendRestDay) {
      return { key: "rest", label: "Complete rest",
        why: "several overtraining signals are present at once — a day off now prevents a week off later" };
    }
    for (var i = 0; i < SESSION_TYPES.length; i++) {
      if (score >= SESSION_TYPES[i].min) {
        return Object.assign({}, SESSION_TYPES[i], { why: null });
      }
    }
    return SESSION_TYPES[SESSION_TYPES.length - 1];
  }

  var STATUS_BANDS = [
    { min: 85, status: "Excellent" }, { min: 70, status: "Good" },
    { min: 55, status: "Moderate" },  { min: 38, status: "Recovering" },
    { min: 0,  status: "Fatigued" }
  ];

  /**
   * The §29 entry point. Wraps assess() and returns everything the dashboard needs.
   * @param {object} input assess() inputs plus { sleepHistory, restingHeartRate,
   *                       baselineRestingHeartRate, missedSessions, strengthDeclining }
   */
  function readiness(input) {
    var base = assess(input);
    var sleep = analyseSleep(input && (input.sleepHistory || input.sleepHours));

    var over = detectOvertraining({
      workoutLog: input && input.workoutLog,
      consecutiveDays: base.consecutiveDays,
      sleep: sleep,
      restingHeartRate: input && input.restingHeartRate,
      baselineRestingHeartRate: input && input.baselineRestingHeartRate,
      missedSessions: input && input.missedSessions,
      strengthDeclining: input && input.strengthDeclining
    });

    /* Readiness is the training-load score adjusted by sleep where sleep is known. Sleep is
       weighted at a quarter: it matters, but a single self-reported number should not
       outvote a week of logged training. */
    var score = base.score;
    if (sleep.available) score = Math.round(score * 0.75 + sleep.score * 0.25);
    over.signals.forEach(function (s) { score -= s.severity * 3; });
    score = Math.max(0, Math.min(100, score));

    var status = STATUS_BANDS.filter(function (b) { return score >= b.min; })[0].status;
    var map = recoveryMap(base.muscles);
    var sorest = map.length && map[0].readiness < 60 ? map[0] : null;
    var session = chooseSession(score, over);

    /* Confidence in the READINESS figure specifically — distinct from profile confidence.
       Says how much of the picture the score is actually built on. */
    var inputsPresent = 1 +                                    // the log always counts
      (sleep.available ? 1 : 0) +
      (input && input.restingHeartRate ? 1 : 0) +
      (map.length ? 1 : 0);
    var confidence = Math.round((inputsPresent / 4) * 100);

    var why = [];
    base.factors.slice(0, 3).forEach(function (f) { why.push(f.why); });
    if (sleep.available && sleep.avgHours < 7) why.push("sleep averaging " + sleep.avgHours + " h");
    over.signals.slice(0, 2).forEach(function (s) { why.push(s.why); });

    return {
      score: score,
      status: status,
      band: base.band,
      loadMultiplier: base.loadMultiplier,
      session: session,
      why: why,
      confidence: confidence,
      missingInputs: [
        sleep.available ? null : "sleep",
        (input && input.restingHeartRate) ? null : "resting heart rate",
        "HRV"                                        // never available yet — stated, not implied
      ].filter(Boolean),
      sleep: sleep,
      muscles: map,
      sorestMuscle: sorest,
      overtraining: over,
      actions: recoveryActions({ score: score, sleep: sleep, overtraining: over, sorestMuscle: sorest }),
      factors: base.factors,
      consecutiveDays: base.consecutiveDays,
      sessionsThisWeek: base.sessionsThisWeek,
      /* Deliberately explicit: this is a training-load reading, not a physiological one. */
      basis: "training load, sleep and session history — not a physiological measurement"
    };
  }

  /** Reads whatever Health Connect has cached, without requiring any of it. */
  function healthInputs() {
    var cache = null;
    try { cache = JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null"); } catch (e) { return {}; }
    if (!cache) return {};
    var pick = function (path) {
      try { return path.split(".").reduce(function (v, k) { return v == null ? null : v[k]; }, cache); }
      catch (e) { return null; }
    };
    return {
      restingHeartRate: pick("restingHeartRate.bpm") || pick("heartRate.resting") || null,
      sleepHours: pick("sleep.hours") || pick("sleepSummary.hours") || null,
      steps: pick("steps.steps") || null,
      activeCalories: pick("activeCalories.kcal") || null
    };
  }

  window.IgnytCoachRecovery = Object.freeze({
    /* original surface — unchanged, coach.js depends on it */
    assess: assess,
    muscleReadiness: muscleReadiness,
    RECOVERY_HOURS: RECOVERY_HOURS,

    /* §29 */
    readiness: readiness,
    analyseSleep: analyseSleep,
    recoveryMap: recoveryMap,
    detectOvertraining: detectOvertraining,
    recoveryActions: recoveryActions,
    healthInputs: healthInputs,
    muscleStatus: muscleStatus,
    ACTION_LIBRARY: ACTION_LIBRARY
  });
}());
