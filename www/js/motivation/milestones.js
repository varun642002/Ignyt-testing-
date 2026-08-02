/* =========================================================
   MILESTONES — the moments worth marking.

   Weight, steps, water, protein, calories and goal progress. One engine rather than six
   scattered checks, because they all need the same three things: read the real number,
   work out which threshold was just crossed, and fire exactly once.

   FIRING EXACTLY ONCE IS THE WHOLE PROBLEM
   render() runs on every interaction, so "is water at 100%?" is true hundreds of times a day.
   Every milestone is therefore recorded against a key that includes what it was about and,
   where daily, which day — "water:100:2026-08-02". Already-fired keys are skipped. That makes
   check() safe to call from a render path, which is where these naturally want to live.

   WEIGHT MILESTONES ARE DIRECTIONAL AND GOAL-AWARE
   A user gaining muscle deliberately should not be congratulated for losing weight, and one
   cutting should not be congratulated for gaining. The direction comes from their own goal;
   with no goal set, no weight milestone fires at all. Silence is better than applauding
   something the user is actively trying to avoid.

   NOTHING HERE MAKES A HEALTH CLAIM
   A milestone says what happened and that it took effort. It does not say what it will do to
   anyone's body, because this app cannot know that and is not a medical device.
========================================================= */

window.IgnytMilestones = (function () {
  "use strict";

  var KEY = "hx_milestones";

  var THRESHOLDS = {
    weightKg: [0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 25, 30],
    steps:    [1000, 3000, 5000, 7000, 10000, 15000, 20000],
    waterPct: [25, 50, 75, 100],
    goalPct:  [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  };

  function readFired() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function writeFired(m) {
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* non-fatal */ }
  }

  /** True the first time a key is seen; false forever after. */
  function claim(key) {
    var fired = readFired();
    if (fired[key]) return false;
    fired[key] = Date.now();
    writeFired(fired);
    return true;
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  function msg(context) {
    return (window.IgnytMessages && IgnytMessages.next(context)) || "";
  }

  function fire(c) {
    if (window.IgnytCelebrate) IgnytCelebrate.celebrate(c);
  }

  /** The largest threshold at or below value, or null. */
  function crossed(list, value) {
    var hit = null;
    for (var i = 0; i < list.length; i++) if (value >= list[i]) hit = list[i];
    return hit;
  }

  /* ---- the individual checks -------------------------------------------------------- */

  /**
   * Weight moved toward the user's goal.
   * @param {number} startKg  the earliest logged weight
   * @param {number} nowKg    the latest
   * @param {string} direction "lose" | "gain" — from the user's own goal
   */
  function checkWeight(startKg, nowKg, direction) {
    if (!(startKg > 0) || !(nowKg > 0) || !direction) return;
    var delta = direction === "lose" ? (startKg - nowKg) : (nowKg - startKg);
    if (!(delta > 0)) return;                       // moving the other way: say nothing
    var hit = crossed(THRESHOLDS.weightKg, delta);
    if (hit == null) return;
    if (!claim("weight:" + direction + ":" + hit)) return;
    fire({
      kind: "milestone", icon: direction === "lose" ? "📉" : "📈",
      title: hit + " kg " + (direction === "lose" ? "down" : "gained"),
      body: msg("weightProgress"),
      stat: null
    });
  }

  /** Daily step count. Resets each day, so the same 10k tomorrow is worth marking again. */
  function checkSteps(steps) {
    if (!(steps > 0)) return;
    var hit = crossed(THRESHOLDS.steps, steps);
    if (hit == null) return;
    if (!claim("steps:" + hit + ":" + today())) return;
    if (hit >= 10000 && window.IgnytXP) IgnytXP.award("steps10k", today());
    fire({
      kind: "milestone", icon: "👟",
      title: hit.toLocaleString() + " steps",
      body: msg("steps"),
      stat: hit >= 10000 ? "+40 XP" : null
    });
  }

  /** Water, as a percentage of the user's own target. */
  function checkWater(ml, targetMl) {
    if (!(ml > 0) || !(targetMl > 0)) return;
    var pct = Math.floor(ml / targetMl * 100);
    var hit = crossed(THRESHOLDS.waterPct, pct);
    if (hit == null) return;
    if (!claim("water:" + hit + ":" + today())) return;
    if (hit === 100 && window.IgnytXP) IgnytXP.award("waterGoal", today());
    fire({
      kind: "milestone", icon: "💧",
      title: hit === 100 ? "Water goal reached" : hit + "% of your water goal",
      body: hit === 100 ? msg("waterGoal") : "",
      stat: hit === 100 ? "+20 XP" : null
    });
  }

  function checkProtein(grams, targetG) {
    if (!(grams > 0) || !(targetG > 0) || grams < targetG) return;
    if (!claim("protein:" + today())) return;
    if (window.IgnytXP) IgnytXP.award("proteinGoal", today());
    fire({ kind: "milestone", icon: "🥩", title: "Protein goal reached",
           body: msg("proteinHit"), stat: "+30 XP" });
  }

  /** Calories within 5% of target — "on plan", not "under". */
  function checkCalories(kcal, targetKcal) {
    if (!(kcal > 0) || !(targetKcal > 0)) return;
    var off = Math.abs(kcal - targetKcal) / targetKcal;
    if (off > 0.05) return;
    if (!claim("calories:" + today())) return;
    fire({ kind: "milestone", icon: "🎯", title: "On target today",
           body: msg("calorieOnTarget"), stat: null });
  }

  /** Progress toward a named goal, every 10%. */
  function checkGoal(goalId, percent) {
    if (!goalId || !(percent > 0)) return;
    var hit = crossed(THRESHOLDS.goalPct, Math.floor(percent));
    if (hit == null) return;
    if (!claim("goal:" + goalId + ":" + hit)) return;
    fire({
      kind: "milestone", icon: hit === 100 ? "🏁" : "📊",
      title: hit === 100 ? "Goal reached" : hit + "% of the way there",
      body: msg("goalProgress"), stat: null
    });
  }

  /**
   * Everything at once, from whatever the caller can supply. Missing fields are skipped
   * rather than guessed — a milestone fired off a number the app does not really have is
   * worse than no milestone.
   */
  function checkAll(ctx) {
    if (!ctx) return;
    try {
      if (ctx.weight) checkWeight(ctx.weight.startKg, ctx.weight.nowKg, ctx.weight.direction);
      if (ctx.steps != null) checkSteps(ctx.steps);
      if (ctx.water) checkWater(ctx.water.ml, ctx.water.targetMl);
      if (ctx.protein) checkProtein(ctx.protein.grams, ctx.protein.targetG);
      if (ctx.calories) checkCalories(ctx.calories.kcal, ctx.calories.targetKcal);
      if (ctx.goal) checkGoal(ctx.goal.id, ctx.goal.percent);
    } catch (e) {
      // A milestone is a nicety. It must never take a screen down with it.
      if (window.console) console.warn("[milestones]", e);
    }
  }

  /* ---- BMI ---------------------------------------------------------------------------
     The brief asked for BMI to be framed encouragingly rather than shown bare. What this
     returns is deliberately about what the user can do next, never about how they look, and
     it never predicts an outcome — "your body can change dramatically in 90 days" is a
     promise no app can make and some people cannot keep through no fault of their own.

     BMI itself is a crude measure: it cannot tell muscle from fat, which matters a lot in an
     app whose users lift. Saying so is more useful than dressing the number up. */
  function bmiEncouragement(bmi) {
    if (!(bmi > 0)) return "";
    if (bmi < 18.5) return "Building strength and eating enough is a solid place to aim. Small, consistent surpluses do it.";
    if (bmi < 25)   return "You're in a healthy range. Training now is about what you want to build, not what you need to fix.";
    if (bmi < 30)   return "This is a starting point, not a verdict. Consistency over months is what moves it.";
    return "Every session and every logged meal counts, and the early changes are the ones you feel rather than see.";
  }

  /** The caveat shown with the number. BMI cannot tell muscle from fat. */
  function bmiCaveat() {
    return "BMI is a rough guide from height and weight alone — it can't tell muscle from fat, so treat it as one number among several.";
  }

  return {
    THRESHOLDS: THRESHOLDS,
    checkAll: checkAll,
    checkWeight: checkWeight, checkSteps: checkSteps, checkWater: checkWater,
    checkProtein: checkProtein, checkCalories: checkCalories, checkGoal: checkGoal,
    bmiEncouragement: bmiEncouragement, bmiCaveat: bmiCaveat,
    /** Test seam. */
    _reset: function () { writeFired({}); }
  };
})();
