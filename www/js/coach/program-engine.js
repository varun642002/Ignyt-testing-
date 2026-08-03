/* =========================================================
   IGNYT COACH — PROGRAM BUILDER AND PERIODIZATION (§27 + §28)

   §27 asks for a multi-week program; §28 asks for periodization. They are the same object
   seen from two angles — periodization IS how a program changes week to week — so this is
   one module rather than two that would have to agree with each other.

   IT BUILDS ON THE WEEK THE COACH ENGINE ALREADY GENERATES.
   The recommendation engine already decides the split, the exercises and the volume for one
   week from goal, equipment, injuries and recovery. Regenerating any of that here would mean
   two places deciding the same thing and eventually disagreeing. This takes that week and
   answers the only question left: how should it change over 4, 8 or 12 weeks?

   PERIODIZATION IS CHOSEN, NOT CONFIGURED.
   The model follows from goal and experience, because those are what actually determine
   which one works. A beginner on undulating periodization is being given variation they
   cannot yet exploit; an advanced lifter on pure linear progression stalls in a month.
========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     Models
  --------------------------------------------------------- */
  var MODELS = {
    linear: {
      key: "linear", label: "Linear progression",
      why: "load climbs steadily each week — the simplest thing that works, and it keeps working while you are still adding weight session to session",
      /* Intensity climbs, volume holds. */
      week: function (w, total) {
        return { intensityDelta: Math.round(w * 2.5), volumeMultiplier: 1, focus: "Add load" };
      }
    },
    undulating: {
      key: "undulating", label: "Undulating",
      why: "heavy, moderate and lighter weeks rotate so fatigue never accumulates in one direction long enough to stall you",
      week: function (w) {
        var cycle = w % 3;
        return cycle === 0 ? { intensityDelta: 5, volumeMultiplier: 0.85, focus: "Heavy" }
             : cycle === 1 ? { intensityDelta: 0, volumeMultiplier: 1.05, focus: "Volume" }
             : { intensityDelta: 2.5, volumeMultiplier: 0.95, focus: "Moderate" };
      }
    },
    block: {
      key: "block", label: "Block periodization",
      why: "accumulation then intensification then realisation — each block builds the quality the next one needs",
      week: function (w, total) {
        var phase = w / Math.max(1, total);
        return phase < 0.45 ? { intensityDelta: 0, volumeMultiplier: 1.15, focus: "Accumulation" }
             : phase < 0.8  ? { intensityDelta: 7.5, volumeMultiplier: 0.9, focus: "Intensification" }
             : { intensityDelta: 12, volumeMultiplier: 0.7, focus: "Realisation" };
      }
    },
    endurance: {
      key: "endurance", label: "Endurance build",
      why: "volume rises for three weeks then drops — the classic build/recover cycle distance training runs on",
      week: function (w) {
        var cycle = w % 4;
        return cycle === 3 ? { intensityDelta: 0, volumeMultiplier: 0.6, focus: "Recovery week" }
             : { intensityDelta: 0, volumeMultiplier: 1 + cycle * 0.12, focus: "Build" };
      }
    }
  };

  /** Model follows from goal and experience — see the header for why. */
  function chooseModel(intent, experience) {
    if (intent.key === "endurance" || intent.key === "hyrox") return MODELS.endurance;
    if (experience === "Beginner") return MODELS.linear;
    if (intent.key === "strength" && (experience === "Advanced" || experience === "Athlete")) return MODELS.block;
    if (experience === "Advanced" || experience === "Athlete") return MODELS.undulating;
    return MODELS.linear;
  }

  /* ---------------------------------------------------------
     Deload scheduling
  --------------------------------------------------------- */

  /* How many hard weeks before a deload, by experience. Advanced lifters generate more
     fatigue per session and need them sooner, not later — the common assumption is
     backwards. */
  var DELOAD_INTERVAL = { "Beginner": 8, "Intermediate": 6, "Advanced": 4, "Athlete": 4 };

  function deloadWeeks(totalWeeks, experience) {
    var every = DELOAD_INTERVAL[experience] || 6;
    var out = [];
    for (var w = every; w < totalWeeks; w += every) out.push(w);
    // A deload in the final week wastes the block — you would peak and then stop.
    return out.filter(function (w) { return w < totalWeeks - 1; });
  }

  /* ---------------------------------------------------------
     Build
  --------------------------------------------------------- */
  var DURATIONS = [1, 2, 4, 6, 8, 12, 16];

  /**
   * @param {object} input { recommendation, weeks, experience }
   *        `recommendation` is the object from IgnytCoachEngine — its week is the template.
   * @returns {object} the program
   */
  function build(input) {
    var rec = input && input.recommendation;
    if (!rec || !rec.week || !rec.week.length) return null;

    var totalWeeks = Math.max(1, Math.min(52, Number(input.weeks) || 8));
    var experience = (rec.profile && rec.profile.experience) || "Intermediate";
    var model = chooseModel(rec.intent, experience);
    var deloads = deloadWeeks(totalWeeks, experience);

    var weeks = [];
    for (var w = 0; w < totalWeeks; w++) {
      var isDeload = deloads.indexOf(w) !== -1;
      var shape = isDeload
        ? { intensityDelta: -10, volumeMultiplier: 0.5, focus: "Deload" }
        : model.week(w, totalWeeks);

      var days = rec.week.map(function (d) {
        /* Sets scale with the week's volume multiplier; the exercises themselves do not
           change, because swapping movements every week is how people lose the ability to
           tell whether they are progressing. */
        var exercises = d.session.exercises.map(function (e) {
          return {
            name: e.name, muscle: e.muscle, equipment: e.equipment,
            sets: Math.max(1, Math.round(e.sets * shape.volumeMultiplier)),
            repRange: e.repRange.slice(),
            restSeconds: e.restSeconds,
            /* Load guidance is relative, because the app cannot know anyone's true 1RM.
               "Add 2.5 kg on your top set" is actionable; a fabricated percentage is not. */
            loadCue: isDeload ? "Keep the bar light — technique only"
              : shape.intensityDelta > 0 ? "Aim slightly heavier than week " + w
              : "Match last week's load"
          };
        });
        var sets = exercises.reduce(function (a, e) { return a + e.sets; }, 0);
        return {
          label: d.label,
          muscles: d.session.muscles,
          exercises: exercises,
          totalSets: sets,
          estimatedMinutes: Math.round(10 + sets * ((exercises[0] ? exercises[0].restSeconds : 90) + 40) / 60),
          warmup: d.session.warmup,
          cooldown: d.session.cooldown
        };
      });

      weeks.push({
        index: w,
        number: w + 1,
        isDeload: isDeload,
        focus: shape.focus,
        intensityDelta: shape.intensityDelta,
        volumeMultiplier: Math.round(shape.volumeMultiplier * 100) / 100,
        days: days,
        totalSets: days.reduce(function (a, d) { return a + d.totalSets; }, 0),
        estimatedMinutes: days.reduce(function (a, d) { return a + d.estimatedMinutes; }, 0),
        note: isDeload
          ? "Deload — half the sets, well short of failure. This is where the previous block's work is absorbed."
          : null
      });
    }

    return {
      generatedAt: Date.now(),
      weeks: weeks,
      totalWeeks: totalWeeks,
      daysPerWeek: rec.week.length,
      split: rec.split,
      intent: rec.intent,
      model: { key: model.key, label: model.label, why: model.why },
      deloadWeeks: deloads.map(function (w) { return w + 1; }),
      confidence: rec.confidence,
      explanation: [
        model.label + " over " + totalWeeks + " weeks, because " + model.why + ".",
        deloads.length
          ? "Deload in week" + (deloads.length > 1 ? "s " : " ") + deloads.map(function (w) { return w + 1; }).join(", ") +
            " — every " + (DELOAD_INTERVAL[experience] || 6) + " weeks at your level."
          : "No deload scheduled: at " + totalWeeks + " week" + (totalWeeks === 1 ? "" : "s") + " the block ends before one is due.",
        "The split, exercises and volume come from your current recommendation — this only decides how they change week to week."
      ],
      /* Totals for the preview header. */
      summary: {
        sessions: totalWeeks * rec.week.length,
        totalSets: weeks.reduce(function (a, w) { return a + w.totalSets; }, 0),
        totalHours: Math.round(weeks.reduce(function (a, w) { return a + w.estimatedMinutes; }, 0) / 60 * 10) / 10
      }
    };
  }

  /* ---------------------------------------------------------
     Adaptation (§27 auto-regeneration, §28 plateau response)
  --------------------------------------------------------- */

  /**
   * Decides whether a program still fits the user, and what to do if not. It does NOT
   * silently rewrite anything — it returns a verdict the UI can act on, because quietly
   * replacing someone's programme is how trust in a training app dies.
   */
  function evaluate(program, input) {
    var reasons = [];
    var rec = input && input.recommendation;

    if (!program) return { valid: false, action: "build", reasons: ["no program yet"] };

    if (rec) {
      if (rec.split && program.split && rec.split.key !== program.split.key) {
        reasons.push({ k: "split", why: "your training days or goal changed, so the split no longer matches" });
      }
      if (rec.week && rec.week.length !== program.daysPerWeek) {
        reasons.push({ k: "days", why: "you now train " + rec.week.length + " days a week, not " + program.daysPerWeek });
      }
      if (rec.intent && program.intent && rec.intent.key !== program.intent.key) {
        reasons.push({ k: "goal", why: "your goal changed to " + rec.intent.label.toLowerCase() });
      }
    }

    var missed = input && input.missedSessions;
    if (missed >= 4) {
      reasons.push({ k: "adherence", why: missed + " missed sessions — a shorter week is more likely to be completed than a rebuilt one" });
    }
    if (input && input.plateau) {
      reasons.push({ k: "plateau", why: "no strength change in three weeks — the block has stopped producing" });
    }
    if (input && input.readiness && input.readiness.overtraining && input.readiness.overtraining.recommendDeload) {
      reasons.push({ k: "fatigue", why: "fatigue signals suggest bringing the next deload forward" });
    }

    var structural = reasons.some(function (r) { return r.k === "split" || r.k === "days" || r.k === "goal"; });
    return {
      valid: reasons.length === 0,
      action: structural ? "rebuild" : reasons.length ? "adjust" : "keep",
      reasons: reasons
    };
  }

  window.IgnytCoachProgram = Object.freeze({
    build: build,
    evaluate: evaluate,
    chooseModel: chooseModel,
    deloadWeeks: deloadWeeks,
    MODELS: MODELS,
    DURATIONS: DURATIONS,
    DELOAD_INTERVAL: DELOAD_INTERVAL
  });
}());
