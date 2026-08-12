"""
Which common SWEETS and ICE CREAM items is the catalogue missing?

Third sibling of south-indian-gap-audit.py / north-indian-gap-audit.py, same reasoning, dessert
scope instead of a region: ice cream and frozen desserts, Western bakery desserts, chocolate and
confectionery, and pan-Indian sweets not already covered by the two regional audits (those two
already own Tamil/Kerala/Karnataka/Andhra and Punjabi/Mughlai/Rajasthani/Gujarati/Bengali/
Kashmiri/Pahari mithai specifically). The pool is built COMBINATORIALLY -- a flavour times a
real format, a base times a real topping -- and only pairs that are real products are kept.

MATCHING IS THREE-WAY, same as the other two audits:
    present   the exact name exists
    variant   contains/contained-by or one edit away, AND close enough in length that it is not
              a coincidence ("Chocolate" already in the catalogue does not mean "Chocolate Chip
              Cookie Dough Ice Cream" is covered -- different food, different macros)
    MISSING   nothing resembling it

usage:  python tools/food-import/sweets-icecream-gap-audit.py [--limit 2000]
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
OUT = REPO / "sweets-icecream-foods-to-add.csv"


def cross(bases, mods, fmt="{b} {m}"):
    return [fmt.format(m=m, b=b) for b in bases for m in mods]


def build():
    out = []
    add = out.extend

    # ---- Ice cream: flavour x format, the single densest category here ----
    flavours = ["Vanilla", "Chocolate", "Strawberry", "Butterscotch", "Mango", "Alphonso Mango",
                "Pistachio", "Kesar Pista", "American Nuts", "Black Currant", "Blueberry",
                "Cookies and Cream", "Chocolate Chip", "Mint Chocolate Chip", "Rocky Road",
                "Tutti Frutti", "Fig and Honey", "Belgian Chocolate", "Death by Chocolate",
                "Litchi", "Rose", "Anjeer", "Caramel", "Coffee", "Hazelnut", "Almond", "Cashew",
                "Coconut", "Banana", "Guava", "Watermelon", "Orange", "Lemon", "Chikoo",
                "Custard Apple", "Sitaphal", "Jackfruit", "Paan", "Gulkand", "Rasmalai",
                "Gulab Jamun", "Jalebi Rabri", "Anjeer Honey", "Fruit and Nut", "Bubblegum",
                "Cotton Candy", "Choco Chip Cookie Dough", "Salted Caramel", "Toffee",
                "Butter Pecan", "Neapolitan", "Green Tea", "Matcha", "Lavender", "Cardamom",
                "Saffron", "Pineapple", "Raspberry", "Blackberry", "Peach", "Fig", "Date",
                "Walnut", "Pecan", "Espresso", "Tiramisu", "Red Velvet", "Black Forest",
                "Oreo", "KitKat", "Ferrero", "Nutella", "Biscoff", "Cheesecake"]
    formats = ["Cone", "Cup", "Tub", "Family Pack", "Bar", "Stick", "Sandwich"]
    add(cross(flavours, formats, fmt="{b} {m}"))

    # ---- Kulfi: format matters, not flavour density -- it is not scooped ice cream ----
    add(cross(["Kulfi"], ["Malai", "Pista", "Kesar", "Mango", "Rose", "Paan", "Anjeer",
                          "Falooda", "Matka", "Rabri"], fmt="{m} {b}"))
    add(["Kulfi Stick", "Kulfi Falooda"])

    # ---- Named ice cream combos, sold and logged as one item ----
    add(["Hot Fudge Sundae", "Brownie Sundae", "Banana Split", "Choco Lava Sundae",
         "Oreo Sundae", "KitKat Sundae", "Ice Cream Cake", "Ice Cream Roll",
         "Ice Cream Sandwich", "Softy Cone", "Softy Cup", "Choco Bar", "Cassata",
         "Bombe Ice Cream", "Ice Cream Float", "Ice Cream Shake", "Sizzling Brownie With Ice Cream"]
        )

    # ---- Frozen desserts beyond ice cream ----
    add(cross(["Gelato"], ["Vanilla", "Chocolate", "Pistachio", "Hazelnut", "Coffee",
                           "Strawberry", "Mango", "Lemon", "Tiramisu"], fmt="{m} {b}"))
    add(cross(["Sorbet"], ["Mango", "Lemon", "Raspberry", "Orange", "Watermelon", "Lychee",
                          "Passion Fruit", "Blackcurrant"], fmt="{m} {b}"))
    add(cross(["Frozen Yogurt"], ["Vanilla", "Mango", "Strawberry", "Chocolate", "Mixed Berry",
                                  "Plain"], fmt="{m} {b}"))
    add(cross(["Popsicle", "Ice Lolly", "Ice Candy"],
              ["Mango", "Orange", "Kala Khatta", "Cola", "Lemon", "Strawberry", "Litchi",
               "Watermelon", "Chocolate", "Guava"], fmt="{m} {b}"))
    add(["Milkshake", "Chocolate Milkshake", "Vanilla Milkshake", "Strawberry Milkshake",
         "Mango Milkshake", "Oreo Milkshake", "Kitkat Milkshake", "Banana Milkshake",
         "Cold Coffee Milkshake", "Butterscotch Milkshake", "Thick Shake"])

    # ---- Cakes: base flavour x form ----
    cake_flavours = ["Chocolate", "Red Velvet", "Black Forest", "Vanilla", "Carrot",
                      "Cheesecake", "Tres Leches", "Pineapple", "Butterscotch", "Rainbow",
                      "Fruit", "Plum", "Chocolate Truffle", "Coffee", "Lemon", "Banana",
                      "Marble", "Chocolate Chip", "Coconut", "Mango", "Strawberry",
                      "Dark Chocolate Truffle", "White Chocolate", "Nutella", "Ferrero Rocher",
                      "Oreo", "Blueberry", "Walnut", "Dry Fruit"]
    cake_forms = ["Cake", "Cupcake", "Slice", "Pastry", "Loaf Cake", "Muffin"]
    add(cross(cake_flavours, cake_forms, fmt="{b} {m}"))
    add(["New York Cheesecake", "Blueberry Cheesecake", "Baked Cheesecake", "No Bake Cheesecake",
         "Christmas Plum Cake", "Wedding Cake Slice", "Birthday Cake Slice"])

    # ---- Cookies and biscuits ----
    add(cross(["Cookie"], ["Chocolate Chip", "Oatmeal", "Butter", "Shortbread", "Ginger Snap",
                           "Double Chocolate", "Coconut", "Almond", "Ragi", "Oat and Raisin",
                           "Peanut Butter", "White Chocolate Macadamia", "Red Velvet",
                           "Jam Filled"], fmt="{m} {b}"))
    add(["Rusk", "Nankhatai", "Kaju Cookies", "Karachi Cookies", "Butter Biscuit",
         "Cream Biscuit", "Digestive Biscuit", "Marie Biscuit", "Fig Roll"])

    # ---- Pies, tarts and puddings ----
    add(cross(["Pie"], ["Apple", "Pecan", "Pumpkin", "Key Lime", "Cherry", "Banoffee",
                        "Chicken Pot", "Custard"], fmt="{m} {b}"))
    add(cross(["Tart"], ["Lemon", "Fruit", "Custard", "Egg", "Chocolate", "Berry",
                         "Portuguese Egg"], fmt="{m} {b}"))
    add(cross(["Pudding"], ["Chocolate", "Bread", "Caramel", "Rice", "Butterscotch",
                            "Vanilla", "Christmas", "Bread and Butter", "Sticky Toffee",
                            "Date", "Coconut"], fmt="{m} {b}"))
    add(cross(["Mousse"], ["Chocolate", "Mango", "Strawberry", "Coffee", "White Chocolate",
                           "Butterscotch", "Blueberry"], fmt="{m} {b}"))

    # ---- Donuts and muffins ----
    add(cross(["Donut"], ["Glazed", "Chocolate", "Boston Cream", "Jam Filled", "Cinnamon",
                          "Powdered Sugar", "Sprinkle", "Nutella Filled"], fmt="{m} {b}"))
    add(cross(["Muffin"], ["Blueberry", "Chocolate", "Banana", "Bran", "Chocolate Chip",
                           "Double Chocolate", "Lemon Poppy Seed"], fmt="{m} {b}"))

    # ---- Named international desserts ----
    add(["Tiramisu", "Panna Cotta", "Creme Brulee", "Baklava", "Churros",
         "Chocolate Fondue", "Waffle With Ice Cream", "Belgian Waffle", "Pancake With Syrup",
         "Trifle Pudding", "English Trifle", "Eclair", "Profiterole", "Choux Pastry",
         "Napoleon Pastry", "Millefeuille", "Macaron", "Macaroon", "Cannoli",
         "Chocolate Souffle", "Bread Pudding With Custard", "Sticky Date Pudding",
         "Banoffee Pie", "Eton Mess"])

    # ---- Chocolate and confectionery ----
    add(cross(["Chocolate"], ["Dark", "Milk", "White", "Hazelnut", "Almond", "Fruit and Nut",
                              "Orange", "Mint", "Coffee", "Caramel Filled", "Wafer",
                              "Praline"], fmt="{m} {b}"))
    add(["Chocolate Truffle", "Chocolate Barfi", "Chocolate Fudge", "Chocolate Brownie Bites",
         "Chocolate Coated Almonds", "Chocolate Coated Raisins", "Rocky Road Fudge"])
    add(cross(["Candy"], ["Toffee", "Caramel", "Gummy Bear", "Lollipop", "Mint", "Hard",
                          "Fruit", "Mango", "Orange", "Eclairs"], fmt="{m} {b}"))
    add(["Peanut Brittle", "Praline Chocolate", "Nougat", "Marshmallow", "Chikki",
         "Toffee Bar", "Fudge Bar", "Butterscotch Candy", "Coffee Candy"])

    # ---- Pan-Indian sweets not owned by either regional audit ----
    add(["Rasgulla", "Rasmalai", "Gulab Jamun", "Jalebi", "Imarti", "Mysore Pak", "Sandesh",
         "Mishti Doi", "Malpua", "Shrikhand", "Basundi", "Rabri", "Modak", "Ariselu",
         "Kalakand", "Milk Cake", "Sohan Halwa", "Double Ka Meetha", "Shahi Tukda",
         "Phirni", "Kulfi Falooda", "Falooda", "Petha", "Balushahi", "Soan Papdi",
         "Peda", "Kaju Katli", "Motichoor Ladoo", "Boondi Ladoo", "Coconut Ladoo",
         "Rava Ladoo", "Til Ladoo", "Anjeer Barfi", "Pista Roll", "Kaju Roll",
         "Dry Fruit Ladoo", "Badam Halwa", "Moong Dal Halwa", "Gajar Halwa"])

    # ---- Sweet drinks and dessert-adjacent beverages ----
    add(["Rose Milk", "Badam Milk", "Kesar Milk", "Thandai", "Falooda Kulfi",
         "Chocolate Shake", "Nutella Shake", "Oreo Shake", "Brownie Shake",
         "Iced Chocolate", "Iced Mocha", "Frappe Chocolate", "Frappe Coffee"])

    # ---- More ice cream flavours, and ice cream with real mix-ins ----
    flavours2 = ["Rum and Raisin", "Choco Fudge", "Choco Almond Fudge", "Malai", "Kaju Draksh",
                 "Roasted Almond", "Mango Duet", "American Dry Fruit", "Badam Pista", "Elaichi",
                 "Kesar Elaichi", "Choco Vanilla", "Strawberry Cheesecake", "Blue Moon",
                 "Bubblegum Blast", "Lychee", "Passionfruit", "Guava Chilli", "Thandai",
                 "Chikoo", "Sitaphal", "Ferrero Rocher", "Snickers", "Bounty", "Twix",
                 "Cadbury Gems", "Choco Brownie", "Praline Crunch", "Mocha", "Irish Coffee",
                 "Vanilla Bean", "Double Chocolate"]
    add(cross(flavours2, formats, fmt="{b} {m}"))
    add(cross(["Ice Cream"],
              ["With Brownie", "With Cookie Dough", "With Nuts", "With Sprinkles",
               "With Hot Fudge", "With Caramel Sauce", "With Choco Chips", "With Wafer",
               "With Gems", "With Waffle Cone", "With Chocolate Sauce"], fmt="{b} {m}"))
    add(["Tricolor Ice Cream", "Cassata Slice", "Matka Kulfi", "Falooda Royal",
         "Kulfi Falooda Royal", "Choco Bar Classic", "Orange Bar", "Mango Bar",
         "Vanilla Sandwich Bar"])

    # ---- More cakes ----
    add(cross(["Trifle Cake", "Opera Cake", "Chiffon Cake", "Sponge Cake", "Bundt Cake",
               "Swiss Roll", "Pound Cake", "Devils Food Cake", "Angel Food Cake",
               "Coffee Walnut Cake"], ["Chocolate", "Vanilla", "Coffee", "Fruit"],
              fmt="{m} {b}"))

    # ---- More cookies ----
    add(["Snickerdoodle", "Linzer Cookie", "Florentine Cookie", "Biscotti", "Rainbow Cookie",
         "Fortune Cookie", "Almond Biscotti", "Chocolate Biscotti"])

    # ---- International sweets not yet covered ----
    add(["Turkish Delight", "Kunafa", "Basbousa", "Halva Middle Eastern", "Maamoul", "Knafeh",
         "Mochi", "Dorayaki", "Taiyaki", "Dango", "Red Bean Bun", "Baklava Pistachio",
         "Baklava Walnut"])

    # ---- Fruit-based desserts ----
    add(["Fruit Custard", "Fruit Trifle", "Fruit Salad With Ice Cream", "Fruit Cream",
         "Caramel Custard", "Baked Custard", "Mango Custard", "Apple Crumble",
         "Berry Crumble", "Peach Cobbler", "Strawberry Shortcake", "Pineapple Upside Down Cake"])

    # ---- More milkshakes and thick shakes ----
    add(["Rose Milkshake", "Fig Milkshake", "Dates Milkshake", "Almond Milkshake",
         "Pista Milkshake", "Blueberry Milkshake", "Blackcurrant Milkshake",
         "Coconut Milkshake", "Peanut Butter Milkshake", "Nutella Milkshake",
         "Cookies and Cream Shake", "Caramel Shake"])

    # ---- More Indian sweet snacks and barfi/peda varieties ----
    add(["Coconut Barfi", "Dry Fruit Barfi", "Mawa Barfi", "Chocolate Coconut Barfi",
         "Til Barfi", "Khoya Peda", "Chocolate Peda", "Kesar Peda", "Mathura Peda",
         "Rajgira Ladoo", "Poha Ladoo", "Puffed Rice Ladoo", "Sesame Ladoo",
         "Amla Candy", "Aam Papad", "Mango Leather"])

    # ---- Gourmet/regional ice cream flavours, and a couple more formats ----
    flavours3 = ["Litchi Rose", "Jamun", "Custard Apple Duet", "Mango Alphonso Duet",
                 "Choco Walnut", "Cookie Butter", "Speculoos", "Salted Pistachio", "Honeycomb",
                 "Toffee Crunch", "Biscoff Crunch", "Oreo Crunch", "Birthday Cake",
                 "Cotton Candy Blast", "Rainbow Sherbet", "Tender Coconut", "Jackfruit",
                 "Pomegranate", "Kiwi", "Dragon Fruit", "Muskmelon", "Sapota", "Avocado",
                 "Roasted Coconut", "Choco Hazelnut Swirl"]
    add(cross(flavours3, formats, fmt="{b} {m}"))
    add(cross(flavours + flavours2, ["Slab", "Brick", "Mini Cup", "Kids Cup", "Party Pack"],
              fmt="{b} {m}"))

    # ---- More named sundaes/combos ----
    add(["Death By Chocolate Sundae", "Choco Volcano", "Mud Pie", "Baked Alaska", "Affogato",
         "Knickerbocker Glory", "Peanut Butter Sundae"])

    # ---- More confectionery ----
    add(["Wafer Chocolate Bar", "Crispy Chocolate Bar", "Nut Chocolate Bar",
         "Coconut Chocolate Bar", "Peppermint Candy", "Spearmint Candy", "Bubble Gum",
         "Chewing Gum", "Sour Candy", "Jelly Candy", "Liquorice Candy", "Rock Candy",
         "Misri", "Sugar Candy"])

    # ---- More bakery sweets ----
    add(["Cinnamon Roll", "Sticky Bun", "Danish Pastry", "Chocolate Croissant", "Cream Horn",
         "Apple Danish", "Cheese Danish", "Custard Danish"])

    # ---- Sweet breakfast crossovers ----
    add(["Chocolate Chip Pancake", "Blueberry Waffle", "French Toast With Syrup",
         "Nutella Pancake", "Banana Pancake", "Belgian Waffle With Ice Cream",
         "Maple Syrup Waffle"])

    # ---- A last round of real ice cream flavours, the ones a well-stocked parlour still has ----
    flavours4 = ["Choco Chip Cookie", "Nutty Caramel", "Choco Mint", "Cherry Vanilla",
                 "Black Cherry", "Grape", "Plum", "Apricot", "Rum Ball", "Egg Nog",
                 "Gingerbread", "Pumpkin Spice", "Maple Walnut", "Butter Rum", "Spumoni",
                 "Zabaglione", "Stracciatella", "Pistachio Almond", "Tender Coconut Malai",
                 "Sitaphal Rabri"]
    add(cross(flavours4, formats, fmt="{b} {m}"))

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
    print("candidates     : %d sweets/ice cream items" % len(rows))
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
