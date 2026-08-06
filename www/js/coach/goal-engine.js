/* =========================================================
   IGNYT COACH — GOAL ENGINE

   Turns a stated goal into the training parameters everything downstream needs: which split
   shapes suit it, what rep ranges serve it, how much cardio belongs in the week, and how
   long rest should be.

   WHY PARAMETERS AND NOT TEMPLATES
   The brief was explicit that no fixed templates should be used. A template says "Monday:
   bench, rows, curls". This returns the RULES that generate a session — rep range, intensity,
   compound bias, cardio share — so the same goal produces a different week for someone
   training three days with dumbbells than for someone training six days in a full gym.

   The app already offers 24 primary goals. They collapse to eight training intents, because
   "Hypertrophy" and "Bodybuilding" want the same programming even though they are different
   words, and pretending otherwise would mean eight near-identical branches drifting apart.
========================================================= */
(function () {
  "use strict";

  /* The eight intents everything reduces to. */
  var INTENTS = {
    fatloss: {
      key: "fatloss", label: "Fat loss",
      repRange: [8, 15], intensityPct: [60, 75], compoundBias: 0.6,
      restSeconds: 60, cardioSessions: 3, cardioStyle: "mixed",
      setsPerMuscleWeek: [10, 16],
      splitPreference: ["fullbody", "upperlower", "ppl"],
      why: "moderate reps and short rest keep the session dense, which preserves muscle while the deficit does the fat loss"
    },
    muscle: {
      key: "muscle", label: "Muscle gain",
      repRange: [6, 12], intensityPct: [70, 82], compoundBias: 0.55,
      restSeconds: 105, cardioSessions: 1, cardioStyle: "zone2",
      setsPerMuscleWeek: [12, 20],
      splitPreference: ["ppl", "upperlower", "bodypart", "fullbody"],
      why: "8-12 reps near failure with full rest is where hypertrophy responds best"
    },
    strength: {
      key: "strength", label: "Strength",
      repRange: [3, 6], intensityPct: [80, 92], compoundBias: 0.8,
      restSeconds: 180, cardioSessions: 1, cardioStyle: "zone2",
      setsPerMuscleWeek: [10, 15],
      splitPreference: ["upperlower", "fullbody", "ppl"],
      why: "heavy low-rep work on compound lifts with long rest is what drives maximal strength"
    },
    recomp: {
      key: "recomp", label: "Body recomposition",
      repRange: [6, 12], intensityPct: [70, 80], compoundBias: 0.65,
      restSeconds: 90, cardioSessions: 2, cardioStyle: "mixed",
      setsPerMuscleWeek: [12, 18],
      splitPreference: ["upperlower", "ppl", "fullbody"],
      why: "lifting like you want to grow while eating near maintenance is what lets both happen at once"
    },
    endurance: {
      key: "endurance", label: "Endurance",
      repRange: [12, 20], intensityPct: [50, 65], compoundBias: 0.5,
      restSeconds: 45, cardioSessions: 4, cardioStyle: "zone2",
      setsPerMuscleWeek: [8, 12],
      splitPreference: ["fullbody", "upperlower"],
      why: "lifting is support work here — most of the adaptation comes from the cardio"
    },
    hyrox: {
      key: "hyrox", label: "HYROX",
      repRange: [10, 20], intensityPct: [55, 70], compoundBias: 0.7,
      restSeconds: 60, cardioSessions: 4, cardioStyle: "intervals",
      setsPerMuscleWeek: [10, 14],
      splitPreference: ["fullbody", "upperlower"],
      why: "HYROX is a running race with stations, so the plan pairs compound strength with running volume"
    },
    mobility: {
      key: "mobility", label: "Mobility",
      repRange: [10, 15], intensityPct: [40, 60], compoundBias: 0.4,
      restSeconds: 45, cardioSessions: 2, cardioStyle: "walk",
      setsPerMuscleWeek: [6, 10],
      splitPreference: ["fullbody"],
      why: "range of motion improves with frequent, low-load, controlled work rather than heavy loading"
    },
    general: {
      key: "general", label: "General fitness",
      repRange: [8, 12], intensityPct: [65, 78], compoundBias: 0.6,
      restSeconds: 90, cardioSessions: 2, cardioStyle: "mixed",
      setsPerMuscleWeek: [10, 14],
      splitPreference: ["fullbody", "upperlower"],
      why: "a balanced mix keeps strength, conditioning and body composition all moving without specialising"
    }
  };

  /* The app's 24 goal labels mapped onto those eight. Matched on lowercase substrings so a
     new label like "Lean Bulk" lands somewhere sensible without a code change. */
  var GOAL_PATTERNS = [
    [/hyrox/, "hyrox"],
    [/marathon|half marathon|10k|5k|running|run\b/, "endurance"],
    [/endurance|stamina|cardio/, "endurance"],
    [/mobility|flexib/, "mobility"],
    [/recomp/, "recomp"],
    [/powerlift|strength|power\b/, "strength"],
    [/muscle|hypertroph|bodybuild|bulk|mass/, "muscle"],
    [/lose weight|fat loss|weight loss|cut/, "fatloss"],
    [/athletic|sports|functional|cross training|ocr/, "general"]
  ];

  /**
   * @param {object} profile from IgnytCoachProfile.resolve()
   * @returns {object} the intent, with the fields adjusted for experience and days available
   */
  function resolve(profile) {
    var goal = String((profile && profile.primaryGoal) || "").toLowerCase();
    var key = "general";
    for (var i = 0; i < GOAL_PATTERNS.length; i++) {
      if (GOAL_PATTERNS[i][0].test(goal)) { key = GOAL_PATTERNS[i][1]; break; }
    }
    // The calorie delta is a second opinion on intent. Someone who says "general fitness"
    // but is eating 500 under maintenance is training through a deficit whether they framed
    // it that way or not, and the programming should acknowledge it.
    if (key === "general" && profile.calorieDelta <= -300) key = "fatloss";
    if (key === "general" && profile.calorieDelta >= 300) key = "muscle";

    var intent = Object.assign({}, INTENTS[key]);
    intent.matchedGoal = profile.primaryGoal || null;
    /* The resolved key, not just the raw string it came from. Downstream needs to branch on
       the CLASSIFICATION, and without this every consumer re-derives it from matchedGoal with
       its own regex — which is exactly how the template matcher ended up with a second,
       disagreeing goal normaliser. */
    intent.key = key;

    /* --- experience adjustments (the Experience Engine, §3) --- */
    if (profile.experience === "Beginner") {
      // Fewer sets, longer rest, simpler movements, and never the low-rep heavy work — a
      // beginner gains from technique and consistency, not from intensity.
      intent.setsPerMuscleWeek = [Math.max(6, intent.setsPerMuscleWeek[0] - 4), intent.setsPerMuscleWeek[1] - 4];
      intent.restSeconds = Math.round(intent.restSeconds * 1.15);
      intent.repRange = [Math.max(6, intent.repRange[0] + 2), intent.repRange[1] + 2];
      intent.intensityPct = [Math.max(50, intent.intensityPct[0] - 10), intent.intensityPct[1] - 10];
      /* Only Advanced is gated out, not Intermediate. Hard-gating to Beginner-tagged
         exercises emptied entire muscle groups — most of a 337-exercise library is tagged
         Intermediate, so a beginner was left with nothing to train chest with. Simplicity is
         handled by RANKING in the selection engine, which prefers Beginner-tagged movements,
         rather than by a gate that can return an empty session. */
      intent.maxDifficulty = "Intermediate";
      intent.preferSimple = true;
      intent.periodisation = "linear";
    } else if (profile.experience === "Intermediate") {
      intent.maxDifficulty = "Intermediate";
      intent.periodisation = "linear";
    } else {
      // Advanced and Athlete get the full range and undulating loading.
      intent.setsPerMuscleWeek = [intent.setsPerMuscleWeek[0] + 2, intent.setsPerMuscleWeek[1] + 2];
      intent.maxDifficulty = "Advanced";
      intent.periodisation = "undulating";
    }

    /* --- volume has to fit the days available --- */
    var days = profile.trainingDays || 3;
    if (days <= 2) {
      // Two sessions cannot carry a per-muscle target built for four. Lower it rather than
      // writing a week nobody can complete.
      intent.setsPerMuscleWeek = [Math.max(4, Math.round(intent.setsPerMuscleWeek[0] * 0.6)),
                                  Math.round(intent.setsPerMuscleWeek[1] * 0.6)];
    }
    intent.cardioSessions = Math.min(intent.cardioSessions, Math.max(1, 7 - days) + 1);

    return intent;
  }

  window.IgnytCoachGoal = Object.freeze({
    resolve: resolve,
    INTENTS: INTENTS
  });
}());
