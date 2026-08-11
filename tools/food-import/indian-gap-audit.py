"""
Which common Indian foods is the catalogue missing?

Builds a candidate pool of real Indian dish names, checks every one against
www/data/food/clean_foods.json, and writes the gaps to a CSV.

WHY GENERATED RATHER THAN TYPED. A hand-written list of a few hundred names is a list of what
the author happened to think of, and it will over-represent whatever they eat. Indian menus are
overwhelmingly COMBINATORIAL — a filling times a bread, a protein times a gravy style, a grain
times a preparation — so the combinations are enumerated from the parts. That covers the space
evenly and makes the omissions visible instead of accidental.

Only combinations that are real dishes are produced. The pairs are listed per base rather than
crossed blindly: "Paneer Kolhapuri" and "Mutton Kolhapuri" are both dishes, "Rasam Kolhapuri" is
not, so Kolhapuri appears against the proteins and gravies and nowhere else.

MATCHING IS THREE-WAY, because "is it in there" is not a yes/no question here:
    present   the exact name exists
    variant   something contains it or is one edit away — "Besan Laddu" for "Besan Ladoo".
              Reported separately because several of these are coincidences, not coverage:
              "Butter Naan" matching "Butter" tells the user nothing.
    MISSING   nothing resembling it

usage:  python tools/food-import/indian-gap-audit.py [--limit 2000]
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
OUT = REPO / "indian-foods-to-add.csv"


# SOME PAIRS ARE NOT DISHES, and a blind cross produces them confidently. A "lollipop" is a cut
# of chicken wing, so "Lollipop Mushroom" is nothing; katli is a nut fudge, so "Atta Katli" is
# nothing; "bath" is a specific set of Karnataka rice dishes, not a suffix for any grain. Each
# entry below restricts a style to the bases it is actually cooked with, and anything not listed
# is unrestricted. Without this roughly one candidate in eight is invented, which would put
# invented food in a list whose whole purpose is to be acted on.
ONLY_WITH = {
    "Lollipop":     {"Chicken"},
    "Katli":        {"Kaju", "Badam", "Pista"},
    "Bath":         {"Vangi", "Kesari", "Bisi Bele"},
    "Ishtu":        {"Chicken", "Mutton", "Vegetable", "Mixed Vegetable"},
    "Stew":         {"Chicken", "Mutton", "Vegetable", "Mixed Vegetable", "Fish"},
    "Xacuti":       {"Chicken", "Mutton", "Prawn", "Fish"},
    "Rogan Josh":   {"Mutton", "Chicken"},
    "Vindaloo":     {"Chicken", "Mutton", "Prawn", "Fish"},
    "Rumali":       {"Roti"},
    "Missi":        {"Roti"},
    "Lachha":       {"Paratha"},
    "Tandoori":     {"Roti", "Naan", "Chicken", "Paneer", "Fish", "Prawn", "Mushroom", "Aloo"},
    "Makki":        {"Roti"},
    "Saagwala":     {"Chicken", "Paneer", "Mutton"},
    "Tikka Masala": {"Chicken", "Paneer", "Soya", "Mushroom", "Egg"},
    "Chettinad":    {"Chicken", "Mutton", "Fish", "Prawn", "Egg", "Paneer", "Mushroom"},
    "Do Pyaza":     {"Chicken", "Mutton", "Paneer", "Egg", "Mushroom"},
    "Galouti":      {"Mutton"},
    "Seekh Kebab":  {"Chicken", "Mutton", "Paneer", "Soya"},
    "65":           {"Chicken", "Paneer", "Mushroom", "Gobi", "Egg", "Fish", "Prawn", "Baby Corn"},
    "Ghee Roast":   {"Chicken", "Mutton", "Prawn", "Mushroom", "Paneer"},
    "Malai":        {"Chicken", "Paneer", "Prawn", "Mutton"},
    "Nuggets":      {"Chicken", "Paneer", "Soya", "Veg"},
    "Popcorn":      {"Chicken", "Mushroom", "Paneer"},
    "Keema":        {"Mutton", "Chicken", "Soya"},
}


def plausible(base, mod):
    for style, allowed in ONLY_WITH.items():
        if style in (base, mod):
            other = mod if style == base else base
            if other not in allowed:
                return False
    return True


def cross(bases, mods, fmt="{m} {b}"):
    """Every modifier against every base, skipping pairs that are not real dishes."""
    return [fmt.format(m=m, b=b) for b in bases for m in mods if plausible(b, m)]


def build():
    out = []
    add = out.extend

    # ---- Breads. The filling x bread cross is the single densest part of an Indian menu ----
    breads = ["Paratha", "Naan", "Kulcha", "Roti", "Thepla", "Chapati", "Puri", "Bhakri"]
    fillings = ["Plain", "Butter", "Garlic", "Cheese", "Aloo", "Gobi", "Paneer", "Methi", "Mooli",
                "Onion", "Egg", "Keema", "Mixed Veg", "Palak", "Corn", "Chilli", "Masala",
                "Lachha", "Tandoori", "Rumali", "Missi", "Multigrain", "Wheat", "Jowar", "Bajra",
                "Ragi", "Makki"]
    add(cross(breads, fillings))
    add(["Bhatura", "Chole Bhature", "Puri Bhaji", "Poori Masala", "Appam", "Idiyappam", "Pathiri",
         "Malabar Parotta", "Kerala Porotta", "Sheermal", "Taftan", "Baqarkhani", "Luchi",
         "Radhaballavi", "Kachori", "Bedmi Puri", "Litti", "Baati", "Dal Baati", "Puran Poli",
         "Obbattu", "Holige", "Pesarattu", "Adai", "Uttapam", "Set Dosa", "Neer Dosa"])

    # ---- Dosa and idli, the South Indian breakfast core ----
    dosa_types = ["Plain", "Masala", "Rava", "Onion", "Ghee", "Paper", "Mysore Masala", "Egg",
                  "Cheese", "Butter", "Podi", "Set", "Neer", "Ragi", "Oats", "Wheat", "Moong Dal",
                  "Palak", "Beetroot", "Carrot", "Spring Onion", "Paneer", "Chicken", "Schezwan"]
    add(cross(["Dosa"], dosa_types))
    add(cross(["Idli"], ["Plain", "Rava", "Ghee", "Podi", "Kanchipuram", "Thatte", "Button",
                         "Ragi", "Oats", "Stuffed", "Fried", "Masala", "Sambar", "Mini"]))
    add(cross(["Vada"], ["Medu", "Masala", "Dahi", "Sambar", "Rasam", "Onion", "Keerai", "Thayir",
                         "Batata", "Sabudana", "Moong Dal", "Urad Dal"]))
    add(cross(["Uttapam"], ["Onion", "Tomato", "Mixed Veg", "Cheese", "Paneer", "Podi", "Rava"]))

    # ---- Rice: grain x preparation ----
    rice_forms = ["Rice", "Pulao", "Biryani", "Fried Rice", "Khichdi", "Bath"]
    rice_mods = ["Jeera", "Ghee", "Curd", "Lemon", "Tamarind", "Coconut", "Tomato", "Peas",
                 "Vegetable", "Mushroom", "Paneer", "Chicken", "Mutton", "Egg", "Prawn", "Fish",
                 "Soya", "Corn", "Schezwan", "Hyderabadi", "Lucknowi", "Thalassery", "Ambur",
                 "Kolkata", "Malabar", "Dum", "Kashmiri", "Methi", "Palak", "Beetroot", "Carrot",
                 "Mint", "Coriander", "Garlic", "Masala", "Brown", "Basmati", "Red"]
    add(cross(rice_forms, rice_mods))
    add(["Bisi Bele Bath", "Ven Pongal", "Sakkarai Pongal", "Puliyogare", "Chitranna",
         "Vangi Bath", "Kesari Bath", "Sambar Rice", "Rasam Rice", "Curd Rice", "Pakhala Bhata",
         "Ghee Rice", "Neychoru", "Kabsa", "Tehri", "Masala Khichdi", "Sabudana Khichdi"])

    # ---- Dals and legumes ----
    add(cross(["Dal", "Dal Tadka", "Dal Fry"], ["Toor", "Moong", "Masoor", "Chana", "Urad",
                                                "Mixed", "Panchmel", "Palak", "Methi"]))
    add(["Dal Makhani", "Dal Bukhara", "Dal Amritsari", "Sambar", "Rasam", "Kootu", "Poriyal",
         "Rajma", "Rajma Masala", "Chole", "Chana Masala", "Kala Chana", "Lobia", "Chawli",
         "Kadhi", "Punjabi Kadhi", "Gujarati Kadhi", "Sindhi Kadhi", "Kadhi Pakora", "Misal",
         "Usal", "Sprouts Usal", "Sundal", "Ghugni", "Ragda", "Pithla", "Zunka"])

    # ---- Gravies: protein x style ----
    proteins = ["Paneer", "Chicken", "Mutton", "Fish", "Prawn", "Egg", "Soya", "Mushroom",
                "Aloo", "Gobi", "Bhindi", "Baingan", "Kofta", "Chana", "Mixed Vegetable"]
    styles = ["Curry", "Masala", "Butter Masala", "Kadai", "Tikka Masala", "Do Pyaza", "Korma",
              "Chettinad", "Kolhapuri", "Rogan Josh", "Vindaloo", "Handi", "Lababdar", "Bhuna",
              "Saagwala", "Methi Malai", "Kali Mirch", "Achari", "Angara", "Shahi",
              "Malai", "Hyderabadi", "Kashmiri", "Mughlai", "Xacuti", "Ishtu", "Stew"]
    add(cross(proteins, styles, fmt="{b} {m}"))
    add(["Palak Paneer", "Matar Paneer", "Shahi Paneer", "Paneer Bhurji", "Malai Kofta",
         "Aloo Gobi", "Aloo Matar", "Aloo Jeera", "Baingan Bharta", "Bharwa Baingan",
         "Dum Aloo", "Kashmiri Dum Aloo", "Avial", "Thoran", "Olan", "Erissery", "Pachadi",
         "Kalan", "Theeyal", "Sambar Vada", "Undhiyu", "Sarson Ka Saag", "Makki Di Roti",
         "Litti Chokha", "Macher Jhol", "Doi Maach", "Chingri Malai Curry", "Shukto",
         "Aloo Posto", "Begun Bhaja", "Laal Maas", "Gatte Ki Sabzi", "Ker Sangri",
         "Kerala Fish Molee", "Meen Curry", "Chicken Stew", "Ishtu"])

    # ---- Tandoor and dry starters ----
    # fmt puts the PROTEIN first: these are "Chicken 65" and "Paneer Tikka", never "65 Chicken".
    add(cross(["Tikka", "Kebab", "Seekh Kebab", "Fry", "65", "Manchurian", "Chilli", "Pepper",
               "Roast", "Sukka", "Ghee Roast", "Lollipop", "Popcorn", "Nuggets"],
              ["Chicken", "Paneer", "Mutton", "Fish", "Prawn", "Soya", "Mushroom", "Gobi",
               "Baby Corn", "Egg"], fmt="{m} {b}"))
    add(["Tandoori Chicken", "Malai Tikka", "Reshmi Kebab", "Galouti Kebab", "Shami Kebab",
         "Hariyali Tikka", "Achari Tikka", "Amritsari Fish", "Koliwada Prawn"])

    # ---- Snacks, chaat and street ----
    add(cross(["Pakora", "Bhajji", "Bonda", "Cutlet", "Roll", "Frankie", "Momos", "Spring Roll",
               "Sandwich", "Toast", "Puff", "Samosa"],
              ["Onion", "Aloo", "Paneer", "Veg", "Chicken", "Egg", "Cheese", "Corn", "Mushroom",
               "Palak", "Bread", "Mirchi", "Keema", "Schezwan"]))
    add(["Vada Pav", "Pav Bhaji", "Misal Pav", "Dabeli", "Bhel Puri", "Pani Puri", "Sev Puri",
         "Dahi Puri", "Papdi Chaat", "Aloo Chaat", "Samosa Chaat", "Raj Kachori", "Dahi Vada",
         "Ragda Pattice", "Aloo Tikki", "Kathi Roll", "Egg Roll", "Chicken Roll", "Shawarma",
         "Dhokla", "Khaman", "Khandvi", "Fafda", "Jalebi Fafda", "Handvo", "Muthiya",
         "Patra", "Sabudana Vada", "Batata Vada", "Kanda Bhaji", "Medu Vada", "Masala Peanuts",
         "Chivda", "Poha Chivda", "Murukku", "Chakli", "Sev", "Farsan", "Mathri", "Namak Para"])

    # ---- Sweets ----
    add(cross(["Ladoo", "Barfi", "Halwa", "Kheer", "Payasam", "Peda", "Katli"],
              ["Besan", "Motichoor", "Rava", "Coconut", "Boondi", "Til", "Dry Fruit", "Kaju",
               "Badam", "Pista", "Gajar", "Lauki", "Moong Dal", "Sooji", "Atta", "Chocolate",
               "Milk", "Rice", "Semiya", "Ada", "Paal"]))
    add(["Gulab Jamun", "Rasgulla", "Rasmalai", "Jalebi", "Imarti", "Mysore Pak", "Sandesh",
         "Mishti Doi", "Chhena Poda", "Malpua", "Shrikhand", "Basundi", "Rabri", "Modak",
         "Kozhukattai", "Ariselu", "Gujiya", "Ghevar", "Balushahi", "Soan Papdi", "Petha",
         "Kalakand", "Milk Cake", "Sohan Halwa", "Double Ka Meetha", "Shahi Tukda", "Phirni",
         "Kulfi", "Falooda", "Payasam", "Ada Pradhaman", "Semiya Payasam", "Unniyappam",
         "Neyyappam", "Pal Payasam", "Elaneer Payasam"])

    # ---- Drinks ----
    add(["Masala Chai", "Adrak Chai", "Elaichi Chai", "Cutting Chai", "Filter Coffee",
         "Sweet Lassi", "Salted Lassi", "Mango Lassi", "Rose Lassi", "Chaas", "Buttermilk",
         "Nimbu Pani", "Shikanji", "Jaljeera", "Aam Panna", "Thandai", "Badam Milk",
         "Rooh Afza", "Sugarcane Juice", "Tender Coconut Water", "Sattu Drink", "Solkadhi",
         "Neer Mor", "Panakam", "Kokum Sharbat", "Bel Sharbat"])

    # ---- Regional plates and thalis ----
    add(["Veg Thali", "Non Veg Thali", "South Indian Thali", "Gujarati Thali", "Rajasthani Thali",
         "Punjabi Thali", "Bengali Thali", "Andhra Meals", "Kerala Sadya", "Mini Meals"])

    # ---- Everyday sabzis: the vegetable x preparation cross, which is most of a home menu ----
    veg = ["Aloo", "Gobi", "Bhindi", "Baingan", "Lauki", "Tinda", "Turai", "Parwal", "Karela",
           "Kaddu", "Arbi", "Jimikand", "Sem", "Guvar", "Tindora", "Beans", "Carrot", "Cabbage",
           "Cauliflower", "Capsicum", "Mushroom", "Palak", "Methi", "Sarson", "Cheera", "Drumstick",
           "Raw Banana", "Yam", "Sweet Potato", "Beetroot", "Peas", "Corn", "Soya Chunk"]
    add(cross(veg, ["Sabzi", "Fry", "Masala", "Curry", "Poriyal", "Thoran", "Kootu", "Bhaji",
                    "Sukhi Sabzi", "Gravy"], fmt="{b} {m}"))

    # ---- Accompaniments. Logged as often as the main dish and almost never catalogued ----
    add(cross(["Chutney"], ["Coconut", "Tomato", "Onion", "Mint", "Coriander", "Peanut", "Garlic",
                            "Tamarind", "Ginger", "Curry Leaf", "Green", "Red", "Dhaniya Pudina"]))
    add(cross(["Raita"], ["Boondi", "Cucumber", "Onion", "Mixed Veg", "Pineapple", "Aloo",
                          "Lauki", "Mint", "Pudina"]))
    add(cross(["Pickle"], ["Mango", "Lemon", "Chilli", "Mixed", "Garlic", "Amla", "Carrot"]))
    add(["Papad", "Fried Papad", "Roasted Papad", "Masala Papad", "Curd", "Dahi", "Plain Yogurt",
         "Ghee", "White Butter", "Podi", "Gunpowder", "Molaga Podi", "Sambar Powder"])

    # ---- Indo-Chinese, which is a fixture of Indian eating out ----
    add(cross(["Manchurian", "Chilli", "Schezwan", "Hakka Noodles", "Chowmein", "Fried Rice",
               "Manchow Soup", "Sweet Corn Soup", "Hot and Sour Soup"],
              ["Veg", "Chicken", "Paneer", "Gobi", "Mushroom", "Egg", "Prawn"], fmt="{m} {b}"))
    add(["Chilli Chicken Dry", "Chicken Lollipop", "Dragon Chicken", "American Chopsuey",
         "Veg Chopsuey", "Crispy Corn", "Honey Chilli Potato", "Paneer 65", "Chicken Manchow"])

    # ---- Eggs, which the catalogue is strong on but not for these ----
    add(["Egg Bhurji", "Egg Podimas", "Egg Roast", "Egg Masala", "Egg Ghotala", "Anda Curry",
         "Half Fry", "Full Fry", "Boiled Egg", "Poached Egg", "Scrambled Egg", "Egg White Omelette",
         "Masala Omelette", "Cheese Omelette", "Spanish Omelette", "Egg Kejriwal"])

    # ---- Millets and health staples, increasingly logged ----
    add(cross(["Ragi", "Bajra", "Jowar", "Foxtail Millet", "Little Millet", "Barnyard Millet",
               "Quinoa", "Oats", "Daliya"],
              ["Upma", "Dosa", "Idli", "Roti", "Khichdi", "Porridge", "Pongal"], fmt="{b} {m}"))
    add(["Ragi Malt", "Ragi Java", "Sattu Paratha", "Sattu Sharbat", "Moong Sprouts",
         "Chana Sprouts", "Boiled Chana", "Roasted Chana", "Peanut Chikki", "Til Chikki"])

    # ---- BBQ, grill and tandoor. Thin in the catalogue and heavily eaten out ----
    grill_styles = ["Barbeque", "BBQ", "Grilled", "Smoked", "Charcoal", "Tandoori", "Skewered",
                    "Peri Peri", "Lemon Pepper", "Garlic Butter"]
    grill_bases = ["Chicken", "Chicken Wings", "Chicken Breast", "Chicken Leg", "Mutton",
                   "Lamb Chops", "Fish", "Pomfret", "Surmai", "Prawn", "Squid", "Paneer",
                   "Mushroom", "Baby Corn", "Pineapple", "Vegetables", "Soya Chaap"]
    add(cross(grill_bases, grill_styles, fmt="{m} {b}"))
    add(["Tandoori Platter", "Mixed Grill", "Sheekh Roll", "Chicken Tangdi", "Tangdi Kebab",
         "Bihari Kebab", "Kakori Kebab", "Boti Kebab", "Chapli Kebab", "Hariyali Kebab",
         "Malai Soya Chaap", "Tandoori Soya Chaap", "Afghani Chicken", "Murgh Malai Tikka",
         "Fish Tikka", "Prawn Tikka", "Paneer Tikka Roll", "Chicken Shashlik", "Veg Shashlik"])

    # ---- Biryani, in the regional detail people actually search by ----
    add(cross(["Biryani"], ["Hyderabadi", "Lucknowi", "Awadhi", "Kolkata", "Thalassery", "Ambur",
                            "Dindigul", "Donne", "Bhatkali", "Sindhi", "Memoni", "Kalyani",
                            "Beary", "Malabar", "Bombay", "Mughlai", "Kacchi", "Pakki", "Dum",
                            "Boneless", "Keema", "Kofta", "Jackfruit", "Mushroom", "Prawn",
                            "Fish", "Egg", "Paneer", "Soya", "Veg", "Chicken", "Mutton"]))
    add(["Biryani Rice", "Biryani Gravy", "Mirchi Ka Salan", "Dahi Chutney", "Raita for Biryani",
         "Biryani Handi", "Family Pack Biryani"])

    # ---- Gravies people order by name rather than by protein ----
    add(["Makhani Gravy", "White Gravy", "Onion Tomato Gravy", "Cashew Gravy", "Green Gravy",
         "Kadai Gravy", "Kolhapuri Gravy", "Chettinad Gravy", "Salan", "Korma Gravy",
         "Butter Gravy", "Tikka Gravy", "Hyderabadi Gravy", "Coconut Gravy", "Mughlai Gravy"])

    # ---- Sweets and snacks the earlier pass under-covered ----
    add(["Gajar Halwa", "Moong Dal Halwa", "Badam Halwa", "Kashi Halwa", "Wheat Halwa",
         "Tirunelveli Halwa", "Karachi Halwa", "Bombay Halwa", "Anjeer Barfi", "Pista Roll",
         "Kaju Roll", "Kaju Pista Roll", "Dry Fruit Ladoo", "Rava Ladoo", "Til Ladoo",
         "Coconut Ladoo", "Ellu Urundai", "Ragi Ladoo", "Nariyal Barfi", "Chocolate Barfi",
         "Ice Halwa", "Bal Mithai", "Singori", "Chikki", "Gud Patti", "Rewri", "Gajak",
         "Murmura Ladoo", "Puffed Rice Ladoo", "Sev Barfi"])
    add(["Masala Puri", "Churmuri", "Congress Kadalekai", "Nippattu", "Kodubale", "Ribbon Pakoda",
         "Thattai", "Seedai", "Mixture", "Bombay Mix", "Aloo Bhujia", "Moong Dal Namkeen",
         "Masala Corn", "Corn Chaat", "Peanut Chaat", "Sprouts Chaat", "Fruit Chaat",
         "Paneer Tikka Sandwich", "Bombay Sandwich", "Grilled Sandwich", "Club Sandwich",
         "Veg Puff", "Egg Puff", "Chicken Puff", "Cheese Puff", "Pizza Puff"])

    seen, uniq = set(), []
    for n in out:
        n = re.sub(r"\s+", " ", n).strip()
        k = n.lower()
        if k not in seen:
            seen.add(k); uniq.append(n)
    return uniq


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=2000)
    args = ap.parse_args()

    doc = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    names = [f["name"] for f in doc["foods"]]
    low = [n.lower() for n in names]
    have = set(low)

    def status(q):
        ql = q.lower()
        if ql in have:
            return "present", q
        sub = [names[i] for i, x in enumerate(low) if ql in x or x in ql]
        if sub:
            return "variant", sorted(sub, key=len)[0]
        near = difflib.get_close_matches(q, names, n=1, cutoff=0.86)
        return ("variant", near[0]) if near else ("MISSING", "")

    pool = build()[:args.limit]
    rows = []
    for q in pool:
        st, m = status(q)
        rows.append({"food": q, "status": st, "closest_in_catalogue": m})

    miss = [r for r in rows if r["status"] == "MISSING"]
    var = [r for r in rows if r["status"] == "variant"]
    print("catalogue      : %d foods" % len(names))
    print("candidates     : %d common Indian dishes" % len(rows))
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
