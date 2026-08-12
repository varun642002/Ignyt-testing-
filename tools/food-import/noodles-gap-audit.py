"""
Which NOODLE dishes is the catalogue missing?

Sibling of the other narrow-scope audits in this folder. Checked what already exists first, and
noodles turned out to be one of the most complete categories audited: 119 entries covering Hakka
Noodles by protein (Chicken/Egg/Gobi/Mushroom/Paneer/Prawn/Veg), Schezwan, Manchurian, Chowmein
by protein, Singapore, Chilli Garlic, Dan Dan, Pad Thai, Lo Mein, Yakisoba, Japchae, Cellophane,
Glass, Rice, Somen, Pho, Udon, Soba, Zucchini, Ramen (21 brand and flavour variants), and
Chopsuey. The real gap is small: Thukpa (the Tibetan/Northeast Indian noodle soup, a real and
popular dish with zero coverage) and a handful of Asian noodle formats the rest of the sweep
never reached.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/noodles-gap-audit.py
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
OUT = REPO / "noodles-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Thukpa: the Tibetan/Northeast Indian noodle soup, real and popular, zero coverage ----
    add(cross(["Thukpa"], ["Chicken", "Veg", "Vegetable", "Egg", "Mutton"], fmt="{m} {b}"))

    # ---- Asian noodle formats not yet in the catalogue ----
    add(["Chow Fun", "Pancit", "Drunken Noodles", "Chicken Chopsuey", "Bami Goreng",
         "Mie Goreng", "Bun Cha", "Naengmyeon", "Jjajangmyeon", "Char Kway Teow"])

    # ---- A few protein/style combinations the Hakka/Chowmein/Schezwan crosses missed ----
    add(["Chilli Garlic Chicken Noodles", "Butter Garlic Noodles", "Peri Peri Noodles",
         "Curry Noodles", "Coconut Curry Noodles"])

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
    print("candidates     : %d noodle items" % len(rows))
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
