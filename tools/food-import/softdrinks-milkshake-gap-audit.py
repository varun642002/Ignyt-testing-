"""
Which SOFT DRINKS and MILKSHAKES is the catalogue missing?

Sibling of the other narrow-scope audits in this folder. Checked what already exists first: the
major global colas and their Indian bottling names are well covered (Coca-Cola, Pepsi, Thums Up,
Limca, Mirinda, Fanta, Sprite, 7UP, Mountain Dew), and milkshake has the five obvious flavours.
The real gap is in three places: diet/zero variants of drinks that already exist in full-sugar
form, GENERIC (non-branded) soda water/club soda/lemonade/tonic (only Schweppes-branded versions
exist), the classic Indian regional soft drinks (Duke's, Rim Zim, Gold Spot, Goli Soda) that
never made it in as a category even though a biscuit brand with the same name did, and the
milkshake flavours beyond the five basics.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/softdrinks-milkshake-gap-audit.py
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
OUT = REPO / "softdrinks-milkshake-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Diet / zero-sugar variants of drinks that already exist in full-sugar form ----
    add(["Sprite Zero", "7UP Free", "Diet Pepsi", "Pepsi Max", "Coke Zero", "Diet Coke",
         "Thums Up Zero", "Mountain Dew Zero", "Fanta Zero", "Limca Zero"])

    # ---- Fanta and Mirinda flavours beyond what already exists ----
    add(["Fanta Grape", "Fanta Green Apple", "Mirinda Apple"])

    # ---- Generic (non-branded) sparkling and mixer drinks -- only Schweppes-branded
    # versions exist today ----
    add(["Soda Water", "Club Soda", "Tonic Water", "Ginger Ale", "Lemonade",
         "Sparkling Water", "Flavoured Soda Water"])

    # ---- Classic Indian regional soft drinks, a real category the catalogue never got ----
    add(["Duke's Lemon", "Duke's Raspberry", "Duke's Mangola", "Rim Zim", "Gold Spot",
         "Bovonto", "Torino", "Goli Soda", "Jaljeera Soda", "Masala Soda", "Rose Soda",
         "Kalapatta Soda", "Nimbu Soda", "Jeera Soda"])

    # ---- Root beer, cream soda and other Western sodas not yet present ----
    add(["Root Beer", "Cream Soda", "Ginger Beer", "Barley Water", "Vimto"])

    # ---- Milkshakes: flavours beyond the five basics already in the catalogue ----
    add(cross(["Mango", "Banana", "Oreo", "KitKat", "Butterscotch", "Rose", "Blueberry",
               "Pista", "Dates", "Nutella", "Peanut Butter", "Caramel", "Cookies and Cream",
               "Mixed Fruit", "Sitaphal", "Papaya", "Watermelon", "Pineapple", "Guava",
               "Apple", "Litchi", "Almond", "Cashew", "Fig", "Chikoo"], ["Milkshake"]))
    add(["Cold Coffee", "Iced Coffee", "Iced Chocolate", "Iced Mocha", "Frappe",
         "Bubble Tea Milkshake"])

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
    print("candidates     : %d soft drink/milkshake items" % len(rows))
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
