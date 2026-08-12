"""
IGNYT CSV FOOD IMPORT — per-serving OCR datasets into the per-100 g catalogue.

usage:
    python tools/food-import/csv-import.py <csv> [<csv> ...]           # write
    python tools/food-import/csv-import.py <csv> [...] --dry-run       # report only

WHY A THIRD IMPORTER. usda-import.js handles USDA's laboratory JSON; xlsx-import.js handles the
master workbook, where "every row is already per 100 g". Neither describes this source. These
CSVs are OCR of a consumer nutrition app: values are PER SERVING, the serving is often a
household portion, and the scan introduced real corruption. The work here is conversion and
rejection, which is not what either of the others does.

THE APP STORES PER 100 g. food-db.js records `per: 100` as "grams these values describe" and
scaleFood() divides by it, so a row can only be imported if its serving can be resolved to a
MASS. That single requirement decides most of what happens below.

HOUSEHOLD PORTIONS ARE THE HARD PART. 1,316 of the master file's 1,516 rows are measured in
katoris, pieces, slices, cups, glasses, parathas and bowls, and the file never says what one
weighs. Rejecting them outright costs ~700 real foods; inventing a weight and presenting the
result as measured data is worse. What resolves it is WHERE the assumption is allowed to land —
see HOUSEHOLD_G. The source's numbers are per serving, so a food stored with that serving
returns the source's own figures when one serving is logged, and the assumed weight only matters
if the user logs some other amount. It is disclosed on the entry rather than buried.

Units with no defensible standard weight — piece, serve, pack, medium — are still rejected, and
counted in the report so the loss stays visible rather than silent.

EVERY ROW IS CHECKED AGAINST ITS OWN MACROS. Atwater: 4*protein + 4*carbs + 9*fat should land
near the stated energy. The OCR produced protein 276 for an egg yolk, carbs of 1799, fats of
"033" and fibre of 126 — each of which passes any per-field range check and fails this one. It
is the only test that catches a decimal point that moved.
"""

from pathlib import Path
import argparse
import csv
import io
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone

REPO = Path(__file__).resolve().parent.parent.parent
OUT = REPO / "www" / "data" / "food" / "clean_foods.json"
CATS = REPO / "www" / "data" / "food" / "food_categories.json"
REPORTS = Path(__file__).resolve().parent / "reports"

# Per-100 g sanity ceilings. Nothing edible exceeds these, so a row that does is corrupt
# whatever its energy says.
MAX = {"calories": 900, "protein": 100, "carbs": 100, "fat": 100, "fibre": 80}

OZ_G = 28.3495
SERVING = re.compile(r"([\d.]+)\s*(g|gram|grams|oz|ml|kg)\b", re.I)

# HOUSEHOLD PORTIONS, and the one honest way to use them.
#
# Most of this source measures in katoris, slices and cups and never says what one weighs, so
# there is no weight to convert with. Rejecting all of them costs ~700 real foods; inventing a
# weight and presenting the result as measured is worse. What resolves it is WHERE the assumption
# lands.
#
# The source's figures are PER SERVING. Storing a food with the weight below as its serving means
# logging one katori returns those figures EXACTLY — the number the source actually stated, not a
# derived one. The assumed weight only comes into play if the user logs some other amount, and it
# is disclosed on the entry (`portionEstimated`) and in sourceNote rather than buried.
#
# The weights are the standard dietetic references used for Indian portion sizes — a katori is a
# 150 ml serving bowl, a cup and a glass are 240 ml — not numbers chosen to make anything fit.
HOUSEHOLD_G = {
    "katori": 150, "cup": 240, "glass": 240, "bowl": 200,
    "slice": 25, "bun": 45, "paratha": 60, "parotta": 60, "dosa": 80,
    "chapati": 35, "roti": 35, "idli": 50, "egg": 50,
    "tablespoon": 15, "tbsp": 15, "teaspoon": 5, "tsp": 5,
    # A second pass of lookups, for the units the first round left rejected. Each is a published
    # average rather than a guess: a two-egg omelette is 2 x the 50 g large egg; a drumstick
    # averages 120 g; instant noodle packs run 55-100 g and 75 g is the middle; a rusk is 20 g
    # (the 90 kcal piece every nutrition listing uses); a cheese square is 18-22 g; a juice
    # bottle is 250 ml.
    "omelette": 100, "omelet": 100, "drumstick": 120, "pack": 75, "packet": 75,
    "rusk": 20, "square": 20, "bottle": 250,
}
HOUSEHOLD = re.compile(r"^\s*([\d.]+)?\s*(" + "|".join(HOUSEHOLD_G) + r")s?\s*$", re.I)

