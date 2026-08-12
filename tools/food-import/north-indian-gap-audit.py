"""
Which common NORTH INDIAN foods is the catalogue missing?

Sibling of south-indian-gap-audit.py, same reasoning, opposite scope: Punjab, Delhi/Mughlai,
Rajasthan, Gujarat, UP/Awadh, Bihar, Bengal, Kashmir and Himachal/Uttarakhand (Pahari) instead
of the four southern cuisines. The pool is built COMBINATORIALLY -- a bread times a real
filling, a protein times a real regional gravy style, a vegetable times a real preparation --
and only pairs that are actual dishes are kept, so the list is not biased by what one person
happened to think of. Every candidate is then checked against the real catalogue.

MATCHING IS THREE-WAY, same as the other two audits in this folder:
    present   the exact name exists
    variant   something contains it, is contained by it, or is one edit away -- AND close
              enough in length that it is not just a raw ingredient coincidentally sitting in
              the name ("Ash Gourd" matching "Ash Gourd Thoran" tells you nothing; a cooked
              dish and its raw ingredient are nutritionally different foods)
    MISSING   nothing resembling it

usage:  python tools/food-import/north-indian-gap-audit.py [--limit 2500]
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
OUT = REPO / "north-indian-foods-to-add.csv"


# Restricts a style/suffix to the bases it is actually cooked with. Anything not listed is
# unrestricted. Without this, crossing every style against every base invents dishes that do
# not exist -- "Rajma Nihari" is nothing, "Rogan Josh" is only ever mutton or chicken, and
# "Lollipop" off a Delhi menu is only ever chicken.
ONLY_WITH = {
    "Nihari":       {"Mutton", "Beef", "Chicken"},
    "Rogan Josh":   {"Mutton", "Chicken"},
    "Yakhni":       {"Mutton", "Chicken", "Nadru", "Lotus Stem"},
    "Rezala":       {"Mutton", "Chicken"},
    "Kosha":        {"Mangsho", "Mutton"},
    "Tabak Maaz":   {"Mutton"},
    "Galouti":      {"Mutton"},
    "Kakori":       {"Kebab", "Seekh Kebab"},
    "Boti":         {"Kebab", "Chicken", "Mutton"},
    "Bihari":       {"Kebab", "Boti Kebab", "Chicken", "Mutton"},
    "Chapli":       {"Kebab", "Chicken", "Mutton", "Beef"},
    "Madra":        {"Chana", "Rajma", "Kaddu", "Paneer", "Rongi"},
    "Siddu":        {"Poppy Seed", "Walnut", "Plain"},
    "Dham":         {"Rajma", "Chana", "Mash Dal", "Kadhi"},
    "Lollipop":     {"Chicken"},
    "Rara":         {"Mutton", "Chicken", "Keema"},
    "Do Pyaza":     {"Chicken", "Mutton", "Paneer", "Egg", "Mushroom"},
    "Malai":        {"Chicken", "Paneer", "Prawn", "Mutton", "Kofta"},
    "Rista":        {"Mutton"},
    "Gushtaba":     {"Mutton"},
    "Kalia":        {"Fish", "Prawn", "Mutton"},
    "Churma":       {"Dal Baati", "Baati"},
    "Chokha":       {"Litti", "Baingan", "Aloo", "Tomato"},
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

    # ---- Breads: filling x bread, the densest category on a North Indian menu ----
    breads = ["Naan", "Roti", "Paratha", "Kulcha", "Puri", "Bhatura", "Thepla", "Chapati",
              "Bhakri", "Dhebra", "Sheermal", "Taftan", "Rumali Roti", "Missi Roti",
              "Lachha Paratha", "Tandoori Roti"]
    fillings = ["Plain", "Butter", "Garlic", "Cheese", "Aloo", "Gobi", "Paneer", "Methi",
                "Mooli", "Onion", "Egg", "Keema", "Mixed Vegetable", "Palak", "Corn", "Chilli",
                "Masala", "Multigrain", "Wheat", "Jowar", "Bajra", "Ragi", "Makki",
                "Sattu", "Pyaaz Kachori Style", "Peas"]
    add(cross(breads, fillings, fmt="{m} {b}"))
    add(["Amritsari Kulcha", "Chole Bhature", "Puri Bhaji", "Poori Aloo", "Bedmi Puri",
         "Kachori", "Pyaaz Kachori", "Matar Kachori", "Moong Dal Kachori", "Litti",
         "Litti Chokha", "Baati", "Dal Baati Churma", "Sattu Paratha", "Makki Di Roti",
         "Bajre Ki Roti", "Missi Roti", "Rumali Roti", "Taftan", "Sheermal", "Baqarkhani",
         "Naan Roti Basket"])

    # ---- Punjabi/Delhi gravies: protein x style, the format of every North Indian menu ----
    proteins = ["Paneer", "Chicken", "Mutton", "Egg", "Soya", "Mushroom", "Aloo", "Gobi",
                "Bhindi", "Baingan", "Kofta", "Chana", "Mixed Vegetable", "Rajma"]
    styles = ["Curry", "Masala", "Butter Masala", "Kadai", "Karahi", "Tikka Masala",
              "Do Pyaza", "Korma", "Rogan Josh", "Handi", "Lababdar", "Bhuna", "Saagwala",
              "Methi Malai", "Kali Mirch", "Achari", "Angara", "Shahi", "Malai",
              "Mughlai", "Rara", "Rassa", "Dhaba Style"]
    add(cross(proteins, styles, fmt="{b} {m}"))
    add(["Palak Paneer", "Matar Paneer", "Shahi Paneer", "Paneer Bhurji", "Paneer Lababdar",
         "Malai Kofta", "Aloo Gobi", "Aloo Matar", "Aloo Jeera", "Baingan Bharta",
         "Bharwa Baingan", "Dum Aloo", "Kashmiri Dum Aloo", "Sarson Ka Saag",
         "Butter Chicken", "Chicken Tikka Masala", "Dal Makhani", "Amritsari Chole",
         "Rajma Masala", "Chana Masala", "Kadhi Pakora", "Punjabi Kadhi"])

    # ---- Tandoor and kebabs: protein x style ----
    add(cross(["Tikka", "Kebab", "Seekh Kebab", "Boti Kebab", "Chapli Kebab", "Reshmi Kebab",
               "Shami Kebab", "Hariyali Kebab", "Malai Tikka", "Fry"],
              ["Chicken", "Paneer", "Mutton", "Soya", "Mushroom", "Fish", "Prawn", "Egg"],
              fmt="{m} {b}"))
    add(["Tandoori Chicken", "Tandoori Roti Combo", "Galouti Kebab", "Kakori Kebab",
         "Bihari Boti Kebab", "Chapli Kebab Peshawari", "Afghani Chicken",
         "Murgh Malai Tikka", "Amritsari Fish Tikka", "Hariyali Paneer Tikka",
         "Achari Paneer Tikka", "Tandoori Prawns"])

    # ---- Dals and legumes ----
    add(cross(["Dal", "Dal Tadka", "Dal Fry"],
              ["Toor", "Moong", "Masoor", "Chana", "Urad", "Mixed", "Panchmel", "Palak",
               "Methi", "Langar Style", "Punjabi Style"], fmt="{m} {b}"))
    add(["Dal Makhani", "Dal Bukhara", "Dal Amritsari", "Rajma", "Rajma Masala",
         "Chole", "Chana Masala", "Kala Chana", "Lobia", "Chawli", "Kadhi",
         "Punjabi Kadhi", "Gujarati Kadhi", "Sindhi Kadhi", "Kadhi Pakora", "Misal",
         "Usal", "Sprouts Usal", "Ghugni", "Chana Ghugni", "Ragda", "Pithla", "Zunka"])

    # ---- Everyday sabzis: North Indian vegetable x preparation ----
    veg = ["Aloo", "Gobi", "Bhindi", "Baingan", "Lauki", "Tinda", "Turai", "Parwal", "Karela",
           "Kaddu", "Arbi", "Jimikand", "Sem", "Guvar", "Beans", "Carrot", "Cabbage",
           "Cauliflower", "Capsicum", "Mushroom", "Palak", "Methi", "Sarson", "Drumstick",
           "Shalgam", "Turnip", "Chukandar", "Beetroot", "Matar", "Peas", "Makai", "Corn"]
    add(cross(veg, ["Sabzi", "Fry", "Masala", "Curry", "Bhaji", "Sukhi Sabzi", "Gravy",
                    "Chokha", "Bharta", "Rassa"], fmt="{b} {m}"))

    # ---- Rajasthani ----
    add(["Laal Maas", "Gatte Ki Sabzi", "Ker Sangri", "Panchmel Dal", "Rajasthani Kadhi",
         "Mirchi Bada", "Pyaaz Kachori Rajasthani", "Dal Baati Churma", "Ghevar",
         "Malpua Rajasthani", "Rajasthani Thali", "Safed Maas", "Jungli Maas",
         "Bajre Ki Khichdi", "Ker Sangri Sabzi", "Kadhi Kachori", "Sangri Curry",
         "Papad Ki Sabzi", "Mangodi Ki Sabzi", "Pyaaz Ki Kachori", "Aam Ki Launji"])

    # ---- Gujarati ----
    add(["Dhokla", "Khaman", "Khandvi", "Fafda", "Handvo", "Muthiya", "Patra",
         "Dal Dhokli", "Undhiyu", "Thepla", "Gujarati Kadhi", "Sev Tameta",
         "Bhinda Nu Shaak", "Ringan No Olo", "Sev Khamani", "Khakhra", "Fafda Jalebi",
         "Chundo", "Gujarati Dal", "Bateta Nu Shaak", "Papdi Nu Shaak", "Turiya Patra",
         "Undhiyu Puri Combo", "Doodhi Chana", "Sev Puri Gujarati", "Khichu"])

    # ---- Bihari / UP / Awadhi ----
    add(["Litti Chokha", "Sattu Paratha", "Sattu Sharbat", "Thekua", "Chana Ghugni",
         "Tehri", "Dahi Chura", "Malpua UP Style", "Nimona", "Aloo Chokha",
         "Baingan Chokha", "Anarasa", "Chiura Dahi", "Dubki Wale Aloo", "Kaddu Ki Sabzi",
         "Lauki Chana Dal", "Awadhi Biryani", "Lucknowi Kebab", "Kakori Biryani",
         "Nihari Kulcha"])

    # ---- Bengali ----
    add(["Macher Jhol", "Shukto", "Chingri Malai Curry", "Doi Maach", "Aloo Posto",
         "Begun Bhaja", "Kosha Mangsho", "Cholar Dal", "Mishti Doi", "Sandesh",
         "Rosogolla", "Chomchom", "Luchi", "Aloo Dum Bengali", "Dhokar Dalna",
         "Bhapa Ilish", "Ilish Bhaja", "Chingri Bhapa", "Pabda Macher Jhol",
         "Mochar Ghonto", "Labra", "Bengali Khichuri", "Radhaballavi", "Cholar Dal Luchi",
         "Payesh", "Narkel Naru"])

    # ---- Kashmiri ----
    add(["Rogan Josh", "Yakhni", "Kashmiri Dum Aloo", "Nadru Yakhni", "Tabak Maaz",
         "Kashmiri Pulao", "Modur Pulao", "Haak", "Rista", "Gushtaba", "Kashmiri Rajma",
         "Nadru Monji", "Dum Olav", "Kashmiri Kokur", "Wazwan Platter", "Chaman Kaliya",
         "Damaloo", "Nadru Yakhni Kashmiri", "Kashmiri Chai", "Kahwa"])

    # ---- Himachali / Uttarakhand (Pahari) ----
    add(["Siddu", "Dham", "Chana Madra", "Rajma Madra", "Babru", "Aktori",
         "Kaddu Ka Khatta", "Chha Gosht", "Bhey", "Patande", "Til Chutney Pahari",
         "Gucchi Curry", "Mash Dal Pahari", "Kafuli", "Jhangora Kheer", "Bhatt Ki Churkani",
         "Gahat Ka Dal", "Aloo Ke Gutke", "Dubuk", "Chainsoo"])

    # ---- Chaat and street food ----
    add(["Vada Pav", "Pav Bhaji", "Misal Pav", "Dabeli", "Bhel Puri", "Pani Puri", "Golgappa",
         "Sev Puri", "Dahi Puri", "Papdi Chaat", "Aloo Chaat", "Samosa Chaat",
         "Raj Kachori", "Dahi Vada", "Dahi Bhalla", "Ragda Pattice", "Aloo Tikki",
         "Ram Ladoo", "Kathi Roll", "Egg Roll", "Chicken Roll", "Chole Kulche",
         "Amritsari Chole Kulche", "Delhi Chaat", "Bhalla Papdi", "Matar Kulcha"])

    # ---- Sweets: base x style, North Indian ----
    add(cross(["Ladoo", "Barfi", "Halwa", "Peda", "Katli"],
              ["Besan", "Motichoor", "Rava", "Boondi", "Til", "Dry Fruit", "Kaju", "Badam",
               "Pista", "Gajar", "Lauki", "Moong Dal", "Sooji", "Atta", "Chocolate", "Milk",
               "Kesar", "Mawa"], fmt="{m} {b}"))
    add(["Gulab Jamun", "Rasmalai", "Jalebi", "Imarti", "Gujiya", "Balushahi",
         "Soan Papdi", "Petha", "Kalakand", "Milk Cake", "Sohan Halwa",
         "Double Ka Meetha", "Shahi Tukda", "Phirni", "Kulfi", "Falooda",
         "Anjeer Barfi", "Pista Roll", "Kaju Roll", "Kaju Pista Roll", "Dry Fruit Ladoo",
         "Rewri", "Gajak", "Bal Mithai", "Singori", "Karachi Halwa", "Bombay Halwa",
         "Tirunelveli Halwa North Style"])

    # ---- Drinks ----
    add(["Masala Chai", "Adrak Chai", "Elaichi Chai", "Cutting Chai", "Kashmiri Kahwa",
         "Sweet Lassi", "Salted Lassi", "Mango Lassi", "Rose Lassi", "Chaas",
         "Buttermilk North Style", "Nimbu Pani", "Shikanji", "Jaljeera", "Aam Panna",
         "Thandai", "Badam Milk", "Rooh Afza", "Sugarcane Juice", "Sattu Drink",
         "Bel Sharbat", "Kesar Doodh", "Sardai"])

    # ---- Indo-Chinese, a fixture of North Indian eating out ----
    add(cross(["Manchurian", "Chilli", "Schezwan", "Hakka Noodles", "Chowmein", "Fried Rice",
               "Manchow Soup", "Sweet Corn Soup", "Hot and Sour Soup"],
              ["Veg", "Chicken", "Paneer", "Gobi", "Mushroom", "Egg", "Prawn"], fmt="{m} {b}"))
    add(["Chilli Chicken Dry", "Chicken Lollipop", "Dragon Chicken", "American Chopsuey",
         "Veg Chopsuey", "Crispy Corn", "Honey Chilli Potato", "Paneer 65 North Style",
         "Chicken Manchow"])

    # ---- Rice and khichdi ----
    add(cross(["Pulao", "Khichdi"],
              ["Jeera", "Peas", "Vegetable", "Kashmiri", "Kesar", "Moong Dal", "Masala",
               "Matar", "Gucchi"], fmt="{m} {b}"))
    add(["Kashmiri Pulao", "Matar Pulao", "Vegetable Biryani North Style", "Mutton Biryani",
         "Chicken Biryani Lucknowi", "Yakhni Pulao", "Zafrani Pulao"])

    # ---- Eggs ----
    add(["Egg Bhurji", "Egg Curry", "Anda Curry", "Egg Masala", "Egg Ghotala",
         "Half Fry", "Full Fry", "Masala Omelette", "Egg Paratha", "Egg Kejriwal"])

    # ---- Millets and health staples ----
    add(cross(["Bajra", "Jowar", "Ragi", "Oats", "Daliya"],
              ["Roti", "Khichdi", "Porridge", "Upma North Style", "Paratha"], fmt="{b} {m}"))
    add(["Sattu Paratha", "Sattu Sharbat", "Moong Sprouts Salad", "Chana Sprouts Salad",
         "Roasted Chana", "Peanut Chikki", "Til Chikki", "Makhana Curry",
         "Makhana Kheer", "Roasted Makhana"])

    # ---- Pickles and accompaniments ----
    add(cross(["Achar", "Pickle"],
              ["Aam", "Mango", "Nimbu", "Lemon", "Mirchi", "Chilli", "Mixed", "Lehsun",
               "Garlic", "Gobi Gajar Shalgam", "Amla"], fmt="{m} {b}"))
    add(["Papad", "Fried Papad", "Roasted Papad", "Masala Papad", "Dahi",
         "Ghee", "White Butter", "Amritsari Papad"])

    # ---- Maharashtrian: routinely grouped with "North Indian" on restaurant/app menus
    # (as the non-South-Indian side of the split), never with the four southern cuisines ----
    add(["Puran Poli", "Kothimbir Vadi", "Sabudana Khichdi", "Sabudana Vada", "Zunka Bhakar",
         "Bharli Vangi", "Varan Bhaat", "Modak", "Ukadiche Modak", "Bharwa Karela",
         "Thalipeeth", "Pithla Bhakri", "Solkadhi", "Misal Pav Kolhapuri", "Kanda Poha",
         "Batata Bhaji", "Vangi Bhaat", "Puneri Misal", "Kolhapuri Chicken", "Kolhapuri Mutton",
         "Amti", "Aluchi Bhaji", "Masale Bhaat", "Shengdana Chutney", "Bharli Bhendi"])

    # ---- Raita and chutney, North Indian style ----
    add(cross(["Raita"],
              ["Boondi", "Cucumber", "Onion", "Mixed Vegetable", "Pineapple", "Aloo", "Lauki",
               "Mint", "Pomegranate", "Bhindi", "Pudina"], fmt="{m} {b}"))
    add(cross(["Chutney"],
              ["Mint", "Coriander", "Tamarind", "Mango", "Tomato", "Garlic", "Peanut",
               "Dhaniya Pudina", "Imli", "Pudina", "Green", "Red Chilli"], fmt="{m} {b}"))

    # ---- Namkeen and packaged-style snacks, North Indian ----
    add(["Bhujia", "Aloo Bhujia", "Ratlami Sev", "Moong Dal Namkeen", "Chivda", "Poha Chivda",
         "Chana Jor Garam", "Masala Peanuts", "Bombay Mix", "Mathri", "Namak Para",
         "Shakarpara", "Gujiya Namkeen", "Kachori Chaat", "Dal Moth", "Navratan Mix"])

    # ---- Combo plates, sold and logged as one item ----
    add(["Rajma Chawal", "Chole Chawal", "Kadhi Chawal", "Dal Chawal", "Chana Chawal",
         "Amritsari Kulcha Chole", "Dal Makhani Naan Combo", "Butter Chicken Naan Combo",
         "North Indian Thali", "Punjabi Thali", "Rajasthani Thali", "Gujarati Thali"])

    # ---- Named vegetable dishes not reached by the sabzi cross ----
    add(["Bhindi Do Pyaza", "Aloo Baingan", "Aloo Palak", "Kadhi Pakora Punjabi",
         "Lauki Kofta", "Bharwa Karela", "Bharwa Bhindi", "Methi Aloo",
         "Sarson Da Saag Makki Di Roti", "Baingan Ka Bharta", "Aloo Bharta"])

    # ---- Meat by real cut, the way it is actually ordered ----
    add(["Mutton Chaanp", "Mutton Nalli Nihari", "Chicken Leg Curry", "Chicken Breast Curry",
         "Mutton Champ Masala", "Chicken Chaanp", "Keema Matar", "Keema Paratha",
         "Mutton Kaleji Fry", "Chicken Liver Masala"])

    # ---- Soups, North Indian menu staples ----
    add(["Tomato Shorba", "Paya Soup", "Yakhni Shorba", "Lentil Soup North Style",
         "Chicken Soup North Style", "Sweet Corn Soup North Style"])

    # ---- More North Indian vegetables x the same real preparations ----
    veg2 = ["Kathal", "Jackfruit", "Suran", "Bathua", "Chaulai", "Kachalu", "Tori",
            "Chana Saag", "Amaranth", "Mooli Ke Patte", "Chane Ka Saag", "Kacche Kele",
            "Raw Banana North Style", "Kaddu", "Petha Vegetable"]
    add(cross(veg2, ["Sabzi", "Fry", "Masala", "Curry", "Bhaji", "Sukhi Sabzi", "Gravy",
                     "Bharta", "Do Pyaza"], fmt="{b} {m}"))

    # ---- Bengali sweets, a category deep enough to be its own list ----
    add(["Chanar Payesh", "Kheer Kadam", "Ledikeni", "Pantua", "Rajbhog", "Kancha Golla",
         "Jolbhora Sandesh", "Nolen Gurer Sandesh", "Malpoa Bengali", "Patishapta",
         "Chandrapuli", "Sarpuria", "Sarbhaja", "Kheer Sagar", "Raj Bhog", "Nikuti"])

    # ---- Kashmiri, further named dishes ----
    add(["Aab Gosht", "Marchwangan Korma", "Kashmiri Chicken Curry", "Danival Korma",
         "Nadru Chaman", "Muji Chetin", "Kashmiri Modur Pulav", "Kashmiri Haak Saag",
         "Kashmiri Paneer Chaman"])

    # ---- Himachali / Garhwali, further named dishes ----
    add(["Kullu Trout Curry", "Til Ki Chutney Pahari", "Chulai Ka Saag", "Gahat Ki Dal",
         "Bhang Ki Chutney", "Kaddu Ka Khatta Meetha", "Sepu Vadi", "Kullu Dham"])

    # ---- Rajasthani, further named sweets and snacks ----
    add(["Ghevar Malai", "Alwar Ka Mawa", "Mawa Kachori", "Pyaaz Ki Sabzi Rajasthani",
         "Bajre Ka Sogra", "Choorma Ladoo", "Rajasthani Papad Ki Sabzi", "Besan Chakki",
         "Rajasthani Gatta Pulao", "Kair Sangri Ki Sabzi"])

    # ---- Mughlai / Awadhi, dry-fruit-rich dishes ----
    add(["Shahi Korma", "Navratan Korma", "Mughlai Chicken", "Mughlai Egg Curry",
         "Dum Pukht Biryani", "Murgh Musallam", "Shahi Tukda Mughlai", "Mughlai Paratha",
         "Zafrani Murgh", "Badami Chicken"])

    # ---- Gujarati, further named dishes ----
    add(["Dabeli Gujarati", "Sev Khamani", "Handvo Sandwich", "Gujarati Dal Dhokli",
         "Bhakhri", "Rotla", "Gujarati Undhiyu Puri", "Sev Tameta Nu Shaak",
         "Gujarati Kadhi Khichdi", "Methi Na Gota"])

    # ---- Punjabi, further named dishes ----
    add(["Amritsari Fish", "Punjabi Rajma", "Amritsari Kulcha Special", "Sarson Saag Combo",
         "Punjabi Samosa", "Aloo Paratha Combo", "Punjabi Chole Kulche", "Makki Roti Combo",
         "Punjabi Lassi Combo", "Punjabi Kadhi Chawal"])

    # ---- Soya Chaap: North Indian street/restaurant staple, one per real style ----
    add(cross(["Chaap"], ["Malai", "Achari", "Tandoori", "Masala", "Pahadi", "Afghani",
                          "Reshmi", "Lahsuni", "Peshawari", "Amritsari"], fmt="{m} {b}"))

    # ---- Cheela / Chilla: North Indian savoury pancake, one per real batter ----
    add(cross(["Cheela", "Chilla"],
              ["Besan", "Moong Dal", "Vegetable", "Paneer", "Suji", "Oats", "Palak"],
              fmt="{m} {b}"))

    # ---- Salads, North Indian style ----
    add(cross(["Salad"], ["Kachumber", "Green", "Onion Lemon", "Sprouts North Style",
                          "Fruit North Style", "Boiled Vegetable"], fmt="{m} {b}"))

    # ---- Paneer, further named dishes not reached by the protein x style cross ----
    add(["Paneer Pasanda", "Paneer Angara", "Paneer Kali Mirch", "Paneer Lahsuni",
         "Paneer Peshawari", "Paneer Amritsari", "Chilli Paneer Dry", "Paneer Chilli Milli"])

    # ---- More Mughlai kebab varieties ----
    add(["Pasanda Kebab", "Kalmi Kebab", "Patili Kebab", "Kurchan Kebab", "Seekh Kebab Roll",
         "Chicken Pasanda"])

    # ---- More regional biryani names ----
    add(["Sindhi Biryani North Style", "Bohri Biryani", "Delhi Biryani", "Old Delhi Biryani",
         "Mughlai Biryani"])

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
    print("candidates     : %d North Indian dishes" % len(rows))
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
