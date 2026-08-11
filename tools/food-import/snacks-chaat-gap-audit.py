"""
Which SNACKS and CHAAT items is the catalogue missing?

Sibling of the other narrow-scope audits in this folder. Checked what already exists before
writing this: the catalogue turned out far more complete than expected on this category --
Dabeli, Handvo, Muthiya, Patra, Punugulu, Sabudana Vada, Batata Vada, Aloo Chaat, Chana Chaat,
Ghugni, Fruit Chaat and most Bonda/Cutlet/Sandwich/Momos/Spring Roll variants are already
present. This generates what is genuinely still missing: real fillings for Samosa/Pakora/Bhajji
that were never crossed, standalone Kachori varieties, South Indian tea-stall snacks (Thattai,
Seedai, Nippattu...), and a handful of chaat and namkeen names the earlier passes never reached.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/snacks-chaat-gap-audit.py
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
OUT = REPO / "snacks-chaat-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Samosa: real fillings beyond Vegetable/Chicken/Punjabi, which already exist ----
    add(cross(["Samosa"], ["Paneer", "Cheese", "Corn", "Keema", "Onion", "Moong Dal",
                           "Mutton", "Schezwan", "Chinese"], fmt="{m} {b}"))

    # ---- Kachori: standalone varieties the bread-filling cross never produced ----
    add(["Khasta Kachori", "Dal Kachori", "Urad Dal Kachori", "Bikaneri Kachori",
         "Mirchi Kachori", "Onion Kachori", "Pyaz Ki Khasta Kachori"])

    # ---- Pakora / Bhajji: real fritters, distinct from the "Bhaji" sabzi entries already
    # in the catalogue (a fried snack and a vegetable curry are different foods) ----
    add(cross(["Pakora", "Bhajji"],
              ["Aloo", "Palak", "Gobi", "Mirchi", "Corn", "Cheese", "Chicken", "Fish",
               "Prawn", "Kanda", "Capsicum", "Baingan", "Pyaaz"], fmt="{m} {b}"))

    # ---- Namkeen: the packaged/tea-stall names the earlier passes did not reach ----
    add(["Kara Boondi", "Omapodi", "Aloo Sev", "Nylon Sev", "Masala Peanuts",
         "Roasted Chana", "Navratan Mix", "Bhel Mixture", "Farsan Mix", "Diamond Cuts",
         "Chakli Namkeen", "Corn Flakes Mixture", "Bikaneri Bhujia", "Aloo Bhujia Namkeen"])

    # ---- South Indian tea-stall snacks, not covered by the north/south regional audits ----
    add(["Thattai", "Seedai", "Ellu Seedai", "Vella Seedai", "Karam Seedai", "Nippattu",
         "Kodubale", "Ribbon Pakoda", "Congress Kadalekai", "Manoharam", "Thenkuzhal"])

    # ---- Chaat: names the core list already in the catalogue does not reach ----
    add(["Corn Chaat", "Matar Chaat", "Kala Chana Chaat", "Sprouts Chaat", "Jhalmuri",
         "Puchka", "Katori Chaat", "Palak Patta Chaat", "Dahi Bhalla Chaat", "Ram Ladoo",
         "Papri Chaat", "Moong Sprouts Chaat"])

    # ---- Rolls and frankies, real fillings beyond what already exists ----
    add(["Veg Kathi Roll", "Egg Kathi Roll", "Chicken Frankie", "Paneer Frankie",
         "Aloo Frankie", "Schezwan Roll", "Egg Roll Kolkata"])

    # ---- Cutlets and sandwiches, the fillings the earlier lists did not reach ----
    add(["Corn Cutlet", "Paneer Cutlet", "Sweet Potato Cutlet", "Bombay Sandwich",
         "Aloo Sandwich", "Corn Cheese Sandwich", "Mumbai Toast Sandwich"])

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
    print("candidates     : %d snacks/chaat items" % len(rows))
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
