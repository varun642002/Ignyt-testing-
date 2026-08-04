/* =========================================================
   IGNYT COACH — PROFILE ENGINE

   Normalises everything the app already knows about the user into one object the rest of
   the engine reads, and scores how much of it is actually present.

   WHY A CONFIDENCE SCORE DRIVES THE DESIGN RATHER THAN DECORATING IT
   The brief asks for a confidence score, and it is tempting to compute one at the end and
   print it. That gets it backwards. Confidence is an INPUT: the engine is allowed to make
   bigger changes to someone's training when it knows more about them, and must fall back to
   safe, generic programming when it does not. A recommendation engine that restructures a
   beginner's week off two data points is not confident, it is reckless.

   So resolve() returns both the profile and its confidence, and every downstream engine is
   expected to consult the latter before doing anything aggressive.

   NOTHING HERE INVENTS DATA. A field the user never filled in stays null and lowers
   confidence. Guessing a body-fat percentage to make a number look complete would poison
   every calculation built on top of it.
========================================================= */
(function () {
  "use strict";

  /* What each field is worth to confidence. Weighted by how much it actually changes a
     recommendation: training days restructures the whole week, occupation nudges one line
     of advice. */
  var WEIGHTS = {
    // core — without these the engine is guessing
    age: 8, gender: 5, weight: 8, height: 5,
    trainingDays: 12, experienceLevel: 12, primaryGoal: 12,
    equipment: 10, minutesPerSession: 6,
    // meaningful refinements
    bodyFatPct: 4, activityLevel: 4, sleepHours: 4,
    painAreas: 3, exercisesToAvoid: 2, trainingStyle: 2,
    // history — earned rather than entered
    workoutHistory: 8, strengthHistory: 5
  };

  var TOTAL_WEIGHT = Object.keys(WEIGHTS).reduce(function (a, k) { return a + WEIGHTS[k]; }, 0);

  function num(v) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? n : null;
  }
  function str(v) {
    var s = String(v == null ? "" : v).trim();
    return s ? s : null;
  }
  function list(v) {
    if (Array.isArray(v)) return v.filter(function (x) { return x != null && String(x).trim(); });
    var s = str(v);
    // Free-text fields ("knees, lower back") are split so downstream matching can work on
    // terms rather than on one long string.
    return s ? s.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean) : [];
  }

  /* Experience is asked for directly, but a self-report is worth less than a training
     history. Where the log disagrees strongly with the claim, the log wins — someone who has
     logged 120 sessions is not a beginner regardless of what they ticked. */
  function resolveExperience(claimed, sessionCount) {
    var levels = ["Beginner", "Intermediate", "Advanced", "Athlete"];
    var claimIdx = levels.indexOf(str(claimed) || "");
    var earned = sessionCount >= 200 ? 2 : sessionCount >= 60 ? 1 : 0;
    if (claimIdx < 0) return { level: levels[earned], source: sessionCount ? "history" : "default" };
    if (earned > claimIdx) return { level: levels[earned], source: "history-override" };
    return { level: levels[claimIdx], source: "self-reported" };
  }

  /**
   * @param {object} state the app's live state object
   * @returns {{profile:object, confidence:number, missing:string[], present:string[]}}
   */
  function resolve(state) {
    var p = (state && state.profile) || {};
    var o = (state && state.onboarding) || {};
    var log = (state && Array.isArray(state.workoutLog)) ? state.workoutLog : [];
    var prs = (state && Array.isArray(state.prs)) ? state.prs : [];

    var weightKg = num(p.weight);
    var heightCm = num(p.height);
    var bmi = (weightKg && heightCm) ? Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10 : null;

    var exp = resolveExperience(o.experienceLevel, log.length);

    var profile = {
      /* identity */
      age: num(p.age),
      gender: str(p.gender),
      weightKg: weightKg,
      heightCm: heightCm,
      bmi: bmi,
      bodyFatPct: num(o.bodyFatPct),

      /* goal */
      primaryGoal: str(o.primaryGoal) || str(p.goal),
      secondaryGoals: list(o.secondaryGoals),
      targetWeightKg: num(o.targetWeight),
      // Negative means a deficit. Kept as-is rather than re-derived — it is already the
      // single source of truth for the nutrition side.
      calorieDelta: Number(p.goalDelta) || 0,

      /* capability */
      experience: exp.level,
      experienceSource: exp.source,
      activityLevel: str(o.activityLevel),
      occupation: str(o.occupation),
      dailySteps: num(o.dailySteps),

      /* logistics */
      trainingDays: Math.max(1, Math.min(7, num(p.trainingDays) || 3)),
      /* Reads the ONBOARDING answer first and the PROFILE second. It only read onboarding,
         and the goal wizard writes its session length to profile.minutesPerSession — so a user
         who set 60 minutes there resolved to null, every caller fell back to 45, and GUARD 1
         in the matcher then filtered out every template needing 60. The effect was invisible
         and total: nobody could ever be assigned Intermediate Upper Lower, Push Pull Legs or
         any other hour-long plan, whatever they answered.

         Same shape as trainingDays on the line above, which already reads from the profile.  */
      minutesPerSession: num(o.minutesPerSession) != null ? num(o.minutesPerSession) : num(p.minutesPerSession),
      equipment: list(p.equipment),
      trainingStyle: str(o.trainingStyle),
      preferredCardio: list(o.preferredCardio),

      /* constraints — the safety inputs */
      painAreas: list(o.painAreas),
      previousInjuries: str(o.previousInjuries),
      movementRestrictions: str(o.movementRestrictions),
      exercisesToAvoid: list(o.exercisesToAvoid),
      medicalConditions: str(o.medicalConditions) || list(p.medicalConditions).join(", ") || null,

      /* recovery inputs */
      sleepHours: num(o.sleepHours),
      restingHeartRate: num(o.restingHeartRate),
      stressLevel: str(o.stressLevel),

      /* earned history */
      sessionCount: log.length,
      prCount: prs.length
    };

    /* --- confidence --- */
    var have = {
      age: profile.age != null, gender: !!profile.gender,
      weight: profile.weightKg != null, height: profile.heightCm != null,
      trainingDays: num(p.trainingDays) != null,
      experienceLevel: exp.source !== "default",
      primaryGoal: !!profile.primaryGoal,
      equipment: profile.equipment.length > 0,
      minutesPerSession: profile.minutesPerSession != null,
      bodyFatPct: profile.bodyFatPct != null,
      activityLevel: !!profile.activityLevel,
      sleepHours: profile.sleepHours != null,
      painAreas: profile.painAreas.length > 0 || !!profile.previousInjuries,
      exercisesToAvoid: profile.exercisesToAvoid.length > 0,
      trainingStyle: !!profile.trainingStyle,
      workoutHistory: log.length >= 3,
      strengthHistory: prs.length >= 1
    };

    var score = 0, missing = [], present = [];
    Object.keys(WEIGHTS).forEach(function (k) {
      if (have[k]) { score += WEIGHTS[k]; present.push(k); }
      else missing.push(k);
    });

    return {
      profile: profile,
      confidence: Math.round((score / TOTAL_WEIGHT) * 100),
      missing: missing,
      present: present
    };
  }

  /** Plain-language reading of a confidence score, used in explanations. */
  function describeConfidence(c) {
    if (c >= 80) return "high";
    if (c >= 55) return "moderate";
    if (c >= 30) return "limited";
    return "low";
  }

  window.IgnytCoachProfile = Object.freeze({
    resolve: resolve,
    describeConfidence: describeConfidence,
    WEIGHTS: WEIGHTS
  });
}());