# "1 PIECE" HAS NO WEIGHT — "1 PIECE OF WHAT" DOES.
#
# A piece of cake, a piece of fish and a piece of fruit have nothing in common, which is why
# these units were rejected outright at first. But the CSV gives a CATEGORY beside every row,
# and that names the food: "1 medium" in Apple is a medium apple, "1 piece" in Fish is a fish
# portion. With the category the question becomes answerable, and each of these is a published
# reference weight rather than a guess:
#
#   apple 182 g, orange 131 g, strawberry 12 g, banana 118 g, bread slice 25 g,
#   large egg 50 g without shell, chicken breast 174 g, fish serving 170 g, nuts 30 g
#     - USDA / average-weight reference chart, and the ICMR-NIN Indian portion guide for the
#       roti, dosa and katori figures above.
#
# Categories left out on purpose: Cake, Juice, Soup, Curry, Noodles, Dairy, Mutton, Omelette,
# Vegetables. A "piece" of curry or a "pack" of noodles has no published standard, and inventing
# one to raise the import count is the thing this file exists to avoid.
CATEGORY_PIECE_G = {
    "apple": 182, "orange": 131, "strawberry": 12, "fruits": 118,
    "egg": 50, "bread": 25, "bun": 45, "parotta": 60, "idli": 53,
    "fish": 170, "chicken": 174, "nuts": 30, "omelette": 100,
}

# A UNIT THE SCAN DESTROYED IS NOT THE SAME AS A UNIT WITH NO STANDARD. "1 Vv" and "1.0 WU" are
# not units at all — the row HAD one and the scan lost it. Where the category has a single
# well-defined piece (above), one piece is by far the likeliest thing the lost unit said: these
# rows sit in Omelette, Bread and Egg, where a serving is one omelette, one slice, one egg.
#
# It is applied ONLY to those categories. Alcoholic, Oats, Biriyani and Curry also have destroyed
# units and get nothing, because "one serving" of those is not a fixed thing — a spirit is 30 ml
# and a beer is 330 ml, and guessing between them to raise a count is the trade this file exists
# to refuse.
UNREADABLE = re.compile(r"^\s*[\d.]*\s*(?:[A-Za-z]{1,3}|WU|Vv|WVICGSUIS)\s*\)?\s*$")

# THE DATASET KNOWS ITS OWN PORTION CONVENTION, which beats anything lookable-up.
#
# For the rows left over — mostly a blank serving — the weight is learned from the rows in the
# SAME CATEGORY that DO carry one: Oats rows that state a weight say 100 g, Biriyani says 124 g,
# Curry 130 g, Mutton 110 g. That is this source describing its own servings, not an external
# average imposed on it, and it is measured per run rather than written down here so it stays
# true if the files change.
#
# Only where the category has enough weighed rows to have a median worth the name. Below this
# the sample says nothing: Bread has ONE weighed row and Bun has three, whose median of 330 g is
# plainly a bun-based dish rather than a bun.
MEDIAN_MIN_ROWS = 5

# ALCOHOL CANNOT USE A CATEGORY MEDIAN, and is the clearest case of why the medians are gated.
# "Alcoholic" spans a 30 ml spirit and a 330 ml beer, so one number for the category is wrong for
# almost every row in it. The drink is named in the food name, and these are the standard serves.
ALCOHOL_ML = [
    (("beer", "lager", "cider", "stout", "ale", "brew"), 330),
    (("wine", "prosecco", "champagne", "sangria"), 150),
    (("whisk", "vodka", "gin", "rum", "brandy", "tequila", "liqueur", "raki", "pastis"), 30),
    (("cocktail", "punch", "mule", "mojito", "glogg", "margarita"), 200),
]
# "small" and "large" are deliberately NOT here. The reference weights above are for a MEDIUM
# item, and the source distinguishes the three — applying 182 g to a row that says "1 small
# apple" is knowably wrong, not merely uncertain, so those rows stay rejected.
VAGUE = re.compile(r"^\s*([\d.]+)?\s*(piece|serve|serving|medium|fruit|fish|bread|roll|nos?|unit)s?\s*$", re.I)

