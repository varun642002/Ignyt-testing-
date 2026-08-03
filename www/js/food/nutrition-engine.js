/* =========================================================
   IGNYT NUTRITION ENGINE — scaling, formatting and validation for a food serving

   Responsibilities are split deliberately:
     serving-converter.js   household measure -> grams   (how much food)
     nutrition-engine.js    grams -> nutrients           (what is in it)
   This module never touches the DOM or storage beyond the small serving-memory helper at
   the bottom, so every calculation here is testable in isolation.

   NULL IS NOT ZERO.
   USDA reports "not measured" and "measured as zero" differently, and the importer preserves
   that distinction. Butter, Stick, Salted has no protein figure at all; Salt, Table has a
   measured 0 g. Rendering both as "0 g" would invent a fact, so a missing value formats as
   an em dash and is excluded from any total. This is the single most important rule in this
   file — every function below is written to carry null through rather than coerce it.

   PERCENT DAILY VALUE uses the FDA 2016 adult reference values. Sugar deliberately has none:
   the 50 g DV is for ADDED sugars, while USDA's field is TOTAL sugars, so a percentage
   against it would compare two different quantities and read as far worse than reality for
   fruit and milk.
========================================================= */
(function () {
  "use strict";

  var SERVING_MEMORY_KEY = "hx_food_serving_memory";
  var SERVING_MEMORY_MAX = 60;      // per-food entries kept; bounded so storage cannot creep

  /* Guards against a quantity that would overflow the display or the log. 10 kg of one food
     in one entry is already absurd; beyond it the arithmetic stops being meaningful. */
  var MAX_GRAMS = 10000;
  var MAX_AMOUNT = 100000;

  /* The gram steps offered as one-tap presets. */
  var GRAM_PRESETS = [1, 5, 10, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000];

  /* Fractions offered for volume and countable units, where "half a cup" is how people
     actually measure. Grams get presets instead — nobody asks for a quarter of a gram. */
  var AMOUNT_FRACTIONS = [
    { value: 0.25, label: "¼" },
    { value: 0.5,  label: "½" },
    { value: 0.75, label: "¾" },
    { value: 1,    label: "1" },
    { value: 2,    label: "2" },
    { value: 3,    label: "3" }
  ];

  /* Display order matches a nutrition label: energy, macros, then minerals, then vitamins.
     `group` drives the section headings on the detail screen.

     Reference values are the FDA 2016 adult Daily Values. Two are deliberately matched to
     the basis the importer stores rather than the commoner unit:
       vitaminA  µg RAE, not IU — the IU conversion differs by the form of the vitamin, so a
                 percentage against a µg reference would be wrong.
       folate    µg DFE for the same reason.
     Sugar still has no DV: the 50 g figure covers ADDED sugars while USDA reports TOTAL
     sugars, so a percentage would compare two different quantities. */
  var NUTRIENTS = [
    { key: "calories",  label: "Calories",      unit: "kcal", decimals: 0, dv: 2000, major: true, group: "macro" },
    { key: "protein",   label: "Protein",       unit: "g",    decimals: 1, dv: 50,   major: true, group: "macro" },
    { key: "carbs",     label: "Carbohydrates", unit: "g",    decimals: 1, dv: 275,  major: true, group: "macro" },
    { key: "fat",       label: "Fat",           unit: "g",    decimals: 1, dv: 78,   major: true, group: "macro" },
    { key: "fibre",     label: "Fibre",         unit: "g",    decimals: 1, dv: 28,   group: "macro" },
    { key: "sugar",     label: "Sugar",         unit: "g",    decimals: 1, dv: null, group: "macro" },

    /* FAT BREAKDOWN. Its own section rather than more rows under Macronutrients, because
       these are components OF the fat figure above, not peers of it — a label indents them
       under Total Fat for the same reason. Reading "Fat 14 g" and "Saturated Fat 9 g" as two
       sibling rows invites adding them together.

       Trans fat has no Daily Value on purpose: the FDA sets no reference because the advice
       is "as low as possible", and a percentage against an invented target would imply an
       allowance that health authorities deliberately decline to give.

       Omega-3 and omega-6 use Adequate Intake figures (ALA 1.6 g, LA 17 g, adult male), which
       are not DVs. They are shown as percentages anyway because a reader wants proportion, but
       they are the only two rows here not on the FDA table. */
    { key: "saturatedFat",        label: "Saturated Fat",   unit: "g",  decimals: 1, dv: 20,   group: "fat" },
    { key: "monounsaturatedFat",  label: "Monounsaturated", unit: "g",  decimals: 1, dv: null, group: "fat" },
    { key: "polyunsaturatedFat",  label: "Polyunsaturated", unit: "g",  decimals: 1, dv: null, group: "fat" },
    { key: "transFat",            label: "Trans Fat",       unit: "g",  decimals: 1, dv: null, group: "fat" },
    { key: "omega3",              label: "Omega-3",         unit: "g",  decimals: 2, dv: 1.6,  group: "fat" },
    { key: "omega6",              label: "Omega-6",         unit: "g",  decimals: 1, dv: 17,   group: "fat" },
    /* Cholesterol is not a fat, but it travels with them on every label and in most people's
       heads, and it is the row they look for right after saturated fat. */
    { key: "cholesterol",         label: "Cholesterol",     unit: "mg", decimals: 0, dv: 300,  group: "fat" },

    { key: "sodium",     label: "Sodium",     unit: "mg", decimals: 0, dv: 2300, group: "mineral" },
    { key: "potassium",  label: "Potassium",  unit: "mg", decimals: 0, dv: 4700, group: "mineral" },
    { key: "calcium",    label: "Calcium",    unit: "mg", decimals: 0, dv: 1300, group: "mineral" },
    { key: "iron",       label: "Iron",       unit: "mg", decimals: 1, dv: 18,   group: "mineral" },
    { key: "magnesium",  label: "Magnesium",  unit: "mg", decimals: 0, dv: 420,  group: "mineral" },
    { key: "phosphorus", label: "Phosphorus", unit: "mg", decimals: 0, dv: 1250, group: "mineral" },
    { key: "zinc",       label: "Zinc",       unit: "mg", decimals: 1, dv: 11,   group: "mineral" },
    { key: "copper",     label: "Copper",     unit: "mg", decimals: 2, dv: 0.9,  group: "mineral" },
    { key: "manganese",  label: "Manganese",  unit: "mg", decimals: 2, dv: 2.3,  group: "mineral" },
    { key: "selenium",   label: "Selenium",   unit: "µg", decimals: 1, dv: 55,   group: "mineral" },

    { key: "vitaminA",    label: "Vitamin A",        unit: "µg", decimals: 0, dv: 900,  group: "vitamin" },
    { key: "vitaminC",    label: "Vitamin C",        unit: "mg", decimals: 1, dv: 90,   group: "vitamin" },
    { key: "vitaminD",    label: "Vitamin D",        unit: "µg", decimals: 1, dv: 20,   group: "vitamin" },
    { key: "vitaminE",    label: "Vitamin E",        unit: "mg", decimals: 1, dv: 15,   group: "vitamin" },
    { key: "vitaminK",    label: "Vitamin K",        unit: "µg", decimals: 1, dv: 120,  group: "vitamin" },
    { key: "thiamin",     label: "Thiamin (B1)",     unit: "mg", decimals: 2, dv: 1.2,  group: "vitamin" },
    { key: "riboflavin",  label: "Riboflavin (B2)",  unit: "mg", decimals: 2, dv: 1.3,  group: "vitamin" },
    { key: "niacin",      label: "Niacin (B3)",      unit: "mg", decimals: 1, dv: 16,   group: "vitamin" },
    { key: "pantothenic", label: "Pantothenic (B5)", unit: "mg", decimals: 2, dv: 5,    group: "vitamin" },
    { key: "vitaminB6",   label: "Vitamin B6",       unit: "mg", decimals: 2, dv: 1.7,  group: "vitamin" },
    { key: "folate",      label: "Folate",           unit: "µg", decimals: 0, dv: 400,  group: "vitamin" },
    { key: "vitaminB12",  label: "Vitamin B12",      unit: "µg", decimals: 1, dv: 2.4,  group: "vitamin" },
    /* B7. The catalogue carries it; the table did not, so it was being stored and silently
       dropped on the way to the screen. */
    { key: "biotin",      label: "Biotin (B7)",      unit: "µg", decimals: 1, dv: 30,   group: "vitamin" }
  ];

  var BY_KEY = {};
  NUTRIENTS.forEach(function (n) { BY_KEY[n.key] = n; });

  /* ---------------------------------------------------------
     Validation
  --------------------------------------------------------- */

  /**
   * Validates a quantity the user typed and resolves it to grams.
   * @param {object} food
   * @param {number|string} amount
   * @param {string} unit
   * @returns {{ok:boolean, grams:number, amount:number, unit:string, error:string|null}}
   */
  function validateQuantity(food, amount, unit) {
    var fail = function (msg) {
      return { ok: false, grams: 0, amount: 0, unit: unit || "g", error: msg };
    };

    var n = Number(amount);
    // Number("") is 0 and Number(" ") is 0, so an empty box must be rejected explicitly
    // rather than silently logging a zero-gram entry.
    if (amount === "" || amount === null || amount === undefined) return fail("Enter an amount.");
    if (!isFinite(n)) return fail("That isn't a number.");
    if (n < 0) return fail("Amount can't be negative.");
    if (n === 0) return fail("Amount must be more than zero.");
    if (n > MAX_AMOUNT) return fail("That amount is too large.");

    var u = unit || "g";
    var grams = n;
    if (u !== "g") {
      var conv = window.IgnytServingConverter;
      var g = conv ? conv.toGrams(food, n, u) : null;
      if (g == null || !isFinite(g) || g <= 0) return fail("That unit doesn't apply to this food.");
      grams = g;
    }

    if (grams > MAX_GRAMS) return fail("That works out to over " + MAX_GRAMS + " g.");

    return { ok: true, grams: Math.round(grams * 10) / 10, amount: n, unit: u, error: null };
  }

  /* ---------------------------------------------------------
     Calculation
  --------------------------------------------------------- */

  function scaleValue(raw, factor, decimals) {
    if (raw === null || raw === undefined) return null;      // absent stays absent
    var n = Number(raw);
    if (!isFinite(n)) return null;
    var f = Math.pow(10, decimals);
    return Math.round(n * factor * f) / f;
  }

  /**
   * Every retained nutrient, both per 100 g and for the requested amount.
   * One pass, no DOM, no allocation beyond the result — safe to call on every keystroke.
   * @returns {{grams:number, factor:number, rows:Array}}
   */
  function compute(food, grams) {
    var basis = (food && food.per) || 100;
    var g = Number(grams);
    if (!isFinite(g) || g <= 0) g = basis;
    var factor = g / basis;

    var rows = NUTRIENTS.map(function (n) {
      var raw = food ? food[n.key] : null;
      var per100 = scaleValue(raw, 1, n.decimals);
      var serving = scaleValue(raw, factor, n.decimals);
      return {
        key: n.key, label: n.label, unit: n.unit, major: !!n.major,
        group: n.group || "macro",   // carried through so callers can section the list
        per100: per100,
        serving: serving,
        percentDV: (n.dv && serving !== null) ? Math.round((serving / n.dv) * 100) : null,
        present: raw !== null && raw !== undefined
      };
    });

    return { grams: Math.round(g * 10) / 10, factor: factor, rows: rows };
  }

  /* The five fields the food log has always stored. Every existing entry has them, so they
     are always written as numbers. */
  var CORE_LOG_FIELDS = ["calories", "protein", "carbs", "fat", "fibre"];

  /* Micronutrients, added later. These are written only when the food actually has a value:
     an entry that omits `sodium` means "unknown for this food", which is different from
     "contains no sodium". Totals must therefore sum what is present and report coverage
     rather than pretending a missing field is a zero. Entries logged before this existed
     simply have none of these keys, which is the same case and needs no migration. */
  /* Deliberately still five, not twenty-eight. These are what the dashboard totals, and a
     total is only meaningful where most foods carry the value. Writing all 22 into every log
     entry would multiply the size of hx_food_log — the single largest thing this app keeps in
     localStorage — for figures nothing currently sums. The detail screen shows the full set
     computed live from the catalogue, which needs no per-entry storage at all. */
  var MICRO_LOG_FIELDS = ["sugar", "sodium", "potassium", "calcium", "iron"];

  /** The record shape the food log stores for one serving. */
  function logValues(food, grams) {
    var c = compute(food, grams);
    var out = { name: food.name, grams: c.grams };
    var byKey = {};
    c.rows.forEach(function (r) { byKey[r.key] = r; });

    CORE_LOG_FIELDS.forEach(function (k) {
      var row = byKey[k];
      // Null collapses to zero HERE and only here — at the boundary where a record is
      // written, never in the display path.
      out[k] = row && row.serving !== null ? row.serving : 0;
    });
    out.calories = Math.round(out.calories);

    MICRO_LOG_FIELDS.forEach(function (k) {
      var row = byKey[k];
      if (row && row.serving !== null) out[k] = row.serving;   // omitted when unmeasured
    });
    return out;
  }

  /**
   * Totals a set of logged entries.
   * @returns {{totals:object, coverage:object}} `coverage` is how many entries carried each
   *          micronutrient, so the UI can say a figure is a floor rather than a total.
   */
  function totalEntries(entries) {
    var totals = {};
    var coverage = {};
    var all = CORE_LOG_FIELDS.concat(MICRO_LOG_FIELDS);
    all.forEach(function (k) { totals[k] = 0; coverage[k] = 0; });

    (entries || []).forEach(function (e) {
      if (!e) return;
      all.forEach(function (k) {
        var v = e[k];
        if (v === null || v === undefined || v === "") return;
        var n = Number(v);
        if (!isFinite(n)) return;
        totals[k] += n;
        coverage[k]++;
      });
    });

    all.forEach(function (k) { totals[k] = Math.round(totals[k] * 10) / 10; });
    totals.calories = Math.round(totals.calories);
    return { totals: totals, coverage: coverage, count: (entries || []).length };
  }

  /* ---------------------------------------------------------
     Formatting
  --------------------------------------------------------- */

  var EM_DASH = "—";

  /** "31 g", "165 kcal", or an em dash when the nutrient was never measured. */
  function format(key, value) {
    var meta = BY_KEY[key];
    if (value === null || value === undefined) return EM_DASH;
    var n = Number(value);
    if (!isFinite(n)) return EM_DASH;
    var text = meta && meta.decimals === 0 ? String(Math.round(n)) : String(n);
    return meta ? text + " " + meta.unit : text;
  }

  /** A short human description of the chosen serving: "1 cup (140 g)" or "150 g". */
  function describeServing(food, amount, unit) {
    if (!unit || unit === "g") return (Math.round(Number(amount) * 10) / 10) + " g";
    var conv = window.IgnytServingConverter;
    var grams = conv ? conv.toGrams(food, amount, unit) : null;
    var label = conv ? conv.labelFor(unit, amount) : unit;
    var amountText = formatAmount(amount);
    return amountText + " " + label + (grams ? " (" + (Math.round(grams * 10) / 10) + " g)" : "");
  }

  /** Renders 0.25 as a fraction glyph so the serving row reads like a recipe. */
  function formatAmount(amount) {
    var n = Number(amount);
    for (var i = 0; i < AMOUNT_FRACTIONS.length; i++) {
      if (Math.abs(n - AMOUNT_FRACTIONS[i].value) < 0.001 && AMOUNT_FRACTIONS[i].value < 1) {
        return AMOUNT_FRACTIONS[i].label;
      }
    }
    return String(Math.round(n * 100) / 100);
  }

  /** One-line summary for sharing or a meal preview.
   *  Uses format() so an unmeasured nutrient shares as an em dash rather than "0g" — the
   *  same rule the detail table follows. Only logValues() collapses null to zero, because
   *  the stored record has always held numbers. */
  function summaryText(food, amount, unit) {
    var v = validateQuantity(food, amount, unit);
    var c = compute(food, v.ok ? v.grams : (food.per || 100));
    var cell = function (k) {
      var r = c.rows.find(function (x) { return x.key === k; });
      return format(k, r ? r.serving : null);
    };
    return food.name + " — " + describeServing(food, amount, unit) + "\n" +
      cell("calories") + " · P " + cell("protein") + " · C " + cell("carbs") +
      " · F " + cell("fat");
  }

  /* ---------------------------------------------------------
     Recent serving memory

     People log the same food the same way repeatedly. Remembering the last amount and unit
     per food turns a repeat entry into one tap. Bounded and best-effort: this is a
     convenience, so a storage failure must never block logging.
  --------------------------------------------------------- */

  function loadMemory() {
    try {
      var raw = JSON.parse(localStorage.getItem(SERVING_MEMORY_KEY) || "{}");
      return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
    } catch (e) { return {}; }
  }

  function rememberServing(foodId, amount, unit) {
    if (!foodId) return;
    try {
      var mem = loadMemory();
      mem[foodId] = { amount: Number(amount), unit: unit || "g", at: Date.now() };

      var keys = Object.keys(mem);
      if (keys.length > SERVING_MEMORY_MAX) {
        // Drop the least recently used, so the cap never evicts a food still in rotation.
        keys.sort(function (a, b) { return (mem[a].at || 0) - (mem[b].at || 0); })
          .slice(0, keys.length - SERVING_MEMORY_MAX)
          .forEach(function (k) { delete mem[k]; });
      }
      localStorage.setItem(SERVING_MEMORY_KEY, JSON.stringify(mem));
    } catch (e) { /* convenience only */ }
  }

  /** @returns {{amount:number, unit:string}|null} */
  function recallServing(foodId) {
    var mem = loadMemory();
    var hit = foodId ? mem[foodId] : null;
    if (!hit || !(Number(hit.amount) > 0)) return null;
    return { amount: Number(hit.amount), unit: hit.unit || "g" };
  }

  function clearServingMemory() {
    try { localStorage.removeItem(SERVING_MEMORY_KEY); } catch (e) { /* non-fatal */ }
  }

  window.IgnytNutrition = Object.freeze({
    NUTRIENTS: NUTRIENTS,
    GRAM_PRESETS: GRAM_PRESETS,
    AMOUNT_FRACTIONS: AMOUNT_FRACTIONS,
    MAX_GRAMS: MAX_GRAMS,
    SERVING_MEMORY_KEY: SERVING_MEMORY_KEY,

    CORE_LOG_FIELDS: CORE_LOG_FIELDS,
    MICRO_LOG_FIELDS: MICRO_LOG_FIELDS,

    validateQuantity: validateQuantity,
    compute: compute,
    logValues: logValues,
    totalEntries: totalEntries,

    format: format,
    formatAmount: formatAmount,
    describeServing: describeServing,
    summaryText: summaryText,

    rememberServing: rememberServing,
    recallServing: recallServing,
    clearServingMemory: clearServingMemory
  });
}());
