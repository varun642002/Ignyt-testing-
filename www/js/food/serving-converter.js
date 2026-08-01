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
    "plate": 250,
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

  /* =========================================================
     FORM — what kind of thing the food physically is.

     The unit list used to be "everything GENERIC has a number for", which is every food in
     the catalogue getting the same eight options. That is how whey protein came to offer
     "bowl" and "piece", milk offered "tbsp" before "glass", and nothing offered a scoop
     unless its category happened to be one of the handful listed in CATEGORY_UNITS.

     That handful is the real problem: CATEGORY_UNITS was written against category names the
     catalogue no longer uses. Of the 41 categories actually in clean_foods.json only seven
     appear there, so 3,000-odd foods were resolving straight to GENERIC.

     Form fixes it at the right level. A food's units follow from what it IS — a powder, a
     liquid, a countable fruit — not from which of two naming conventions its category was
     written in. Category still selects the form, but names override it, because a category
     is often mixed: "Dairy Products" holds both milk and paneer, and only one of those is
     poured.
  ========================================================= */

  /* Units offered per form, in display order. This is the whole list — a unit not named
     here is not offered, which is the point. */
  var FORM_UNITS = {
    supplement:  ["scoop", "g"],
    liquid:      ["ml", "l", "glass", "cup", "bottle", "can"],
    powder:      ["g", "cup", "bowl", "tbsp", "tsp"],
    fruit:       ["g", "piece", "small", "medium", "large", "cup", "bowl"],
    vegetable:   ["g", "piece", "small", "medium", "large", "cup", "bowl"],
    rice:        ["plate", "g", "cup", "bowl", "serving"],
    flatbread:   ["piece", "g", "serving"],
    dosa:        ["piece", "g", "serving"],
    grain:       ["g", "cup", "bowl", "serving"],
    bakery:      ["g", "slice", "piece", "serving"],
    meat:        ["g", "piece", "serving"],
    egg:         ["g", "egg", "piece", "small", "medium", "large"],
    nuts:        ["g", "cup", "tbsp", "piece", "serving"],
    oil:         ["ml", "g", "tbsp", "tsp", "cup"],
    condiment:   ["g", "tbsp", "tsp", "cup", "ml"],
    spice:       ["g", "tsp", "tbsp"],
    snack:       ["g", "packet", "piece", "cup", "serving"],
    sweet:       ["g", "piece", "slice", "cup", "bowl", "serving"],
    frozen:      ["g", "scoop", "cup", "bowl", "serving"],
    biscuit:     ["g", "piece", "packet", "serving"],
    dairySolid:  ["g", "piece", "slice", "cup", "tbsp", "serving"],
    dish:        ["g", "plate", "bowl", "cup", "piece", "serving"],
    other:       ["g", "serving", "cup", "bowl"]
  };

  /* Grams for one of each unit, per form. Sits above CATEGORY_UNITS in the resolution order
     because it is keyed on what the food is rather than on a category name that may or may
     not still be in use. */
  var FORM_GRAMS = {
    supplement:  { scoop: 30, tbsp: 8, serving: 30 },
    liquid:      { ml: 1, l: 1000, glass: 250, cup: 240, bottle: 500, can: 330, serving: 250 },
    powder:      { cup: 120, bowl: 150, tbsp: 8, tsp: 3, serving: 30 },
    fruit:       { piece: 120, cup: 150, bowl: 150, serving: 100 },
    vegetable:   { piece: 80, cup: 100, bowl: 150, serving: 80 },
    /* A standard Indian lunch plate is 250 g of cooked rice; a katori is 130-150 g, well under
       the 240 ml cup that measures 185 g of it. Bowl is the katori, because that is the bowl
       anyone logging this actually owns. */
    rice:        { plate: 250, cup: 185, bowl: 150, serving: 150 },
    // One chapati, roti or idli is 40 g — small 32, large 52 by the same tables. A serving is
    // two, which is how they are eaten.
    flatbread:   { piece: 40, serving: 80 },
    /* A dosa is not a chapati. Published figures put a plain dosa at 60 g homemade and 86 g
       restaurant-style, against 40 g for a chapati, and FOOD_UNITS has had "dosa" at 85 g and
       "masala dosa" at 150 g since before forms existed. 85 keeps the named variants and the
       unnamed ones — Onion Dosa, Neer Dosa — telling the same story instead of one being
       barely half the other. */
    dosa:        { piece: 85, serving: 170 },
    grain:       { cup: 160, bowl: 200, tbsp: 12, serving: 150 },
    bakery:      { slice: 30, piece: 40, serving: 60 },
    meat:        { piece: 100, serving: 150 },
    // Graded sizes, edible portion without shell, from the published egg-size tables.
    egg:         { egg: 50, piece: 50, small: 37, medium: 44, large: 50, serving: 50 },
    nuts:        { cup: 140, tbsp: 10, piece: 1.5, serving: 30 },
    oil:         { ml: 0.92, l: 920, tbsp: 14, tsp: 4.5, cup: 218, serving: 10 },
    condiment:   { tbsp: 17, tsp: 6, cup: 240, ml: 1, serving: 15 },
    spice:       { tsp: 2, tbsp: 6, serving: 2 },
    snack:       { packet: 50, cup: 30, piece: 15, serving: 30 },
    sweet:       { piece: 40, slice: 80, cup: 150, bowl: 150, serving: 50 },
    frozen:      { scoop: 65, cup: 130, bowl: 150, serving: 100 },
    biscuit:     { piece: 12, packet: 100, serving: 30 },
    dairySolid:  { piece: 30, slice: 20, cup: 120, tbsp: 15, serving: 50 },
    dish:        { plate: 300, bowl: 200, cup: 200, piece: 100, serving: 200 },
    other:       {}
  };

  /* The serving chips offered per form, so the chips and the unit list tell one story. */
  var FORM_SHAPES = {
    supplement:  [["scoop", 1], ["scoop", 2], ["scoop", 0.5]],
    liquid:      [["glass", 1], ["cup", 1], ["bottle", 1]],
    powder:      [["tbsp", 1], ["cup", 0.5], ["cup", 1]],
    fruit:       [["medium", 1], ["small", 1], ["large", 1], ["cup", 1]],
    vegetable:   [["medium", 1], ["cup", 1], ["bowl", 1]],
    rice:        [["plate", 1], ["cup", 1], ["bowl", 1]],
    flatbread:   [["piece", 1], ["piece", 2], ["piece", 3]],
    dosa:        [["piece", 1], ["piece", 2]],
    grain:       [["cup", 0.5], ["cup", 1], ["bowl", 1]],
    bakery:      [["slice", 1], ["slice", 2], ["piece", 1]],
    meat:        [["piece", 1], ["serving", 1]],
    egg:         [["egg", 1], ["egg", 2], ["medium", 1], ["large", 1]],
    nuts:        [["tbsp", 1], ["cup", 0.25], ["serving", 1]],
    oil:         [["tsp", 1], ["tbsp", 1]],
    condiment:   [["tsp", 1], ["tbsp", 1]],
    spice:       [["tsp", 1], ["tbsp", 1]],
    snack:       [["packet", 1], ["cup", 1], ["piece", 1]],
    sweet:       [["piece", 1], ["slice", 1], ["bowl", 1]],
    frozen:      [["scoop", 1], ["scoop", 2], ["cup", 1]],
    biscuit:     [["piece", 1], ["piece", 2], ["packet", 1]],
    dairySolid:  [["piece", 1], ["cup", 1], ["tbsp", 1]],
    dish:        [["plate", 1], ["bowl", 1], ["cup", 1]],
    other:       [["serving", 1], ["cup", 1]]
  };

  /* Category -> form. Covers the categories actually present in clean_foods.json, then the
     older names that earlier releases wrote into saved entries. */
  var CATEGORY_FORM = {
    "Branded Whey Protein & Sports Protein Products": "supplement",
    "Gym Supplements": "supplement",
    "Protein-Related Products": "supplement",
    "Branded soft drink": "liquid",
    "Beverages": "liquid",
    "Coffee, Tea & Hot Beverages": "liquid",
    "Branded Coffee, Tea & Hot Drinks": "liquid",
    "Dairy Products": "dairySolid",
    "Baking Ingredients & Flours": "powder",
    "Salt, Sugar & Sweeteners": "powder",
    "Spices & Seasonings": "spice",
    "Oil Types": "oil",
    "Fruits": "fruit",
    "Vegetables": "vegetable",
    "Dry Fruits": "nuts",
    "Nuts & Seeds": "nuts",
    "Fish (by Species)": "meat",
    "Seafood": "meat",
    "Chicken": "meat",
    "Mutton/Lamb": "meat",
    "Processed Meat": "meat",
    "Rice & Bread items": "rice",
    "Pasta, Noodles & International Staples": "grain",
    "Branded Noodles & Instant Pasta": "grain",
    "Dal & Legumes": "grain",
    "Oats, Cereals & Healthy Breakfast Foods": "grain",
    "Branded Breakfast Cereals": "grain",
    "Curries & Gravies": "dish",
    "South Indian dishes": "dish",
    "Fast food": "dish",
    "Frozen & Ready-to-Eat Foods": "dish",
    "Breakfast Brands": "dish",
    "Snacks & Street Foods": "snack",
    "Branded Chocolates & Candy": "sweet",
    "Cakes & Cake Varieties": "sweet",
    "Desserts": "sweet",
    "Branded Ice Cream": "frozen",
    "Branded Biscuits & Cookies": "biscuit",
    "Branded Biscuits": "biscuit",
    "Sauces, Spreads & Condiments": "condiment",
    "Spreads & Condiments": "condiment",

    /* Older category names. Kept because saved log entries and the USDA import still carry
       them, and a food whose category no longer resolves would drop to the generic list. */
    "Rice": "grain", "Grains": "grain", "Grains & Cereals": "grain", "Pasta": "grain",
    "Legumes": "grain", "Beans": "grain", "Beans & Legumes": "grain",
    "Bread": "bakery", "Bread & Bakery": "bakery",
    "Dairy": "dairySolid", "Eggs": "egg",
    "Nuts": "nuts", "Seeds": "nuts",
    "Oils": "oil", "Oils & Fats": "oil",
    "Sauces": "condiment", "Sauces & Condiments": "condiment",
    "Spices & Herbs": "spice",
    "Protein Supplements": "supplement",
    "Beef": "meat", "Pork": "meat", "Fish": "meat", "Turkey": "meat",
    "Game & Other Meats": "meat", "Processed Meats": "meat",
    "Snacks": "snack", "Fast Food": "dish", "Indian Foods": "dish",
    "Soups": "dish", "Meals & Entrees": "dish", "Restaurant Foods": "dish"
  };

  /* Categories that hold more than one kind of thing, where the name has to decide.
     "Dairy Products" is milk and paneer and butter; "Rice & Bread items" is a grain and a
     loaf. Everywhere else the category is the better answer — a food in "Branded Biscuits"
     is a biscuit even when it is called Milk Bikis, and one in "Curries & Gravies" is a
     curry even when it is called Kadai Paneer. Letting names win everywhere classified both
     of those by their ingredient instead of by what they are. */
  var MIXED_CATEGORIES = {
    "Dairy Products": 1,
    "Protein-Related Products": 1,
    "Rice & Bread items": 1,
    "Frozen & Ready-to-Eat Foods": 1,
    "Breakfast Brands": 1,
    "Oats, Cereals & Healthy Breakfast Foods": 1,
    "Desserts": 1,
    "South Indian dishes": 1,
    "Dairy": 1
  };

  /* Name signals. They decide for the mixed categories above, and for any food whose
     category is unknown or missing.

     Order matters. "Protein powder" must reach supplement before powder, and "milk powder"
     must reach powder before liquid, so the more specific test comes first. */
  var NAME_FORMS = [
    [/whey|casein|isolate|mass gainer|bcaa|creatine|pre[\s-]?workout|protein powder|glutamine/, "supplement"],
    [/\bghee\b|\boil\b/, "oil"],
    /* An instant mix or a batter is measured by weight, not counted out — "Gits Dosa Mix" is
       a packet of flour, not a dosa. It has to be tested before the dosa and idli rules that
       follow. Safe to test this broadly: it is only ever reached for a food whose category is
       mixed, so "Trail Mix" in Nuts & Seeds never gets here. */
    [/\b(mix|batter|premix)\b/, "powder"],
    /* Before the rice rule: a rice kheer is a dessert eaten from a bowl, not a plate of rice.
       Its category already says dessert; this stops the word "rice" overriding that. */
    [/\b(kheer|payasam|halwa|pudding|phirni)\b/, "sweet"],
    /* Before the flour rule, because rava IS semolina — but a rava idli is an idli, not a bag
       of semolina, and the same goes for a rava dosa. */
    [/\bdosa\b|\buttapam\b|\bappam\b|\badai\b/, "dosa"],
    [/\b(chapati|chapathi|roti|phulka|paratha|parantha|naan|kulcha|puri|poori|bhatura|thepla|idli|dhokla)\b/, "flatbread"],
    [/\b(flour|atta|maida|besan|sooji|suji|rava|semolina|starch|powder|cocoa|custard)\b/, "powder"],
    /* Also before the rice rule: Rice Krispies and Rice Flakes are cereal, eaten by the bowl,
       and would otherwise be served on a plate like a biryani. */
    [/\b(cereal|krispies|muesli|granola|cornflakes|flakes)\b/, "grain"],
    [/\b(milk|juice|water|soda|cola|lassi|buttermilk|smoothie|shake|tea|coffee|drink|beer|wine|squash|sharbat)\b/, "liquid"],
    [/ice cream|kulfi|gelato|sorbet/, "frozen"],
    /* Egg has to mean the egg itself, not egg as an ingredient. The loose /\begg\b/ this
       replaces put Egg Biryani and Egg Dosa on the egg form, so a plate of biryani was being
       counted out in eggs. */
    [/^(whole |boiled |raw |fried |poached |scrambled |hard[\s-]?boiled )?eggs?$|^egg (whites?|yolks?)$|^omelettes?$/, "egg"],
    // Last of the grain-ish rules, so "rice flour", "rice kheer" and "rice krispies" have all
    // been claimed by something more specific before the word "rice" gets to mean the dish.
    [/\b(rice|biryani|biriyani|pulao|pulav|khichdi|khichri)\b/, "rice"],
    [/\b(bread|bun|pav|toast|croissant|bagel|sandwich)\b/, "bakery"],
    [/\b(biscuit|cookie|cracker|rusk)\b/, "biscuit"],
    [/\b(paneer|cheese|butter|curd|yoghurt|yogurt|khoya)\b/, "dairySolid"]
  ];

  /** What kind of thing this food is: its category, unless that category is mixed. */
  function formOf(food) {
    var category = food && food.category;
    var byCategory = CATEGORY_FORM[category];
    if (byCategory && !MIXED_CATEGORIES[category]) return byCategory;

    var name = keyOf(food);
    for (var i = 0; i < NAME_FORMS.length; i++) {
      if (NAME_FORMS[i][0].test(name)) return NAME_FORMS[i][1];
    }
    return byCategory || "other";
  }

  /* Size words scale the food's own piece weight rather than carrying weights of their own,
     so "1 large apple" stays tied to whatever an apple weighs. Ratios are about what USDA
     reports across produce: a small apple is 149 g against a medium 182 g and a large 223 g. */
  var SIZE_FACTOR = { small: 0.8, medium: 1, large: 1.25 };

  /* Display order and labels. `plural` is used when the amount is not exactly 1. */
  var UNIT_LABELS = {
    g:       { label: "g",          plural: "g" },
    ml:      { label: "ml",         plural: "ml" },
    l:       { label: "litre",      plural: "litres" },
    small:   { label: "small",      plural: "small" },
    medium:  { label: "medium",     plural: "medium" },
    large:   { label: "large",      plural: "large" },
    piece:   { label: "piece",      plural: "pieces" },
    slice:   { label: "slice",      plural: "slices" },
    cup:     { label: "cup",        plural: "cups" },
    bowl:    { label: "bowl",       plural: "bowls" },
    plate:   { label: "plate",      plural: "plates" },
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
    "piece", "small", "medium", "large", "slice", "scoop", "cup", "bowl", "plate", "glass",
    "bottle", "can", "packet", "tbsp", "tsp", "ml", "l", "serving"];

  /* Units named after the food itself. They are offered only when that food actually defines
     one — "2 chapatis of salmon" is the failure this prevents. */
  var NAMED_UNITS = { egg: 1, banana: 1, apple: 1, chapati: 1, roti: 1, idli: 1, dosa: 1 };

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
      var p = ps[i];
      if (!p || p.unit !== unit || !(p.grams > 0)) continue;
      /* How many units the entry describes. USDA rows are "1 cup = 240 g", but the seed
         catalogue writes each food's own basis — "100 ml = 100 g" — and reading that as the
         weight of ONE millilitre made a millilitre of soft drink weigh 100 g, so a glass came
         out at 25 kg. The count is in the label where there is one; absent that, one. */
      var n = p.amount != null ? Number(p.amount)
            : (p.label ? parseFloat(String(p.label)) : 1);
      if (!isFinite(n) || n <= 0) n = 1;
      return p.grams / n;
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

    /* Size words are a multiple of whatever one of this food weighs, resolved through the
       same chain. Keeping them derived is what stops "1 large" meaning the same grams for a
       grape and a watermelon. A food with no piece weight has no size either. */
    if (SIZE_FACTOR[unit] != null) {
      var own = measuredPortion(food, unit);
      if (own != null) return own;              // USDA measured this size for this food
      var sizedFood = FOOD_UNITS[keyOf(food)];
      if (sizedFood && sizedFood[unit] != null) return sizedFood[unit];
      // A form may state its sizes outright where they are graded rather than estimated.
      // Egg sizes are a published standard — 37 / 44 / 50 g of edible egg — not a ratio of
      // some nominal egg, so deriving them from a factor would invent numbers that exist.
      var sizedForm = FORM_GRAMS[formOf(food)];
      if (sizedForm && sizedForm[unit] != null) return sizedForm[unit];
      var piece = gramsPerUnit(food, "piece");
      if (piece == null) return null;
      return Math.round(piece * SIZE_FACTOR[unit] * 10) / 10;
    }

    var measured = measuredPortion(food, unit);
    if (measured != null) return measured;
    var perFood = FOOD_UNITS[keyOf(food)];
    if (perFood && perFood[unit] != null) return perFood[unit];
    var form = FORM_GRAMS[formOf(food)];
    if (form && form[unit] != null) return form[unit];
    var cat = CATEGORY_UNITS[food && food.category];
    if (cat && cat[unit] != null) return cat[unit];

    // A litre is a thousand millilitres of whatever this food's millilitre weighs, so the
    // density only has to be stated once.
    if (unit === "l") {
      var ml = gramsPerUnit(food, "ml");
      return ml == null ? null : ml * 1000;
    }
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
    // A unit USDA measured for this food is always worth offering — that is the strongest
    // possible evidence the unit applies to it, stronger than anything the form assumes.
    var measured = {};
    if (food && Array.isArray(food.portions)) {
      // A "g" portion is the food's own basis restated, not evidence that grams are a
      // sensible way to measure it — every food in the catalogue has one. Offering it would
      // put grams back on the milk that deliberately measures in millilitres.
      food.portions.forEach(function (p) { if (p && p.unit && p.unit !== "g") measured[p.unit] = 1; });
    }

    var out = [];
    function add(u) {
      if (out.indexOf(u) < 0 && gramsPerUnit(food, u) != null) out.push(u);
    }

    /* The food's own name for itself leads: "2 eggs" and "3 chapatis" are how those are
       counted, and burying them under grams would be perverse. Only ever present when this
       food actually defines one. */
    UNIT_ORDER.forEach(function (u) {
      if (NAMED_UNITS[u] && (perFood[u] != null || measured[u])) add(u);
    });

    // Then the form's list, in the order the form declares — that order is the answer to
    // "what does someone measuring this reach for first".
    (FORM_UNITS[formOf(food)] || FORM_UNITS.other).forEach(add);

    // Finally anything measured for this specific food that the form did not think to offer.
    UNIT_ORDER.forEach(function (u) { if (measured[u]) add(u); });

    return out;
  }

  /** The serving-chip shapes worth offering for this food, from its form. */
  function presetShapesFor(food) {
    return (FORM_SHAPES[formOf(food)] || FORM_SHAPES.other).slice();
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

  /** True when this unit measures volume, so the UI can say "quantity" or "volume" honestly. */
  function isVolumeUnit(unit) {
    return unit === "ml" || unit === "l";
  }

  function labelFor(unit, amount) {
    var meta = UNIT_LABELS[unit] || { label: unit, plural: unit };
    return Number(amount) === 1 ? meta.label : meta.plural;
  }

  window.IgnytServingConverter = Object.freeze({
    unitsFor: unitsFor,
    presetShapesFor: presetShapesFor,
    formOf: formOf,
    gramsPerUnit: gramsPerUnit,
    toGrams: toGrams,
    describe: describe,
    labelFor: labelFor,
    isVolumeUnit: isVolumeUnit,
    UNIT_LABELS: UNIT_LABELS
  });
}());
