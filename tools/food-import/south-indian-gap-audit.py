"""
Which common SOUTH INDIAN foods is the catalogue missing?

Same approach as indian-gap-audit.py, scoped to the four southern cuisines (Tamil Nadu,
Kerala, Karnataka/Udupi/Coorg, Andhra & Telangana) instead of pan-India. Reuses that script's
reasoning: a hand-typed list over-represents whatever the author happened to think of, so the
pool is built COMBINATORIALLY from real parts -- a base dish times its real regional/style
variants, a vegetable times its real preparation -- and only pairs that are actual dishes are
kept. Every candidate is then checked against the real catalogue so "missing" means genuinely
absent, not just absent from this script's imagination.

MATCHING IS THREE-WAY, same as indian-gap-audit.py:
    present   the exact name exists
    variant   something contains it, is contained by it, or is one edit away
    MISSING   nothing resembling it

usage:  python tools/food-import/south-indian-gap-audit.py [--limit 2500]
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
OUT = REPO / "south-indian-foods-to-add.csv"


# Restricts a style/suffix to the bases it is actually cooked with. Anything not listed here is
# unrestricted. Without this, crossing every style against every base invents dishes that do not
# exist -- "Rasam Dosa" is nothing, "Kalan" is only ever made with yam and plantain, and "Ghee
# Roast" off the Mangalore menu is only ever chicken, prawns, mutton or paneer.
ONLY_WITH = {
    "Kalan":            {"Yam", "Raw Banana", "Yam Raw Banana"},
    "Theeyal":          {"Vegetable", "Drumstick", "Brinjal", "Ladies Finger", "Chicken", "Mutton"},
    "Erissery":         {"Pumpkin", "Yam", "Chena", "Vanpayar"},
    "Olan":             {"Ash Gourd", "White Pumpkin", "Black Eyed Peas"},
    "Ghee Roast":       {"Chicken", "Mutton", "Prawn", "Paneer", "Mushroom", "Kori"},
    "Sukka":            {"Chicken", "Mutton", "Prawn", "Kori", "Squid", "Egg"},
    "Varutharacha":     {"Chicken", "Mutton", "Fish", "Prawn", "Vegetable", "Kadala"},
    "Pollichathu":      {"Fish", "Karimeen", "Chicken", "Prawn"},
    "Moilee":           {"Fish", "Prawn", "Egg", "Chicken", "Vegetable"},
    "Kuzhambu":         {"Vatha", "Kara", "Poricha", "Milagu", "Kathirikai", "Vendakkai", "Puli",
                          "Mor", "Kootan", "Ennai", "Nellikai", "Manathakkali", "Vazhaithandu"},
    "Pachadi":          {"Pineapple", "Beetroot", "Cucumber", "Mango", "Pumpkin", "Vellarikka",
                          "Kaya", "Tomato"},
    "Pandi":            {"Curry", "Fry"},
    "Bath":             {"Vangi", "Kesari", "Bisi Bele", "Puliyogare", "Tomato", "Coconut",
                          "Kara", "Ellu", "Khara"},
    "Rotti":            {"Kori", "Neer", "Akki", "Sajjige"},
    "Buns":             {"Mangalore", "Coorgi"},
    "65":               {"Chicken", "Gobi", "Mushroom", "Baby Corn", "Fish", "Paneer", "Prawn"},
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

    # ---- Dosa: the single densest South Indian category, by grain/filling/technique ----
    dosa_mods = ["Plain", "Sada", "Ghee", "Butter", "Masala", "Mysore Masala", "Onion",
                 "Onion Rava", "Rava", "Paper", "Podi", "Set", "Neer", "Kal Dosa", "Adai",
                 "Pesarattu", "Moong Dal", "Urad Dal", "Ragi", "Oats", "Wheat", "Jowar", "Bajra",
                 "Foxtail Millet", "Kambu", "Cheese", "Egg", "Chicken", "Paneer", "Schezwan",
                 "Spring Onion", "Beetroot", "Carrot", "Palak", "Tomato", "Karam", "Kara",
                 "Amritsari Style", "Semiya", "Vermicelli", "Instant", "Wheat Rava", "Sanna"]
    add(cross(["Dosa"], dosa_mods, fmt="{m} {b}"))
    add(["Uzhunnu Dosa", "Appam Dosa", "Kavuni Dosa", "Black Rice Dosa", "Thinai Dosa",
         "Kambu Dosa", "Multigrain Dosa", "Dosa Sandwich", "Chocolate Dosa", "Ghee Podi Dosa",
         "Andhra Pesarattu Upma"])

    # ---- Idli: steaming, grain and stuffing ----
    idli_mods = ["Plain", "Rava", "Ghee Roast", "Podi", "Kanchipuram", "Thatte", "Button",
                 "Mini", "Stuffed", "Fried", "Masala", "Sambar", "Ragi", "Oats", "Millet",
                 "Vegetable", "Kara", "Chilli", "Vermicelli", "Sanna", "Idiyappam Style",
                 "Instant", "Uzhunnu"]
    add(cross(["Idli"], idli_mods, fmt="{m} {b}"))
    add(["Idli Upma", "Idli Manchurian", "Idli Fry", "Idli Sambar Combo", "Kadubu",
         "Ellu Idli", "Rava Idli Sambar", "Podi Idli"])

    # ---- Vada: pulse, shape and accompaniment ----
    vada_mods = ["Medu", "Ulundu", "Masala", "Dahi", "Sambar", "Rasam", "Mor", "Thayir",
                 "Onion", "Keerai", "Batata", "Sabudana", "Moong Dal", "Paruppu", "Masala Vadai",
                 "Cabbage", "Mysore Bonda", "Paruppu Urundai", "Punugulu"]
    add(cross(["Vada"], vada_mods, fmt="{m} {b}"))
    add(["Vadai", "Adai Aviyal", "Uzhunnu Vada", "Parippu Vada", "Chatti Pathiri"])

    # ---- Uttapam and other tiffin ----
    add(cross(["Uttapam"], ["Onion", "Tomato", "Mixed Vegetable", "Cheese", "Paneer", "Podi",
                            "Rava", "Coconut", "Chilli", "Corn"], fmt="{m} {b}"))
    add(["Pathiri", "Ari Pathiri", "Chatti Pathiri", "Kallappam", "Vellayappam", "Paalappam",
         "Egg Appam", "Sweet Appam", "Kappa Puzhukku", "Kozhukattai Puzhukku"])

    # ---- Appam, Idiyappam, Puttu -- Kerala tiffin core ----
    add(cross(["Appam"], ["Plain", "Sweet", "Egg", "Palappam", "Vellayappam", "Kallu"],
              fmt="{m} {b}"))
    add(cross(["Idiyappam"], ["Plain", "Sweet", "Coconut", "Egg", "Vegetable"], fmt="{m} {b}"))
    add(cross(["Puttu"], ["Rice", "Wheat", "Ragi", "Vegetable", "Chembu", "Kadala Curry"],
              fmt="{b} {m}"))
    add(["Puttu Kadala Curry", "Puttu Pappadam", "Puttu Banana", "Ada Payasam Puttu"])

    # ---- Upma / Pongal / Khichdi tiffin ----
    add(cross(["Upma"], ["Rava", "Semiya", "Vermicelli", "Bread", "Oats", "Ragi", "Millet",
                         "Vegetable", "Onion", "Tomato", "Khara Bath"], fmt="{m} {b}"))
    add(cross(["Pongal"], ["Ven", "Sakkarai", "Khara", "Milagu", "Ghee", "Vegetable"],
              fmt="{m} {b}"))
    add(["Kesari Bath", "Khara Bath Kesari Bath Combo", "Semiya Kesari", "Rava Kesari",
         "Pineapple Kesari", "Milagu Pongal"])

    # ---- Rice: South Indian tamarind/curd/lemon/coconut variety ----
    rice_mods = ["Sambar", "Rasam", "Curd", "Thayir Sadam", "Lemon", "Elumichai", "Tamarind",
                 "Puliyodarai", "Puliyogare", "Coconut", "Thengai Sadam", "Tomato", "Mango",
                 "Mangai", "Ellu", "Gasagase", "Vangi Bath", "Kara Sadam", "Bisi Bele Bath",
                 "Kesari Bath", "Chitranna", "Bagalabath", "Curry Leaf", "Karuveppilai",
                 "Ginger", "Inji", "Beetroot", "Vegetable", "Kalyana", "Coconut Milk",
                 "Ghee", "Nei Sadam", "Pepper Garlic", "Menthya", "Yellu"]
    add(cross(["Rice", "Sadam", "Anna"], rice_mods, fmt="{m} {b}"))
    add(["Sambar Sadam", "Rasam Sadam", "Thayir Sadam", "Puliyodarai", "Puliyogare",
         "Chitranna", "Bisi Bele Bath", "Vangi Bath", "Kesari Bath", "Kara Sadam",
         "Ven Pongal", "Sakkarai Pongal", "Curd Rice", "Kalyana Rasam", "Neychoru",
         "Ghee Rice", "Kabsa Rice", "Elaneer Payasam", "Mor Kootan", "Erachi Choru",
         "Kappa Meen Curry", "Kanji Payar"])

    # ---- Sambar, Rasam, Kuzhambu: the everyday South Indian gravy layer ----
    add(cross(["Sambar"], ["Arachuvitta", "Vengaya", "Poricha", "Kara", "Hotel Style",
                           "Udupi Style", "Drumstick", "Brinjal", "Ladies Finger", "Pumpkin",
                           "Radish", "Mixed Vegetable", "Small Onion", "Idli Sambar"],
              fmt="{m} {b}"))
    add(cross(["Rasam"], ["Milagu", "Pepper", "Garlic", "Poondu", "Tomato", "Lemon",
                          "Elumichai", "Mysore", "Kalyana", "Pineapple", "Jeera", "Rasavangi",
                          "Paruppu", "Kollu", "Horse Gram", "Manathakkali"], fmt="{m} {b}"))
    add(cross(["Kuzhambu"], ["Vatha", "Kara", "Poricha", "Milagu", "Kathirikai", "Vendakkai",
                             "Puli", "Mor", "Kootan", "Ennai", "Nellikai", "Manathakkali",
                             "Vazhaithandu"], fmt="{m} {b}"))
    add(["Mor Kuzhambu", "Vatha Kuzhambu", "Kara Kuzhambu", "Poricha Kuzhambu",
         "Kathirikai Kuzhambu", "Vendakkai Kuzhambu", "Puli Kuzhambu", "Ennai Kathirikai",
         "Nellikai Kuzhambu", "Manathakkali Kuzhambu", "Pirandai Kuzhambu"])

    # ---- Kootu, Poriyal, Thoran, Palya: vegetable x preparation ----
    veg = ["Cabbage", "Carrot", "Beans", "Beetroot", "Cauliflower", "Cheera", "Spinach",
           "Ladies Finger", "Bhindi", "Vendakkai", "Brinjal", "Kathirikai", "Yam", "Chena",
           "Raw Banana", "Vazhakkai", "Drumstick", "Murungakkai", "Snake Gourd", "Pudalangai",
           "Bottle Gourd", "Sorekai", "Ridge Gourd", "Peerkangai", "Ash Gourd", "Chow Chow",
           "Chayote", "Beans Carrot", "Mixed Vegetable", "Papaya", "Pumpkin", "Manjal Poosanikai",
           "Vazhaithandu", "Banana Stem", "Cluster Beans", "Kothavarangai"]
    add(cross(veg, ["Poriyal", "Thoran", "Palya", "Kootu", "Mezhukkupuratti", "Ularthiyathu",
                    "Curry", "Kara Curry", "Varuval", "Pulusu", "Fry"]))

    # ---- Kerala Sadya specialities ----
    add(["Avial", "Olan", "Erissery", "Kalan", "Thoran", "Pachadi", "Kichadi", "Pulissery",
         "Moru Curry", "Sambharam", "Puli Inji", "Inji Curry", "Kootu Curry", "Aviyal",
         "Parippu Curry", "Payar Thoran", "Cheera Thoran", "Mambazha Pulissery",
         "Pavakka Thoran", "Beans Thoran", "Kaya Varuthathu", "Chena Mezhukkupuratti",
         "Sadya Combo", "Onam Sadya", "Vishu Sadya"])

    # ---- Andhra & Telangana ----
    add(cross(["Pappu", "Pulusu", "Koora", "Vepudu"],
              ["Gongura", "Tomato", "Dosakaya", "Beerakaya", "Bendakaya", "Vankaya",
               "Chikkudukaya", "Kakarakaya", "Palakura", "Chamadumpa", "Anapakaya"],
              fmt="{m} {b}"))
    add(["Gongura Pachadi", "Gongura Mutton", "Gongura Chicken", "Avakaya", "Mango Avakaya",
         "Menthikaya Pachadi", "Tomato Pachadi", "Peanut Pachadi", "Gutti Vankaya Curry",
         "Vankaya Fry", "Bendakaya Fry", "Dosakaya Pappu", "Andhra Chicken Curry",
         "Andhra Mutton Curry", "Guntur Chicken", "Kodi Kura", "Royyala Vepudu",
         "Royyala Iguru", "Chepala Pulusu", "Natu Kodi Pulusu", "Miriyala Rasam",
         "Perugu Pachadi", "Majjiga Pulusu", "Pesarattu Upma", "Punugulu", "Ariselu",
         "Bobbatlu", "Pootharekulu", "Sunnundalu", "Kajjikayalu", "Garelu", "Boorelu"])

    # ---- Karnataka / Udupi / Coorg / Mangalore ----
    add(["Bisi Bele Bath", "Mangalore Buns", "Neer Dosa", "Kori Rotti", "Kori Gassi",
         "Chicken Ghee Roast", "Mutton Ghee Roast", "Prawn Ghee Roast", "Kundapur Chicken",
         "Coorg Pandi Curry", "Pandi Fry", "Akki Roti", "Ragi Mudde", "Ragi Rotti",
         "Set Dosa", "Goli Baje", "Maddur Vada", "Davangere Benne Dosa", "Congress Kadalekai",
         "Nippattu", "Kodubale", "Chow Chow Bath", "Mysore Bonda", "Mysore Pak", "Obbattu",
         "Holige", "Kayi Holige", "Kadubu", "Kotte Kadubu", "Chiroti", "Ave Bele Payasa",
         "Kayi Rotti", "Pandi Curry", "Bamboo Shoot Curry", "Kadamba Sambar", "Menthya Soppu Palya"])

    # ---- Chettinad and other South Indian non-veg ----
    add(cross(["Chicken", "Mutton", "Fish", "Prawn", "Crab", "Egg"],
              ["Chettinad", "Varutharacha", "Sukka", "Ghee Roast", "Pepper", "Milagu",
               "Kola Urundai Style", "65", "Malabar", "Kerala Style", "Nadan"],
              fmt="{m} {b}"))
    add(["Chettinad Chicken Curry", "Chettinad Mutton Curry", "Chettinad Fish Fry",
         "Chettinad Egg Curry", "Kola Urundai", "Nethili Fry", "Meen Varuval",
         "Meen Pollichathu", "Karimeen Pollichathu", "Kappa Meen Curry", "Nadan Kozhi Curry",
         "Kozhi Varutharacha", "Malabar Fish Curry", "Fish Molee", "Prawn Moilee",
         "Konju Roast", "Prawn Roast", "Squid Roast", "Squid Sukka", "Crab Roast",
         "Kadal Meen Curry", "Chemmeen Curry", "Meen Kuzhambu", "Vanjaram Fry"])

    # ---- South Indian biryani and mixed rice regional names ----
    add(cross(["Biryani"],
              ["Chettinad", "Thalassery", "Ambur", "Dindigul", "Bhatkali", "Donne",
               "Kalyani", "Beary", "Malabar", "Coimbatore", "Nagercoil"], fmt="{m} {b}"))

    # ---- Payasam / Kheer, South Indian style ----
    add(cross(["Payasam"],
              ["Semiya", "Vermicelli", "Ada", "Paal", "Pal", "Pradhaman", "Chakka",
               "Jackfruit", "Parippu", "Moong Dal", "Gothambu", "Wheat", "Rice", "Palada",
               "Kadala", "Pumpkin", "Elaneer", "Tender Coconut"], fmt="{m} {b}"))
    add(["Ada Pradhaman", "Palada Payasam", "Semiya Payasam", "Paal Payasam",
         "Parippu Payasam", "Chakka Pradhaman", "Elaneer Payasam", "Gothambu Payasam",
         "Rava Kesari", "Sooji Kesari", "Pal Kova", "Mysore Pak", "Badusha", "Adhirasam",
         "Susiyam", "Kozhukattai", "Kolukattai", "Modak South Style", "Poorna Kozhukattai",
         "Sarkarai Pongal", "Rava Laddu", "Boondi Laddu South Style"])

    # ---- Chutneys, podis and pickles, South Indian specific ----
    add(cross(["Chutney"],
              ["Coconut", "Thengai", "Tomato", "Onion", "Vengaya", "Mint", "Pudina",
               "Coriander", "Kothamalli", "Peanut", "Kadalai", "Garlic", "Poondu",
               "Tamarind", "Puli", "Ginger", "Inji", "Curry Leaf", "Karuveppilai", "Green",
               "Red", "Molaga", "Coriander Coconut", "Mango", "Mangai", "Beetroot"],
              fmt="{m} {b}"))
    add(cross(["Podi"], ["Idli", "Milagai", "Ellu", "Karuveppilai", "Kandi", "Paruppu",
                         "Garlic", "Curry Leaf", "Sambar"], fmt="{m} {b}"))
    add(["Gunpowder", "Molaga Podi", "Idli Podi", "Kandi Podi", "Karuveppilai Podi",
         "Ellu Podi", "Paruppu Podi", "Nalla Ennai", "Puli Inji Pickle", "Naranga Achar",
         "Manga Achar", "Kadumanga Curry", "Puli Achar", "Avial Pickle"])

    # ---- Snacks, South Indian ----
    add(["Murukku", "Thenkuzhal", "Manoharam", "Thattai", "Seedai", "Ellu Seedai",
         "Ribbon Pakoda", "Mixture", "Kara Boondi", "Omapodi", "Pakoda", "Bajji",
         "Vazhakkai Bajji", "Banana Bajji", "Mullangi Bajji", "Molaga Bajji", "Mirapakaya Bajji",
         "Bonda", "Uzhunnu Bonda", "Mysore Bonda", "Goli Baje", "Banana Chips", "Nendran Chips",
         "Jackfruit Chips", "Chakka Chips", "Tapioca Chips", "Kappa Chips", "Sharkara Varatti",
         "Achappam", "Kuzhalappam", "Diamond Cuts", "Pakkavada"])

    # ---- Drinks, South Indian ----
    add(["Filter Coffee", "Kaapi", "Degree Coffee", "Sambharam", "Neer Mor", "Spiced Buttermilk",
         "Panakam", "Elaneer Payasam Drink", "Tender Coconut Water", "Nannari Sharbat",
         "Rose Milk", "Badam Milk South Style", "Jigarthanda", "Sukku Coffee",
         "Sukku Malli Kaapi", "Paal Kanji", "Kool"])

    # ---- South Indian leafy greens x preparation. Distinct from north Indian "Palak/Methi" --
    # these are the greens actually sold and cooked in the four southern states, and each is a
    # different plant with a different nutrient profile, not a regional synonym for spinach. ----
    greens = ["Ponnanganni Keerai", "Mulai Keerai", "Arai Keerai", "Sirukeerai",
              "Manathakkali Keerai", "Vallarai Keerai", "Agathi Keerai", "Thandu Keerai",
              "Pasalai Keerai", "Curry Leaf", "Karuveppilai", "Drumstick Leaves", "Murungai Ilai",
              "Gongura", "Chukka Kura", "Ponnaganni", "Basale Soppu", "Harive Soppu",
              "Menthya Soppu", "Cheera"]
    add(cross(greens, ["Poriyal", "Thoran", "Palya", "Kootu", "Curry", "Pachadi", "Masiyal",
                       "Paruppu Usili"]))

    # ---- More South Indian vegetables, each a real produce item, x real preparation ----
    veg2 = ["Kovakkai", "Tindora", "Ivy Gourd", "Sundakkai", "Turkey Berry", "Manathakkali",
            "Vazhaipoo", "Banana Flower", "Vazhaithandu", "Banana Stem", "Suran", "Elephant Yam",
            "Kandarangi", "Field Beans", "Mochai", "Avarakkai", "Broad Beans", "Yardlong Beans",
            "Karamani", "Winged Beans", "Kothavarangai", "French Beans", "Seppankizhangu",
            "Colocasia", "Arbi South Style", "Vazhakkai", "Raw Plantain", "Nendran"]
    add(cross(veg2, ["Poriyal", "Thoran", "Palya", "Kootu", "Curry", "Fry", "Varuval",
                     "Puli Kuzhambu", "Masiyal", "Chips", "Ularthiyathu"]))
    add(cross(["Paruppu Usili"], ["Beans", "Cabbage", "Kothavarangai", "Avarakkai", "Cluster Beans"],
              fmt="{b} {m}"))

    # ---- South Indian fish and seafood by real regional species, x real curry styles. A
    # generic catalogue "Fish" entry does not cover any of these -- each species and each style
    # has its own fat and calorie profile. ----
    fish_species = ["Ayala", "Mackerel", "Netholi", "Anchovy", "Vanjaram", "Seer Fish",
                     "Chala", "Sardine", "Nethili", "Vaala", "Ribbon Fish", "Choora", "Tuna",
                     "Karimeen", "Pearl Spot", "Kane", "Ladyfish", "Anjal", "Kingfish",
                     "Meen", "Sura", "Shark", "Konju", "Prawn", "Njandu", "Crab", "Kanava",
                     "Squid", "Kadal Meen", "Katla", "Rohu"]
    fish_styles = ["Curry", "Fry", "Varuval", "Peera", "Pollichathu", "Mulakittathu",
                   "Vevichathu", "Roast", "Moilee", "Chekku", "Kuzhambu", "Pulusu", "Iguru",
                   "Vepudu", "65"]
    add(cross(fish_species, fish_styles, fmt="{b} {m}"))

    # ---- Kerala non-vegetarian specialities beyond fish ----
    add(["Beef Ularthiyathu", "Beef Fry", "Beef Cutlet", "Beef Roast", "Duck Roast",
         "Tharavu Roast", "Pork Ularthiyathu", "Pork Vindaloo Kerala Style", "Kappa Beef Curry",
         "Egg Roast Kerala Style", "Chicken Ularthiyathu", "Nadan Chicken Curry",
         "Kerala Chicken Roast", "Erachi Varutharacha Curry", "Meen Vevichathu",
         "Kappa Puzhukku Meen Curry", "Kerala Parotta", "Malabar Parotta", "Kothu Parotta"])

    # ---- Tamil Nadu non-vegetarian specialities beyond Chettinad ----
    add(["Chicken Chukka", "Mutton Chukka", "Nattu Kozhi Curry", "Milagu Kozhi Varuval",
         "Elumbu Curry", "Kola Urundai Curry", "Kari Kuzhambu", "Attu Kari Curry",
         "Naatu Kozhi Curry", "Kozhi Milagu Varuval", "Meen Kuzhambu Vanjaram",
         "Sura Puttu", "Yera Curry", "Nandu Milagu Curry", "Chicken 65 Chettinad Style"])

    # ---- Karnataka non-vegetarian and gravies beyond Udupi ----
    add(["Bili Saaru", "Huli", "Menasina Saaru", "Uddina Vada", "Benne Masala Dosa",
         "Mangalore Fish Curry", "Kane Fry", "Anjal Fry", "Kori Ghee Roast", "Kundapur Kori Gassi",
         "Mutton Sukka Karnataka Style", "Pandi Curry Coorg", "Bamboo Shoot Pork Curry",
         "Nati Koli Curry", "Saaru", "Huli Anna", "Majjige Huli", "Gojju", "Ambode"])

    # ---- Andhra & Telangana, further named dishes ----
    add(["Royyala Vepudu Andhra", "Chepa Pulusu", "Kodi Vepudu", "Ulavacharu", "Ulava Charu",
         "Pesara Pappu", "Natukodi Pulusu", "Gongura Royyala", "Gongura Mamsam",
         "Kodi Kura Andhra Style", "Boti Curry", "Bendakaya Pulusu", "Chintakaya Pappu",
         "Tomato Pappu", "Mudda Pappu", "Avial Andhra Style", "Pulihora", "Chintapandu Pulihora",
         "Curd Pulihora", "Nimmakaya Pulihora"])

    # ---- Coconut and jaggery based sweets/snacks not yet listed ----
    add(["Ela Ada", "Vattayappam", "Kinnathappam", "Unnakaya", "Kozhukatta", "Pidi Kozhukattai",
         "Vella Kozhukattai", "Sweet Kozhukattai", "Uppu Kozhukattai", "Vella Seedai",
         "Karam Seedai", "Thengai Poli", "Puran Poli South Style", "Ellu Urundai",
         "Nuvvula Laddu", "Pallilo Kova", "Kaja", "Kova Kajjikayalu", "Semiya Kesari South",
         "Rava Ladoo South Style", "Coconut Burfi South Style"])

    # ---- Millets, South Indian style. Increasingly logged as a health staple, and each grain x
    # preparation is a nutritionally distinct food, not a synonym for the wheat/rice version. ----
    millets = ["Ragi", "Kambu", "Bajra", "Jowar", "Cholam", "Foxtail Millet", "Thinai",
               "Kodo Millet", "Varagu", "Barnyard Millet", "Kuthiraivali", "Little Millet",
               "Samai", "Proso Millet", "Panivaragu"]
    add(cross(millets, ["Dosa", "Idli", "Upma", "Kanji", "Koozh", "Roti", "Payasam", "Pongal",
                        "Adai", "Puttu"], fmt="{b} {m}"))

    # ---- Kuzhambu / Pulusu by vegetable, not just the fixed named list above ----
    add(cross(["Vendakkai", "Kathirikai", "Chow Chow", "Drumstick", "Pumpkin", "Raw Mango",
               "Manathakkali", "Sundakkai", "Broad Beans"],
              ["Puli Kuzhambu", "Kara Kuzhambu", "Poricha Kuzhambu", "Pulusu"], fmt="{b} {m}"))

    # ---- Bajji / Bonda by filling ----
    add(cross(["Bajji", "Bonda"],
              ["Vazhakkai", "Banana", "Mullangi", "Radish", "Molaga", "Mirapakaya", "Potato",
               "Aloo", "Onion", "Vengaya", "Kathirikai", "Pavakkai", "Bitter Gourd", "Bread",
               "Paneer", "Chow Chow"], fmt="{m} {b}"))

    # ---- Andhra pickles and pachadi beyond the fixed list ----
    add(cross(["Pachadi", "Pickle", "Avakaya"],
              ["Gongura", "Tomato", "Ginger", "Amla", "Usirikaya", "Lime", "Nimmakaya",
               "Green Chilli", "Pandumirchi", "Dosakaya", "Bitter Gourd", "Kakarakaya",
               "Garlic", "Vellulli"], fmt="{m} {b}"))

    # ---- Sundal: Tamil Nadu legume snack, one per real pulse ----
    add(cross(["Sundal"], ["Kadalai", "Chickpea", "Peanut", "Karamani", "Black Eyed Peas",
                           "Green Gram", "Pattani", "Green Peas", "Mochai", "Kondakadalai",
                           "Vellai Kondakadalai"], fmt="{m} {b}"))

    # ---- South Indian non-veg by cooking verb, across the proteins actually eaten across the
    # four states (beef and pork are Kerala/Coorg-specific; the rest are common everywhere) ----
    add(cross(["Chicken", "Mutton", "Fish", "Prawn", "Egg", "Beef", "Pork", "Duck"],
              ["Curry", "Fry", "Roast", "Varuval", "Kuzhambu", "Masala", "Peralan",
               "Chukka", "Ularthiyathu", "Pulusu", "Iguru", "Vepudu", "Liver Fry",
               "Pepper Fry", "Gravy"], fmt="{b} {m}"))

    # ---- Jackfruit, raw and ripe, prepared the ways Kerala and the Western Ghats actually eat
    # it -- distinct foods from "jackfruit" as a single generic catalogue entry ----
    add(["Chakka Varattiyathu", "Chakka Puzhukku", "Chakka Curry", "Chakka Achar",
         "Idichakka Thoran", "Chakka Kuru Curry", "Chakka Chips", "Ripe Jackfruit Payasam",
         "Jackfruit Seed Curry", "Jackfruit Halwa", "Chakka Pradhaman South Style"])

    # ---- Pickles by spice/fruit, South Indian style ----
    add(cross(["Pickle", "Achar"],
              ["Kadumanga", "Naranga", "Inji", "Puli Inji", "Manga", "Nellikai", "Vadumanga",
               "Narthangai", "Elumichai", "Poondu"], fmt="{m} {b}"))

    # ---- Kanji / rice porridge, South Indian style ----
    add(cross(["Kanji"], ["Rice", "Ragi", "Koozh", "Pazhaya Sadam", "Ambali", "Sattu",
                          "Kappa"], fmt="{m} {b}"))

    # ---- Cutlets, South Indian fillings ----
    add(cross(["Cutlet"], ["Fish", "Prawn", "Vegetable", "Beetroot", "Banana", "Egg",
                           "Chicken", "Fish Meen"], fmt="{m} {b}"))

    # ---- Breakfast-centre combo plates, sold and logged as one item ----
    add(["Idli Vada Sambar Combo", "Dosa Sambar Chutney Combo", "Pongal Vada Combo",
         "Set Dosa Kurma Combo", "Idli Chutney Combo", "Mini Tiffin Combo",
         "Full Meals South Indian", "Sadya Meals", "Andhra Meals Combo", "Kerala Meals"])

    # ---- Meen Curry by base, the way Kerala names it ----
    add(cross(["Meen Curry"], ["Kudampuli", "Coconut Milk", "Mustard", "Raw Mango", "Bhindi",
                               "Vaalan", "Ayala Style"], fmt="{b} {m}"))

    # ---- Andhra Telangana further named dishes ----
    add(["Bagara Baingan", "Bagara Rice", "Khatti Dal", "Mirchi Bajji", "Mirapakaya Bajji",
         "Palakura Pappu", "Kandi Pachadi", "Nuvvula Pachadi", "Kobbari Pachadi",
         "Vankaya Pachadi", "Beerakaya Pachadi", "Gutti Bendakaya", "Chikkudukaya Curry"])

    # ---- Karnataka "Gojju" -- tangy jaggery-tamarind gravy, one per real base ----
    add(cross(["Gojju"], ["Tomato", "Bendekai", "Sihikumbalakai", "Sole", "Ash Gourd",
                          "Chowli", "Onion", "Cucumber"], fmt="{m} {b}"))

    # ---- Kosambari: Karnataka raw salad, one per real pulse/vegetable base ----
    add(cross(["Kosambari"], ["Moong Dal", "Chana Dal", "Cucumber", "Carrot", "Tomato",
                              "Hesaru Bele"], fmt="{m} {b}"))

    # ---- Halwa, South Indian bases beyond the pan-Indian list ----
    add(cross(["Halwa"], ["Ash Gourd", "Bottle Gourd", "Pineapple", "Papaya", "Beetroot South",
                          "Tender Coconut"], fmt="{m} {b}"))

    # ---- Mor Curry / Pulissery: Kerala buttermilk gravy, one per real base ----
    add(cross(["Mor Curry", "Pulissery"], ["Vellarikka", "Cucumber", "Pineapple", "Mambazham",
                                           "Okra", "Pumpkin", "Chena"], fmt="{b} {m}"))

    # ---- A few more real named dishes the categories above don't reach ----
    add(["Chembu Thaal Curry", "Taro Leaves Curry", "Raw Papaya Curry", "Elephant Foot Yam Fry",
         "Suran Roast", "Vazhaipoo Vadai", "Banana Flower Poriyal", "Kappa Puzhukku Sardine",
         "Kappa Vevichathu", "Chakka Kuru Poriyal", "Payar Curry", "Vanpayar Thoran",
         "Cherupayar Curry", "Uzhunnu Kanji", "Ragi Kanji Kerala Style"])

    # ---- Vatral Kuzhambu: Tamil sun-dried-vegetable gravy, one per real dried base ----
    add(cross(["Vatral Kuzhambu"], ["Manathakkali", "Sundakkai", "Mixed Vatral", "Kongura",
                                    "Mor Milagai"], fmt="{m} {b}"))
    add(["Manathakkali Vatral", "Sundakkai Vatral", "Mor Milagai", "Vadaam", "Sago Vadaam",
         "Rice Vadaam", "Potato Vadaam", "Appalam", "Ulundu Vadaam"])

    # ---- Thogayal: thick Tamil chutney-paste, nutritionally distinct from a wet chutney ----
    add(cross(["Thogayal"], ["Coconut", "Coriander Stem", "Curry Leaf", "Garlic", "Peanut",
                             "Milagai", "Vengaya", "Poondu", "Thuvaram Paruppu"], fmt="{m} {b}"))

    # ---- Paruppu: South Indian dal by the name it is actually cooked and logged under ----
    add(cross(["Paruppu"], ["Thuvaram", "Toor", "Pasi Paruppu", "Moong", "Kadalai Paruppu",
                            "Chana", "Ulundu Paruppu", "Urad", "Masoor Paruppu"], fmt="{m} {b}"))

    # ---- "X 65", the Chennai/Bangalore restaurant format, only on the bases it is real for ----
    add(cross(["65"], ["Chicken", "Gobi", "Mushroom", "Baby Corn", "Fish", "Paneer", "Prawn"],
              fmt="{m} {b}"))

    # ---- Kothu Parotta: shredded parotta stir-fried with a filling, one per real filling ----
    add(cross(["Kothu Parotta"], ["Egg", "Chicken", "Mutton", "Vegetable", "Cheese",
                                  "Kalan"], fmt="{m} {b}"))

    # ---- Egg, South Indian home-style ----
    add(["Egg Poriyal", "Muttai Poriyal", "Egg Curry South Style", "Egg Masala South Style"])

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
    ap.add_argument("--limit", type=int, default=2500)
    args = ap.parse_args()

    doc = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    names = [f["name"] for f in doc["foods"]]
    low = [n.lower() for n in names]
    have = set(low)

    # A raw ingredient sitting in the catalogue ("Ash Gourd") is not the same food as a cooked
    # dish named after it ("Ash Gourd Thoran") -- cooking method, oil and coconut change the
    # macros completely, and a fitness app cares about that difference. So a substring hit only
    # counts as "variant" when the two names are close in LENGTH, not just when one contains the
    # other -- "Butter Naan" containing "Butter" is exactly the false positive this guards
    # against. The 0.6 threshold was picked by hand-checking a sample: it keeps genuine near-
    # duplicates ("Sambar" / "Sambhar") and drops raw-ingredient coincidences.
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

    pool = build()[: args.limit]
    rows = []
    for q in pool:
        st, m = status(q)
        rows.append({"food": q, "status": st, "closest_in_catalogue": m})

    miss = [r for r in rows if r["status"] == "MISSING"]
    var = [r for r in rows if r["status"] == "variant"]
    print("catalogue      : %d foods" % len(names))
    print("candidates     : %d South Indian dishes" % len(rows))
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
