/* =========================================================
   IGNYT SERVING CONVERTER — household measures -> grams

   THE PROBLEM THIS SOLVES
   The catalogue stores everything per 100 g, which is precise but not how anyone thinks
   about food. People log "2 eggs", "1 chapati", "a cup of rice". This module turns those
   into grams so the existing per-100 g maths can do the rest.

   WHY IT IS NOT ONE FLAT TABLE
   A household measure is a VOLUME; grams are a MASS. Converting between them depends on the
   food's density, so a single "1 cup = 240 g" table would be wrong for most foods:
       1 cup milk    ~ 240 g   (water-like)
       1 cup rice    ~ 185 g   (cooked grain)
       1 cup flour   ~ 120 g   (light powder)
       1 cup oil     ~ 218 g
   Resolution is therefore layered, most specific first:
       1. FOOD_UNITS   -- exact per-food weights ("1 banana", "1 chapati", "1 egg")
       2. CATEGORY_CUP -- per-category cup/tbsp/tsp weights for everything else
       3. GENERIC      -- water-equivalent fallback, used only when nothing better applies
   Every figure is a rounded typical value, in line with published portion tables. They are
   estimates by nature -- a large banana is not a small one -- which is exactly why the gram
   field stays editable after conversion rather than being hidden behind the unit.

   The module is pure: it reads a food object and returns numbers. No storage, no state, no
   DOM, so it is trivially unit-testable and reusable by the future importer and parser.
========================================================= */
(function () {
  "use strict";

  /* Water-equivalent fallbacks (grams). Only reached when a food has no per-food entry and
     its category has no override -- deliberately conservative rather than clever. */
  var GENERIC = {
    "g": 1,
    "ml": 1,
    "tsp": 5,
    "tbsp": 15,
    "cup": 240,
    "glass": 250,
    "bottle": 500,
    "can": 330,
    "packet": 100,
    "bowl": 200,
    "scoop": 30,
    "slice": 30,
    "piece": 50,
    "serving": 100
  };

  /* Per-category overrides for the volume-based measures. A category absent here simply
     falls through to GENERIC. */
  var CATEGORY_UNITS = {
    "Rice":        { cup: 185, bowl: 200, serving: 150 },
    "Grains":      { cup: 90,  bowl: 180, serving: 40, tbsp: 10 },
    "Pasta":       { cup: 140, bowl: 200, serving: 150 },
    "Legumes":     { cup: 180, bowl: 200, serving: 150 },
    "Beans":       { cup: 180, bowl: 200, serving: 150 },
    "Vegetables":  { cup: 100, bowl: 150, serving: 80, piece: 80 },
    "Fruits":      { cup: 150, bowl: 150, serving: 100, piece: 100 },
    "Dairy":       { cup: 240, glass: 250, bowl: 200, tbsp: 15, serving: 200 },
    "Beverages":   { cup: 240, glass: 250, bottle: 500, can: 330, serving: 250 },
    "Nuts":        { cup: 140, tbsp: 10, serving: 30, piece: 1.2 },
    "Seeds":       { cup: 150, tbsp: 12, serving: 15 },
    "Oils":        { cup: 218, tbsp: 14, tsp: 4.5, serving: 10 },
    "Sauces":      { cup: 240, tbsp: 17, tsp: 6, serving: 15 },
    "Protein Supplements": { scoop: 30, tbsp: 8, serving: 30 },
    "Indian Foods":{ cup: 200, bowl: 200, serving: 150 },
    "Fast Food":   { piece: 100, serving: 150 },
    "Snacks":      { cup: 30, packet: 50, serving: 30 },
    "Desserts":    { slice: 80, piece: 60, serving: 100 },
    "Bread":       { slice: 30, piece: 30, serving: 60 },
    "Chicken":     { piece: 120, serving: 150 },
    "Beef":        { piece: 120, serving: 150 },
    "Pork":        { piece: 60,  serving: 120 },
    "Fish":        { piece: 120, serving: 150 },
    "Seafood":     { piece: 20,  serving: 120 },
    "Eggs":        { piece: 50,  serving: 50 },

    /* --- canonical category names ---
       The seed catalogue and the USDA import originally used different names for the same
       thing ("Nuts" and "Seeds" against "Nuts & Seeds", "Oils" against "Oils & Fats"), which
       produced duplicate tiles in the category browser. The catalogue now normalises seed
       categories onto the canonical set, so the canonical names need entries here or those
       foods would silently lose their household measures. The short names are kept because
       FOOD_UNITS and any stored data may still reference them. */
    "Grains & Cereals":    { cup: 90,  bowl: 180, serving: 40, tbsp: 10 },
    "Bread & Bakery":      { slice: 30, piece: 30, serving: 60 },
    "Beans & Legumes":     { cup: 180, bowl: 200, serving: 150 },
    "Nuts & Seeds":        { cup: 140, tbsp: 10, serving: 30 },
    "Oils & Fats":         { cup: 218, tbsp: 14, tsp: 4.5, serving: 10 },
    "Sauces & Condiments": { cup: 240, tbsp: 17, tsp: 6, serving: 15 },

    /* USDA-only categories with no seed equivalent. */
    "Turkey":              { piece: 120, serving: 150 },
    "Game & Other Meats":  { piece: 120, serving: 150 },
    "Soups":               { cup: 245, bowl: 250, serving: 245 },
    "Spices & Herbs":      { tbsp: 6, tsp: 2, serving: 2 },
    "Meals & Entrees":     { cup: 220, bowl: 250, serving: 250 },
    "Restaurant Foods":    { piece: 150, serving: 250 }
  };

  /* Exact per-food weights. These are the units people actually count in ("2 eggs",
     "3 chapatis") and are worth being specific about. Keyed by lowercased food name. */
  var FOOD_UNITS = {
    "whole egg":        { egg: 50, piece: 50 },
    "boiled egg":       { egg: 50, piece: 50 },
    "egg white":        { egg: 33, piece: 33 },
    "egg yolk":         { egg: 17, piece: 17 },
    "scrambled eggs":   { egg: 60, serving: 120 },
    "omelette":         { piece: 120, serving: 120 },
    "banana":           { banana: 118, piece: 118 },
    "apple":            { apple: 182, piece: 182 },
    "orange":           { piece: 131 },
    "mango":            { piece: 200 },
    "kiwi":             { piece: 75 },
    "pear":             { piece: 178 },
    "peach":            { piece: 150 },
    "plum":             { piece: 66 },
    "dates":            { piece: 8 },
    "fig":              { piece: 50 },
    "apricot":          { piece: 35 },
    "chapati":          { chapati: 40, roti: 40, piece: 40 },
    "roti":             { roti: 40, chapati: 40, piece: 40 },
    "naan":             { piece: 90 },
    "paratha":          { piece: 65 },
    "idli":             { idli: 40, piece: 40 },
    "dosa":             { dosa: 85, piece: 85 },
    "masala dosa":      { dosa: 150, piece: 150 },
    "samosa":           { piece: 60 },
    "pakora":           { piece: 25 },
    "gulab jamun":      { piece: 40 },
    "jalebi":           { piece: 25 },
    "white bread":      { slice: 28, piece: 28 },
    "whole wheat bread":{ slice: 32, piece: 32 },
    "sourdough bread":  { slice: 45, piece: 45 },
    "rye bread":        { slice: 32, piece: 32 },
    "bagel":            { piece: 98 },
    "pita bread":       { piece: 60 },
    "tortilla":         { piece: 45 },
    "croissant":        { piece: 57 },
    "whey protein powder":  { scoop: 30 },
    "casein protein powder":{ scoop: 32 },
    "plant protein powder": { scoop: 33 },
    "mass gainer":          { scoop: 100 },
    "creatine monohydrate": { scoop: 5, tsp: 5 },
    "bcaa powder":          { scoop: 10 },
    "almonds":          { piece: 1.2 },
    "walnuts":          { piece: 2.5 },
    "cashews":          { piece: 1.6 },
    "pistachios":       { piece: 0.7 },
    "brazil nuts":      { piece: 5 },
    "peanut butter":    { tbsp: 16 },
    "almond butter":    { tbsp: 16 },
    "honey":            { tbsp: 21, tsp: 7 },
    "maple syrup":      { tbsp: 20 },
    "sugar":            { tsp: 4, tbsp: 12.5 },
    "salt":             { tsp: 6, tbsp: 18 },
    "butter":           { tbsp: 14, tsp: 5 },
    "ghee":             { tbsp: 13, tsp: 4.5 },
    "olive oil":        { tbsp: 13.5, tsp: 4.5 },
    "coconut oil":      { tbsp: 13.6, tsp: 4.5 },
    "pizza (cheese)":   { slice: 107, piece: 107 },
    "pizza (pepperoni)":{ slice: 111, piece: 111 },
    "cheeseburger":     { piece: 120 },
    "hamburger":        { piece: 110 },
    "hot dog":          { piece: 98 },
    "chicken nuggets":  { piece: 16 },
    "chicken breast":   { piece: 174 },
    "chicken thigh":    { piece: 110 },
    "chicken drumstick":{ piece: 88 },
    "chicken wing":     { piece: 34 },
    "sausage":          { piece: 75 },
    "bacon":            { slice: 12, piece: 12 },
    "cookies":          { piece: 16 },
    "muffin":           { piece: 113 },
    "doughnut":         { piece: 60 },
    "brownie":          { piece: 56 },
    "pancakes":         { piece: 38 },
    "waffle":           { piece: 75 },
    "granola bar":      { piece: 40, packet: 40 },
    "protein bar":      { piece: 60, packet: 60 },
    "rice cakes":       { piece: 9 },
    "cheddar cheese":   { slice: 28, piece: 28 },
    "mozzarella":       { slice: 28, piece: 28 },
    "potato":           { piece: 173 },
    "sweet potato":     { piece: 130 },
    "tomato":           { piece: 123 },
    "onion":            { piece: 110 },
    "carrot":           { piece: 61 },
    "garlic":           { piece: 3 },
    "avocado":          { piece: 200 },
    "bell pepper":      { piece: 119 },
    "cucumber":         { piece: 300 }
  };

  /* Display order and labels. `plural` is used when the amount is not exactly 1. */
  var UNIT_LABELS = {
    g:       { label: "g",          plural: "g" },
    ml:      { label: "ml",         plural: "ml" },
    piece:   { label: "piece",      plural: "pieces" },
    slice:   { label: "slice",      plural: "slices" },
    cup:     { label: "cup",        plural: "cups" },
    bowl:    { label: "bowl",       plural: "bowls" },
    glass:   { label: "glass",      plural: "glasses" },
    bottle:  { label: "bottle",     plural: "bottles" },
    can:     { label: "can",        plural: "cans" },
    packet:  { label: "packet",     plural: "packets" },
    tbsp:    { label: "tbsp",       plural: "tbsp" },
    tsp:     { label: "tsp",        plural: "tsp" },
    scoop:   { label: "scoop",      plural: "scoops" },
    serving: { label: "serving",    plural: "servings" },
    egg:     { label: "egg",        plural: "eggs" },
    banana:  { label: "banana",     plural: "bananas" },
    apple:   { label: "apple",      plural: "apples" },
    chapati: { label: "chapati",    plural: "chapatis" },
    roti:    { label: "roti",       plural: "rotis" },
    idli:    { label: "idli",       plural: "idlis" },
    dosa:    { label: "dosa",       plural: "dosas" }
  };

  /* Which units are offered, in this order, when a food supports them. Grams is always
     first so the precise option is never buried. */
  var UNIT_ORDER = ["g", "egg", "banana", "apple", "chapati", "roti", "idli", "dosa",
    "piece", "slice", "scoop", "cup", "bowl", "glass", "bottle", "can", "packet",
    "tbsp", "tsp", "ml", "serving"];

  function keyOf(food) { return String((food && food.name) || "").trim().toLowerCase(); }

  /**
   * Grams for one unit taken from the food's OWN measured portions, if it has any.
   *
   * Foods imported from USDA carry a `portions` array of real laboratory measurements for
   * that specific food. Those beat every table in this file, because the tables are
   * necessarily generic: CATEGORY_UNITS says a cup of any vegetable is 100 g, while USDA
   * measured a cup of raw broccoli at 76 g and a cup of raw kale at 20.6 g. Same category,
   * a factor of five apart. Preferring the measurement is the difference between a plausible
   * number and a correct one.
   */
  function measuredPortion(food, unit) {
    var ps = food && food.portions;
    if (!Array.isArray(ps)) return null;
    for (var i = 0; i < ps.length; i++) {
      if (ps[i] && ps[i].unit === unit && ps[i].grams > 0) return ps[i].grams;
    }
    return null;
  }

  /**
   * Grams for ONE of the given unit, for this specific food.
   * Resolution order: the food's own measurement, then a per-food override, then its
   * category, then a generic estimate.
   * @returns {number|null} null when the unit doesn't apply to this food
   */
  function gramsPerUnit(food, unit) {
    if (unit === "g") return 1;
    var measured = measuredPortion(food, unit);
    if (measured != null) return measured;
    var perFood = FOOD_UNITS[keyOf(food)];
    if (perFood && perFood[unit] != null) return perFood[unit];
    var cat = CATEGORY_UNITS[food && food.category];
    if (cat && cat[unit] != null) return cat[unit];
    if (GENERIC[unit] != null) return GENERIC[unit];
    return null;
  }

  /**
   * The units worth offering for a food, in display order. Food-specific units (egg,
   * chapati, scoop...) only appear when that food actually defines them -- offering
   * "chapatis" for salmon would be nonsense.
   */
  function unitsFor(food) {
    var perFood = FOOD_UNITS[keyOf(food)] || {};
    var cat = CATEGORY_UNITS[food && food.category] || {};
    // A unit USDA measured for this food is always worth offering — that is the strongest
    // possible evidence the unit applies to it.
    var measured = {};
    if (food && Array.isArray(food.portions)) {
      food.portions.forEach(function (p) { if (p && p.unit) measured[p.unit] = 1; });
    }
    // These only appear when the food (or its category) actually defines them. `slice` is
    // included because a generic fallback would otherwise offer "2 slices of egg".
    var COUNTABLE = { egg:1, banana:1, apple:1, chapati:1, roti:1, idli:1, dosa:1, scoop:1, slice:1 };
    var out = [];
    UNIT_ORDER.forEach(function (u) {
      if (u === "g") { out.push(u); return; }
      // Countable/food-specific units require an explicit definition somewhere.
      if (COUNTABLE[u]) { if (measured[u] || perFood[u] != null || cat[u] != null) out.push(u); return; }
      if (measured[u]) { out.push(u); return; }
      // Volume/portion units are broadly applicable, but drop the ones that make no sense
      // for a solid food logged by the piece.
      if (perFood[u] != null || cat[u] != null || GENERIC[u] != null) {
        if ((u === "glass" || u === "bottle" || u === "can" || u === "ml") &&
            food && food.category !== "Beverages" && food.category !== "Dairy") return;
        out.push(u);
      }
    });
    return out;
  }

  /** Converts an amount in `unit` to grams for this food. Returns null if inapplicable. */
  function toGrams(food, amount, unit) {
    var per = gramsPerUnit(food, unit);
    if (per == null) return null;
    var a = Number(amount);
    if (!isFinite(a) || a <= 0) return null;
    return Math.round(a * per * 10) / 10;
  }

  /** "2 eggs" / "1 cup" / "150 g" — for showing what a portion resolves to. */
  function describe(amount, unit) {
    var meta = UNIT_LABELS[unit] || { label: unit, plural: unit };
    var a = Number(amount);
    var word = (a === 1) ? meta.label : meta.plural;
    var shown = Math.round(a * 100) / 100;
    return (unit === "g" || unit === "ml") ? (shown + word) : (shown + " " + word);
  }

  function labelFor(unit, amount) {
    var meta = UNIT_LABELS[unit] || { label: unit, plural: unit };
    return Number(amount) === 1 ? meta.label : meta.plural;
  }

  window.IgnytServingConverter = Object.freeze({
    unitsFor: unitsFor,
    gramsPerUnit: gramsPerUnit,
    toGrams: toGrams,
    describe: describe,
    labelFor: labelFor,
    UNIT_LABELS: UNIT_LABELS
  });
}());
