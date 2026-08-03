/* =========================================================
   IGNYT MASTER NUTRITION IMPORT

   Converts the IGNYT_Master_Nutrition workbook into the catalogue the app already reads:
   www/data/food/clean_foods.json + food_categories.json.

   usage:  node tools/food-import/xlsx-import.js "<path to .xlsx>"

   WHY THIS IS A SEPARATE IMPORTER
   tools/food-import/usda-import.js exists for the USDA dataset and is left untouched. That
   one has to do heavy repair work — six-way energy resolution, category inference from
   laboratory names, portion selection. This source needs almost none of that: every row is
   already per 100 g, already categorised, and already named for humans. Forcing this through
   the USDA pipeline would mean disabling most of it.

   WHAT THE SOURCE GETS RIGHT
     - every row is per 100 g (or per 100 ml), which is the app's storage unit exactly
     - 41 human categories, no laboratory naming
     - 39 nutrient columns, including several the app did not previously carry
========================================================= */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SRC = process.argv[2];
const OUT_DIR = path.resolve("www/data/food");
const REPORT_DIR = path.resolve("tools/food-import/reports");

if (!SRC || !fs.existsSync(SRC)) {
  console.error("usage: node tools/food-import/xlsx-import.js \"<path to .xlsx>\"");
  process.exit(1);
}

/* Read the sheet through Python/openpyxl rather than adding a JS xlsx dependency. openpyxl is
   already installed for the backend, and an xlsx parser is a large dependency to take on for
   one conversion that runs offline. */
const PY = `
import json, sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb[wb.sheetnames[0]]
rows = ws.iter_rows(values_only=True)
hdr = [str(h) if h is not None else "" for h in next(rows)]
out = []
for r in rows:
    if not r or not r[1]:
        continue
    out.append({hdr[i]: (r[i] if i < len(r) else None) for i in range(len(hdr))})
sys.stdout.write(json.dumps(out))
`;
const raw = JSON.parse(
  execFileSync("python", ["-c", PY, SRC], { maxBuffer: 512 * 1024 * 1024, encoding: "utf8" })
);
console.log("read " + raw.length + " rows");

/* ---------------------------------------------------------
   Field mapping
--------------------------------------------------------- */

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/* The workbook's vitamin columns are named by their B-number; the app stores them by their
   common name because that is what the nutrition engine and every label in the UI already
   use. Renaming here rather than in the app keeps one vocabulary on the screen. */
const MAP = {
  calories: "Calories_kcal",
  carbs: "Carbohydrates_g",
  fat: "Fat_g",
  fibre: "Fiber_g",
  sugar: "Sugar_g",
  sodium: "Sodium_mg",
  cholesterol: "Cholesterol_mg",
  saturatedFat: "Saturated_Fat_g",
  monounsaturatedFat: "Monounsaturated_Fat_g",
  polyunsaturatedFat: "Polyunsaturated_Fat_g",
  transFat: "Trans_Fat_g",
  omega3: "Omega3_g",
  omega6: "Omega6_g",
  potassium: "Potassium_mg",
  calcium: "Calcium_mg",
  iron: "Iron_mg",
  magnesium: "Magnesium_mg",
  phosphorus: "Phosphorus_mg",
  zinc: "Zinc_mg",
  vitaminA: "Vitamin_A_mcg",
  thiamin: "Vitamin_B1_mg",
  riboflavin: "Vitamin_B2_mg",
  niacin: "Vitamin_B3_mg",
  /* `pantothenic`, NOT `pantothenicAcid`. The nutrition engine's table has used the short key
     since it was written, and a record keyed differently is stored, scaled and then silently
     dropped at the display layer — a whole vitamin permanently blank with nothing to indicate
     why. Matching the engine here is the smaller change and keeps one name for one thing. */
  pantothenic: "Vitamin_B5_mg",
  vitaminB6: "Vitamin_B6_mg",
  biotin: "Vitamin_B7_mcg",
  folate: "Vitamin_B9_mcg",
  vitaminB12: "Vitamin_B12_mcg",
  vitaminC: "Vitamin_C_mg",
  vitaminD: "Vitamin_D_mcg",
  vitaminE: "Vitamin_E_mg",
  vitaminK: "Vitamin_K_mcg",
  water: "Water_g",
  ash: "Ash_g"
};

