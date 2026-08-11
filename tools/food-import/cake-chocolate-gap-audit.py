"""
Which CAKE and CHOCOLATE items is the catalogue missing?

Sibling of the other narrow-scope audits in this folder. Checked what already exists first: cake
coverage turned out to be extensive (101 cake/pastry entries -- nearly every flavour from the
earlier sweets-icecream sweep is already in) and chocolate is heavily covered by branded bars
(M&M's, Toblerone, Ghirardelli, Godiva, Cadbury, Kinder...). The real gap sits in two places
those two sweeps left alone: cupcakes and muffins only have 1-2 flavours each despite cake having
dozens, and the GENERIC (non-branded) chocolate types are missing entirely -- there is no plain
"Dark Chocolate", "Milk Chocolate" or "White Chocolate" entry, only brand-name ones, which is a
real gap for anyone logging what they ate rather than a specific product.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/cake-chocolate-gap-audit.py
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
OUT = REPO / "cake-chocolate-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Cupcakes: cake already has dozens of flavours, cupcake has one ----
    add(cross(["Vanilla", "Red Velvet", "Strawberry", "Butterscotch", "Blueberry", "Carrot",
               "Lemon", "Banana", "Coffee", "Oreo", "Funfetti", "Coconut", "Caramel",
               "Black Forest"], ["Cupcake"], fmt="{b} {m}"))

    # ---- Muffins: same gap as cupcakes ----
    add(cross(["Blueberry", "Banana", "Chocolate Chip", "Bran", "Double Chocolate",
               "Lemon Poppy Seed", "Chocolate", "Oatmeal", "Cranberry Orange"],
              ["Muffin"], fmt="{b} {m}"))

    # ---- Named cakes and cake forms not yet in the catalogue ----
    add(["Cake Pop", "Swiss Roll", "Bundt Cake", "Chocolate Truffle Cake",
         "Chocolate Lava Cake", "Molten Chocolate Cake", "Chocolate Souffle Cake",
         "Rasmalai Cake", "Gulab Jamun Cake"])

    # ---- Chocolate: the generic (non-branded) types, missing despite heavy brand coverage ----
    add(["Dark Chocolate", "Milk Chocolate", "White Chocolate", "Compound Chocolate",
         "Couverture Chocolate", "Ruby Chocolate", "Semi Sweet Chocolate",
         "Bittersweet Chocolate", "Unsweetened Chocolate"])

    # ---- Chocolate confections and preparations, generic ----
    add(["Chocolate Truffle", "Chocolate Fudge", "Chocolate Praline", "Chocolate Bonbon",
         "Chocolate Ganache", "Chocolate Coated Almonds", "Chocolate Coated Raisins",
         "Chocolate Coated Peanuts", "Chocolate Coated Cashews", "Chocolate Barfi Cube",
         "Chocolate Fondue", "Chocolate Spread", "Chocolate Sauce", "Chocolate Syrup Generic",
         "Chocolate Chip Cookie", "Chocolate Wafer", "Chocolate Eclair"])

    # ---- Brownie: real varieties beyond the plain/branded/protein ones already present ----
    add(["Chocolate Brownie", "Walnut Brownie", "Fudge Brownie", "Brownie Bites",
         "Nutty Brownie", "Blondie"])

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
    print("candidates     : %d cake/chocolate items" % len(rows))
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
