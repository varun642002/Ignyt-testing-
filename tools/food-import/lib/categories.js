/* =========================================================
   CATEGORY ASSIGNMENT

   USDA's own categories are too coarse to browse: one "Poultry Products" bucket holds both
   chicken and turkey, "Cereal Grains and Pasta" holds rice and spaghetti, and "Dairy and Egg
   Products" holds milk and eggs. So the USDA category is used as a CONTEXT, not as the
   answer, and a short ordered rule list refines within it.

   Refining inside the USDA category (rather than running keyword rules globally) is what
   keeps this accurate. A global rule for /chicken/ would file "Soup, Chicken Noodle" under
   Chicken; scoped to "Soups, Sauces, and Gravies" the same food correctly lands in Soups.

   Every food gets a category. Rules are ordered most-specific-first and the first match
   wins, so adding a narrower rule means putting it above a broader one.

   DEVIATIONS FROM THE APPROVED CATEGORY LIST — these need a decision:
     * "Game & Other Meats"  — the approved list has Chicken/Turkey/Beef/Pork but nothing for
       USDA's 464 "Lamb, Veal, and Game Products" or its game birds (duck, goose, quail).
       Filing lamb under Beef would be wrong, so they get their own bucket.
     * "Meals & Entrees"     — USDA's "Meals, Entrees, and Side Dishes" are packaged complete
       meals; they are neither Fast Food nor Restaurant Foods.
     * Baby Foods            — 345 SR Legacy records, excluded by default. They add no value
       to a fitness tracker and they crowd out real results (searching "apple" would surface
       a dozen strained-apple purees). Pass --include-baby-foods to keep them.
========================================================= */
"use strict";

/* The browsable set. Order here is the display order in the category browser. */
var CATEGORIES = [
  "Vegetables", "Fruits", "Grains & Cereals", "Bread & Bakery", "Rice", "Pasta",
  "Beans & Legumes", "Nuts & Seeds", "Dairy", "Eggs", "Chicken", "Turkey", "Beef", "Pork",
  "Game & Other Meats", "Fish", "Seafood", "Oils & Fats", "Spices & Herbs",
  "Sauces & Condiments", "Beverages", "Desserts", "Snacks", "Fast Food", "Soups",
  "Meals & Entrees", "Restaurant Foods", "Protein Supplements", "Indian Foods", "Custom Foods"
];

var FALLBACK = "Meals & Entrees";

/* ---------------------------------------------------------
   Global rules, applied before the USDA category is consulted.
   Deliberately tiny and tightly worded — anything loose here misfiles at scale.
--------------------------------------------------------- */
var PRE_RULES = [
  /* Analytical dry-matter rows, not foods. USDA publishes 17 of these ("Beans, Dry, Pinto
     (0% Moisture)"): the nutrient values describe the dehydrated solids, not the bean as
     bought or eaten, so logging one would overstate everything by the food's water content.
     They also carry no energy row, which is what surfaced them. */
  [/\b0%?\s*moisture\b/, "EXCLUDE"],

  [/\b(whey|casein|soy|pea|rice)\s+protein\b/, "Protein Supplements"],
  [/\bprotein\s+(powder|isolate|concentrate|supplement)\b/, "Protein Supplements"],
  [/\bmeal\s+replacement\b/, "Protein Supplements"]
];

/* ---------------------------------------------------------
   Refinements scoped to an ambiguous USDA category.
--------------------------------------------------------- */
var SHELLFISH = /\b(shrimp|prawn|crab|lobster|oyster|clam|mussel|scallop|squid|octopus|crayfish|abalone|snail|cuttlefish|conch)\b/;
var PASTA = /\b(pasta|spaghetti|macaroni|noodle|noodles|lasagna|linguine|fettuccine|penne|vermicelli|couscous|ravioli)\b/;
var SOUPY = /\b(soup|broth|bouillon|stock|chowder|bisque|consomme|gazpacho)\b/;
var SWEET_BAKED = /\b(cake|pie|cookie|cookies|brownie|brownies|pastry|pastries|doughnut|donut|danish|cobbler|cheesecake|eclair|strudel|tart|tarts|shortcake|frosting|icing|sweet roll|coffeecake)\b/;
var CRACKER = /\b(cracker|crackers|crouton|croutons|chips?)\b/;
var TURKEY = /\bturkey\b/;
var CHICKEN = /\bchicken\b/;
var GAME_BIRD = /\b(duck|goose|pheasant|quail|emu|ostrich|squab|dove|guinea hen)\b/;
var GAME_MEAT = /\b(lamb|mutton|veal|venison|deer|elk|moose|bison|buffalo|caribou|rabbit|goat|bear|boar|antelope|beaver|muskrat|opossum|raccoon|squirrel|seal|whale|walrus)\b/;
var FISHY = /\b(fish|salmon|tuna|cod|halibut|trout|herring|mackerel|sardine|anchovy|bass|catfish|flounder|haddock|perch|pike|pollock|snapper|sturgeon|swordfish|tilapia|whitefish|eel|carp|roe|caviar)\b/;

