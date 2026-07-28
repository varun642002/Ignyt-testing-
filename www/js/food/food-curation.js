/* =========================================================
   IGNYT FOOD CURATION — a presentation layer over the full database

   The database keeps every record and every id. This decides what a food is CALLED, how
   findable it is, and where it ranks. Nothing is deleted and no id changes, so a meal logged
   two months ago still resolves to the same record and still re-scales correctly.

   THE PROBLEM IT SOLVES
   USDA names foods for a laboratory index, not for a person:
       Beans, Snap, Green, Canned, Regular Pack, Drained Solids
       Beverages, Protein Powder Whey Based
   Nobody searches for those. Worse, a search for "whey" returns thirty near-identical
   records and the useful one is not first.

   THREE MECHANISMS, IN ORDER OF HOW MUCH THEY CHANGE
     displayName   rewrites the label only — the record is untouched
     tier          decides ranking; a laboratory record sinks rather than disappearing
     hidden        keeps a record searchable but out of unfiltered results

   HIDING IS NOT DELETING. A hidden food still resolves by id, still scales, still appears
   if you search its exact name. It just does not clutter a browse. That distinction is the
   whole reason this is a layer rather than a cleanup script.
========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     Display names

     USDA's convention is "Head, qualifier, qualifier, preparation". The head noun is what
     someone recognises; the qualifiers are what distinguish it. So the rewrite keeps both
     but reorders them: "Beans, Snap, Green, Canned" -> "Green Snap Beans (Canned)".
  --------------------------------------------------------- */

  /* Qualifiers that belong in parentheses because they describe PREPARATION rather than the
     food itself. Order matters — the first match wins and becomes the parenthetical. */
  var PREPARATIONS = [
    "raw", "cooked", "boiled", "grilled", "roasted", "fried", "baked", "steamed",
    "canned", "frozen", "dried", "dehydrated", "smoked", "cured", "pickled",
    "unprepared", "prepared", "reconstituted"
  ];

  /* Noise USDA adds for its own indexing that means nothing to a user. */
  var NOISE = [
    /\bnfs\b/i, /\bnlea\b/i, /\bracc\b/i, /\bupc:?\s*\d+/i,
    /\ball types\b/i, /\bcommercially prepared\b/i, /\bwithout added\b[^,]*/i,
    /\bregular pack\b/i, /\bdrained solids\b/i, /\bsolids and liquids\b/i,
    /\bedible portion\b/i, /\bincluding refuse\b/i, /\bexcluding refuse\b/i,
    /\byield from\b[^,]*/i, /\bvalues? for\b[^,]*/i, /\bwith salt added\b/i,
    /\bwithout salt added\b/i, /\bunenriched\b/i, /\bindustrial\b/i
  ];

  /* Foods whose USDA name is beyond mechanical repair, or where the everyday word is simply
     different. Deliberately short — a hand-written map that tries to cover 7,697 foods is a
     map nobody maintains. */
  var NAME_OVERRIDES = {
    "beverages, protein powder whey based": "Whey Protein",
    "whey, sweet, fluid": "Sweet Whey",
    "whey, acid, fluid": "Acid Whey",
    "whey, sweet, dried": "Sweet Whey (Dried)",
    "whey, acid, dried": "Acid Whey (Dried)",
    "egg, whole, raw, fresh": "Egg",
    "egg, whole, cooked, hard-boiled": "Egg (Boiled)",
    "chicken, broilers or fryers, breast, meat only, raw": "Chicken Breast (Raw)",
    "chicken, broilers or fryers, breast, meat only, cooked, roasted": "Chicken Breast (Roasted)",
    "oil, olive, salad or cooking": "Olive Oil",
    "salt, table": "Salt",
    "salt, table, iodized": "Salt (Iodised)"
  };

  function titleCase(s) {
    return s.replace(/\b([a-z])([a-z''-]*)/gi, function (m, a, b) {
      return a.toUpperCase() + b.toLowerCase();
    });
  }

  /**
   * A consumer-friendly label. Never mutates the record — callers use it for display only,
   * so search over the original name keeps working.
   */
  function displayName(food) {
    var raw = String((food && food.name) || "").trim();
    if (!raw) return "";
    var key = raw.toLowerCase();
    if (NAME_OVERRIDES[key]) return NAME_OVERRIDES[key];

    /* USDA appends "(Includes Foods for USDA's Food Distribution Program)" and similar
       parentheticals to otherwise ordinary foods. They describe a distribution channel, not
       the food, so they go before anything else is parsed. */
    raw = raw.replace(/\s*\(includes[^)]*\)/gi, "").replace(/\s*\(usda[^)]*\)/gi, "").trim();

    var parts = raw.split(",").map(function (p) { return p.trim(); }).filter(Boolean);
    if (parts.length < 2) return raw;

    var head = parts[0];
    var rest = parts.slice(1);

    // Strip indexing noise.
    rest = rest.filter(function (p) {
      return !NOISE.some(function (re) { return re.test(p); });
    });

    // Split the remainder into preparation and description.
    var preps = [], descs = [];
    rest.forEach(function (p) {
      var low = p.toLowerCase();
      if (PREPARATIONS.some(function (k) { return low === k || low.indexOf(k) === 0; })) preps.push(p);
      else descs.push(p);
    });

    /* Descriptors move in front of the head noun, which is how English reads: "Beans, Snap,
       Green" is "Green Snap Beans".

       But only descriptors that work as ADJECTIVES. "Apples, Red Delicious, with Skin" was
       becoming "With Skin Red Delicious Apples", because a prepositional phrase cannot lead
       a noun. Anything starting with a preposition stays behind, in the parenthetical. */
    var leading = [], trailing = [];
    descs.forEach(function (d) {
      if (/^(with|without|in|from|as|for|including|plus)\b/i.test(d)) trailing.push(d);
      else leading.push(d);
    });

    var name = (leading.slice(0, 2).reverse().join(" ") + " " + head).trim();
    // Trailing phrases join the preparation note rather than being dropped — "with skin" is
    // a real distinction between two apple records.
    preps = trailing.concat(preps);
    name = titleCase(name.replace(/\s+/g, " "));

    if (preps.length) name += " (" + titleCase(preps.slice(0, 2).join(", ")) + ")";
    return name;
  }

  /* ---------------------------------------------------------
     Aliases

     Generated rather than hand-written, so a new import inherits them. The head noun on its
     own is the important one: it is what turns "Beans, Snap, Green, Canned" into a hit for
     "beans".
  --------------------------------------------------------- */
  var CURATED_ALIASES = {
    "chapati": ["roti", "phulka", "whole wheat roti"],
    "curd": ["yogurt", "yoghurt", "dahi"],
    "paneer": ["cottage cheese", "indian cheese"],
    "whey protein": ["protein powder", "whey", "protein shake"],
    "bengal gram": ["chana", "chickpea"],
    "green gram": ["moong", "mung bean"],
    "black gram": ["urad", "urad dal"],
    "red gram": ["toor", "arhar", "tur dal"],
    "clarified butter": ["ghee"],
    "flattened rice": ["poha"],
    "semolina": ["sooji", "rava"],
    "gram flour": ["besan"],
    "okra": ["bhindi", "ladyfinger"],
    "aubergine": ["brinjal", "eggplant"],
    "bottle gourd": ["lauki", "doodhi"],
    "bitter gourd": ["karela"],
    "fenugreek": ["methi"],
    "coriander": ["cilantro", "dhania"]
  };

  function aliasesFor(food) {
    var raw = String((food && food.name) || "");
    var out = [];
    var push = function (a) {
      var s = String(a || "").trim().toLowerCase();
      if (s && s.length > 2 && out.indexOf(s) === -1) out.push(s);
    };

    var parts = raw.split(",").map(function (p) { return p.trim(); });
    if (parts[0]) push(parts[0]);                       // the head noun alone
    push(displayName(food));

    // Curated aliases, matched on any word in the name.
    var low = raw.toLowerCase();
    Object.keys(CURATED_ALIASES).forEach(function (k) {
      if (low.indexOf(k) !== -1) CURATED_ALIASES[k].forEach(push);
    });
    return out;
  }

  /* ---------------------------------------------------------
     Common foods

     The tier that decides whether search feels curated. These are matched against the
     catalogue at runtime rather than duplicated as records, so there is one copy of the
     nutrition and no second database to keep in step.
  --------------------------------------------------------- */
  var COMMON_FOODS = [
    "apple", "banana", "orange", "mango", "grapes", "watermelon", "papaya", "pomegranate",
    "chicken breast", "chicken thigh", "egg", "salmon", "tuna", "prawn", "mutton",
    "milk", "curd", "yogurt", "paneer", "cheese", "butter", "ghee",
    "rice", "brown rice", "chapati", "roti", "bread", "oats", "poha", "upma",
    "dal", "lentils", "chickpea", "rajma", "soybean", "tofu",
    "potato", "tomato", "onion", "spinach", "broccoli", "carrot", "cauliflower", "peas",
    "almond", "peanut", "walnut", "cashew", "peanut butter",
    "idli", "dosa", "sambar", "biryani", "pulao", "khichdi", "paratha",
    "whey protein", "protein powder", "coffee", "tea", "water",
    "olive oil", "coconut oil", "sugar", "honey", "salt"
  ];
  var COMMON_SET = {};
  COMMON_FOODS.forEach(function (f) { COMMON_SET[f] = 1; });

  /* ---------------------------------------------------------
     Tiers

     Lower number ranks higher. This is the ordering the brief asked for, expressed as a
     score search can add to its relevance calculation rather than as a hard sort — a bad
     text match in a good tier should still lose to an exact match in a worse one.
  --------------------------------------------------------- */
  var TIERS = {
    common: 1, verified: 2, ifct: 3, frequent: 4, favourite: 5,
    recent: 6, seed: 7, branded: 8, usda: 9, lab: 10
  };

  /* Records that read as laboratory or industrial rather than food. These are what sink to
     the bottom, and what hidden() keeps out of a browse. */
  /* MEASURED before trusting. The first version of this list hid 365 foods (4.6%) and the
     sample was full of staples — peanut butter, pinto beans, ground beef, water, salt.
     Three rules were wrong and are gone:

       "food distribution"  57 hits, all from the parenthetical "(Includes Foods for USDA's
                            Food Distribution Program)" that USDA appends to ORDINARY foods.
                            It describes a distribution channel, not the food. Stripped as
                            noise in displayName() instead.
       "unprepared"         93 hits including "Veggie Burgers, Unprepared" — a real food
                            somebody can eat and log.
       "alaska native"      108 hits of genuine traditional foods. Nothing lab about them.

     What is left is only what is truly not a food someone eats. */
  var LAB_PATTERNS = [
    /\b0%?\s*moisture\b/i,          // analytical dry-matter rows
    /\bindustrial\b/i,              // industrial-grade oils and fats
    /\bformulated\b/i,              // formulated bar/meal products indexed for research
    /\bschool lunch\b/i,            // programme-specific composite records
    /\bcommodity\b/i,
    /\binfant formula\b/i,
    /\bbaby food\b/i
  ];

  function isLab(food) {
    var n = String((food && food.name) || "");
    return LAB_PATTERNS.some(function (re) { return re.test(n); });
  }

  /** Incomplete means NO DATA, not zero.

      The first version treated "0 kcal and no macros" as incomplete and hid water, salt,
      diet cola and creatine — all foods people log every day, all genuinely zero. Zero is a
      measurement; absent is the thing worth hiding. So this now checks for the ABSENCE of
      every value, which is what an unusable record actually looks like. */
  function isIncomplete(food) {
    if (!food) return true;
    var fields = ["calories", "protein", "carbs", "fat"];
    return fields.every(function (k) { return food[k] === null || food[k] === undefined; });
  }

  /**
   * Hidden foods stay fully functional — they resolve by id, scale correctly and appear on
   * an exact-name search. They are simply kept out of unfiltered browsing.
   */
  function hidden(food) {
    return isLab(food) || isIncomplete(food);
  }

  /**
   * @param {object} food
   * @param {object} ctx { frequentNames:Set, favouriteNames:Set, recentNames:Set }
   * @returns {{tier:string, rank:number, boost:number}}
   */
  function tierOf(food, ctx) {
    var c = ctx || {};
    var name = String((food && food.name) || "").toLowerCase();
    var display = displayName(food).toLowerCase();
    var tier;

    if (COMMON_SET[name] || COMMON_SET[display]) tier = "common";
    else if (c.favouriteNames && c.favouriteNames[name]) tier = "favourite";
    else if (c.frequentNames && c.frequentNames[name]) tier = "frequent";
    else if (c.recentNames && c.recentNames[name]) tier = "recent";
    else if (food && food.source === "ifct") tier = "ifct";
    else if (food && food.verified) tier = "verified";
    else if (food && food.source === "seed") tier = "seed";
    else if (food && food.brand) tier = "branded";
    else if (isLab(food)) tier = "lab";
    else tier = "usda";

    var rank = TIERS[tier];
    // Turned into a search boost: tier 1 is worth 180, tier 10 is worth -90. Large enough
    // to lead among comparable matches, small enough that an exact name match still wins.
    return { tier: tier, rank: rank, boost: Math.round((5.5 - rank) * 40) };
  }

  /* ---------------------------------------------------------
     Variant grouping

     "whey" should return Whey Protein once, not thirty times. Foods are grouped by their
     display name with the parenthetical preparation stripped, so preparations that genuinely
     differ nutritionally stay separate — Chicken Breast (Raw) and (Roasted) are two groups,
     not one.
  --------------------------------------------------------- */
  /* ---------------------------------------------------------
     Canonical names

     Grouping by display name only merges records that differ by preparation, which left
     "apple" showing Red Delicious, Granny Smith, Gala and Fuji as four separate results.
     They are the same food to anyone logging breakfast.

     A canonical rule says "everything matching this pattern is the same food, called this".
     Order matters: DERIVED products are listed before the base ingredient, so Apple Juice
     and Apple Pie claim their records before the plain /apple/ rule can.

     Each rule may carry a `notIf` guard for the cases a keyword alone gets wrong.
  --------------------------------------------------------- */
  var CANONICAL_RULES = [
    /* --- derived products first --- */
    [/\bapple\s*(juice|cider)\b|\bjuice.*apple\b/i, "Apple Juice"],
    [/\bapple\s*sauce\b|\bapplesauce\b/i, "Apple Sauce"],
    [/\bapple\b.*\bpie\b|\bpie\b.*\bapple\b/i, "Apple Pie"],
    [/\bapples?\b.*\bdried\b|\bdried\b.*\bapples?\b/i, "Dried Apple"],
    [/\bbanana\b.*\b(chips|dried)\b/i, "Dried Banana"],
    [/\borange\s*juice\b/i, "Orange Juice"],

    /* --- eggs, by preparation, because the nutrition genuinely differs --- */
    [/\begg\b.*\b(hard-boiled|boiled)\b/i, "Boiled Egg"],
    [/\begg\b.*\bfried\b/i, "Fried Egg"],
    [/\begg\b.*\bscrambled\b/i, "Scrambled Egg"],
    [/\begg\b.*\bpoached\b/i, "Poached Egg"],
    [/\begg\b.*\bwhite\b/i, "Egg White"],
    [/\begg\b.*\byolk\b/i, "Egg Yolk"],
    [/^eggs?,\s*(whole|grade)\b/i, "Egg"],

    /* --- chicken, by cut then preparation --- */
    [/\bchicken\b.*\bbreast\b.*\b(roasted|cooked|grilled)\b/i, "Chicken Breast (Cooked)"],
    [/\bchicken\b.*\bbreast\b/i, "Chicken Breast"],
    [/\bchicken\b.*\bthigh\b/i, "Chicken Thigh"],
    [/\bchicken\b.*\b(wing|wings)\b/i, "Chicken Wings"],
    [/\bchicken\b.*\bdrumstick\b/i, "Chicken Drumstick"],
    [/\bchicken\b.*\b(curry|masala|tikka)\b/i, "Chicken Curry"],
    [/\bchicken\b.*\bbiryani\b/i, "Chicken Biryani"],

    /* --- rice --- */
    [/\brice\b.*\bbrown\b|\bbrown\b.*\brice\b/i, "Brown Rice"],
    [/\bbasmati\b/i, "Basmati Rice"],
    [/\bjasmine\b.*\brice\b/i, "Jasmine Rice"],
    [/\brice\b.*\bwhite\b.*\bcooked\b|\bwhite\b.*\brice\b.*\bcooked\b/i, "White Rice (Cooked)"],
    [/\brice\b.*\bwhite\b/i, "White Rice"],

    /* --- milk. Plant milks first, or /milk/ would swallow them. --- */
    [/\balmond\b.*\bmilk\b/i, "Almond Milk"],
    [/\bsoy\b.*\bmilk\b/i, "Soy Milk"],
    [/\boat\b.*\bmilk\b/i, "Oat Milk"],
    [/\bcoconut\b.*\bmilk\b/i, "Coconut Milk"],
    [/\bbuffalo\b.*\bmilk\b/i, "Buffalo Milk"],
    [/\bmilk\b.*\b(skim|nonfat|fat free)\b/i, "Skim Milk"],
    [/\bmilk\b.*\b(lowfat|low fat|1%|2%)\b/i, "Low Fat Milk"],
    [/\bmilk\b.*\bwhole\b|\bwhole\b.*\bmilk\b/i, "Whole Milk"],

    /* --- protein supplements --- */
    [/\bwhey\b.*\bisolate\b|\bisolate\b.*\bwhey\b/i, "Whey Isolate"],
    [/\bwhey\b.*\bconcentrate\b/i, "Whey Concentrate"],
    [/\bwhey\b.*\bhydroly/i, "Hydrolysed Whey"],
    [/\bwhey\b.*\bprotein\b|\bprotein\b.*\bwhey\b/i, "Whey Protein"],
    [/\bcasein\b/i, "Casein Protein"],

    /* --- base ingredients, last --- */
    [/^apples?\b/i, "Apple"],
    [/^bananas?\b/i, "Banana"],
    [/^oranges?\b/i, "Orange"],
    [/^grapes?\b/i, "Grapes"],
    [/^strawberr/i, "Strawberries"],
    [/^potatoes?\b/i, "Potato"],
    [/^tomatoes?\b/i, "Tomato"],
    [/^onions?\b/i, "Onion"],
    [/^carrots?\b/i, "Carrot"],
    [/^broccoli\b/i, "Broccoli"],
    [/^spinach\b/i, "Spinach"]
  ];

  /** @returns {string|null} the canonical name for a food, or null if no rule claims it. */
  function canonicalFor(food) {
    var n = String((food && food.name) || "");
    if (!n) return null;
    for (var i = 0; i < CANONICAL_RULES.length; i++) {
      var r = CANONICAL_RULES[i];
      if (r[0].test(n) && !(r[2] && r[2].test(n))) return r[1];
    }
    return null;
  }

  /* An earlier version appended a calorie band to the key as a safety guard. It backfired:
     milk spans 34-61 kcal across fat levels, so one canonical name fragmented into four
     groups all labelled "Whole Milk" — visibly worse than no grouping at all.

     The guard was solving a problem the RULES already solve. Apple Pie, Apple Juice and
     Dried Apple each have their own rule and are matched before the plain /apple/ rule can
     claim them, so nothing wildly different reaches the same canonical name in the first
     place. Separation belongs in the rules, where it is explicit and reviewable, not in an
     arithmetic band that splits legitimate groups as a side effect. */

  /**
   * The grouping key.
   *
   * A canonical name wins where a rule claims the food; otherwise it falls back to the
   * previous behaviour (display name minus preparation), so foods no rule covers group
   * exactly as they did before.
   *
   * One canonical name plus one PREPARATION STATE is one group.
   *
   * The state is what stops raw and cooked merging. Measured without it: fresh apple (52)
   * absorbed dehydrated apple (346), raw brown rice (368) absorbed cooked (112), and apple
   * juice (46) absorbed frozen concentrate (166). All three are exactly what the brief says
   * must stay separate, because the nutrition per 100 g genuinely differs.
   *
   * A semantic separator rather than an arithmetic one. An earlier version used calorie
   * bands and fragmented milk into four groups all labelled "Whole Milk" — the band split
   * things that were the same food, while letting through things that were not. State is
   * the property that actually matters.
   */
  var PREP_STATES = [
    [/\b(dehydrated|freeze[- ]dried|dried)\b/i, "dried"],
    [/\b(concentrate|undiluted)\b/i, "concentrate"],
    [/\b(cooked|boiled|roasted|grilled|fried|baked|steamed|stewed|braised)\b/i, "cooked"],
    [/\b(canned|tinned)\b/i, "canned"],
    [/\b(frozen)\b/i, "frozen"],
    [/\b(powder|powdered)\b/i, "powder"],
    [/\b(raw|fresh|uncooked)\b/i, "raw"]
  ];

  function preparationState(food) {
    var n = String((food && food.name) || "");
    for (var i = 0; i < PREP_STATES.length; i++) {
      if (PREP_STATES[i][0].test(n)) return PREP_STATES[i][1];
    }
    return "";
  }

  function groupKey(food) {
    var canon = canonicalFor(food);
    if (!canon) return displayName(food).replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
    var state = preparationState(food);
    /* Canonical names that already NAME their state ("White Rice (Cooked)", "Boiled Egg")
       must not have it appended twice, or the same food splits into two groups. */
    if (state && canon.toLowerCase().indexOf(state) !== -1) state = "";
    return canon.toLowerCase() + (state ? "|" + state : "");
  }

  /** The label for a group. The preparation state is shown when it distinguishes this group
   *  from another with the same canonical name — "Brown Rice" and "Brown Rice (Cooked)" are
   *  two rows, and the user needs to be able to tell which is which. */
  function groupLabel(food) {
    var canon = canonicalFor(food);
    if (!canon) return displayName(food).replace(/\s*\([^)]*\)\s*$/, "").trim();
    var state = preparationState(food);
    if (!state || canon.toLowerCase().indexOf(state) !== -1) return canon;
    return canon + " (" + state.charAt(0).toUpperCase() + state.slice(1) + ")";
  }

  /**
   * @param {Array} foods already ranked, best first
   * @returns {Array<{lead:object, variants:Array, key:string}>}
   */
  function groupVariants(foods) {
    var order = [], byKey = Object.create(null);
    (foods || []).forEach(function (f) {
      var k = groupKey(f);
      if (!byKey[k]) { byKey[k] = { key: k, lead: f, variants: [] }; order.push(byKey[k]); }
      else byKey[k].variants.push(f);
    });
    return order;
  }

  window.IgnytFoodCuration = Object.freeze({
    displayName: displayName,
    aliasesFor: aliasesFor,
    tierOf: tierOf,
    hidden: hidden,
    isLab: isLab,
    isIncomplete: isIncomplete,
    groupVariants: groupVariants,
    groupKey: groupKey,
    groupLabel: groupLabel,
    canonicalFor: canonicalFor,
    CANONICAL_RULES: CANONICAL_RULES,
    COMMON_FOODS: COMMON_FOODS,
    TIERS: TIERS
  });
}());
