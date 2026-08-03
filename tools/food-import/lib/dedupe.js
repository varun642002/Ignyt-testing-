/* =========================================================
   DUPLICATE DETECTION AND MERGING

   The two datasets overlap: Foundation Foods 2026 is USDA re-measuring foods that already
   exist in SR Legacy 2018 (95 descriptions match outright). Within SR Legacy the same food
   also appears with inconsistent casing and punctuation.

   CANONICAL KEY = lowercase -> strip punctuation -> split -> SORT TOKENS -> rejoin.
   That collapses every variant the brief called out:
       "Chicken Breast"      "Chicken breast"      "CHICKEN BREAST"
       "Chicken Breast Raw"  "Chicken Breast, Raw"  "Raw Chicken Breast"
   all reduce to "breast chicken raw".

   No content token is ever dropped when building the key. It is tempting to strip words like
   "raw" or "cooked" to catch more duplicates, but those words are exactly what separates two
   foods with very different calories — over-merging silently corrupts every log entry that
   uses the survivor.

   SURVIVOR SELECTION, in order:
     1. Newest dataset       Foundation 2026 beats SR Legacy 2018 (the brief's "prefer the
                             newest USDA record")
     2. Newest publication   parsed publicationDate, descending
     3. Most complete        more populated nutrient fields, direct kcal beating derived
     4. Highest fdcId        USDA allocates ids in ascending order, so this is a last-resort
                             newness proxy and keeps the run deterministic
========================================================= */
"use strict";

import * as nutrients from "./nutrients.js";

/** Token-sorted canonical form. See the header for why nothing is stripped. */
function canonicalKey(name) {
  return String(name == null ? "" : name)
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function parseDate(s) {
  var t = Date.parse(s);
  return isFinite(t) ? t : 0;
}

/**
 * @param {object} a candidate
 * @param {object} b incumbent
 * @returns {boolean} true when `a` should replace `b`
 */
function beats(a, b) {
  if (a.datasetRank !== b.datasetRank) return a.datasetRank > b.datasetRank;

  var da = parseDate(a.publicationDate), db = parseDate(b.publicationDate);
  if (da !== db) return da > db;

  var ca = nutrients.completeness(a.nutrition), cb = nutrients.completeness(b.nutrition);
  if (ca !== cb) return ca > cb;

  return Number(a.fdcId) > Number(b.fdcId);
}

/**
 * @param {Array} foods records carrying { name, fdcId, datasetRank, publicationDate, nutrition }
 * @returns {{foods:Array, report:Array}}
 */
function dedupe(foods) {
  var groups = Object.create(null);

  foods.forEach(function (f) {
    var key = canonicalKey(f.name);
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });

  var kept = [];
  var report = [];

  Object.keys(groups).forEach(function (key) {
    var group = groups[key];

    if (group.length === 1) { kept.push(group[0]); return; }

    var winner = group[0];
    for (var i = 1; i < group.length; i++) {
      if (beats(group[i], winner)) winner = group[i];
    }

    var dropped = group.filter(function (f) { return f !== winner; });
    winner.mergedCount = dropped.length;
    kept.push(winner);

    report.push({
      canonicalKey: key,
      kept: {
        fdcId: winner.fdcId, name: winner.name, dataset: winner.dataset,
        category: winner.category, calories: winner.nutrition.calories,
        completeness: nutrients.completeness(winner.nutrition)
      },
      dropped: dropped.map(function (d) {
        return {
          fdcId: d.fdcId, name: d.name, dataset: d.dataset,
          category: d.category, calories: d.nutrition.calories,
          completeness: nutrients.completeness(d.nutrition)
        };
      }),
      reason: dropped[0].datasetRank !== winner.datasetRank
        ? "newer dataset"
        : (parseDate(dropped[0].publicationDate) !== parseDate(winner.publicationDate)
          ? "newer publication date"
          : (nutrients.completeness(dropped[0].nutrition) !== nutrients.completeness(winner.nutrition)
            ? "more complete nutrition"
            : "higher fdcId"))
    });
  });

  return { foods: kept, report: report };
}

export { dedupe, canonicalKey, beats };
