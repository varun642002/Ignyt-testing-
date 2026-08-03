/* =========================================================
   IGNYT COACH — SUBSTITUTION MAP (spec §3 + §4)

   Two tables and the lookups over them: movement pattern -> real exercise by equipment tier,
   and injury -> banned patterns plus a replacement ladder.

   THIS DOES NOT REPLACE exercise-engine.substitute().
   That function already infers substitutions at runtime by scoring movement pattern, equipment
   accessibility and difficulty, and inference is the better default — it can pick from all 337
   exercises and knows what the user actually owns. What it cannot do is guarantee a specific
   answer for a specific slot. This map is the explicit override layer: templates name patterns,
   and a pattern must resolve to something known rather than to whatever scored highest today.

   Where both exist, the map wins for template slots and the scorer wins for free substitution.

   EVERY NAME HERE MUST EXIST IN THE LIBRARY.
   A chain that resolves to a movement the app cannot log is worse than no chain — it produces
   a plan with an exercise you cannot tap. validate() exists to catch that, and should be run
   whenever the library changes rather than trusted.
========================================================= */
window.IgnytCoachSubstitution = (function () {
  "use strict";

  /* Ordered most to least equipment-dependent. Resolution walks the list and takes the first
     entry the user's equipment supports, so the PATTERN is always trained and only the
     implement changes. */
  var CHAINS = {
    horizontal_press: ["Bench Press (Barbell)", "Bench Press (Dumbbell)", "Floor Press (Dumbbell)", "Push Up"],
    incline_press:    ["Incline Bench Press (Barbell)", "Incline Bench Press (Dumbbell)", "Incline Bench Press (Dumbbell)", "Decline Push Up"],
    vertical_press:   ["Overhead Press (Barbell)", "Shoulder Press (Dumbbell)", "Shoulder Press (Dumbbell)", "Pike Pushup"],
    horizontal_pull:  ["Bent Over Row (Barbell)", "Bent Over Row (Dumbbell)", "Bent Over Row (Dumbbell)", "Inverted Row"],
    vertical_pull:    ["Lat Pulldown (Cable)", "Pull Up", "Pull Up", "Pull Up"],
    squat:            ["Squat (Barbell)", "Goblet Squat", "Goblet Squat", "Squat (Bodyweight)"],
    hinge:            ["Deadlift (Barbell)", "Romanian Deadlift (Dumbbell)", "Romanian Deadlift (Dumbbell)", "Single Leg Romanian Deadlift (Dumbbell)"],
    lunge:            ["Lunge (Barbell)", "Lunge (Dumbbell)", "Lunge (Dumbbell)", "Lunge"],
    hip_extension:    ["Hip Thrust (Barbell)", "Hip Thrust (Dumbbell)", "Single Leg Glute Bridge", "Glute Bridge"],
    knee_flexion:     ["Lying Leg Curl (Machine)", "Lying Leg Curl (Machine)", "Lying Leg Curl (Machine)", "Lying Leg Curl (Machine)"],
    lateral_raise:    ["Lateral Raise (Cable)", "Lateral Raise (Dumbbell)", "Lateral Raise (Dumbbell)", "Lateral Raise (Band)"],
    rear_delt:        ["Face Pull", "Rear Delt Reverse Fly (Dumbbell)", "Rear Delt Reverse Fly (Dumbbell)", "Band Pullaparts"],
    chest_fly:        ["Cable Fly Crossovers", "Chest Fly (Dumbbell)", "Chest Fly (Dumbbell)", "Push Up"],
    bicep_isolation:  ["Bicep Curl (Barbell)", "Bicep Curl (Dumbbell)", "Bicep Curl (Dumbbell)", "Chin Up"],
    tricep_isolation: ["Single Arm Triceps Pushdown (Cable)", "Skullcrusher (Dumbbell)", "Triceps Extension (Dumbbell)", "Diamond Push Up"],
    forearm:          ["Seated Wrist Curl (Barbell)", "Reverse Wrist Curl (Dumbbell)", "Reverse Wrist Curl (Dumbbell)", "Dead Hang"],
    carry:            ["Farmers Walk", "Farmers Walk", "Farmers Walk", "Suitcase Carry (Dumbbell)"],
    core_antiext:     ["Ab Wheel", "Ab Wheel", "Plank", "Plank"],
    calf:             ["Standing Calf Raise (Machine)", "Standing Calf Raise (Dumbbell)", "Standing Calf Raise (Dumbbell)", "Seated Calf Raise"]
  };

  var TIER_INDEX = { full_gym: 0, home_gym: 1, dumbbells: 2, bodyweight: 3 };

  /* §4 — injury rules. `banned` is a HARD GATE applied before any ranking; `ladder` is what
     fills the gap, ordered most to least loaded. */
  var INJURY = {
    knee:     { banned:["squat_deep","jump","knee_extension"],
                ladder:["Leg Press (Machine)", "Goblet Squat", "Lunge", "Dumbbell Step Up"] },
    back:     { banned:["hinge","bent_row","good_morning"],
                ladder:["Hip Thrust (Barbell)", "Chest Supported Incline Row (Dumbbell)", "Seated Row (Machine)", "Bird Dog"] },
    shoulder: { banned:["vertical_press","upright_row","wide_bench","dip"],
                ladder:["Single Arm Landmine Press (Barbell)", "Chest Press (Machine)", "Shoulder Press (Dumbbell)", "Chest Press (Band)"] },
    neck:     { banned:["shrug","vertical_press","bridge"],
                ladder:["Face Pull", "Chest Supported Incline Row (Dumbbell)", "Band Pullaparts"] },
    wrist:    { banned:["straight_bar_press","straight_bar_curl","front_rack"],
                ladder:["Bench Press (Dumbbell)", "Chest Press (Machine)", "Push Up"] },
    elbow:    { banned:["skullcrusher","straight_bar_curl","dip"],
                ladder:["Single Arm Triceps Pushdown (Cable)", "Single Arm Triceps Pushdown (Cable)", "Triceps Extension (Dumbbell)"] },
    hip:      { banned:["squat_deep","wide_stance","impact"],
                ladder:["Leg Press (Machine)", "Box Squat (Barbell)", "Glute Bridge"] },
    ankle:    { banned:["jump","run","deep_dorsiflexion"],
                ladder:["Cycling", "Rowing Machine", "Rowing Machine"] }
  };

  /**
   * The exercise a pattern resolves to for this equipment tier.
   * Falls DOWN the chain (never up) if the tier's entry is missing, because a less
   * equipment-dependent movement is always performable by someone with more equipment.
   */
  function resolve(pattern, equipmentTier) {
    var chain = CHAINS[pattern];
    if (!chain) return null;
    var i = TIER_INDEX[equipmentTier];
    if (i == null) i = 3;
    for (var j = i; j < chain.length; j++) if (chain[j]) return chain[j];
    return chain[chain.length - 1] || null;
  }

  function chainFor(pattern) { return (CHAINS[pattern] || []).slice(); }

  function bannedPatterns(injuries) {
    var out = [];
    (injuries || []).forEach(function (key) {
      var rule = INJURY[String(key).toLowerCase()];
      if (rule) out = out.concat(rule.banned);
    });
    return out;
  }

  function ladderFor(injury) {
    var rule = INJURY[String(injury || "").toLowerCase()];
    return rule ? rule.ladder.slice() : [];
  }

  /**
   * Every chain entry that is NOT in the app's exercise library.
   *
   * Reported rather than thrown. A missing name should be visible to whoever changed the
   * library, but it must never take the app down at load time — an unresolvable pattern
   * degrades to exercise-engine's scorer, which will still find something trainable.
   */
  function validate() {
    var known = null;
    try {
      if (typeof allLibraryExercises === "function") {
        known = {};
        allLibraryExercises().forEach(function (e) { known[e.name] = true; });
      }
    } catch (e) { return { checked: false, missing: [], note: "library unavailable" }; }
    if (!known) return { checked: false, missing: [], note: "library unavailable" };

    var missing = [];
    function check(name) {
      if (name && !known[name] && missing.indexOf(name) === -1) missing.push(name);
    }
    Object.keys(CHAINS).forEach(function (pattern) { CHAINS[pattern].forEach(check); });
    Object.keys(INJURY).forEach(function (key) { INJURY[key].ladder.forEach(check); });
    return {
      checked: true, missing: missing,
      patterns: Object.keys(CHAINS).length, injuries: Object.keys(INJURY).length
    };
  }

  return Object.freeze({
    resolve: resolve, chainFor: chainFor,
    bannedPatterns: bannedPatterns, ladderFor: ladderFor,
    validate: validate, CHAINS: CHAINS, INJURY: INJURY
  });
})();