var REFINERS = {
  "Poultry Products": [
    [TURKEY, "Turkey"],
    [CHICKEN, "Chicken"],
    [GAME_BIRD, "Game & Other Meats"]
  ],
  "Sausages and Luncheon Meats": [
    [TURKEY, "Turkey"],
    [CHICKEN, "Chicken"],
    [/\bbeef\b/, "Beef"],
    [GAME_MEAT, "Game & Other Meats"]
    // Default is Pork: the overwhelming majority of USDA sausage and luncheon-meat
    // records are pork-based, and the ones that are not are caught above.
  ],
  "Dairy and Egg Products": [
    [/\begg|eggs\b/, "Eggs"]
  ],
  "Cereal Grains and Pasta": [
    [PASTA, "Pasta"],
    [/\brice\b/, "Rice"]
  ],
  "Baked Products": [
    [SWEET_BAKED, "Desserts"],
    [CRACKER, "Snacks"]
  ],
  "Finfish and Shellfish Products": [
    [SHELLFISH, "Seafood"]
  ],
  "Legumes and Legume Products": [
    [/\b(tofu|tempeh|natto|miso)\b/, "Beans & Legumes"]
  ],
  "Soups, Sauces, and Gravies": [
    [SOUPY, "Soups"]
  ],
  "Fruits and Fruit Juices": [
    [/\bjuice\b/, "Beverages"]
  ],
  "Vegetables and Vegetable Products": [
    [SOUPY, "Soups"],
    [/\b(potato|corn|vegetable)\s+chips?\b/, "Snacks"]
  ],
  /* These are traditional foods spanning every food type, so they get the full rule set. */
  "American Indian/Alaska Native Foods": [
    [SOUPY, "Soups"],
    [FISHY, "Fish"],
    [SHELLFISH, "Seafood"],
    [GAME_MEAT, "Game & Other Meats"],
    [GAME_BIRD, "Game & Other Meats"],
    [/\bbread|frybread|biscuit|bannock\b/, "Bread & Bakery"],
    [/\bcorn|beans?|squash|potato\b/, "Vegetables"],
    [/\bberr(y|ies)|apple|plum|cherry|melon\b/, "Fruits"],
    [/\bseed|nut|acorn|pine nut\b/, "Nuts & Seeds"],
    [/\brice\b/, "Rice"],
    [/\bfat|oil|tallow|lard\b/, "Oils & Fats"]
  ],
  "Meals, Entrees, and Side Dishes": [
    [SOUPY, "Soups"],
    [PASTA, "Pasta"]
  ]
};

/* Fallback when no refiner rule matched (also the whole answer for unambiguous categories). */
var DIRECT = {
  "Vegetables and Vegetable Products": "Vegetables",
  "Fruits and Fruit Juices": "Fruits",
  "Dairy and Egg Products": "Dairy",
  "Cereal Grains and Pasta": "Grains & Cereals",
  "Breakfast Cereals": "Grains & Cereals",
  "Baked Products": "Bread & Bakery",
  "Legumes and Legume Products": "Beans & Legumes",
  "Nut and Seed Products": "Nuts & Seeds",
  "Poultry Products": "Chicken",
  "Beef Products": "Beef",
  "Pork Products": "Pork",
  "Sausages and Luncheon Meats": "Pork",
  "Lamb, Veal, and Game Products": "Game & Other Meats",
  "Finfish and Shellfish Products": "Fish",
  "Fats and Oils": "Oils & Fats",
  "Spices and Herbs": "Spices & Herbs",
  "Soups, Sauces, and Gravies": "Sauces & Condiments",
  "Beverages": "Beverages",
  "Sweets": "Desserts",
  "Snacks": "Snacks",
  "Fast Foods": "Fast Food",
  "Restaurant Foods": "Restaurant Foods",
  "Meals, Entrees, and Side Dishes": "Meals & Entrees",
  "American Indian/Alaska Native Foods": FALLBACK,
  "Baby Foods": "EXCLUDE"
};

/**
 * @param {string} usdaCategory  raw USDA foodCategory description
 * @param {string} searchKey     lowercase punctuation-free name (from normalize.searchKey)
 * @returns {{category:string, rule:string}} `category` is "EXCLUDE" for dropped groups
 */
function assign(usdaCategory, searchKey) {
  var name = " " + (searchKey || "") + " ";

  for (var i = 0; i < PRE_RULES.length; i++) {
    if (PRE_RULES[i][0].test(name)) return { category: PRE_RULES[i][1], rule: "global-keyword" };
  }

  var usda = usdaCategory || "";
  var refiners = REFINERS[usda];
  if (refiners) {
    for (var j = 0; j < refiners.length; j++) {
      if (refiners[j][0].test(name)) return { category: refiners[j][1], rule: "refined:" + usda };
    }
  }

  if (Object.prototype.hasOwnProperty.call(DIRECT, usda)) {
    return { category: DIRECT[usda], rule: DIRECT[usda] === "EXCLUDE" ? "excluded" : "usda-map" };
  }

  return { category: FALLBACK, rule: "fallback" };
}

export { CATEGORIES, assign, DIRECT, REFINERS, FALLBACK };
