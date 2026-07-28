#!/usr/bin/env node
/* =========================================================
   IGNYT USDA FOOD IMPORT ENGINE

   Converts USDA FoodData Central JSON exports into the internal IGNYT food schema.
   Build-time only: this never runs on a device and ships nothing to the APK except the JSON
   it produces. Re-run it whenever USDA publishes a new release, or point it at an IFCT
   export once one is available — the source adapters are keyed off the dataset's top-level
   array name, so a new dataset needs one entry in DATASETS and nothing else.

   USAGE
     node --max-old-space-size=6144 tools/food-import/usda-import.js --input <file-or-dir> [...]

   The heap flag is required: SR Legacy is a single 201 MB JSON document and Node's default
   old-space cannot hold the parsed tree.

   OPTIONS
     --input <path>          A .json file, or a directory scanned for FoodData_Central_*.json.
                             Repeatable. Defaults to ./data next to this script.
     --out <dir>             Where app-facing JSON is written.   default www/data/food
     --reports <dir>         Where diagnostic JSON is written.   default tools/food-import/reports
     --include-baby-foods    Keep USDA's Baby Foods group (excluded by default).
     --limit <n>             Process only the first n records per dataset (for quick checks).

   OUTPUT
     <out>/clean_foods.json           the food collection the app loads
     <out>/food_categories.json       category list with counts
     <reports>/food_index.json        prebuilt search index (entries + token postings)
     <reports>/duplicate_report.json
     <reports>/import_summary.json

   WHY food_index.json IS NOT SHIPPED
   It is a verification artifact, not app data. Its `entries` duplicate the id, name,
   category and calories already in clean_foods.json, so shipping both would add ~1.5 MB to
   the APK to avoid ~40 ms of one-off in-memory index building on first search. The app
   builds its index from clean_foods.json instead. The file is still generated so the index
   can be inspected and diffed between USDA releases.

   PIPELINE
     read -> validate shape -> extract nutrients -> extract portions -> normalise names
          -> assign category -> drop excluded groups -> dedupe/merge -> validate -> write
========================================================= */
"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as normalize from "./lib/normalize.js";
import * as nutrientLib from "./lib/nutrients.js";
import * as categoryLib from "./lib/categories.js";
import * as portionLib from "./lib/portions.js";
import * as dedupeLib from "./lib/dedupe.js";
import * as validateLib from "./lib/validate.js";

var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);

/* ---------------------------------------------------------
   Known datasets, keyed by the top-level array in the export.
   `rank` drives duplicate survival: higher wins. See lib/dedupe.js.
--------------------------------------------------------- */
var DATASETS = {
  FoundationFoods: { label: "Foundation", rank: 40 },
  SurveyFoods:     { label: "FNDDS Survey", rank: 30 },
  SRLegacyFoods:   { label: "SR Legacy", rank: 20 },
  BrandedFoods:    { label: "Branded", rank: 10 },
  IFCTFoods:       { label: "IFCT", rank: 35 }   // reserved for the Indian dataset
};

/* ---------------------------------------------------------
   Arguments
--------------------------------------------------------- */
function parseArgs(argv) {
  var opts = { input: [], out: null, reports: null, includeBabyFoods: false, limit: 0 };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === "--input") opts.input.push(argv[++i]);
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--reports") opts.reports = argv[++i];
    else if (a === "--include-baby-foods") opts.includeBabyFoods = true;
    else if (a === "--limit") opts.limit = parseInt(argv[++i], 10) || 0;
    else if (a === "--help" || a === "-h") { printUsage(); process.exit(0); }
    else { console.error("Unknown option: " + a); printUsage(); process.exit(1); }
  }
  var repoRoot = path.resolve(__dirname, "..", "..");
  if (!opts.input.length) opts.input = [path.join(__dirname, "data")];
  if (!opts.out) opts.out = path.join(repoRoot, "www", "data", "food");
  if (!opts.reports) opts.reports = path.join(__dirname, "reports");
  return opts;
}

function printUsage() {
  console.log(fs.readFileSync(__filename, "utf8").split("=========================================================")[1]);
}

