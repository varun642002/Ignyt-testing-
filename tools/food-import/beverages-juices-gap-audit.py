"""
Which BEVERAGES and JUICES is the catalogue missing?

Sibling of the other narrow-scope audits in this folder. Checked what already exists first:
Indian traditional drinks turned out extremely well covered (50 matches -- Aam Panna, Jaljeera,
Lassi in five flavours, Chaas, Thandai, a dozen regional Kanjis), and the functional categories
(energy drinks, sports drinks, malt drinks, iced tea, coconut water) all have at least a generic
entry. The real gap is single-fruit juices beyond the dozen already there (no Guava, Grape,
Litchi, Papaya, Jamun, Custard Apple, or Muskmelon juice), health-shot/functional juices (Aloe
Vera, Wheatgrass, Karela, Lauki, ABC Juice), and mocktails, which do not exist as a category at
all.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/beverages-juices-gap-audit.py
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
OUT = REPO / "beverages-juices-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Single-fruit juices beyond the dozen already in the catalogue ----
    add(cross(["Lemon", "Guava", "Grape", "Litchi", "Papaya", "Jamun", "Chikoo",
               "Custard Apple", "Muskmelon", "Grapefruit", "Kiwi", "Cranberry", "Amla",
               "Plum", "Peach", "Apricot", "Fig", "Kokum", "Star Fruit", "Dragon Fruit"],
              ["Juice"]))

    # ---- Health-shot and functional juices, a real and growing category ----
    add(["Aloe Vera Juice", "Wheatgrass Juice", "Wheatgrass Shot", "Karela Juice",
         "Bitter Gourd Juice", "Lauki Juice", "Bottle Gourd Juice", "Noni Juice",
         "Amla Shot", "Ginger Shot", "Turmeric Shot", "ABC Juice", "Apple Beetroot Carrot Juice",
         "Green Detox Juice", "Immunity Booster Juice", "Celery Juice"])

    # ---- Mocktails, missing as a category entirely ----
    add(["Virgin Mojito", "Blue Lagoon", "Shirley Temple", "Fruit Punch",
         "Watermelon Mint Cooler", "Virgin Pina Colada", "Strawberry Mojito",
         "Cucumber Mint Cooler", "Green Apple Mocktail", "Kiwi Mojito",
         "Passion Fruit Mocktail", "Peach Iced Tea Mocktail"])

    # ---- Detox and infused waters ----
    add(["Kombucha", "Detox Water", "Cucumber Infused Water", "Lemon Mint Infused Water",
         "Watermelon Infused Water", "Berry Infused Water"])

    # ---- Iced tea, a category the catalogue has only one generic entry for ----
    add(cross(["Lemon", "Peach", "Mango", "Green Apple", "Mint"], ["Iced Tea"]))

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
    print("candidates     : %d beverage/juice items" % len(rows))
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
