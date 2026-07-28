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

     A rule is [pattern, name, notIf, headMust]:
       notIf     a guard for the cases a keyword alone gets wrong
       headMust  the food's HEAD NOUN must also match this

     headMust exists because a keyword can appear in a USDA name as an INGREDIENT rather than
     as the food. Measured, without it, "Whole Milk" claimed 30 records that are not milk:
     ricotta and mozzarella (made FROM whole milk), Greek yogurt, eighteen puddings and
     custards, mashed potatoes, and an M&M's bar. Before the merge guard existed they were all
     folded into one row labelled "Whole Milk" — tapping it logged buttermilk and expanding it
     offered mashed potato as a variant of milk.

     Two things separate a food from its ingredients, and both are USDA conventions rather
     than guesses about English:

       subjectOf   drops "prepared with X", "made from X", "X added" — clauses that name what
                   went INTO the food. What a pudding was made with is not what it is.
       headOf      takes the first comma segment, because USDA writes "Head, qualifier,
                   qualifier". "Cheese, Ricotta, Whole Milk" is a cheese. Container words
                   like "Beverages" and "Snacks" are not foods, so those absorb the segment
                   after them.
  --------------------------------------------------------- */

  /* Heads that classify rather than name — the food is in the next segment. */
  var GENERIC_HEADS = /^(beverages?|snacks?|fast\s+foods?|restaurant\s+foods?|meals?\s+entrees?[^,]*|cereals?[^,]*|candies|sweets|soups?|sauces?|desserts?|toppings?|frozen\s+novelties|nuts|seeds|spices|puddings?|alcoholic\s+beverages?|baby\s*food)$/i;

  /** The part of a USDA name that says what the food IS. */
  function subjectOf(name) {
    var s = String(name || "").replace(/\s*\([^)]*\)/g, " ");
    // "…, prepared with whole milk" — an ingredient list, not the food.
    s = s.replace(/,?\s*\b(prepared|made|reconstituted|mixed|diluted|packed|topped|filled|served)\s+(with|from|in)\b.*$/i, "");
    // "…, with added ascorbic acid", "…, whole milk and butter added"
    s = s.replace(/,?\s*\bwith\s+[^,]*\badded\b.*$/i, "");
    s = s.replace(/,?\s*\b[\w\s%'-]*\badded\s*$/i, "");
    return s.replace(/\s+/g, " ").trim();
  }

  /** The head noun of a subject, absorbing a generic classifier if that is all it is. */
  function headOf(subject) {
    var parts = String(subject || "").split(",").map(function (p) { return p.trim(); }).filter(Boolean);
    if (!parts.length) return String(subject || "");
    var head = parts[0];
    if (GENERIC_HEADS.test(head) && parts[1]) head += ", " + parts[1];
    return head;
  }

  /* Heads that count as milk. Plant milks reach it through the "Beverages, Almond Milk"
     absorption above. */
  var HEAD_MILK = /\bmilk\b|\bbuttermilk\b|\bcream\b/i;
  var HEAD_EGG = /\begg/i;

  var CANONICAL_RULES = [
    /* --- derived products first --- */
    [/\bapple\s*(juice|cider)\b|\bjuice.*apple\b/i, "Apple Juice"],
    [/\bapple\s*sauce\b|\bapplesauce\b/i, "Apple Sauce"],
    [/\bapple\b.*\bpie\b|\bpie\b.*\bapple\b/i, "Apple Pie"],
    [/\bapples?\b.*\bdried\b|\bdried\b.*\bapples?\b/i, "Dried Apple"],
    [/\bbanana\b.*\b(chips|dried)\b/i, "Dried Banana"],
    [/\borange\s*juice\b/i, "Orange Juice"],

    /* --- eggs, by preparation, because the nutrition genuinely differs.
           `eggs?` rather than `egg`: USDA writes both "Egg, whole, …" and "Eggs, Grade A, …",
           and \begg\b silently missed every plural. --- */
    [/\beggs?\b.*\b(hard-boiled|boiled)\b/i, "Boiled Egg", null, HEAD_EGG],
    [/\beggs?\b.*\bfried\b/i, "Fried Egg", null, HEAD_EGG],
    [/\beggs?\b.*\b(scrambled|omelet|omelette)\b/i, "Scrambled Egg", null, HEAD_EGG],
    [/\beggs?\b.*\bpoached\b/i, "Poached Egg", null, HEAD_EGG],
    [/\beggs?\b.*\bwhite\b/i, "Egg White", null, HEAD_EGG],
    [/\beggs?\b.*\byolk\b/i, "Egg Yolk", null, HEAD_EGG],
    [/^eggs?,\s*(whole|grade|fresh|raw)\b/i, "Egg"],
    [/^whole eggs?$/i, "Egg"],

    /* --- chicken, by cut. NOT by preparation: the state is derived separately, and a
           canonical name that also spelled it out produced the same food under two keys. --- */
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
    [/\brice\b.*\bwhite\b/i, "White Rice"],

    /* --- milk. Plant milks first, or /milk/ would swallow them.
           Every rule is head-scoped: "Cheese, Ricotta, Whole Milk" is a cheese. --- */
    [/\balmond\b.*\bmilk\b/i, "Almond Milk", null, /\bmilk\b|\balmond\b/i],
    [/\bsoy\b.*\bmilk\b/i, "Soy Milk", null, /\bmilk\b|\bsoy\b/i],
    [/\boat\b.*\bmilk\b/i, "Oat Milk", null, /\bmilk\b|\boat\b/i],
    [/\bcoconut\b.*\bmilk\b/i, "Coconut Milk", null, /\bmilk\b|\bcoconut\b/i],
    [/\bbuffalo\b.*\bmilk\b/i, "Buffalo Milk", null, HEAD_MILK],
    [/\bmilk\b.*\b(skim|nonfat|fat free)\b|\b(skim|nonfat)\b.*\bmilk\b/i, "Skim Milk", null, HEAD_MILK],
    [/\bmilk\b.*\b(lowfat|low fat|1%|2%)\b|\b(lowfat|low fat)\b.*\bmilk\b/i, "Low Fat Milk", null, HEAD_MILK],
    [/\bmilk\b.*\bwhole\b|\bwhole\b.*\bmilk\b/i, "Whole Milk", null, HEAD_MILK],

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
    var subject = subjectOf(n);
    if (!subject) return null;
    var head = headOf(subject);
    for (var i = 0; i < CANONICAL_RULES.length; i++) {
      var r = CANONICAL_RULES[i];
      if (!r[0].test(subject)) continue;
      if (r[2] && r[2].test(subject)) continue;      // notIf
      if (r[3] && !r[3].test(head)) continue;        // headMust
      return r[1];
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
  /* PREPARATION STATE — four bugs were traced to this table and all four were the same
     mistake in different clothes: it treated state as a single value chosen by whichever
     pattern happened to be listed first.

       BUG 1  /concentrate|undiluted/ matched BOTH the frozen concentrate (166 kcal) and the
              ready-to-drink juice made "from concentrate" (47). Opposite things sharing a
              keyword. Ready-to-drink phrasings are now matched first and carry no state,
              because reconstituted juice is just juice.

       BUG 2  "Apples, Dried, Sulfured, Stewed" is BOTH cooked and dried. Returning the first
              match filed it with plain dried apple at three times its calories. A food can
              be in more than one state, so every match is collected.

       BUG 3  "prepared" was absent from the cooked pattern, so "Long-Grain White Rice
              (Prepared)" at 124 kcal grouped with raw rice at 380.

       BUG 4  "Chicken Breast (Cooked)" appeared as two rows — one from a canonical rule that
              spelled the state into the name, one from the state being appended. Canonical
              names no longer name states; there is one source for it.

     COOKING METHOD IS PART OF THE STATE. The brief is explicit that boiled must not merge
     with fried, nor grilled with roasted, and it is right: chicken breast is 187 kcal fried
     and 151 boiled. So each method is its own state and the generic "cooked" applies only
     when no method is named — USDA writes "cooked, roasted", and the method is the useful
     half. */

  /* Phrasings that look like a state but are not one. Checked first; they claim the name and
     stop the real patterns from seeing it. */
  var STATE_EXEMPT = [
    /\bfrom concentrate\b/i,          // reconstituted — this is the drink, not the syrup
    /\breconstituted\b/i,
    /\bdiluted\b(?!.*\bundiluted\b)/i,
    /\bready[- ]to[- ]drink\b/i
  ];

  var COOK_METHODS = [
    [/\b(deep[- ]fried|pan[- ]fried|stir[- ]fried|fried)\b/i, "fried"],
    [/\b(roasted|oven[- ]roasted|roast)\b/i, "roasted"],
    [/\b(grilled|broiled|barbecued|barbequed|tandoori)\b/i, "grilled"],
    [/\bpoached\b/i, "poached"],
    [/\b(hard[- ]boiled|soft[- ]boiled|boiled|simmered)\b/i, "boiled"],
    [/\bbaked\b/i, "baked"],
    [/\bsteamed\b/i, "steamed"],
    [/\b(stewed|braised|curried)\b/i, "stewed"],
    [/\b(sauteed|sautéed)\b/i, "sauteed"],
    [/\bmicrowaved\b/i, "microwaved"],
    [/\b(scrambled|omelet|omelette)\b/i, "scrambled"]
  ];

  /* Everything that is not a cooking method. `dried` before `cooked` is deliberate but no
     longer load-bearing — every match is kept, so order only affects how the label reads. */
  var PREP_STATES = [
    [/\b(concentrate|undiluted)\b/i, "concentrate"],
    [/\b(dehydrated|freeze[- ]dried|sun[- ]dried|dried)\b/i, "dried"],
    [/\b(canned|tinned)\b/i, "canned"],
    [/\bfrozen\b/i, "frozen"],
    [/\b(powder|powdered)\b/i, "powder"],
    [/\b(smoked)\b/i, "smoked"],
    [/\b(raw|fresh|uncooked|unprepared)\b/i, "raw"]
  ];

  /* The generic. Only reached when no COOK_METHOD named the method.
     "Commercially prepared" is a manufacturing note, not a preparation — it appears on shelf
     bread and turned "Chapati or Roti, plain, commercially prepared" into "Chapati (Cooked)",
     which is both redundant and wrong about what distinguishes it. */
  var GENERIC_COOKED = /\b(cooked|prepared|home\s*recipe)\b/i;
  var NOT_COOKED = /\b(commercially|industrially|freshly)\s+prepared\b/i;

  /**
   * Every preparation state that applies to a food, joined with "+".
   * @returns {string} "" when the name says nothing about preparation.
   */
  function preparationState(food) {
    var n = String((food && food.name) || "");
    if (!n) return "";
    var exempt = STATE_EXEMPT.some(function (re) { return re.test(n); });

    var found = [];
    var add = function (s) { if (s && found.indexOf(s) === -1) found.push(s); };

    var method = null;
    for (var m = 0; m < COOK_METHODS.length; m++) {
      if (COOK_METHODS[m][0].test(n)) { method = COOK_METHODS[m][1]; break; }
    }
    if (method) add(method);
    else if (GENERIC_COOKED.test(n) && !NOT_COOKED.test(n)) add("cooked");

    for (var i = 0; i < PREP_STATES.length; i++) {
      if (exempt && PREP_STATES[i][1] === "concentrate") continue;   // "from concentrate"
      if (PREP_STATES[i][0].test(n)) add(PREP_STATES[i][1]);
    }

    /* "raw" alongside a cooking method is contradictory wording in the source name — USDA
       writes "meat and skin, raw" on records it then also marks cooked. The processing is
       the real state. */
    if (found.length > 1) found = found.filter(function (s) { return s !== "raw"; });
    return found.join("+");
  }

  /* The state that still needs SAYING, given what the canonical name already says. A rule
     named "Dried Apple" has already told the user it is dried; repeating it produces
     "Dried Apple (Dried)". Subtraction is per part, not on the whole string, so
     "Dried Apple" + "dried+stewed" correctly leaves "stewed" rather than matching nothing. */
  function residualState(food, canon) {
    var parts = preparationState(food).split("+").filter(Boolean);
    if (!canon) return parts;
    var lc = canon.toLowerCase();
    return parts.filter(function (p) { return lc.indexOf(p) === -1; });
  }

  function stateLabel(parts) {
    return parts.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(" & ");
  }

  /* The name a group is built around: the canonical one where a rule claims the food, and
     otherwise the display name with its preparation parenthetical removed — that parenthetical
     is exactly what the state mechanism is about to re-derive.

     Foods with no canonical rule used to stop there, which meant the state never applied to
     them: "Whey, Acid, Dried" (339 kcal) and "Whey, Acid, Fluid" (24) both reduced to
     "Acid Whey" and collided on one key. The state is a property of the FOOD, not of whether
     someone has written a naming rule for it. */
  function baseNameFor(food) {
    return canonicalFor(food) || displayName(food).replace(/\s*\([^)]*\)\s*$/, "").trim();
  }

  function groupKey(food) {
    var base = baseNameFor(food);
    var parts = residualState(food, base);
    return base.toLowerCase() + (parts.length ? "|" + parts.join("+") : "");
  }

  /** The label for a group. The preparation state is shown when it distinguishes this group
   *  from another with the same base name — "Brown Rice" and "Brown Rice (Boiled)" are two
   *  rows, and the user needs to be able to tell which is which. */
  function groupLabel(food) {
    var base = baseNameFor(food);
    var parts = residualState(food, base);
    return parts.length ? base + " (" + stateLabel(parts) + ")" : base;
  }

  /* ---------------------------------------------------------
     The merge guard

     A key says two records are the same FOOD in the same STATE. It cannot say they are the
     same PRODUCT: "Chicken Breast (Roasted)" legitimately covers both a roasted breast at
     197 kcal and a fat-free sliced deli roll at 79, and folding the second under the first
     would hide a different product behind a toggle showing the wrong numbers.

     Energy is the check because it is the one field every record has and the one the user is
     looking at. The tolerance is relative to the lead with an absolute floor, so a 12-vs-18
     kcal pair of lettuces is not split over 50%.

     Serving unit is deliberately NOT part of the guard. Every record in this database stores
     nutrition per 100 g and the serving calculator converts through grams, so a group holding
     both a "piece" portion and a "cup" portion differs in how it is *offered*, not in what it
     is. Gating on it would split 2,249 gram-portioned foods from 2,210 piece-portioned ones
     for no nutritional reason. Measured: 82 such groups, all benign.
  --------------------------------------------------------- */
  var ENERGY_TOL_PCT = 30;
  var ENERGY_TOL_ABS = 25;

  var SOURCE_LABELS = { usda: "USDA", ifct: "IFCT", seed: "IGNYT" };
  function sourceLabel(food) {
    if (food && food.brand) return String(food.brand);
    return SOURCE_LABELS[food && food.source] || "Other";
  }

  function mergeable(lead, food) {
    var a = lead && typeof lead.calories === "number" ? lead.calories : null;
    var b = food && typeof food.calories === "number" ? food.calories : null;
    if (a === null || b === null) return true;          // no basis to object
    var abs = Math.abs(a - b);
    if (abs <= ENERGY_TOL_ABS) return true;
    return (abs / Math.max(a, 1)) * 100 <= ENERGY_TOL_PCT;
  }

  /**
   * @param {Array} foods already ranked, best first
   * @returns {Array<{lead:object, variants:Array, key:string, label:string}>}
   */
  function groupVariants(foods) {
    var order = [], byKey = Object.create(null), usedLabels = Object.create(null);

    /* Two rows reading the same thing is the same defect whether it came from a canonical
       rule or from a split, so uniqueness is enforced once, here, over whatever the naming
       produced. A row the guard split off is by definition not the same product as the one
       it was split from, and its own name says so better than a numbered canonical does. */
    function claimLabel(preferred, food) {
      var candidates = [preferred, displayName(food), String(food && food.name || preferred)];
      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        if (c && !usedLabels[c.toLowerCase()]) { usedLabels[c.toLowerCase()] = 1; return c; }
      }
      return candidates[candidates.length - 1];
    }

    var byBase = Object.create(null);
    (foods || []).forEach(function (f) {
      var k = groupKey(f);
      var bucket = byKey[k] || (byKey[k] = []);

      var target = null;
      for (var i = 0; i < bucket.length; i++) {
        if (mergeable(bucket[i].lead, f)) { target = bucket[i]; break; }
      }
      if (target) { target.variants.push(f); return; }

      var base = baseNameFor(f);
      var g = {
        key: bucket.length ? k + "#" + bucket.length : k,
        lead: f,
        variants: [],
        base: base,
        split: bucket.length > 0
      };
      byBase[base.toLowerCase()] = (byBase[base.toLowerCase()] || 0) + 1;
      bucket.push(g);
      order.push(g);
    });

    /* Labels last, because whether a state needs saying depends on what else is on screen.
       "(Raw)" on the only banana pepper in the results tells the reader nothing — raw is what
       a banana pepper is unless something says otherwise. It stays on "Egg (Raw)" because
       "Egg (Dried)" is right underneath it and the two are 400 kcal apart.

       Only "raw" is ever dropped. A processing state is never implied by the food's name, so
       hiding "(Cooked)" from the only cooked oats on screen would leave 71 kcal sitting under
       a label the reader would read as the 379 kcal one. */
    order.forEach(function (g) {
      var preferred;
      if (g.split) {
        preferred = displayName(g.lead);
      } else {
        var parts = residualState(g.lead, g.base);
        var alone = byBase[g.base.toLowerCase()] === 1;
        if (alone && parts.length === 1 && parts[0] === "raw") parts = [];
        preferred = parts.length ? g.base + " (" + stateLabel(parts) + ")" : g.base;
      }
      g.label = claimLabel(preferred, g.lead);

      /* Variants need the same treatment inside their own group. displayName keeps only the
         first two descriptors, so "Chicken, Broiler, Rotisserie, BBQ, Breast, Meat Only" and
         "…, Meat and Skin" both reduce to "Rotisserie Broiler Chicken" — two rows reading
         identically, 31 kcal apart, with the words that told them apart discarded. Where the
         short name is already taken, the full USDA name is used: unlovely, but this is behind
         "View variants", which is exactly where the brief allows the raw naming to show. */
      var taken = Object.create(null);
      taken[g.label.toLowerCase()] = 1;
      g.labels = Object.create(null);
      g.labels[g.lead.id] = g.label;
      g.variants.forEach(function (v) {
        var short = displayName(v), full = String(v.name || short);
        var chosen = short && !taken[short.toLowerCase()] ? short : full;
        /* Last resort: the same food arriving from two datasets — a seed record called
           "Boiled Egg" and USDA's "Egg, Whole, Cooked, Hard-Boiled", both 155 kcal. No part
           of either NAME tells them apart, so the only honest distinguisher left is where the
           number came from. */
        if (taken[String(chosen).toLowerCase()]) chosen = full + " (" + sourceLabel(v) + ")";
        taken[String(chosen).toLowerCase()] = 1;
        g.labels[v.id] = chosen;
      });
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
    preparationState: preparationState,
    canonicalFor: canonicalFor,
    CANONICAL_RULES: CANONICAL_RULES,
    COMMON_FOODS: COMMON_FOODS,
    TIERS: TIERS
  });
}());