/** Expands each --input into a list of .json files. */
function resolveInputs(inputs) {
  var files = [];
  inputs.forEach(function (p) {
    if (!fs.existsSync(p)) { console.warn("  ! input not found, skipping: " + p); return; }
    if (fs.statSync(p).isDirectory()) {
      fs.readdirSync(p).forEach(function (name) {
        var full = path.join(p, name);
        if (fs.statSync(full).isDirectory()) {
          // one level down, which is how the USDA zips extract
          fs.readdirSync(full).forEach(function (n2) {
            if (/\.json$/i.test(n2)) files.push(path.join(full, n2));
          });
        } else if (/\.json$/i.test(name)) files.push(full);
      });
    } else files.push(p);
  });
  return files;
}

/* ---------------------------------------------------------
   Read one dataset file
--------------------------------------------------------- */
function readDataset(file) {
  var json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("  ! could not parse " + path.basename(file) + ": " + e.message);
    return null;
  }

  var key = Object.keys(DATASETS).find(function (k) { return Array.isArray(json[k]); });
  if (!key) {
    console.warn("  ! " + path.basename(file) + " has no recognised dataset array, skipping");
    return null;
  }

  var raw = json[key];
  // The 2026 Foundation export contains 32 literal nulls in its array. Real files really are
  // this untidy, so every stage below assumes nothing about record shape.
  var records = raw.filter(function (r) { return r && typeof r === "object" && r.description; });

  return {
    key: key,
    label: DATASETS[key].label,
    rank: DATASETS[key].rank,
    file: path.basename(file),
    records: records,
    rawCount: raw.length,
    malformed: raw.length - records.length
  };
}

/* ---------------------------------------------------------
   Convert one USDA record into the IGNYT schema
--------------------------------------------------------- */
function convert(record, dataset, stats) {
  var name = normalize.normalizeName(record.description);
  if (!name) { stats.noName++; return null; }

  var key = normalize.searchKey(name);
  var usdaCategory = record.foodCategory
    ? (record.foodCategory.description || record.foodCategory)
    : "";

  var assigned = categoryLib.assign(usdaCategory, key);
  if (assigned.category === "EXCLUDE") {
    // Keyed by what actually caused the exclusion, so the summary distinguishes a whole USDA
    // group being dropped from individual records failing a global rule.
    var reason = assigned.rule === "global-keyword"
      ? "analytical dry-matter records (0% moisture)"
      : usdaCategory;
    stats.excluded[reason] = (stats.excluded[reason] || 0) + 1;
    return null;
  }

  var nutrition = nutrientLib.extract(record);
  var serving = portionLib.extract(record);

  stats.energySources[nutrition.energySource] = (stats.energySources[nutrition.energySource] || 0) + 1;
  stats.categoryRules[assigned.rule] = (stats.categoryRules[assigned.rule] || 0) + 1;

  return {
    /* ---- retained fields, exactly the approved keep-list ---- */
    id: "usda:" + record.fdcId,
    name: name,
    category: assigned.category,
    brand: record.brandName || record.brandOwner || null,
    servingSize: serving.servingSize,
    servingUnit: serving.servingUnit,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    fibre: nutrition.fibre,
    sugar: nutrition.sugar,
    sodium: nutrition.sodium,
    potassium: nutrition.potassium,
    calcium: nutrition.calcium,
    iron: nutrition.iron,

    /* ---- supporting data the app needs, not USDA metadata ---- */
    per: 100,                    // every value above is per 100 g
    portions: serving.portions,  // measured household measures, better than generic estimates
    searchKey: key,
    source: "usda",

    /* ---- pipeline-internal, stripped before writing ---- */
    fdcId: record.fdcId,
    dataset: dataset.label,
    datasetRank: dataset.rank,
    publicationDate: record.publicationDate || "",
    usdaCategory: usdaCategory,
    nutrition: nutrition,
    mergedCount: 0
  };
}

/** Removes pipeline-internal fields so the shipped JSON carries no USDA metadata. */
function strip(f) {
  return {
    id: f.id, name: f.name, category: f.category, brand: f.brand,
    servingSize: f.servingSize, servingUnit: f.servingUnit, per: f.per,
    calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat,
    fibre: f.fibre, sugar: f.sugar, sodium: f.sodium, potassium: f.potassium,
    calcium: f.calcium, iron: f.iron,
    portions: f.portions, searchKey: f.searchKey, source: f.source
  };
}

