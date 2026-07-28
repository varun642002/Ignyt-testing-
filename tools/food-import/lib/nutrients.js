/* =========================================================
   NUTRIENT EXTRACTION

   USDA stores nutrition as a flat foodNutrients[] array keyed by nutrient NUMBER (a string
   like "203"), not by a stable field name. Numbers also fork across dataset generations, so
   every nutrient below lists its accepted numbers in preference order.

   ENERGY IS THE HARD CASE.
   Measured on the real files:
     SR Legacy 2018   -> 100% of records carry #208 "Energy" in kcal.
     Foundation 2026  -> only 95 of 363 carry #208. The rest report energy as
                         #958 "Energy (Atwater Specific Factors)"  (199 records)
                         #957 "Energy (Atwater General Factors)"   (226 records)
   and 42 carry no energy row at all (e.g. "Salt, table, iodized", which genuinely has none).

   Resolution order, most to least trustworthy:
     1. #208  direct kcal
     2. #958  Atwater SPECIFIC factors  -- coefficients derived for that individual food
     3. #957  Atwater GENERAL factors   -- the standard 4/4/9 coefficients
     4. computed from the record's own nutrientConversionFactors x macros
     5. #268  kJ converted at 4.184 kJ/kcal
     6. 0, accepted only when the macros are also ~0 (salt, water, plain spices)

   Specific ranks above general because USDA derives those coefficients from the food's own
   composition; general factors are the fallback USDA itself applies when it has nothing
   better. Every food records which rule fired in `energySource`, so the summary can show
   how much of the catalogue is direct measurement versus derivation.
========================================================= */
"use strict";

import * as normalize from "./normalize.js";

/* Accepted nutrient numbers, best first. */
var NUTRIENT_NUMBERS = {
  protein:   ["203"],
  fat:       ["204"],
  carbs:     ["205", "205.2"],   // by difference, then by summation
  fibre:     ["291", "293"],     // total dietary, then AOAC 2011.25
  sugar:     ["269.3", "269"],   // "Sugars, Total" (modern), then "Total Sugars" (legacy)
  sodium:    ["307"],
  potassium: ["306"],
  calcium:   ["301"],
  iron:      ["303"]
};

var ENERGY_KCAL = "208";
var ENERGY_ATWATER_SPECIFIC = "958";
var ENERGY_ATWATER_GENERAL = "957";
var ENERGY_KJ = "268";
var KJ_PER_KCAL = 4.184;

/** Indexes a record's nutrients by number so each lookup is O(1) rather than a rescan. */
function indexNutrients(food) {
  var map = Object.create(null);
  var arr = food.foodNutrients || [];
  for (var i = 0; i < arr.length; i++) {
    var n = arr[i];
    if (!n || n.amount === null || n.amount === undefined) continue;
    // Both the nested (`nutrient.number`) and flattened (`nutrientNumber`) layouts occur.
    var num = (n.nutrient && (n.nutrient.number || n.nutrient.nutrientNumber)) || n.nutrientNumber;
    if (num == null) continue;
    num = String(num);
    // First value wins: USDA lists at most one row per nutrient per food, and where a
    // duplicate does appear the earlier row is the primary one.
    if (map[num] === undefined) map[num] = n.amount;
  }
  return map;
}

function firstOf(map, numbers) {
  for (var i = 0; i < numbers.length; i++) {
    if (map[numbers[i]] !== undefined) return map[numbers[i]];
  }
  return null;
}

/** Atwater coefficients attached to the record itself, if USDA supplied them. */
function calorieFactors(food) {
  var cfs = food.nutrientConversionFactors || [];
  for (var i = 0; i < cfs.length; i++) {
    var cf = cfs[i];
    if (cf && (cf.type === ".CalorieConversionFactor" || cf.proteinValue !== undefined)) {
      return {
        protein: Number(cf.proteinValue),
        fat: Number(cf.fatValue),
        carb: Number(cf.carbohydrateValue)
      };
    }
  }
  return null;
}

