/* =========================================================
   IGNYT — THE AI INTENT CONTRACT

   The model's only job is to say WHAT WAS MEANT. It returns a small JSON object naming an intent
   and its arguments; IGNYT decides whether that is allowed, and IGNYT executes it. The model
   never receives an action name it can call, never sees the food library, never touches storage,
   and nothing it returns is trusted until it has been checked here.

   That separation is the whole design:

       message -> model -> {intent, args} -> THIS FILE VALIDATES -> IgnytAIActions -> database

   WHAT THIS FILE REFUSES, and why each one matters:

     an intent not on the list          the model inventing "deleteEverything" must go nowhere
     an argument of the wrong type      "quantity": "lots" must not reach a numeric field
     an argument out of range           a 90,000 g portion is a typo or an attack, not a meal
     a field nobody asked for           extra keys are dropped rather than passed through
     anything at all when the reply     a truncated or chatty response is a failure, not a
     is not clean JSON                  puzzle to solve with a regex

   IT CANNOT ESCALATE. The intents below map to actions that already exist and already carry
   their own risk tier, so a destructive one still stops at the confirmation gate exactly as it
   does when a local pattern produces it. There is no path here that reaches an action the user
   could not have reached by typing.

   IT ALSO CANNOT INVENT DATA. No intent here carries nutrition values, calorie counts or weights
   as free numbers from the model -- only a food NAME and an amount, which IGNYT then resolves
   against its own library. The model naming "chicken" is a claim about language; the 165 kcal is
   IGNYT's own record.
========================================================= */
(function () {
  "use strict";

  /* The complete list. An intent absent from here does not exist, whatever the model says. */
  var ALLOWED = {
    LOG_FOOD:            { action: "addFoodLog",        args: ["food", "quantity", "grams", "meal", "date"] },
    LOG_FOOD_MULTI:      { action: "addFoodLogBatch",   args: ["items"] },
    VIEW_FOOD_LOG:       { action: "getFoodLog",        args: ["date"] },
    DELETE_TODAY_FOOD:   { action: "deleteFoodForDate", args: ["date"] },
    DELETE_FOOD_BY_NAME: { action: "deleteFoodByName",  args: ["food", "date"] },
    DELETE_MEAL:         { action: "deleteFoodForMeal", args: ["meal", "date"] },
    LOG_WEIGHT:          { action: "logWeight",         args: ["weightKg", "date"] },
    VIEW_WEIGHT_HISTORY: { action: "getProgress",       args: ["days"] },
    DELETE_WEIGHT:       { action: "deleteWeightEntry", args: ["date"] },
    VIEW_PROGRESS:       { action: "getProgress",       args: ["days"] },
    GET_WEEKLY_PROGRESS: { action: "getWeeklyProgress", args: ["weeksAgo"] },
    VIEW_TODAY_WORKOUT:  { action: "getTodayWorkout",   args: [] },
    START_WORKOUT:       { action: "startWorkout",      args: ["title"] },
    COMPLETE_WORKOUT:    { action: "completeWorkout",   args: [] },
    GET_PROTEIN_TARGET:  { action: "getProteinTarget",  args: [] },
    GET_CALORIE_TARGET:  { action: "getCalorieTarget",  args: [] },
    FOOD_NUTRITION:      { action: "getFoodNutrition",  args: ["food"] }
  };

  /* Ranges are deliberately generous at the top and firm at the edges: they exist to catch a
     model producing nonsense, not to second-guess a user who really did eat 800 g of rice. */
  var LIMITS = {
    quantity: [0.1, 100],
    grams:    [1, 5000],
    weightKg: [20, 400],
    days:     [1, 400],
    weeksAgo: [0, 52]
  };

  var TEXT_FIELDS = { food: 80, meal: 20, title: 60, date: 10 };
  var MEALS = ["breakfast", "lunch", "dinner", "snack"];

  function isPlainObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  function cleanText(v, max) {
    if (typeof v !== "string") return null;
    var s = v.replace(/\s+/g, " ").trim();
    if (!s || s.length > max) return null;
    /* No control characters, no angle brackets: this string is about to be shown to the user and
       in some paths matched against the food library. */
    for (var ci = 0; ci < s.length; ci++) {
      var code = s.charCodeAt(ci);
      /* Control characters, and the two brackets that would matter if this string ever
         reached markup. Written as codes because a character class holding a control range
         is stored as literal control bytes, which is the corruption this file must not
         repeat -- it has happened six times elsewhere today. */
      if (code < 32 || code === 60 || code === 62) return null;
    }
    return s;
  }

  function cleanNumber(v, range) {
    var n = typeof v === "number" ? v : (typeof v === "string" ? parseFloat(v) : NaN);
    if (!isFinite(n)) return null;
    if (range && (n < range[0] || n > range[1])) return null;
    return n;
  }

  function cleanDate(v) {
    var s = cleanText(v, 10);
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var t = Date.parse(s + "T12:00:00");
    if (!isFinite(t)) return null;
    /* No future dates and nothing beyond a year back -- the same bound addFoodLog enforces. */
    var now = Date.now();
    if (t > now + 86400000 || t < now - 400 * 86400000) return null;
    return s;
  }

  function cleanMeal(v) {
    var s = cleanText(v, 20);
    if (!s) return null;
    var low = s.toLowerCase().replace(/s$/, "");
    if (MEALS.indexOf(low) === -1) return null;
    return low.charAt(0).toUpperCase() + low.slice(1);
  }

  function cleanOne(key, value) {
    if (key === "date") return cleanDate(value);
    if (key === "meal") return cleanMeal(value);
    if (TEXT_FIELDS[key]) return cleanText(value, TEXT_FIELDS[key]);
    if (LIMITS[key]) return cleanNumber(value, LIMITS[key]);
    return null;
  }

  /* A batch is the only nested shape allowed, and it is checked item by item with the same rules
     as a single log. Twelve is the same cap addFoodLogBatch enforces, repeated here so a
     malformed reply is rejected before it reaches an action at all. */
  function cleanItems(v) {
    if (!Array.isArray(v) || !v.length || v.length > 12) return null;
    var out = [];
    for (var i = 0; i < v.length; i++) {
      if (!isPlainObject(v[i])) return null;
      var food = cleanText(v[i].food, TEXT_FIELDS.food);
      if (!food) return null;
      var item = { food: food };
      var q = cleanNumber(v[i].quantity, LIMITS.quantity);
      var g = cleanNumber(v[i].grams, LIMITS.grams);
      if (g != null) item.grams = g;
      else item.quantity = q != null ? q : 1;
      var meal = cleanMeal(v[i].meal);
      if (meal) item.meal = meal;
      var date = cleanDate(v[i].date);
      if (date) item.date = date;
      out.push(item);
    }
    return out;
  }

  /* ---------- the gate ------------------------------------------------------------------- */

  /* Takes whatever the model returned and gives back either a validated {intent, action, args}
     or null. Null is a complete answer: the caller falls back to what it would have done without
     any of this, which is how the whole feature degrades when the model is unavailable, slow,
     or wrong. */
  function validate(raw) {
    var obj = raw;
    if (typeof raw === "string") {
      var s = raw.trim();
      /* Models like to wrap JSON in a code fence. That is the only tidying done -- anything
         beyond it is a reply that did not follow the contract. */
      var fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (fence) s = fence[1].trim();
      try { obj = JSON.parse(s); } catch (e) { return null; }
    }
    if (!isPlainObject(obj)) return null;

    var name = typeof obj.intent === "string" ? obj.intent.trim().toUpperCase() : "";
    if (!Object.prototype.hasOwnProperty.call(ALLOWED, name)) return null;
    var spec = ALLOWED[name];

    var given = isPlainObject(obj.args) ? obj.args : {};
    var args = {};
    for (var i = 0; i < spec.args.length; i++) {
      var key = spec.args[i];
      if (!Object.prototype.hasOwnProperty.call(given, key)) continue;
      var val = key === "items" ? cleanItems(given[key]) : cleanOne(key, given[key]);
      /* A field that fails its check fails the whole reply. Silently dropping it would mean
         executing something subtly different from what the model meant, which is worse than
         not executing at all. */
      if (val == null) return null;
      args[key] = val;
    }

    /* Intents that cannot act without a subject. */
    if (name === "LOG_FOOD" && !args.food) return null;
    if (name === "LOG_FOOD_MULTI" && !args.items) return null;
    if (name === "DELETE_FOOD_BY_NAME" && !args.food) return null;
    if (name === "DELETE_MEAL" && !args.meal) return null;
    if (name === "LOG_WEIGHT" && args.weightKg == null) return null;
    if (name === "FOOD_NUTRITION" && !args.food) return null;

    return { intent: name, action: spec.action, args: args };
  }

  /* The risk tier comes from the action registry, not from anything the model said, so a
     destructive intent stops at the same confirmation gate as a typed one. */
  function riskOf(action) {
    try {
      /* window-qualified throughout: the bare identifier resolves in a browser, where
         window IS the global, and throws anywhere else -- which made every intent look
         unmapped the first time this was checked outside one. */
      return (window.IgnytAIActions && window.IgnytAIActions.risk)
        ? window.IgnytAIActions.risk(action) : null;
    } catch (e) { return null; }
  }

  /* The instruction sent with the message. Kept here beside the validator so the two cannot
     drift: if an intent is added to one, the other is in the same file. */
  function contract() {
    return "You translate a fitness app message into ONE intent. Reply with JSON only, no prose, "
         + "no code fence. Shape: {\"intent\":\"NAME\",\"args\":{...}}. Allowed intents and args: "
         + Object.keys(ALLOWED).map(function (k) {
             return k + "(" + (ALLOWED[k].args.join(",") || "no args") + ")";
           }).join("; ")
         + ". Rules: never invent nutrition values, calories or weights - give only the food NAME "
         + "and amount and let the app look them up. Dates are YYYY-MM-DD. Meals are breakfast, "
         + "lunch, dinner or snack. If the message is a question about fitness in general, or you "
         + "are unsure, reply exactly {\"intent\":\"NONE\"}.";
  }

  window.IgnytAIIntent = Object.freeze({
    validate: validate,
    riskOf: riskOf,
    contract: contract,
    intents: function () { return Object.keys(ALLOWED); },
    actionFor: function (name) { return ALLOWED[name] ? ALLOWED[name].action : null; }
  });
}());
