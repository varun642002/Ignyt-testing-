/* =========================================================
   IGNYT COACH — TEMPLATE MATCHER (spec §2)

   Assigns one starting template. That is the whole job.

   IT OWNS THE FIRST WEEK AND NOTHING ELSE.
   Everything after assignment — how the plan changes, when to deload, what today's volume
   should be given last night's sleep — belongs to program-engine, recovery-engine and
   adaptation-engine, which already exist. Two modules deciding the same thing is how they end
   up disagreeing, and this codebase has been bitten by that before.

   WHY A TREE AND NOT A SCORE
   The rest of the coach engine ranks candidates by weighted score, and that is right for
   picking an exercise from 337 options. It is wrong here. A user must be able to ask "why am
   I on this plan?" and get an answer they can check — "you train 4 days, you want muscle, you
   are a beginner". A weighted score cannot produce that sentence, only a number. explain()
   exists because the tree makes it possible.

   ORDER ENCODES PRIORITY. Hard constraints run before preferences: a plan the user cannot
   physically perform is worse than one that merely suits them less well.
========================================================= */
window.IgnytCoachMatcher = (function () {
  "use strict";

  function T() { return window.IgnytCoachTemplates; }

  /* Onboarding stores free text and legacy values; the tree needs a small closed set. */
  function normGoal(raw) {
    var g = String(raw || "").toLowerCase();
    if (/hyrox/.test(g)) return "hyrox";
    if (/endur|run|marathon|5k|10k/.test(g)) return "endurance";
    if (/strength|power|1rm/.test(g)) return "strength";
    if (/fat|lose|cut|lean/.test(g)) return "fatloss";
    if (/muscle|gain|bulk|hypertroph|size/.test(g)) return "muscle";
    if (/recomp/.test(g)) return "recomp";
    return "general";
  }
  function normExp(raw) {
    var e = String(raw || "").toLowerCase();
    if (/adv|expert/.test(e)) return "advanced";
    if (/inter|some/.test(e)) return "intermediate";
    return "beginner";
  }
  function normEquip(list) {
    var arr = (list || []).map(function (x) { return String(x).toLowerCase(); });
    var has = function (re) { return arr.some(function (x) { return re.test(x); }); };
    if (has(/barbell|rack|machine|cable|gym/)) return "full_gym";
    if (has(/bench|kettlebell|band|home/)) return "home_gym";
    if (has(/dumbbell/)) return "dumbbells";
    return "bodyweight";
  }

  /**
   * @param {object} p  { goal, experience, days, sessionMinutes, equipment[] }
   * @returns {object}  { template, reasons[], fallback:boolean }
   */
  function assign(p) {
    var lib = T();
    if (!lib) return null;

    var goal = normGoal(p.goal);
    var exp = normExp(p.experience);
    var equip = normEquip(p.equipment);
    var days = Math.max(2, Math.min(6, Number(p.days) || 3));
    var minutes = Number(p.sessionMinutes) || 45;
    var reasons = [];

    /* GUARD 1 — session length is a hard filter, not a preference.
       A 6-day PPL in 30-minute sessions is not PPL, it is five dropped exercises and a
       misleading plan name. */
    var pool = lib.all().filter(function (t) { return t.minMinutes <= minutes; });
    if (!pool.length) {
      return { template: lib.get("beginner_full_body"), fallback: true,
               reasons: ["No template fits " + minutes + "-minute sessions — starting with full body."] };
    }

    /* GUARD 2 — days available caps the split. You cannot run a 6-day PPL on three days. */
    var fits = pool.filter(function (t) { return days >= t.daysRange[0] && days <= t.daysRange[1]; });

    /* EQUIPMENT BEFORE GOAL, deliberately.
       Goal is an aspiration; equipment is a fact. Someone with only dumbbells who picks
       "Strength" cannot run Powerlifting — there is no rack, no bar, no plates. Testing goal
       first would assign it and then quietly gut it through substitution, leaving the user
       following a "powerlifting" plan containing no powerlifts. */
    if (equip === "bodyweight") {
      reasons.push("Bodyweight only, so the plan is built from movements that need no kit.");
      return done(pick(fits, "bodyweight") || lib.get("bodyweight"), reasons);
    }
    if (equip === "dumbbells" && goal !== "hyrox" && goal !== "endurance") {
      reasons.push("Dumbbells only — every movement here has a real dumbbell version.");
      return done(pick(fits, "dumbbell_only") || lib.get("dumbbell_only"), reasons);
    }

    reasons.push("Goal: " + goal + ".");

    if (goal === "hyrox") {
      reasons.push("HYROX training is its own discipline — running and stations together.");
      var hx = exp === "advanced" ? "hyrox_advanced" : exp === "intermediate" ? "hyrox_intermediate" : "hyrox_beginner";
      return done(lib.get(hx), reasons);
    }
    if (goal === "endurance") {
      reasons.push("Strength work sits around the running rather than competing with it.");
      return done(lib.get("running_strength"), reasons);
    }
    if (goal === "fatloss") {
      /* Three fat-loss templates, and the split between them is real rather than cosmetic.
         A CIRCUIT is continuous work at a moderate effort; HIIT is genuinely maximal intervals
         with real rest between them. Prescribing them as the same thing is why "HIIT" so often
         ends up meaning "a circuit performed while tired", which is neither.

         The circuit stays the default because it is the most accessible: 30 minutes, any
         equipment down to none. Intervals are routed to only when there is time and kit to do
         them properly — an interval session cut to 30 minutes is a circuit whether it is
         labelled one or not. */
      if (exp === "beginner" && days <= 3 && minutes >= 30 && equip !== "bodyweight") {
        reasons.push("Two interval sessions and a strength day — enough stimulus without out-running recovery.");
        return done(lib.get("hiit_beginner"), reasons);
      }
      if (exp !== "beginner" && days >= 4 && minutes >= 45) {
        reasons.push("Intervals and strength alternate so neither lands on tired legs.");
        return done(lib.get("hiit_conditioning"), reasons);
      }
      reasons.push("Short rests and full-body circuits preserve muscle while weight comes off.");
      return done(pick(fits, "fat_loss_circuit") || lib.get("fat_loss_circuit"), reasons);
    }
    if (goal === "strength") {
      if (exp === "beginner") {
        reasons.push("Fixed 5s make progression unambiguous while technique is still being learned.");
        return done(lib.get("strength_5x5"), reasons);
      }
      reasons.push("Competition lifts trained heavy twice a week.");
      return done(pick(fits, "powerlifting") || lib.get("strength_5x5"), reasons);
    }

    /* Muscle / recomp / general all resolve on days + experience. */
    reasons.push(days + " days a week, " + exp + ".");
    if (exp === "beginner") {
      return done(lib.get(days >= 4 ? "beginner_upper_lower" : "beginner_full_body"), reasons);
    }
    if (days >= 6) {
      return done(lib.get(exp === "advanced" ? "arnold_split" : "ppl_6day"), reasons);
    }
    if (days === 5) return done(lib.get("bro_split"), reasons);
    if (days === 4) return done(lib.get("intermediate_upper_lower"), reasons);
    return done(lib.get("beginner_full_body"), reasons);

    function pick(list, id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
    /* THE GUARDS ARE ENFORCED HERE, at the single exit, and not at each branch.
       They were originally applied only where a branch happened to call pick(fits, …), and
       most branches do not — they call lib.get(…) directly for the one template that goal and
       experience imply. A user asking for 30-minute sessions was handed the Arnold Split,
       which needs 75. The filter existed, was documented as hard, and was bypassed by most of
       the code paths that mattered.

       Putting it on the way out means a new branch cannot forget it. That is worth more than
       the slightly odd shape of validating a decision the tree has already made. */
    function done(template, why) {
      if (template && template.minMinutes > minutes) {
        var roomier = fits.filter(function (t) {
          return t.minMinutes <= minutes && t.goals.indexOf(goal) !== -1;
        })[0] || pool.filter(function (t) {
          return days >= t.daysRange[0] && days <= t.daysRange[1];
        })[0];
        why.push(template.name + " needs " + template.minMinutes + "-minute sessions, so this is the closest fit to your " + minutes + ".");
        template = roomier || null;
      }
      /* Never returns null. An unmatched user gets the safest useful plan there is rather
         than an empty screen — full body is defensible for anyone. */
      if (!template) return { template: lib.get("beginner_full_body"), reasons: why, fallback: true };
      return { template: template, reasons: why, fallback: false };
    }
  }

  /**
   * Plain-language answer to "why am I on this plan?".
   *
   * Injuries are named here but deliberately do NOT appear in assign(): an injury changes
   * which EXERCISES fill the slots, never which plan you are on. Reassigning someone off
   * Push Pull Legs because of a sore knee would take away their chest and back training too.
   */
  function explain(result, injuries) {
    if (!result || !result.template) return "";
    var out = result.reasons.slice();
    if (result.template.why) out.push(result.template.why);
    if (injuries && injuries.length) {
      out.push("Movements that would aggravate your " + injuries.join(" and ") +
               " are swapped for alternatives — the plan itself is unchanged.");
    }
    return out.join(" ");
  }

  return Object.freeze({
    assign: assign, explain: explain,
    normGoal: normGoal, normExp: normExp, normEquip: normEquip
  });
})();
