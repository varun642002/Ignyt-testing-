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
      "i messed up my food log clear it", "take everything out of todays food"
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
      "i had dosa for breakfast", "put 150g paneer in"
    ],

    VIEW_FOOD_LOG: [
      "what did i eat today", "show my food log", "view my food log", "view my food", "open my food log",
      "view todays food", "pull up my food log", "show my logged food", "show my food",
      "view my meals", "what have i eaten", "list my food", "whats in my food log",
      "check my food log", "show todays meals", "what did i log today",
      "how many calories did i eat today", "whats my calorie total", "todays macros",
      "how much protein did i eat", "show my nutrition today", "what have i logged",
      "read my food log", "display my meals", "my food for today"
    ,
      "whats my food today", "did i log anything today", "show me what ive eaten",
      "open my food log", "food i logged", "my meals so far", "whats my intake today",
      "how much have i eaten", "todays calories", "calories so far today"
    ],

    LOG_WEIGHT: [
      "log my weight", "log weight", "record my weight", "add my weight",
      "update my weight", "my weight is 82", "my weight is 82 kg", "i weigh 82 kilos",
      "log my weight as 82", "weight 82", "82 kg today", "todays weight is 82",
      "i weighed myself 82", "put my weight in", "save my weight", "note my weight",
      "track my weight today", "my weight today is 81.5", "update weight to 80",
      "change my weight to 81", "i am 82 kg now", "log 172 lbs", "weigh in 82"
    ,
      "add weight 82", "put in my weight", "record 82 kilos", "log todays weight",
      "im 82 kilos today", "weighed in at 82", "set my weight to 82", "write my weight down"
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
      "whats happened to my weight", "weight numbers"
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
      "what should i do in the gym today"
    ],

    START_WORKOUT: [
      "start todays workout", "start my workout", "begin my workout", "start training",
      "lets train", "open todays workout", "start the session", "begin training",
      "start workout now", "im ready to train", "lets get started with my workout"
    ,
      "lets go", "start it", "begin the workout", "start my session now", "kick off my workout",
      "im at the gym lets start", "fire up todays workout", "get my workout going",
      "open my session", "start training now", "lets start training", "begin todays session",
      "im starting my workout", "take me into my workout", "launch my workout"
    ],

    VIEW_PROGRESS: [
      "how is my progress", "view my progress", "check my progress", "see my progress",
      "look at my progress", "view progress", "open my progress", "pull up my progress", "show my progress", "am i improving", "how am i doing",
      "my stats", "show my stats", "hows it going", "am i making progress",
      "how was my week", "how did i do this week", "weekly progress", "my week summary",
      "how did i perform this week", "show my weekly progress", "last week recap"
    ,
      "how am i tracking", "give me my numbers", "show my results", "hows my training going",
      "whats my progress like", "summarise my week", "how did the week go", "recap my week",
      "my performance", "how have i done", "show my summary", "progress report",
      "how is training going", "whats my streak like"
    ],

    CREATE_ROUTINE: [
      "create a routine", "make a routine", "build me a routine", "new routine",
      "create a chest workout", "make a push day", "build a leg day",
      "create a push pull legs routine", "i want a new routine", "set up a workout for me",
      "make me a chest day", "create a program"
    ,
      "set up a new routine", "start a new program", "make me a workout plan", "i need a routine",
      "build a push day", "create a pull day", "make a leg routine", "design a workout for me",
      "add a new split", "put together a routine", "create a back workout",
      "make an upper body day", "i want to build a routine", "new workout plan"
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