/* ---------------------------------------------------------
   Search index
--------------------------------------------------------- */
function buildIndex(foods) {
  var entries = foods.map(function (f) {
    return { id: f.id, n: f.name, c: f.category, k: f.calories };
  });

  // token -> array of positions into `entries`. Prefix and substring matching both run over
  // this map, which is far cheaper than rescanning every name on each keystroke.
  var tokenMap = Object.create(null);
  foods.forEach(function (f, i) {
    var seen = Object.create(null);
    normalize.tokens(f.searchKey).forEach(function (t) {
      if (seen[t]) return;
      seen[t] = 1;
      (tokenMap[t] || (tokenMap[t] = [])).push(i);
    });
  });

  return { version: 1, count: entries.length, entries: entries, tokens: tokenMap };
}

/* ---------------------------------------------------------
   Writing
--------------------------------------------------------- */
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

/** One food per line: still valid JSON, but diffable and greppable at 8,000 records. */
function writeFoods(file, foods) {
  var lines = foods.map(function (f) { return JSON.stringify(f); });
  fs.writeFileSync(file,
    '{\n"version": 1,\n"basis": "per 100 g",\n"source": "USDA FoodData Central",\n"generated": ' +
    JSON.stringify(new Date().toISOString()) + ',\n"count": ' + foods.length + ',\n"foods": [\n' +
    lines.join(",\n") + "\n]}\n");
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 1) + "\n");
}

function mb(file) {
  return (fs.statSync(file).size / 1048576).toFixed(2) + " MB";
}

