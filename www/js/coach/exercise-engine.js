/* =========================================================
   IGNYT COACH — EXERCISE SELECTION ENGINE

   Picks exercises from the app's existing 337-exercise library. It never invents a movement:
   everything it returns is already in LIBRARY and already has a detail entry, so anything it
   recommends can be logged, searched and read about immediately.

   INJURY FILTERING IS A HARD GATE, NOT A RANKING PENALTY
   Every other consideration here is a score. Injury is not. If someone reported knee pain,
   a deep squat does not score lower — it is removed from the candidate pool entirely, before
   ranking begins. A scoring system can always be outvoted by enough other factors, and
   "the algorithm decided your bad knee mattered less than muscle balance" is not an
   acceptable failure mode.

   SUBSTITUTION WALKS DOWN, NOT SIDEWAYS
   When equipment is missing the replacement is chosen by matching movement pattern and
   primary muscle, preferring simpler equipment. Barbell bench becomes dumbbell bench becomes
   machine press becomes push-up — the same job, progressively less kit.
========================================================= */
(function () {
  "use strict";

  /* Which movements to withhold for which reported problem area. Matched against the
     exercise's movement pattern, primary muscle and name. Deliberately broad: a false
     exclusion costs one exercise out of hundreds, a false inclusion costs an injury. */
  var INJURY_RULES = {
    knee: {
      patterns: [/squat/i, /lunge/i, /jump/i, /plyo/i],
      names: [/deep squat/i, /pistol/i, /box jump/i, /leg extension/i, /sissy/i],
      why: "loaded knee flexion under depth or impact"
    },
    back: {
      patterns: [/hinge/i, /deadlift/i],
      names: [/deadlift/i, /good morning/i, /bent[- ]over row/i, /back extension/i, /clean/i, /snatch/i],
      why: "loaded spinal flexion or heavy hip hinging"
    },
    "lower back": { alias: "back" },
    shoulder: {
      patterns: [/overhead/i, /vertical push/i],
      names: [/overhead press/i, /military/i, /upright row/i, /behind[- ]the[- ]neck/i, /dip/i, /snatch/i],
      why: "overhead loading and end-range shoulder positions"
    },
    neck: {
      names: [/shrug/i, /upright row/i, /behind[- ]the[- ]neck/i, /neck/i],
      why: "direct cervical loading"
    },
    wrist: {
      names: [/push[- ]up/i, /front squat/i, /clean/i, /handstand/i, /plank/i],
      why: "loaded wrist extension"
    },
    elbow: {
      names: [/skull ?crusher/i, /dip/i, /close[- ]grip/i, /curl/i],
      why: "end-range elbow loading"
    },
    hip: {
      patterns: [/hinge/i],
      names: [/deep squat/i, /sumo/i, /adduct/i, /abduct/i],
      why: "end-range hip loading"
    },
    ankle: {
      names: [/jump/i, /calf raise/i, /box/i, /sprint/i, /plyo/i],
      why: "impact and end-range ankle loading"
    }
  };

  /* Equipment ladder, easiest to hardest to obtain. Substitution walks down it. */
  var EQUIPMENT_RANK = {
    "Bodyweight": 0, "None": 0, "Resistance Band": 1, "Band": 1,
    "Dumbbell": 2, "Kettlebell": 2, "Machines": 3, "Machine": 3, "Cable": 3,
    "Barbell": 4, "Smith Machine": 4, "Sled": 5, "Rower": 5, "Ski Erg": 5, "Other": 3
  };

  function rankOf(eq) {
    var k = String(eq || "").trim();
    return EQUIPMENT_RANK[k] != null ? EQUIPMENT_RANK[k] : 3;
  }

  var DIFFICULTY_RANK = { "Beginner": 0, "Intermediate": 1, "Advanced": 2 };

  /** Resolves reported pain areas to their rule objects, following aliases. */
  function rulesFor(painAreas) {
    var out = [];
    (painAreas || []).forEach(function (raw) {
      var key = String(raw || "").toLowerCase().trim();
      Object.keys(INJURY_RULES).forEach(function (k) {
        if (key.indexOf(k) === -1) return;
        var rule = INJURY_RULES[k];
        if (rule.alias) rule = INJURY_RULES[rule.alias];
        if (rule && out.indexOf(rule) === -1) out.push(rule);
      });
    });
    return out;
  }

  /** True when this exercise should be withheld given the user's reported problems. */
  function isUnsafe(entry, rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.patterns && r.patterns.some(function (p) { return p.test(entry.movementPattern || ""); })) return r;
      if (r.names && r.names.some(function (p) { return p.test(entry.name || ""); })) return r;
    }
    return null;
  }

  /**
   * Builds the candidate pool once, so every later query is a filter over an array rather
   * than a rebuild.
   * @param {object} opts { library, detailsFor, profile }
   */
  function buildPool(opts) {
    var library = opts.library || [];
    var detailsFor = opts.detailsFor || function () { return {}; };
    var profile = opts.profile || {};
    var rules = rulesFor(profile.painAreas);
    var avoid = (profile.exercisesToAvoid || []).map(function (s) { return String(s).toLowerCase(); });
    var owned = (profile.equipment || []).map(function (s) { return String(s).toLowerCase(); });
    var maxDiff = DIFFICULTY_RANK[opts.maxDifficulty] != null ? DIFFICULTY_RANK[opts.maxDifficulty] : 2;

    var pool = [], excluded = [];

    library.forEach(function (lib) {
      var name = lib.name || lib[0];
      var d = detailsFor(name) || {};
      var entry = {
        name: name,
        muscle: d.primaryMuscle || d.primaryMuscles || lib.muscle || lib[3] || "Other",
        secondary: d.secondaryMuscles || [],
        equipment: d.equipment || "Other",
        difficulty: d.difficulty || "Intermediate",
        movementPattern: d.movementPattern || d.movementType || "",
        prescription: lib.presc || lib[1] || ""
      };

      // 1. Hard gate: anything the user asked to avoid, by name.
      if (avoid.some(function (a) { return a && entry.name.toLowerCase().indexOf(a) !== -1; })) {
        excluded.push({ name: entry.name, reason: "on your avoid list" });
        return;
      }
      // 2. Hard gate: injury.
      var hit = isUnsafe(entry, rules);
      if (hit) { excluded.push({ name: entry.name, reason: hit.why }); return; }
      // 3. Hard gate: too advanced.
      if ((DIFFICULTY_RANK[entry.difficulty] || 1) > maxDiff) {
        excluded.push({ name: entry.name, reason: "above your current level" });
        return;
      }
      // 4. Equipment: available if owned, or if it needs nothing.
      entry.available = rankOf(entry.equipment) === 0 ||
        owned.length === 0 ||
        owned.some(function (o) { return entry.equipment.toLowerCase().indexOf(o) !== -1 || o.indexOf(entry.equipment.toLowerCase()) !== -1; });

      entry.isCompound = rankOf(entry.equipment) >= 2 && /squat|hinge|press|pull|row|deadlift|lunge|carry/i.test(entry.movementPattern + " " + entry.name);
      pool.push(entry);
    });

    return { all: pool, excluded: excluded, injuryRules: rules };
  }

  /**
   * Picks exercises for one muscle.
   * @returns {Array} entries, best first
   */
  function selectFor(pool, muscle, opts) {
    var o = opts || {};
    var count = o.count || 2;
    var compoundBias = o.compoundBias != null ? o.compoundBias : 0.6;
    var recent = o.recentNames || [];
    var favourites = (o.favourites || []).map(function (s) { return String(s).toLowerCase(); });

    var candidates = pool.all.filter(function (e) {
      if (e.muscle !== muscle) return false;
      return e.available;
    });
    // Nothing available for this muscle with the kit on hand — fall back to bodyweight,
    // which is better than returning an empty slot.
    if (!candidates.length) {
      candidates = pool.all.filter(function (e) { return e.muscle === muscle && rankOf(e.equipment) === 0; });
    }

    var scored = candidates.map(function (e) {
      var s = 50;
      if (e.isCompound) s += compoundBias * 40;
      if (favourites.indexOf(e.name.toLowerCase()) !== -1) s += 25;
      // Rotate: something trained in the last two sessions scores lower so the plan varies
      // week to week without becoming random.
      var idx = recent.indexOf(e.name);
      if (idx !== -1) s -= 30 - Math.min(20, idx * 2);
      // Simplicity is a ranking preference, not a gate — see the note in goal-engine.js on
      // why hard-gating beginners to Beginner-tagged exercises emptied whole muscle groups.
      if (e.difficulty === "Beginner") s += o.preferSimple ? 30 : 4;
      if (o.preferSimple && e.difficulty === "Advanced") s -= 25;
      return { e: e, s: s };
    });

    scored.sort(function (a, b) { return b.s - a.s || a.e.name.localeCompare(b.e.name); });
    return scored.slice(0, count).map(function (x) { return x.e; });
  }

  /**
   * Finds a replacement for an exercise the user cannot do.
   * Matches movement pattern and muscle first, then prefers simpler equipment.
   */
  function substitute(pool, name, opts) {
    var o = opts || {};
    var target = pool.all.filter(function (e) { return e.name === name; })[0];
    if (!target) return null;

    var options = pool.all.filter(function (e) {
      if (e.name === target.name) return false;
      if (!e.available && !o.ignoreEquipment) return false;
      return e.muscle === target.muscle;
    }).map(function (e) {
      var s = 0;
      if (e.movementPattern && e.movementPattern === target.movementPattern) s += 50;
      // Prefer equipment that is the same or easier to get hold of.
      var diff = rankOf(target.equipment) - rankOf(e.equipment);
      s += diff >= 0 ? 20 - diff * 2 : diff * 8;
      if (e.difficulty === target.difficulty) s += 10;
      return { e: e, s: s };
    }).sort(function (a, b) { return b.s - a.s; });

    return options.length ? options[0].e : null;
  }

  window.IgnytCoachExercise = Object.freeze({
    buildPool: buildPool,
    selectFor: selectFor,
    substitute: substitute,
    rulesFor: rulesFor,
    INJURY_RULES: INJURY_RULES
  });
}());
