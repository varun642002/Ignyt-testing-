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
    "slice": 28, "bun": 45, "paratha": 60, "parotta": 60, "dosa": 60,
    "chapati": 40, "roti": 40, "idli": 50, "egg": 50,
    "tablespoon": 15, "tbsp": 15, "teaspoon": 5, "tsp": 5,
}
# Deliberately absent: piece, serve, pack, medium, small, large. There is no standard weight for
# "1 piece" that holds across a dataset spanning cake, fish and fruit, so those stay rejected.
HOUSEHOLD = re.compile(r"^\s*([\d.]+)?\s*(" + "|".join(HOUSEHOLD_G) + r")s?\s*$", re.I)

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


def serving_grams(s):
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


def convert(row, source_label, trust):
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

    resolved = serving_grams(row.get("serving_size"))
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
                         % (household, HOUSEHOLD_G[household]) if household else ""),
        # The serving the source actually measured, so logging it returns the source's own
        # figures rather than anything derived.
        "portions": ([{"unit": household, "grams": HOUSEHOLD_G[household],
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
    accepted, rejects = {}, []
    for path in args.csvs:
        p = Path(path)
        rows = read_rows(p)
        trust = 2 if re.search(r"_food_data", p.name) else 1
        label = "HealthifyMe OCR (%s)" % p.name
        ok = 0
        for r in rows:
            food, why = convert(r, label, trust)
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
