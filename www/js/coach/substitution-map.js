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
    horizontal_press: ["Bench Press (Barbell)", "Bench Press (Dumbbell)", "Floor Press (Dumbbell)", "Push Up", "Chest Press (Machine)", "Kettlebell Shoulder Press"],
    incline_press: ["Incline Bench Press (Barbell)", "Incline Bench Press (Dumbbell)", "Incline Bench Press (Dumbbell)", "Decline Push Up", "Chest Press (Machine)"],
    vertical_press: ["Overhead Press (Barbell)", "Shoulder Press (Dumbbell)", "Shoulder Press (Dumbbell)", "Pike Pushup", "Overhead Press (Smith Machine)", "Kettlebell Shoulder Press"],
    horizontal_pull: ["Bent Over Row (Barbell)", "Bent Over Row (Dumbbell)", "Bent Over Row (Dumbbell)", "Inverted Row", "Seated Row (Machine)", "Gorilla Row (Kettlebell)"],
    vertical_pull: ["Lat Pulldown (Cable)", "Pull Up", "Pull Up", "Pull Up", "Lat Pulldown (Machine)"],
    squat: ["Squat (Barbell)", "Goblet Squat", "Goblet Squat", "Squat (Bodyweight)", "Leg Press (Machine)", "Kettlebell Goblet Squat"],
    hinge: ["Deadlift (Barbell)", "Romanian Deadlift (Dumbbell)", "Romanian Deadlift (Dumbbell)", "Single Leg Romanian Deadlift (Dumbbell)", "Kettlebell Swing", "Back Extension (Machine)", "Single Leg Glute Bridge"],
    lunge: ["Lunge (Barbell)", "Lunge (Dumbbell)", "Lunge (Dumbbell)", "Lunge", "Kettlebell Goblet Squat"],
    hip_extension: ["Hip Thrust (Barbell)", "Hip Thrust (Dumbbell)", "Single Leg Glute Bridge", "Glute Bridge", "Hip Thrust (Machine)"],
    knee_flexion:     ["Lying Leg Curl (Machine)", "Seated Leg Curl (Machine)", "Romanian Deadlift (Dumbbell)", "Nordic Hamstrings Curls", "Single Leg Glute Bridge"],
    lateral_raise: ["Lateral Raise (Cable)", "Lateral Raise (Dumbbell)", "Lateral Raise (Dumbbell)", "Lateral Raise (Band)", "Lateral Raise (Machine)"],
    rear_delt: ["Face Pull", "Rear Delt Reverse Fly (Dumbbell)", "Rear Delt Reverse Fly (Dumbbell)", "Band Pullaparts", "Rear Delt Reverse Fly (Machine)"],
    chest_fly: ["Cable Fly Crossovers", "Chest Fly (Dumbbell)", "Chest Fly (Dumbbell)", "Push Up", "Chest Fly (Machine)", "Wide Push Up"],
    bicep_isolation: ["Bicep Curl (Barbell)", "Bicep Curl (Dumbbell)", "Bicep Curl (Dumbbell)", "Chin Up", "Bicep Curl (Machine)", "Kettlebell Curl"],
    tricep_isolation: ["Single Arm Triceps Pushdown (Cable)", "Skullcrusher (Dumbbell)", "Triceps Extension (Dumbbell)", "Diamond Push Up", "Triceps Extension (Machine)"],
    forearm:          ["Seated Wrist Curl (Barbell)", "Reverse Wrist Curl (Dumbbell)", "Reverse Wrist Curl (Dumbbell)", "Dead Hang"],
    carry: ["Farmers Walk", "Farmers Walk", "Farmers Walk", "Suitcase Carry (Dumbbell)", "Bottoms Up Carry", "Dead Hang"],
    core_antiext:     ["Ab Wheel", "Ab Wheel", "Plank", "Plank"],
    calf: ["Standing Calf Raise (Machine)", "Standing Calf Raise (Dumbbell)", "Standing Calf Raise (Dumbbell)", "Seated Calf Raise", "Smith Machine Calf Raise"],

    /* ---- conditioning and HYROX stations ----------------------------------------------
       Added after an audit showed the HYROX templates could only resolve 23-56% of their
       slots. The cause was NOT a thin library — every one of these movements was already in
       it, all eight stations included. The patterns simply had no chain here, so each slot
       silently dropped out and a "HYROX Advanced" plan came back as a handful of squats.
       A template naming a pattern with no chain fails quietly, which is the worst way to
       fail; validate() checks names against the library but could not see a pattern that was
       never declared. */
    run_easy:         ["Running", "Running", "Running", "Running"],
    run_interval:     ["Running", "Running", "Running", "Running"],
    sled_push:        ["Sled Push", "Sled Push", "Sled Push", "Sled Push", "Bear Crawl"],
    sled_pull:        ["Sled Pull", "Sled Pull", "Sled Pull", "Sled Pull", "Broad Jump"],
    wall_ball:        ["Wall Ball", "Wall Ball", "Wall Ball", "Wall Ball", "Jump Squat"],
    ski_erg:          ["Ski Erg", "Ski Erg", "Ski Erg", "Ski Erg", "Star Jump"],
    row_erg:          ["Rowing Machine", "Rowing Machine", "Rowing Machine", "Rowing Machine", "Mountain Climber"],
    sandbag_lunge:    ["Walking Lunge (Sandbag)", "Walking Lunge (Sandbag)", "Walking Lunge (Dumbbell)", "Walking Lunge"],
    /* A race simulation is the whole event, not one movement. It resolves to Running so the
       session is loggable at all; the athlete logs the stations they actually did alongside
       it. Mapping it to nothing would drop the single most important session in the plan. */
    race_simulation:  ["Running", "Running", "Running", "Running"],

    /* Mobility patterns. Same tier list as everything else even though none of these need
       equipment — the resolver walks by index, and a four-entry chain is what it expects. */
    hip_mobility:      ["90/90 Hip Switch", "90/90 Hip Switch", "Couch Stretch", "Couch Stretch", "Stretching"],
    thoracic_mobility: ["Thoracic Rotation Stretch", "Thoracic Rotation Stretch", "Cat-Cow Stretch", "Cat-Cow Stretch", "Stretching"],
    shoulder_mobility: ["Band Dislocate Stretch", "Band Dislocate Stretch", "Doorway Chest Stretch", "Doorway Chest Stretch", "Stretching"],
    ankle_mobility:    ["Ankle Circles Stretch", "Ankle Circles Stretch", "Calf Stretch on Wall", "Calf Stretch on Wall", "Stretching"]
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
  /* WHAT EACH SELECTION ACTUALLY LETS YOU DO.

     The tier model this replaces collapsed twenty equipment options into four buckets, and
     the collapse lost the answer. Selecting "Barbell" alone matched /barbell/ and became
     full_gym, so the plan handed out Lat Pulldown (Cable). Selecting "Machines" alone did the
     same and prescribed barbell bench, squat and deadlift — every single exercise being one
     the user had just said they do not have. Bodyweight-only was given a dumbbell RDL.

     Filtering on the exercise's real library CATEGORY fixes it, because that is the fact that
     matters: a Machine exercise needs a machine, whatever bucket the user fell into.

     BODYWEIGHT IS ALWAYS ALLOWED, deliberately and unconditionally. Everyone has their body,
     so it is the one category that can never be unavailable — and it is what stops a narrow
     selection like "Kettlebells" resolving to nothing at all for patterns kettlebells cannot
     cover. A plan is always producible. */
  var EQUIP_CATEGORIES = {
    "commercial gym":      ["Barbell", "Dumbbell", "Machine", "Kettlebell", "Conditioning", "Cardio Machine"],
    "home gym":            ["Dumbbell", "Kettlebell", "Barbell"],
    "bodyweight only":     [],
    "adjustable dumbbells":["Dumbbell"],
    "barbell":             ["Barbell"],
    "machines":            ["Machine"],
    "resistance bands":    [],
    "cable machine":       ["Machine"],
    "kettlebells":         ["Kettlebell"],
    "trx":                 [],
    "medicine balls":      ["Conditioning"],
    "sled":                ["Conditioning"],
    "rowerg":              ["Cardio Machine"],
    "skierg":              ["Cardio Machine"],
    "assault bike":        ["Cardio Machine"],
    "treadmill":           ["Cardio Machine"],
    "exercise bike":       ["Cardio Machine"],
    "elliptical":          ["Cardio Machine"],
    "swimming pool":       ["Cardio Outdoor"],
    "running track":       ["Cardio Outdoor"]
  };

  /** The library categories a selection unlocks. Always includes the two that need nothing. */
  /* MORE THAN ONE VOCABULARY REACHES THIS TABLE, and an exact-string lookup silently loses the
     ones it does not recognise — which is the worst possible failure here, because an
     unrecognised item unlocks NOTHING and a fully equipped gym quietly gets demoted to
     bodyweight. A real profile held ["Barbell","Dumbbell","Machines","Sled","Rower","Ski Erg",
     "Kettlebell"] and was prescribed barbell and machine work only: "Dumbbell", "Kettlebell",
     "Rower" and "Ski Erg" all missed, so it never saw a dumbbell or a kettlebell again.

     So the lookup normalises (case, spaces, punctuation), falls back across the singular/plural
     boundary, and finally consults this alias table for the words that are genuinely different
     rather than merely differently spelled. */
  var EQUIP_ALIASES = {
    dumbell: "adjustable dumbbells", freeweights: "adjustable dumbbells",
    kb: "kettlebells",
    selectorized: "machines", machineweights: "machines",
    cable: "cable machine", cables: "cable machine",
    band: "resistance bands", bands: "resistance bands", resistanceband: "resistance bands",
    bodyweight: "bodyweight only", none: "bodyweight only", nothing: "bodyweight only",
    gym: "commercial gym", fullgym: "commercial gym",
    rower: "rowerg", rowingmachine: "rowerg", rowmachine: "rowerg", concept: "rowerg",
    ski: "skierg",
    airbike: "assault bike", fanbike: "assault bike", echobike: "assault bike",
    bike: "exercise bike", stationarybike: "exercise bike", spinbike: "exercise bike",
    crosstrainer: "elliptical",
    medball: "medicine balls", slamball: "medicine balls",
    suspensiontrainer: "trx", rings: "trx", gymnasticrings: "trx",
    pool: "swimming pool", swimming: "swimming pool",
    track: "running track",
    prowler: "sled", sledge: "sled"
  };

  function normKey(s) { return String(s || "").toLowerCase().replace(/[^a-z]/g, ""); }

  var NORM_INDEX = (function () {
    var m = {};
    Object.keys(EQUIP_CATEGORIES).forEach(function (k) { m[normKey(k)] = k; });
    return m;
  })();

  /** The library categories one equipment item unlocks, or null if the word is unknown. */
  function categoriesFor(item) {
    var n = normKey(item);
    if (!n) return null;
    if (NORM_INDEX[n]) return EQUIP_CATEGORIES[NORM_INDEX[n]];
    if (EQUIP_ALIASES[n]) return EQUIP_CATEGORIES[EQUIP_ALIASES[n]] || null;
    /* "Dumbbell" for "Adjustable Dumbbells", "Kettlebell" for "Kettlebells" — a plural is not
       a different piece of equipment. */
    var alt = n.slice(-1) === "s" ? n.slice(0, -1) : n + "s";
    if (NORM_INDEX[alt]) return EQUIP_CATEGORIES[NORM_INDEX[alt]];
    if (EQUIP_ALIASES[alt]) return EQUIP_CATEGORIES[EQUIP_ALIASES[alt]] || null;
    /* Last resort: a key that CONTAINS the word, so "Dumbbell" finds "adjustable dumbbells". */
    var keys = Object.keys(NORM_INDEX);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(n) !== -1 || n.indexOf(keys[i]) !== -1) return EQUIP_CATEGORIES[NORM_INDEX[keys[i]]];
    }
    return null;
  }

  /** Anything in the selection this table does not recognise. Should always be empty. */
  function unmatchedEquipment(selection) {
    return (selection || []).filter(function (item) { return categoriesFor(item) === null; });
  }

  function allowedCategories(selection) {
    var out = { "Bodyweight": true, "Mobility / Stretch": true, "Cardio Outdoor": true };
    (selection || []).forEach(function (item) {
      var cats = categoriesFor(item);
      if (cats) cats.forEach(function (c) { out[c] = true; });
    });
    return out;
  }

  /* "Conditioning" is a mixed category: sleds, sandbags and atlas stones sit beside movements
     that need nothing at all. Recategorising the library would change what every user browses,
     so instead name the handful that are genuinely equipment-free and let those through for
     everyone. Without this a bodyweight-only user could not be given a burpee. */
  var FREE_CONDITIONING = {
    "Burpee": true, "Burpee Broad Jumps": true, "Shadow Boxing": true,
    "Carioca Drill": true, "Lateral Shuffle Drill": true
  };

  /** Movements anyone can do, whatever they own. */
  function alwaysAvailable(name, cat) {
    return cat === "Bodyweight" || cat === "Mobility / Stretch" ||
           cat === "Cardio Outdoor" || !!FREE_CONDITIONING[name];
  }

  /** Only what the selection unlocks — no free categories. Used to give owned kit priority. */
  function ownedCategories(selection) {
    var out = {};
    (selection || []).forEach(function (item) {
      var cats = categoriesFor(item);
      if (cats) cats.forEach(function (c) { out[c] = true; });
    });
    return out;
  }

  function libraryNames() {
    try {
      if (typeof allLibraryExercises !== "function") return null;
      var set = {};
      allLibraryExercises().forEach(function (e) { set[e.name] = true; });
      return set;
    } catch (e) { return null; }
  }

  function libraryCats() {
    try {
      if (typeof allLibraryExercises !== "function") return null;
      var m = {};
      allLibraryExercises().forEach(function (e) { m[e.name] = e.cat; });
      return m;
    } catch (e) { return null; }
  }

  /**
   * The exercise a pattern resolves to.
   *
   * @param pattern  movement pattern
   * @param equip    either a legacy tier string, or the user's raw equipment SELECTION array,
   *                 which is what callers should now pass. The array path filters by real
   *                 library category; the string path is kept so older callers still work.
   * @param taken    optional { name: true } of exercises already in this session. Narrow
   *                 equipment makes chains converge — with only kettlebells both squat and
   *                 lunge land on the goblet squat — and the same movement listed twice in one
   *                 day reads as a broken plan. Skipped only while an alternative exists;
   *                 repeating beats dropping the slot.
   *
   * Walks the chain in order — most equipment-dependent first — and takes the first entry the
   * user can actually perform. Falls back to any loggable entry rather than returning null,
   * because a plan with a gap is worse than a plan with a compromise.
   */
  function resolve(pattern, equip, taken) {
    var chain = CHAINS[pattern];
    if (!chain) return null;
    var known = libraryNames();
    var cats = libraryCats();
    var used = taken || {};

    if (Array.isArray(equip) && cats) {
      var allowed = allowedCategories(equip);

      /* Two passes, and the order matters. Bodyweight is always allowed, which means a single
         pass lets chain ORDER beat OWNERSHIP: a machines-only user got "Goblet Squat" purely
         because bodyweight sits earlier in the squat chain than "Leg Press (Machine)". Someone
         who tells us they have machines should be given the machine.
         Pass one considers only the categories the selection actually unlocks; pass two opens
         it up to the free-for-everyone categories. */
      var owned = ownedCategories(equip);

      /* The three in-bounds passes: owned kit first, then anything the selection permits, then
         the categories nobody needs equipment for. `skipUsed` excludes what the session already
         holds. */
      function inBounds(skipUsed) {
        var i, n;
        function free(x) { return !(skipUsed && used[x]); }

        for (i = 0; i < chain.length; i++) {
          n = chain[i];
          if (n && known && known[n] && owned[cats[n]] && free(n)) return n;
        }
        for (i = 0; i < chain.length; i++) {
          n = chain[i];
          if (n && known && known[n] && (allowed[cats[n]] || FREE_CONDITIONING[n]) && free(n)) return n;
        }
        /* Prefer an always-available fallback over simply the first chain entry. Taking the
           first entry handed a bodyweight-only user "Deadlift (Barbell)" whenever a chain had
           no bodyweight option — the single most obviously wrong thing this feature could do. */
        for (i = 0; i < chain.length; i++) {
          n = chain[i];
          if (n && known && known[n] && alwaysAvailable(n, cats[n]) && free(n)) return n;
        }
        return null;
      }

      /* Order of concessions, and it is deliberate. Repeating a movement is a cosmetic blemish;
         prescribing kit the user just told us they do not have is the bug this whole path
         exists to fix. So a REPEAT is conceded before BOUNDS are — otherwise a bodyweight-only
         chest_fly fell to "Cable Fly Crossovers" purely because the push up was already used
         by the press slot earlier that day. Only when nothing performable exists at all does
         the chain's own first entry come back, so a slot is never silently dropped. */
      var hit = inBounds(true) || inBounds(false);
      if (hit) return hit;
      for (var c = 0; c < chain.length; c++) if (chain[c] && (!known || known[chain[c]])) return chain[c];
      return null;
    }

    /* Legacy tier path, unchanged. */
    var i2 = TIER_INDEX[equip];
    if (i2 == null) i2 = 3;
    var jj;
    if (!known) {
      for (jj = i2; jj < chain.length; jj++) if (chain[jj]) return chain[jj];
      return chain[chain.length - 1] || null;
    }
    for (jj = i2; jj < chain.length; jj++) if (chain[jj] && known[chain[jj]]) return chain[jj];
    for (jj = i2 - 1; jj >= 0; jj--) if (chain[jj] && known[chain[jj]]) return chain[jj];
    return null;
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
    /* Patterns any template asks for that have no chain at all. This is the gap that let the
       HYROX templates ship resolving a quarter of their slots: every NAME was valid, so the
       old check passed, while whole patterns were undeclared and silently dropped. */
    var undeclared = [];
    try {
      if (window.IgnytCoachTemplates) {
        window.IgnytCoachTemplates.all().forEach(function (t) {
          Object.keys(t.days || {}).forEach(function (d) {
            (t.days[d] || []).forEach(function (sl) {
              if (!CHAINS[sl.pattern] && undeclared.indexOf(sl.pattern) === -1) undeclared.push(sl.pattern);
            });
          });
        });
      }
    } catch (e) {}

    return {
      checked: true, missing: missing, undeclaredPatterns: undeclared,
      patterns: Object.keys(CHAINS).length, injuries: Object.keys(INJURY).length
    };
  }

  return Object.freeze({
    resolve: resolve, chainFor: chainFor, allowedCategories: allowedCategories,
    EQUIP_CATEGORIES: EQUIP_CATEGORIES, categoriesFor: categoriesFor,
    unmatchedEquipment: unmatchedEquipment,
    bannedPatterns: bannedPatterns, ladderFor: ladderFor,
    validate: validate, CHAINS: CHAINS, INJURY: INJURY
  });
})();
