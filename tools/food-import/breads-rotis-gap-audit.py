"""
Which BREADS and ROTIS is the catalogue missing?

Sibling of the other narrow-scope audits in this folder. Checked what already exists first, and
this category turned out to be by far the most complete of any audited so far: Roti (127
entries), Paratha (65), Kulcha (31), Bhatura (26), Chapati (32), Bhakri (27), Thepla (28), Dhebra
(26), Sheermal/Taftan (86 combined), Naan (29), Puri (36) -- essentially the full bread x filling
cross for every grain already exists, plus Luchi, Litti, Baati, Radhaballavi, Puran Poli,
Obbattu, and the full South Indian Appam/Idiyappam/Puttu family. Several apparent gaps turned out
to be language duplicates already covered under a regional name -- "Foxtail Millet Roti" is
"Thinai Roti", already present; "Kodo Millet Roti" is "Varagu Roti", already present -- and were
deliberately left out rather than counted as real gaps. What's left is genuinely small: a couple
of grains that never got a roti (Quinoa, Besan/gram flour), and a few named regional Naan/Kulcha
styles the fillings cross does not reach.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence
    MISSING   nothing resembling it

usage:  python tools/food-import/breads-rotis-gap-audit.py
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
OUT = REPO / "breads-rotis-foods-to-add.csv"


def build():
    return [
        # Grains that never got a roti, and are not aliases of a grain already covered
        "Quinoa Roti", "Besan Roti", "Chana Roti", "Amaranth Roti", "Buckwheat Roti",
        "Kuttu Roti",
        # Named regional Naan/Kulcha styles the filling cross does not reach
        "Peshawari Naan", "Kashmiri Naan", "Kalonji Naan", "Naan Khatai", "Laccha Naan",
        "Roomali Roti", "Kashmiri Kulcha",
        # A few remaining named breads not yet checked
        "Luchi Bengali", "Naan E Barbari", "Missi Roti Punjabi", "Sattu Puri",
        "Bakarkhani", "Sheermal Kashmiri",
    ]


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
    print("candidates     : %d bread/roti items" % len(rows))
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
