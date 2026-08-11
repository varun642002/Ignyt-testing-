/* =========================================================
   IGNYT INTENTS — examples, not patterns

   THE ARGUMENT FOR THIS FILE. The router below it is a regex table, and a regex table fails the
   way regex tables fail: "delete all my foods today" missed on a plural, "wipe my food log"
   missed for want of the word "all", "I want to log chicken biryani" missed because the verb
   was three words from the start. Each was fixed by widening one pattern, which is a treadmill
   — every fix is one phrasing wide and the user has hundreds.

   So intents are described by EXAMPLES of how people say them, and a message is matched by
   similarity to those examples rather than by a pattern it must satisfy. Adding coverage means
   adding a sentence to a list, which anyone can do safely, instead of editing a regex, which
   almost nobody can do safely.

   HOW IT SCORES. The same mechanism the knowledge base uses on 2,300 questions, because it
   already works and a second scorer would be a second thing to keep honest: content words with
   the scaffolding removed, weighted by rarity across the example corpus, compared as a cosine.
   An unseen word counts at maximum weight so a sentence full of unfamiliar terms cannot score
   well on its one familiar one — the fix that stopped "design me a 12 week peaking block"
   matching a training-frequency entry.

   WHERE IT SITS, and this matters: BELOW the regex table, not instead of it. The patterns are
   fast and exact for the phrasings they already cover, and 43 tests currently prove they do.
   This catches what falls through. Retiring a pattern is a separate step, done one at a time,
   and only when the suite stays green without it.
========================================================= */
(function () {
  "use strict";

  /* Ordered by how often people reach for them, which is also roughly how much damage a
     mis-classification does. Each list is deliberately varied: formal and casual, long and
     clipped, with and without the object, and including the shapes speech-to-text produces. */
  var EXAMPLES = {

    DELETE_TODAY_FOOD: [
      "delete todays food", "delete all my food today", "delete all my foods today",
      "remove todays food", "remove all the food i logged today", "clear todays food",
      "clear my food for today", "clear all my meals today", "wipe my food log",
      "wipe todays food", "erase my meals today", "erase everything i ate",
      "get rid of todays food", "get rid of everything i ate today",
      "delete everything i logged today", "remove my food entries",
      "i want to start todays food log again", "i logged everything wrong today remove it",
      "forget everything i ate today", "clear my meals for today",
      "empty my food log", "reset todays food", "start my food log over",
      "scrap todays food", "bin todays meals", "delete my whole food log",
      "remove all entries from today", "clear the food i added today",
      "i messed up my food log clear it", "take everything out of todays food",
      "delete food log", "delete food for today", "delete meals", "delete food",
      "delete my food log", "delete my todays food", "delete my food for today", "delete my meals",
      "delete my food", "delete the food log", "delete the todays food",
      "delete the food for today", "delete the meals", "delete the food", "remove food log",
      "remove food for today", "remove meals", "remove food", "remove my food log",
      "remove my todays food", "remove my food for today", "remove my meals", "remove my food",
      "remove the food log", "remove the todays food", "remove the food for today",
      "remove the meals", "remove the food", "clear food log", "clear food for today",
      "clear meals", "clear food", "clear my food log", "clear my todays food", "clear my meals",
      "clear my food", "clear the food log", "clear the todays food", "clear the food for today",
      "clear the meals", "clear the food", "wipe food log", "wipe food for today", "wipe meals",
      "wipe food", "wipe my todays food", "wipe my food for today", "wipe my meals", "wipe my food",
      "wipe the food log", "wipe the todays food", "wipe the food for today", "wipe the meals",
      "wipe the food", "get rid of food log", "get rid of food for today", "get rid of meals",
      "get rid of food", "get rid of my food log", "get rid of my todays food",
      "get rid of my food for today", "get rid of my meals", "get rid of my food",
      "get rid of the food log", "get rid of the todays food", "get rid of the food for today",
      "get rid of the meals", "get rid of the food", "delete todays food log",
      "delete todays meals", "delete yesterdays food", "delete yesterdays food log",
      "delete yesterdays meals", "remove todays food log", "remove todays meals",
      "remove yesterdays food", "remove yesterdays food log", "remove yesterdays meals",
      "delete breakfast", "delete lunch", "delete dinner", "delete snack", "remove breakfast",
      "remove lunch", "remove dinner", "remove snack", "delete the chicken", "delete the rice",
      "delete the dal", "delete the paneer", "delete the eggs", "delete the roti",
      "delete the chapati", "delete the idli", "delete the dosa", "delete the banana",
      "delete the milk", "delete the curd", "delete the oats", "delete the bread",
      "delete the sambar", "delete the biryani", "delete the poha", "delete the upma",
      "delete the rajma", "delete the chole", "delete the soya chunks", "delete the fish",
      "delete my chicken", "delete my rice", "delete my dal", "delete my paneer", "delete my eggs",
      "delete my roti", "delete my chapati", "delete my idli", "delete my dosa", "delete my banana",
      "delete my milk", "delete my curd", "delete my oats", "delete my bread", "delete my sambar",
      "delete my biryani", "delete my poha", "delete my upma", "delete my rajma", "delete my chole",
      "delete my soya chunks", "delete my fish", "remove the chicken", "remove the rice",
      "remove the dal", "remove the paneer", "remove the eggs", "remove the roti",
      "remove the chapati", "remove the idli", "remove the dosa", "remove the banana",
      "remove the milk", "remove the curd", "remove the oats", "remove the bread",
      "remove the sambar", "remove the biryani", "remove the poha", "remove the upma",
      "remove the rajma", "remove the chole", "remove the soya chunks", "remove the fish",
      "remove my chicken", "remove my rice", "remove my dal", "remove my paneer", "remove my eggs",
      "remove my roti", "remove my chapati", "remove my idli", "remove my dosa", "remove my banana",
      "remove my milk", "remove my curd", "remove my oats", "remove my bread", "remove my sambar",
      "remove my biryani", "remove my poha", "remove my upma", "remove my rajma", "remove my chole",
      "remove my soya chunks", "remove my fish", "undo my last food", "delete the last food",
      "remove the last entry", "erase todays food", "start my food log again"
    ],

    LOG_FOOD: [
      "log food", "add food", "log my food", "add my food today", "record my food",
      "record what i ate", "add my meal", "put todays food in", "track my meal",
      "i ate chicken", "i ate chicken today", "i just ate 200g chicken",
      "log 200g chicken", "add 200 grams chicken", "put chicken in my food log",
      "add this to todays food", "i had 2 eggs", "i ate 100 grams rice",
      "log a banana", "add a banana to breakfast", "note down what i ate",
      "can you add my meal", "i want to log chicken biryani", "please log 2 rotis",
      "write down my food", "save my meal", "add breakfast", "log my lunch",
      "i had dosa for breakfast", "put 150g paneer in",
      "log chicken", "log rice", "log dal", "log paneer", "log eggs", "log roti", "log chapati",
      "log idli", "log dosa", "log banana", "log milk", "log curd", "log oats", "log bread",
      "log sambar", "log biryani", "log poha", "log upma", "log rajma", "log chole",
      "log soya chunks", "log fish", "log mutton", "log apple", "log peanut butter",
      "log protein shake", "log almonds", "log sprouts", "log khichdi", "log pulao", "log raita",
      "log salad", "log my chicken", "log my rice", "log my dal", "log my paneer", "log my eggs",
      "log my roti", "log my chapati", "log my idli", "log my dosa", "log my banana", "log my milk",
      "log my curd", "log my oats", "log my bread", "log my sambar", "log my biryani",
      "log my poha", "log my upma", "log my rajma", "log my chole", "log my soya chunks",
      "log my fish", "log my mutton", "log my apple", "log my peanut butter",
      "log my protein shake", "log my almonds", "log my sprouts", "log my khichdi", "log my pulao",
      "log my raita", "log my salad", "add chicken", "add rice", "add dal", "add paneer",
      "add eggs", "add roti", "add chapati", "add idli", "add dosa", "add banana", "add milk",
      "add curd", "add oats", "add bread", "add sambar", "add biryani", "add poha", "add upma",
      "add rajma", "add chole", "add soya chunks", "add fish", "add mutton", "add apple",
      "add peanut butter", "add protein shake", "add almonds", "add sprouts", "add khichdi",
      "add pulao", "add raita", "add salad", "add my chicken", "add my rice", "add my dal",
      "add my paneer", "add my eggs", "add my roti", "add my chapati", "add my idli", "add my dosa",
      "add my banana", "add my milk", "add my curd", "add my oats", "add my bread", "add my sambar",
      "add my biryani", "add my poha", "add my upma", "add my rajma", "add my chole",
      "add my soya chunks", "add my fish", "add my mutton", "add my apple", "add my peanut butter",
      "add my protein shake", "add my almonds", "add my sprouts", "add my khichdi", "add my pulao",
      "add my raita", "add my salad", "record chicken", "record rice", "record dal",
      "record paneer", "record eggs", "record roti", "record chapati", "record idli", "record dosa",
      "record banana", "record milk", "record curd", "record oats", "record bread", "record sambar",
      "record biryani", "record poha", "record upma", "record rajma", "record chole",
      "record soya chunks", "record fish", "record mutton", "record apple", "record peanut butter",
      "record protein shake", "record almonds", "record sprouts", "record khichdi", "record pulao",
      "record raita", "record salad", "record my chicken", "record my rice", "record my dal",
      "record my paneer", "record my eggs", "record my roti", "record my chapati", "record my idli",
      "record my dosa", "record my banana", "record my milk", "record my curd", "record my oats",
      "record my bread", "record my sambar", "record my biryani", "record my poha",
      "record my upma", "record my rajma", "record my chole", "record my soya chunks",
      "record my fish", "record my mutton", "record my apple", "record my peanut butter",
      "record my protein shake", "record my almonds", "record my sprouts", "record my khichdi",
      "record my pulao", "record my raita", "record my salad", "note down chicken",
      "note down rice", "note down dal", "note down paneer", "note down eggs", "note down roti",
      "note down chapati", "note down idli", "note down dosa", "note down banana", "note down milk",
      "note down curd", "note down oats", "note down bread", "note down sambar",
      "note down biryani", "note down poha", "note down upma", "note down rajma", "note down chole",
      "note down soya chunks", "note down fish", "note down mutton", "note down apple",
      "note down peanut butter", "note down protein shake", "note down almonds",
      "note down sprouts", "note down khichdi", "note down pulao", "note down raita",
      "note down salad", "note down my chicken", "note down my rice", "note down my dal",
      "note down my paneer", "note down my eggs", "note down my roti", "note down my chapati",
      "note down my idli", "note down my dosa", "note down my banana", "note down my milk",
      "note down my curd", "note down my oats", "note down my bread", "note down my sambar",
      "note down my biryani", "note down my poha", "note down my upma", "note down my rajma",
      "note down my chole", "note down my soya chunks", "note down my fish", "note down my mutton",
      "note down my apple", "note down my peanut butter", "note down my protein shake",
      "note down my almonds", "note down my sprouts", "note down my khichdi", "note down my pulao",
      "note down my raita", "note down my salad", "put in chicken", "put in rice", "put in dal",
      "put in paneer", "put in eggs", "put in roti", "put in chapati", "put in idli", "put in dosa",
      "put in banana", "put in milk", "put in curd", "put in oats", "put in bread", "put in sambar",
      "put in biryani", "put in poha", "put in upma", "put in rajma", "put in chole",
      "put in soya chunks", "put in fish", "put in mutton", "put in apple", "put in peanut butter",
      "put in protein shake", "put in almonds", "put in sprouts", "put in khichdi", "put in pulao",
      "put in raita", "put in salad", "put in my chicken", "put in my rice", "put in my dal",
      "put in my paneer", "put in my eggs", "put in my roti", "put in my chapati", "put in my idli",
      "put in my dosa", "put in my banana", "put in my milk", "put in my curd", "put in my oats",
      "put in my bread", "put in my sambar", "put in my biryani", "put in my poha",
      "put in my upma", "put in my rajma", "put in my chole", "put in my soya chunks",
      "put in my fish", "put in my mutton", "put in my apple", "put in my peanut butter",
      "put in my protein shake", "put in my almonds", "put in my sprouts", "put in my khichdi",
      "put in my pulao", "put in my raita", "put in my salad", "i ate rice", "i ate dal",
      "i ate paneer", "i ate eggs", "i ate roti", "i ate chapati", "i ate idli", "i ate dosa",
      "i ate banana", "i ate milk", "i ate curd", "i ate oats", "i ate bread", "i ate sambar",
      "i ate biryani", "i ate poha", "i ate upma", "i ate rajma", "i ate chole",
      "i ate soya chunks", "i ate fish", "i ate mutton", "i ate apple", "i ate peanut butter",
      "i ate protein shake", "i ate almonds", "i ate sprouts", "i ate khichdi", "i ate pulao",
      "i ate raita", "i ate salad", "i had chicken", "i had rice", "i had dal", "i had paneer",
      "i had eggs", "i had roti", "i had chapati", "i had idli", "i had dosa", "i had banana",
      "i had milk", "i had curd", "i had oats", "i had bread", "i had sambar", "i had biryani",
      "i had poha", "i had upma", "i had rajma", "i had chole", "i had soya chunks", "i had fish",
      "i had mutton", "i had apple", "i had peanut butter", "i had protein shake", "i had almonds",
      "i had sprouts", "i had khichdi", "i had pulao", "i had raita", "i had salad",
      "i just ate chicken", "i just ate rice", "i just ate dal", "i just ate paneer",
      "i just ate eggs", "i just ate roti", "i just ate chapati", "i just ate idli",
      "i just ate dosa", "i just ate banana", "i just ate milk", "i just ate curd",
      "i just ate oats", "i just ate bread", "i just ate sambar", "i just ate biryani",
      "i just ate poha", "i just ate upma", "i just ate rajma", "i just ate chole",
      "i just ate soya chunks", "i just ate fish", "i just ate mutton", "i just ate apple",
      "i just ate peanut butter", "i just ate protein shake", "i just ate almonds",
      "i just ate sprouts", "i just ate khichdi", "i just ate pulao", "i just ate raita",
      "i just ate salad", "i just had chicken", "i just had rice", "i just had dal",
      "i just had paneer", "i just had eggs", "i just had roti", "i just had chapati",
      "i just had idli", "i just had dosa", "i just had banana", "i just had milk",
      "i just had curd", "i just had oats", "i just had bread", "i just had sambar",
      "i just had biryani", "i just had poha", "i just had upma", "i just had rajma",
      "i just had chole", "i just had soya chunks", "i just had fish", "i just had mutton",
      "i just had apple", "i just had peanut butter", "i just had protein shake",
      "i just had almonds", "i just had sprouts", "i just had khichdi", "i just had pulao",
      "i just had raita", "i just had salad", "ate chicken", "ate rice", "ate dal", "ate paneer",
      "ate eggs", "ate roti", "ate chapati", "ate idli", "ate dosa", "ate banana", "ate milk",
      "ate curd", "ate oats", "ate bread", "ate sambar", "ate biryani", "ate poha", "ate upma",
      "ate rajma", "ate chole", "ate soya chunks", "ate fish", "ate mutton", "ate apple",
      "ate peanut butter", "ate protein shake", "ate almonds", "ate sprouts", "ate khichdi",
      "ate pulao", "ate raita", "ate salad", "had chicken", "had rice", "had dal", "had paneer",
      "had eggs", "had roti", "had chapati", "had idli", "had dosa", "had banana", "had milk",
      "had curd", "had oats", "had bread", "had sambar", "had biryani", "had poha", "had upma",
      "had rajma", "had chole", "had soya chunks", "had fish", "had mutton", "had apple",
      "had peanut butter", "had protein shake", "had almonds", "had sprouts", "had khichdi",
      "had pulao", "had raita", "had salad", "log 100g chicken", "log 100g rice", "log 100g dal",
      "log 100g paneer", "log 100g eggs", "log 100g roti", "log 100g chapati", "log 100g idli",
      "log 100g dosa", "log 100g banana", "log 100g milk", "log 100g curd", "log 100g oats",
      "log 100g bread", "log 100g sambar", "log 100g biryani", "log 100g poha", "log 100g upma",
      "log 100g rajma", "log 100g chole", "log 100g soya chunks", "log 100g fish", "log 200g rice",
      "log 200g dal", "log 200g paneer", "log 200g eggs", "log 200g roti", "log 200g chapati",
      "log 200g idli", "log 200g dosa", "log 200g banana", "log 200g milk", "log 200g curd",
      "log 200g oats", "log 200g bread", "log 200g sambar", "log 200g biryani", "log 200g poha",
      "log 200g upma", "log 200g rajma", "log 200g chole", "log 200g soya chunks", "log 200g fish",
      "log 1 cup chicken", "log 1 cup rice", "log 1 cup dal", "log 1 cup paneer", "log 1 cup eggs",
      "log 1 cup roti", "log 1 cup chapati", "log 1 cup idli", "log 1 cup dosa", "log 1 cup banana",
      "log 1 cup milk", "log 1 cup curd", "log 1 cup oats", "log 1 cup bread", "log 1 cup sambar",
      "log 1 cup biryani", "log 1 cup poha", "log 1 cup upma", "log 1 cup rajma", "log 1 cup chole",
      "log 1 cup soya chunks", "log 1 cup fish", "log 2 chicken", "log 2 rice", "log 2 dal",
      "log 2 paneer", "log 2 eggs", "log 2 roti", "log 2 chapati", "log 2 idli", "log 2 dosa",
      "log 2 banana", "log 2 milk", "log 2 curd", "log 2 oats", "log 2 bread", "log 2 sambar",
      "log 2 biryani", "log 2 poha", "log 2 upma", "log 2 rajma", "log 2 chole",
      "log 2 soya chunks", "log 2 fish", "log 3 chicken", "log 3 rice", "log 3 dal", "log 3 paneer",
      "log 3 eggs", "log 3 roti", "log 3 chapati", "log 3 idli", "log 3 dosa", "log 3 banana",
      "log 3 milk", "log 3 curd", "log 3 oats", "log 3 bread", "log 3 sambar", "log 3 biryani",
      "log 3 poha", "log 3 upma", "log 3 rajma", "log 3 chole", "log 3 soya chunks", "log 3 fish",
      "add 100g chicken", "add 100g rice", "add 100g dal", "add 100g paneer", "add 100g eggs",
      "add 100g roti", "add 100g chapati", "add 100g idli", "add 100g dosa", "add 100g banana",
      "add 100g milk", "add 100g curd", "add 100g oats", "add 100g bread", "add 100g sambar",
      "add 100g biryani", "add 100g poha", "add 100g upma", "add 100g rajma", "add 100g chole",
      "add 100g soya chunks", "add 100g fish", "add 200g chicken", "add 200g rice", "add 200g dal",
      "add 200g paneer", "add 200g eggs", "add 200g roti", "add 200g chapati", "add 200g idli",
      "add 200g dosa", "add 200g banana", "add 200g milk", "add 200g curd", "add 200g oats",
      "add 200g bread", "add 200g sambar", "add 200g biryani", "add 200g poha", "add 200g upma",
      "add 200g rajma", "add 200g chole", "add 200g soya chunks", "add 200g fish",
      "add 1 cup chicken", "add 1 cup rice", "add 1 cup dal", "add 1 cup paneer", "add 1 cup eggs",
      "add 1 cup roti", "add 1 cup chapati", "add 1 cup idli", "add 1 cup dosa", "add 1 cup banana",
      "add 1 cup milk", "add 1 cup curd", "add 1 cup oats", "add 1 cup bread", "add 1 cup sambar",
      "add 1 cup biryani", "add 1 cup poha", "add 1 cup upma", "add 1 cup rajma", "add 1 cup chole",
      "add 1 cup soya chunks", "add 1 cup fish", "add 2 chicken", "add 2 rice", "add 2 dal",
      "add 2 paneer", "add 2 eggs", "add 2 roti", "add 2 chapati", "add 2 idli", "add 2 dosa",
      "add 2 banana", "add 2 milk", "add 2 curd", "add 2 oats", "add 2 bread", "add 2 sambar",
      "add 2 biryani", "add 2 poha", "add 2 upma", "add 2 rajma", "add 2 chole",
      "add 2 soya chunks", "add 2 fish", "add 3 chicken", "add 3 rice", "add 3 dal", "add 3 paneer",
      "add 3 eggs", "add 3 roti", "add 3 chapati", "add 3 idli", "add 3 dosa", "add 3 banana",
      "add 3 milk", "add 3 curd", "add 3 oats", "add 3 bread", "add 3 sambar", "add 3 biryani",
      "add 3 poha", "add 3 upma", "add 3 rajma", "add 3 chole", "add 3 soya chunks", "add 3 fish",
      "i ate 2 chicken", "i ate 2 rice", "i ate 2 dal", "i ate 2 paneer", "i ate 2 eggs",
      "i ate 2 roti", "i ate 2 chapati", "i ate 2 idli", "i ate 2 dosa", "i ate 2 banana",
      "i ate 2 milk", "i ate 2 curd", "i ate 2 oats", "i ate 2 bread", "i ate 2 sambar",
      "i ate 2 biryani", "i ate 2 poha", "i ate 2 upma", "i ate 2 rajma", "i ate 2 chole",
      "i ate 2 soya chunks", "i ate 2 fish", "i ate 3 chicken", "i ate 3 rice", "i ate 3 dal",
      "i ate 3 paneer", "i ate 3 eggs", "i ate 3 roti", "i ate 3 chapati", "i ate 3 idli",
      "i ate 3 dosa", "i ate 3 banana", "i ate 3 milk", "i ate 3 curd", "i ate 3 oats",
      "i ate 3 bread", "i ate 3 sambar", "i ate 3 biryani", "i ate 3 poha", "i ate 3 upma",
      "i ate 3 rajma", "i ate 3 chole", "i ate 3 soya chunks", "i ate 3 fish", "i ate 100g chicken",
      "i ate 100g rice", "i ate 100g dal", "i ate 100g paneer", "i ate 100g eggs",
      "i ate 100g roti", "i ate 100g chapati", "i ate 100g idli", "i ate 100g dosa",
      "i ate 100g banana", "i ate 100g milk", "i ate 100g curd", "i ate 100g oats",
      "i ate 100g bread", "i ate 100g sambar", "i ate 100g biryani", "i ate 100g poha",
      "i ate 100g upma", "i ate 100g rajma", "i ate 100g chole", "i ate 100g soya chunks",
      "i ate 100g fish", "i ate a chicken", "i ate a rice", "i ate a dal", "i ate a paneer",
      "i ate a eggs", "i ate a roti", "i ate a chapati", "i ate a idli", "i ate a dosa",
      "i ate a banana", "i ate a milk", "i ate a curd", "i ate a oats", "i ate a bread",
      "i ate a sambar", "i ate a biryani", "i ate a poha", "i ate a upma", "i ate a rajma",
      "i ate a chole", "i ate a soya chunks", "i ate a fish", "i had 2 chicken", "i had 2 rice",
      "i had 2 dal", "i had 2 paneer", "i had 2 roti", "i had 2 chapati", "i had 2 idli",
      "i had 2 dosa", "i had 2 banana", "i had 2 milk", "i had 2 curd", "i had 2 oats",
      "i had 2 bread", "i had 2 sambar", "i had 2 biryani", "i had 2 poha", "i had 2 upma",
      "i had 2 rajma", "i had 2 chole", "i had 2 soya chunks", "i had 2 fish", "i had 3 chicken",
      "i had 3 rice", "i had 3 dal", "i had 3 paneer", "i had 3 eggs", "i had 3 roti",
      "i had 3 chapati", "i had 3 idli", "i had 3 dosa", "i had 3 banana", "i had 3 milk",
      "i had 3 curd", "i had 3 oats", "i had 3 bread", "i had 3 sambar", "i had 3 biryani",
      "i had 3 poha", "i had 3 upma", "i had 3 rajma", "i had 3 chole", "i had 3 soya chunks",
      "i had 3 fish", "i had 100g chicken", "i had 100g rice", "i had 100g dal",
      "i had 100g paneer", "i had 100g eggs", "i had 100g roti", "i had 100g chapati",
      "i had 100g idli", "i had 100g dosa", "i had 100g banana", "i had 100g milk",
      "i had 100g curd", "i had 100g oats", "i had 100g bread", "i had 100g sambar",
      "i had 100g biryani", "i had 100g poha", "i had 100g upma", "i had 100g rajma",
      "i had 100g chole", "i had 100g soya chunks", "i had 100g fish", "i had a chicken",
      "i had a rice", "i had a dal", "i had a paneer", "i had a eggs", "i had a roti",
      "i had a chapati", "i had a idli", "i had a dosa", "i had a banana", "i had a milk",
      "i had a curd", "i had a oats", "i had a bread", "i had a sambar", "i had a biryani",
      "i had a poha", "i had a upma", "i had a rajma", "i had a chole", "i had a soya chunks",
      "i had a fish", "log chicken for breakfast", "log chicken for lunch",
      "log chicken for dinner", "log chicken for snack", "log rice for breakfast",
      "log rice for lunch", "log rice for dinner", "log rice for snack", "log dal for breakfast",
      "log dal for lunch", "log dal for dinner", "log dal for snack", "log paneer for breakfast",
      "log paneer for lunch", "log paneer for dinner", "log paneer for snack",
      "log eggs for breakfast", "log eggs for lunch", "log eggs for dinner", "log eggs for snack",
      "log roti for breakfast", "log roti for lunch", "log roti for dinner", "log roti for snack",
      "log chapati for breakfast", "log chapati for lunch", "log chapati for dinner",
      "log chapati for snack", "log idli for breakfast", "log idli for lunch",
      "log idli for dinner", "log idli for snack", "log dosa for breakfast", "log dosa for lunch",
      "log dosa for dinner", "log dosa for snack", "log banana for breakfast",
      "log banana for lunch", "log banana for dinner", "log banana for snack",
      "log milk for breakfast", "log milk for lunch", "log milk for dinner", "log milk for snack",
      "log curd for breakfast", "log curd for lunch", "log curd for dinner", "log curd for snack",
      "log oats for breakfast", "log oats for lunch", "log oats for dinner", "log oats for snack",
      "log bread for breakfast", "log bread for lunch", "log bread for dinner",
      "log bread for snack", "log sambar for breakfast", "log sambar for lunch",
      "log sambar for dinner", "log sambar for snack", "log biryani for breakfast",
      "log biryani for lunch", "log biryani for dinner", "log biryani for snack",
      "log poha for breakfast", "log poha for lunch", "log poha for dinner", "log poha for snack",
      "log upma for breakfast", "log upma for lunch", "log upma for dinner", "log upma for snack",
      "log rajma for breakfast", "log rajma for lunch", "log rajma for dinner",
      "log rajma for snack", "log chole for breakfast", "log chole for lunch",
      "log chole for dinner", "log chole for snack", "log soya chunks for breakfast",
      "log soya chunks for lunch", "log soya chunks for dinner", "log soya chunks for snack",
      "log fish for breakfast", "log fish for lunch", "log fish for dinner", "log fish for snack",
      "log chicken today", "log chicken yesterday", "log chicken this morning",
      "log chicken tonight", "log rice today", "log rice yesterday", "log rice this morning",
      "log rice tonight", "log dal today", "log dal yesterday", "log dal this morning",
      "log dal tonight", "log paneer today", "log paneer yesterday", "log paneer this morning",
      "log paneer tonight", "log eggs today", "log eggs yesterday", "log eggs this morning",
      "log eggs tonight", "log roti today", "log roti yesterday", "log roti this morning",
      "log roti tonight", "log chapati today", "log chapati yesterday", "log chapati this morning",
      "log chapati tonight", "log idli today", "log idli yesterday", "log idli this morning",
      "log idli tonight", "log dosa today", "log dosa yesterday", "log dosa this morning",
      "log dosa tonight", "log banana today", "log banana yesterday", "log banana this morning",
      "log banana tonight", "log milk today", "log milk yesterday", "log milk this morning",
      "log milk tonight", "log curd today", "log curd yesterday", "log curd this morning",
      "log curd tonight", "log oats today", "log oats yesterday", "log oats this morning",
      "log oats tonight", "log bread today", "log bread yesterday", "log bread this morning",
      "log bread tonight", "log sambar today", "log sambar yesterday", "log sambar this morning",
      "log sambar tonight", "log biryani today", "log biryani yesterday",
      "log biryani this morning", "log biryani tonight", "log poha today", "log poha yesterday",
      "log poha this morning", "log poha tonight", "log upma today", "log upma yesterday",
      "log upma this morning", "log upma tonight", "add chicken to my food log",
      "add chicken to the log", "add chicken to breakfast", "add rice to my food log",
      "add rice to the log", "add rice to breakfast", "add dal to my food log",
      "add dal to the log", "add dal to breakfast", "add paneer to my food log",
      "add paneer to the log", "add paneer to breakfast", "add eggs to my food log",
      "add eggs to the log", "add eggs to breakfast", "add roti to my food log",
      "add roti to the log", "add roti to breakfast", "add chapati to my food log",
      "add chapati to the log", "add chapati to breakfast", "add idli to my food log",
      "add idli to the log", "add idli to breakfast", "add dosa to my food log",
      "add dosa to the log", "add dosa to breakfast", "add banana to my food log",
      "add banana to the log", "add banana to breakfast", "add milk to my food log",
      "add milk to the log", "add milk to breakfast", "add curd to my food log",
      "add curd to the log", "add curd to breakfast", "add oats to my food log",
      "add oats to the log", "add oats to breakfast", "add bread to my food log",
      "add bread to the log", "add bread to breakfast", "add sambar to my food log",
      "add sambar to the log", "add sambar to breakfast", "add biryani to my food log",
      "add biryani to the log", "add biryani to breakfast", "add poha to my food log",
      "add poha to the log", "add poha to breakfast", "add upma to my food log",
      "add upma to the log", "add upma to breakfast", "log a meal", "record my meal",
      "i want to log food", "put this in my food log", "log what i ate", "add to my food diary",
      "note my meal", "log my breakfast", "log my dinner", "log my snack", "i ate something",
      "log this meal"
    ],

    VIEW_FOOD_LOG: [
      "what did i eat today", "how much protein did i eat today", "how much protein have i had today",
      "how many carbs did i eat today", "how much fat did i eat today",
      "how much protein so far today", "how many calories have i had today",
      "how much have i eaten today", "what protein have i had", "show my food log", "view my food log", "view my food", "open my food log",
      "view todays food", "pull up my food log", "show my logged food", "show my food",
      "view my meals", "what have i eaten", "list my food", "whats in my food log",
      "check my food log", "show todays meals", "what did i log today",
      "how many calories did i eat today", "whats my calorie total", "todays macros",
      "how much protein did i eat", "show my nutrition today", "what have i logged",
      "read my food log", "display my meals", "my food for today"
    ,
      "whats my food today", "did i log anything today", "show me what ive eaten",
      "open my food log", "food i logged", "my meals so far", "whats my intake today",
      "how much have i eaten", "todays calories", "calories so far today",
      "what did i eat", "what did i eat yesterday", "what have i eaten today",
      "what have i eaten yesterday", "what did i have", "what did i have today",
      "what did i have yesterday", "show my food diary", "show my meals", "show my nutrition",
      "show the food log", "show the food diary", "show the meals", "show the food",
      "show the nutrition", "see my food log", "see my food diary", "see my meals", "see my food",
      "see my nutrition", "see the food log", "see the food diary", "see the meals", "see the food",
      "see the nutrition", "view my food diary", "view my nutrition", "view the food log",
      "view the food diary", "view the meals", "view the food", "view the nutrition",
      "open my food diary", "open my meals", "open my food", "open my nutrition",
      "open the food log", "open the food diary", "open the meals", "open the food",
      "open the nutrition", "pull up my food diary", "pull up my meals", "pull up my food",
      "pull up my nutrition", "pull up the food log", "pull up the food diary", "pull up the meals",
      "pull up the food", "pull up the nutrition", "check my food diary", "check my meals",
      "check my food", "check my nutrition", "check the food log", "check the food diary",
      "check the meals", "check the food", "check the nutrition", "how many calories did i eat",
      "how many calories have i had", "how many calories did i have",
      "how many calories did i have today", "how much protein have i had",
      "how much protein did i have", "how much protein did i have today",
      "how many carbs did i eat", "how many carbs have i had", "how many carbs have i had today",
      "how many carbs did i have", "how many carbs did i have today", "how much fat did i eat",
      "how much fat have i had", "how much fat have i had today", "how much fat did i have",
      "how much fat did i have today", "whats my calorie total today", "whats my intake",
      "whats my food", "whats my macros", "whats my macros today", "whats my calories",
      "whats my calories today", "did i log food", "have i logged anything", "todays food",
      "todays meals", "food log", "my food log"
    ],

    LOG_WEIGHT: [
      "log my weight", "my weight is 78", "im 78 kg today", "weighed in at 78", "log weight", "record my weight", "add my weight",
      "update my weight", "my weight is 82", "my weight is 82 kg", "i weigh 82 kilos",
      "log my weight as 82", "weight 82", "82 kg today", "todays weight is 82",
      "i weighed myself 82", "put my weight in", "save my weight", "note my weight",
      "track my weight today", "my weight today is 81.5", "update weight to 80",
      "change my weight to 81", "i am 82 kg now", "log 172 lbs", "weigh in 82"
    ,
      "add weight 82", "put in my weight", "record 82 kilos", "log todays weight",
      "im 82 kilos today", "weighed in at 82", "set my weight to 82", "write my weight down",
      "log my weigh in", "log my bodyweight", "log todays weigh in", "log todays bodyweight",
      "record my weigh in", "record my bodyweight", "record todays weight",
      "record todays weigh in", "record todays bodyweight", "update my weigh in",
      "update my bodyweight", "update todays weight", "update todays weigh in",
      "update todays bodyweight", "save my weigh in", "save my bodyweight", "save todays weight",
      "save todays weigh in", "save todays bodyweight", "add my weigh in", "add my bodyweight",
      "add todays weight", "add todays weigh in", "add todays bodyweight", "put in my weigh in",
      "put in my bodyweight", "put in todays weight", "put in todays weigh in",
      "put in todays bodyweight", "enter my weight", "enter my weigh in", "enter my bodyweight",
      "enter todays weight", "enter todays weigh in", "enter todays bodyweight", "my weight is 75",
      "my weight is 68 kg", "my weight is 90 kg", "my weight is 78.5", "my weight is 61",
      "my weight is 104 kg", "i weigh 82", "i weigh 75", "i weigh 68 kg", "i weigh 90 kg",
      "i weigh 78.5", "i weigh 61", "i weigh 104 kg", "im 82", "im 75", "im 68 kg", "im 90 kg",
      "im 78.5", "im 61", "im 104 kg", "i am 82", "i am 75", "i am 68 kg", "i am 90 kg",
      "i am 78.5", "i am 61", "i am 104 kg", "weighed 82", "weighed 75", "weighed 68 kg",
      "weighed 90 kg", "weighed 78.5", "weighed 61", "weighed 104 kg", "log my weight as 75",
      "log my weight as 68 kg", "log my weight as 90kg", "log my weight 82", "log my weight 75",
      "log my weight 68 kg", "log my weight 90kg", "record my weight as 82",
      "record my weight as 75", "record my weight as 68 kg", "record my weight as 90kg",
      "record my weight 82", "record my weight 75", "record my weight 68 kg",
      "record my weight 90kg", "weight 75", "weight 68", "new weight", "i weighed myself"
    ],

    VIEW_WEIGHT_HISTORY: [
      "show my weight history", "view my weight history", "view my weight", "see my weight",
      "open my weight history", "pull up my weight", "my weight trend", "how has my weight changed",
      "weight over time", "am i losing weight", "have i lost weight",
      "show my weight chart", "weight progress", "what was my weight last week",
      "how much weight have i lost", "my weight graph", "weight last month"
    ,
      "whats my weight doing", "weight this month", "am i getting lighter", "show weight changes",
      "how much have i lost", "my weight so far", "weight since last month",
      "did my weight go down", "weight comparison", "track my weight progress",
      "whats happened to my weight", "weight numbers",
      "show my weight", "show my weight log", "show my weigh ins", "show my weight trend",
      "show the weight", "show the weight history", "show the weight log", "show the weigh ins",
      "show the weight chart", "show the weight trend", "see my weight history",
      "see my weight log", "see my weigh ins", "see my weight chart", "see my weight trend",
      "see the weight", "see the weight history", "see the weight log", "see the weigh ins",
      "see the weight chart", "see the weight trend", "view my weight log", "view my weigh ins",
      "view my weight chart", "view my weight trend", "view the weight", "view the weight history",
      "view the weight log", "view the weigh ins", "view the weight chart", "view the weight trend",
      "open my weight", "open my weight log", "open my weigh ins", "open my weight chart",
      "open my weight trend", "open the weight", "open the weight history", "open the weight log",
      "open the weigh ins", "open the weight chart", "open the weight trend", "check my weight",
      "check my weight history", "check my weight log", "check my weigh ins",
      "check my weight chart", "check my weight trend", "check the weight",
      "check the weight history", "check the weight log", "check the weigh ins",
      "check the weight chart", "check the weight trend", "pull up my weight history",
      "pull up my weight log", "pull up my weigh ins", "pull up my weight chart",
      "pull up my weight trend", "pull up the weight", "pull up the weight history",
      "pull up the weight log", "pull up the weigh ins", "pull up the weight chart",
      "pull up the weight trend", "give me my weight", "give me my weight history",
      "give me my weight log", "give me my weigh ins", "give me my weight chart",
      "give me my weight trend", "give me the weight", "give me the weight history",
      "give me the weight log", "give me the weigh ins", "give me the weight chart",
      "give me the weight trend", "tell me my weight", "tell me my weight history",
      "tell me my weight log", "tell me my weigh ins", "tell me my weight chart",
      "tell me my weight trend", "tell me the weight", "tell me the weight history",
      "tell me the weight log", "tell me the weigh ins", "tell me the weight chart",
      "tell me the weight trend", "how has my weight changed this month",
      "how has my weight changed lately", "how has my weight moved",
      "how has my weight moved this month", "how has my weight moved lately",
      "how has my weight been", "how has my weight been this month",
      "how has my weight been lately", "how much weight have i gained",
      "how much weight did i lose", "what was my weight last month", "what was my weight yesterday",
      "my weight history", "weight history", "show my weight over time", "has my weight changed",
      "whats my weight trend", "my weight this month", "weight chart"
    ],

    VIEW_TODAY_WORKOUT: [
      "whats my workout", "view my workout", "view todays workout", "see my workout",
      "open my workout", "pull up my workout", "whats my workout today", "todays workout", "todays plan",
      "what should i train today", "what am i training today", "show todays plan",
      "what do i have today", "which workout is today", "my plan for today",
      "what is on today", "whats the session today", "todays training"
    ,
      "what am i doing today", "todays session", "what workout is scheduled",
      "whats planned for today", "do i train today", "what do i train", "which muscles today",
      "todays exercises", "show me todays workout", "am i training today", "whats my session",
      "what have i got today", "workout for today", "todays routine",
      "what should i do in the gym today",
      "whats my workout for today", "whats my training today", "whats my training for today",
      "whats my training", "whats my session today", "whats my session for today",
      "whats my plan today", "whats my plan for today", "whats my plan", "whats my routine today",
      "whats my routine for today", "whats my routine", "whats the workout today",
      "whats the workout for today", "whats the workout", "whats the training today",
      "whats the training for today", "whats the training", "whats the session for today",
      "whats the session", "whats the plan today", "whats the plan for today", "whats the plan",
      "whats the routine today", "whats the routine for today", "whats the routine",
      "what is my workout today", "what is my workout for today", "what is my workout",
      "what is my training today", "what is my training for today", "what is my training",
      "what is my session today", "what is my session for today", "what is my session",
      "what is my plan today", "what is my plan for today", "what is my plan",
      "what is my routine today", "what is my routine for today", "what is my routine",
      "what is the workout today", "what is the workout for today", "what is the workout",
      "what is the training today", "what is the training for today", "what is the training",
      "what is the session today", "what is the session for today", "what is the session",
      "what is the plan today", "what is the plan for today", "what is the plan",
      "what is the routine today", "what is the routine for today", "what is the routine",
      "show me my workout today", "show me my workout for today", "show me my workout",
      "show me my training today", "show me my training for today", "show me my training",
      "show me my session today", "show me my session for today", "show me my session",
      "show me my plan today", "show me my plan for today", "show me my plan",
      "show me my routine today", "show me my routine for today", "show me my routine",
      "show me the workout today", "show me the workout for today", "show me the workout",
      "show me the training today", "show me the training for today", "show me the training",
      "show me the session today", "show me the session for today", "show me the session",
      "show me the plan today", "show me the plan for today", "show me the plan",
      "show me the routine today", "show me the routine for today", "show me the routine",
      "tell me my workout today", "tell me my workout for today", "tell me my workout",
      "tell me my training today", "tell me my training for today", "tell me my training",
      "tell me my session today", "tell me my session for today", "tell me my session",
      "tell me my plan today", "tell me my plan for today", "tell me my plan",
      "tell me my routine today", "tell me my routine for today", "tell me my routine",
      "tell me the workout today", "tell me the workout for today", "tell me the workout",
      "tell me the training today", "tell me the training for today", "tell me the training",
      "tell me the session today", "tell me the session for today", "tell me the session",
      "tell me the plan today", "tell me the plan for today", "tell me the plan",
      "tell me the routine today", "tell me the routine for today", "tell me the routine",
      "am i training now", "am i training", "what am i training now", "what am i training",
      "what do i train today", "what do i train now", "what should i train",
      "what should i do today", "what should i do", "do i have a workout today",
      "do i have a workout", "do i have a session today", "do i have a session", "my workout today",
      "whats on today", "what workout is today"
    ],

    START_WORKOUT: [
      "start todays workout", "start my workout", "begin my workout", "start training",
      "lets train", "open todays workout", "start the session", "begin training",
      "start workout now", "im ready to train", "lets get started with my workout"
    ,
      "lets go", "start it", "begin the workout", "start my session now", "kick off my workout",
      "im at the gym lets start", "fire up todays workout", "get my workout going",
      "open my session", "start training now", "lets start training", "begin todays session",
      "im starting my workout", "take me into my workout", "launch my workout",
      "start my session", "start my training", "start my gym session", "start my lift",
      "start the workout", "start the training", "start the gym session", "start the lift",
      "start todays session", "start todays training", "start todays gym session",
      "start todays lift", "start workout", "start session", "start gym session", "start lift",
      "begin my session", "begin my training", "begin my gym session", "begin my lift",
      "begin the session", "begin the training", "begin the gym session", "begin the lift",
      "begin todays workout", "begin todays training", "begin todays gym session",
      "begin todays lift", "begin workout", "begin session", "begin gym session", "begin lift",
      "kick off my session", "kick off my training", "kick off my gym session", "kick off my lift",
      "kick off the workout", "kick off the session", "kick off the training",
      "kick off the gym session", "kick off the lift", "kick off todays workout",
      "kick off todays session", "kick off todays training", "kick off todays gym session",
      "kick off todays lift", "kick off workout", "kick off session", "kick off training",
      "kick off gym session", "kick off lift", "fire up my workout", "fire up my session",
      "fire up my training", "fire up my gym session", "fire up my lift", "fire up the workout",
      "fire up the session", "fire up the training", "fire up the gym session", "fire up the lift",
      "fire up todays session", "fire up todays training", "fire up todays gym session",
      "fire up todays lift", "fire up workout", "fire up session", "fire up training",
      "fire up gym session", "fire up lift", "open my workout", "open my training",
      "open my gym session", "open my lift", "open the workout", "open the session",
      "open the training", "open the gym session", "open the lift", "open todays session",
      "open todays training", "open todays gym session", "open todays lift", "open workout",
      "open session", "open training", "open gym session", "open lift", "im starting training",
      "im starting lifting", "im about to start my workout", "im about to start training",
      "im about to start lifting", "i am starting my workout", "i am starting training",
      "i am starting lifting", "i am about to start my workout", "i am about to start training",
      "i am about to start lifting", "im at the gym", "starting my workout", "time to train"
    ],

    VIEW_PROGRESS: [
      "how is my progress", "view my progress", "check my progress", "see my progress",
      "look at my progress", "view progress", "open my progress", "pull up my progress", "show my progress", "am i improving", "how am i doing",
      "my stats", "show my stats", "hows it going", "am i making progress",
      
    ,
      "how am i tracking", "give me my numbers", "show my results", "hows my training going",
      "whats my progress like", "my performance", "how have i done", "show my summary", "progress report",
      "how is training going", "whats my streak like",
      "how is my stats", "how is my results", "how is my numbers", "how is my summary",
      "how is my overview", "hows my progress", "hows my stats", "hows my results",
      "hows my numbers", "hows my summary", "hows my overview", "show my numbers",
      "show my overview", "see my stats", "see my results", "see my numbers", "see my summary",
      "see my overview", "view my stats", "view my results", "view my numbers", "view my summary",
      "view my overview", "check my stats", "check my results", "check my numbers",
      "check my summary", "check my overview", "open my stats", "open my results",
      "open my numbers", "open my summary", "open my overview", "pull up my stats",
      "pull up my results", "pull up my numbers", "pull up my summary", "pull up my overview",
      "give me my progress", "give me my stats", "give me my results", "give me my summary",
      "give me my overview", "how am i doing so far", "how am i doing overall", "how is it going",
      "how is it going so far", "how is it going overall", "how have i done so far",
      "how have i done overall", "am i getting stronger", "am i on track", "progress",
      "my progress", "how have i been doing", "am i doing well"
    ],

    CREATE_ROUTINE: [
      "create a routine", "make a routine", "build me a routine", "new routine",
      /* "give me a ..." was missing entirely, so every sentence using that frame scored
         null while "make me a ..." and "build me a ..." scored 0.82 and 1.00. Reported
         from a device as "give me a chest worked plan" -- the typo was incidental, the
         correctly spelled version failed the same way. */
      "give me a chest workout plan", "give me a workout plan", "give me a routine",
      "give me a chest plan", "give me a leg workout plan", "give me a push day",
      "give me a training plan", "give me a chest workout", "gimme a workout plan",
      "can you give me a workout plan", "chest workout plan", "leg workout plan",
      "a plan for chest", "plan for legs", "i need a chest routine", "i need a workout plan",
      "create a chest workout", "make a push day", "build a leg day",
      "create a push pull legs routine", "i want a new routine", "set up a workout for me",
      "make me a chest day", "create a program"
    ,
      "set up a new routine", "start a new program", "make me a workout plan", "i need a routine",
      "build a push day", "create a pull day", "make a leg routine", "design a workout for me",
      "add a new split", "put together a routine", "create a back workout",
      "make an upper body day", "i want to build a routine", "new workout plan",
      "create a workout plan", "create a leg day", "create a push day", "create me a routine",
      "create me a workout plan", "create me a chest workout", "create me a leg day",
      "create me a push day", "create me a pull day", "create me a program", "make a workout plan",
      "make a chest workout", "make a leg day", "make a pull day", "make a program",
      "make me a routine", "make me a chest workout", "make me a leg day", "make me a push day",
      "make me a pull day", "make me a program", "build a routine", "build a workout plan",
      "build a chest workout", "build a pull day", "build a program", "build me a workout plan",
      "build me a chest workout", "build me a leg day", "build me a push day",
      "build me a pull day", "build me a program", "give me a leg day", "give me a pull day",
      "give me a program", "give me me a routine", "give me me a workout plan",
      "give me me a chest workout", "give me me a leg day", "give me me a push day",
      "give me me a pull day", "give me me a program", "set up a routine", "set up a workout plan",
      "set up a chest workout", "set up a leg day", "set up a push day", "set up a pull day",
      "set up a program", "set up me a routine", "set up me a workout plan",
      "set up me a chest workout", "set up me a leg day", "set up me a push day",
      "set up me a pull day", "set up me a program", "design a routine", "design a workout plan",
      "design a chest workout", "design a leg day", "design a push day", "design a pull day",
      "design a program", "design me a routine", "design me a workout plan",
      "design me a chest workout", "design me a leg day", "design me a push day",
      "design me a pull day", "design me a program", "i need a new program", "i want a routine",
      "i want a workout plan", "i want a new program", "i want a chest routine", "plan my training",
      "build my program"
    ],


    /* TWO REAL ACTIONS THAT HAD WORKING HANDLERS AND NO INTENT AT ALL. Both were reachable only
       by regex, so the classifier had nothing to fall back to and, worse, claimed them for the
       nearest intent it did know: "delete my weight" scored DELETE_TODAY_FOOD at 0.76 -- the
       wrong record entirely, held back only by being under the promotion bar. An intent missing
       from the corpus is not neutral; its phrases get absorbed by whatever is closest. */
    COMPLETE_WORKOUT: [
      "finish my workout", "complete my workout", "end my workout", "im done training",
      "workout done", "finish training", "im finished with my workout", "end this session",
      "done with my workout", "mark my workout complete", "stop my workout", "wrap up my workout",
      "that's my workout done", "finish this session", "complete todays workout",
      "im done with the gym", "end workout", "finish session", "log this workout as done",
      "save my workout", "im done lifting", "call it a day", "thats it for today",
      "workout finished", "close out my workout", "finish up",
      "finish my session", "finish my training", "finish my gym session", "finish the workout",
      "finish the session", "finish the training", "finish the gym session",
      "finish todays workout", "finish todays session", "finish todays training",
      "finish todays gym session", "finish workout", "finish gym session", "end my session",
      "end my training", "end my gym session", "end the workout", "end the session",
      "end the training", "end the gym session", "end todays workout", "end todays session",
      "end todays training", "end todays gym session", "end session", "end training",
      "end gym session", "complete my session", "complete my training", "complete my gym session",
      "complete the workout", "complete the session", "complete the training",
      "complete the gym session", "complete todays session", "complete todays training",
      "complete todays gym session", "complete workout", "complete session", "complete training",
      "complete gym session", "close out my session", "close out my training",
      "close out my gym session", "close out the workout", "close out the session",
      "close out the training", "close out the gym session", "close out todays workout",
      "close out todays session", "close out todays training", "close out todays gym session",
      "close out workout", "close out session", "close out training", "close out gym session",
      "wrap up my session", "wrap up my training", "wrap up my gym session", "wrap up the workout",
      "wrap up the session", "wrap up the training", "wrap up the gym session",
      "wrap up todays workout", "wrap up todays session", "wrap up todays training",
      "wrap up todays gym session", "wrap up workout", "wrap up session", "wrap up training",
      "wrap up gym session", "save my session", "save my training", "save my gym session",
      "save the workout", "save the session", "save the training", "save the gym session",
      "save todays workout", "save todays session", "save todays training",
      "save todays gym session", "save workout", "save session", "save training",
      "save gym session", "im done with my workout", "im done for today", "im finished training",
      "im finished lifting", "im finished for today", "i am done training",
      "i am done with my workout", "i am done lifting", "i am done for today",
      "i am finished training", "i am finished with my workout", "i am finished lifting",
      "i am finished for today", "im finished"
    ],

    DELETE_WEIGHT: [
      "delete my weight", "remove my weight entry", "delete my weight entry",
      "remove todays weight", "delete todays weight", "remove my last weight",
      "delete my last weigh in", "get rid of my weight entry", "erase my weight",
      "remove that weight", "remove my weigh in", "delete my weigh in", "clear my weight entry",
      "scrap my weight entry", "remove my weight for today", "delete weight entry",
      "delete my weight log", "delete the weight", "delete the weight entry", "delete the weigh in",
      "delete the weight log", "delete todays weight entry", "delete todays weigh in",
      "delete todays weight log", "remove my weight", "remove my weight log", "remove the weight",
      "remove the weight entry", "remove the weigh in", "remove the weight log",
      "remove todays weight entry", "remove todays weigh in", "remove todays weight log",
      "clear my weight", "clear my weigh in", "clear my weight log", "clear the weight",
      "clear the weight entry", "clear the weigh in", "clear the weight log", "clear todays weight",
      "clear todays weight entry", "clear todays weigh in", "clear todays weight log",
      "erase my weight entry", "erase my weigh in", "erase my weight log", "erase the weight",
      "erase the weight entry", "erase the weigh in", "erase the weight log", "erase todays weight",
      "erase todays weight entry", "erase todays weigh in", "erase todays weight log"
    ],

    /* A QUESTION ABOUT THE USER, WEARING THE CLOTHES OF A GENERAL ONE. "how much protein should
       i eat" carries no "my" and no date, so every records rule built so far reads it as a
       fitness question and answers with the textbook range. It is not: IGNYT knows the weight
       and the goal. This intent is what tells the difference. */
    GET_PROTEIN_TARGET: [
      "how much protein should i eat", "how much protein do i need", "whats my protein target",
      "my protein target", "how much protein per day", "protein target",
      "how many grams of protein should i eat", "how much protein for my weight",
      "what should my protein intake be", "how much protein do i need a day",
      "daily protein target", "how much protein should i have",
      "how much protein to build muscle for me", "whats my daily protein goal",
      "how much protein based on my weight", "protein goal", "my daily protein",
      "how much protein should i be eating", "what is my protein requirement",
      "how many grams of protein do i need",
      "how much protein a day", "how much protein to build muscle",
      "how many grams of protein should i have", "how many grams of protein per day",
      "how many grams of protein a day", "how many grams of protein should i be eating",
      "how many grams of protein do i need a day", "how many grams of protein for my weight",
      "how many grams of protein to build muscle", "whats my protein goal",
      "whats my daily protein", "whats my protein requirement", "whats my protein number",
      "what is my protein target", "what is my protein goal", "what is my daily protein",
      "what is my protein number", "tell me my protein target", "tell me my protein goal",
      "tell me my daily protein", "tell me my protein requirement", "tell me my protein number"
    ],

    GET_WEEKLY_PROGRESS: [
      "how was my week", "show my weekly progress", "weekly progress", "my week summary",
      "how did i do this week", "how did i train this week", "this week summary",
      "what did i do this week", "my training this week", "weekly summary",
      "how many workouts this week", "my week in the gym", "show me this week",
      "week overview", "how was my training week", "recap my week",
      "how much did i lift this week", "my weekly workout summary",
      "how did last week go", "show last week", "last week summary", "how was last week",
      "how was my week go", "how was the week", "how was the week go", "how was the training week",
      "how was this week", "how was this week go", "how was this training week",
      "how was last week go", "how was last training week", "how did my week", "how did my week go",
      "how did my training week", "how did the week", "how did the week go",
      "how did the training week", "how did this week", "how did this week go",
      "how did this training week", "how did last week", "how did last training week",
      "show my week", "show my week go", "show my training week", "show the week",
      "show the week go", "show the training week", "show this week", "show this week go",
      "show this training week", "show last week go", "show last training week", "recap my week go",
      "recap my training week", "recap the week", "recap the week go", "recap the training week",
      "recap this week", "recap this week go", "recap this training week", "recap last week",
      "recap last week go", "recap last training week", "summarise my week", "summarise my week go",
      "summarise my training week", "summarise the week", "summarise the week go",
      "summarise the training week", "summarise this week", "summarise this week go",
      "summarise this training week", "summarise last week", "summarise last week go",
      "summarise last training week", "give me my week", "give me my week go",
      "give me my training week", "give me the week", "give me the week go",
      "give me the training week", "give me this week", "give me this week go",
      "give me this training week", "give me last week", "give me last week go",
      "give me last training week", "how many workouts last week", "how many sessions this week",
      "how many sessions last week", "how many sets this week", "how many sets last week",
      "how did i do last week", "how did i train last week", "how did i perform this week",
      "how did i perform last week", "show me last week", "show me my week"
    ],

    GET_CALORIE_TARGET: [
      "how many calories should i eat", "whats my calorie target", "my calorie target",
      "how many calories do i need", "daily calorie target", "calorie target",
      "how many calories per day", "what should my calorie intake be",
      "how many calories to lose weight for me", "whats my daily calorie goal",
      "how many calories should i be eating", "my daily calories",
      "what are my macros", "whats my macro target", "my macros",
      "how many calories for my goal", "calorie goal", "my tdee",
      "whats my maintenance calories", "how many calories do i burn a day",
      "how many calories a day", "how many calories to lose weight",
      "how many calories to gain weight", "how many calories at maintenance",
      "how many kcal should i eat", "how many kcal do i need", "how many kcal per day",
      "how many kcal a day", "how many kcal for my goal", "how many kcal should i be eating",
      "how many kcal to lose weight", "how many kcal to gain weight",
      "how many kcal at maintenance", "whats my calorie goal", "whats my daily calories",
      "whats my maintenance", "whats my tdee", "whats my macro split", "what is my calorie target",
      "what is my calorie goal", "what is my daily calories", "what is my maintenance",
      "what is my maintenance calories", "what is my tdee", "what is my macro target",
      "what is my macro split", "tell me my calorie target", "tell me my calorie goal",
      "tell me my daily calories", "tell me my maintenance", "tell me my maintenance calories",
      "tell me my tdee", "tell me my macro target", "tell me my macro split", "what is my macros"
    ],

    EXERCISE_HOW_TO: [
      "how do i do bench press", "how to do squats", "how do i perform a deadlift",
      "bench press form", "squat technique", "teach me deadlift", "show me how to squat",
      "proper form for overhead press", "whats the correct form for rows",
      "how should i do lunges", "explain bench press", "steps for a hip thrust"
    ,
      "how do i squat", "how to bench", "show me deadlift form", "whats the technique for rows",
      "how should i perform a lunge", "correct form for pull ups", "walk me through a hip thrust",
      "explain how to do a plank", "how do you do lateral raises", "demonstrate bench press",
      "how is a romanian deadlift done", "form check bench press", "how to do overhead press",
      "the right way to squat", "instructions for deadlift", "how do i perform bicep curls"
    ,
      "how do i do squats", "how do i do deadlift", "how do i do overhead press",
      "how do i do rows", "how do i do pull ups", "how do i do lunges", "how do i do hip thrust",
      "how do i do bicep curls", "how do i do lat pulldown", "how do i do leg press",
      "how do i do dips", "how do i do push ups", "how do i do planks",
      "how do i do shoulder press", "how do i do calf raises", "how do i do leg curls",
      "how do i do face pulls", "how do i perform bench press", "how do i perform squats",
      "how do i perform deadlift", "how do i perform overhead press", "how do i perform rows",
      "how do i perform pull ups", "how do i perform lunges", "how do i perform hip thrust",
      "how do i perform lat pulldown", "how do i perform leg press", "how do i perform dips",
      "how do i perform push ups", "how do i perform planks", "how do i perform shoulder press",
      "how do i perform calf raises", "how do i perform leg curls", "how do i perform face pulls",
      "how do i bench press", "how do i squats", "how do i deadlift", "how do i overhead press",
      "how do i rows", "how do i pull ups", "how do i lunges", "how do i hip thrust",
      "how do i bicep curls", "how do i lat pulldown", "how do i leg press", "how do i dips",
      "how do i push ups", "how do i planks", "how do i shoulder press", "how do i calf raises",
      "how do i leg curls", "how do i face pulls", "how to do bench press", "how to do deadlift",
      "how to do rows", "how to do pull ups", "how to do lunges", "how to do hip thrust",
      "how to do bicep curls", "how to do lat pulldown", "how to do leg press", "how to do dips",
      "how to do push ups", "how to do planks", "how to do shoulder press", "how to do calf raises",
      "how to do leg curls", "how to do face pulls", "how to perform bench press",
      "how to perform squats", "how to perform deadlift", "how to perform overhead press",
      "how to perform rows", "how to perform pull ups", "how to perform lunges",
      "how to perform hip thrust", "how to perform bicep curls", "how to perform lat pulldown",
      "how to perform leg press", "how to perform dips", "how to perform push ups",
      "how to perform planks", "how to perform shoulder press", "how to perform calf raises",
      "how to perform leg curls", "how to perform face pulls", "how to bench press",
      "how to squats", "how to deadlift", "how to overhead press", "how to rows", "how to pull ups",
      "how to lunges", "how to hip thrust", "how to bicep curls", "how to lat pulldown",
      "how to leg press", "how to dips", "how to push ups", "how to planks",
      "how to shoulder press", "how to calf raises", "how to leg curls", "how to face pulls",
      "how should i do bench press", "how should i do squats", "how should i do deadlift",
      "how should i do overhead press", "how should i do rows", "how should i do pull ups",
      "how should i do hip thrust", "how should i do bicep curls", "how should i do lat pulldown",
      "how should i do leg press", "how should i do dips", "how should i do push ups",
      "how should i do planks", "how should i do shoulder press", "how should i do calf raises",
      "how should i do leg curls", "how should i do face pulls", "how should i perform bench press",
      "how should i perform squats", "how should i perform deadlift",
      "how should i perform overhead press", "how should i perform rows",
      "how should i perform pull ups", "how should i perform lunges",
      "how should i perform hip thrust", "how should i perform bicep curls",
      "how should i perform lat pulldown", "how should i perform leg press",
      "how should i perform dips", "how should i perform push ups", "how should i perform planks",
      "how should i perform shoulder press", "how should i perform calf raises",
      "how should i perform leg curls", "how should i perform face pulls",
      "how should i bench press", "how should i squats", "how should i deadlift",
      "how should i overhead press", "how should i rows", "how should i pull ups",
      "how should i lunges", "how should i hip thrust", "how should i bicep curls",
      "how should i lat pulldown", "how should i leg press", "how should i dips",
      "how should i push ups", "how should i planks", "how should i shoulder press",
      "how should i calf raises", "how should i leg curls", "how should i face pulls",
      "teach me do bench press", "teach me do squats", "teach me do deadlift",
      "teach me do overhead press", "teach me do rows", "teach me do pull ups",
      "teach me do lunges", "teach me do hip thrust", "teach me do bicep curls",
      "teach me do lat pulldown", "teach me do leg press", "teach me do dips",
      "teach me do push ups", "teach me do planks", "teach me do shoulder press",
      "teach me do calf raises", "teach me do leg curls", "teach me do face pulls",
      "teach me perform bench press", "teach me perform squats", "teach me perform deadlift",
      "teach me perform overhead press", "teach me perform rows", "teach me perform pull ups",
      "teach me perform lunges", "teach me perform hip thrust", "teach me perform bicep curls",
      "teach me perform lat pulldown", "teach me perform leg press", "teach me perform dips",
      "teach me perform push ups", "teach me perform planks", "teach me perform shoulder press",
      "teach me perform calf raises", "teach me perform leg curls", "teach me perform face pulls",
      "teach me bench press", "teach me squats", "teach me overhead press", "teach me rows",
      "teach me pull ups", "teach me lunges", "teach me hip thrust", "teach me bicep curls",
      "teach me lat pulldown", "teach me leg press", "teach me dips", "teach me push ups",
      "teach me planks", "teach me shoulder press", "teach me calf raises", "teach me leg curls",
      "teach me face pulls", "show me how to do bench press", "show me how to do squats",
      "show me how to do deadlift", "show me how to do overhead press", "show me how to do rows",
      "show me how to do pull ups", "show me how to do lunges", "show me how to do hip thrust",
      "show me how to do bicep curls", "show me how to do lat pulldown",
      "show me how to do leg press", "show me how to do dips", "show me how to do push ups",
      "show me how to do planks", "show me how to do shoulder press",
      "show me how to do calf raises", "show me how to do leg curls",
      "show me how to do face pulls", "show me how to perform bench press",
      "show me how to perform squats", "show me how to perform deadlift",
      "show me how to perform overhead press", "show me how to perform rows",
      "show me how to perform pull ups", "show me how to perform lunges",
      "show me how to perform hip thrust", "show me how to perform bicep curls",
      "show me how to perform lat pulldown", "show me how to perform leg press",
      "show me how to perform dips", "show me how to perform push ups",
      "show me how to perform planks", "show me how to perform shoulder press",
      "show me how to perform calf raises", "show me how to perform leg curls",
      "show me how to perform face pulls", "show me how to bench press", "show me how to squats",
      "show me how to deadlift", "show me how to overhead press", "show me how to rows",
      "show me how to pull ups", "show me how to lunges", "show me how to hip thrust",
      "show me how to bicep curls", "show me how to lat pulldown", "show me how to leg press",
      "show me how to dips", "show me how to push ups", "show me how to planks",
      "show me how to shoulder press", "show me how to calf raises", "show me how to leg curls",
      "show me how to face pulls", "explain do bench press", "explain do squats",
      "explain do deadlift", "explain do overhead press", "explain do rows", "explain do pull ups",
      "explain do lunges", "explain do hip thrust", "explain do bicep curls",
      "explain do lat pulldown", "explain do leg press", "explain do dips", "explain do push ups",
      "explain do planks", "explain do shoulder press", "explain do calf raises",
      "explain do leg curls", "explain do face pulls", "explain perform bench press",
      "explain perform squats", "explain perform deadlift", "explain perform overhead press",
      "explain perform rows", "explain perform pull ups", "explain perform lunges",
      "explain perform hip thrust", "explain perform bicep curls", "explain perform lat pulldown",
      "explain perform leg press", "explain perform dips", "explain perform push ups",
      "explain perform planks", "explain perform shoulder press", "explain perform calf raises",
      "explain perform leg curls", "explain perform face pulls", "explain squats",
      "explain deadlift", "explain overhead press", "explain rows", "explain pull ups",
      "explain lunges", "explain hip thrust", "explain bicep curls", "explain lat pulldown",
      "explain leg press", "explain dips", "explain push ups", "explain planks",
      "explain shoulder press", "explain calf raises", "explain leg curls", "explain face pulls",
      "whats the correct form for bench press", "whats the correct form for squats",
      "whats the correct form for deadlift", "whats the correct form for overhead press",
      "whats the correct form for pull ups", "whats the correct form for lunges",
      "whats the correct form for hip thrust", "whats the correct form for bicep curls",
      "whats the correct form for lat pulldown", "whats the right form for bench press",
      "whats the right form for squats", "whats the right form for deadlift",
      "whats the right form for overhead press", "whats the right form for rows",
      "whats the right form for pull ups", "whats the right form for lunges",
      "whats the right form for hip thrust", "whats the right form for bicep curls",
      "whats the right form for lat pulldown", "whats the technique for bench press",
      "whats the technique for squats", "whats the technique for deadlift",
      "whats the technique for overhead press", "whats the technique for pull ups",
      "whats the technique for lunges", "whats the technique for hip thrust",
      "whats the technique for bicep curls", "whats the technique for lat pulldown",
      "whats the proper form for bench press", "whats the proper form for squats",
      "whats the proper form for deadlift", "whats the proper form for overhead press",
      "whats the proper form for rows", "whats the proper form for pull ups",
      "whats the proper form for lunges", "whats the proper form for hip thrust",
      "whats the proper form for bicep curls", "whats the proper form for lat pulldown",
      "bench press technique", "bench press tips", "squats form", "squats technique", "squats tips",
      "deadlift form", "deadlift technique", "deadlift tips", "overhead press form",
      "overhead press technique", "overhead press tips", "rows form", "rows technique", "rows tips",
      "pull ups form", "pull ups technique", "pull ups tips", "lunges form", "lunges technique",
      "lunges tips", "hip thrust form", "hip thrust technique", "hip thrust tips",
      "bicep curls form", "bicep curls technique", "bicep curls tips", "lat pulldown form",
      "lat pulldown technique", "lat pulldown tips", "leg press form", "leg press technique",
      "leg press tips", "dips form", "dips technique", "dips tips"
    ]
  };

  /* ---------- the scorer -------------------------------------------------------------------
     Deliberately the same shape as knowledge.js. If that file's matching is ever improved, this
     should be changed to match rather than left to drift into a second dialect. */

  var STOP = {};
  ("a an the is are am was were be been do does did doing done how what when where which who why " +
   "should shall will would can could may might must i me my mine you your we our us they them " +
   "it its this that these those to for of in on at by with from as and or but if then than " +
   "there here about into over under out up down off no not yes so very much many more most " +
   "get got getting have has had need needs want wants take takes best good better please").split(" ")
    .forEach(function (w) { STOP[w] = 1; });

  function stem(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + "y";
    if (w.length > 4 && /(ses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    return w;
  }

  function tokens(text) {
    var raw = String(text || "").toLowerCase()
      .replace(/[’']/g, "")
      .replace(/(\d)[, ](\d)/g, "$1$2")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (!w || w.length < 2 || STOP[w]) continue;
      out.push(stem(w));
    }
    return out;
  }

  var _idf = null, _maxIdf = 1, _vecs = null;

  function build() {
    if (_vecs) return;
    var docs = [];
    Object.keys(EXAMPLES).forEach(function (intent) {
      EXAMPLES[intent].forEach(function (ex) { docs.push({ intent: intent, t: tokens(ex) }); });
    });
    var df = {}, n = docs.length;
    docs.forEach(function (d) {
      var seen = {};
      d.t.forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } });
    });
    _idf = {};
    Object.keys(df).forEach(function (w) { _idf[w] = Math.log(1 + n / df[w]); });
    _maxIdf = Math.log(1 + n);
    docs.forEach(function (d) {
      var sum = 0, seen = {};
      d.t.forEach(function (w) {
        if (seen[w]) return; seen[w] = 1;
        var v = _idf[w] || 0; sum += v * v;
      });
      d.norm = Math.sqrt(sum) || 1;
    });
    _vecs = docs;
  }

  function score(qTokens, doc) {
    if (!qTokens.length || !doc.t.length) return 0;
    var qSeen = {}, qSum = 0, dot = 0;
    qTokens.forEach(function (w) {
      if (qSeen[w]) return; qSeen[w] = 1;
      /* An unknown word carries MAXIMUM weight rather than none. It cannot match anything, so
         it only enlarges the query's own norm — which drags the score down in proportion to how
         much of the sentence is unfamiliar. Without this, a message full of words the examples
         have never seen scores highly on its one familiar word. */
      var v = (_idf[w] != null) ? _idf[w] : _maxIdf;
      qSum += v * v;
    });
    var dSeen = {};
    doc.t.forEach(function (w) {
      if (dSeen[w]) return; dSeen[w] = 1;
      if (qSeen[w]) { var v = _idf[w] || 0; dot += v * v; }
    });
    return dot / ((Math.sqrt(qSum) || 1) * doc.norm);
  }

  /* The bar a classification must clear. Lower than the knowledge base's, and deliberately:
     an intent is a much smaller target than a specific question — several examples of the same
     intent share most of their words, so the best match for a genuine hit is reliably strong,
     while a message belonging to no intent has nothing to be similar TO. Tunable at runtime. */
  var DEFAULT_THRESHOLD = 0.55;
  var KEY = "hx_intent_threshold";
  function threshold() {
    try {
      var v = parseFloat(localStorage.getItem(KEY));
      if (isFinite(v) && v > 0 && v <= 1) return v;
    } catch (e) {}
    return DEFAULT_THRESHOLD;
  }

  /**
   * @returns {{intent:string, confidence:number, example:string}|null}
   *          null means "not confidently any of these" — the caller must not guess.
   */
  function classify(text) {
    build();
    var qt = tokens(text);
    if (!qt.length) return null;

    /* Best score PER INTENT, not per example: an intent with forty examples would otherwise
       out-vote one with twelve simply by having more chances. */
    var best = {}, bestEx = {};
    for (var i = 0; i < _vecs.length; i++) {
      var s = score(qt, _vecs[i]);
      if (!(best[_vecs[i].intent] >= s)) { best[_vecs[i].intent] = s; bestEx[_vecs[i].intent] = _vecs[i]; }
    }
    var ranked = Object.keys(best).sort(function (a, b) { return best[b] - best[a]; });
    var top = ranked[0], second = ranked[1];
    if (!top || best[top] < threshold()) return null;
    /* Two intents nearly tied means the sentence did not choose between them, and picking one
       is a coin toss whose wrong side may delete something. */
    if (second && best[top] - best[second] < 0.05) return null;

    return { intent: top, confidence: Math.round(best[top] * 100) / 100,
             example: EXAMPLES[top][_vecs.indexOf(bestEx[top]) >= 0 ? 0 : 0] };
  }

  window.IgnytIntents = Object.freeze({
    classify: classify,
    threshold: threshold,
    setThreshold: function (v) { try { localStorage.setItem(KEY, String(v)); } catch (e) {} return threshold(); },
    names: function () { return Object.keys(EXAMPLES); },
    exampleCount: function () {
      return Object.keys(EXAMPLES).reduce(function (n, k) { return n + EXAMPLES[k].length; }, 0);
    },
    /* Exposed for tuning: the ranked intents and scores for a message. */
    debug: function (text) {
      build();
      var qt = tokens(text), best = {};
      _vecs.forEach(function (d) { var s = score(qt, d); if (!(best[d.intent] >= s)) best[d.intent] = s; });
      return Object.keys(best).sort(function (a, b) { return best[b] - best[a]; })
        .slice(0, 4).map(function (k) { return { intent: k, score: Math.round(best[k] * 100) / 100 }; });
    }
  });
}());
