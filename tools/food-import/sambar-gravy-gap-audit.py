"""
Which SAMBAR and GRAVY varieties is the catalogue missing?

Narrow, focused sibling of the other audits in this folder: just these two categories, done
properly, rather than folded into a broader regional sweep. A previous import already added most
of the common sambar variants (35 already in the catalogue when this was written) and a wide set
of vegetable/protein gravies (71 already present), so this generates the REMAINING real gap --
restaurant "base gravy" names (Kadai, Korma, Rogan Josh...) and sambar variants by vegetable or
regional style that a full-scale kitchen or restaurant database still needs.

MATCHING IS THREE-WAY, same as the other audits here:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence (a bare "Gravy" entry existing does not mean "Kadai Gravy" is covered)
    MISSING   nothing resembling it

usage:  python tools/food-import/sambar-gravy-gap-audit.py
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
OUT = REPO / "sambar-gravy-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Sambar: vegetable-led variants beyond what the last import already added ----
    sambar_veg = ["Tomato", "Carrot", "Beans", "Potato", "Urulaikizhangu", "Beetroot",
                  "Chow Chow", "Ridge Gourd", "Peerkangai", "Raw Banana", "Vazhaikkai",
                  "Vazhaithandu", "Banana Stem", "Sundakkai", "Manathakkali", "Yam", "Chena",
                  "Bottle Gourd", "Snake Gourd", "Ash Gourd", "Cluster Beans", "Broad Beans",
                  "Cabbage", "Cauliflower", "Capsicum", "Spinach", "Colocasia", "Suran"]
    add(cross(sambar_veg, ["Sambar"], fmt="{b} {m}"))

    # ---- Sambar: named regional and style variants ----
    add(["No Onion No Garlic Sambar", "Temple Style Sambar", "Kerala Style Sambar",
         "Kongunadu Sambar", "Palakkad Sambar", "Milagu Sambar", "Pepper Sambar",
         "Thakkali Sambar", "Paruppu Sambar", "Yellow Sambar", "Restaurant Style Sambar",
         "Chettinad Style Sambar", "Coimbatore Sambar", "Madurai Sambar", "Sambar Powder Mix",
         "Instant Sambar Mix", "Sambar Masala", "Vengaya Sambar Chettinad", "Elai Sambar",
         "Banana Leaf Sambar", "Curry Leaf Sambar", "Nei Sambar", "Ghee Sambar"])

    # ---- Gravy: the restaurant "base gravy" names, made and stored ahead of the protein
    # that goes into them -- a real, distinct category in commercial and cloud kitchens ----
    gravy_styles = ["Kadai", "Korma", "Butter", "Butter Masala", "Tikka", "Tikka Masala",
                     "Hyderabadi", "Malabar", "Rassa", "Handi", "Lababdar", "Shahi", "Rara",
                     "Do Pyaza", "Bhuna", "Achari", "Angara", "Saagwala", "Methi Malai",
                     "Kali Mirch", "Malai", "Rogan Josh", "Xacuti", "Goan", "Andhra", "Kerala",
                     "Awadhi", "Rajasthani", "Punjabi", "Restaurant Style", "Dhaba Style",
                     "Peshawari", "Lahsuni", "Pahadi", "Sindhi", "Kashmiri", "Nizami",
                     "Kalimirch", "Kolhapuri Style", "Chettinad Style", "Manchurian Style",
                     "Salan", "Yellow", "Orange", "Basic", "Base", "Five Star", "Restaurant"]
    add(cross(gravy_styles, ["Gravy"], fmt="{b} {m}"))

    # ---- Gravy: a few named combos sold and logged as one item ----
    add(["Mughlai Base Gravy", "Punjabi Restaurant Gravy", "Chinese Style Gravy",
         "Continental Brown Gravy", "Vegetable Gravy Base", "Non Veg Gravy Base",
         "Paneer Gravy Base", "Chicken Gravy Base", "Ready Curry Gravy"])

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
    print("candidates     : %d sambar/gravy items" % len(rows))
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