# The category has to be CONFIRMED BY THE NAME before its weight is used. These categories are
# search groupings, not identities: everything matching the word lands in the bucket, so
# "Apple Rumani Mango" sits under Apple. Requiring the word in the name is what stops a mango
# being weighed as an apple. Paratha and parotta are the same bread spelled two ways.
NAME_MUST_CONTAIN = {"fruits": "fruit", "nuts": "nut", "parotta": "parat|parot"}

# ...and containing the word is still not enough. "Custard Apple" and "Apple Rumani Mango" both
# contain "apple" and are neither of them an apple — a custard apple is an annona and the other
# is a mango. A search grouping will always collect names like this, so the few that carry the
# word without being the food are named here rather than left to a cleverer rule that would
# quietly get some other pair wrong.
# Plain substrings rather than a pattern. This started as a regex and was written into this
# file twice with its word boundaries silently turned into literal backspace bytes by the
# shell doing the writing — it compiled, matched nothing, and let a mango through weighed as
# an apple. There is nothing here that needed a regex.
NOT_REALLY = ("custard apple", "wood apple", "elephant apple", "rose apple",
              "star apple", "sugar apple", "pineapple", "pine apple", "mango",
              "watermelon", "water melon", "muskmelon", "musk melon")


def misfiled(name):
    """True when the name carries the category word without being that food."""
    low = re.sub(r"[^a-z]+", " ", (name or "").lower())
    return any(t in low for t in NOT_REALLY)

# Trailing debris the scan left on names: "Egg Roll :", "Oats Idli ie", "Dosa with Egg [",
# "Meal Maker Biryani a", "Spring Biryani 7". Stripped, not rejected — the name is still good.
TAIL = re.compile(r"[\s,;:<>\[\]{}|~^_=+*/\\-]*(?:\b[a-z]{1,2}\b|\d{1,2}|[<>\[\]{}|~^_=+*/\\:;,.-])+\s*$")


def num(v):
    v = (v or "").strip().replace(",", "")
    if not v:
        return None
    try:
        f = float(v)
    except ValueError:
        return None
    return f if f == f and abs(f) != float("inf") else None


def serving_grams(s, category=None, recovered=None, name=None, medians=None):
    """Mass of one serving, or None when the source gave a household unit.

    ml is treated as grams. That is exact for water and close enough for the drinks in these
    files; it is not a general assumption and does not travel outside this importer.
    """
    m = SERVING.search(s or "")
    if m:
        v, unit = float(m.group(1)), m.group(2).lower()
        if v <= 0:
            return None
        g = v * OZ_G if unit == "oz" else v * 1000 if unit == "kg" else v
        return (g, None)                       # weighed by the source

    h = HOUSEHOLD.match((s or "").strip())
    if h:
        count = float(h.group(1)) if h.group(1) else 1.0
        unit = h.group(2).lower()
        if count <= 0:
            return None
        return (count * HOUSEHOLD_G[unit], unit)   # weight estimated — see HOUSEHOLD_G

    # A weight this same food carries in another file. Sourced from the dataset, so it is a
    # recovery rather than an estimate — the OCR simply lost the unit on this copy of the row.
    if recovered:
        return (recovered, None)

    v = VAGUE.match((s or "").strip()) or UNREADABLE.match((s or "").strip())
    if v:
        cat = (category or "").strip().lower()
        if cat in CATEGORY_PIECE_G and name:
            want = NAME_MUST_CONTAIN.get(cat, cat.rstrip("s"))
            if re.search(want, name, re.I) and not misfiled(name):
                g1 = v.group(1) if v.re.groups >= 1 else None
                count = float(g1) if g1 else 1.0
                unit = v.group(2).lower() if v.re.groups >= 2 else cat
                if count > 0:
                    return (count * CATEGORY_PIECE_G[cat], unit)

    cat = (category or "").strip().lower()
    if cat == "alcoholic" and name:
        low = name.lower()
        for words, ml in ALCOHOL_ML:
            if any(w in low for w in words):
                return (float(ml), "serve")
        return None                     # an unnamed drink could be either; leave it out

    # Last resort: what a serving weighs in this category, learned from the rows that say so.
    if medians and cat in medians:
        return (medians[cat], "serve")
    return None