/* ---------------------------------------------------------
   Main
--------------------------------------------------------- */
function main() {
  var opts = parseArgs(process.argv.slice(2));
  var t0 = Date.now();

  if (opts.includeBabyFoods) categoryLib.DIRECT["Baby Foods"] = "Meals & Entrees";

  console.log("IGNYT USDA food import");
  console.log("  out     : " + opts.out);
  console.log("  reports : " + opts.reports);

  var files = resolveInputs(opts.input);
  if (!files.length) {
    console.error("\nNo input JSON found. Extract the USDA zips and pass --input <dir>.");
    process.exit(1);
  }

  var stats = {
    noName: 0, excluded: {}, energySources: {}, categoryRules: {}, malformed: 0
  };
  var datasets = [];
  var converted = [];

  files.forEach(function (file) {
    console.log("\nreading " + path.basename(file) + " ...");
    var ds = readDataset(file);
    if (!ds) return;

    var records = opts.limit ? ds.records.slice(0, opts.limit) : ds.records;
    console.log("  " + ds.label + ": " + records.length + " usable of " + ds.rawCount +
      " (" + ds.malformed + " malformed/null)");
    stats.malformed += ds.malformed;

    var before = converted.length;
    records.forEach(function (r) {
      var f = convert(r, ds, stats);
      if (f) converted.push(f);
    });

    datasets.push({
      file: ds.file, dataset: ds.label, rank: ds.rank,
      rawRecords: ds.rawCount, malformed: ds.malformed,
      usableRecords: records.length, converted: converted.length - before
    });
    console.log("  converted: " + (converted.length - before));
  });

  console.log("\nconverted total: " + converted.length);

  /* ---- duplicates ---- */
  var dd = dedupeLib.dedupe(converted);
  var mergedAway = converted.length - dd.foods.length;
  console.log("duplicate groups: " + dd.report.length + "  (records merged away: " + mergedAway + ")");

  /* ---- validation ---- */
  var vr = validateLib.validateAll(dd.foods);
  console.log("validation: " + vr.valid.length + " valid, " + vr.rejected.length +
    " rejected, " + vr.warnings.length + " warnings");

  /* ---- sort: category, then name, so the shipped file is stable across runs ---- */
  var final = vr.valid.slice().sort(function (a, b) {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  var clean = final.map(strip);

  /* ---- categories ---- */
  var counts = Object.create(null);
  clean.forEach(function (f) { counts[f.category] = (counts[f.category] || 0) + 1; });
  var categories = {
    version: 1,
    categories: categoryLib.CATEGORIES.map(function (c) {
      return { name: c, count: counts[c] || 0 };
    }).filter(function (c) { return c.count > 0 || c.name === "Custom Foods" || c.name === "Indian Foods"; })
  };

  /* ---- write ---- */
  ensureDir(opts.out);
  ensureDir(opts.reports);

  var fFoods = path.join(opts.out, "clean_foods.json");
  var fCats = path.join(opts.out, "food_categories.json");
  var fIndex = path.join(opts.reports, "food_index.json");  // verification artifact, not shipped
  var fDupes = path.join(opts.reports, "duplicate_report.json");
  var fSummary = path.join(opts.reports, "import_summary.json");

  writeFoods(fFoods, clean);
  writeJson(fCats, categories);
  writeJson(fIndex, buildIndex(final));
  writeJson(fDupes, {
    version: 1,
    generated: new Date().toISOString(),
    groups: dd.report.length,
    recordsMergedAway: mergedAway,
    note: "Canonical key is the lowercase, punctuation-stripped, token-SORTED name. " +
          "Survivor is chosen by newest dataset, then publication date, then nutrient completeness, then fdcId.",
    duplicates: dd.report
  });

  var summary = {
    version: 1,
    generated: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - t0) / 100) / 10,
    datasets: datasets,
    totals: {
      rawRecords: datasets.reduce(function (a, d) { return a + d.rawRecords; }, 0),
      malformedOrNull: stats.malformed,
      converted: converted.length,
      excludedByCategory: stats.excluded,
      excludedTotal: Object.keys(stats.excluded).reduce(function (a, k) { return a + stats.excluded[k]; }, 0),
      missingName: stats.noName,
      duplicateGroups: dd.report.length,
      mergedAway: mergedAway,
      rejectedByValidation: vr.rejected.length,
      finalFoodCount: clean.length
    },
    energyResolution: stats.energySources,
    categoryAssignment: stats.categoryRules,
    categoryCounts: counts,
    portions: {
      foodsWithHouseholdPortions: clean.filter(function (f) { return f.portions.length > 0; }).length,
      totalPortions: clean.reduce(function (a, f) { return a + f.portions.length; }, 0)
    },
    validation: {
      rejected: vr.rejected,
      warningCount: vr.warnings.length,
      warningSample: vr.warnings.slice(0, 50)
    },
    outputs: {
      clean_foods: { path: path.relative(process.cwd(), fFoods), size: mb(fFoods) },
      food_categories: { path: path.relative(process.cwd(), fCats), size: mb(fCats) },
      food_index: { path: path.relative(process.cwd(), fIndex), size: mb(fIndex) },
      duplicate_report: { path: path.relative(process.cwd(), fDupes), size: mb(fDupes) }
    }
  };
  writeJson(fSummary, summary);

  /* ---- console summary ---- */
  console.log("\n--- written ---");
  console.log("  clean_foods.json      " + clean.length + " foods   " + mb(fFoods));
  console.log("  food_categories.json  " + categories.categories.length + " categories   " + mb(fCats));
  console.log("  food_index.json       " + mb(fIndex));
  console.log("  duplicate_report.json " + mb(fDupes));
  console.log("  import_summary.json   " + mb(fSummary));

  console.log("\n--- energy resolution ---");
  Object.entries(stats.energySources).sort(function (a, b) { return b[1] - a[1]; })
    .forEach(function (e) { console.log("  " + String(e[1]).padStart(6) + "  " + e[0]); });

  console.log("\n--- categories ---");
  Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; })
    .forEach(function (e) { console.log("  " + String(e[1]).padStart(6) + "  " + e[0]); });

  if (vr.rejected.length) {
    console.log("\n--- rejected (first 20) ---");
    vr.rejected.slice(0, 20).forEach(function (r) {
      console.log("  " + r.name + "  ->  " + r.errors.join("; "));
    });
  }

  console.log("\ndone in " + summary.durationSeconds + "s");
}

main();
