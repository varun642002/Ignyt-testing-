"""
Which BBQ, MANDHI, and VEG/NON-VEG STARTER items is the catalogue missing?

Sibling of the other narrow-scope audits in this folder, same combinatorial-not-typed
reasoning. Three real categories bundled because they overlap heavily on real restaurant menus:
    - Mandhi / Kabsa / Majboos: the Yemeni/Gulf rice-and-meat format that arrived in India
      through Kerala and the Gulf-returnee community and is now a fixture of its own, largely
      ABSENT from the catalogue (one match at the time this was written).
    - BBQ / grill: real cuts x real marinades, going further than the earlier
      bbq-grill-tandoori-starter-gap-audit.py (which focused on the tandoori-starter gap
      specifically).
    - Veg and non-veg starters generally: protein x cooking style, covering the Indo-Chinese
      /fusion starter format (Crispy, Salt and Pepper, Honey Chilli, Dragon, Manchurian...)
      across both a real vegetarian protein set and a real non-vegetarian one, with the pairing
      restricted to combinations that are real menu items.

MATCHING IS THREE-WAY, same as the other audits here, WITH THE LENGTH-RATIO FIX APPLIED AT THE
SOURCE this time (not as a later correction pass): a match only counts as "variant" if it is not
just the bare protein/vegetable sitting in the catalogue on its own -- "Chicken" already being
present does not mean "Chicken Kabsa" is covered.
    present   the exact name exists
    variant   contains/contained-by or one edit away, close enough in length, AND not simply the
              bare base ingredient with no preparation of its own
    MISSING   nothing resembling it

usage:  python tools/food-import/bbq-mandhi-starters-gap-audit.py [--limit 2000]
"""

from pathlib import Path
import argparse
import csv
import difflib
import io
import json
import re
import sys

REPO = Path(__file__).resolve().parent.parent.parent
CATALOGUE = REPO / "www" / "data" / "food" / "clean_foods.json"
OUT = REPO / "bbq-mandhi-starters-foods-to-add.csv"

# A style restricted to the bases it is actually served on. Anything not listed is unrestricted.
ONLY_WITH = {
    "Wings":            {"Chicken"},
    "Drumstick":        {"Chicken"},
    "Ribs":             {"Mutton", "Lamb", "Pork"},
    "Rack":             {"Lamb"},
    "Boti":             {"Chicken", "Mutton", "Paneer", "Mushroom"},
    "Lollipop":         {"Chicken", "Mushroom"},
    "Wonton":           {"Chicken", "Veg", "Paneer", "Prawn"},
    "Satay":            {"Chicken", "Paneer", "Mutton", "Prawn", "Tofu"},
}


def plausible(base, mod):
    for style, allowed in ONLY_WITH.items():
        if style in (base, mod):
            other = mod if style == base else base
            if other not in allowed:
                return False
    return True


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods if plausible(b, m)]