def clean_name(raw):
    """Strip scan debris. Returns None when what is left is not a name."""
    n = unicodedata.normalize("NFKC", (raw or "")).strip().strip('"')
    n = re.sub(r"\s+", " ", n)
    for _ in range(3):                       # "Egg Puff in Air Fryer 7 :" needs several passes
        stripped = TAIL.sub("", n).strip()
        if stripped == n:
            break
        n = stripped
    if len(n) < 3:
        return None
    # A name the scan mangled beyond use: "efom relat", "ns a a", "i | 6) Recipe", "w Receipe".
    # Two independent signals, because either alone has false positives.
    letters = sum(c.isalpha() for c in n)
    if letters / max(1, len(n)) < 0.6:
        return None
    toks = n.split()
    if sum(1 for t in toks if len(t) <= 2) > len(toks) / 2:
        return None
    if not re.match(r"^[A-Za-z0-9][A-Za-z0-9 ,.'()&%/+-]*$", n):
        return None
    # Real food names start with a capital in every one of these files; the debris does not.
    if not n[0].isupper() and not n[0].isdigit():
        return None
    return n


def key(name):
    """Identity for "is this the same food". Case, punctuation and PLURALS are all noise here.

    Without the plural fold, "Boiled Eggs" imports alongside the catalogue's "Boiled Egg" and
    "Whole Eggs" alongside "Whole Egg" — the same food twice in the search results, differing
    only by an s. Folding a trailing s on each word costs nothing real: the pairs it merges in
    this dataset are all genuine duplicates, and no two DIFFERENT foods here are told apart
    solely by pluralisation.
    """
    n = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    return " ".join(w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w
                    for w in n.split())