function searchKeyOf(name, brand) {
  return [name, brand].filter(Boolean).join(" ")
    .toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

/* The Source column arrived with mojibake where an em dash should be (cp1252 read as UTF-8).
   Left alone it renders as a replacement character in the food-detail provenance line. */
function cleanText(v) {
  if (v == null) return null;
  return String(v).replace(/�/g, "—").replace(/\s+/g, " ").trim() || null;
}

const report = {
  source: path.basename(SRC),
  rowsRead: raw.length,
  proteinRecoveredFromTypoColumn: 0,
  duplicatesMerged: 0,
  droppedNoName: 0,
  droppedNoEnergy: 0,
  atwaterOutliers: [],
  categories: {},
  units: {}
};

const byKey = new Map();

for (const r of raw) {
  const name = cleanText(r["Food_Item"]);
  if (!name) { report.droppedNoName++; continue; }

  const brand = cleanText(r["Brand"]);
  const calories = num(r["Calories_kcal"]);
  if (calories === null) { report.droppedNoEnergy++; continue; }

  /* PROTEIN LIVES IN TWO COLUMNS.
     The workbook has both `Protein_g` and a misspelled `Proteint_g`. 507 rows populate ONLY
     the misspelled one. Reading the correctly-spelled column alone would silently record zero
     protein for 507 foods — including Chicken Masala at 18 g — which is exactly the kind of
     error nobody notices until a user's macros are wrong for a month. */
  let protein = num(r["Protein_g"]);
  if (protein === null) {
    const alt = num(r["Proteint_g"]);
    if (alt !== null) { protein = alt; report.proteinRecoveredFromTypoColumn++; }
  }

  const unit = String(r["Serving_Unit"] || "g").toLowerCase() === "ml" ? "ml" : "g";
  report.units[unit] = (report.units[unit] || 0) + 1;

  const food = {
    id: null,                               // assigned after dedupe, so ids are stable
    name,
    category: cleanText(r["Category"]) || "Other",
    brand: brand || null,
    servingSize: 100,
    servingUnit: unit,
    per: 100,
    calories,
    protein,
    barcode: r["Barcode"] ? String(r["Barcode"]).trim() : null,
    // Verified is "No" on every row in this export. Recorded as a real boolean rather than
    // assumed true — the provenance line in the UI reads from this.
    verified: String(r["Verified"] || "").trim().toLowerCase() === "yes",
    sourceNote: cleanText(r["Source"]),
    source: "ignyt"
  };
  for (const [field, column] of Object.entries(MAP)) {
    if (field === "calories") continue;
    food[field] = num(r[column]);
  }
  food.protein = protein;                   // MAP has no protein entry; set above

  food.portions = [{ unit, label: unit === "ml" ? "100 ml" : "100 g", grams: 100 }];
  food.searchKey = searchKeyOf(name, brand);

  /* Atwater check, reported not corrected. Fibre yields ~2 kcal/g rather than 4, so
     vegetables legitimately read high on a naive estimate — "correcting" those would be
     introducing an error, not removing one. */
  if (protein !== null && food.carbs !== null && food.fat !== null && calories > 0) {
    const est = protein * 4 + food.carbs * 4 + food.fat * 9;
    if (Math.abs(est - calories) / calories > 0.4) {
      report.atwaterOutliers.push({ name, stated: calories, atwater: Math.round(est) });
    }
  }

  /* Dedupe on name+brand. 339 pairs repeat in the source. Keep the record with the most
     populated nutrient fields — a later duplicate is often a sparser re-entry of the same
     food, and taking last-write would quietly discard micronutrients. */
  const key = food.searchKey;
  const filled = (f) => Object.values(f).filter((v) => v !== null && v !== undefined).length;
  const existing = byKey.get(key);
  if (existing) {
    report.duplicatesMerged++;
    if (filled(food) > filled(existing)) byKey.set(key, food);
  } else {
    byKey.set(key, food);
  }
}

const foods = [...byKey.values()].sort((a, b) =>
  a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
);
foods.forEach((f, i) => { f.id = "ignyt:" + (i + 1); });

for (const f of foods) report.categories[f.category] = (report.categories[f.category] || 0) + 1;

const categories = Object.entries(report.categories)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });
/* SHAPE MATTERS. food-catalogue.js reads `json.foods` and treats anything else as an empty
   catalogue — it filters on Array.isArray(json.foods), so a bare top-level array loads as
   zero foods with status "ready" and no error anywhere. Writing the wrong shape here is a
   silent, total failure, which is exactly what happened on the first run of this importer. */
fs.writeFileSync(
  path.join(OUT_DIR, "clean_foods.json"),
  JSON.stringify({ version: 2, source: "IGNYT Master Nutrition", generatedAt: new Date().toISOString(), foods })
);
fs.writeFileSync(path.join(OUT_DIR, "food_categories.json"), JSON.stringify(categories, null, 2));

report.foodsWritten = foods.length;
report.withBrand = foods.filter((f) => f.brand).length;
report.withBarcode = foods.filter((f) => f.barcode).length;
report.atwaterOutlierCount = report.atwaterOutliers.length;
report.atwaterOutliers = report.atwaterOutliers.slice(0, 25);
fs.writeFileSync(path.join(REPORT_DIR, "ignyt-master-import.json"), JSON.stringify(report, null, 2));

const size = fs.statSync(path.join(OUT_DIR, "clean_foods.json")).size;
console.log("\n=== IMPORT COMPLETE ===");
console.log("  foods written        : " + foods.length);
console.log("  categories           : " + categories.length);
console.log("  with brand           : " + report.withBrand);
console.log("  with barcode         : " + report.withBarcode);
console.log("  duplicates merged    : " + report.duplicatesMerged);
console.log("  protein recovered    : " + report.proteinRecoveredFromTypoColumn + " (from the misspelled column)");
console.log("  dropped, no energy   : " + report.droppedNoEnergy);
console.log("  Atwater outliers     : " + report.atwaterOutlierCount + " (reported, not altered)");
console.log("  clean_foods.json     : " + (size / 1048576).toFixed(2) + " MB");
console.log("\n  top categories: " + categories.slice(0, 8).map((c) => c.name + "(" + c.count + ")").join(", "));
