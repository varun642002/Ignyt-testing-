"""
Which RASAM and KUZHAMBU varieties is the catalogue missing?

Narrow sibling of sambar-gravy-gap-audit.py, same reasoning: these two Tamil gravy categories
specifically, checked after a prior import already added most of the common ground (25 rasam
and 74 kuzhambu entries already in the catalogue when this was written -- the vegetable x
Puli/Kara/Poricha cross for most South Indian vegetables is already thorough). This generates
what is genuinely still missing: rasam named by a base the earlier pass did not reach, the
non-vegetarian kuzhambus (egg, chicken, crab, prawn, specific fish), and a handful of vegetables
that never got their Puli/Kara/Poricha cross.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/rasam-kuzhambu-gap-audit.py
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
OUT = REPO / "rasam-kuzhambu-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Rasam: real named variants beyond pepper/garlic/lemon/tomato/kalyana/mysore, which
    # the earlier import already covered ----
    add(["Pineapple Rasam", "Nellikai Rasam", "Amla Rasam", "Inji Rasam", "Ginger Rasam",
         "Poosanikai Rasam", "Ash Gourd Rasam", "Murungakkai Rasam", "Drumstick Rasam",
         "Vengaya Rasam", "Onion Rasam", "Thengai Rasam", "Coconut Rasam", "Ulli Rasam",
         "Paruppu Thengai Rasam", "Sothi", "Rasam Podi", "Rasam Powder", "Instant Rasam Mix",
         "Rasam Cube", "Vetrilai Rasam", "Beetroot Rasam", "Carrot Rasam"])

    # ---- Charu: the Andhra name for the same category -- a distinct search term even where
    # the dish overlaps with a rasam, so worth its own entries ----
    add(["Charu", "Pappu Charu", "Tomato Charu", "Miriyala Charu", "Kobbari Charu",
         "Nimmakaya Charu", "Ulava Charu", "Menthi Charu"])

    # ---- Kuzhambu: vegetables that never got the Puli / Kara / Poricha cross ----
    veg = ["Snake Gourd", "Ridge Gourd", "Ash Gourd", "Cluster Beans", "Bottle Gourd",
           "Vazhaithandu"]
    styles = ["Puli Kuzhambu", "Kara Kuzhambu", "Poricha Kuzhambu"]
    add(cross(veg, styles, fmt="{b} {m}"))

    # ---- Kuzhambu: non-vegetarian, a real and everyday category the vegetable cross
    # cannot reach ----
    add(["Muttai Kuzhambu", "Egg Kuzhambu", "Kozhi Kuzhambu", "Chicken Kuzhambu",
         "Nandu Kuzhambu", "Crab Kuzhambu", "Yera Kuzhambu", "Prawn Kuzhambu",
         "Sura Meen Kuzhambu", "Nethili Meen Kuzhambu", "Ayala Meen Kuzhambu",
         "Vanjaram Meen Kuzhambu", "Kadal Meen Kuzhambu", "Attu Kari Kuzhambu"])

    # ---- Kuzhambu: named dishes the vegetable cross does not reach ----
    add(["Poondu Kuzhambu", "Garlic Kuzhambu", "Paruppu Urundai Kuzhambu",
         "Lentil Dumpling Kuzhambu", "Idichakka Kuzhambu", "Vazhaipoo Kara Kuzhambu",
         "Vazhaipoo Poricha Kuzhambu", "Urulaikizhangu Kara Kuzhambu"])

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
    print("candidates     : %d rasam/kuzhambu items" % len(rows))
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