def read_rows(path):
    with io.open(path, encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def convert(row, source_label, trust, recovered=None, medians=None):
    """One CSV row to a catalogue entry, or a (None, reason) rejection."""
    name = clean_name(row.get("food_name"))
    if not name:
        return None, "unreadable name"

    # THE SOURCE'S OWN FLAG IS A HINT, NOT A VETO. These files carry "data?" and "macros?" on
    # rows the scrape was unsure about, and vetoing on it threw out 470 rows sight unseen —
    # including many whose numbers are demonstrably fine. Doubt is not evidence. The checks
    # below are, so a flagged row is put through exactly the same ones and kept if it passes;
    # the flag is recorded on the entry so the provenance is not lost.
    flag = (row.get("flag") or "").strip()

    resolved = serving_grams(row.get("serving_size"), row.get("category"), recovered, name, medians)
    if resolved is None:
        return None, "serving has no weight (" + ((row.get("serving_size") or "").strip() or "blank") + ")"
    grams, household = resolved

    vals = {k: num(row.get(src)) for k, src in
            (("calories", "calories"), ("protein", "protein_g"), ("carbs", "carbs_g"),
             ("fat", "fats_g"), ("fibre", "fibre_g"))}
    if any(vals[k] is None for k in ("calories", "protein", "carbs", "fat")):
        return None, "missing a macro"
    if vals["fibre"] is None:
        vals["fibre"] = 0.0
    if vals["calories"] <= 0:
        return None, "no energy"

    # THE ENERGY CHECK, on the source's own per-serving figures — before scaling, so a corrupt
    # value cannot be normalised into something that looks reasonable.
    est = 4 * vals["protein"] + 4 * vals["carbs"] + 9 * vals["fat"]
    if abs(est - vals["calories"]) > max(35.0, vals["calories"] * 0.35):
        return None, "energy %.0f does not match macros %.0f" % (vals["calories"], est)

    f = 100.0 / grams
    out = {k: round(v * f, 1) for k, v in vals.items()}
    out["calories"] = round(out["calories"])
    for k, ceiling in MAX.items():
        if out[k] < 0 or out[k] > ceiling:
            return None, "%s %.0f per 100 g is out of range" % (k, out[k])

    # AN IMPLAUSIBLE DENSITY MEANS THE ESTIMATED WEIGHT WAS WRONG, so the row goes rather than
    # the figure. Only rows whose weight THIS FILE estimated are judged here — where the source
    # gave grams, the number is its data and not mine to overrule.
    #
    # What it catches is a composite dish weighed as a single piece: "Bun Kebab" is a meal, not
    # one 45 g bun, and dividing a meal's energy by a bun's weight produced 887 kcal/100 g.
    # Mughlai Paratha, Bread Pizza and Pork Kizhi Parotta all failed the same way. Nothing but
    # fat is that dense — oil is 884 and ghee 900 — so above 650 the assumption is what broke.
    # Nuts are exempt because they genuinely reach 550-700.
    if household and out["calories"] > 650 and (cat_l := (row.get("category") or "").strip().lower()) != "nuts":
        return None, ("%d kcal per 100 g from an assumed %d g serving — the dish is not one %s"
                      % (out["calories"], round(grams), household))

    cat = (row.get("category") or "").strip() or "Other"
    return {
        "id": None,                       # assigned at merge, after dedupe
        "name": name,
        "category": cat,
        "brand": None,
        "servingSize": 100, "servingUnit": "g", "per": 100,
        "calories": out["calories"], "protein": out["protein"], "carbs": out["carbs"],
        "fat": out["fat"], "fibre": out["fibre"],
        "sugar": None, "sodium": None,
        "barcode": None, "verified": False,
        "source": "ignyt",
        "sourceNote": source_label
                      + (" [source flagged: %s]" % flag if flag else "")
                      + (" [1 %s taken as %d g — standard portion, not from the source]"
                         % (household, grams) if household else "")
                      + (" [serving weight recovered from the same food in another file]"
                         if recovered and not household else ""),
        # The serving the source actually measured, so logging it returns the source's own
        # figures rather than anything derived.
        "portions": ([{"unit": household, "grams": round(grams, 1),
                       "estimated": True}] if household else None),
        "portionEstimated": bool(household),
        "_trust": trust,                  # dropped before writing
        "_serving": round(grams, 1),
    }, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csvs", nargs="+")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    doc = json.loads(OUT.read_text(encoding="utf-8"))
    existing = doc["foods"]
    have = {key(f["name"]) for f in existing}
    print("catalogue: %d foods" % len(existing))

    # A file naming ONE food family was hand-checked and is trusted over the bulk scrape, which
    # holds corrupted duplicates of the same rows — "Egg Yolk" is protein 2.7 in egg_food_data
    # and 276 in food_nutrition_all. Higher wins a name collision.
    # SERVING WEIGHTS RECOVERED FROM THE DATA ITSELF, built before anything is converted.
    #
    # The scan lost the unit on a lot of rows — 111 read "1.0 WU" and 61 read "1 Vv", which
    # mean nothing. But the same food often appears in another of these files with its weight
    # intact: "Dahi Oats, 121 kcal" is "1.0 WU" in the master file and "130 g" in
    # food_nutrition_all. Taking the weight from there is a recovery, not an estimate.
    #
    # Two indexes, because a name is not always intact either. The macro signature —
    # calories + protein + carbs — identifies the same row when its NAME was the thing the scan
    # mangled, and is specific enough that a collision would have to agree on three numbers.
    by_name, by_sig = {}, {}
    for path in args.csvs:
        for r in read_rows(Path(path)):
            got = serving_grams(r.get("serving_size"))
            if not got:
                continue
            w = got[0]
            by_name.setdefault(key(clean_name(r.get("food_name")) or ""), w)
            sig = tuple((r.get(k) or "").strip() for k in ("calories", "protein_g", "carbs_g"))
            if all(sig):
                by_sig.setdefault(sig, w)
    by_name.pop("", None)

    # Median serving weight per category, from the rows that state one. Outliers are excluded by
    # the 5-600 g window: a 1 kg "serving" is a pack size, not a portion.
    import statistics
    # ONLY rows the SOURCE weighed feed this. Running serving_grams() here instead would fold in
    # this file's own katori and cup estimates and the median would then be partly learned from
    # itself — measured as exactly 150 g, the katori figure, across eight unrelated categories,
    # including an Idli median of 150 g when an idli is 50 g.
    seen_cat = {}
    for path in args.csvs:
        for r in read_rows(Path(path)):
            m = SERVING.search(r.get("serving_size") or "")
            if not m:
                continue
            v, unit = float(m.group(1)), m.group(2).lower()
            w = v * OZ_G if unit == "oz" else v * 1000 if unit == "kg" else v
            if 5 <= w <= 600:
                seen_cat.setdefault((r.get("category") or "").strip().lower(), []).append(w)
    medians = {c: round(statistics.median(v), 1) for c, v in seen_cat.items()
               if len(v) >= MEDIAN_MIN_ROWS}
    print("learned a serving weight for %d categories (>= %d weighed rows each)"
          % (len(medians), MEDIAN_MIN_ROWS))

    def recover(r):
        w = by_name.get(key(clean_name(r.get("food_name")) or ""))
        if w:
            return w
        sig = tuple((r.get(k) or "").strip() for k in ("calories", "protein_g", "carbs_g"))
        return by_sig.get(sig) if all(sig) else None

    accepted, rejects = {}, []
    for path in args.csvs:
        p = Path(path)
        rows = read_rows(p)
        trust = 2 if re.search(r"_food_data", p.name) else 1
        label = "HealthifyMe OCR (%s)" % p.name
        ok = 0
        for r in rows:
            food, why = convert(r, label, trust, recover(r), medians)
            if not food:
                rejects.append({"file": p.name, "name": (r.get("food_name") or "").strip()[:60],
                                "reason": why})
                continue
            k = key(food["name"])
            if k in have:
                rejects.append({"file": p.name, "name": food["name"], "reason": "already in catalogue"})
                continue
            prev = accepted.get(k)
            if prev and prev["_trust"] >= food["_trust"]:
                rejects.append({"file": p.name, "name": food["name"], "reason": "duplicate of a more trusted row"})
                continue
            accepted[k] = food
            ok += 1
        print("  %-32s %5d rows -> %4d usable" % (p.name, len(rows), ok))

    new = sorted(accepted.values(), key=lambda f: f["name"].lower())
    nid = 1 + max([int(f["id"].split(":")[1]) for f in existing
                   if isinstance(f.get("id"), str) and f["id"].startswith("ignyt:")
                   and f["id"].split(":")[1].isdigit()] or [0])
    for f in new:
        f["id"] = "ignyt:%d" % nid; nid += 1
        f.pop("_trust", None); f.pop("_serving", None)

    print("\naccepted %d, rejected %d" % (len(new), len(rejects)))
    tally = {}
    for r in rejects:
        head = r["reason"].split("(")[0].strip()
        tally[head] = tally.get(head, 0) + 1
    for reason, n in sorted(tally.items(), key=lambda kv: -kv[1]):
        print("  %-44s %5d" % (reason, n))

    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "csv_import_rejects.json").write_text(
        json.dumps(rejects, indent=1), encoding="utf-8")
    print("\nrejects -> tools/food-import/reports/csv_import_rejects.json")

    if args.dry_run:
        print("dry run — nothing written")
        return 0

    doc["foods"] = existing + new
    doc["generatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    OUT.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")

    counts = {}
    for f in doc["foods"]:
        counts[f.get("category") or "Other"] = counts.get(f.get("category") or "Other", 0) + 1
    CATS.write_text(json.dumps(
        [{"name": k, "count": v} for k, v in sorted(counts.items())], indent=1), encoding="utf-8")

    print("catalogue now %d foods, %.2f MB" % (len(doc["foods"]), OUT.stat().st_size / 1048576))
    return 0


if __name__ == "__main__":
    sys.exit(main())
