"""
Which BBQ, GRILL, TANDOORI and STARTER items is the catalogue missing?

Sibling of the other narrow-scope audits in this folder. Checked what already exists first:
Kebab (74 entries), Tikka (35), Chaap (9 of 10 real styles), Sukka (9), Chilli/Manchurian (18),
and Roast (54, mostly fish-species-specific) are all well covered. The one real hole is the
"Tandoori [protein]" starter format itself -- despite 35 catalogue rows containing the word
"Tandoori", all but four are actually "Tandoori Roti" bread variants, not the tandoor-roasted
starter. Also missing: the single most common Chaap style (Malai Chaap -- the catalogue has all
eight other styles but not this one), wings beyond plain/BBQ/hot, and generic starter-platter
formats (Mixed Grill, Sizzler, Popcorn Chicken).

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/bbq-grill-tandoori-starter-gap-audit.py
"""

from pathlib import Path
import csv
import difflib
import io
import json
import re
import sys

REPO = Path(__file__).resolve().parent.parent.parent
CATALOGUE = REPO / "www" / "data" / "food" / "clean_foods.json"
OUT = REPO / "bbq-grill-tandoori-starter-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- The real gap: "Tandoori [protein]" as a tandoor-roasted starter, not a bread ----
    add(cross(["Tandoori"], ["Paneer", "Mushroom", "Fish", "Mutton", "Gobi", "Aloo",
                             "Baby Corn", "Soya", "Broccoli", "Egg"], fmt="{b} {m}"))

    # ---- Chaap: the one style missing from an otherwise complete set ----
    add(["Malai Chaap"])

    # ---- Koliwada, missing its most common protein ----
    add(["Koliwada Prawn", "Koliwada Fish"])

    # ---- Tangdi Kebab, Chicken Tangdi -- a real named format the Kebab cross does not reach ----
    add(["Chicken Tangdi Kebab", "Chicken Tangdi", "Tangdi Kebab"])

    # ---- Wings, beyond plain/BBQ/hot already present ----
    add(cross(["Wings"], ["Tandoori", "Peri Peri", "Honey Chilli", "Korean", "Garlic Butter",
                          "Lemon Pepper", "Chilli"], fmt="{m} Chicken {b}"))

    # ---- "65" and popcorn/nugget formats not yet covered ----
    add(["Baby Corn 65", "Egg 65", "Soya 65", "Cauliflower 65", "Popcorn Chicken",
         "Popcorn Paneer", "Popcorn Prawn"])

    # ---- Starter-platter formats, generic and real ----
    add(["Mixed Grill", "Sizzler", "Non Veg Platter", "Veg Starter Platter",
         "Tandoori Platter", "Seafood Platter", "Chicken Sizzler", "Paneer Sizzler"])

    seen, uniq = set(), []
    for n in out:
        n = re.sub(r"\s+", " ", n).strip()
        k = n.lower()
        if k not in seen:
            seen.add(k)
            uniq.append(n)
    return uniq


def main():
    doc = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    names = [f["name"] for f in doc["foods"]]
    low = [n.lower() for n in names]
    have = set(low)

    def status(q):
        ql = q.lower()
        if ql in have:
            return "present", q
        sub = [names[i] for i, x in enumerate(low)
               if (ql in x or x in ql) and min(len(ql), len(x)) >= 0.6 * max(len(ql), len(x))]
        if sub:
            return "variant", sorted(sub, key=len)[0]
        near = difflib.get_close_matches(q, names, n=1, cutoff=0.86)
        return ("variant", near[0]) if near else ("MISSING", "")

    pool = build()
    rows = []
    for q in pool:
        st, m = status(q)
        rows.append({"food": q, "status": st, "closest_in_catalogue": m})

    miss = [r for r in rows if r["status"] == "MISSING"]
    var = [r for r in rows if r["status"] == "variant"]
    print("catalogue      : %d foods" % len(names))
    print("candidates     : %d bbq/grill/tandoori/starter items" % len(rows))
    print("  present      : %d" % (len(rows) - len(miss) - len(var)))
    print("  variant only : %d  (a partial match, often a coincidence)" % len(var))
    print("  MISSING      : %d" % len(miss))

    with io.open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["food", "status", "closest_in_catalogue"])
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["status"] != "MISSING", r["food"])))
    print("\n-> %s (missing first)" % OUT.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
