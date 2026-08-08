/* =========================================================
   IGNYT FOOD IMAGES — resolve a food to a picture, offline, instantly

   WHY THIS IS NOT AN ONLINE IMAGE SEARCH
   The obvious build is "search the food name on a photo API and cache the result". It was
   rejected for four reasons, each on its own sufficient:

     Matching.   Photo search works for "Apple". It does not work for "Beans, Snap, Green,
                 Canned, Regular Pack, Drained Solids", and a great many of the catalogue's
                 4,062 foods are named like that. A confidently wrong photo attached to a
                 food log is
                 worse than no photo.
     Licensing.  Wikimedia Commons is largely CC-BY-SA, which requires visible attribution
                 and carries share-alike obligations. The others have their own terms.
     Keys.       Unsplash, Pexels and Pixabay all need API keys, and a key shipped inside an
                 APK is a published key.
     Privacy.    It sends what the user is eating to a third party on every lookup.

   So resolution is entirely local: a keyword pass over the food name, then the food's
   category, then a generic fallback. Always correct, always instant, works offline, no keys,
   no attribution burden, no network at all.

   THE PROVIDER INTERFACE IS STILL HERE
   registerProvider() exists so an online source can be added later without touching a single
   line of UI. Providers are tried in priority order and may be async; the bundled provider is
   synchronous and always last, so it is the floor rather than the fallback — nothing can ever
   render nothing.
========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     Keyword rules — most specific first, first match wins.

     Scoped and ordered deliberately: "chicken soup" must resolve to soup, not chicken, so
     the dish rules sit above the ingredient rules. Rules are matched against the whole
     lowercase name with word boundaries, so "grape" cannot match "grapefruit".
  --------------------------------------------------------- */
  var RULES = [
    /* Unambiguous product words that must outrank the dish rules below. USDA writes cooking
       oils as "Oil, Olive, Salad or Cooking" — the dish rule for /salad/ matched that and
       served a bowl of leaves for a bottle of olive oil. Nothing named "oil" is a dish. */
    [/\boils?\b/, "oil"],

    /* dishes next — these describe a prepared food, and the ingredient is incidental */
    [/\b(soup|broth|bouillon|chowder|bisque|consomme)\b/, "bowl"],
    [/\b(pizza)\b/, "burger"],
    [/\b(burger|hamburger|cheeseburger)\b/, "burger"],
    [/\b(sandwich|sub|wrap)\b/, "bread"],
    [/\b(taco|burrito|quesadilla|nacho)\b/, "burger"],
    [/\b(sushi|sashimi)\b/, "rice"],
    [/\b(curry|masala|tikka|korma|biryani|dal|daal)\b/, "curry"],
    [/\b(salad|slaw)\b/, "leaf"],
    [/\b(stew|casserole|hotpot)\b/, "bowl"],
    [/\b(pasta|spaghetti|macaroni|lasagna|noodle|ramen|linguine|penne)\b/, "bowl"],
    [/\b(sausage|frankfurter|hot dog|hotdog|bratwurst)\b/, "burger"],
    [/\b(fries|french fried)\b/, "snack"],
    [/\b(popcorn)\b/, "snack"],
    [/\b(pancake|waffle)\b/, "bread"],
    [/\b(pie|tart|cobbler)\b/, "cake"],
    [/\b(cake|cheesecake|brownie|cupcake)\b/, "cake"],
    [/\b(cookie|biscuit(?!s?, refrigerated)|shortbread)\b/, "cake"],
    [/\b(doughnut|donut)\b/, "cake"],
    [/\b(chocolate|cocoa|candy|fudge|toffee|caramel)\b/, "cake"],
    [/\b(ice cream|gelato|sorbet|frozen dessert)\b/, "cake"],
    [/\b(honey)\b/, "sauce"],
    [/\b(jam|jelly|preserve|marmalade)\b/, "apple"],

    /* animal proteins */
    [/\b(chicken|broilers or fryers|poultry)\b/, "meat"],
    [/\b(turkey)\b/, "meat"],
    [/\b(duck|goose|quail|pheasant)\b/, "meat"],
    [/\b(bacon)\b/, "meat"],
    [/\b(ham|pork|swine)\b/, "meat"],
    [/\b(beef|steak|veal|sirloin|brisket|ground beef)\b/, "meat"],
    [/\b(lamb|mutton|goat|venison|bison|elk)\b/, "meat"],
    [/\b(shrimp|prawn)\b/, "shrimp"],
    [/\b(crab|lobster|crayfish)\b/, "shrimp"],
    [/\b(oyster|clam|mussel|scallop)\b/, "shrimp"],
    [/\b(squid|octopus|calamari)\b/, "shrimp"],
    [/\b(salmon|tuna|cod|halibut|trout|herring|mackerel|sardine|anchovy|tilapia|bass|haddock|pollock|snapper|fish)\b/, "fish"],
    [/\b(egg|eggs)\b/, "egg"],

    /* dairy */
    [/\b(cheese|cheddar|mozzarella|parmesan|paneer|feta|brie)\b/, "milk"],
    [/\b(butter|ghee)\b/, "oil"],
    [/\b(yogurt|yoghurt|curd)\b/, "milk"],
    [/\b(milk|cream|dairy)\b/, "milk"],

    /* fruit */
    [/\b(apple|apples)\b/, "apple"],
    [/\b(banana|bananas|plantain)\b/, "apple"],
    [/\b(orange|tangerine|clementine|mandarin)\b/, "apple"],
    [/\b(lemon|lime)\b/, "apple"],
    [/\b(grapefruit)\b/, "apple"],
    [/\b(grape|grapes|raisin)\b/, "apple"],
    [/\b(strawberr|raspberr|blackberr|blueberr|cranberr|berry|berries)/, "apple"],
    [/\b(watermelon)\b/, "apple"],
    [/\b(melon|cantaloupe|honeydew)\b/, "apple"],
    [/\b(peach|nectarine|apricot)\b/, "apple"],
    [/\b(pear|pears)\b/, "apple"],
    [/\b(pineapple)\b/, "apple"],
    [/\b(mango|mangoes)\b/, "apple"],
    [/\b(avocado)\b/, "carrot"],
    [/\b(cherry|cherries)\b/, "apple"],
    [/\b(coconut)\b/, "apple"],
    [/\b(kiwi)\b/, "apple"],
    [/\b(date|dates|fig|figs)\b/, "carrot"],

    /* vegetables */
    [/\b(tomato|tomatoes)\b/, "carrot"],
    [/\b(potato|potatoes)\b/, "carrot"],
    [/\b(sweet potato|yam)\b/, "carrot"],
    [/\b(carrot|carrots)\b/, "carrot"],
    [/\b(broccoli|cauliflower)\b/, "carrot"],
    [/\b(corn|maize|sweetcorn)\b/, "carrot"],
    [/\b(pepper|peppers|capsicum|chili|chilli|jalapeno)\b/, "spice"],
    [/\b(cucumber|gherkin|pickle)\b/, "carrot"],
    [/\b(lettuce|spinach|kale|cabbage|greens|chard|arugula)\b/, "leaf"],
    [/\b(onion|onions|shallot|leek)\b/, "carrot"],
    [/\b(garlic)\b/, "carrot"],
    [/\b(mushroom|mushrooms)\b/, "carrot"],
    [/\b(eggplant|aubergine|brinjal)\b/, "carrot"],
    [/\b(pumpkin|squash|courgette|zucchini|gourd)\b/, "snack"],
    [/\b(pea|peas|bean|beans|lentil|chickpea|soybean|tofu)\b/, "beans"],

    /* staples */
    [/\b(rice)\b/, "rice"],
    [/\b(bread|toast|bagel|roll|bun|baguette|naan|pita)\b/, "bread"],
    [/\b(croissant)\b/, "bread"],
    [/\b(tortilla|chapati|roti|paratha)\b/, "bread"],
    [/\b(pretzel)\b/, "snack"],
    [/\b(oat|oats|oatmeal|porridge|granola|muesli|cereal)\b/, "bowl"],
    [/\b(wheat|flour|barley|quinoa|millet|grain|couscous)\b/, "grain"],

    /* nuts, seeds, fats */
    [/\b(peanut|almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|nut|nuts)\b/, "nut"],
    [/\b(seed|seeds|sesame|sunflower|flax|chia)\b/, "carrot"],
    [/\bolives?\b/, "oil"],

    /* drinks */
    [/\b(coffee|espresso|latte|cappuccino)\b/, "cup"],
    [/\b(tea|chai)\b/, "cup"],
    [/\b(juice)\b/, "cup"],
    [/\b(beer|ale|lager)\b/, "cup"],
    [/\b(wine)\b/, "cup"],
    [/\b(water|beverages?, water)\b/, "droplet"],
    [/\b(soda|cola|soft drink|carbonated)\b/, "cup"],
    [/\b(smoothie|shake|protein powder|whey|casein)\b/, "cup"],

    /* seasoning */
    [/\b(salt)\b/, "spice"],
    [/\b(sugar|syrup|molasses)\b/, "cake"],
    [/\b(spice|herb|basil|oregano|thyme|cinnamon|pepper, black)\b/, "spice"],
    [/\b(sauce|ketchup|mustard|mayonnaise|dressing|vinegar)\b/, "sauce"]
  ];

  /* Per-category floor, so a food that matches no keyword still gets something meaningful. */
  var CATEGORY_GLYPHS = {
    "Vegetables":"carrot", "Fruits":"apple", "Grains & Cereals":"grain", "Bread & Bakery":"bread",
    "Rice":"rice", "Pasta":"bowl", "Beans & Legumes":"beans", "Nuts & Seeds":"nut",
    "Dairy":"milk", "Eggs":"egg", "Chicken":"meat", "Turkey":"meat", "Beef":"meat", "Pork":"meat",
    "Game & Other Meats":"meat", "Fish":"fish", "Seafood":"shrimp", "Oils & Fats":"oil",
    "Spices & Herbs":"spice", "Sauces & Condiments":"sauce", "Beverages":"cup", "Desserts":"cake",
    "Snacks":"snack", "Fast Food":"burger", "Soups":"bowl", "Meals & Entrees":"rice",
    "Restaurant Foods":"plate", "Protein Supplements":"shaker", "Indian Foods":"curry",
    "Custom Foods":"pencil"
  };

  var GENERIC = "cutlery";

  /* The tint behind a thumbnail, taken from the category's nutrient colour so a list of
     foods reads as varied without any of the colour being decorative. */
  var CATEGORY_TINT = {
    "Chicken":"n-protein", "Turkey":"n-protein", "Beef":"n-iron", "Pork":"n-iron",
    "Game & Other Meats":"n-iron", "Fish":"n-carbs", "Seafood":"n-carbs",
    "Eggs":"n-fat", "Dairy":"n-calcium", "Protein Supplements":"n-protein",
    "Vegetables":"n-potassium", "Fruits":"n-sugar", "Beans & Legumes":"n-protein",
    "Nuts & Seeds":"n-fat", "Grains & Cereals":"n-fibre", "Bread & Bakery":"n-fibre",
    "Rice":"n-fibre", "Pasta":"n-fibre", "Oils & Fats":"n-fat",
    "Beverages":"n-water", "Soups":"n-water", "Desserts":"n-sugar", "Snacks":"n-sugar",
    "Fast Food":"n-sodium", "Sauces & Condiments":"n-sodium", "Spices & Herbs":"n-potassium",
    "Indian Foods":"n-energy", "Meals & Entrees":"n-energy", "Restaurant Foods":"n-energy"
  };

  /* ---------------------------------------------------------
     Providers
  --------------------------------------------------------- */
  var providers = [];

  /**
   * Registers an image source.
   * @param {string} name
   * @param {{priority:number, resolve:function(object):(object|Promise|null)}} provider
   *        resolve() returns {kind:"url", url} or {kind:"glyph", glyph} or null to pass.
   *        It may return a promise; the bundled provider never does.
   */
  function registerProvider(name, provider) {
    if (!provider || typeof provider.resolve !== "function") return;
    providers.push({ name: name, priority: provider.priority || 0, resolve: provider.resolve });
    providers.sort(function (a, b) { return b.priority - a.priority; });
  }

  /* The bundled provider. Priority 0 and registered first, so any online provider added
     later outranks it — but it can never fail, so there is always something to draw. */
  function bundledResolve(food) {
    var name = String((food && food.name) || "").toLowerCase();
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(name)) return { kind: "glyph", glyph: RULES[i][1], source: "keyword" };
    }
    var cat = food && food.category;
    if (cat && CATEGORY_GLYPHS[cat]) return { kind: "glyph", glyph: CATEGORY_GLYPHS[cat], source: "category" };
    return { kind: "glyph", glyph: GENERIC, source: "generic" };
  }

  registerProvider("bundled", { priority: 0, resolve: bundledResolve });

  /* ---------------------------------------------------------
     Cache

     A bounded memory cache keyed by food id. Resolution is a regex sweep over ~100 rules,
     which is cheap but not free when a list re-renders on every keystroke, and the result
     for a given food never changes within a session.

     There is deliberately NO disk cache. Disk caching exists to avoid re-downloading, and
     nothing here is downloaded — persisting a two-byte glyph to IndexedDB would cost more
     than recomputing it. When an online provider is added, it should own its own disk cache,
     because it is the only thing that would benefit.
  --------------------------------------------------------- */
  var CACHE_MAX = 600;
  var cache = new Map();

  function cacheGet(key) {
    if (!cache.has(key)) return undefined;
    var v = cache.get(key);
    cache.delete(key);          // re-insert to make Map iteration order an LRU order
    cache.set(key, v);
    return v;
  }
  function cacheSet(key, value) {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);   // evict oldest
  }

  /**
   * Resolves a food to an image descriptor. Synchronous, because every bundled provider is.
   * An async provider registered later is consulted through resolveAsync() instead.
   * @returns {{kind:string, glyph?:string, url?:string, source:string}}
   */
  function resolve(food) {
    var key = (food && food.id) || (food && food.name) || "?";
    var hit = cacheGet(key);
    if (hit !== undefined) return hit;

    var out = null;
    for (var i = 0; i < providers.length && !out; i++) {
      var r;
      try { r = providers[i].resolve(food); } catch (e) { r = null; }
      // A promise means an async provider; skip it here and let resolveAsync handle it.
      if (r && typeof r.then === "function") continue;
      if (r) out = r;
    }
    if (!out) out = bundledResolve(food);

    cacheSet(key, out);
    return out;
  }

  /** Async path, for a future online provider. Falls back to the sync result. */
  function resolveAsync(food) {
    var chain = Promise.resolve(null);
    providers.forEach(function (p) {
      chain = chain.then(function (found) {
        if (found) return found;
        try { return Promise.resolve(p.resolve(food)); } catch (e) { return null; }
      });
    });
    return chain.then(function (found) {
      var out = found || bundledResolve(food);
      cacheSet((food && food.id) || (food && food.name) || "?", out);
      return out;
    });
  }

  /** Ready-to-insert thumbnail markup. Tinted by category so a list reads as varied. */
  function thumbHtml(food, size) {
    var img = resolve(food);
    var tintVar = CATEGORY_TINT[food && food.category];
    var tint = tintVar
      ? "background:color-mix(in srgb, var(--" + tintVar + ") 16%, var(--surface-alt));"
      : "";
    var px = size ? "width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size * 0.5) + "px;" : "";
    if (img.kind === "url") {
      // loading="lazy" and decoding="async" keep a long list from blocking on images; the
      // glyph stays underneath as the placeholder until one paints.
      return '<span class="food-thumb" style="' + tint + px + '">' +
        '<img src="' + img.url + '" alt="" loading="lazy" decoding="async" ' +
        'style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></span>';
    }
    /* svg() lives in app.js, which loads after this module — but thumbHtml only runs at
       render time, long after both are parsed. Guarded anyway so a food list can never
       throw just because something changed the load order. */
    var icon = (typeof svg === "function") ? svg(img.glyph, size ? Math.round(size * 0.55) : 18) : "";
    return '<span class="food-thumb" style="' + tint + px + '" aria-hidden="true">' + icon + '</span>';
  }

  window.IgnytFoodImages = Object.freeze({
    registerProvider: registerProvider,
    resolve: resolve,
    resolveAsync: resolveAsync,
    thumbHtml: thumbHtml,
    glyphFor: function (food) { return resolve(food).glyph || GENERIC; },
    categoryGlyph: function (c) { return CATEGORY_GLYPHS[c] || GENERIC; },
    CATEGORY_GLYPHS: CATEGORY_GLYPHS,
    providerNames: function () { return providers.map(function (p) { return p.name; }); },
    cacheSize: function () { return cache.size; },
    clearCache: function () { cache.clear(); }
  });
}());
