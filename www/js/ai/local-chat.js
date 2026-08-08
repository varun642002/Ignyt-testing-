/* =========================================================
   IGNYT LOCAL CHAT — the chatbot that answers before the AI is asked

   Runs entirely on the device. No network, no API key, no daily allowance, works offline and
   returns in about a millisecond.

   WHY THIS SITS IN FRONT OF THE AI RATHER THAN INSTEAD OF IT
   The expensive half of the AI Coach was never the language model. js/ai/actions.js already
   holds seventeen actions that read and write real IGNYT data; Gemini's only job is deciding
   which one a sentence means. That decision is genuinely hard for "I had two rotis and some
   dal around eight" and completely mechanical for "what's my streak" — and the mechanical
   ones are what people type most often.

   So this handles the phrasings it can prove it understands and hands everything else on,
   untouched. The rule is deliberately one-directional: NEVER GUESS. A wrong guess here is
   worse than a fallback, because the fallback is a system that would have got it right. Any
   sentence that does not match cleanly returns null, and the AI takes it.

   WHAT IT WILL NOT DO
   It does not do open-ended conversation, advice, or anything requiring inference. Those are
   the AI's, and this returns null for them rather than producing something shallow and
   confidently wrong about somebody's training.

   SHAPE CONTRACT
   Returns the same object js/ai/service.js's ask() does — { text, pending } — so the chat
   screen cannot tell the two apart, and a write still produces a confirmation card rather
   than happening silently. null means "not mine".
========================================================= */
(function () {
  "use strict";

  /* ---------- small helpers -------------------------------------------------------------- */

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[’']/g, "")            // "what's" -> "whats", so one pattern covers both
      .replace(/[^\w\s.+-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* actions.js exposes the registry as REGISTRY, and `risk(name)` as the lookup. Checked via
     risk() rather than by reaching into the object, so this keeps working if the registry is
     ever made private — and it is checked at all because an intent must not claim a sentence
     it has no action to fulfil. Getting this wrong is silent: every data-backed intent simply
     stops matching and everything falls through to the AI, which still answers, so nothing
     looks broken from the outside. It took a test naming the expected intent to see it. */
  function has(A, name) {
    if (!A) return false;
    if (typeof A.risk === "function") return !!A.risk(name);
    return !!(A.REGISTRY && A.REGISTRY[name]);
  }

  /* Numbers people actually type: 78, 78.5, 78kg, "78 kg", 172lb. Returns null rather than
     NaN so a caller can tell "no number" from "zero". */
  function firstNumber(text) {
    var m = String(text).match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    var n = parseFloat(m[1]);
    return isFinite(n) ? n : null;
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  /* ---------- weight ---------------------------------------------------------------------- */

  /* POUNDS ARE CONVERTED HERE, not left for the action to guess. logWeight stores kilograms;
     a user who types "172 lbs" and gets 172 recorded has a corrupted chart and no obvious
     cause. The unit is only honoured when it is written down — a bare number is taken in the
     user's existing unit, which is what they meant. */
  function parseWeight(raw, text) {
    var lb = /\b(lbs?|pounds?)\b/.test(text);
    return lb ? round1(raw * 0.45359237) : raw;
  }

  /* ---------- intent table ----------------------------------------------------------------
     Ordered: the first match wins, so the more specific patterns are written first. Each
     entry either answers directly (read) or returns a pending action (write), never both. */

  var INTENTS = [
    /* ---- greetings and help, which need no data at all ---- */
    {
      name: "greeting",
      test: function (t) { return /^(hi|hey|hello|yo|hiya|namaste|good (morning|afternoon|evening))\b/.test(t); },
      run: function () {
        return { text: "Hey. I can log food, weight, steps and workouts, or tell you how you're doing — try \"log 200g chicken\", \"weight 78\", or \"what's my streak\"." };
      }
    },
    {
      name: "help",
      test: function (t) { return /\b(what can you do|help me|^help$|commands|how do (i|you) use)\b/.test(t); },
      run: function () {
        return { text: [
          "Things I can do without going online:",
          "• Log food — \"log 200g chicken\", \"ate 2 eggs\"",
          "• Log weight — \"weight 78\" or \"I weigh 172 lbs\"",
          "• Log steps — \"8000 steps\"",
          "• Check in — \"what's my streak\", \"my score\", \"what did I eat today\"",
          "• Today's plan — \"what's my workout\"",
          "",
          "Anything more involved and I'll pass it to the AI Coach."
        ].join("\n") };
      }
    },

    /* ---- reads ---- */
    {
      name: "streak",
      needs: "getStreak",
      test: function (t) { return /\bstreak\b/.test(t); },
      run: async function (A) {
        var r = await A.run("getStreak", {});
        var d = (r && r.data) || {};
        var cur = d.current != null ? d.current : d.streak;
        if (cur == null) return null;                    // shape not as expected — let the AI try
        var best = d.best != null ? d.best : d.longest;
        var txt = cur === 0 ? "No streak going right now — today can start one."
                : cur === 1 ? "You're on a 1 day streak. Day two is the one that counts."
                : "You're on a " + cur + " day streak.";
        if (best != null && best > cur) txt += " Your best is " + best + ".";
        return { text: txt };
      }
    },
    {
      name: "score",
      needs: "getIGNYTScore",
      test: function (t) { return /\b(ignyt score|my score|score today|whats my score)\b/.test(t); },
      run: async function (A) {
        var r = await A.run("getIGNYTScore", {});
        var d = (r && r.data) || {};
        var s = d.score != null ? d.score : d.total;
        if (s == null) return null;
        return { text: "Your IGNYT score today is " + Math.round(s) + "." };
      }
    },
    {
      name: "food log today",
      needs: "getFoodLog",
      test: function (t) {
        return /\b(what did i eat|what have i eaten|my food log|calories today|how many calories|food today)\b/.test(t);
      },
      run: async function (A) {
        var r = await A.run("getFoodLog", {});
        var d = (r && r.data) || {};
        var items = d.entries || d.items || d.foods;
        if (!Array.isArray(items)) return null;
        if (!items.length) return { text: "Nothing logged yet today." };
        var kcal = d.totalCalories != null ? d.totalCalories
                 : items.reduce(function (a, x) { return a + (x.kcal || x.calories || 0); }, 0);
        var names = items.slice(0, 6).map(function (x) { return x.name || x.food; }).filter(Boolean);
        var line = names.join(", ") + (items.length > names.length ? " and " + (items.length - names.length) + " more" : "");
        return { text: "Today: " + line + ".\nThat's about " + Math.round(kcal) + " kcal." };
      }
    },
    {
      name: "today workout",
      needs: "getTodayWorkout",
      test: function (t) {
        if (!/\b(my workout|todays workout|whats my workout|what should i train|train today|workout today)\b/.test(t)) return false;
        /* ASKING about today's workout is a read. Asking to CHANGE it is not, and "make
           today's workout easier" contains the same words as "what's today's workout".
           Without this it answered the question the user did not ask — the one failure mode
           that is worse than falling through, because it looks like an answer. Rewriting a
           session is the AI's job; this hands it over. */
        return !/\b(easier|harder|lighter|heavier|shorter|longer|change|swap|replace|modify|adjust|make|skip|move|reschedule)\b/.test(t);
      },
      run: async function (A) {
        var r = await A.run("getTodayWorkout", {});
        var d = (r && r.data) || {};
        if (d.rest || d.isRest) return { text: "Today's a rest day. Take it." };
        var name = d.name || d.title || d.workout;
        if (!name) return null;
        var n = (d.exercises && d.exercises.length) || d.exerciseCount;
        return { text: "Today: " + name + (n ? " — " + n + " exercises." : ".") };
      }
    },

    /* ---- writes: these return a pending action, so the chat screen shows the same
           confirmation card the AI path produces. Nothing is written on a pattern match
           alone. ---- */
    {
      name: "log weight",
      needs: "logWeight",
      test: function (t) {
        return /\b(weigh|weight)\b/.test(t) && firstNumber(t) !== null
            && !/\b(chart|graph|history|progress|goal|target|lost|lose|gain)\b/.test(t);
      },
      run: function (A, t) {
        var n = firstNumber(t);
        /* A plausibility gate, because "log my weight for the 3rd" would otherwise record
           3 kg. Outside human range, hand it to the AI rather than confirm something absurd. */
        var kg = parseWeight(n, t);
        if (kg < 20 || kg > 400) return null;
        return { text: null, pending: { action: "logWeight", args: { weight: kg } } };
      }
    },
    {
      name: "log steps",
      needs: "updateSteps",
      test: function (t) { return /\bsteps?\b/.test(t) && firstNumber(t) !== null; },
      run: function (A, t) {
        var n = firstNumber(t);
        if (n == null || n < 0 || n > 200000) return null;
        return { text: null, pending: { action: "updateSteps", args: { steps: Math.round(n) } } };
      }
    },
    {
      name: "log food",
      needs: "addFoodLog",
      test: function (t) {
        /* No digit is required. "add a banana" is a perfectly ordinary thing to say and the
           earlier version demanded a number, so it was handed to Gemini — which food logging
           must never reach. Quantity defaults to one below. */
        return /\b(log|ate|eat|had|add)\b/.test(t)
            && !/\b(weight|weigh|steps?|workout|water|streak|score|progress)\b/.test(t);
      },
      run: function (A, t) {
        /* MEAL FIRST, and stripped out before the food is read. "log 2 eggs for breakfast"
           otherwise parses the food as "eggs for breakfast", which matches nothing in the
           library and produces a not-found for a food that is plainly there. */
        var meal = null;
        /* "to breakfast" as well as "for lunch". Missing "to" left the food parsed as
           "eggs to breakfast", which matches nothing in the library — so a food that is
           plainly there came back as not available. */
        var mm = t.match(/\b(?:for|at|as|to|in)\s+(breakfast|lunch|dinner|snacks?)\b/);
        if (mm) {
          meal = mm[1].replace(/^snacks?$/, "Snack");
          meal = meal.charAt(0).toUpperCase() + meal.slice(1);
          t = t.replace(mm[0], "").replace(/\s+/g, " ").trim();
        }

        /* SEVERAL FOODS, CHECKED FIRST. This has to run before the parse rather than on the
           parsed food name: "log 200g chicken and 100g rice" fails the strict pattern
           outright — [a-z\s] cannot cover "100g" — so the guard placed after it never ran and
           the whole thing fell through to Gemini, which food logging must never reach.

           Logging only the first item would silently drop the rest of someone's meal, and
           splitting on "and" reliably enough to trust ("rice and dal" is two, "chicken and
           mushroom soup" is one) is not something a regex can do. So it asks. Local, honest,
           and zero AI activities. */
        if (/\b(and|plus)\b|,/.test(t.replace(/^\s*(log|ate|eat|had|add)\b/, ""))) {
          return { text: "I can log one food at a time — send them separately and I'll get both." };
        }

        /* "<n><unit> <food>", "<n> <food>", and a bare "a banana" with no number at all. */
        var m = t.match(/(?:log|ate|eat|had|add)\s+(?:a\s+|an\s+)?(\d+(?:\.\d+)?)\s*(g|grams?|ml|kg|oz|cups?|bowls?|pieces?|slices?)?\s+(?:of\s+)?([a-z][a-z\s]{1,40})$/);
        if (!m) {
          var m2 = t.match(/(?:log|ate|eat|had|add)\s+(?:a|an|some)?\s*([a-z][a-z\s]{1,40})$/);
          if (!m2) return null;
          m = [null, "1", null, m2[1]];
        }
        var qty = parseFloat(m[1]);
        var unit = m[2] || null;
        var food = m[3].replace(/\s+/g, " ").trim();
        if (!food || !isFinite(qty) || qty <= 0) return null;

        var args = { food: food, quantity: qty };
        /* `food`, NOT `name`. actions.js reads args.food; passing `name` sent it undefined and
           every chatbot food log failed before it ever reached the library. It failed quietly,
           because the not-found path looks identical to a food genuinely missing. */
        if (unit) args.unit = unit.replace(/s$/, "").replace(/^gram$/, "g");
        if (/^(g|kg|ml|oz)$/.test(args.unit || "")) { args.grams = args.unit === "kg" ? qty * 1000 : qty; }
        if (meal) args.meal = meal;
        return { text: null, pending: { action: "addFoodLog", args: args } };
      }
    }
  ];

  /* ---------- the entry point -------------------------------------------------------------- */

  /**
   * Try to answer locally.
   * @returns {Promise<{text:string|null, pending?:object, source:string}|null>}
   *          null means "I don't understand this well enough" — the caller must fall back.
   */
  async function tryAnswer(message) {
    var t = norm(message);
    if (!t) return null;

    var A = window.IgnytAIActions;
    for (var i = 0; i < INTENTS.length; i++) {
      var it = INTENTS[i];
      if (it.needs && !has(A, it.needs)) continue;   // action unavailable; not our problem to fake
      var matched = false;
      try { matched = it.test(t); } catch (e) { matched = false; }
      if (!matched) continue;

      var out;
      try {
        out = await it.run(A, t);
      } catch (e) {
        /* A local handler that throws must not take the turn down with it. Falling through to
           the AI is strictly better than showing an error for something it could have answered. */
        return null;
      }
      if (!out) return null;                          // handler declined on closer inspection
      out.source = "local:" + it.name;
      return out;
    }
    return null;
  }

  window.IgnytLocalChat = Object.freeze({
    tryAnswer: tryAnswer,
    /* Exposed for tests: which intent claims this sentence, without running it. */
    match: function (message) {
      var t = norm(message);
      var A = window.IgnytAIActions;
      for (var i = 0; i < INTENTS.length; i++) {
        if (INTENTS[i].needs && !has(A, INTENTS[i].needs)) continue;
        try { if (INTENTS[i].test(t)) return INTENTS[i].name; } catch (e) {}
      }
      return null;
    },
    normalise: norm
  });
}());
