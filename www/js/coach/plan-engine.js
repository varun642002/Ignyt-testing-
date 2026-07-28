/* =========================================================
   IGNYT COACH — SPLIT GENERATOR AND SESSION BUILDER

   Turns "N days per week, this goal, this recovery state" into an actual week and then into
   actual sessions.

   THE SPLIT IS CHOSEN, NOT LOOKED UP
   Days available is the hard constraint — you cannot run a six-day push/pull/legs on three
   days — but within what fits, the goal decides. Fat loss prefers full-body because
   frequency beats per-session volume when the budget is calories; muscle gain prefers
   push/pull/legs because per-session volume is the point.

   MUSCLE ROTATION RESPECTS RECOVERY
   The generator will not schedule a muscle whose readiness is under 60, and it spaces the
   ones it does schedule. That is why the recovery engine returns per-muscle numbers rather
   than one daily score — a single number cannot tell you whether to train legs today.
========================================================= */
(function () {
  "use strict";

  /* Split shapes. `pattern` lists the muscle groups each day targets, in order. */
  var SPLITS = {
    fullbody: {
      key: "fullbody", label: "Full body",
      minDays: 1, maxDays: 4,
      day: function () { return ["Quadriceps", "Chest", "Back", "Shoulders", "Hamstrings", "Abdominals"]; },
      why: "hits everything each session, which is the most efficient way to use a small number of training days"
    },
    upperlower: {
      key: "upperlower", label: "Upper / Lower",
      minDays: 2, maxDays: 6,
      day: function (i) {
        return i % 2 === 0
          ? ["Chest", "Back", "Shoulders", "Triceps", "Biceps"]
          : ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Abdominals"];
      },
      why: "alternating upper and lower gives each half around 72 hours to recover while still training often"
    },
    ppl: {
      key: "ppl", label: "Push / Pull / Legs",
      minDays: 3, maxDays: 6,
      day: function (i) {
        var m = i % 3;
        return m === 0 ? ["Chest", "Shoulders", "Triceps"]
             : m === 1 ? ["Back", "Lats", "Biceps", "Forearms"]
             : ["Quadriceps", "Hamstrings", "Glutes", "Calves"];
      },
      why: "grouping muscles that share a movement means they are trained and rested together instead of fighting each other"
    },
    bodypart: {
      key: "bodypart", label: "Body part split",
      minDays: 5, maxDays: 6,
      day: function (i) {
        var groups = [["Chest", "Triceps"], ["Back", "Lats"], ["Shoulders"],
                      ["Quadriceps", "Hamstrings", "Glutes", "Calves"], ["Biceps", "Triceps", "Forearms"], ["Abdominals"]];
        return groups[i % groups.length];
      },
      why: "one or two muscles per session allows the volume per muscle that hypertrophy at this level needs"
    }
  };

  /** Picks the split: what fits the days available, ordered by what the goal prefers. */
  function chooseSplit(intent, days) {
    var prefs = intent.splitPreference || ["fullbody"];
    for (var i = 0; i < prefs.length; i++) {
      var s = SPLITS[prefs[i]];
      if (s && days >= s.minDays && days <= s.maxDays) return s;
    }
    // Nothing preferred fits — take anything that does rather than returning nothing.
    var fallback = Object.keys(SPLITS).map(function (k) { return SPLITS[k]; })
      .filter(function (s) { return days >= s.minDays && days <= s.maxDays; });
    return fallback[0] || SPLITS.fullbody;
  }

  /* Warm-up is built from the movement patterns the session actually contains, so a leg day
     does not open with arm circles. */
  var WARMUPS = {
    lower: ["5 min easy bike or brisk walk", "Leg swings — 10 each side", "Bodyweight squats — 15",
            "Glute bridges — 15", "Walking lunges — 10 each side"],
    upper: ["5 min row or arm-bike", "Band pull-aparts — 20", "Shoulder dislocates — 10",
            "Scapular push-ups — 12", "Light set of the first exercise — 12 reps"],
    full:  ["5 min easy cardio", "World's greatest stretch — 5 each side", "Bodyweight squats — 12",
            "Band pull-aparts — 15", "Light set of the first exercise — 10 reps"]
  };

  var COOLDOWNS = {
    "Quadriceps": "Standing quad stretch — 30 s each side",
    "Hamstrings": "Seated hamstring stretch — 30 s each side",
    "Glutes": "Figure-four stretch — 30 s each side",
    "Calves": "Wall calf stretch — 30 s each side",
    "Chest": "Doorway pec stretch — 30 s each side",
    "Back": "Child's pose — 45 s", "Lats": "Overhead lat stretch — 30 s each side",
    "Shoulders": "Cross-body shoulder stretch — 30 s each side",
    "Triceps": "Overhead triceps stretch — 30 s each side",
    "Biceps": "Wall biceps stretch — 30 s each side",
    "Abdominals": "Cobra stretch — 30 s", "Forearms": "Wrist flexor stretch — 30 s each side",
    "Adductors": "Butterfly stretch — 45 s"
  };

  function warmupFor(muscles) {
    var lower = ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Adductors"];
    var hasLower = muscles.some(function (m) { return lower.indexOf(m) !== -1; });
    var hasUpper = muscles.some(function (m) { return lower.indexOf(m) === -1 && m !== "Abdominals"; });
    return (hasLower && hasUpper) ? WARMUPS.full : hasLower ? WARMUPS.lower : WARMUPS.upper;
  }

  function cooldownFor(muscles) {
    var out = [];
    muscles.forEach(function (m) { if (COOLDOWNS[m] && out.indexOf(COOLDOWNS[m]) === -1) out.push(COOLDOWNS[m]); });
    return out.slice(0, 5);
  }

  /**
   * Builds one session.
   * @param {object} ctx { pool, intent, muscles, recovery, recentNames, favourites, minutes }
   */
  function buildSession(ctx) {
    var intent = ctx.intent;
    var recovery = ctx.recovery || { loadMultiplier: 1, muscles: {} };
    var EX = window.IgnytCoachExercise;

    /* Drop muscles that have not recovered. Reported rather than silently skipped, so the
       user can see why their leg day became an upper day. */
    var trainable = [], deferred = [];
    ctx.muscles.forEach(function (m) {
      var r = recovery.muscles && recovery.muscles[m];
      if (r && r.readiness < 60) deferred.push({ muscle: m, readiness: r.readiness, hoursSince: r.hoursSince });
      else trainable.push(m);
    });
    if (!trainable.length) trainable = ctx.muscles.slice(0, 2);   // never return an empty session

    /* How many exercises fit the time available. Roughly 8 minutes per exercise once warm-up
       and rest are counted. */
    var minutes = ctx.minutes || 60;
    var slots = Math.max(3, Math.min(8, Math.round((minutes - 10) / 8)));
    var perMuscle = Math.max(1, Math.round(slots / trainable.length));

    /* Sets per EXERCISE, derived from the weekly per-muscle target.
       The weekly figure has to be divided by how many times the muscle is trained AND by how
       many exercises hit it in a session — dividing by frequency alone double-counted the
       volume whenever a muscle got two exercises, which is what pushed a 60-minute session
       to an 83-minute estimate. */
    var perWeek = intent.setsPerMuscleWeek[0];
    var setsLow = perWeek / Math.max(1, ctx.weeklyFrequency || 2) / Math.max(1, perMuscle);
    var setsTarget = Math.max(2, Math.min(5, Math.round(setsLow * recovery.loadMultiplier)));

    var exercises = [];
    trainable.forEach(function (m) {
      EX.selectFor(ctx.pool, m, {
        count: perMuscle,
        compoundBias: intent.compoundBias,
        preferSimple: !!intent.preferSimple,
        recentNames: ctx.recentNames || [],
        favourites: ctx.favourites || []
      }).forEach(function (e) {
        if (exercises.length >= slots) return;
        exercises.push({
          name: e.name,
          muscle: e.muscle,
          equipment: e.equipment,
          sets: setsTarget,
          repRange: intent.repRange.slice(),
          restSeconds: intent.restSeconds,
          isCompound: e.isCompound
        });
      });
    });

    // Compounds first: they need the most from a fresh nervous system.
    exercises.sort(function (a, b) { return (b.isCompound ? 1 : 0) - (a.isCompound ? 1 : 0); });

    var totalSets = exercises.reduce(function (a, e) { return a + e.sets; }, 0);
    return {
      muscles: trainable,
      deferred: deferred,
      exercises: exercises,
      warmup: warmupFor(trainable),
      cooldown: cooldownFor(trainable),
      totalSets: totalSets,
      // Time from real components rather than a guess: sets x (work + rest) plus warm-up.
      estimatedMinutes: Math.round(10 + totalSets * ((intent.restSeconds + 40) / 60)),
      intensityNote: recovery.loadMultiplier < 1
        ? "Volume reduced " + Math.round((1 - recovery.loadMultiplier) * 100) + "% for recovery"
        : recovery.loadMultiplier > 1 ? "Recovery is good — push these sets close to failure" : null
    };
  }

  /**
   * Builds the training week.
   * @returns {{split:object, days:Array, why:string}}
   */
  function buildWeek(ctx) {
    var days = ctx.profile.trainingDays || 3;
    var split = chooseSplit(ctx.intent, days);
    var out = [];

    for (var i = 0; i < days; i++) {
      var muscles = split.day(i);
      out.push({
        index: i,
        label: split.label + (split.key === "fullbody" ? "" : " — day " + (i + 1)),
        session: buildSession({
          pool: ctx.pool, intent: ctx.intent, muscles: muscles,
          recovery: i === 0 ? ctx.recovery : { loadMultiplier: 1, muscles: {} },
          recentNames: ctx.recentNames, favourites: ctx.favourites,
          minutes: ctx.profile.minutesPerSession || 60,
          weeklyFrequency: Math.max(1, Math.round(days / (split.key === "fullbody" ? 1 : split.key === "ppl" ? 3 : 2)))
        })
      });
    }

    return { split: split, days: out, why: split.why };
  }

  window.IgnytCoachPlan = Object.freeze({
    buildWeek: buildWeek,
    buildSession: buildSession,
    chooseSplit: chooseSplit,
    warmupFor: warmupFor,
    cooldownFor: cooldownFor,
    SPLITS: SPLITS
  });
}());