/**
 * @returns {{kcal:number, source:string}} kcal per 100 g plus the rule that produced it.
 */
function resolveEnergy(food, map, macros) {
  var direct = map[ENERGY_KCAL];
  if (direct !== undefined) {
    var v = normalize.nutrientValue(direct, 0);
    if (v !== null) return { kcal: v, source: "measured" };
  }

  var specific = map[ENERGY_ATWATER_SPECIFIC];
  if (specific !== undefined) {
    var s = normalize.nutrientValue(specific, 0);
    if (s !== null) return { kcal: s, source: "atwater-specific" };
  }

  var general = map[ENERGY_ATWATER_GENERAL];
  if (general !== undefined) {
    var g = normalize.nutrientValue(general, 0);
    if (g !== null) return { kcal: g, source: "atwater-general" };
  }

  var cf = calorieFactors(food);
  if (cf && isFinite(cf.protein) && isFinite(cf.fat) && isFinite(cf.carb) &&
      (macros.protein !== null || macros.fat !== null || macros.carbs !== null)) {
    var computed = (macros.protein || 0) * cf.protein +
                   (macros.fat || 0) * cf.fat +
                   (macros.carbs || 0) * cf.carb;
    return { kcal: Math.round(computed), source: "computed-factors" };
  }

  var kj = map[ENERGY_KJ];
  if (kj !== undefined) {
    var k = normalize.nutrientValue(Number(kj) / KJ_PER_KCAL, 0);
    if (k !== null) return { kcal: k, source: "from-kj" };
  }

  // Last resort: the standard Atwater coefficients. Reached by ~28 Foundation records that
  // carry full macros but no energy row and no conversion factors (butter is one). Deriving
  // 4/4/9 puts butter at 733 kcal against a true 717 — close enough to be useful, and far
  // better than dropping the food. Flagged as "atwater-standard" so the summary shows
  // exactly which foods rest on this assumption.
  //
  // KNOWN LIMITATION: this over-states energy for bulk sweeteners, where "carbohydrate by
  // difference" is mostly non-caloric sugar alcohol. The source data carries no signal that
  // distinguishes them, so the derivation is reported rather than silently trusted.
  if (macros.protein !== null || macros.fat !== null || macros.carbs !== null) {
    var atwater = (macros.protein || 0) * 4 + (macros.carbs || 0) * 4 + (macros.fat || 0) * 9;
    if (atwater > 0) return { kcal: Math.round(atwater), source: "atwater-standard" };
  }

  // Genuinely zero: salt, water and most plain spices carry no energy at all.
  return { kcal: 0, source: "none" };
}

/**
 * Extracts the retained nutrition fields from one USDA record, all per 100 g
 * (which is the basis USDA already uses for Foundation and SR Legacy).
 */
function extract(food) {
  var map = indexNutrients(food);

  var macros = {
    protein: normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.protein), 2),
    carbs:   normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.carbs), 2),
    fat:     normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.fat), 2)
  };

  var energy = resolveEnergy(food, map, macros);

  return {
    calories:  energy.kcal,
    energySource: energy.source,
    protein:   macros.protein,
    carbs:     macros.carbs,
    fat:       macros.fat,
    fibre:     normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.fibre), 2),
    sugar:     normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.sugar), 2),
    sodium:    normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.sodium), 1),
    potassium: normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.potassium), 1),
    calcium:   normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.calcium), 1),
    iron:      normalize.nutrientValue(firstOf(map, NUTRIENT_NUMBERS.iron), 2)
  };
}

/** How many of the retained nutrients carry real data — the tie-breaker when merging. */
function completeness(n) {
  var fields = ["protein", "carbs", "fat", "fibre", "sugar", "sodium", "potassium", "calcium", "iron"];
  var score = fields.reduce(function (acc, f) { return acc + (n[f] !== null ? 1 : 0); }, 0);
  if (n.energySource === "measured") score += 2;          // direct kcal is worth more
  else if (n.energySource !== "none") score += 1;
  return score;
}

export { extract, completeness, NUTRIENT_NUMBERS };
