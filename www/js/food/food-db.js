/* =========================================================
   IGNYT FOOD DATABASE — bundled seed catalogue

   WHAT THIS IS
   A curated reference catalogue of common foods, stored PER 100 g (or per 100 ml for
   liquids). It exists so logging a food no longer requires the user to know and type its
   macros by hand -- previously the only way to log anything.

   WHY PER 100 G
   Every value here is normalised to 100 g, which is how USDA, IFCT and Open Food Facts all
   publish. That means (a) one consistent unit for the whole catalogue, (b) portion maths is
   a single multiply, and (c) a future importer can normalise any external dataset into this
   exact shape without a schema change. Serving/household-measure conversion builds on top of
   this in a later phase; nothing here assumes a particular portion size.

   ACCURACY
   Values are rounded reference figures for the generic form of each food, in line with
   published composition tables. They are good enough for everyday calorie and macro
   tracking, which is what this app does -- they are NOT laboratory values, and a specific
   brand or preparation will differ. Branded items belong in the future Open Food Facts
   import path, not here.

   STORAGE FOOTPRINT
   Deliberately a compact tuple array, not objects -- the same pattern the exercise LIBRARY
   uses. Roughly 60 KB of source for the whole catalogue, parsed once at load and indexed
   in memory by food-search.js. Nothing is written to localStorage: this is static bundled
   reference data, so it costs no user storage quota and never needs syncing.

   TUPLE SHAPE
   [ name, category, kcal, protein_g, carbs_g, fat_g, fibre_g ]   // all per 100 g
========================================================= */
(function () {
  "use strict";

  var CATEGORIES = [
    "Vegetables", "Fruits", "Grains", "Rice", "Bread", "Pasta", "Beans", "Legumes",
    "Nuts", "Seeds", "Dairy", "Eggs", "Chicken", "Turkey", "Beef", "Pork", "Fish",
    "Seafood", "Indian Foods", "Fast Food", "Desserts", "Snacks", "Beverages",
    "Protein Supplements", "Sauces", "Oils", "Custom Foods"
  ];

  /* name, category, kcal, protein, carbs, fat, fibre  — per 100 g */
  /* EMPTIED ON PURPOSE.

     The 273 bundled seed foods were removed so a new dataset can be loaded into a catalogue
     with nothing already in it. Every mechanism around this array is untouched — the tuple
     shape, CATEGORIES, the id scheme and the lookup API all still work exactly as before, so
     refilling this array is the only step needed to restore a bundled catalogue.

     Nothing downstream assumes this is non-empty: food-catalogue.js merges whatever it finds
     and food-search.js indexes it, both of which are correct at zero. */
  var FOODS = [
  ];

  /* Alternate names people actually search for -> the catalogue's canonical name.
     Regional English (Indian/British/American) differences are the main driver here:
     someone typing "capsicum" or "brinjal" should not get an empty result. */
  var ALIASES = {
    "curd": "Yogurt",
    "dahi": "Yogurt",
    "lady finger": "Okra",
    "ladies finger": "Okra",
    "bhindi": "Okra",
    "brinjal": "Aubergine",
    "eggplant": "Aubergine",
    "baingan": "Aubergine",
    "capsicum": "Bell Pepper",
    "sweet pepper": "Bell Pepper",
    "cottage cheese indian": "Paneer",
    "courgette": "Zucchini",
    "coriander": "Vegetables",
    "aubergine": "Aubergine",
    "maida": "Wheat Flour",
    "atta": "Whole Wheat Flour",
    "chana": "Chickpeas (cooked)",
    "chickpea": "Chickpeas (cooked)",
    "garbanzo": "Chickpeas (cooked)",
    "rajmah": "Rajma",
    "moong": "Green Gram (cooked)",
    "mung": "Green Gram (cooked)",
    "urad": "Black Gram (cooked)",
    "masoor": "Red Lentils (cooked)",
    "toor": "Dal (cooked)",
    "arhar": "Dal (cooked)",
    "shrimps": "Prawns",
    "prawn": "Prawns",
    "aloo": "Potato",
    "gobi": "Cauliflower",
    "palak": "Spinach",
    "methi": "Spinach",
    "phulka": "Chapati",
    "chapatti": "Chapati",
    "roti indian": "Roti",
    "whey": "Whey Protein Powder",
    "protein powder": "Whey Protein Powder",
    "protein shake": "Whey Protein Powder",
    "soda": "Cola",
    "coke": "Cola",
    "pepsi": "Cola",
    "chips": "Potato Chips",
    "crisps": "Potato Chips",
    "fries": "French Fries",
    "aubergines": "Aubergine",
    "yoghurt": "Yogurt",
    "greek yoghurt": "Greek Yogurt",
    "cheese": "Cheddar Cheese",
    "milk": "Whole Milk",
    "egg": "Whole Egg",
    "eggs": "Whole Egg",
    "boiled eggs": "Boiled Egg",
    "rice": "White Rice (cooked)",
    "bread": "White Bread",
    "oatmeal": "Rolled Oats (cooked)",
    "porridge": "Rolled Oats (cooked)",
    "peanut butter": "Peanut Butter",
    "pb": "Peanut Butter",
    "chicken": "Chicken Breast",
    "beef": "Beef Steak",
    "steak": "Beef Steak",
    "mince": "Beef Mince",
    "tuna fish": "Tuna",
    "salmon fillet": "Salmon"
  };

  /* Convert the compact tuples into objects exactly once, at load. The shape mirrors what
     the logging path already expects (name + the five macro fields), with `per` recording
     that these values describe 100 g so the portion maths has an explicit basis rather than
     an assumed one. */
  var CATALOGUE = FOODS.map(function (t, i) {
    return {
      id: "seed:" + i,           // namespaced so seed foods can never collide with user ids
      name: t[0],
      category: t[1],
      per: 100,                  // grams these values describe
      calories: t[2],
      protein: t[3],
      carbs: t[4],
      fat: t[5],
      fibre: t[6],
      source: "seed"
    };
  });

  /** Scales a catalogue entry to a gram amount, returning the shape the food log stores. */
  function scaleFood(food, grams) {
    var g = Number(grams);
    if (!isFinite(g) || g <= 0) g = food.per;
    var f = g / food.per;
    var r1 = function (n) { return Math.round(n * f * 10) / 10; };
    return {
      name: food.name,
      grams: Math.round(g * 10) / 10,
      calories: Math.round(food.calories * f),
      protein: r1(food.protein),
      carbs: r1(food.carbs),
      fat: r1(food.fat),
      fibre: r1(food.fibre)
    };
  }

  window.IgnytFoodDB = Object.freeze({
    CATEGORIES: CATEGORIES,
    ALIASES: ALIASES,
    all: function () { return CATALOGUE; },
    count: function () { return CATALOGUE.length; },
    byId: function (id) {
      for (var i = 0; i < CATALOGUE.length; i++) if (CATALOGUE[i].id === id) return CATALOGUE[i];
      return null;
    },
    byName: function (name) {
      var k = String(name || "").trim().toLowerCase();
      for (var i = 0; i < CATALOGUE.length; i++) if (CATALOGUE[i].name.toLowerCase() === k) return CATALOGUE[i];
      return null;
    },
    scaleFood: scaleFood
  });
}());
