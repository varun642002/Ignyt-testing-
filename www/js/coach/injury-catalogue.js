/* =========================================================
   IGNYT COACH — INJURY & CONDITION CATALOGUE

   Twenty-four entries. Each names what to avoid, what to do instead, and whether the entry is
   an injury the app can reasonably program around or a medical condition where the only honest
   answer is "ask your doctor".

   WHAT THIS IS, STATED PLAINLY, BECAUSE THE DISTINCTION MATTERS MORE HERE THAN ANYWHERE ELSE
   IN THE APP. These are PROGRAMMING ACCOMMODATIONS, not medical advice, not diagnosis, and not
   clearance to exercise. Self-reported "shoulder pain" spans impingement, a labral tear, a
   rotator cuff tear and ordinary delayed-onset soreness; no rule table can tell those apart and
   this one does not pretend to. What it can do is stop the app cheerfully prescribing overhead
   press to someone who has just told it their shoulder hurts, which is a low bar the app was
   previously failing.

   TWO KINDS OF ENTRY, HANDLED DIFFERENTLY ON PURPOSE
     injury     A musculoskeletal problem. The app removes the movements that commonly load it
                and offers alternatives. Confidence is reasonable; the mechanics are well
                understood and the failure mode of being too cautious is a slightly easier week.
     medical    Pregnancy, heart disease, hypertension, osteoporosis. These carry `medical:true`
                and the app applies the most conservative restriction it has AND says, every
                time, that a clinician should be directing this. It never implies the resulting
                plan is medically approved, because it is not and cannot be.

   SEVERITY CHANGES HOW MUCH IS REMOVED, which is the difference between useful and useless.
   Removing everything for a twinge makes the app unusable and people turn the feature off;
   removing nothing for a genuine tear makes it dangerous. See severityFilter() below.

   MATCHING WORKS TWO WAYS, and it needs both.
     patterns   Movement patterns from substitution-map (squat, hinge, vertical_press). Precise,
                but only covers what the template system names.
     nameRx     Regular expressions against the exercise NAME. Most of this catalogue is about
                qualities — jumping, sprinting, twisting under load — that are not movement
                patterns at all and appear across dozens of differently-named exercises.
========================================================= */
window.IgnytCoachInjuries = (function () {
  "use strict";

  /* Severity ladder. `recovering` sits with the cautious end deliberately: someone rebuilding
     after a tear is exactly who should not be handed the movement that caused it, and they are
     also the most likely to feel fine and overreach. */
  var SEVERITY = ["mild", "moderate", "severe", "recovering"];

  function rx(s) { return new RegExp(s, "i"); }

  var CATALOGUE = [
    /* ---- lower limb ------------------------------------------------------------------- */
    { id: "knee", label: "Knee pain / injury", region: "Knee", type: "injury",
      patterns: ["squat", "lunge"],
      nameRx: [rx("jump|plyo|box jump|burpee|sprint|hill|depth drop|bound|hurdle|hop"),
               rx("deep squat|sissy squat|pistol"), rx("walking lunge|jump lunge")],
      highRisk: [rx("jump|plyo|burpee|depth drop|hurdle|bound")],
      alternatives: ["Leg Press (Machine)", "Goblet Squat", "Glute Bridge", "Cycling", "Lying Leg Curl (Machine)"],
      note: "Impact and deep knee flexion are out; loading through a pain-free range is not." },

    { id: "acl", label: "ACL injury / recovery", region: "Knee", type: "injury", medical: true,
      patterns: ["squat", "lunge"],
      nameRx: [rx("jump|plyo|burpee|bound|hurdle|sprint|agility|cone|shuttle|skater|lateral bound"),
               rx("squat \\(barbell\\)|front squat|back squat|pistol")],
      highRisk: [rx("jump|plyo|agility|cone|shuttle|bound|pivot")],
      alternatives: ["Leg Press (Machine)", "Lying Leg Curl (Machine)", "Glute Bridge", "Cycling", "Straight Leg Raise"],
      note: "Pivoting and cutting are the specific risk. Follow your surgeon's or physio's stage, not this app's." },

    { id: "meniscus", label: "Meniscus injury", region: "Knee", type: "injury",
      patterns: ["squat", "lunge"],
      nameRx: [rx("jump|plyo|burpee|bound|hurdle|twist|rotation|pivot"), rx("deep squat|pistol|sissy")],
      highRisk: [rx("jump|plyo|twist|pivot")],
      alternatives: ["Straight Leg Raise", "Cycling", "Glute Bridge", "Leg Press (Machine)"],
      note: "Twisting under load is the movement to avoid, more than depth alone." },

    { id: "ankle", label: "Ankle sprain", region: "Ankle", type: "injury",
      patterns: ["run_easy", "run_interval", "calf"],
      nameRx: [rx("jump|plyo|burpee|bound|hurdle|hop|skip|sprint|running|shuttle|agility|calf raise")],
      highRisk: [rx("jump|plyo|hop|bound|sprint")],
      alternatives: ["Rowing Machine", "Cycling", "Bench Press (Barbell)", "Lat Pulldown (Cable)", "Single Leg Balance Hold"],
      note: "Upper body and seated cardio stay available while this settles." },

    { id: "achilles", label: "Achilles tendon pain", region: "Ankle", type: "injury",
      patterns: ["run_easy", "run_interval", "calf"],
      nameRx: [rx("jump rope|jump|plyo|sprint|running|hill|bound|hop|skip"), rx("calf raise|calf")],
      highRisk: [rx("jump|sprint|plyo|hop")],
      alternatives: ["Cycling", "Rowing Machine", "Calf Raise Eccentric", "Leg Press (Machine)"],
      note: "Slow eccentric calf work is usually the rehab; explosive calf work is not." },

    { id: "shin_splints", label: "Shin splints", region: "Shin", type: "injury",
      patterns: ["run_easy", "run_interval"],
      nameRx: [rx("running|sprint|jump|plyo|hop|skip|hill|treadmill|shuttle|bound")],
      highRisk: [rx("running|sprint|jump|hill")],
      alternatives: ["Cycling", "Elliptical", "Rowing Machine", "Swim Freestyle"],
      note: "Keep the aerobic work, take out the impact." },

    { id: "plantar", label: "Plantar fasciitis", region: "Foot", type: "injury",
      patterns: ["run_easy", "run_interval"],
      nameRx: [rx("running|sprint|jump|plyo|hop|skip|hill|bound|barefoot|duck walk")],
      highRisk: [rx("jump|sprint|running|hop")],
      alternatives: ["Cycling", "Rowing Machine", "Swim Freestyle", "Leg Press (Machine)"],
      note: "Non-impact cardio, and mind footwear on everything else." },

    { id: "hamstring", label: "Hamstring strain", region: "Hamstring", type: "injury",
      patterns: ["hinge", "knee_flexion", "run_interval"],
      nameRx: [rx("sprint|running|hill|bound|sled sprint"), rx("romanian deadlift|good morning|deadlift|nordic|leg curl")],
      highRisk: [rx("sprint|nordic|romanian")],
      alternatives: ["Glute Bridge", "Walking", "Cycling", "Leg Press (Machine)"],
      note: "Lengthening under load and sprinting are the two that re-tear this." },

    { id: "quad", label: "Quad strain", region: "Quadriceps", type: "injury",
      patterns: ["squat", "run_interval"],
      nameRx: [rx("sprint|jump|plyo|hill|bound"), rx("squat \\(barbell\\)|front squat|hack squat|sissy")],
      highRisk: [rx("sprint|jump|plyo")],
      alternatives: ["Cycling", "Squat (Bodyweight)", "Glute Bridge", "Leg Press (Machine)"],
      note: "Pain-free range only, and no explosive work until it settles." },

    { id: "calf", label: "Calf strain", region: "Calf", type: "injury",
      patterns: ["calf", "run_easy", "run_interval"],
      nameRx: [rx("jump rope|jump|sprint|hill|plyo|hop|skip|bound|calf raise")],
      highRisk: [rx("jump|sprint|hill|plyo")],
      alternatives: ["Cycling", "Swim Freestyle", "Rowing Machine", "Leg Press (Machine)"],
      note: "Rebuild calf load gradually — this one recurs when rushed." },

    { id: "hip", label: "Hip pain", region: "Hip", type: "injury",
      patterns: ["squat", "lunge"],
      nameRx: [rx("jump|plyo|burpee|bound|hurdle|sprint"), rx("deep squat|sumo|wide|cossack|lateral squat"),
               rx("walking lunge|jump lunge|bulgarian")],
      highRisk: [rx("jump|plyo|burpee")],
      alternatives: ["Glute Bridge", "Leg Press (Machine)", "Box Squat (Barbell)", "Hip Circles Stretch", "Walking"],
      note: "Depth and width both provoke this; height of impact makes it worse." },

    /* ---- spine ------------------------------------------------------------------------- */
    { id: "back", label: "Lower back pain", region: "Lower Back", type: "injury",
      patterns: ["hinge"],
      nameRx: [rx("deadlift|good morning|romanian"), rx("bent over row|barbell row"),
               rx("sit ?up|crunch|russian twist|woodchop|jefferson curl"), rx("squat \\(barbell\\)|front squat")],
      highRisk: [rx("deadlift|good morning|jefferson curl|russian twist")],
      alternatives: ["Bird Dog", "Plank", "Hip Thrust (Barbell)", "Chest Supported Incline Row (Dumbbell)",
                     "Seated Row (Machine)", "Curl Up McGill", "Walking"],
      note: "Loaded flexion and rotation are the two to drop. Walking is usually well tolerated." },

    { id: "neck", label: "Neck pain", region: "Neck", type: "injury",
      patterns: ["vertical_press"],
      nameRx: [rx("shrug|behind the neck|overhead press|military press"), rx("bridge|headstand|handstand")],
      highRisk: [rx("behind the neck|shrug|headstand")],
      alternatives: ["Face Pull", "Chin Tuck Rehab", "Chest Supported Incline Row (Dumbbell)", "Band Pullaparts"],
      note: "Overhead loading and shrugging are out while this settles." },

    /* ---- upper limb -------------------------------------------------------------------- */
    { id: "shoulder", label: "Shoulder pain", region: "Shoulder", type: "injury",
      patterns: ["vertical_press"],
      nameRx: [rx("overhead press|military press|behind the neck|arnold press"),
               rx("upright row"), rx("\\bdip\\b"), rx("bench press - wide|wide grip")],
      highRisk: [rx("behind the neck|upright row|\\bdip\\b")],
      alternatives: ["Single Arm Landmine Press (Barbell)", "Chest Press (Machine)",
                     "Chest Supported Incline Row (Dumbbell)", "Face Pull", "Chest Press (Band)"],
      note: "Neutral-grip pressing is often fine when overhead is not — stop if it pinches." },

    { id: "rotator_cuff", label: "Rotator cuff injury", region: "Shoulder", type: "injury",
      patterns: ["vertical_press"],
      nameRx: [rx("overhead press|military|behind the neck|snatch|jerk|clean"),
               rx("upright row|\\bdip\\b|kipping|muscle up|throw|slam")],
      highRisk: [rx("kipping|snatch|jerk|behind the neck|throw")],
      alternatives: ["External Rotation (Cable)", "Side Lying External Rotation", "Face Pull",
                     "Chest Supported Incline Row (Dumbbell)", "Scaption Raise"],
      note: "Rehab is external rotation and light rows. Heavy pressing and anything ballistic waits." },

    { id: "elbow", label: "Elbow pain (tennis / golfer's)", region: "Elbow", type: "injury",
      patterns: ["tricep_isolation", "bicep_isolation"],
      nameRx: [rx("skullcrusher|triceps extension"), rx("bicep curl \\(barbell\\)|ez bar|preacher|drag curl"),
               rx("\\bdip\\b|chin up|pull up"), rx("wrist curl|grip|farmer")],
      highRisk: [rx("skullcrusher|ez bar|preacher")],
      alternatives: ["Single Arm Triceps Pushdown (Cable)", "Band Tricep Extension", "Tyler Twist",
                     "Bicep Curl (Dumbbell)", "Hammer Curl (Dumbbell)"],
      note: "Lighter loads and neutral grips. Repetitive gripping is what keeps this going." },

    { id: "wrist", label: "Wrist pain", region: "Wrist", type: "injury",
      patterns: ["horizontal_press", "forearm"],
      nameRx: [rx("push ?up"), rx("bench press \\(barbell\\)|front squat|clean|snatch"),
               rx("bicep curl \\(barbell\\)|ez bar|wrist curl"), rx("plank|burpee|handstand")],
      highRisk: [rx("front rack|clean|snatch|handstand")],
      alternatives: ["Bench Press (Dumbbell)", "Chest Press (Machine)", "Hammer Curl (Dumbbell)",
                     "Lat Pulldown (Cable)", "Leg Press (Machine)"],
      note: "Neutral-grip dumbbells and machines take the wrist out of it." },

    { id: "chest_strain", label: "Chest strain", region: "Chest", type: "injury",
      patterns: ["horizontal_press", "incline_press", "chest_fly"],
      nameRx: [rx("bench press|floor press|incline press|decline press"),
               rx("\\bdip\\b|chest fly|cable fly|push ?up|plyo push")],
      highRisk: [rx("\\bdip\\b|plyo|explosive|clap")],
      alternatives: ["Chest Press (Machine)", "Lat Pulldown (Cable)", "Leg Press (Machine)", "Squat (Barbell)"],
      note: "Let it heal — lower body work can carry the block meanwhile." },

    /* ---- conditions: medical clearance required ---------------------------------------- */
    { id: "obesity_joint", label: "Joint pain with higher body weight", region: "General", type: "condition",
      patterns: ["run_interval"],
      nameRx: [rx("burpee|jumping jack|box jump|jump|plyo|bound|hop|sprint|running")],
      highRisk: [rx("burpee|box jump|plyo")],
      alternatives: ["Walking", "Cycling", "Rowing Machine", "Leg Press (Machine)", "Chest Press (Machine)"],
      note: "Impact is what hurts, not effort. Low-impact work at real intensity is the way in." },

    { id: "pregnancy", label: "Pregnancy", region: "General", type: "condition", medical: true,
      patterns: ["run_interval", "core_antiext"],
      nameRx: [rx("jump|plyo|burpee|bound|contact|box jump|sprint"),
               rx("sit ?up|crunch|russian twist|hollow|v ?up|jackknife|plank"),
               rx("supine|lying|bench press|floor press"), rx("deadlift|snatch|clean|jerk")],
      highRisk: [rx("jump|plyo|contact|russian twist|hollow")],
      alternatives: ["Walking", "Swim Freestyle", "Cycling", "Chest Supported Incline Row (Dumbbell)", "Glute Bridge"],
      note: "Every trimester is different and this app cannot see yours. Your midwife or doctor sets the limits here, not IGNYT." },

    { id: "hypertension", label: "High blood pressure", region: "General", type: "condition", medical: true,
      patterns: ["run_interval"],
      nameRx: [rx("1rm|max|heavy|deadlift \\(barbell\\)|isometric.*hold"), rx("handstand|inverted|headstand")],
      highRisk: [rx("1rm|max effort")],
      alternatives: ["Walking", "Cycling", "Rowing Machine", "Chest Press (Machine)", "Leg Press (Machine)"],
      note: "Avoid maximal effort and breath-holding (the Valsalva manoeuvre). Moderate, controlled work with steady breathing." },

    { id: "heart", label: "Heart disease", region: "General", type: "condition", medical: true,
      patterns: ["run_interval", "sled_push", "wall_ball"],
      nameRx: [rx("hiit|sprint|max|1rm|tabata|burpee|plyo|assault bike|battle rope")],
      highRisk: [rx("hiit|sprint|max|tabata")],
      alternatives: ["Walking", "Cycling", "Rowing Machine", "Chest Press (Machine)"],
      note: "Unsupervised high intensity is not something this app should be programming for you. Cardiac rehab guidance comes first." },

    { id: "osteoarthritis", label: "Osteoarthritis", region: "General", type: "condition",
      patterns: ["run_interval"],
      nameRx: [rx("jump|plyo|burpee|bound|hop|hurdle|sprint|running|box jump")],
      highRisk: [rx("jump|plyo|burpee")],
      alternatives: ["Swim Freestyle", "Cycling", "Leg Press (Machine)", "Chest Press (Machine)", "Rowing Machine"],
      note: "Resistance training within a comfortable range is usually helpful. Repetitive impact usually is not." },

    { id: "osteoporosis", label: "Osteoporosis", region: "General", type: "condition", medical: true,
      patterns: ["hinge", "run_interval"],
      nameRx: [rx("jump|plyo|burpee|bound|hop|box jump"),
               rx("sit ?up|crunch|russian twist|woodchop|jefferson curl|toe touch|good morning"),
               rx("deadlift|rotation|twist")],
      highRisk: [rx("jefferson curl|russian twist|sit ?up|jump")],
      alternatives: ["Walking", "Leg Press (Machine)", "Chest Press (Machine)", "Single Leg Balance Hold", "Bird Dog"],
      note: "Loaded spinal flexion and twisting carry fracture risk. Supervised strength work is the goal, not avoidance of strength work." }
  ];

  var byId = {};
  CATALOGUE.forEach(function (c) { byId[c.id] = c; });

  function get(id) { return byId[id] || null; }
  function all() { return CATALOGUE.slice(); }
  function severities() { return SEVERITY.slice(); }

  /**
   * Which rules apply at this severity.
   *
   * mild only removes the genuinely high-risk movements. That is not a compromise, it is the
   * feature working: strip a whole training block for a twinge and people switch the setting
   * off, and then it protects nobody at all. Everything else removes the full list.
   */
  function severityFilter(entry, severity) {
    var s = String(severity || "moderate").toLowerCase();
    if (s === "mild") return { nameRx: entry.highRisk || [], patterns: [] };
    return { nameRx: entry.nameRx || [], patterns: entry.patterns || [] };
  }

  /**
   * Everything to avoid for a set of selections.
   * @param {Array} selections [{ id, severity, side }]
   */
  function restrictionsFor(selections) {
    var patterns = [], nameRx = [], alternatives = [], notes = [], medical = false, labels = [];
    (selections || []).forEach(function (sel) {
      var e = get(sel && sel.id);
      if (!e) return;
      var f = severityFilter(e, sel.severity);
      patterns = patterns.concat(f.patterns);
      nameRx = nameRx.concat(f.nameRx);
      alternatives = alternatives.concat(e.alternatives || []);
      if (e.note) notes.push(e.label + ": " + e.note);
      labels.push(e.label);
      /* Medical either because the condition is inherently one, or because the user told us a
         clinician has already restricted them — at which point the app defers, full stop. */
      if (e.medical || sel.professionalAdvice || String(sel.severity).toLowerCase() === "severe") medical = true;
    });
    return {
      patterns: patterns.filter(uniq), nameRx: nameRx,
      alternatives: alternatives.filter(uniq), notes: notes, labels: labels, medical: medical
    };
  }

  function uniq(v, i, a) { return a.indexOf(v) === i; }

  /** Would this exercise name be excluded? */
  function blocksName(restrictions, name) {
    if (!name || !restrictions || !restrictions.nameRx) return false;
    for (var i = 0; i < restrictions.nameRx.length; i++) {
      try { if (restrictions.nameRx[i].test(name)) return true; } catch (e) {}
    }
    return false;
  }

  /**
   * The line shown on any adjusted plan.
   *
   * Always present when anything was adjusted, never buried, and never worded so that it
   * sounds like approval. The medical variant is stronger because those users need it to be.
   */
  function safetyNotice(restrictions) {
    if (!restrictions || !restrictions.labels.length) return "";
    var base = "This plan has been adjusted for your " + restrictions.labels.join(" and ").toLowerCase() +
               ". If you feel pain during exercise, stop.";
    return restrictions.medical
      ? base + " IGNYT is not a medical device and cannot assess your condition — please train under the guidance of a healthcare professional."
      : base + " If it persists, see a healthcare professional.";
  }

  return Object.freeze({
    all: all, get: get, severities: severities,
    restrictionsFor: restrictionsFor, blocksName: blocksName,
    safetyNotice: safetyNotice, severityFilter: severityFilter,
    CATALOGUE: CATALOGUE
  });
})();
