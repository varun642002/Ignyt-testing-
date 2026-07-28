/* =========================================================
   IGNYT FOOD IMPORTER — normalise external datasets into the internal schema

   PURPOSE
   The bundled catalogue is deliberately small so the APK stays small. This module lets a
   user add more foods from a published dataset without the app shipping (or depending on)
   that dataset. Every source is normalised into the SAME per-100 g shape food-db.js uses,
   so search, the serving converter and the logging path need no knowledge of where a food
   came from.

   SUPPORTED SOURCES
     usda   — FoodData Central JSON (Foundation Foods / SR Legacy export)
     ifct   — Indian Food Composition Tables, as a flat JSON array
     off    — Open Food Facts product JSON (single product or a products array)
     ignyt  — this app's own export format, for moving foods between installs
   Format is auto-detected by shape, so the user picks a file rather than a source type.
   Adding a source later means adding one adapter here and nothing else.

   WHY NOT BUNDLE THE DATA
   USDA is public domain and Open Food Facts is ODbL, but both are hundreds of megabytes and
   carry attribution/share-alike obligations that differ per source. Importing at the user's
   request keeps the app free of redistribution questions and keeps the install small. The
   app never fetches these datasets itself -- the user supplies the file.

   STORAGE REALITY
   Imported foods live in localStorage (hx_imported_foods) alongside the rest of the app's
   data. localStorage is a few megabytes, NOT unbounded, so the importer enforces a hard cap
   and reports honestly when a dataset is truncated rather than silently dropping rows or
   blowing the quota. Roughly 4,000 foods fit comfortably; the cap is set below that.

   Every function here is pure apart from the explicit save step, so the parsing and
   normalisation can be tested without touching storage.
========================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "hx_imported_foods";
  var MAX_IMPORTED = 3000;      // hard cap -- see STORAGE REALITY above
  var MAX_NAME_LEN = 120;

  /* ---------- shared helpers ---------- */

  function num(v) {
    var n = Number(v);
    return isFinite(n) && n >= 0 ? n : 0;
  }
  function cleanName(v) {
    var s = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
    return s.length > MAX_NAME_LEN ? s.slice(0, MAX_NAME_LEN) : s;
  }

  /** A normalised food. `per: 100` is what makes it interchangeable with seed foods. */
  function makeFood(name, category, kcal, protein, carbs, fat, fibre, source) {
    return {
      name: cleanName(name),
      category: category || "Custom Foods",
      per: 100,
      calories: Math.round(num(kcal)),
      protein: Math.round(num(protein) * 10) / 10,
      carbs: Math.round(num(carbs) * 10) / 10,
      fat: Math.round(num(fat) * 10) / 10,
      fibre: Math.round(num(fibre) * 10) / 10,
      source: source || "import"
    };
  }

  /** A food is worth keeping only if it has a name and at least one non-zero macro --
   *  a row of all zeros is almost always a parse failure, not a real zero-calorie food. */
  function isUsable(f) {
    if (!f || !f.name) return false;
    return (f.calories + f.protein + f.carbs + f.fat + f.fibre) > 0;
  }

  /* ---------- source adapters ---------- */

  /* USDA FoodData Central: nutrients live in a foodNutrients[] array keyed by nutrient
     number (208 kcal, 203 protein, 205 carbs, 204 fat, 291 fibre). Values are already
     per 100 g in Foundation/SR Legacy exports. Both the older `nutrient.number` and the
     newer flattened `nutrientNumber` layouts appear in real exports, so both are read. */
  var USDA_CODES = { kcal: "208", protein: "203", carbs: "205", fat: "204", fibre: "291" };

  function usdaValue(item, code) {
    var arr = item.foodNutrients || [];
    for (var i = 0; i < arr.length; i++) {
      var n = arr[i];
      var numCode = (n.nutrient && (n.nutrient.number || n.nutrient.nutrientNumber)) ||
                    n.nutrientNumber || (n.nutrientId != null ? String(n.nutrientId) : null);
      if (String(numCode) === code) {
        var v = (n.amount != null) ? n.amount : n.value;
        if (v != null) return v;
      }
    }
    return 0;
  }

  function fromUSDA(json) {
    var items = Array.isArray(json) ? json
      : (json.FoundationFoods || json.SRLegacyFoods || json.foods || json.items || []);
    return items.map(function (it) {
      return makeFood(
        it.description || it.foodDescription || it.name,
        it.foodCategory && (it.foodCategory.description || it.foodCategory) || "Custom Foods",
        usdaValue(it, USDA_CODES.kcal), usdaValue(it, USDA_CODES.protein),
        usdaValue(it, USDA_CODES.carbs), usdaValue(it, USDA_CODES.fat),
        usdaValue(it, USDA_CODES.fibre), "usda"
      );
    });
  }

  /* IFCT: published as a flat table. Column naming varies between releases, so each field
     accepts the handful of spellings actually seen rather than one rigid key. */
  function pick(o) {
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (o[k] != null && o[k] !== "") return o[k];
    }
    return 0;
  }
  function fromIFCT(json) {
    var items = Array.isArray(json) ? json : (json.foods || json.items || []);
    return items.map(function (it) {
      return makeFood(
        pick(it, "name", "food_name", "foodName", "Food Name", "description"),
        pick(it, "category", "food_group", "foodGroup", "Food Group") || "Indian Foods",
        pick(it, "energy_kcal", "energy", "kcal", "calories", "Energy"),
        pick(it, "protein", "protein_g", "Protein"),
        pick(it, "carbohydrate", "carbs", "carbohydrate_g", "Carbohydrate"),
        pick(it, "fat", "fat_g", "Fat", "total_fat"),
        pick(it, "fibre", "fiber", "fibre_g", "Fibre", "dietary_fibre"),
        "ifct"
      );
    });
  }

  /* Open Food Facts: nutriments are already per 100 g under *_100g keys. Energy may be
     given only in kJ, which is converted (1 kcal = 4.184 kJ). */
  function fromOFF(json) {
    var items = Array.isArray(json) ? json
      : (json.products || (json.product ? [json.product] : []));
    return items.map(function (p) {
      var n = p.nutriments || {};
      var kcal = n["energy-kcal_100g"];
      if (kcal == null && n["energy_100g"] != null) kcal = Number(n["energy_100g"]) / 4.184;
      var name = p.product_name || p.generic_name || p.product_name_en;
      if (p.brands && name) name = name + " (" + String(p.brands).split(",")[0].trim() + ")";
      return makeFood(
        name,
        (p.categories && String(p.categories).split(",")[0].trim()) || "Custom Foods",
        kcal, n["proteins_100g"], n["carbohydrates_100g"], n["fat_100g"], n["fiber_100g"],
        "off"
      );
    });
  }

  /* This app's own export -- already normalised, so it only needs re-validating. */
  function fromIgnyt(json) {
    var items = Array.isArray(json) ? json : (json.foods || []);
    return items.map(function (f) {
      return makeFood(f.name, f.category, f.calories, f.protein, f.carbs, f.fat, f.fibre,
        f.source || "import");
    });
  }

  /** Detects which adapter a parsed JSON payload needs. */
  function detectFormat(json) {
    if (!json || typeof json !== "object") return null;
    if (json.app === "ignyt" && (json.type === "food-export" || json.foods)) return "ignyt";
    if (json.FoundationFoods || json.SRLegacyFoods) return "usda";
    if (json.products || json.product) return "off";
    var sample = Array.isArray(json) ? json[0] : (json.foods || json.items || [])[0];
    if (!sample || typeof sample !== "object") return null;
    if (sample.foodNutrients) return "usda";
    if (sample.nutriments || sample.product_name) return "off";
    if (sample.per != null && sample.calories != null) return "ignyt";
    // Anything else with a recognisable name+energy pair is treated as an IFCT-style table.
    if (pick(sample, "name", "food_name", "foodName", "Food Name", "description")) return "ifct";
    return null;
  }

  var ADAPTERS = { usda: fromUSDA, ifct: fromIFCT, off: fromOFF, ignyt: fromIgnyt };

  /**
   * Parses raw file text into normalised foods WITHOUT saving.
   * @returns {{error?:string, format?:string, foods?:Array, total?:number,
   *            skipped?:number, truncated?:boolean}}
   */
  function parse(text) {
    var json;
    try { json = JSON.parse(text); }
    catch (e) { return { error: "That file isn't valid JSON." }; }

    var format = detectFormat(json);
    if (!format) return { error: "Unrecognised food dataset. Supported: USDA FoodData Central, IFCT, Open Food Facts, or an IGNYT food export." };

    var raw;
    try { raw = ADAPTERS[format](json) || []; }
    catch (e) { return { error: "Could not read this " + format.toUpperCase() + " file — it may be an unexpected variant." }; }

    var usable = raw.filter(isUsable);
    // De-duplicate within the file itself; the last occurrence wins.
    var byName = {};
    usable.forEach(function (f) { byName[f.name.toLowerCase()] = f; });
    var deduped = Object.keys(byName).map(function (k) { return byName[k]; });

    var truncated = deduped.length > MAX_IMPORTED;
    return {
      format: format,
      foods: truncated ? deduped.slice(0, MAX_IMPORTED) : deduped,
      total: raw.length,
      skipped: raw.length - deduped.length,
      truncated: truncated
    };
  }

  /* ---------- storage ---------- */

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }

  /**
   * Merges parsed foods into storage. Existing entries with the same name are replaced, so
   * re-importing an updated dataset refreshes rather than duplicates.
   * @returns {{added:number, updated:number, stored:number, error?:string}}
   */
  function save(foods) {
    var existing = load();
    var index = {};
    existing.forEach(function (f, i) { index[String(f.name).toLowerCase()] = i; });

    var added = 0, updated = 0;
    foods.forEach(function (f) {
      var k = f.name.toLowerCase();
      if (index[k] != null) { existing[index[k]] = f; updated++; }
      else { index[k] = existing.length; existing.push(f); added++; }
    });

    if (existing.length > MAX_IMPORTED) existing = existing.slice(0, MAX_IMPORTED);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      // Quota exceeded: leave whatever was already stored intact rather than half-writing.
      return { added: 0, updated: 0, stored: load().length,
        error: "Not enough storage space for this import. Try a smaller dataset." };
    }
    return { added: added, updated: updated, stored: existing.length };
  }

  function clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* non-fatal */ }
  }

  /** Imported foods in catalogue shape, for the search index to merge in. */
  function catalogue() {
    return load().map(function (f, i) {
      return {
        id: "imp:" + i, name: f.name, category: f.category || "Custom Foods", per: 100,
        calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs),
        fat: num(f.fat), fibre: num(f.fibre), source: f.source || "import"
      };
    });
  }

  window.IgnytFoodImporter = Object.freeze({
    STORAGE_KEY: STORAGE_KEY,
    MAX_IMPORTED: MAX_IMPORTED,
    parse: parse,
    save: save,
    clear: clear,
    load: load,
    catalogue: catalogue,
    count: function () { return load().length; },
    detectFormat: detectFormat
  });
}());
