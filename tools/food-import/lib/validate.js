/* =========================================================
   VALIDATION

   Two severities:
     ERROR   the record is unusable and is dropped. Logging it would produce wrong numbers.
     WARNING the record is kept but flagged in the summary, because the value is suspicious
             rather than impossible and the source may simply be unusual.

   The macro/energy cross-check is a WARNING on purpose. Atwater arithmetic (4/4/9) never
   reconciles exactly: fibre is partly indigestible, sugar alcohols and organic acids carry
   their own coefficients, alcohol is 7 kcal/g, and USDA applies food-specific factors. A
   generous tolerance catches genuine transcription errors without discarding thousands of
   perfectly good records for failing arithmetic that was never meant to balance.
========================================================= */
"use strict";

/* Per 100 g ceilings.
   The calorie ceiling is 950, not 900. Textbook pure fat is 884 kcal/100 g, but USDA
   MEASURES beef tallow, lard and the fish oils at 902 — an 884 or 900 ceiling rejects nine
   real foods. 950 still catches anything genuinely broken (a mis-scaled record lands in the
   thousands) while trusting USDA's own measurements at the top of the range. */
var LIMITS = {
  calories:  950,
  protein:   100,
  carbs:     100,
  fat:       100,
  fibre:     100,
  sugar:     100,
  sodium:    100000,   // mg — salt is ~38,758 mg sodium per 100 g; leave headroom
  potassium: 100000,
  calcium:   100000,
  iron:      1000
};

/* Ceilings for the micronutrients, all per 100 g and all deliberately generous — these exist
   to catch a mis-scaled record (a value in the thousands where milligrams were expected),
   not to second-guess USDA. Brazil nuts really do carry ~2,000 µg of selenium per 100 g. */
var MICRO_LIMITS = {
  magnesium: 10000, phosphorus: 10000, zinc: 1000, copper: 500, manganese: 500,
  selenium: 10000, vitaminA: 100000, vitaminC: 10000, vitaminD: 5000, vitaminE: 5000,
  vitaminK: 20000, thiamin: 500, riboflavin: 500, niacin: 1000, pantothenic: 500,
  vitaminB6: 500, folate: 10000, vitaminB12: 500
};
Object.keys(MICRO_LIMITS).forEach(function (k) { LIMITS[k] = MICRO_LIMITS[k]; });

var NUTRIENT_FIELDS = ["calories", "protein", "carbs", "fat", "fibre", "sugar",
  "sodium", "potassium", "calcium", "iron"].concat(Object.keys(MICRO_LIMITS));

/**
 * @returns {{errors:string[], warnings:string[]}}
 */
function validateFood(food, seenIds) {
  var errors = [];
  var warnings = [];

  if (!food.name || !String(food.name).trim()) errors.push("missing name");
  if (food.id == null || food.id === "") errors.push("missing id");
  else if (seenIds && seenIds.has(food.id)) errors.push("duplicate id: " + food.id);

  if (!food.category) errors.push("missing category");

  NUTRIENT_FIELDS.forEach(function (f) {
    var v = food[f];
    if (v === null || v === undefined) return;        // absent is allowed except for calories
    if (typeof v !== "number" || !isFinite(v)) { errors.push("non-numeric " + f + ": " + v); return; }
    if (v < 0) { errors.push("negative " + f + ": " + v); return; }
    if (v > LIMITS[f]) errors.push(f + " out of range: " + v + " > " + LIMITS[f]);
  });

  if (food.calories === null || food.calories === undefined) {
    errors.push("missing calories");
  } else if (food.calories === 0) {
    var macroMass = (food.protein || 0) + (food.carbs || 0) + (food.fat || 0);
    if (macroMass > 1) {
      // Zero energy alongside real macro mass looks impossible, but it is only an error when
      // WE derived the zero. Where USDA measured it directly the zero is a finding, not a
      // gap: stevia extract powder reports 100 g of "carbohydrate by difference" and 0 kcal
      // because that mass is non-caloric sugar alcohol, and Zevia cola reports 1.1 g the
      // same way. Rejecting those would delete correct data on the strength of arithmetic
      // that does not apply to sugar alcohols.
      var measured = food.nutrition && food.nutrition.energySource === "measured";
      var msg = "zero calories but " + macroMass.toFixed(1) + " g of macros";
      if (measured) warnings.push(msg + " (USDA-measured zero — sugar alcohol or similar)");
      else errors.push(msg);
    }
  }

  // Grams of macronutrient cannot exceed the 100 g the values are measured against.
  var totalMass = (food.protein || 0) + (food.carbs || 0) + (food.fat || 0);
  if (totalMass > 105) errors.push("macros total " + totalMass.toFixed(1) + " g per 100 g");

  // Energy cross-check — see the header for why this is only a warning.
  if (food.calories > 0 && totalMass > 0) {
    var atwater = (food.protein || 0) * 4 + (food.carbs || 0) * 4 + (food.fat || 0) * 9;
    var drift = Math.abs(atwater - food.calories);
    if (drift > 60 && drift > food.calories * 0.4) {
      warnings.push("energy drift: stated " + food.calories + " kcal vs Atwater " + Math.round(atwater));
    }
  }

  if (food.fibre !== null && food.carbs !== null && food.fibre > food.carbs + 1) {
    warnings.push("fibre (" + food.fibre + " g) exceeds carbohydrate (" + food.carbs + " g)");
  }
  if (food.sugar !== null && food.carbs !== null && food.sugar > food.carbs + 1) {
    warnings.push("sugar (" + food.sugar + " g) exceeds carbohydrate (" + food.carbs + " g)");
  }

  return { errors: errors, warnings: warnings };
}

/**
 * Validates the whole collection.
 * @returns {{valid:Array, rejected:Array, warnings:Array}}
 */
function validateAll(foods) {
  var seenIds = new Set();
  var valid = [], rejected = [], warnings = [];

  foods.forEach(function (f) {
    var res = validateFood(f, seenIds);
    if (res.errors.length) {
      rejected.push({ id: f.id, name: f.name, errors: res.errors });
      return;
    }
    seenIds.add(f.id);
    if (res.warnings.length) warnings.push({ id: f.id, name: f.name, warnings: res.warnings });
    valid.push(f);
  });

  return { valid: valid, rejected: rejected, warnings: warnings };
}

export { validateAll, validateFood, LIMITS };
