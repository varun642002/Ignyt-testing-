"""
Fill the fat-breakdown gaps in the IGNYT catalogue from USDA FoodData Central.

    python tools/food-import/usda-gap-fill.py <foundation.json> <sr_legacy.json> [--apply]

WHAT THIS FILLS
    saturatedFat, monounsaturatedFat, polyunsaturatedFat, transFat,
    cholesterol, pantothenic, omega3, omega6

WHAT IT WILL NOT DO
    - overwrite a value the catalogue already has. Only nulls are filled.
    - accept a name match whose macros disagree with ours. A wrong match writes wrong
      nutrition into somebody's food log, which is worse than leaving the field blank, so a
      candidate must agree on energy AND fat before a single value is copied.
    - guess. Everything it declines is written to the report with the reason.

Runs read-only and prints a full report unless --apply is passed.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict

CATALOGUE = "www/data/food/clean_foods.json"
REPORT = "tools/food-import/reports/usda-gap-fill.json"
CANONICAL_MAP = "tools/food-import/reports/canonical-map.json"

# --- nutrient numbers -----------------------------------------------------------------
SIMPLE = {
    "saturatedFat": "606",
    "monounsaturatedFat": "645",
    "polyunsaturatedFat": "646",
    "transFat": "605",
    "cholesterol": "601",
    "pantothenic": "410",
}
# Omega-3 and omega-6 are not single USDA nutrients; they are the sum of their named fatty
# acids. Summing only the ones actually reported (a missing component is unmeasured, not zero)
# and requiring at least one to be present before claiming a total.
OMEGA3 = ["851", "629", "621", "631"]   # ALA, EPA, DHA, DPA
OMEGA6 = ["675", "685", "672"]          # LA, GLA, arachidonic

TARGETS = list(SIMPLE) + ["omega3", "omega6"]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\([^)]*\)", " ", s.lower())          # drop parentheticals
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# Words that make two names different foods even when the rest matches. Without this,
# "Chicken Breast" happily matches "Chicken Breast, breaded, fried" and inherits its fat.
DISQUALIFY = {
    "fried", "breaded", "battered", "canned", "dried", "dehydrated", "powder",
    "concentrate", "sweetened", "salted", "smoked", "cured", "roasted", "baked",
    "boiled", "cooked", "raw", "frozen", "juice", "sauce", "soup", "pie", "cake",
}


def usda_nutrients(food: dict) -> dict:
    """Extract the target nutrients from one USDA food, per 100 g."""
    by_num = {}
    for n in food.get("foodNutrients", []):
        nut = n.get("nutrient") or {}
        num = str(nut.get("number") or "")
        amt = n.get("amount")
        if num and amt is not None:
            by_num[num] = amt

    out = {}
    for field, num in SIMPLE.items():
        if num in by_num:
            out[field] = by_num[num]

    for field, nums in (("omega3", OMEGA3), ("omega6", OMEGA6)):
        parts = [by_num[x] for x in nums if x in by_num]
        if parts:
            out[field] = round(sum(parts), 4)

    # kept for the sanity gate, not copied
    out["_kcal"] = by_num.get("208") or by_num.get("957") or by_num.get("958")
    out["_protein"] = by_num.get("203")
    out["_fat"] = by_num.get("204")
    return out


def load_usda(paths):
    index = defaultdict(list)
    total = 0
    for p in paths:
        with open(p, encoding="utf-8") as fh:
            blob = json.load(fh)
        foods = blob[[k for k in blob][0]] if isinstance(blob, dict) else blob
        for f in foods:
            # One of these exports carries null entries in the array. Guarding rather than
            # trusting the shape: a 210 MB file is not something to re-download over a None.
            if not isinstance(f, dict):
                continue
            desc = f.get("description") or ""
            if not desc:
                continue
            vals = usda_nutrients(f)
            if not any(k in vals for k in TARGETS):
                continue
            total += 1
            index[norm(desc)].append((desc, vals))
            head = norm(desc.split(",")[0])
            if head and head != norm(desc):
                index[head].append((desc, vals))
    return index, total


def close(a, b, pct, floor):
    """True when two figures agree within `pct`, with an absolute floor for small numbers.

    A MISSING VALUE IS NOT AGREEMENT. The first version returned True when either side was
    None — "nothing to disagree about" — and that was the hole the bad matches came through:
    "Pillsbury Cake Flour" has no fat recorded, so the fat gate passed trivially and the flour
    inherited 102 mg of cholesterol from a sponge cake. For a transfer of nutrition, an
    unverifiable claim has to fail closed.
    """
    if a is None or b is None:
        return False
    if abs(a - b) <= floor:
        return True
    return abs(a - b) / max(abs(a), abs(b), 1e-9) <= pct


# Words describing the FORM of a product. If one name has one of these and the other does not,
# they are different things however similar the macros: a cake mix is not a cake, and flour is
# not the loaf. This is what let "Cake Flour" reach "Cake, sponge, commercially prepared".
FORM_WORDS = {"mix", "flour", "powder", "chips", "puffed", "syrup", "extract",
              "essence", "paste", "meal", "bran", "flakes", "dough", "batter"}


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    apply_changes = "--apply" in sys.argv
    paths = [a for a in sys.argv[1:] if a.endswith(".json") and "clean_foods" not in a]

    print("indexing USDA…")
    index, n_usda = load_usda(paths)
    print(f"  {n_usda} USDA foods carrying at least one target nutrient")
    print(f"  {len(index)} lookup keys")

    blob = json.load(open(CATALOGUE, encoding="utf-8"))
    foods = blob["foods"]
    print(f"  {len(foods)} IGNYT foods")

    try:
        canonical = json.load(open(CANONICAL_MAP, encoding="utf-8"))
        print(f"  {len(canonical)} canonical names available for matching")
    except FileNotFoundError:
        canonical = {}
        print("  no canonical map (run emit-canon.js first) — name-only matching")

    before = {t: sum(1 for f in foods if f.get(t) is not None) for t in TARGETS}

    report = {
        "usdaFoodsIndexed": n_usda,
        "ignytFoods": len(foods),
        "matched": 0,
        "rejectedNoCandidate": 0,
        "rejectedMacroMismatch": 0,
        "rejectedAmbiguous": 0,
        "rejectedQualifier": 0,
        "filled": defaultdict(int),
        "samples": [],
        "rejections": [],
    }

    for f in foods:
        # Anything already complete is left alone.
        missing = [t for t in TARGETS if f.get(t) is None]
        if not missing:
            continue

        # Two lookups, most specific first: the food's own name, then the canonical name the
        # app's own 403 naming rules give it. The canonical pass is what reaches USDA at all
        # for a catalogue of Indian and branded foods — USDA has no "Amul Butter", but the
        # curation layer already calls that "Butter", which it does have. Using the app's
        # rules rather than a second matcher means "same food" has one definition.
        key = norm(f["name"])
        cands = list(index.get(key) or [])
        canon = canonical.get(f.get("id"))
        if canon:
            cands += index.get(norm(canon)) or []
        if not cands:
            report["rejectedNoCandidate"] += 1
            continue

        our_words = set(key.split())
        picked = None
        for desc, vals in cands:
            # A USDA name carrying a preparation word ours does not is a different food.
            extra = (set(norm(desc).split()) - our_words) & DISQUALIFY
            if extra:
                continue
            # Product form must agree. "Cake Flour" vs "Cake"; "Cake Mix" vs a finished cake.
            usda_words = set(norm(desc).split())
            if (our_words & FORM_WORDS) != (usda_words & FORM_WORDS):
                continue

            # THE SAFETY GATE
            # Three macros must be PRESENT on both sides and agree. Energy alone is far too
            # weak — a dry cake mix and an iced sponge can land within 20% of each other while
            # being completely different foods.
            if not close(f.get("calories"), vals.get("_kcal"), 0.20, 15):
                continue
            if not close(f.get("fat"), vals.get("_fat"), 0.30, 2):
                continue
            if not close(f.get("protein"), vals.get("_protein"), 0.30, 2):
                continue
            picked = (desc, vals)
            break

        if picked is None:
            # Say WHY, so the report is diagnosable rather than just a count.
            any_qual = any((set(norm(d).split()) - our_words) & DISQUALIFY for d, _ in cands)
            if any_qual:
                report["rejectedQualifier"] += 1
            else:
                report["rejectedMacroMismatch"] += 1
                if len(report["rejections"]) < 25:
                    d, v = cands[0]
                    report["rejections"].append({
                        "ignyt": f["name"], "ignytKcal": f.get("calories"), "ignytFat": f.get("fat"),
                        "usda": d, "usdaKcal": v.get("_kcal"), "usdaFat": v.get("_fat"),
                    })
            continue

        desc, vals = picked
        wrote = {}
        for t in missing:
            if t in vals and vals[t] is not None:
                f[t] = round(float(vals[t]), 4)
                report["filled"][t] += 1
                wrote[t] = f[t]
        if wrote:
            report["matched"] += 1
            f["fatSource"] = "usda"       # provenance: these numbers came from elsewhere
            if len(report["samples"]) < 20:
                report["samples"].append({"ignyt": f["name"], "usda": desc, "wrote": wrote})

    after = {t: sum(1 for f in foods if f.get(t) is not None) for t in TARGETS}
    report["coverageBefore"] = before
    report["coverageAfter"] = after
    report["filled"] = dict(report["filled"])

    print("\n=== COVERAGE ===")
    for t in TARGETS:
        b, a = before[t], after[t]
        print(f"  {t:22s} {b:5d} -> {a:5d}   (+{a-b},  {100*a/len(foods):.1f}%)")
    print("\n=== MATCHING ===")
    print(f"  foods filled            : {report['matched']}")
    print(f"  no USDA candidate       : {report['rejectedNoCandidate']}")
    print(f"  rejected, macro mismatch: {report['rejectedMacroMismatch']}")
    print(f"  rejected, prep qualifier: {report['rejectedQualifier']}")

    json.dump(report, open(REPORT, "w", encoding="utf-8"), indent=2, default=str)
    print(f"\nreport -> {REPORT}")

    if apply_changes:
        json.dump(blob, open(CATALOGUE, "w", encoding="utf-8"))
        print(f"APPLIED -> {CATALOGUE}")
    else:
        print("DRY RUN — pass --apply to write the catalogue.")


if __name__ == "__main__":
    main()
