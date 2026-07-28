/* =========================================================
   SERVING / PORTION EXTRACTION

   USDA ships real measured household portions in foodPortions[], with a gram weight for
   each. That is strictly better than the app's generic estimate table (a cup of rice and a
   cup of lettuce are not the same weight), so where USDA has a portion for a food it wins.

   THE TWO LAYOUTS DIFFER — both are handled:
     Foundation 2026  measureUnit.name holds the real unit ("tablespoon", "cup", "tomatoes")
     SR Legacy 2018   measureUnit.name is the literal string "undetermined" and the real unit
                      sits in `modifier`, often with trailing qualifiers:
                        "cup, chopped"   "cup (8 fl oz)"   "piece, cooked, excluding refuse"

   Weight and volume units (oz, lb, fl oz, ml) are DROPPED. The app already logs grams
   directly, so an "oz" portion adds a redundant row; only household measures a person would
   actually think in are kept.

   gramWeight in USDA is the weight of `amount` units, so grams-per-unit is gramWeight/amount.
========================================================= */
"use strict";

/* Units the app understands, mapped from USDA's vocabulary. Ordered most specific first. */
var UNIT_PATTERNS = [
  [/^cups?$/, "cup"],
  [/^(tbsp|tablespoons?)$/, "tbsp"],
  [/^(tsp|teaspoons?)$/, "tsp"],
  [/^slices?$/, "slice"],
  [/^scoops?$/, "scoop"],
  [/^(glass|glasses)$/, "glass"],
  [/^bottles?$/, "bottle"],
  [/^cans?$/, "can"],
  [/^(package|packages|packet|packets|pkg|pouch|bag|box)$/, "packet"],
  [/^bowls?$/, "bowl"],
  [/^(serving|servings|racc|portion)$/, "serving"],
  [/^eggs?$/, "egg"],
  [/^bananas?$/, "banana"],
  [/^apples?$/, "apple"],
  [/^(chapati|chapatis|chapatti|roti|rotis)$/, "roti"],
  [/^(idli|idlis)$/, "idli"],
  [/^(dosa|dosas)$/, "dosa"]
];

/* Explicitly rejected: weights, volumes and USDA's placeholder. */
var NOT_A_HOUSEHOLD_UNIT = /^(g|gm|gram|grams|kg|mg|oz|ounce|ounces|lb|lbs|pound|pounds|fl oz|floz|fluid ounce|fluid ounces|ml|l|liter|liters|litre|litres|quart|quarts|pint|pints|gallon|gallons|cubic inch|cubic inches|undetermined|)$/;

/**
 * Reduces a raw USDA unit/modifier string to its head noun.
 * "cup, chopped" -> "cup" | "cup (8 fl oz)" -> "cup" | "piece, cooked, excluding refuse" -> "piece"
 */
function headNoun(raw) {
  return String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")   // drop parentheticals before splitting, so "cup (8 fl oz)" keeps "cup"
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim();
}

/** @returns {string|null} the app's canonical unit, or null if this portion is not usable. */
function canonicalUnit(raw) {
  var head = headNoun(raw);
  if (!head || NOT_A_HOUSEHOLD_UNIT.test(head)) return null;

  for (var i = 0; i < UNIT_PATTERNS.length; i++) {
    if (UNIT_PATTERNS[i][0].test(head)) return UNIT_PATTERNS[i][1];
  }

  // Anything left is a countable descriptor — USDA uses the food's own noun ("tomatoes",
  // "fillet", "steak", "medium") for things you count rather than measure. Those all behave
  // as "piece" in the app, and the original wording is preserved in the portion label.
  if (/^[a-z][a-z \-']{0,24}$/.test(head)) return "piece";
  return null;
}

/** A short human label for the portion, preserving USDA's qualifier where there is one. */
function portionLabel(unit, raw) {
  var head = headNoun(raw);
  var full = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();

  // RACC and NLEA are USDA's regulatory serving-size terms. They mean nothing to a user, so
  // they collapse to the plain unit rather than leaking into the UI.
  if (/\b(racc|nlea)\b/i.test(full)) return unit;

  // Keep the qualifier only when it adds information ("cup, chopped" is worth showing).
  if (unit === "piece" && head && head !== "piece") return head;
  if (full.length > 40) return unit;
  return full && full.toLowerCase() !== unit ? full : unit;
}

/* The default serving pre-selected on the food detail page.
   An earlier version preferred "cup" outright, which produced defaults nobody would log:
   a cup of butter (227 g), a cup of raw egg (243 g), a cup of table salt (292 g).
   Choosing the portion CLOSEST TO 100 G fixes all three (butter -> 1 tbsp, egg -> 1 medium,
   olive oil -> 1 tbsp) and is easy to justify: 100 g is the basis every value is stored
   against, and it sits in the middle of the range of things people actually eat in one go.
   The band rejects trace measures (a dash of salt) and bulk ones (a whole 1 lb package). */
var SERVING_TARGET_G = 100;
var SERVING_BAND = { min: 5, max: 350 };

/**
 * @returns {{servingSize:number, servingUnit:string, portions:Array<{unit,label,grams}>}}
 *          servingSize/servingUnit default to 100 g when USDA has no household portion.
 */
function extract(food) {
  var raw = Array.isArray(food.foodPortions) ? food.foodPortions : [];
  var seen = Object.create(null);
  var portions = [];

  for (var i = 0; i < raw.length; i++) {
    var p = raw[i];
    if (!p) continue;

    var amount = Number(p.amount);
    var grams = Number(p.gramWeight);
    if (!isFinite(amount) || amount <= 0 || !isFinite(grams) || grams <= 0) continue;

    // Foundation puts the unit in measureUnit.name; SR Legacy parks "undetermined" there
    // and puts the real unit in modifier.
    var mu = (p.measureUnit && p.measureUnit.name) || "";
    var source = (!mu || mu.toLowerCase() === "undetermined") ? (p.modifier || p.portionDescription || "") : mu;

    var unit = canonicalUnit(source);
    if (!unit) continue;

    var perUnit = Math.round((grams / amount) * 10) / 10;
    if (perUnit <= 0 || perUnit > 5000) continue;  // guards against malformed source rows

    // First portion for a unit wins — USDA lists the most representative measure first.
    if (seen[unit]) continue;
    seen[unit] = true;

    portions.push({ unit: unit, label: portionLabel(unit, source), grams: perUnit });
  }

  var primary = null, bestDistance = Infinity;
  for (var j = 0; j < portions.length; j++) {
    var p2 = portions[j];
    if (p2.grams < SERVING_BAND.min || p2.grams > SERVING_BAND.max) continue;
    var distance = Math.abs(p2.grams - SERVING_TARGET_G);
    // Strictly-less keeps USDA's own ordering as the tie-break, which makes runs reproducible.
    if (distance < bestDistance) { bestDistance = distance; primary = p2; }
  }

  return {
    servingSize: primary ? primary.grams : 100,
    servingUnit: primary ? primary.unit : "g",
    portions: portions
  };
}

export { extract, canonicalUnit, headNoun };
