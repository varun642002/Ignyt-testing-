# IGNYT USDA Food Import Engine

Build-time pipeline that converts USDA FoodData Central JSON exports into the internal IGNYT
food schema. **Nothing here runs on a device.** It produces JSON that the app loads; the
tooling itself is never bundled.

## Running it

The USDA zips are not committed (SR Legacy alone is 201 MB unpacked). Extract them anywhere
and point `--input` at the folder:

```bash
node --max-old-space-size=6144 tools/food-import/usda-import.js --input /path/to/extracted
```

The heap flag is **required** — SR Legacy is a single 201 MB JSON document and Node's default
old-space cannot hold the parsed tree.

`--input` accepts a `.json` file or a directory (scanned one level deep, which is how the USDA
zips extract). It is repeatable, so several datasets can be merged in one run.

| Option | Default | Purpose |
| --- | --- | --- |
| `--input <path>` | `tools/food-import/data` | Dataset file or directory. Repeatable. |
| `--out <dir>` | `www/data/food` | App-facing JSON. |
| `--reports <dir>` | `tools/food-import/reports` | Diagnostics. |
| `--include-baby-foods` | off | Keep USDA's Baby Foods group. |
| `--limit <n>` | all | First *n* records per dataset, for quick checks. |

## Output

| File | Shipped | Contents |
| --- | --- | --- |
| `www/data/food/clean_foods.json` | yes | The catalogue. One food per line — valid JSON, but diffable at 7,700 records. |
| `www/data/food/food_categories.json` | yes | Category names with counts. |
| `reports/food_index.json` | no | Prebuilt token index, for inspection and cross-release diffing. |
| `reports/duplicate_report.json` | no | Every merge, with the kept record, the dropped ones, and why. |
| `reports/import_summary.json` | no | Full run statistics. |

`food_index.json` is deliberately **not** shipped: its entries duplicate data already in
`clean_foods.json`, so bundling it would add ~1.5 MB to the APK to save ~40 ms of one-off
in-memory index building.

## Adding a dataset

Add one entry to `DATASETS` in `usda-import.js`, keyed by the export's top-level array name:

```js
IFCTFoods: { label: "IFCT", rank: 35 }
```

`rank` decides which record survives a duplicate — higher wins. Everything else (name
normalisation, category assignment, portions, validation) is source-agnostic and needs no
change. An `IFCTFoods` slot is already reserved for the Indian dataset.

## Modules

| File | Responsibility |
| --- | --- |
| `lib/normalize.js` | Whitespace, capitalisation, search keys, numeric coercion. |
| `lib/nutrients.js` | Nutrient extraction, including the three-way energy resolution. |
| `lib/categories.js` | USDA category → browsable category, with in-category keyword refinement. |
| `lib/portions.js` | Household measures and the default serving. |
| `lib/dedupe.js` | Canonical keys, merge, survivor selection. |
| `lib/validate.js` | Error/warning rules. |

Each module carries a header explaining the decisions that are not obvious from the code.

## Things worth knowing before you change this

**Energy is not one field.** SR Legacy carries `#208 Energy (kcal)` on every record. Foundation
2026 carries it on only 95 of 363; the rest use `#957`/`#958` Atwater factors, and some carry
nothing at all. `lib/nutrients.js` resolves six ways in a documented order and records which
one fired, so `import_summary.json` shows exactly how much of the catalogue is direct
measurement (7,543) versus derivation.

**Duplicate keys never drop content tokens.** Stripping words like "raw" or "cooked" would
catch more duplicates and silently merge foods with very different calories. The canonical key
only folds case and punctuation and sorts tokens.

**Two categories are not in the approved list.** "Game & Other Meats" (lamb, veal, venison,
game birds) and "Meals & Entrees" (packaged complete meals) exist because the approved list has
no home for them and filing lamb under Beef would be wrong. Baby Foods are excluded entirely.
All three are called out in `lib/categories.js`.

**Records excluded on purpose.** USDA publishes 17 `(0% Moisture)` rows — analytical
dry-matter values, not foods anyone eats. They are dropped by a global rule.
