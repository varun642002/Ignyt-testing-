/* =========================================================
   IGNYT FOOD IMAGES — resolve a food to a picture, offline, instantly

   WHY THIS IS NOT AN ONLINE IMAGE SEARCH
   The obvious build is "search the food name on a photo API and cache the result". It was
   rejected for four reasons, each on its own sufficient:

     Matching.   Photo search works for "Apple". It does not work for "Beans, Snap, Green,
                 Canned, Regular Pack, Drained Solids", and most of the 7,697 USDA foods are
                 named like that. A confidently wrong photo attached to someone's food log is
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
    [/\boils?\b/, "🫒"],

    /* dishes next — these describe a prepared food, and the ingredient is incidental */
    [/\b(soup|broth|bouillon|chowder|bisque|consomme)\b/, "🍲"],
    [/\b(pizza)\b/, "🍕"],
    [/\b(burger|hamburger|cheeseburger)\b/, "🍔"],
    [/\b(sandwich|sub|wrap)\b/, "🥪"],
    [/\b(taco|burrito|quesadilla|nacho)\b/, "🌮"],
    [/\b(sushi|sashimi)\b/, "🍣"],
    [/\b(curry|masala|tikka|korma|biryani|dal|daal)\b/, "🍛"],
    [/\b(salad|slaw)\b/, "🥗"],
    [/\b(stew|casserole|hotpot)\b/, "🍲"],
    [/\b(pasta|spaghetti|macaroni|lasagna|noodle|ramen|linguine|penne)\b/, "🍝"],
    [/\b(sausage|frankfurter|hot dog|hotdog|bratwurst)\b/, "🌭"],
    [/\b(fries|french fried)\b/, "🍟"],
    [/\b(popcorn)\b/, "🍿"],
    [/\b(pancake|waffle)\b/, "🥞"],
    [/\b(pie|tart|cobbler)\b/, "🥧"],
    [/\b(cake|cheesecake|brownie|cupcake)\b/, "🍰"],
    [/\b(cookie|biscuit(?!s?, refrigerated)|shortbread)\b/, "🍪"],
    [/\b(doughnut|donut)\b/, "🍩"],
    [/\b(chocolate|cocoa|candy|fudge|toffee|caramel)\b/, "🍫"],
    [/\b(ice cream|gelato|sorbet|frozen dessert)\b/, "🍦"],
    [/\b(honey)\b/, "🍯"],
    [/\b(jam|jelly|preserve|marmalade)\b/, "🍓"],

    /* animal proteins */
    [/\b(chicken|broilers or fryers|poultry)\b/, "🍗"],
    [/\b(turkey)\b/, "🦃"],
    [/\b(duck|goose|quail|pheasant)\b/, "🦆"],
    [/\b(bacon)\b/, "🥓"],
    [/\b(ham|pork|swine)\b/, "🍖"],
    [/\b(beef|steak|veal|sirloin|brisket|ground beef)\b/, "🥩"],
    [/\b(lamb|mutton|goat|venison|bison|elk)\b/, "🍖"],
    [/\b(shrimp|prawn)\b/, "🍤"],
    [/\b(crab|lobster|crayfish)\b/, "🦞"],
    [/\b(oyster|clam|mussel|scallop)\b/, "🦪"],
    [/\b(squid|octopus|calamari)\b/, "🦑"],
    [/\b(salmon|tuna|cod|halibut|trout|herring|mackerel|sardine|anchovy|tilapia|bass|haddock|pollock|snapper|fish)\b/, "🐟"],
    [/\b(egg|eggs)\b/, "🥚"],

    /* dairy */
    [/\b(cheese|cheddar|mozzarella|parmesan|paneer|feta|brie)\b/, "🧀"],
    [/\b(butter|ghee)\b/, "🧈"],
    [/\b(yogurt|yoghurt|curd)\b/, "🥛"],
    [/\b(milk|cream|dairy)\b/, "🥛"],

    /* fruit */
    [/\b(apple|apples)\b/, "🍎"],
    [/\b(banana|bananas|plantain)\b/, "🍌"],
    [/\b(orange|tangerine|clementine|mandarin)\b/, "🍊"],
    [/\b(lemon|lime)\b/, "🍋"],
    [/\b(grapefruit)\b/, "🍊"],
    [/\b(grape|grapes|raisin)\b/, "🍇"],
    [/\b(strawberr|raspberr|blackberr|blueberr|cranberr|berry|berries)/, "🍓"],
    [/\b(watermelon)\b/, "🍉"],
    [/\b(melon|cantaloupe|honeydew)\b/, "🍈"],
    [/\b(peach|nectarine|apricot)\b/, "🍑"],
    [/\b(pear|pears)\b/, "🍐"],
    [/\b(pineapple)\b/, "🍍"],
    [/\b(mango|mangoes)\b/, "🥭"],
    [/\b(avocado)\b/, "🥑"],
    [/\b(cherry|cherries)\b/, "🍒"],
    [/\b(coconut)\b/, "🥥"],
    [/\b(kiwi)\b/, "🥝"],
    [/\b(date|dates|fig|figs)\b/, "🌴"],

    /* vegetables */
    [/\b(tomato|tomatoes)\b/, "🍅"],
    [/\b(potato|potatoes)\b/, "🥔"],
    [/\b(sweet potato|yam)\b/, "🍠"],
    [/\b(carrot|carrots)\b/, "🥕"],
    [/\b(broccoli|cauliflower)\b/, "🥦"],
    [/\b(corn|maize|sweetcorn)\b/, "🌽"],
    [/\b(pepper|peppers|capsicum|chili|chilli|jalapeno)\b/, "🌶️"],
    [/\b(cucumber|gherkin|pickle)\b/, "🥒"],
    [/\b(lettuce|spinach|kale|cabbage|greens|chard|arugula)\b/, "🥬"],
    [/\b(onion|onions|shallot|leek)\b/, "🧅"],
    [/\b(garlic)\b/, "🧄"],
    [/\b(mushroom|mushrooms)\b/, "🍄"],
    [/\b(eggplant|aubergine|brinjal)\b/, "🍆"],
    [/\b(pumpkin|squash|courgette|zucchini|gourd)\b/, "🎃"],
    [/\b(pea|peas|bean|beans|lentil|chickpea|soybean|tofu)\b/, "🫘"],

    /* staples */
    [/\b(rice)\b/, "🍚"],
    [/\b(bread|toast|bagel|roll|bun|baguette|naan|pita)\b/, "🍞"],
    [/\b(croissant)\b/, "🥐"],
    [/\b(tortilla|chapati|roti|paratha)\b/, "🫓"],
    [/\b(pretzel)\b/, "🥨"],
    [/\b(oat|oats|oatmeal|porridge|granola|muesli|cereal)\b/, "🥣"],
    [/\b(wheat|flour|barley|quinoa|millet|grain|couscous)\b/, "🌾"],

    /* nuts, seeds, fats */
    [/\b(peanut|almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|nut|nuts)\b/, "🥜"],
    [/\b(seed|seeds|sesame|sunflower|flax|chia)\b/, "🌻"],
    [/\bolives?\b/, "🫒"],

    /* drinks */
    [/\b(coffee|espresso|latte|cappuccino)\b/, "☕"],
    [/\b(tea|chai)\b/, "🍵"],
    [/\b(juice)\b/, "🧃"],
    [/\b(beer|ale|lager)\b/, "🍺"],
    [/\b(wine)\b/, "🍷"],
    [/\b(water|beverages?, water)\b/, "💧"],
    [/\b(soda|cola|soft drink|carbonated)\b/, "🥤"],
    [/\b(smoothie|shake|protein powder|whey|casein)\b/, "🥤"],

    /* seasoning */
    [/\b(salt)\b/, "🧂"],
    [/\b(sugar|syrup|molasses)\b/, "🍬"],
    [/\b(spice|herb|basil|oregano|thyme|cinnamon|pepper, black)\b/, "🌿"],
    [/\b(sauce|ketchup|mustard|mayonnaise|dressing|vinegar)\b/, "🥫"]
  ];

  /* Per-category floor, so a food that matches no keyword still gets something meaningful. */
  var CATEGORY_GLYPHS = {
    "Vegetables":"🥦", "Fruits":"🍎", "Grains & Cereals":"🌾", "Bread & Bakery":"🍞",
    "Rice":"🍚", "Pasta":"🍝", "Beans & Legumes":"🫘", "Nuts & Seeds":"🥜",
    "Dairy":"🥛", "Eggs":"🥚", "Chicken":"🍗", "Turkey":"🦃", "Beef":"🥩", "Pork":"🥓",
    "Game & Other Meats":"🍖", "Fish":"🐟", "Seafood":"🦐", "Oils & Fats":"🫒",
    "Spices & Herbs":"🌿", "Sauces & Condiments":"🥫", "Beverages":"🥤", "Desserts":"🍰",
    "Snacks":"🍿", "Fast Food":"🍔", "Soups":"🍲", "Meals & Entrees":"🍱",
    "Restaurant Foods":"🍽️", "Protein Supplements":"💪", "Indian Foods":"🍛",
    "Custom Foods":"✏️"
  };

  var GENERIC = "🍴";

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
    return '<span class="food-thumb" style="' + tint + px + '" aria-hidden="true">' + img.glyph + '</span>';
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