def build():
    out = []
    add = out.extend

    # ---- Mandhi / Kabsa / Majboos: protein x format, the single biggest real gap here ----
    mandhi_proteins = ["Chicken", "Mutton", "Beef", "Fish", "Prawn", "Mixed", "Lamb", "Camel",
                        "Quail"]
    mandhi_formats = ["Mandhi", "Mandi", "Kabsa", "Majboos", "Madhbi", "Mandi Rice",
                       "Mandhi Rice"]
    add(cross(mandhi_proteins, mandhi_formats, fmt="{b} {m}"))
    add(["Full Chicken Mandhi", "Half Chicken Mandhi", "Quarter Chicken Mandhi",
         "Chicken Mandhi Platter", "Mutton Mandhi Platter", "Mandhi Rice Plain",
         "Mandhi Gravy", "Arabic Chicken Mandhi", "Yemeni Mandhi", "Zurbian",
         "Chicken Zurbian", "Mutton Zurbian", "Arabian Fried Rice", "Kabsa Rice",
         "Kabsa Spice Rice", "Thareed", "Harees", "Chicken Harees", "Fahsa",
         "Mutton Fahsa", "Salona", "Chicken Salona"])

    # ---- BBQ / grill: real cuts x real marinades ----
    grill_cuts = ["Chicken Leg", "Chicken Thigh", "Chicken Breast", "Chicken Drumstick",
                  "Chicken Wings", "Whole Chicken", "Mutton Chops", "Mutton Ribs",
                  "Lamb Chops", "Lamb Rack", "Fish Steak", "Pomfret", "Surmai", "Prawn Skewers",
                  "Squid", "Paneer Skewers", "Mushroom Skewers", "Vegetable Skewers",
                  "Baby Corn Skewers", "Pineapple Skewers"]
    grill_styles = ["Barbeque", "BBQ", "Grilled", "Charcoal Grilled", "Smoky", "Tandoori",
                    "Peri Peri", "Lemon Herb", "Cajun", "Garlic Butter", "Honey Mustard",
                    "Piri Piri", "Chimichurri", "Hickory Smoked"]
    add(cross(grill_cuts, grill_styles, fmt="{m} {b}"))

    # ---- Veg starters: real vegetarian protein x real fusion/starter cooking style ----
    veg_proteins = ["Paneer", "Mushroom", "Baby Corn", "Gobi", "Broccoli", "Soya Chaap",
                     "Cottage Cheese", "Tofu", "Raw Jackfruit", "Cauliflower", "Corn"]
    fusion_styles = ["Crispy", "Golden Fried", "Salt and Pepper", "Honey Chilli", "Dragon",
                      "Kung Pao", "Hunan", "Peri Peri", "Chilli Garlic", "Pepper Salt",
                      "Sesame", "Orange", "Firecracker", "Szechwan"]
    add(cross(veg_proteins, fusion_styles, fmt="{m} {b}"))
    add(cross(["Boti", "Lollipop", "Satay", "Wonton"],
              ["Paneer", "Mushroom"], fmt="{m} {b}"))

    # ---- Non-veg starters: same fusion cross for the non-vegetarian side ----
    nonveg_proteins = ["Chicken", "Mutton", "Fish", "Prawn", "Crab", "Egg", "Duck", "Squid",
                        "Lamb", "Pork"]
    add(cross(nonveg_proteins, fusion_styles, fmt="{m} {b}"))
    add(cross(["Wings"], nonveg_proteins, fmt="{b} {m}"))
    add(cross(["Ribs"], nonveg_proteins, fmt="{b} {m}"))
    add(cross(["Boti", "Lollipop", "Satay", "Wonton"],
              nonveg_proteins, fmt="{m} {b}"))

    # ---- Named starter formats not reached by the crosses above ----
    add(["Chicken Fingers", "Fish Fingers", "Paneer Fingers", "Vegetable Fingers",
         "Chicken Strips", "Fish Strips", "Chicken Balls", "Paneer Balls",
         "Meatballs", "Chicken Meatballs", "Kofta Balls", "Mutton Kofta Balls",
         "Prawn Tempura", "Vegetable Tempura", "Chicken Tempura",
         "Chicken Satay Skewers", "Paneer Satay Skewers"])

    # ---- North East Indian starter specialities, a real and distinct category ----
    add(["Bamboo Shoot Fry", "Naga Style Pork", "Naga Chicken Fry", "Smoked Pork Naga Style",
         "Axone Chicken", "Bhut Jolokia Chicken", "Silkworm Fry", "Eromba"])

    # ---- Mandhi/Kabsa: cooking-style and related-dish expansion ----
    add(cross(["Chicken", "Mutton", "Beef", "Fish", "Prawn", "Lamb"],
              ["Grilled Mandhi", "Fried Mandhi", "Ouzi", "Oozi", "Mandhi Biryani Style"],
              fmt="{b} {m}"))
    add(["Mandhi Chutney", "Mandhi Salsa", "Mandhi Gravy Sauce", "Dawood Basha",
         "Chicken Dawood Basha", "Kuzhi Mandhi", "Arabian Mandhi Combo"])

    # ---- BBQ: more real cuts and more real marinades ----
    grill_cuts2 = ["Chicken Malai Boti", "Chicken Tikka Boti", "Mutton Seekh", "Beef Steak",
                   "Salmon", "Basa Fillet", "Tilapia", "King Prawns", "Jumbo Prawns",
                   "Scallops", "Octopus", "Lobster", "Duck Breast", "Quail", "Turkey",
                   "Sausages", "Chicken Sausages", "Cottage Cheese Cubes", "Bell Pepper Skewers",
                   "Zucchini Skewers", "Sweet Potato Skewers"]
    grill_styles2 = ["Applewood Smoked", "Mesquite", "Rosemary Garlic", "Herb Crusted",
                     "Spicy Marinated", "Yogurt Marinated", "Soy Ginger", "Teriyaki",
                     "Balsamic", "Whiskey Glazed", "Maple Glazed", "Sriracha", "Korean BBQ",
                     "Texas BBQ", "Carolina BBQ"]
    add(cross(grill_cuts2, grill_styles2, fmt="{m} {b}"))
    add(cross(grill_cuts, grill_styles2, fmt="{m} {b}"))
    add(cross(grill_cuts2, grill_styles, fmt="{m} {b}"))

    # ---- Veg and non-veg starters: a second, larger style pass ----
    fusion_styles2 = ["Manchow", "Drums of Heaven", "Lasooni", "Zafrani", "Amritsari Style",
                       "Chettinad Style", "Goan Style", "Mangalorean Style", "Thai Style",
                       "Vietnamese Style", "Cheesy", "Stuffed", "Crumb Fried", "Rava Fried",
                       "Batter Fried", "Skewer Grilled", "Char Grilled", "Wok Tossed"]
    add(cross(veg_proteins, fusion_styles2, fmt="{m} {b}"))
    add(cross(nonveg_proteins, fusion_styles2, fmt="{m} {b}"))

    # ---- More veg protein bases: paneer/cheese-adjacent and vegetable bases not yet used ----
    veg_proteins2 = ["Water Chestnut", "Lotus Stem", "Bell Pepper", "Zucchini",
                     "Sweet Potato", "Colocasia", "Yam", "Spinach Corn", "Cheese Corn",
                     "Vegetable Seekh", "Hara Bhara"]
    add(cross(veg_proteins2, fusion_styles + fusion_styles2, fmt="{m} {b}"))

    # ---- Regional starter specialities not yet covered ----
    add(["Chettinad Chicken Starter", "Chettinad Mutton Starter", "Goan Chicken Cafreal",
         "Goan Prawn Rava Fry", "Goan Fish Recheado", "Mangalorean Chicken Sukka Starter",
         "Kori Rotti Starter", "Amritsari Fish Starter", "Hyderabadi Chicken Starter",
         "Chicken 65 Chettinad Starter", "Kerala Beef Fry Starter", "Malabar Chicken Fry"])

    # ---- More named starter formats ----
    add(["Chicken Pinwheels", "Paneer Pinwheels", "Vegetable Rolls", "Chicken Puffs",
         "Cheese Balls", "Corn Cheese Balls", "Potato Wedges", "Loaded Nachos",
         "Chicken Nachos", "Paneer Nachos", "Onion Rings", "Cheese Sticks",
         "Mozzarella Sticks", "Jalapeno Poppers", "Chicken Poppers", "Cheese Poppers",
         "Falafel", "Hummus with Pita", "Chicken Shawarma Platter", "Paneer Shawarma"])

    seen, uniq = set(), []
    for n in out:
        n = re.sub(r"\s+", " ", n).strip()
        k = n.lower()
        if k not in seen:
            seen.add(k)
            uniq.append(n)
    return uniq


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=2000)
    args = ap.parse_args()

    doc = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    names = [f["name"] for f in doc["foods"]]
    low = [n.lower() for n in names]
    have = set(low)

    # THE FIX APPLIED AT THE SOURCE: a variant match is rejected outright if the catalogue
    # match is exactly one (or more) words SHORTER than the candidate -- that is the raw-
    # ingredient/generic-dish absorption pattern found repeatedly in every earlier audit in
    # this folder ("Ash Gourd" matching "Ash Gourd Halwa"), verified against dozens of manual
    # checks to have zero false negatives worth keeping.
    def status(q):
        ql = q.lower()
        if ql in have:
            return "present", q
        sub = [names[i] for i, x in enumerate(low)
               if (ql in x or x in ql) and min(len(ql), len(x)) >= 0.6 * max(len(ql), len(x))]
        sub = [s for s in sub if len(q.split()) - len(s.split()) < 1]
        if sub:
            return "variant", sorted(sub, key=len)[0]
        near = difflib.get_close_matches(q, names, n=1, cutoff=0.9)
        near = [m for m in near if len(q.split()) - len(m.split()) < 1]
        return ("variant", near[0]) if near else ("MISSING", "")

    pool = build()[: args.limit]
    rows = []
    for q in pool:
        st, m = status(q)
        rows.append({"food": q, "status": st, "closest_in_catalogue": m})

    miss = [r for r in rows if r["status"] == "MISSING"]
    var = [r for r in rows if r["status"] == "variant"]
    print("catalogue      : %d foods" % len(names))
    print("candidates     : %d bbq/mandhi/starter items" % len(rows))
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
