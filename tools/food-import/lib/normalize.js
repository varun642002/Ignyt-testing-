/* =========================================================
   NAME / VALUE NORMALISATION

   USDA descriptions follow an inverted, comma-delimited convention:
     "Nuts, almonds, dry roasted, with salt added"
     "Tomatoes, grape, raw"

   That structure is deliberately PRESERVED. It looks unusual next to a hand-written food
   name, but every comma-separated qualifier is a real distinguishing fact ("raw" vs
   "cooked", "with salt added" vs "without"), and dropping or reordering them is how a food
   database ends up logging the wrong calories. Only presentation is normalised here:
   whitespace, duplicate spacing and capitalisation.
========================================================= */
"use strict";

/* Words kept lowercase inside a title unless they lead it. */
var SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor", "of",
  "on", "or", "the", "to", "with", "without", "per", "vs"
]);

/* Tokens that must survive capitalisation untouched — acronyms, standards bodies and
   USDA's own shorthand. Keyed by lowercase form. */
var LITERALS = {
  "usda": "USDA", "nlea": "NLEA", "racc": "RACC", "nfs": "NFS", "upc": "UPC",
  "aoac": "AOAC", "uht": "UHT", "msg": "MSG", "pdq": "PDQ", "ii": "II", "iii": "III",
  "bbq": "BBQ", "hi": "HI", "usa": "USA", "sr": "SR", "rtc": "RTC", "rte": "RTE"
};

function titleCaseWord(word, isFirst) {
  var lower = word.toLowerCase();

  if (Object.prototype.hasOwnProperty.call(LITERALS, lower)) return LITERALS[lower];

  // Anything containing a digit is left alone: "80%", "2%", "1/2", "10-inch", "w/o".
  if (/\d/.test(word)) return word;

  // Already mixed-case (McDonald's, pH) is assumed intentional -- only fix ALL CAPS.
  if (word !== word.toUpperCase() && word !== word.toLowerCase()) return word;

  if (!isFirst && SMALL_WORDS.has(lower)) return lower;

  // Capitalise across internal hyphens and slashes: "dry-roasted" -> "Dry-Roasted".
  return lower.replace(/(^|[-\/])([a-z])/g, function (m, sep, ch) {
    return sep + ch.toUpperCase();
  });
}

/**
 * Collapses whitespace and applies title case, treating each comma-delimited segment as its
 * own title so qualifiers read naturally ("Nuts, Almonds, Dry Roasted, with Salt Added").
 */
function normalizeName(raw) {
  var s = String(raw == null ? "" : raw)
    .replace(/\s+/g, " ")       // duplicate spacing, tabs, newlines
    .replace(/\s*,\s*/g, ", ")  // consistent comma spacing
    .replace(/\s*;\s*/g, "; ")
    .trim()
    .replace(/[,;]+$/, "");     // trailing separators left by truncated source rows

  if (!s) return "";

  return s.split(", ").map(function (segment, segIndex) {
    return segment.split(" ").map(function (w, i) {
      return titleCaseWord(w, segIndex === 0 && i === 0);
    }).join(" ");
  }).join(", ");
}

/** Lowercase, punctuation-free form used for searching and for duplicate keys. */
function searchKey(name) {
  return String(name == null ? "" : name)
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Search tokens, with 1-character noise dropped. */
function tokens(name) {
  return searchKey(name).split(" ").filter(function (t) { return t.length > 1; });
}

/**
 * Coerces a raw nutrient amount to a clean non-negative number.
 * Returns null for missing/invalid so callers can distinguish "no data" from "measured 0" --
 * a distinction that matters when deciding whether a record is usable.
 */
function nutrientValue(v, decimals) {
  if (v === null || v === undefined || v === "") return null;
  var n = Number(v);
  if (!isFinite(n)) return null;
  if (n < 0) return null;               // negative nutrition is always a source error
  var f = Math.pow(10, decimals == null ? 2 : decimals);
  return Math.round(n * f) / f;
}

export { normalizeName, searchKey, tokens, nutrientValue };
