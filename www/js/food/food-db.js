/* =========================================================
   IGNYT FOOD DATABASE — bundled seed catalogue

   WHAT THIS IS
   A curated reference catalogue of common foods, stored PER 100 g (or per 100 ml for
   liquids). It exists so logging a food no longer requires the user to know and type its
   macros by hand -- previously the only way to log anything.

   WHY PER 100 G
   Every value here is normalised to 100 g, which is how USDA, IFCT and Open Food Facts all
   publish. That means (a) one consistent unit for the whole catalogue, (b) portion maths is
   a single multiply, and (c) a future importer can normalise any external dataset into this
   exact shape without a schema change. Serving/household-measure conversion builds on top of
   this in a later phase; nothing here assumes a particular portion size.

   ACCURACY
   Values are rounded reference figures for the generic form of each food, in line with
   published composition tables. They are good enough for everyday calorie and macro
   tracking, which is what this app does -- they are NOT laboratory values, and a specific
   brand or preparation will differ. Branded items belong in the future Open Food Facts
   import path, not here.

   STORAGE FOOTPRINT
   Deliberately a compact tuple array, not objects -- the same pattern the exercise LIBRARY
   uses. Roughly 60 KB of source for the whole catalogue, parsed once at load and indexed
   in memory by food-search.js. Nothing is written to localStorage: this is static bundled
   reference data, so it costs no user storage quota and never needs syncing.

   TUPLE SHAPE
   [ name, category, kcal, protein_g, carbs_g, fat_g, fibre_g ]   // all per 100 g
========================================================= */
(function () {
  "use strict";

  var CATEGORIES = [
    "Vegetables", "Fruits", "Grains", "Rice", "Bread", "Pasta", "Beans", "Legumes",
    "Nuts", "Seeds", "Dairy", "Eggs", "Chicken", "Turkey", "Beef", "Pork", "Fish",
    "Seafood", "Indian Foods", "Fast Food", "Desserts", "Snacks", "Beverages",
    "Protein Supplements", "Sauces", "Oils", "Custom Foods"
  ];

  /* name, category, kcal, protein, carbs, fat, fibre  — per 100 g */
  var FOODS = [
    // ---------- Vegetables ----------
    ["Broccoli", "Vegetables", 34, 2.8, 6.6, 0.4, 2.6],
    ["Spinach", "Vegetables", 23, 2.9, 3.6, 0.4, 2.2],
    ["Kale", "Vegetables", 49, 4.3, 8.8, 0.9, 3.6],
    ["Carrot", "Vegetables", 41, 0.9, 9.6, 0.2, 2.8],
    ["Potato", "Vegetables", 77, 2.0, 17.5, 0.1, 2.2],
    ["Sweet Potato", "Vegetables", 86, 1.6, 20.1, 0.1, 3.0],
    ["Tomato", "Vegetables", 18, 0.9, 3.9, 0.2, 1.2],
    ["Cucumber", "Vegetables", 15, 0.7, 3.6, 0.1, 0.5],
    ["Bell Pepper", "Vegetables", 31, 1.0, 6.0, 0.3, 2.1],
    ["Onion", "Vegetables", 40, 1.1, 9.3, 0.1, 1.7],
    ["Garlic", "Vegetables", 149, 6.4, 33.1, 0.5, 2.1],
    ["Cauliflower", "Vegetables", 25, 1.9, 5.0, 0.3, 2.0],
    ["Cabbage", "Vegetables", 25, 1.3, 5.8, 0.1, 2.5],
    ["Mushroom", "Vegetables", 22, 3.1, 3.3, 0.3, 1.0],
    ["Zucchini", "Vegetables", 17, 1.2, 3.1, 0.3, 1.0],
    ["Aubergine", "Vegetables", 25, 1.0, 5.9, 0.2, 3.0],
    ["Okra", "Vegetables", 33, 1.9, 7.5, 0.2, 3.2],
    ["Green Beans", "Vegetables", 31, 1.8, 7.0, 0.1, 3.4],
    ["Peas", "Vegetables", 81, 5.4, 14.5, 0.4, 5.7],
    ["Corn", "Vegetables", 86, 3.3, 19.0, 1.2, 2.0],
    ["Beetroot", "Vegetables", 43, 1.6, 9.6, 0.2, 2.8],
    ["Pumpkin", "Vegetables", 26, 1.0, 6.5, 0.1, 0.5],
    ["Asparagus", "Vegetables", 20, 2.2, 3.9, 0.1, 2.1],
    ["Celery", "Vegetables", 16, 0.7, 3.0, 0.2, 1.6],
    ["Lettuce", "Vegetables", 15, 1.4, 2.9, 0.2, 1.3],
    ["Avocado", "Vegetables", 160, 2.0, 8.5, 14.7, 6.7],
    ["Bottle Gourd", "Vegetables", 14, 0.6, 3.4, 0.0, 0.5],
    ["Bitter Gourd", "Vegetables", 17, 1.0, 3.7, 0.2, 2.8],
    ["Radish", "Vegetables", 16, 0.7, 3.4, 0.1, 1.6],
    ["Turnip", "Vegetables", 28, 0.9, 6.4, 0.1, 1.8],

    // ---------- Fruits ----------
    ["Banana", "Fruits", 89, 1.1, 22.8, 0.3, 2.6],
    ["Apple", "Fruits", 52, 0.3, 13.8, 0.2, 2.4],
    ["Orange", "Fruits", 47, 0.9, 11.8, 0.1, 2.4],
    ["Mango", "Fruits", 60, 0.8, 15.0, 0.4, 1.6],
    ["Grapes", "Fruits", 69, 0.7, 18.1, 0.2, 0.9],
    ["Strawberry", "Fruits", 32, 0.7, 7.7, 0.3, 2.0],
    ["Blueberry", "Fruits", 57, 0.7, 14.5, 0.3, 2.4],
    ["Raspberry", "Fruits", 52, 1.2, 11.9, 0.7, 6.5],
    ["Pineapple", "Fruits", 50, 0.5, 13.1, 0.1, 1.4],
    ["Watermelon", "Fruits", 30, 0.6, 7.6, 0.2, 0.4],
    ["Papaya", "Fruits", 43, 0.5, 10.8, 0.3, 1.7],
    ["Pear", "Fruits", 57, 0.4, 15.2, 0.1, 3.1],
    ["Peach", "Fruits", 39, 0.9, 9.5, 0.3, 1.5],
    ["Kiwi", "Fruits", 61, 1.1, 14.7, 0.5, 3.0],
    ["Pomegranate", "Fruits", 83, 1.7, 18.7, 1.2, 4.0],
    ["Guava", "Fruits", 68, 2.6, 14.3, 1.0, 5.4],
    ["Cherry", "Fruits", 63, 1.1, 16.0, 0.2, 2.1],
    ["Plum", "Fruits", 46, 0.7, 11.4, 0.3, 1.4],
    ["Melon", "Fruits", 34, 0.8, 8.2, 0.2, 0.9],
    ["Lemon", "Fruits", 29, 1.1, 9.3, 0.3, 2.8],
    ["Dates", "Fruits", 282, 2.5, 75.0, 0.4, 8.0],
    ["Raisins", "Fruits", 299, 3.1, 79.2, 0.5, 3.7],
    ["Coconut", "Fruits", 354, 3.3, 15.2, 33.5, 9.0],
    ["Fig", "Fruits", 74, 0.8, 19.2, 0.3, 2.9],
    ["Apricot", "Fruits", 48, 1.4, 11.1, 0.4, 2.0],

    // ---------- Grains / Rice / Bread / Pasta ----------
    ["White Rice (cooked)", "Rice", 130, 2.7, 28.2, 0.3, 0.4],
    ["Brown Rice (cooked)", "Rice", 123, 2.7, 25.6, 1.0, 1.6],
    ["Basmati Rice (cooked)", "Rice", 121, 3.5, 25.2, 0.4, 0.5],
    ["White Rice (raw)", "Rice", 365, 7.1, 80.0, 0.7, 1.3],
    ["Brown Rice (raw)", "Rice", 370, 7.9, 77.2, 2.9, 3.5],
    ["Oats", "Grains", 389, 16.9, 66.3, 6.9, 10.6],
    ["Rolled Oats (cooked)", "Grains", 71, 2.5, 12.0, 1.5, 1.7],
    ["Quinoa (cooked)", "Grains", 120, 4.4, 21.3, 1.9, 2.8],
    ["Wheat Flour", "Grains", 364, 10.3, 76.3, 1.0, 2.7],
    ["Whole Wheat Flour", "Grains", 340, 13.2, 72.0, 2.5, 10.7],
    ["Barley (cooked)", "Grains", 123, 2.3, 28.2, 0.4, 3.8],
    ["Couscous (cooked)", "Grains", 112, 3.8, 23.2, 0.2, 1.4],
    ["Buckwheat (cooked)", "Grains", 92, 3.4, 19.9, 0.6, 2.7],
    ["Millet (cooked)", "Grains", 119, 3.5, 23.7, 1.0, 1.3],
    ["Cornflakes", "Grains", 357, 7.5, 84.1, 0.4, 3.3],
    ["Muesli", "Grains", 375, 9.7, 66.0, 6.9, 7.7],
    ["Granola", "Grains", 471, 10.1, 64.4, 20.3, 7.0],
    ["White Bread", "Bread", 265, 9.0, 49.0, 3.2, 2.7],
    ["Whole Wheat Bread", "Bread", 247, 13.0, 41.0, 3.4, 7.0],
    ["Sourdough Bread", "Bread", 289, 12.0, 56.0, 1.8, 2.4],
    ["Rye Bread", "Bread", 259, 8.5, 48.3, 3.3, 5.8],
    ["Bagel", "Bread", 250, 10.0, 49.0, 1.5, 2.1],
    ["Pita Bread", "Bread", 275, 9.1, 55.7, 1.2, 2.2],
    ["Tortilla", "Bread", 306, 8.2, 51.4, 7.6, 3.0],
    ["Croissant", "Bread", 406, 8.2, 45.8, 21.0, 2.6],
    ["Pasta (cooked)", "Pasta", 131, 5.0, 25.0, 1.1, 1.8],
    ["Whole Wheat Pasta (cooked)", "Pasta", 124, 5.3, 26.5, 0.5, 4.5],
    ["Spaghetti (cooked)", "Pasta", 158, 5.8, 30.9, 0.9, 1.8],
    ["Noodles (cooked)", "Pasta", 138, 4.5, 25.2, 2.1, 1.2],
    ["Instant Noodles", "Pasta", 448, 9.4, 60.3, 17.6, 3.1],

    // ---------- Beans / Legumes ----------
    ["Chickpeas (cooked)", "Legumes", 164, 8.9, 27.4, 2.6, 7.6],
    ["Black Beans (cooked)", "Beans", 132, 8.9, 23.7, 0.5, 8.7],
    ["Kidney Beans (cooked)", "Beans", 127, 8.7, 22.8, 0.5, 6.4],
    ["Lentils (cooked)", "Legumes", 116, 9.0, 20.1, 0.4, 7.9],
    ["Red Lentils (cooked)", "Legumes", 120, 9.5, 20.0, 0.4, 5.0],
    ["Soybeans (cooked)", "Legumes", 172, 18.2, 8.4, 9.0, 6.0],
    ["Edamame", "Legumes", 121, 11.9, 8.9, 5.2, 5.2],
    ["Tofu", "Legumes", 76, 8.1, 1.9, 4.8, 0.3],
    ["Tempeh", "Legumes", 192, 20.3, 7.6, 10.8, 0.0],
    ["Green Gram (cooked)", "Legumes", 105, 7.0, 19.1, 0.4, 7.6],
    ["Black Gram (cooked)", "Legumes", 105, 7.5, 18.0, 0.5, 7.0],
    ["Pinto Beans (cooked)", "Beans", 143, 9.0, 26.2, 0.7, 9.0],
    ["Baked Beans", "Beans", 94, 4.8, 15.6, 0.5, 4.1],

    // ---------- Nuts / Seeds ----------
    ["Almonds", "Nuts", 579, 21.2, 21.6, 49.9, 12.5],
    ["Walnuts", "Nuts", 654, 15.2, 13.7, 65.2, 6.7],
    ["Cashews", "Nuts", 553, 18.2, 30.2, 43.9, 3.3],
    ["Peanuts", "Nuts", 567, 25.8, 16.1, 49.2, 8.5],
    ["Pistachios", "Nuts", 560, 20.2, 27.2, 45.3, 10.6],
    ["Hazelnuts", "Nuts", 628, 15.0, 16.7, 60.8, 9.7],
    ["Pecans", "Nuts", 691, 9.2, 13.9, 72.0, 9.6],
    ["Brazil Nuts", "Nuts", 659, 14.3, 11.7, 67.1, 7.5],
    ["Macadamia Nuts", "Nuts", 718, 7.9, 13.8, 75.8, 8.6],
    ["Peanut Butter", "Nuts", 588, 25.1, 20.0, 50.4, 6.0],
    ["Almond Butter", "Nuts", 614, 21.0, 18.8, 55.5, 10.3],
    ["Chia Seeds", "Seeds", 486, 16.5, 42.1, 30.7, 34.4],
    ["Flax Seeds", "Seeds", 534, 18.3, 28.9, 42.2, 27.3],
    ["Pumpkin Seeds", "Seeds", 559, 30.2, 10.7, 49.1, 6.0],
    ["Sunflower Seeds", "Seeds", 584, 20.8, 20.0, 51.5, 8.6],
    ["Sesame Seeds", "Seeds", 573, 17.7, 23.4, 49.7, 11.8],

    // ---------- Dairy / Eggs ----------
    ["Whole Milk", "Dairy", 61, 3.2, 4.8, 3.3, 0.0],
    ["Skimmed Milk", "Dairy", 34, 3.4, 5.0, 0.1, 0.0],
    ["Semi-Skimmed Milk", "Dairy", 47, 3.4, 4.8, 1.8, 0.0],
    ["Greek Yogurt", "Dairy", 59, 10.2, 3.6, 0.4, 0.0],
    ["Yogurt", "Dairy", 61, 3.5, 4.7, 3.3, 0.0],
    ["Low-Fat Yogurt", "Dairy", 63, 5.3, 7.0, 1.6, 0.0],
    ["Cottage Cheese", "Dairy", 98, 11.1, 3.4, 4.3, 0.0],
    ["Cheddar Cheese", "Dairy", 403, 24.9, 1.3, 33.1, 0.0],
    ["Mozzarella", "Dairy", 280, 22.2, 2.2, 20.0, 0.0],
    ["Parmesan", "Dairy", 431, 38.5, 4.1, 29.0, 0.0],
    ["Feta Cheese", "Dairy", 264, 14.2, 4.1, 21.3, 0.0],
    ["Cream Cheese", "Dairy", 342, 6.2, 4.1, 34.2, 0.0],
    ["Butter", "Dairy", 717, 0.9, 0.1, 81.1, 0.0],
    ["Ghee", "Dairy", 900, 0.0, 0.0, 100.0, 0.0],
    ["Double Cream", "Dairy", 340, 2.1, 2.8, 36.0, 0.0],
    ["Whole Egg", "Eggs", 143, 12.6, 0.7, 9.5, 0.0],
    ["Egg White", "Eggs", 52, 10.9, 0.7, 0.2, 0.0],
    ["Egg Yolk", "Eggs", 322, 15.9, 3.6, 26.5, 0.0],
    ["Boiled Egg", "Eggs", 155, 12.6, 1.1, 10.6, 0.0],
    ["Scrambled Eggs", "Eggs", 149, 10.0, 1.6, 11.0, 0.0],
    ["Omelette", "Eggs", 154, 10.6, 0.6, 11.7, 0.0],

    // ---------- Chicken / Turkey ----------
    ["Chicken Breast", "Chicken", 165, 31.0, 0.0, 3.6, 0.0],
    ["Chicken Breast (raw)", "Chicken", 120, 22.5, 0.0, 2.6, 0.0],
    ["Chicken Thigh", "Chicken", 209, 26.0, 0.0, 10.9, 0.0],
    ["Chicken Drumstick", "Chicken", 172, 28.3, 0.0, 5.7, 0.0],
    ["Chicken Wing", "Chicken", 203, 30.5, 0.0, 8.1, 0.0],
    ["Roast Chicken", "Chicken", 190, 28.9, 0.0, 7.5, 0.0],
    ["Grilled Chicken", "Chicken", 165, 31.0, 0.0, 3.6, 0.0],
    ["Fried Chicken", "Chicken", 246, 24.0, 8.0, 12.0, 0.4],
    ["Turkey Breast", "Turkey", 135, 30.1, 0.0, 0.7, 0.0],
    ["Ground Turkey", "Turkey", 203, 27.4, 0.0, 10.4, 0.0],

    // ---------- Beef / Pork ----------
    ["Beef Steak", "Beef", 271, 25.9, 0.0, 18.5, 0.0],
    ["Lean Beef Mince", "Beef", 176, 20.0, 0.0, 10.0, 0.0],
    ["Beef Mince", "Beef", 254, 17.2, 0.0, 20.0, 0.0],
    ["Sirloin Steak", "Beef", 206, 28.0, 0.0, 10.6, 0.0],
    ["Ribeye Steak", "Beef", 291, 24.0, 0.0, 21.2, 0.0],
    ["Lamb Chop", "Beef", 294, 24.5, 0.0, 21.0, 0.0],
    ["Pork Chop", "Pork", 231, 25.7, 0.0, 13.9, 0.0],
    ["Pork Loin", "Pork", 143, 21.0, 0.0, 5.9, 0.0],
    ["Bacon", "Pork", 541, 37.0, 1.4, 42.0, 0.0],
    ["Ham", "Pork", 145, 20.9, 1.5, 5.5, 0.0],
    ["Sausage", "Pork", 301, 12.0, 2.5, 27.0, 0.0],

    // ---------- Fish / Seafood ----------
    ["Salmon", "Fish", 208, 20.4, 0.0, 13.4, 0.0],
    ["Tuna", "Fish", 132, 28.0, 0.0, 1.3, 0.0],
    ["Canned Tuna", "Fish", 116, 25.5, 0.0, 0.8, 0.0],
    ["Cod", "Fish", 82, 17.8, 0.0, 0.7, 0.0],
    ["Tilapia", "Fish", 96, 20.1, 0.0, 1.7, 0.0],
    ["Mackerel", "Fish", 205, 18.6, 0.0, 13.9, 0.0],
    ["Sardines", "Fish", 208, 24.6, 0.0, 11.5, 0.0],
    ["Trout", "Fish", 148, 20.8, 0.0, 6.6, 0.0],
    ["Prawns", "Seafood", 99, 24.0, 0.2, 0.3, 0.0],
    ["Shrimp", "Seafood", 99, 24.0, 0.2, 0.3, 0.0],
    ["Crab", "Seafood", 97, 19.4, 0.0, 1.5, 0.0],
    ["Lobster", "Seafood", 89, 19.0, 0.0, 0.9, 0.0],
    ["Squid", "Seafood", 92, 15.6, 3.1, 1.4, 0.0],
    ["Mussels", "Seafood", 86, 11.9, 3.7, 2.2, 0.0],

    // ---------- Indian Foods ----------
    ["Chapati", "Indian Foods", 297, 11.0, 46.4, 7.5, 4.9],
    ["Roti", "Indian Foods", 297, 11.0, 46.4, 7.5, 4.9],
    ["Naan", "Indian Foods", 310, 9.0, 50.0, 8.0, 2.2],
    ["Paratha", "Indian Foods", 326, 6.4, 45.0, 13.5, 3.4],
    ["Idli", "Indian Foods", 132, 3.4, 27.0, 0.4, 1.2],
    ["Dosa", "Indian Foods", 168, 3.9, 29.0, 3.7, 1.4],
    ["Masala Dosa", "Indian Foods", 195, 4.2, 30.0, 6.5, 2.1],
    ["Upma", "Indian Foods", 172, 4.0, 26.0, 5.9, 1.8],
    ["Poha", "Indian Foods", 158, 3.0, 28.0, 4.0, 1.5],
    ["Dal (cooked)", "Indian Foods", 116, 7.0, 18.0, 1.5, 5.0],
    ["Dal Tadka", "Indian Foods", 145, 7.5, 17.0, 5.5, 4.8],
    ["Rajma", "Indian Foods", 140, 8.0, 21.0, 3.0, 6.0],
    ["Chole", "Indian Foods", 180, 8.5, 25.0, 5.5, 7.0],
    ["Paneer", "Indian Foods", 265, 18.3, 1.2, 20.8, 0.0],
    ["Paneer Tikka", "Indian Foods", 270, 18.0, 6.0, 19.0, 1.0],
    ["Palak Paneer", "Indian Foods", 180, 9.0, 8.0, 13.0, 2.5],
    ["Butter Chicken", "Indian Foods", 240, 15.0, 8.0, 16.5, 1.0],
    ["Chicken Curry", "Indian Foods", 180, 15.0, 6.0, 11.0, 1.2],
    ["Chicken Biryani", "Indian Foods", 200, 9.0, 26.0, 6.5, 1.5],
    ["Veg Biryani", "Indian Foods", 175, 4.0, 28.0, 5.5, 2.0],
    ["Samosa", "Indian Foods", 308, 5.0, 32.0, 18.0, 2.5],
    ["Pakora", "Indian Foods", 315, 7.0, 30.0, 19.0, 3.0],
    ["Curd", "Indian Foods", 61, 3.5, 4.7, 3.3, 0.0],
    ["Lassi", "Indian Foods", 89, 2.8, 12.0, 3.2, 0.0],
    ["Raita", "Indian Foods", 65, 3.0, 5.5, 3.4, 0.4],
    ["Sambar", "Indian Foods", 85, 4.0, 12.0, 2.5, 3.0],
    ["Rasam", "Indian Foods", 45, 1.8, 7.0, 1.2, 1.0],
    ["Khichdi", "Indian Foods", 130, 5.0, 22.0, 2.5, 2.5],
    ["Aloo Gobi", "Indian Foods", 110, 2.5, 14.0, 5.5, 3.0],
    ["Bhindi Masala", "Indian Foods", 105, 2.2, 10.0, 6.5, 3.5],
    ["Tandoori Chicken", "Indian Foods", 175, 25.0, 3.0, 7.0, 0.5],
    ["Gulab Jamun", "Indian Foods", 340, 4.5, 52.0, 13.0, 0.5],
    ["Jalebi", "Indian Foods", 380, 3.0, 62.0, 14.0, 0.3],
    ["Kheer", "Indian Foods", 145, 4.0, 22.0, 4.5, 0.3],
    ["Halwa", "Indian Foods", 350, 4.0, 48.0, 16.0, 1.2],

    // ---------- Fast Food ----------
    ["Cheeseburger", "Fast Food", 264, 13.0, 21.0, 14.0, 1.3],
    ["Hamburger", "Fast Food", 254, 13.0, 30.0, 9.0, 1.5],
    ["Pizza (cheese)", "Fast Food", 266, 11.0, 33.0, 10.0, 2.3],
    ["Pizza (pepperoni)", "Fast Food", 298, 13.0, 34.0, 12.0, 2.3],
    ["French Fries", "Fast Food", 312, 3.4, 41.0, 15.0, 3.8],
    ["Chicken Nuggets", "Fast Food", 296, 15.0, 16.0, 19.0, 1.0],
    ["Hot Dog", "Fast Food", 290, 10.4, 22.0, 18.0, 1.0],
    ["Fried Rice", "Fast Food", 163, 4.0, 25.0, 5.0, 1.0],
    ["Spring Roll", "Fast Food", 220, 5.0, 25.0, 11.0, 2.0],
    ["Falafel", "Fast Food", 333, 13.3, 31.8, 17.8, 4.9],
    ["Shawarma", "Fast Food", 215, 17.0, 15.0, 10.0, 1.5],
    ["Sushi Roll", "Fast Food", 145, 5.5, 25.0, 2.5, 1.2],

    // ---------- Desserts / Snacks ----------
    ["Chocolate (milk)", "Desserts", 535, 7.7, 59.4, 29.7, 3.4],
    ["Dark Chocolate", "Desserts", 546, 4.9, 61.2, 31.3, 7.0],
    ["Ice Cream", "Desserts", 207, 3.5, 23.6, 11.0, 0.7],
    ["Cheesecake", "Desserts", 321, 5.5, 25.5, 22.5, 0.4],
    ["Doughnut", "Desserts", 452, 4.9, 51.0, 25.2, 1.4],
    ["Brownie", "Desserts", 466, 6.0, 50.0, 28.0, 2.4],
    ["Chocolate Cake", "Desserts", 371, 5.0, 50.0, 17.0, 1.9],
    ["Cookies", "Desserts", 474, 5.1, 68.0, 20.0, 2.0],
    ["Muffin", "Desserts", 377, 6.0, 54.0, 15.0, 1.8],
    ["Pancakes", "Desserts", 227, 6.4, 28.0, 9.7, 1.0],
    ["Waffle", "Desserts", 291, 7.9, 32.9, 14.1, 2.0],
    ["Potato Chips", "Snacks", 536, 7.0, 53.0, 34.6, 4.8],
    ["Popcorn", "Snacks", 387, 12.9, 77.9, 4.5, 14.5],
    ["Pretzels", "Snacks", 380, 10.0, 80.0, 2.6, 3.0],
    ["Granola Bar", "Snacks", 471, 8.0, 64.0, 20.0, 5.0],
    ["Protein Bar", "Snacks", 350, 30.0, 35.0, 10.0, 6.0],
    ["Rice Cakes", "Snacks", 387, 8.2, 81.5, 2.8, 4.2],
    ["Hummus", "Snacks", 166, 7.9, 14.3, 9.6, 6.0],
    ["Trail Mix", "Snacks", 462, 13.8, 44.9, 29.4, 5.8],

    // ---------- Beverages ----------
    ["Water", "Beverages", 0, 0.0, 0.0, 0.0, 0.0],
    ["Black Coffee", "Beverages", 2, 0.3, 0.0, 0.0, 0.0],
    ["Tea (no milk)", "Beverages", 1, 0.0, 0.3, 0.0, 0.0],
    ["Chai (with milk)", "Beverages", 55, 1.8, 8.0, 1.8, 0.0],
    ["Orange Juice", "Beverages", 45, 0.7, 10.4, 0.2, 0.2],
    ["Apple Juice", "Beverages", 46, 0.1, 11.3, 0.1, 0.2],
    ["Cola", "Beverages", 42, 0.0, 10.6, 0.0, 0.0],
    ["Diet Cola", "Beverages", 0, 0.0, 0.0, 0.0, 0.0],
    ["Beer", "Beverages", 43, 0.5, 3.6, 0.0, 0.0],
    ["Red Wine", "Beverages", 85, 0.1, 2.6, 0.0, 0.0],
    ["Almond Milk", "Beverages", 17, 0.6, 0.6, 1.2, 0.3],
    ["Soy Milk", "Beverages", 54, 3.3, 6.3, 1.8, 0.6],
    ["Oat Milk", "Beverages", 47, 1.0, 7.0, 1.5, 0.8],
    ["Coconut Water", "Beverages", 19, 0.7, 3.7, 0.2, 1.1],
    ["Energy Drink", "Beverages", 45, 0.0, 11.0, 0.0, 0.0],
    ["Sports Drink", "Beverages", 26, 0.0, 6.5, 0.0, 0.0],

    // ---------- Protein Supplements ----------
    ["Whey Protein Powder", "Protein Supplements", 400, 80.0, 8.0, 5.0, 1.0],
    ["Casein Protein Powder", "Protein Supplements", 370, 78.0, 8.0, 3.0, 1.0],
    ["Plant Protein Powder", "Protein Supplements", 380, 70.0, 12.0, 6.0, 5.0],
    ["Mass Gainer", "Protein Supplements", 380, 20.0, 65.0, 5.0, 2.0],
    ["BCAA Powder", "Protein Supplements", 40, 10.0, 0.0, 0.0, 0.0],
    ["Creatine Monohydrate", "Protein Supplements", 0, 0.0, 0.0, 0.0, 0.0],

    // ---------- Sauces / Oils ----------
    ["Olive Oil", "Oils", 884, 0.0, 0.0, 100.0, 0.0],
    ["Coconut Oil", "Oils", 862, 0.0, 0.0, 100.0, 0.0],
    ["Sunflower Oil", "Oils", 884, 0.0, 0.0, 100.0, 0.0],
    ["Vegetable Oil", "Oils", 884, 0.0, 0.0, 100.0, 0.0],
    ["Mustard Oil", "Oils", 884, 0.0, 0.0, 100.0, 0.0],
    ["Ketchup", "Sauces", 101, 1.0, 25.8, 0.1, 0.3],
    ["Mayonnaise", "Sauces", 680, 1.0, 0.6, 75.0, 0.0],
    ["Mustard", "Sauces", 66, 4.0, 5.8, 3.3, 3.3],
    ["Soy Sauce", "Sauces", 53, 8.1, 4.9, 0.6, 0.8],
    ["Hot Sauce", "Sauces", 12, 0.5, 1.8, 0.4, 0.3],
    ["BBQ Sauce", "Sauces", 172, 0.8, 40.8, 0.6, 0.9],
    ["Honey", "Sauces", 304, 0.3, 82.4, 0.0, 0.2],
    ["Maple Syrup", "Sauces", 260, 0.0, 67.0, 0.1, 0.0],
    ["Sugar", "Sauces", 387, 0.0, 100.0, 0.0, 0.0],
    ["Salt", "Sauces", 0, 0.0, 0.0, 0.0, 0.0]
  ];

  /* Alternate names people actually search for -> the catalogue's canonical name.
     Regional English (Indian/British/American) differences are the main driver here:
     someone typing "capsicum" or "brinjal" should not get an empty result. */
  var ALIASES = {
    "curd": "Yogurt",
    "dahi": "Yogurt",
    "lady finger": "Okra",
    "ladies finger": "Okra",
    "bhindi": "Okra",
    "brinjal": "Aubergine",
    "eggplant": "Aubergine",
    "baingan": "Aubergine",
    "capsicum": "Bell Pepper",
    "sweet pepper": "Bell Pepper",
    "cottage cheese indian": "Paneer",
    "courgette": "Zucchini",
    "coriander": "Vegetables",
    "aubergine": "Aubergine",
    "maida": "Wheat Flour",
    "atta": "Whole Wheat Flour",
    "chana": "Chickpeas (cooked)",
    "chickpea": "Chickpeas (cooked)",
    "garbanzo": "Chickpeas (cooked)",
    "rajmah": "Rajma",
    "moong": "Green Gram (cooked)",
    "mung": "Green Gram (cooked)",
    "urad": "Black Gram (cooked)",
    "masoor": "Red Lentils (cooked)",
    "toor": "Dal (cooked)",
    "arhar": "Dal (cooked)",
    "shrimps": "Prawns",
    "prawn": "Prawns",
    "aloo": "Potato",
    "gobi": "Cauliflower",
    "palak": "Spinach",
    "methi": "Spinach",
    "phulka": "Chapati",
    "chapatti": "Chapati",
    "roti indian": "Roti",
    "whey": "Whey Protein Powder",
    "protein powder": "Whey Protein Powder",
    "protein shake": "Whey Protein Powder",
    "soda": "Cola",
    "coke": "Cola",
    "pepsi": "Cola",
    "chips": "Potato Chips",
    "crisps": "Potato Chips",
    "fries": "French Fries",
    "aubergines": "Aubergine",
    "yoghurt": "Yogurt",
    "greek yoghurt": "Greek Yogurt",
    "cheese": "Cheddar Cheese",
    "milk": "Whole Milk",
    "egg": "Whole Egg",
    "eggs": "Whole Egg",
    "boiled eggs": "Boiled Egg",
    "rice": "White Rice (cooked)",
    "bread": "White Bread",
    "oatmeal": "Rolled Oats (cooked)",
    "porridge": "Rolled Oats (cooked)",
    "peanut butter": "Peanut Butter",
    "pb": "Peanut Butter",
    "chicken": "Chicken Breast",
    "beef": "Beef Steak",
    "steak": "Beef Steak",
    "mince": "Beef Mince",
    "tuna fish": "Tuna",
    "salmon fillet": "Salmon"
  };

  /* Convert the compact tuples into objects exactly once, at load. The shape mirrors what
     the logging path already expects (name + the five macro fields), with `per` recording
     that these values describe 100 g so the portion maths has an explicit basis rather than
     an assumed one. */
  var CATALOGUE = FOODS.map(function (t, i) {
    return {
      id: "seed:" + i,           // namespaced so seed foods can never collide with user ids
      name: t[0],
      category: t[1],
      per: 100,                  // grams these values describe
      calories: t[2],
      protein: t[3],
      carbs: t[4],
      fat: t[5],
      fibre: t[6],
      source: "seed"
    };
  });

  /** Scales a catalogue entry to a gram amount, returning the shape the food log stores. */
  function scaleFood(food, grams) {
    var g = Number(grams);
    if (!isFinite(g) || g <= 0) g = food.per;
    var f = g / food.per;
    var r1 = function (n) { return Math.round(n * f * 10) / 10; };
    return {
      name: food.name,
      grams: Math.round(g * 10) / 10,
      calories: Math.round(food.calories * f),
      protein: r1(food.protein),
      carbs: r1(food.carbs),
      fat: r1(food.fat),
      fibre: r1(food.fibre)
    };
  }

  window.IgnytFoodDB = Object.freeze({
    CATEGORIES: CATEGORIES,
    ALIASES: ALIASES,
    all: function () { return CATALOGUE; },
    count: function () { return CATALOGUE.length; },
    byId: function (id) {
      for (var i = 0; i < CATALOGUE.length; i++) if (CATALOGUE[i].id === id) return CATALOGUE[i];
      return null;
    },
    byName: function (name) {
      var k = String(name || "").trim().toLowerCase();
      for (var i = 0; i < CATALOGUE.length; i++) if (CATALOGUE[i].name.toLowerCase() === k) return CATALOGUE[i];
      return null;
    },
    scaleFood: scaleFood
  });
}());
