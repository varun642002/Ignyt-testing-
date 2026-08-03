/* =========================================================
   IGNYT COACH — ORCHESTRATOR

   The single entry point. Everything else is a pure module; this wires them together, adds
   progressive overload, cardio and insights, and caches the result.

       profile → goal → recovery → exercise pool → week → overload → cardio → insights

   EVERY RECOMMENDATION CARRIES ITS REASON
   Not as decoration — as a check on the engine. A recommendation whose explanation reads as
   nonsense is a recommendation whose logic is wrong, and writing the reason next to the rule
   is what makes that visible.

   THE AI EXTENSION POINT IS A HOOK, NOT A PLACEHOLDER
   registerAdvisor() lets a future model post-process a finished plan. It receives the fully
   built recommendation and returns a modified one. The deterministic path always runs first,
   so if no advisor is registered — or one throws — the user still gets a complete plan. That
   is the difference between an extension point and a dependency.
========================================================= */
(function () {
  "use strict";

  var advisors = [];
  var cache = null;

  /* ---------------------------------------------------------
     Progressive overload
  --------------------------------------------------------- */

  /** Best top-set for an exercise from the log, and whether it is moving. */
  function strengthTrend(workoutLog, name) {
    var points = [];
    (workoutLog || []).forEach(function (s) {
      var t = Date.parse(s.finishedAt || s.date || s.at);
      if (!isFinite(t)) return;
      (s.exercises || []).forEach(function (ex) {
        if (ex.name !== name) return;
        var best = 0;
        (ex.sets || []).forEach(function (st) {
          if (!st || !st.done) return;
          var w = Number(st.kg || st.weight) || 0, r = Number(st.reps) || 0;
          // Epley, so 5x100 and 3x110 are comparable rather than being two unrelated numbers.
          var e1rm = w > 0 && r > 0 ? w * (1 + r / 30) : 0;
          if (e1rm > best) best = e1rm;
        });
        if (best > 0) points.push({ t: t, e1rm: best });
      });
    });
    if (points.length < 2) return null;
    points.sort(function (a, b) { return a.t - b.t; });
    var first = points[0], last = points[points.length - 1];
    var changePct = ((last.e1rm - first.e1rm) / first.e1rm) * 100;
    return {
      sessions: points.length,
      firstE1rm: Math.round(first.e1rm),
      latestE1rm: Math.round(last.e1rm),
      changePct: Math.round(changePct * 10) / 10,
      stalled: points.length >= 3 && Math.abs(changePct) < 2,
      days: Math.round((last.t - first.t) / 864e5)
    };
  }

  /**
   * What to change next session for one exercise. Order matters: reps before weight, because
   * adding load before owning the rep range is how technique degrades.
   */
  function overloadFor(trend, intent) {
    if (!trend) return { action: "establish", why: "log this a couple more times so progress has something to compare against" };
    if (trend.stalled) {
      return {
        action: "vary",
        why: "no meaningful change in " + trend.days + " days — change the rep range or swap in a close variation before adding load"
      };
    }
    if (trend.changePct < -5) {
      return { action: "deload", why: "estimated 1RM is down " + Math.abs(trend.changePct) + "% — take 10% off and rebuild" };
    }
    return {
      action: "progress",
      why: "up " + trend.changePct + "% over " + trend.days + " days — add reps until the top of " +
           intent.repRange[1] + ", then add load and drop back to " + intent.repRange[0]
    };
  }

  /* ---------------------------------------------------------
     Cardio
  --------------------------------------------------------- */
  var CARDIO = {
    zone2:     { label: "Zone 2", minutes: 40, detail: "conversational pace, nose-breathing, roughly 60-70% of max HR" },
    intervals: { label: "Intervals", minutes: 25, detail: "8 x 1 min hard / 90 s easy after a 10 min build-up" },
    hiit:      { label: "HIIT", minutes: 18, detail: "12 rounds of 30 s hard / 60 s easy" },
    walk:      { label: "Walk", minutes: 35, detail: "brisk, flat, easy enough to hold a conversation" },
    mixed:     { label: "Mixed", minutes: 30, detail: "alternate a steady session and an interval session through the week" }
  };

  function cardioPlan(intent, profile, recovery) {
    var style = intent.cardioStyle;
    // Preference wins where the user stated one and it does not fight the goal.
    var pref = (profile.preferredCardio || [])[0];
    var modality = pref || (style === "walk" ? "Walking" : style === "zone2" ? "Cycling or jogging" : "Running or rowing");
    // Hard conditioning on top of poor recovery is how people dig holes.
    var sessions = recovery.score < 45 ? Math.max(1, intent.cardioSessions - 2) : intent.cardioSessions;
    var chosen = (recovery.score < 55 && (style === "intervals" || style === "hiit")) ? CARDIO.zone2 : (CARDIO[style] || CARDIO.mixed);

    return {
      sessionsPerWeek: sessions,
      style: chosen.label,
      modality: modality,
      minutes: chosen.minutes,
      detail: chosen.detail,
      why: recovery.score < 55 && (style === "intervals" || style === "hiit")
        ? "swapped intervals for steady work this week because recovery is down"
        : "supports " + intent.label.toLowerCase() + " without competing with the lifting"
    };
  }

  /* ---------------------------------------------------------
     Insights
  --------------------------------------------------------- */
  function buildInsights(ctx) {
    var out = [];
    var p = ctx.profile, rec = ctx.recovery, log = ctx.workoutLog || [];
    var now = Date.now();

    /* consistency */
    var week = log.filter(function (s) { var t = Date.parse(s.finishedAt || s.date); return isFinite(t) && now - t < 7 * 864e5; }).length;
    var target = p.trainingDays || 3;
    if (week === 0 && log.length > 0) {
      out.push({ tone: "warn", title: "No sessions this week",
        body: "A short session beats a skipped one — even 20 minutes keeps the habit intact." });
    } else if (week < target - 1) {
      out.push({ tone: "info", title: "Behind on sessions",
        body: week + " of " + target + " done. " + (target - week) + " to go." });
    } else if (week >= target) {
      out.push({ tone: "good", title: "Week complete", body: week + " sessions logged against a target of " + target + "." });
    }

    /* recovery */
    if (rec.band === "low") {
      out.push({ tone: "bad", title: "Recovery is low",
        body: "Volume is cut " + Math.round((1 - rec.loadMultiplier) * 100) + "% today. " +
              (rec.factors[0] ? rec.factors[0].why[0].toUpperCase() + rec.factors[0].why.slice(1) + "." : "") });
    } else if (rec.deloadSuggested) {
      out.push({ tone: "warn", title: "Deload week suggested",
        body: rec.consecutiveDays + " days straight with recovery falling. Halve the sets for a week." });
    }

    /* muscle balance */
    var counts = {};
    log.filter(function (s) { var t = Date.parse(s.finishedAt || s.date); return isFinite(t) && now - t < 7 * 864e5; })
      .forEach(function (s) {
        (s.exercises || []).forEach(function (ex) {
          var m = ctx.muscleOf ? ctx.muscleOf(ex.name) : ex.muscle;
          if (m) counts[m] = (counts[m] || 0) + 1;
        });
      });
    var ranked = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    if (ranked.length >= 2 && counts[ranked[0]] >= counts[ranked[ranked.length - 1]] * 3) {
      out.push({ tone: "info", title: "Uneven week",
        body: ranked[0] + " has had " + counts[ranked[0]] + " exercises to " +
              ranked[ranked.length - 1] + "'s " + counts[ranked[ranked.length - 1]] + ". Today prioritises the gap." });
    }

    /* strength */
    (ctx.trackedLifts || []).forEach(function (name) {
      var t = strengthTrend(log, name);
      if (t && t.sessions >= 3 && t.changePct >= 5) {
        out.push({ tone: "good", title: name + " up " + t.changePct + "%",
          body: "Estimated 1RM has gone from " + t.firstE1rm + " to " + t.latestE1rm + " kg over " + t.days + " days." });
      } else if (t && t.stalled) {
        out.push({ tone: "info", title: name + " has stalled",
          body: "No real change in " + t.days + " days. Change the rep range or swap a variation in." });
      }
    });

    /* data gaps — asked for, not assumed */
    if (ctx.confidence < 55 && ctx.missing.length) {
      out.push({ tone: "info", title: "Recommendations are generic for now",
        body: "Adding your " + ctx.missing.slice(0, 3).join(", ") + " would let the plan adapt to you properly." });
    }

    return out;
  }

  /* ---------------------------------------------------------
     Orchestration
  --------------------------------------------------------- */

  /**
   * @param {object} input { state, library, detailsFor, muscleOf, sleepHours, soreness }
   * @returns {object} the full recommendation
   */
  function recommend(input) {
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    var state = input.state || {};

    var resolved = window.IgnytCoachProfile.resolve(state);
    var profile = resolved.profile;
    var intent = window.IgnytCoachGoal.resolve(profile);

    var recovery = window.IgnytCoachRecovery.assess({
      workoutLog: state.workoutLog, muscleOf: input.muscleOf,
      sleepHours: input.sleepHours != null ? input.sleepHours : profile.sleepHours,
      soreness: input.soreness
    });

    var pool = window.IgnytCoachExercise.buildPool({
      library: input.library || [], detailsFor: input.detailsFor,
      profile: profile, maxDifficulty: intent.maxDifficulty
    });

    // Names from the last two sessions, so selection rotates rather than repeating.
    var recentNames = [];
    (state.workoutLog || []).slice(0, 2).forEach(function (s) {
      (s.exercises || []).forEach(function (ex) { if (recentNames.indexOf(ex.name) === -1) recentNames.push(ex.name); });
    });

    var week = window.IgnytCoachPlan.buildWeek({
      profile: profile, intent: intent, pool: pool, recovery: recovery,
      recentNames: recentNames, favourites: state.favoriteExercises || []
    });

    var today = week.days[0];
    var cardio = cardioPlan(intent, profile, recovery);

    /* Overload guidance for whatever today actually contains. */
    var overload = today.session.exercises.map(function (e) {
      var trend = strengthTrend(state.workoutLog, e.name);
      return { name: e.name, trend: trend, guidance: overloadFor(trend, intent) };
    });

    var insights = buildInsights({
      profile: profile, recovery: recovery, workoutLog: state.workoutLog,
      muscleOf: input.muscleOf, confidence: resolved.confidence, missing: resolved.missing,
      trackedLifts: today.session.exercises.filter(function (e) { return e.isCompound; })
        .map(function (e) { return e.name; }).slice(0, 3)
    });

    /* A rest day is a recommendation in its own right, not the absence of one. */
    var restDay = recovery.score < 35;

    var result = {
      generatedAt: Date.now(),
      confidence: resolved.confidence,
      confidenceLabel: window.IgnytCoachProfile.describeConfidence(resolved.confidence),
      missingInputs: resolved.missing,
      profile: profile,
      intent: intent,
      recovery: recovery,
      split: { key: week.split.key, label: week.split.label, why: week.why },
      week: week.days,
      today: restDay ? {
        type: "rest",
        label: "Recovery day",
        activities: ["10 min easy walk", "Foam roll the areas trained this week — 5 min",
                     "Hip and shoulder mobility — 10 min", "Aim for 8 hours of sleep tonight"],
        why: "recovery is at " + recovery.score + "/100; training hard today would cost more than it returns"
      } : Object.assign({ type: "training" }, today.session, { label: today.label }),
      cardio: cardio,
      overload: overload,
      insights: insights,
      excludedExercises: pool.excluded.slice(0, 20),
      explanation: buildExplanation(profile, intent, week, recovery, resolved.confidence),
      elapsedMs: Math.round((((window.performance && performance.now) ? performance.now() : Date.now()) - t0) * 10) / 10
    };

    /* AI extension point — deterministic result is already complete before this runs. */
    advisors.forEach(function (fn) {
      try { result = fn(result) || result; } catch (e) { /* an advisor must never break the plan */ }
    });

    cache = { key: cacheKey(state), value: result };
    return result;
  }

  function buildExplanation(profile, intent, week, recovery, confidence) {
    var parts = [];
    parts.push("A " + week.split.label.toLowerCase() + " split, because you train " +
      profile.trainingDays + " day" + (profile.trainingDays === 1 ? "" : "s") + " a week and your goal is " +
      intent.label.toLowerCase() + " — " + week.why + ".");
    parts.push("Sets of " + intent.repRange[0] + "-" + intent.repRange[1] + " with " +
      intent.restSeconds + " s rest: " + intent.why + ".");
    if (profile.experience === "Beginner") {
      parts.push("Volume and complexity are held back because you are early on — consistency and technique buy more right now than intensity does.");
    }
    if (recovery.band !== "normal" && recovery.band !== "high") {
      parts.push("Today's volume is reduced because recovery is " + recovery.score + "/100.");
    }
    if (confidence < 55) {
      parts.push("This is a reasonable starting point rather than a tailored plan — the app is working from " +
        confidence + "% of the information it would use.");
    }
    return parts;
  }

  function cacheKey(state) {
    return [
      (state.workoutLog || []).length,
      (state.profile || {}).trainingDays,
      ((state.onboarding || {}).primaryGoal) || "",
      ((state.profile || {}).equipment || []).join(","),
      new Date().toDateString()
    ].join("|");
  }

  /** Cached per day and per meaningful input change — the plan is deterministic, so
   *  regenerating it on every render would be pure waste. */
  function get(input) {
    var key = cacheKey(input.state || {});
    if (cache && cache.key === key) return cache.value;
    return recommend(input);
  }

  function invalidate() { cache = null; }

  /** @param {function(object):object} fn receives and returns a recommendation */
  function registerAdvisor(fn) { if (typeof fn === "function") advisors.push(fn); }

  /* NAMED IgnytCoachEngine, NOT IgnytCoach.
     window.IgnytCoach is already taken by js/ai-coach.js — the chat-style AI Coach feature —
     and claiming it here silently replaced its attach() method, which broke every render in
     the app. Anything added to this namespace must keep the Engine suffix. */
  window.IgnytCoachEngine = Object.freeze({
    recommend: recommend,
    get: get,
    invalidate: invalidate,
    registerAdvisor: registerAdvisor,
    strengthTrend: strengthTrend,
    overloadFor: overloadFor,
    advisorCount: function () { return advisors.length; }
  });
}());
