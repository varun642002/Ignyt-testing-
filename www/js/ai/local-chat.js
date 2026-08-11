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
    var text = String(s || "");

    /* LANGUAGE FIRST, AND IT HAS TO BE FIRST. The strip below is /[^\w\s.+-]/, and \w in
       JavaScript is ASCII — no /u flag, no Unicode property escapes — so every Tamil,
       Devanagari, Kannada, Malayalam and Telugu character becomes a space. Run in the other
       order, "என் எடை 85 கிலோ" arrives here as bare "85" and the language work is undone by
       the next line before anything can use it.
       Converting to the canonical English form first means the intent table, the knowledge
       matcher and the follow-up slot all keep working unchanged on one representation. */
    if (window.IgnytLang && IgnytLang.canonical) {
      try { text = IgnytLang.canonical(text).text; } catch (e) { /* fall through untouched */ }
    }

    text = text
      .toLowerCase()
      .replace(/[’']/g, "")            // "what's" -> "whats", so one pattern covers both
      /* THE COMMA SURVIVES. It was being blanked with the rest of the punctuation, which is
         fine for a question and wrong for a list: "bench press, incline press, cable fly"
         arrived as one run-on string with no boundaries left, so the routine builder could not
         tell three exercises from one long name. A comma is a separator, not decoration.
         Safe alongside the intent patterns because it is still a non-word character, so every
         \b boundary behaves exactly as before. */
      .replace(/[^\w\s.,+-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    /* SPEECH-TO-TEXT MISHEARINGS, corrected only where context proves it.
       Seen on a real device: "delete the lock food" — the recogniser heard "lock" for "log".
       The transcript is not a fact, it is a guess, and this is the one place that can tell.

       EVERY RULE IS CONTEXT-GATED, which is the whole reason this is safe. "lock" only becomes
       "log" when a loggable noun follows it; "wait" only becomes "weight" when a number does.
       An ungated /lock/ to /log/ would break "lock the screen", and an ungated "wait" would
       break "wait a moment" — a corrector that fires on ambiguous words is worse than none,
       because it makes correct input wrong and gives the user nothing to push back on. */
    var HEARD = [
      /* A determiner may sit between the verb and its object — "lock my weight", "lock the
         food" — and a quantity counts as proof too: "lock 200g chicken" is a logging command
         in every reading, because "lock" takes no measurement. */
      [/\block(?=\s+(my\s+|the\s+|a\s+|an\s+)?(foods?|weight|workout|meals?|steps?|water))/g, "log"],
      [/\block(?=\s+\d)/g, "log"],
      [/\blocked(?=\s+(foods?|weight|workout|meals?))/g, "logged"],
      [/\blog\s+in(?=\s+(foods?|weight|my))/g, "log"],
      /* "love foot 2 and grams chicken" was a real transcript of "log food 200 grams chicken".
         Both substitutions are gated the same way as lock/log: "love" only becomes "log" before
         a loggable noun, "foot" only becomes "food" after a logging verb. Ungated, they would
         wreck "I love squats" and "my foot hurts" — the second especially, since that is an
         injury report the safety guard needs to see intact. */
      [/\blove(?=\s+(my\s+|the\s+)?(foods?|weight|meals?|workout))/g, "log"],
      [/(?<=\b(?:log|add|record)\s+)foot\b/g, "food"],
      [/\bwalk\s*out\b/g, "workout"],
      [/\bwork\s+out\b/g, "workout"],
      [/\bwait(?=\s+\d)/g, "weight"],
      [/\bway\s*to(?=\s+\d)/g, "weight"],
      [/\bweigh\s+in(?=\s+\d)/g, "weight"],
      [/\bbench\s+breast\b/g, "bench press"],
      [/\bdead\s+left\b/g, "deadlift"],
      [/\bsquad(?=s?\b)/g, "squat"]
    ];
    for (var h = 0; h < HEARD.length; h++) text = text.replace(HEARD[h][0], HEARD[h][1]);

    /* REPHRASING AFTER A BAD ANSWER. Seen on a real device: the assistant answered "how to do
       bench press" with the anatomy entry, and the reply — "I asked how to do bench press" —
       came back as "I don't have a reliable answer for that yet." Being corrected and
       responding with a second failure is the worst moment in the conversation, and the
       question inside the correction is one the base answers perfectly well.

       So the preamble is stripped and what remains is treated as the real question. Only from
       the START of the message, and only these fixed openers: a mid-sentence "I asked" is part
       of what somebody is telling you, not a frame around it. */
    /* POLITE AND INTENTIONAL PREAMBLES. "I want to log chicken biryani" is the same command as
       "log chicken biryani" with three words of throat-clearing in front, and it came back as
       "I don't have a reliable answer" — because the intent tests look for the verb near the
       start and the preamble pushed it out of reach.
       Stripped from the START only, and "i want to know" is deliberately absent from this list:
       that one introduces a QUESTION, and it is handled by the rephrase group below. */
    text = text.replace(/^(please\s+)?(i (want|need|would like|wanna|d like) to|can you|could you|help me|let me|i'm going to|im going to)\s+/, "").trim();

    var STRIP = /^(no |nope |actually |sorry )*(i (asked|said|meant|want to know)|my question (was|is)|the question (was|is)|what i (asked|meant) (was|is))\s+/;
    var stripped = text.replace(STRIP, "").trim();
    /* Only if something substantial survives. "I asked" alone is not a question, and reducing
       it to an empty string would match the first intent with a loose pattern. */
    if (stripped && stripped.length >= 3 && stripped !== text) text = stripped;

    return text;
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

  /* ---------- short-term conversation state --------------------------------------------
     ONE SLOT, IN MEMORY, THAT EXPIRES. Deliberately not persisted and deliberately not a
     transcript: the brief asks for short-term context, not AI-style memory, and the only
     thing that has to survive between two messages is "I just asked for a weight".

     A module variable rather than app state because it is genuinely ephemeral — a reload
     should forget it. Persisting it would mean a user who closed the app mid-question comes
     back tomorrow, types something unrelated, and has it logged as their weight.

     Three minutes. Long enough to look away and answer, short enough that a stray number typed
     much later is treated as a new message rather than the answer to a question nobody
     remembers being asked. */
  var AWAIT_TTL_MS = 3 * 60 * 1000;
  var _awaiting = null;

  /* The language of the message being handled right now. Set once per turn from the
     ORIGINAL text — norm() has already canonicalised the words to English by the time an
     intent runs, so by then there is nothing left to detect from. A module variable rather
     than a parameter because the intent table is a list of plain functions and threading a
     locale through every one of them would be a lot of noise for one string each. */
  var BR = String.fromCharCode(10);   // newline, written this way so it survives tooling
  var _lang = "en";
  function say(id) {
    return (window.IgnytLang && IgnytLang.t) ? IgnytLang.t(id, _lang) : "";
  }

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

    /* HOW TO PERFORM AN EXERCISE — from the app's own 409-exercise instruction set, not from
       the knowledge base. The base answers "how to do bench press" with a paraphrase about
       chest and triceps; IgnytExerciseInstructions has the actual numbered steps the workout
       screen shows, which is what the question asked for.

       EQUIPMENT VARIANTS ARE NOT INTERCHANGEABLE, and that file says so in its own header: the
       library separates "Standing Calf Raise (Dumbbell)" from "(Machine)" from "(Barbell)",
       and attaching barbell setup cues to a machine movement is worse than having no
       instructions. So the match is exact first, then on the base name before the bracket —
       and when a base name has several variants, the answer NAMES the one it picked. Being
       shown "Bench Press (Barbell)" tells the user immediately whether they got the movement
       they meant; silently choosing would not. */
    {
      name: "exercise how to",
      test: function (t) {
        if (!window.IgnytExerciseInstructions) return false;
        /* A technique question, not an anatomy or programming one — those have their own
           answers and must not be captured here. */
        if (/\b(muscles?|sets|reps|how many|how much|alternative|instead of|good for|benefit)\b/.test(t)) return false;
        /* "bench press form" and "squat technique" put the noun LAST, with no question stem at
           all — the commonest way people actually type this, and the pattern below only caught
           the "form for X" ordering. */
        if (/^[a-z][a-z\s]{2,40}\s(form|technique)$/.test(t)) return true;
        return /\b(how (to|do i|do you|should i) (do|perform|execute)|how do i|technique|form for|form of|proper form|teach me|show me how|steps for)\b/.test(t);
      },
      run: function (A, t) {
        var DB = window.IgnytExerciseInstructions;
        /* Whatever is left after the question stem is the exercise. */
        /* The trailing noun goes first, or "bench press form" keeps the word "form" and matches
           no exercise in the library. */
        var q = t.replace(/\s+(form|technique)$/, "")
                 .replace(/^.*?\b(?:how (?:to|do i|do you|should i) (?:do|perform|execute)|how do i|proper form for|form for|form of|technique for|technique of|teach me|show me how to|steps for)\b/, "")
                 .replace(/\b(a|an|the|correctly|properly|exercise|movement|please)\b/g, "")
                 .replace(/[?.!]/g, "").replace(/\s+/g, " ").trim();
        if (q.length < 3) return null;

        var keys = Object.keys(DB);
        var lower = q.toLowerCase();
        var base = function (k) { return k.replace(/\s*\(.*?\)\s*$/, "").toLowerCase().trim(); };

        var exact = keys.filter(function (k) { return k.toLowerCase() === lower; });
        var byBase = exact.length ? exact : keys.filter(function (k) { return base(k) === lower; });
        /* Last resort: the query is contained in the base name ("bench press" inside "Incline
           Bench Press"). Only when nothing better matched, and still only whole-name
           containment rather than word soup. */
        if (!byBase.length) byBase = keys.filter(function (k) { return base(k).indexOf(lower) === 0; });
        if (!byBase.length) return null;                   // unknown exercise: let the KB try

        /* Several variants: prefer the plainest — barbell, then bodyweight, then whatever is
           first — and say which one this is. */
        var pick = byBase.filter(function (k) { return /\(barbell\)/i.test(k); })[0]
                || byBase.filter(function (k) { return !/\(/.test(k); })[0]
                || byBase[0];
        var steps = DB[pick];
        if (!Array.isArray(steps) || !steps.length) return null;

        var lines = [pick, ""];
        steps.forEach(function (s, i) { lines.push((i + 1) + ". " + s); });
        if (byBase.length > 1) {
          var others = byBase.filter(function (k) { return k !== pick; }).slice(0, 3);
          lines.push("");
          lines.push("Also available: " + others.join(", ") + ".");
        }
        return { text: lines.join(BR) };
      }
    },

    /* ---- reads ---- */
    {
      name: "streak",
      needs: "getStreak",
      test: function (t) { return /\bstreak\b/.test(t); },
      run: async function (A) {
        var r = await A.run("getStreak", {});
        var d = (r && r.result) || {};
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
        var d = (r && r.result) || {};
        var s = d.score != null ? d.score : d.total;
        if (s == null) return null;
        return { text: "Your IGNYT score today is " + Math.round(s) + "." };
      }
    },
        {
      name: "protein target",
      needs: "getProteinTarget",
      /* THE CLASSIFIER CANNOT SPLIT THIS PAIR, so a matcher does.
           "how much protein SHOULD i eat"  -> the target, computed from weight and goal
           "how much protein DID i eat"     -> today's food log
         The tokeniser drops should and did as common words, so both reduce to the same tokens
         and classify() returns null on the tie -- correctly, since by then the only evidence
         that separated them is gone. Past-tense and dated forms are excluded here and left to
         the food-log read, which is what they actually mean. */
      test: function (t) {
        if (!/\bprotein\b/.test(t)) return false;
        if (/\b(did|ate|had|eaten|yesterday|today|so far)\b/.test(t)) return false;
        return /\b(should|target|need|needs|goal|require|requirement|intake|per day|a day|daily)\b/.test(t);
      },
      run: async function (A) {
        var r = await A.run("getProteinTarget", {});
        var d = (r && r.result) || {};
        if (!d.message) return null;
        return { text: d.message, card: d.card || null };
      }
    },
    {
      name: "weekly progress",
      needs: "getWeeklyProgress",
      test: function (t) {
        if (!/week|weekly/.test(t)) return false;
        if (/(plan|routine|create|make|build)/.test(t)) return false;   // planning, not reporting
        return true;
      },
      run: async function (A, t) {
        /* "last week" is one week back. Anything else is the current week. */
        var back = (" " + t + " ").indexOf(" last week ") !== -1
                || (" " + t + " ").indexOf(" previous week ") !== -1 ? 1 : 0;   // no escapes to corrupt
        var r = await A.run("getWeeklyProgress", { weeksAgo: back });
        var d = (r && r.result) || {};
        if (!d.message) return null;
        return { text: d.message, card: d.card || null };
      }
    },
    {
      name: "calorie target",
      needs: "getCalorieTarget",
      /* Same split as the protein target: "how many calories SHOULD i eat" is the target,
         "how many calories DID i eat today" is the food log. Past tense and dated forms are
         excluded and left to the read. Written with indexOf rather than word-boundary escapes,
         which have been silently corrupted into control characters four times in this file. */
      test: function (t) {
        var pad = " " + t + " ";
        if (pad.indexOf(" calorie") === -1 && pad.indexOf(" calories") === -1
            && pad.indexOf(" macros ") === -1 && pad.indexOf(" tdee ") === -1) return false;
        var past = [" did ", " ate ", " had ", " eaten ", " today ", " yesterday ", " so far ", " burned ", " burnt "];
        for (var i = 0; i < past.length; i++) if (pad.indexOf(past[i]) !== -1) return false;
        var want = [" should ", " target ", " need ", " needs ", " goal ", " intake ", " per day ", " a day ", " daily ", " maintenance ", " my macros ", " macro "];
        for (var j = 0; j < want.length; j++) if (pad.indexOf(want[j]) !== -1) return true;
        return false;
      },
      run: async function (A) {
        var r = await A.run("getCalorieTarget", {});
        var d = (r && r.result) || {};
        if (!d.message) return null;
        return { text: d.message, card: d.card || null };
      }
    },
    {
      name: "food nutrition",
      needs: "getFoodNutrition",
      /* "how many calories in oats" is a question about a FOOD, not about the user's log and not
         about their target. Three things now share the word calories:
           "how many calories did i eat today"   -> the food log      (past tense, dated)
           "how many calories should i eat"      -> their target      (should/target/goal)
           "how many calories in oats"           -> the library       (in/of + a food name)
         The separator is the preposition: "in", "of" or "per" followed by a name. Written with
         indexOf and a regex literal, never a pattern built from a string -- that is how the last
         two escapes were eaten. */
      test: function (t) {
        var pad = " " + t + " ";
        var asksNutrition = false;
        var WORDS = [" calories ", " calorie ", " protein ", " carbs ", " carbohydrates ",
                     " fat ", " fats ", " fibre ", " fiber ", " nutrition ", " macros ", " kcal "];
        for (var i = 0; i < WORDS.length; i++) if (pad.indexOf(WORDS[i]) !== -1) { asksNutrition = true; break; }
        if (!asksNutrition) return false;
        var mine = [" did i ", " i ate ", " my ", " should i ", " target ", " goal ", " today ", " yesterday "];
        for (var j = 0; j < mine.length; j++) if (pad.indexOf(mine[j]) !== -1) return false;
        return /(?:in|of|per|for)\s+(?:a|an|one|1)?\s*[a-z]/.test(t);
      },
      run: async function (A, t) {
        /* THE PREPOSITION MUST BE ITS OWN WORD. Without the boundary the alternation matched
           the "in" INSIDE "protein": "how much protein in curd" captured "in curd", which
           searched to High Protein Curd while a direct search for "curd" returned Curd. The
           search was right the whole time and the handler was feeding it two words. */
        var m = t.match(/(?:^|\s)(?:in|of|per|for)\s+(?:a\s+|an\s+|one\s+|1\s+)?([a-z][a-z\s]{1,40})$/);
        if (!m) return null;
        var food = m[1].replace(/\s+/g, " ").trim();
        if (!food || food.length < 2) return null;
        var r = await A.run("getFoodNutrition", { food: food });
        var d = (r && r.result) || {};
        if (!d.message) return null;
        return { text: d.message, card: d.card || null };
      }
    },
{
      name: "food log today",
      needs: "getFoodLog",
      /* LOG FOOD vs LOGGED FOOD — two different intents that share a word.
         "log 2 eggs" ADDS an entry. "show my logged food" READS what is already there. The
         verb is the same stem; only the tense and the surrounding words separate them, and
         with only the phrasings above listed, "show my logged food" matched neither intent and
         fell through to "I don't have a reliable answer" — for a question about the user's own
         data, which is the least excusable place to say that.

         Two signals, either of which is enough:
           - the PAST tense: logged, ate, eaten, recorded — describing what already happened
           - a VIEW verb next to a food word: show / see / view / what is in my food
         The logging intent below is guarded against the same words, so exactly one of them
         claims any given sentence. */
      run: async function (A) {
        var r = await A.run("getFoodLog", {});
        var d = (r && r.result) || {};
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
    /* THREE DIRECT ACTIONS THAT EXISTED BUT NOTHING ROUTED TO. getProgress, getWorkoutHistory
       and completeWorkout were all in the registry and all unreachable from the chatbot, so
       "show my progress" — named in the brief as a zero-AI action — was spending a Gemini
       activity to reach a function already sitting on the device. Found by running the spoken
       phrasings through the router rather than by reading the registry. */
    {
      name: "progress",
      needs: "getProgress",
      run: async function (A) {
        var r = await A.run("getProgress", {});
        return r ? { text: null, card: r } : null;
      }
    },
    {
      name: "workout history",
      needs: "getWorkoutHistory",
      test: function (t) { return /\b(workout|training)\s+history\b/.test(t) || /\bpast workouts\b/.test(t); },
      run: async function (A) {
        var r = await A.run("getWorkoutHistory", {});
        return r ? { text: null, card: r } : null;
      }
    },
    /* STARTING a session, which is a different thing from asking what it is. "what's my
       workout" reads the plan; "start my workout" opens it and begins recording. Both were
       reachable in the registry, but only the read had an intent — so the one command that
       actually begins training fell through to "I don't have a reliable answer".

       A write, so it returns pending and the user confirms: startWorkout creates a live
       session, and a mis-tapped voice command should not put someone mid-workout. */
    {
      name: "start workout",
      needs: "startWorkout",
      test: function (t) {
        return /\b(start|begin|open|lets do|do)\b/.test(t)
            && /\b(workout|session|training|todays workout|my workout)\b/.test(t)
            && !/\b(history|delete|remove|complete|finish|done|how|what)\b/.test(t);
      },
      run: function () {
        return { text: null, pending: { action: "startWorkout", args: {} } };
      }
    },
    {
      name: "complete workout",
      needs: "completeWorkout",
      /* A write, so it returns pending and the user confirms — marking a session done by
         accident is annoying to undo and this is exactly the kind of phrase a speech engine
         mishears. */
      test: function (t) {
        return /\b(mark|finish|complete|done|completed)\b/.test(t) && /\bworkout\b/.test(t);
      },
      run: function () {
        return { text: null, pending: { action: "completeWorkout", args: {} } };
      }
    },
    /* ---- weekly summary, built ONLY from what is actually logged ----
       The rule the brief states twice and that matters more than the formatting: never
       fabricate. Each section below is emitted only if its data exists, so a user who logs
       weight but not workouts gets a weight line and no mention of workouts — rather than
       "0 workouts completed", which reads as a judgement about a week they may have trained
       hard in without recording it.
       If nothing at all is logged, it says so plainly instead of rendering an empty report. */
    {
      name: "weekly summary",
      needs: "getWorkoutHistory",
      test: function (t) {
        return /\b(week|weekly|7 day|last week|this week)\b/.test(t)
            && /\b(summary|progress|performance|report|how was|how did|recap|doing)\b/.test(t);
      },
      run: async function (A) {
        var since = Date.now() - 7 * 86400000;
        var lines = [], any = false;

        /* Workouts in the last seven days. getWorkoutHistory returns newest-first with a
           date on each row, so the window is a filter rather than a separate query. */
        try {
          var wh = (await A.run("getWorkoutHistory", { limit: 30 })).result || {};
          var recent = (wh.workouts || []).filter(function (w) {
            var d = Date.parse(w.date); return isFinite(d) && d >= since;
          });
          if (recent.length) {
            any = true;
            var vol = recent.reduce(function (a, w) { return a + (w.volumeKg || 0); }, 0);
            lines.push("Workouts: " + recent.length + " in the last 7 days");
            /* Volume only when it was actually recorded — a bodyweight week legitimately has
               none, and printing "0 kg" would look like a failure rather than a choice. */
            if (vol > 0) lines.push("Total volume: " + Math.round(vol).toLocaleString() + " kg");
          }
        } catch (e) {}

        try {
          var pr = (await A.run("getProgress", { days: 7 })).result || {};
          var rows = pr.entries || [];
          if (rows.length >= 2) {
            any = true;
            var latest = rows[0].weightKg, oldest = rows[rows.length - 1].weightKg;
            var delta = Math.round((latest - oldest) * 10) / 10;
            lines.push("Weight: " + oldest + " kg to " + latest + " kg (" +
                       (delta > 0 ? "+" : "") + delta + " kg)");
          } else if (rows.length === 1) {
            any = true;
            lines.push("Weight: " + rows[0].weightKg + " kg (one entry — log again to see a trend)");
          }
        } catch (e) {}

        try {
          var st = (await A.run("getStreak", {})).result || {};
          var cur = st.current != null ? st.current : st.streak;
          if (cur != null && cur > 0) { any = true; lines.push("Streak: " + cur + " days"); }
        } catch (e) {}

        if (!any) {
          return { text: "I don't have enough logged data for a weekly summary yet. " +
                         "Log a workout or your weight and it'll start filling in." };
        }
        return { text: "Your last 7 days" + BR + BR + lines.join(BR) };
      }
    },
    {
      name: "today workout",
      needs: "getTodayWorkout",
      run: async function (A) {
        var r = await A.run("getTodayWorkout", {});
        var d = (r && r.result) || {};

        /* THREE SHAPES, and the old code only understood one. getTodayWorkout returns
           { inProgress:true, title, exercises } for a LIVE session, but
           { inProgress:false, planned:{ day, session, exercises } } for a planned day — and
           it read d.title, which exists only in the live case. So "what's my workout" declined
           whenever a plan existed and no session was running, which is the ordinary state of
           the app most of the day. Fourth bug of this exact shape in this codebase: a caller
           guessing at a return contract rather than reading it. */
        if (d.inProgress) {
          var live = (d.exercises || []).length;
          return { text: "You're mid-session: " + (d.title || "today's workout") +
                         (live ? " — " + live + " exercises." : ".") };
        }

        var p = d.planned;
        if (!p) return { text: "Nothing is planned for today. It's a rest day unless you start one." };

        var name = p.session || p.day;
        if (!name) return null;                       // shape still unfamiliar: decline, do not invent
        var ex = (p.exercises || []);
        var lines = ["Today: " + name + (ex.length ? " — " + ex.length + " exercises" : "")];
        /* Naming the first few is the difference between an answer and a label. Capped, because
           a twelve-item list in a chat bubble is a wall rather than information. */
        if (ex.length) lines.push(ex.slice(0, 5).join(", ") + (ex.length > 5 ? ", and more" : ""));
        return { text: lines.join(BR) };
      }
    },

    /* ---- writes: these return a pending action, so the chat screen shows the same
           confirmation card the AI path produces. Nothing is written on a pattern match
           alone. ---- */
    /* ASK FOR THE WEIGHT rather than guessing it. "Log my weight" is a complete instruction
       with a missing value; the old behaviour was to match no intent at all and answer "I
       don't have a reliable answer for that", which is both wrong and slightly insulting for
       a command the app fully understands.
       Ordered BEFORE "log weight" so the no-number case is claimed here; that intent still
       handles "weight 82" in one shot, which stays a single message and should. */
    {
      name: "ask weight",
      needs: "logWeight",
      test: function (t) {
        if (firstNumber(t) !== null) return false;              // has a value: not our case
        if (!/\b(log|record|update|save|add|enter)\b/.test(t)) return false;
        if (!/\b(weigh|weight)\b/.test(t)) return false;
        return !/\b(chart|graph|history|progress|goal|target|trend)\b/.test(t);
      },
      run: function () {
        _awaiting = {
          name: "log weight",
          at: Date.now(),
          /* Given the next message, is it a weight? Reuses the same parsing and the same
             plausibility gate as the one-shot path, so "85", "85 kg" and "172 lbs" all behave
             identically whether typed together or across two messages. */
          fill: function (t2) {
            var n = firstNumber(t2);
            if (n == null) return null;
            /* A reply that is mostly words with a number in it is a new sentence, not an
               answer — "I did 3 sets of bench" should not be logged as 3 kg. */
            if (t2.split(/\s+/).length > 4) return null;
            var kg = parseWeight(n, t2);
            if (kg < 20 || kg > 400) return null;
            return { pending: { action: "logWeight", args: { weightKg: kg } } };
          }
        };
        return { text: say("ask_weight") };
      }
    },
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
        return { text: null, pending: { action: "logWeight", args: { weightKg: kg } } };
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
    /* DELETE THE LAST FOOD ENTRY. deleteFoodLog needs a specific entryId, so "delete the last
       food" has to be resolved to one here — the action deliberately will not guess, and a
       delete that picks the wrong row is not recoverable by the user.

       Returns a pending action rather than deleting, so the existing confirmation card stands
       between the sentence and the data. That matters most for exactly this phrasing: "delete
       the last food" is what a misheard voice command produces. */
    /* ---- routines. Ordered before the pronoun guard so a named routine is not mistaken for
       an ambiguous one, and before the food/weight deletes so "delete my push day" is not
       read as a food scope. ---- */
    /* CREATE A ROUTINE. createWorkout needs a name and at least one exercise and will not
       invent either, so "create a routine" and "create a chest workout" have to ask — and
       asking is the point: both previously fell through to the generic no-answer line, which
       the brief names as unacceptable for a command the app plainly supports.
       The name is taken from the sentence when there is one ("chest workout" -> "Chest"), so
       the follow-up only has to supply what is genuinely missing. */
    {
      name: "create routine",
      needs: "createWorkout",
      test: function (t) {
        return /\b(create|make|build|add|new)\b/.test(t)
            && /\b(routine|program|workout|split|day)\b/.test(t)
            && !/\b(to my|to the|from|delete|remove|start|show|whats|what is)\b/.test(t);
      },
      run: function (A, t) {
        var m = t.match(/\b(?:create|make|build|new)\s+(?:a\s+|an\s+|my\s+)?(.+?)\s*(?:routine|program|workout|split|day)\b/);
        var raw = m && m[1] ? m[1].trim() : "";
        /* "a" and "me" are leftovers from the phrasing, not names. */
        if (/^(a|an|me|my|new|the)?$/.test(raw)) raw = "";
        var name = raw ? raw.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + " Day" : null;

        _awaiting = {
          name: "create routine",
          at: Date.now(),
          fill: function (t2) {
            /* A question is a change of subject, not a list of exercises. */
            if (/^(what|how|why|when|which|who|is|are|can|should)\b/.test(t2)) return null;
            var list = t2.split(/,| and /).map(function (x) {
              return x.replace(/\b(and|with|plus)\b/g, "").replace(/\s+/g, " ").trim();
            }).filter(function (x) { return x.length > 2 && x.length < 40; });
            if (!list.length) return null;
            return { pending: { action: "createWorkout",
                               args: { name: name || "New Routine", exercises: list } } };
          }
        };
        return { text: name
          ? "Which exercises should \"" + name + "\" include?"
          : "What should I call it, and which exercises should it include?" };
      }
    },
    {
      name: "add exercise to routine",
      needs: "addExerciseToRoutine",
      test: function (t) { return /\b(add|put)\b/.test(t) && /\bto (my |the )?[a-z]/.test(t) && !/\b(foods?|meals?|weight|steps?)\b/.test(t); },
      run: function (A, t) {
        var m = t.match(/\b(?:add|put)\s+(.+?)\s+to\s+(?:my\s+|the\s+)?(.+?)$/);
        if (!m) return null;
        var ex = m[1].trim(), rt = m[2].replace(/\b(routine|workout|day)\b\s*$/, "").trim() || m[2].trim();
        if (!ex || !rt) return null;
        return { text: null, pending: { action: "addExerciseToRoutine", args: { exercise: ex, routine: rt } } };
      }
    },
    {
      name: "remove exercise from routine",
      needs: "removeExerciseFromRoutine",
      test: function (t) { return /\b(remove|delete|take)\b/.test(t) && /\bfrom (my |the )?[a-z]/.test(t) && !/\b(foods?|meals?|weight)\b/.test(t); },
      run: function (A, t) {
        var m = t.match(/\b(?:remove|delete|take)\s+(.+?)\s+from\s+(?:my\s+|the\s+)?(.+?)$/);
        if (!m) return null;
        var ex = m[1].trim(), rt = m[2].replace(/\b(routine|workout|day)\b\s*$/, "").trim() || m[2].trim();
        if (!ex || !rt) return null;
        return { text: null, pending: { action: "removeExerciseFromRoutine", args: { exercise: ex, routine: rt } } };
      }
    },
    {
      name: "delete routine",
      needs: "deleteRoutine",
      test: function (t) {
        return /\b(delete|remove)\b/.test(t) && /\b(routine|program)\b/.test(t) && !/\bfrom\b/.test(t);
      },
      run: function (A, t) {
        var m = t.match(/\b(?:delete|remove)\s+(?:my\s+|the\s+)?(.+?)\s*(?:routine|program)\b/);
        var rt = m && m[1] ? m[1].trim() : null;
        /* No name means no target. Deleting "a routine" is not a request that can be honoured
           safely when the user has several. */
        if (!rt) return { text: "Which routine should I delete?" };
        return { text: null, pending: { action: "deleteRoutine", args: { routine: rt } } };
      }
    },
    /* A BARE PRONOUN NAMES NOTHING. "delete it", "change it", "delete that" — the verb is
       clear and the object is not, and this must be first in the whole delete family because
       everything below it is happy to assume the object is food. "delete that" was reaching
       the single-entry food delete and offering to remove a real row on the strength of the
       word "that".

       Asking is the only safe reading. The alternative is deleting the wrong thing on a
       coin toss, and a deletion is not something a user can undo by rephrasing. */
    {
      name: "ambiguous target",
      test: function (t) {
        return /^(please\s+)?(delete|remove|clear|change|update|edit|add|log|start)\s+(it|that|this|them|these|those|mine)$/.test(t);
      },
      run: function (A, t) {
        var destructive = /^(please\s+)?(delete|remove|clear)/.test(t);
        return { text: destructive
          ? "What should I delete — a food entry, today's food log, or a weight entry?"
          : "What would you like me to do that to — your food log, your weight, or your workout?" };
      }
    },
    /* Weight deletion, before the food delete family so "delete today's weight" is not caught
       by a food scope that also matches "today". */
    {
      name: "delete weight",
      needs: "deleteWeightEntry",
      test: function (t) {
        return /\b(delete|remove|undo|clear)\b/.test(t)
            && /\b(weight|weigh in|weighin)\b/.test(t)
            && !/\b(foods?|meals?|workout|history|all|everything)\b/.test(t);
      },
      run: function () {
        return { text: null, pending: { action: "deleteWeightEntry", args: {} } };
      }
    },
    /* Reading the weight trend. getProgress already returns the entries and the change, so
       this is a formatting job rather than a new query — and it declines when there is nothing
       to show instead of drawing an empty trend. */
    {
      name: "weight history",
      needs: "getProgress",
      run: async function (A) {
        var r = await A.run("getProgress", { days: 30 });
        var d = (r && r.result) || {};
        var rows = d.entries || [];
        if (!rows.length) {
          return { text: "You haven't logged a weight yet. Tell me one, like \"weight 82\"." };
        }
        if (rows.length === 1) {
          return { text: "One entry so far: " + rows[0].weightKg + " kg on " + rows[0].date +
                         ". Log another and I can show the trend." };
        }
        var latest = rows[0], oldest = rows[rows.length - 1];
        var delta = Math.round((latest.weightKg - oldest.weightKg) * 10) / 10;
        return { text: "Weight over the last " + (d.days || 30) + " days" + BR + BR +
                       oldest.weightKg + " kg (" + oldest.date + ")" + BR +
                       latest.weightKg + " kg (" + latest.date + ")" + BR +
                       "Change: " + (delta > 0 ? "+" : "") + delta + " kg across " +
                       rows.length + " entries" };
      }
    },
    /* SCOPED DELETION, ORDERED MOST SPECIFIC FIRST. The four scopes share almost all their
       vocabulary — "delete chicken from today's food" contains the words that mean today, all
       and food — so the only thing keeping them apart is that the narrowest test runs first.
       Reordering this list changes what gets deleted, which is worth saying out loud. */
    {
      name: "delete all food",
      needs: "deleteAllFoodLogs",
      test: function (t) {
        /* "logged" and "logs" as well as "log" — "delete everything I logged today" names no
           food at all, and requiring the bare noun sent it to UNKNOWN. The past tense is the
           food reference in that sentence. */
        if (!/\b(delete|remove|clear|wipe|erase)\b/.test(t)) return false;
        if (!/\b(foods?|meals?|log|logs|logged|diet|nutrition|ate|eaten)\b/.test(t)) return false;
        /* "wipe my food log" and "erase my meals" carry no quantifier at all, and requiring one
           left them unrecognised. Those two verbs are wholesale by meaning — nobody wipes a
           single entry — so the verb supplies the scope that "all" would otherwise have. */
        return /\b(all|every|everything|entire|whole)\b/.test(t) || /\b(wipe|erase)\b/.test(t);
      },
      run: function () {
        return { text: null, pending: { action: "deleteAllFoodLogs", args: {} } };
      }
    },
    {
      name: "delete food by name",
      needs: "deleteFoodByName",
      test: function (t) {
        if (!/\b(delete|remove)\b/.test(t)) return false;
        if (/\b(all|every|everything)\b/.test(t)) return false;   // that is the wider scope above
        /* A named food is the words between the verb and any "from/in ..." tail. Requires an
           actual name, so "delete my food" falls through to the day scope rather than trying
           to match a food called "my". */
        return /\b(delete|remove)\s+(the\s+|my\s+)?[a-z][a-z\s]{1,28}?(\s+(from|in|out of)\b|\s+i\s+logged\b)/.test(t);
      },
      run: function (A, t) {
        var m = t.match(/\b(?:delete|remove)\s+(?:the\s+|my\s+)?([a-z][a-z\s]{1,28}?)(?:\s+(?:from|in|out of)\b|\s+i\s+logged\b)/);
        if (!m) return null;
        var food = m[1].replace(/\s+/g, " ").trim();
        /* Words that are scopes, not foods. Without this, "delete food from today" would try
           to delete a food literally called "food". */
        if (/^(foods?|meals?|entry|log|item|thing)s?$/.test(food)) return null;
        return { text: null, pending: { action: "deleteFoodByName", args: { food: food } } };
      }
    },
    {
      name: "delete todays food",
      needs: "deleteFoodForDate",
      test: function (t) {
        return /\b(delete|remove|clear|wipe)\b/.test(t)
            && /\b(today|todays|this day)\b/.test(t)
            && /\b(foods?|meals?|meals|log|diet|nutrition)\b/.test(t)
            && !/\b(all|every|everything)\b/.test(t);
      },
      run: function () {
        return { text: null, pending: { action: "deleteFoodForDate", args: {} } };
      }
    },
    {
      name: "delete food",
      needs: "deleteFoodLog",
      test: function (t) {
        if (!/\b(delete|remove|undo|clear)\b/.test(t)) return false;
        /* Never this handler's business, whatever else the sentence says. */
        if (/\b(weight|weigh|workout|routine|exercise|steps?|history|all|everything)\b/.test(t)) return false;
        if (/\b(foods?|meals?|entry|log|last|that)\b/.test(t)) return true;
        if (/\b(breakfast|lunch|dinner|snacks?)\b/.test(t)) return true;
        /* A NAMED FOOD IS ALSO A DELETE REQUEST. "delete the chicken" carries none of the words
           above, so it never reached here and came back as no answer at all -- while
           deleteFoodByName sat in the registry, written and tested, with nothing routing to it.
           Anything after the verb and an article is a candidate name; run() refuses if it is not
           actually in the log, so a stray noun cannot delete anything. */
        return /^(?:delete|remove|undo|clear)\s+(?:the\s+|my\s+|a\s+|an\s+)?[a-z][a-z\s]{1,40}$/.test(t);
      },
      run: async function (A, t) {
        /* A NAMED DAY SCOPES THE DELETE TO THAT DAY. Without this the handler fell straight
           through to "newest entry of today", so "delete yesterday's food" confirmed a deletion
           of a record the user had not mentioned -- today's most recent -- while appearing to do
           what was asked. The confirmation gate was the only thing standing between that and
           real data loss, and a prompt naming the wrong food is not much of a gate. */
        /* MEAL FIRST, THEN DAY. "delete yesterday's breakfast" carries both scopes, and the day
           branch below would have taken the whole of yesterday -- far more than was asked. The
           meal branch reads that same day offset, so both are honoured together. */
        var mealWord = t.match(/\b(breakfast|lunch|dinner|snacks?)\b/);
        if (mealWord) {
          var mName = mealWord[1].replace(/^snacks?$/, "snack");
          mName = mName.charAt(0).toUpperCase() + mName.slice(1);
          var mOff = dayOffsetFrom(t);
          var mDate = localDayString(mOff == null ? 0 : mOff);
          var mLog = await A.run("getFoodLog", { date: mDate });
          var mItems = ((mLog && mLog.result) || {}).items || [];
          var inMeal = mItems.filter(function (x) {
            return String(x.meal || "").toLowerCase() === mName.toLowerCase();
          });
          if (!inMeal.length) {
            return { text: "There's nothing logged for " + mName.toLowerCase() + " on " + mDate + "." };
          }
          return { text: null, pending: { action: "deleteFoodForMeal", args: { meal: mName, date: mDate } } };
        }

        var off = dayOffsetFrom(t);
        if (off != null) {
          var ds = localDayString(off);
          var day = await A.run("getFoodLog", { date: ds });
          var dayItems = ((day && day.result) || {}).items || [];
          if (!dayItems.length) {
            return { text: off === 0 ? "There's nothing in today's food log to delete."
                                     : "There's nothing logged on " + ds + " to delete." };
          }
          return { text: null, pending: { action: "deleteFoodForDate", args: { date: ds } } };
        }

        var r = await A.run("getFoodLog", {});
        var d = (r && r.result) || {};
        var items = d.entries || d.items || d.foods;
        if (!Array.isArray(items) || !items.length) {
          return { text: "There's nothing in today's food log to delete." };
        }

        /* BY NAME, AND ONLY IF IT IS REALLY THERE. Matched against what is actually logged today
           before anything is confirmed: "delete the chicken" with no chicken logged says so,
           rather than confirming a deletion that removes nothing, or falling through to "newest
           entry" and taking a food the user never named. */
        var named = t.match(/^(?:delete|remove|undo|clear)\s+(?:the\s+|my\s+|a\s+|an\s+)?([a-z][a-z\s]{1,40})$/);
        if (named) {
          var want = named[1].replace(/\s+/g, " ").trim().toLowerCase();
          var RESERVED = ["food", "foods", "meal", "meals", "entry", "log", "last", "that", "it", "this"];
          /* Every word reserved means no food was named. "the last food" captured as "last food"
             is not a food called that -- it is the existing "newest entry" request wearing two
             words, and matching it by name told the user their last food was missing. */
          var words = want.split(" ").filter(function (w) { return w.length; });
          var allReserved = words.length > 0 && words.every(function (w) { return RESERVED.indexOf(w) !== -1; });
          if (!allReserved) {
            var hit = items.filter(function (x) {
              var nm = String(x.name || "").toLowerCase();
              return nm === want || nm.indexOf(want) !== -1;
            });
            if (!hit.length) return { text: "I can't see " + want + " in today's food log." };
            return { text: null, pending: { action: "deleteFoodByName", args: { food: want } } };
          }
        }
        /* Newest first, which is how addFoodLog unshifts them. "The last food" means the one
           most recently added, not the last chronologically in the day. */
        var row = items[0];
        var id = row.id != null ? row.id : row.entryId;
        if (id == null) return null;          // shape not as expected: decline rather than guess
        return { text: null, pending: { action: "deleteFoodLog", args: { entryId: id } } };
      }
    },
    {
      name: "log food",
      needs: "addFoodLog",
      test: function (t) {
        /* No digit is required. "add a banana" is a perfectly ordinary thing to say and the
           earlier version demanded a number, so it was handed to Gemini — which food logging
           must never reach. Quantity defaults to one below. */
        /* A QUESTION IS NOT A COMMAND TO LOG. "how many calories did i eat today" contains
           "eat" and was matching here, so a question about the food log was answered by
           WRITING to it -- creating an entry the user never asked for. Traced: the food-log
           read classifies correctly at 1.00, but declines when nothing is logged yet, and
           this pattern was the next thing willing to take the message.
           Interrogative openers only. "log 2 eggs", "i ate chicken" and "add a banana" are
           untouched; they are statements. A question about food is for the read handler or
           the knowledge base, and if neither can answer, saying so is correct -- inventing
           a food entry is not. */
        if (QUESTION_OPENER.test(t)) return false;
        /* A BARE LIST IS A LOG REQUEST WITHOUT THE VERB. "chicken and chapati" -- which is what
           the microphone produces when someone answers a question or just names what they ate --
           carried no log or ate, so it never reached this handler and came back as no answer.
           Only plain words joined by and or a comma qualify, and run() still refuses unless every
           segment is a food the library actually holds, so a sentence about anything else falls
           through untouched. */
        if (/\b(weight|weigh|steps?|workout|water|streak|score|progress|delete|remove|sets?|reps?)\b/.test(t)) return false;
        /* A bare list of plain words: "chicken and chapati". */
        if (/^[a-z][a-z ,]*(?:\band\b|,)[a-z ,]*[a-z]$/.test(t)) return true;
        /* THE SAME LIST WITH QUANTITIES, WHICH IS THE COMMONER SHAPE. "3 eggs, 2 slices of bread
           and a banana" is the answer to "what did you eat?", and the plain-words pattern above
           excludes it for containing digits. It still needs a separator and at least two real
           words, so a bare number -- the answer to "what weight should I log?" -- cannot reach
           here, and run() refuses anyway unless the segments parse as foods. */
        if (/[0-9]/.test(t)
            && /(?:\band\b|,)/.test(t)
            && /^[a-z0-9][a-z0-9 ,.]*[a-z]$/.test(t)
            && (t.match(/\b[a-z]{3,}\b/g) || []).length >= 2) {
          return true;
        }
        return /\b(log|ate|eat|had|add|drank|drink|drinking|having|consumed|finished)\b/.test(t)
            && !/\b(weight|weigh|steps?|workout|water|streak|score|progress)\b/.test(t);
      },
      run: async function (A, t) {
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

        /* THE DAY, STRIPPED THE SAME WAY THE MEAL IS. addFoodLog has always accepted a date and
           dateKey() has always allowed backdating -- nothing here ever extracted one, so "log 2
           eggs yesterday" left "yesterday" glued to the food name, matched nothing in the
           library, and stored NOTHING while reporting no problem. Measured: every dated phrasing
           failed, every meal phrasing passed.
           Stripped before the food is read, for the same reason the meal is: whatever is left
           has to be the food and the quantity and nothing else. */
        /* A BARE MEAL WORD COUNTS TOO. The prepositional form above wants "for lunch"; a spoken
           sentence arrives as "today lunch chicken and chapati", so the meal stayed in the text
           and the first segment became "today lunch chicken", which matches no food. Stripped
           only when no meal was found already, so "for lunch" still wins. */
        if (!meal) {
          var bare = t.match(/\b(breakfast|lunch|dinner|snacks?)\b/);
          if (bare) {
            meal = bare[1].replace(/^snacks?$/, "snack");
            meal = meal.charAt(0).toUpperCase() + meal.slice(1);
            t = t.replace(bare[0], "").replace(/\s+/g, " ").trim();
          }
        }

        var dayOffset = null;
        var DAY_WORDS = [
          ["day before yesterday", 2],
          ["yesterday", 1],
          ["last night", 1],
          ["today", 0],
          ["this morning", 0],
          ["tonight", 0]
        ];
        for (var dw = 0; dw < DAY_WORDS.length; dw++) {
          var phrase = DAY_WORDS[dw][0];
          var pad = " " + t + " ";
          var at = pad.indexOf(" " + phrase + " ");
          if (at === -1) continue;
          dayOffset = DAY_WORDS[dw][1];
          t = (pad.slice(0, at) + " " + pad.slice(at + phrase.length + 2)).replace(/\s+/g, " ").trim();
          /* "on" and "from" are left dangling by the removal: "log 2 eggs on yesterday". */
          t = t.replace(/\s+(on|from)\s*$/, "").replace(/\s+/g, " ").trim();
          break;
        }

        /* SEVERAL FOODS, CHECKED FIRST. This has to run before the parse rather than on the
           parsed food name: "log 200g chicken and 100g rice" fails the strict pattern
           outright — [a-z\s] cannot cover "100g" — so the guard placed after it never ran and
           the whole thing fell through to Gemini, which food logging must never reach.

           Logging only the first item would silently drop the rest of someone's meal, and
           splitting on "and" reliably enough to trust ("rice and dal" is two, "chicken and
           mushroom soup" is one) is not something a regex can do. So it asks. Local, honest,
           and zero AI activities. */
        /* The pronoun goes too. "i ate 2 eggs and a banana" left "i ate 2 eggs" as the first
           segment, which does not begin with a quantity, so the list looked unquantified and
           the whole thing was refused. */
        var rest = t.replace(/^\s*(?:i|ive|i have)\s+/, "")
                    .replace(/^\s*(log|ate|eat|had|add|drank|drink|drinking|having|consumed|finished)\b/, "")
                    .replace(/^\s*(just)\b/, "").trim();
        if (/\b(and|plus)\b|,/.test(rest)) {
          /* SPLIT ONLY WHEN IT IS UNAMBIGUOUS. The refusal that stood here was right about the
             hard case: "rice and dal" is two foods, "chicken and mushroom soup" is one, and the
             words alone do not separate them. A quantity does. When EVERY segment carries its own
             number or article the sentence is a list, and splitting is safe; otherwise it still
             asks, exactly as before.
             One pending for the whole list, not one per item -- the handler parses, the action
             layer writes. Mixing the two is what broke the first attempt at this. */
          var segs = rest.split(/\s*,\s*|\s+and\s+|\s+plus\s+/)
                         .map(function (x) { return x.trim(); })
                         .filter(function (x) { return x.length; });
          var listed = segs.length > 1 && segs.every(hasQuantitySignal);
          var parsed = listed ? segs.map(parseFoodPhrase) : [];

          /* NO QUANTITIES IS STILL A LIST. "chicken and chapati" is two foods and one serving
             each, and refusing it because neither carries a number was the wrong call -- that is
             how people speak. When every segment is a food the library actually holds, treat it
             as a list at one serving apiece.
             THE HONEST LIMIT: this cannot separate "chicken and mushroom soup" from "chicken and
             chapati". Both "chicken" and "mushroom soup" are real foods, so no test on the
             segments tells the two sentences apart, and the whole phrase is in the library in
             neither case. The soup will be logged as two items. That is the wrong answer to a
             rare phrasing, traded for the right answer to a common one, and the reply names
             exactly what went in so it can be seen and undone. */
          if (!listed && segs.length > 1 && segs.length <= 6) {
            var known = [];
            for (var qi = 0; qi < segs.length; qi++) {
              var nm = segs[qi].replace(/^(?:a|an|some|the)\s+/, "").replace(/\s+/g, " ").trim();
              if (!nm || !/^[a-z][a-z ]{1,40}$/.test(nm)) { known = []; break; }
              var look = await A.run("searchFood", { query: nm });
              var rows = ((look && look.result) || {}).results || ((look && look.result) || {}).foods || [];
              /* SEARCH THE SINGULAR TOO. "rotis" returns only Plain Chapati and never Roti, which
                 the library does hold -- the index does not fold that plural, so the word has to
                 be asked for both ways. Cheap, and it is the difference between logging what was
                 said and refusing it. */
              var singularQ = nm.replace(/ies$/, "y").replace(/([^s])s$/, "$1");
              if (singularQ !== nm) {
                var look2 = await A.run("searchFood", { query: singularQ });
                var rows2 = ((look2 && look2.result) || {}).results || ((look2 && look2.result) || {}).foods || [];
                rows = rows.concat(rows2);
              }
              /* PLURALS COUNT AS THE FOOD. The search already resolves them -- "eggs" returns
                 Egg (Whole), "idlis" returns Idli -- but this test demanded the stored name equal
                 the spoken word, so "breakfast eggs and bread" refused on a food the library
                 plainly has. An exact match still wins; failing that, the singular form matching
                 the start of the stored name is accepted, which takes Egg (Whole) for "eggs"
                 without taking Banana Bun for "banana". A word the library does not begin an
                 entry with still fails, so "chest and back" is refused as before. */
              var singular = nm.replace(/ies$/, "y").replace(/(ses|xes|ches|shes)$/, function (m0) {
                return m0.slice(0, -2);
              }).replace(/([^s])s$/, "$1");
              var exact = rows.filter(function (x) {
                var n0 = String(x.name || "").toLowerCase();
                if (n0 === nm.toLowerCase() || n0 === singular) return true;
                return n0.indexOf(singular + " ") === 0 || n0.indexOf(singular + " (") === 0;
              });
              if (!exact.length) { known = []; break; }
              known.push({ food: nm, quantity: 1 });
            }
            if (known.length > 1) {
              /* ASK, DO NOT ASSUME. "chicken and banana" names two foods and no amounts, and
                 logging them at one default serving each put 174 g of chicken breast and a 118 g
                 banana into the log without the user ever saying a number. Defaults are fine when
                 someone says "a banana"; they are a guess when someone says "chicken".
                 The slot is held open, and the answer is parsed by the same quantified-list path
                 the guided flow uses -- so "200g chicken and 1 banana" completes it in one reply. */
              var askFor = known.map(function (a) { return a.food; });
              var slotMeal2 = meal || null;
              _awaiting = {
                name: "log food",
                at: Date.now(),
                fill: function (t2) {
                  if (/^(what|how|why|when|where|which|who|is|are|can|should|do|does|tell|show|explain)\b/.test(t2)) return null;
                  var segs3 = String(t2).split(/\s*,\s*|\s+and\s+|\s+plus\s+/)
                                .map(function (x) { return x.trim(); })
                                .filter(function (x) { return x.length; });
                  if (!segs3.length) return null;
                  var parsed3 = segs3.map(parseFoodPhrase);
                  if (parsed3.some(function (x) { return !x; })) return null;
                  var items3 = parsed3.map(function (it) {
                    var a4 = { food: it.food };
                    if (it.unit && /^(g|grams?|ml|kg|oz)$/.test(it.unit)) {
                      a4.grams = it.unit === "kg" ? it.qty * 1000 : it.qty;
                    } else { a4.quantity = it.qty; }
                    if (slotMeal2) a4.meal = slotMeal2;
                    return a4;
                  });
                  return { pending: { action: "addFoodLogBatch", args: { items: items3 } } };
                }
              };
              return { text: "How much of each? For example “200g " + askFor[0] + " and 1 " +
                             askFor[askFor.length - 1] + "”." };
            }
          }

          if (!listed || parsed.some(function (x) { return !x; })) {
            return { text: say("one_food") };
          }
          var items = parsed.map(function (it) {
            var a = { food: it.food };
            if (it.unit && /^(g|grams?|ml|kg|oz)$/.test(it.unit)) {
              a.grams = it.unit === "kg" ? it.qty * 1000 : it.qty;
            } else {
              a.quantity = it.qty;
            }
            if (meal) a.meal = meal;
            return a;
          });
          return { text: null, pending: { action: "addFoodLogBatch", args: { items: items } } };
        }

        /* "<n><unit> <food>", "<n> <food>", and a bare "a banana" with no number at all. */
        var m = t.match(/(?:log|ate|eat|had|add|drank|drink|drinking|having|consumed|finished)\s+(?:a\s+|an\s+)?(\d+(?:\.\d+)?)\s*(g|grams?|ml|kg|oz|cups?|bowls?|pieces?|slices?)?\s+(?:of\s+)?([a-z][a-z\s]{1,40})$/);
        if (!m) {
          var m2 = t.match(/(?:log|ate|eat|had|add|drank|drink|drinking|having|consumed|finished)\s+(?:a|an|some)?\s*([a-z][a-z\s]{1,40})$/);
          /* Fall through rather than giving up: the reverse word order below has not been
             tried yet, and "log paneer 100g" fails the bare-food match precisely because it
             ends in a quantity. */
          m = m2 ? [null, "1", null, m2[1]] : null;
        }
        /* THE OTHER WORD ORDER. "log 200g chicken" parsed and "log paneer 100g" did not, though
           it is at least as natural -- people say the food first when the food is what they
           thought of first. Same units, same capture, reversed. Tried only after the
           quantity-first form so nothing that already worked changes route. */
        if (!m) {
          /* A REGEX LITERAL, NOT A STRING. Built as a string first, where every \\s became a
             bare "s" -- JavaScript drops unknown escapes in string literals silently, so the
             pattern compiled from nonsense and matched nothing. Second time today an escape
             has been eaten between here and the editor. */
          var mRev = t.match(/(?:log|ate|eat|had|add|drank|drink|drinking|having|consumed|finished)\s+(?:a\s+|an\s+|some\s+)?([a-z][a-z\s]{1,40}?)\s+(\d+(?:\.\d+)?)\s*(g|grams?|ml|kg|oz|cups?|bowls?|pieces?|slices?|tbsp|tsp)?$/);
          if (mRev) m = [null, mRev[2], mRev[3] || null, mRev[1]];
        }
        if (!m) return unparsedFood(t);
        var qty = parseFloat(m[1]);
        var unit = m[2] || null;
        var food = m[3].replace(/\s+/g, " ").trim();
        if (!food || !isFinite(qty) || qty <= 0) return unparsedFood(t);

        /* "LOG FOOD" NAMES NO FOOD. It is a request to start logging, and the Quick Action
           button sends exactly that string — so this was creating an entry for a food called
           "food", searching the library for it, and reporting it missing. The user asked to
           log something and was told their something does not exist.
           Ask instead, and hold the slot open for the answer, which is the same mechanism
           "log my weight" already uses. */
        /* A MEAL NAME WITH NO FOOD IS THE SAME REQUEST. "log my breakfast" named no food, so it
           searched the library for "breakfast" and reported it missing -- the failure "log food"
           used to have. It now opens the slot and remembers WHICH meal, so the answer lands on
           breakfast without the user saying it twice. */
        var mealOnly = food.match(/^(?:my |the |a |an |some )?(breakfast|lunch|dinner|snacks?)$/);
        if (mealOnly) {
          meal = mealOnly[1].replace(/^snacks?$/, "snack");
          meal = meal.charAt(0).toUpperCase() + meal.slice(1);
        }
        if (mealOnly || /^(my |the |a |an |some )?(foods?|foods|meals?|meals|something|thing|it|this|that|entry|item)$/.test(food)) {
          var slotMeal = meal || null;   // remembered, so the meal is not asked twice
          _awaiting = {
            name: "log food",
            at: Date.now(),
            fill: function (t2) {
              /* FAIL OPEN. A reply that is not a food must release the slot, not be logged as
                 one. Without this, answering "what is progressive overload" after "log food"
                 created a food entry named "progressive overload" — the slot swallowed a
                 change of subject and wrote nonsense into the food log, which is worse than
                 any wrong answer because it silently corrupts real data.
                 A question word or a long phrase is a new message; a food is short and is not
                 phrased as a question. The weight slot has the same guard for the same reason. */
              if (/^(what|how|why|when|where|which|who|is|are|can|should|do|does|tell|show|explain)\b/.test(t2)) return null;

              /* THE ANSWER TO "WHAT DID YOU EAT?" IS USUALLY A LIST, AND IT ARRIVES WITH NO VERB.
                 "3 eggs, 2 slices of bread and a banana" is nine words and the length guard below --
                 which exists to stop a change of subject being logged as food -- would reject it. A
                 list where every item carries its own quantity is not a change of subject, so it is
                 tried first and the guard applies only to what is left. Same split rule as the direct
                 path, reusing the same two helpers rather than a second copy that drifts. */
              var segs2 = String(t2).split(/\s*,\s*|\s+and\s+|\s+plus\s+/)
                            .map(function (x) { return x.trim(); })
                            .filter(function (x) { return x.length; });
              if (segs2.length > 1 && segs2.every(hasQuantitySignal)) {
                var parsed2 = segs2.map(parseFoodPhrase);
                if (!parsed2.some(function (x) { return !x; })) {
                  var items2 = parsed2.map(function (it) {
                    var a3 = { food: it.food };
                    if (it.unit && /^(g|grams?|ml|kg|oz)$/.test(it.unit)) {
                      a3.grams = it.unit === "kg" ? it.qty * 1000 : it.qty;
                    } else { a3.quantity = it.qty; }
                    if (slotMeal) a3.meal = slotMeal;
                    return a3;
                  });
                  return { pending: { action: "addFoodLogBatch", args: { items: items2 } } };
                }
              }
              if (t2.split(/\s+/).length > 5) return null;

              /* Re-parse the reply as though it had been said with the verb attached, so
                 "200g chicken breast" behaves exactly like "log 200g chicken breast" — one
                 parser, not a second one that drifts. */
              var m2 = ("log " + t2).match(/log\s+(?:a\s+|an\s+)?(\d+(?:\.\d+)?)\s*(g|grams?|ml|kg|oz|cups?|bowls?|pieces?|slices?)?\s+(?:of\s+)?([a-z][a-z\s]{1,40})$/)
                    || ("log " + t2).match(/log\s+(?:a|an|some)?\s*([a-z][a-z\s]{1,40})$/);
              if (!m2) return null;
              var hasQty = /^\d/.test(m2[1] || "");
              var q2 = hasQty ? parseFloat(m2[1]) : 1;
              var u2 = hasQty ? (m2[2] || null) : null;
              var f2 = (hasQty ? m2[3] : m2[1]).replace(/\s+/g, " ").trim();
              if (!f2 || /^(foods?|meals?|it|this|that)s?$/.test(f2)) return null;
              var a2 = { food: f2, quantity: q2 };
              if (u2) {
                a2.unit = u2.replace(/s$/, "").replace(/^gram$/, "g");
                if (/^(g|kg|ml|oz)$/.test(a2.unit)) a2.grams = a2.unit === "kg" ? q2 * 1000 : q2;
              }
              return { pending: { action: "addFoodLog", args: a2 } };
            }
          };
          return { text: slotMeal ? "What did you eat for " + slotMeal.toLowerCase() + "?" : "What would you like to log?" };
        }

        /* QUANTITY IS A COUNT, NOT A MASS. addFoodLog validates it in the range 0.1-100 —
           "2 eggs", "3 rotis" — and a weight in grams goes in `grams`. Sending both meant
           "log 200g chicken" arrived as quantity:200, which fails that check and threw
           "Quantity must be between 0.1 and 100"; the food never reached the library and the
           user saw an error for a perfectly ordinary command.
           So the two are now exclusive: a gram/ml/kg amount sets grams alone, and quantity is
           reserved for the countable case it was built for. */
        var args = { food: food };
        /* `food`, NOT `name`. actions.js reads args.food; passing `name` sent it undefined and
           every chatbot food log failed before it ever reached the library. It failed quietly,
           because the not-found path looks identical to a food genuinely missing. */
        if (unit) args.unit = unit.replace(/s$/, "").replace(/^gram$/, "g");
        if (/^(g|kg|ml|oz)$/.test(args.unit || "")) {
          args.grams = args.unit === "kg" ? qty * 1000 : qty;   // a mass: grams only
        } else {
          args.quantity = qty;                                  // a count: "2 eggs", "3 rotis"
        }
        if (meal) args.meal = meal;
        if (dayOffset != null && dayOffset > 0) {
          var back = new Date();
          back.setDate(back.getDate() - dayOffset);
          args.date = new Date(back.getTime() - back.getTimezoneOffset() * 60000)
                        .toISOString().slice(0, 10);   // local day, matching dayKey()
        }
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
  /* Run whichever handler a classified intent maps to. The classifier decides WHICH intent;
     the handler that intent already has decides what to do — so a classified message and a
     pattern-matched one execute identical code, and there is no second implementation of any
     action to drift. */
  /* The handlers that report the user's own records. Named once, used by both places that
     have to let the knowledge base outrank them. */
  var RECORD_READS = { "food log today": 1, "progress": 1, "weight history": 1, "today workout": 1 };

  /* Openers that make a sentence a question rather than an instruction. Anchored at the
     start: "add what i ate" is still a command, while "what did i eat" is not. */
  /* Words that pin a question to the user's own records rather than to fitness in general. */
  var SCOPE_WORDS = ["today", "todays", "yesterday", "this week", "last week", "this month", "so far"];
  /* POSSESSIVE PLUS A RECORD NOUN IS ALSO ABOUT THE USER, with no date needed. "how is MY
     PROGRESS" asks what the app has stored, not what progressive overload means -- but the
     knowledge base holds "How should I progress rows?" and, once the corpus grew to 6,685
     entries, that entry's score rose past the threshold on the shifted IDF weights and stood the
     read down. The content did not change and neither did the question; adding entries elsewhere
     moved the arithmetic under both. Which is the standing hazard of a bigger corpus, and the
     reason the probe runs after every batch. */
  var SCOPE_PHRASES = ["my progress", "my weight", "my food", "my workout", "my log", "my calories",
                       "my steps", "my routine", "my stats", "my macros"];
  function recordScoped(t) {
    var pad = " " + String(t || "") + " ";
    for (var i = 0; i < SCOPE_WORDS.length; i++) {
      if (pad.indexOf(" " + SCOPE_WORDS[i] + " ") !== -1) return true;
    }
    for (var j = 0; j < SCOPE_PHRASES.length; j++) {
      if (pad.indexOf(" " + SCOPE_PHRASES[j] + " ") !== -1) return true;
    }
    return false;
  }

  /* Widened after "should i eat back the calories i burn exercising" reached LOG FOOD and
     tried to write. The first list covered questions that ASK ABOUT the log -- how many,
     what did i -- and missed the ones that ask for ADVICE about eating, which contain the
     same verbs. "should i eat", "can i eat", "is it ok to eat", "why do i eat" are all
     questions, and none of them is an instruction to log anything. */
  var QUESTION_OPENER = /^(how many|how much|how do|how often|what|whats|which|when|where|why|did i|do i|does|have i|am i|is my|is it|are my|can i|should i|could i|would i|will i|show|tell me)\b/;

  /* A FOOD COMMAND THAT WILL NOT PARSE MUST SAY SO, NOT VANISH.
     Both failure paths in the log-food handler used to return null, which handed the message
     back to the ladder; with nothing else willing to take it, the user got "I don't have a
     reliable answer for that yet". Measured on fifteen ordinary phrasings, four failed this way
     -- "log paneer 100g", "log oats 50g", "add peanut butter 2 tbsp", "i drank a protein shake"
     -- and every one of them looked identical to the assistant simply not understanding the
     words. A parser bug that disguises itself as a comprehension failure is why those four sat
     there unnoticed.

     IT ONLY CLAIMS THE MESSAGE WHEN A QUANTITY IS PRESENT. "add a new routine" and "add an
     exercise" carry the same verb and no number, and they belong to other handlers; taking them
     here would trade four silent food bugs for a louder routine one. With a digit or a unit in
     the sentence, a food verb is about food. */
  var FOOD_UNITS = ["g", "gram", "grams", "kg", "ml", "l", "oz", "cup", "cups", "bowl", "bowls", "tbsp", "tsp", "spoon", "spoons", "slice", "slices", "piece", "pieces", "plate", "plates"];
  function unparsedFood(t) {
    var hasNumber = /[0-9]/.test(t);
    var pad = " " + t + " ", hasUnit = false;
    for (var u = 0; u < FOOD_UNITS.length; u++) {
      if (pad.indexOf(" " + FOOD_UNITS[u] + " ") !== -1) { hasUnit = true; break; }
    }
    if (!hasNumber && !hasUnit) return null;
    return { text: "I couldn't work out what to log from that. Try it as \"log 100g paneer\" — the food and how much." };
  }

  /* One phrase, one food -- both word orders and a bare "a banana". Used by the multi-item path.
     The single-item parser below still has its own copy; migrating it to this is a separate
     change with the fifteen-phrase probe as the gate, and not worth risking in the same commit. */
  function parseFoodPhrase(seg) {
    seg = String(seg || "").replace(/^(?:of|a|an|some)\s+/, "").replace(/\s+/g, " ").trim();
    if (!seg) return null;
    var m = seg.match(/^(\d+(?:\.\d+)?)\s*(g|grams?|ml|kg|oz|cups?|bowls?|pieces?|slices?|tbsp|tsp)?\s+(?:of\s+)?([a-z][a-z\s]{1,40})$/);
    if (m) return { qty: parseFloat(m[1]), unit: m[2] || null, food: m[3].trim() };
    m = seg.match(/^([a-z][a-z\s]{1,40}?)\s+(\d+(?:\.\d+)?)\s*(g|grams?|ml|kg|oz|cups?|bowls?|pieces?|slices?|tbsp|tsp)?$/);
    if (m) return { qty: parseFloat(m[2]), unit: m[3] || null, food: m[1].trim() };
    if (/^[a-z][a-z ]{1,40}$/.test(seg)) return { qty: 1, unit: null, food: seg };
    return null;
  }

  /* Does the segment carry its own quantity? That is what makes a split safe. */
  function hasQuantitySignal(seg) {
    return /^\s*(?:\d|a\s|an\s|some\s|half\s)/.test(String(seg || ""));
  }

  /* WHICH DAY DID THEY MEAN? Shared, because the logging path already answers this question and
     the delete path answered it not at all -- "delete yesterday's food" deleted TODAY'S newest
     entry, having never looked for a date. A word list rather than a regex, for the same reason
     as everywhere else in this file. */
  var DAY_OFFSETS = [
    ["day before yesterday", 2],
    /* THE POSSESSIVE IS THE FORM PEOPLE USE WHEN DELETING. "delete yesterday's food" normalises
       to "yesterdays" with the apostrophe stripped, so a list holding only "yesterday" missed it
       and the delete fell through to today's newest entry -- the exact bug this helper was added
       to fix, still live after the fix, because the fix matched the wrong word. Longest forms
       first, so "yesterdays" is not shadowed by a shorter match. */
    ["yesterdays", 1],
    ["yesterday", 1],
    ["last night", 1],
    ["todays", 0],
    ["today", 0],
    ["tonight", 0],
    ["this morning", 0]
  ];
  function dayOffsetFrom(t) {
    var pad = " " + String(t || "") + " ";
    for (var i = 0; i < DAY_OFFSETS.length; i++) {
      if (pad.indexOf(" " + DAY_OFFSETS[i][0] + " ") !== -1) return DAY_OFFSETS[i][1];
    }
    return null;
  }
  function localDayString(offset) {
    var d = new Date();
    d.setDate(d.getDate() - (offset || 0));
    /* Local day, matching dayKey() in app.js. A UTC slice here would put an evening log on the
       wrong date, which is the bug fixed in 66c7b68. */
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  var HANDLER = {
    DELETE_TODAY_FOOD: "delete todays food",
    LOG_FOOD: "log food",
    VIEW_FOOD_LOG: "food log today",
    GET_PROTEIN_TARGET: "protein target",
    GET_WEEKLY_PROGRESS: "weekly progress",
    GET_CALORIE_TARGET: "calorie target",
    LOG_WEIGHT: "ask weight",
    VIEW_WEIGHT_HISTORY: "weight history",
    VIEW_TODAY_WORKOUT: "today workout",
    START_WORKOUT: "start workout",
    VIEW_PROGRESS: "progress",
    CREATE_ROUTINE: "create routine",
    EXERCISE_HOW_TO: "exercise how to",
    COMPLETE_WORKOUT: "complete workout",
    DELETE_WEIGHT: "delete weight"
  };
  async function runClassified(A, t, guess) {
    var wanted = HANDLER[guess.intent];
    if (!wanted) { trace("rc-exit", "no handler mapped for " + guess.intent); return null; }
    /* ONE PLACE, NOT THREE. The knowledge-base-outranks-records rule was added at the promoted
       call site and then at the pattern loop, and the hijacks survived both because these
       messages arrive by the third route -- the late classifier fallback. Putting it here covers
       every path that can reach a records handler through the classifier, which is all of them.
       "is soya good for muscle" scored VIEW_TODAY_WORKOUT and answered with today's workout;
       "how much protein should i eat" scored VIEW_FOOD_LOG and answered with the food log. Both
       have real answers in the base. A read of the user's records only wins when the base has
       nothing, which is exactly the case for "did i log anything today". */
    /* The same dated-question rule as the promoted call site -- and the copy that was missed,
       which is the whole reason this took eight attempts. This guard sits INSIDE runClassified
       and consults the knowledge base itself, so adding corpus entries changed the outcome of a
       loop the corpus cannot reach: with the batch applied "how many calories did i eat today"
       returned null here, silently, before the handler was ever looked up. It was the only exit
       in this function with no trace on it, so the message appeared to fall out of the loop. */
    if (RECORD_READS[wanted] && window.IgnytKnowledge && !recordScoped(t)) {
      var kbWins = null;
      try { kbWins = await IgnytKnowledge.ask(t); } catch (e) { kbWins = null; }
      if (kbWins && kbWins.answer) { trace("rc-exit", "base outranked the read: " + kbWins.question); return null; }
    }
    for (var k = 0; k < INTENTS.length; k++) {
      if (INTENTS[k].name !== wanted) continue;
      if (INTENTS[k].needs && !has(A, INTENTS[k].needs)) { trace("rc-exit", "needs unavailable: " + INTENTS[k].needs); return null; }
      /* THE SAME QUESTION GUARD THE PATTERN LOOP HAS, AND THIS IS THE COPY THAT MATTERED.
         Guarding only the patterns left the classifier route wide open: "should i delete my food
         log" reached DELETE_TODAY_FOOD and DELETED THE LOG, and "how do i start a workout"
         started one. Asking whether you should do a thing is not asking for it to be done, and
         for a destructive verb that distinction is the whole ballgame.
         Found by the batch-7 probe, one batch after the same bug was fixed in the pattern loop
         alone -- the third time in this file that a rule has existed in one place and not its
         twin. Reads still answer normally. */
      if (QUESTION_OPENER.test(t) && INTENTS[k].needs && window.IgnytAIActions
          && IgnytAIActions.risk(INTENTS[k].needs) !== "read") {
        trace("rc-exit", "question, not a command: " + INTENTS[k].name);
        return null;
      }
      var out = null;
      try { out = await INTENTS[k].run(A, t); } catch (e) { trace("rc-exit", "handler threw: " + (e && e.message)); return null; }
      /* A handler that declines on closer inspection still declines: the classifier is
         confident about the sentence, not about whether the data supports an answer. */
      if (!out) { trace("rc-exit", "handler declined (returned nothing)"); return null; }
      out.source = "BUILT_IN_INTENT:" + guess.intent;
      out.confidence = guess.confidence;
      return out;
    }
    return null;
  }

  /* ROUTE TRACE. Off unless hx_trace is set. Five fixes for one message were reasoned out
     against a guess at which ladder stage it reached, and all five were wrong, so the stages
     now say so themselves. */
  var _trace = [];
  /* A RING OF RECENT TRACES, not just the last one. lastTrace() is useless during a test run:
     the suite sends dozens of messages after the one being investigated, so by the time the run
     ends its trace is long gone. Three wrong diagnoses came from tracing the message in
     isolation instead, where the app state is not the state the test had -- an empty food log
     against a seeded one, which routes differently and answers differently.
     Keyed by the normalised message, capped, and only recorded when hx_trace is set. */
  var _traceRing = [];
  var TRACE_RING_MAX = 60;
  function trace(stage, detail) {
    try { if (localStorage.getItem("hx_trace")) _trace.push(stage + (detail ? ": " + detail : "")); } catch (e) {}
  }
  function traceCommit(message) {
    try { if (!localStorage.getItem("hx_trace") || !_trace.length) return; } catch (e) { return; }
    _traceRing.push({ message: String(message), stages: _trace.slice(), at: Date.now() });
    if (_traceRing.length > TRACE_RING_MAX) _traceRing.shift();
  }

  async function tryAnswer(message) {
    _trace = [];
    /* Before norm(), which converts the words to English and erases the evidence. */
    _lang = (window.IgnytLang && IgnytLang.languageFor) ? IgnytLang.languageFor(message) : "en";
    var t = norm(message);
    if (!t) return null;

    var A = window.IgnytAIActions;

    /* ---------- the follow-up slot -------------------------------------------------------
       If the assistant just asked a question, this message is probably the answer to it.
       "85" means nothing on its own; after "What weight should I log?" it means 85 kg.

       Checked BEFORE the intent table, because that is the whole point — "85" matches no
       intent and would otherwise fall through to the knowledge base and come back as "I don't
       have a reliable answer for that", which is a terrible reply to a question we just asked.

       IT FAILS OPEN, NOT CLOSED. If the reply does not parse as the value we wanted, the slot
       is cleared and the message continues to normal routing — because a user who answers
       "actually, what is progressive overload?" has changed the subject, and swallowing that
       to insist on a number would trap them in a prompt they cannot leave. */
    if (_awaiting) {
      if (Date.now() - _awaiting.at > AWAIT_TTL_MS) {
        _awaiting = null;                       // stale: they moved on minutes ago
      } else {
        var slot = _awaiting;
        var filled = null;
        try { filled = slot.fill(t, message); } catch (e) { filled = null; }
        if (filled) {
          _awaiting = null;
          return { text: filled.text || null, pending: filled.pending,
                   source: "BUILT_IN_ACTION:" + slot.name + " (follow-up)" };
        }
        /* Not an answer to the question. Drop the slot and treat this as a fresh message. */
        _awaiting = null;
      }
    }
    /* PROMOTION, ONE INTENT AT A TIME. The classifier leads for the intents named here and
       nowhere else; everything absent stays with the patterns.

       Promoting all ten at once was tried and reverted — 43 tests went to 31, and one failure
       was disqualifying: "delete it" stopped asking which record was meant, because a
       classifier will confidently claim a bare pronoun that names nothing while a pattern
       requiring an object refuses. For destructive verbs that refusal is the feature.

       VIEW_FOOD_LOG goes first because the patterns demonstrably get it wrong: "did i log
       anything today" is a question ABOUT the food log, and the table answers it by trying to
       WRITE to one, on the strength of the word "log". It is also the safest possible first
       move — the intent only reads.

       The bar is 0.8. Below that a pattern that matches is the better bet, because it is
       certain about a sentence it was written for while the classifier is choosing between
       neighbours. Add the next intent to this list, run the suite, and keep it only if the
       count holds. */
    var PROMOTED = { GET_PROTEIN_TARGET: 1, GET_CALORIE_TARGET: 1, GET_WEEKLY_PROGRESS: 1, VIEW_FOOD_LOG: 1, VIEW_PROGRESS: 1, VIEW_WEIGHT_HISTORY: 1, VIEW_TODAY_WORKOUT: 1 };
    if (window.IgnytIntents) {
      var lead = null;
      try { lead = IgnytIntents.classify(t); } catch (e) { lead = null; }
      /* THE KNOWLEDGE BASE OUTRANKS A PROMOTED INTENT. Promoting the read intents put the
         classifier above the knowledge base in this ladder, and general questions started being
         answered with the user's own data: "how much protein should i eat" opened the food log,
         "is soya good for muscle" showed today's workout, "why am i not losing weight" showed
         the weight history. All scored over 0.8, because a question about food really does look
         like a request to see food.
         The intents are about the user's records; the knowledge base is about fitness. When the
         knowledge base has a confident answer the message was a QUESTION, so it wins. Reads that
         genuinely address the records -- "did i log anything today" -- are not in the knowledge
         base at all, so they are untouched. */
      /* NOT FOR A QUESTION ABOUT THE USER'S OWN DATA. "how many calories did i eat today" is
         answered by the food log; "how much protein should i eat" by the knowledge base. The time
         word is what separates them. Without this, batch 1 of the corpus made the base confident
         on the dated question too, the guard stood the read down, and a question about today was
         answered with a general calorie target. Word list, not a regex -- a word-boundary escape
         written here as a literal control character silently disabled this guard once already. */
      /* A DATED QUESTION IS ABOUT THE USER, AND THE BASE CANNOT KNOW IT. Traced in-suite with
         the corpus batch applied: the base answered "How many calories should I eat?" and that
         dropped the lead for a read of TODAY'S log. Two different questions; the time word is
         the whole difference, so it decides which one wins.
         Word list rather than a regex: a word-boundary escape written here as a literal control
         character silently disabled this guard once already, and node --check did not care. */
      /* ONLY A RECORDS READ YIELDS TO THE BASE. This guard applied to EVERY promoted intent,
         which was wrong the moment intents began computing answers from the user's own data:
         "how was my week" was dropped here because the base holds "Should I take a week off
         training?", and the reply became general advice instead of the user's actual week.
         The distinction is what the intent DOES. A records read can sensibly stand down when the
         base has a better general answer. An intent that computes from the user's weight, goal or
         training history has no general equivalent -- the base cannot know those numbers, so
         there is nothing for it to outrank. */
      if (lead && PROMOTED[lead.intent] && lead.confidence >= 0.8 && window.IgnytKnowledge
          && RECORD_READS[HANDLER[lead.intent]] && !recordScoped(t)) {
        var kb = null;
        try { kb = await IgnytKnowledge.ask(t); } catch (e) { kb = null; }
        trace("kb-guard", kb && kb.answer ? "base answered, lead dropped: " + kb.question : "base had nothing, lead kept");
        if (kb && kb.answer) lead = null;
      }
      trace("classify", lead ? lead.intent + " " + lead.confidence.toFixed(2) : "null");
      if (lead && PROMOTED[lead.intent] && lead.confidence >= 0.8) {
        trace("promoted-enter", lead.intent);
        var led = await runClassified(A, t, lead);
        trace("promoted-result", led ? led.source : "null (fell through)");
        if (led) return led;
      } else {
        trace("promoted-skip", lead ? "not promoted or under 0.8" : "no lead");
      }
    }

    for (var i = 0; i < INTENTS.length; i++) {
      var it = INTENTS[i];
      if (it.needs && !has(A, it.needs)) continue;   // action unavailable; not our problem to fake
      /* NO MATCHER MEANS RETIRED, NOT BROKEN. An entry with a run() and no test() is one
         the classifier now owns: it stays here because runClassified dispatches by calling
         this very run(), so deleting the entry would delete the handler the classifier
         depends on and drop the intent on the floor. Skipping it explicitly beats letting
         it.test throw into the catch below -- that worked, but as control flow by accident. */
      if (typeof it.test !== "function") continue;
      /* A QUESTION NEVER TRIGGERS A WRITE -- ANY WRITE, not just food logging. The interrogative
         guard started life inside the LOG FOOD test, which protected exactly one pattern: "why do
         my joints ache after training" then matched START WORKOUT and began a session. Same
         mistake, different verb, found by the batch-7 probe.
         Risk comes from the action registry. Only an action that actually writes is blocked --
         LOG FOOD declares addFoodLog, START WORKOUT declares startWorkout. An entry declaring no
         action cannot write anything, so it is left alone: blocking those broke "how do i do
         bench press", which is a question whose whole job is to answer. */
      if (QUESTION_OPENER.test(t) && it.needs && window.IgnytAIActions
          && IgnytAIActions.risk(it.needs) !== "read") continue;
      var matched = false;
      try { matched = it.test(t); } catch (e) { matched = false; }
      if (!matched) continue;

      var out;
      try {
        out = await it.run(A, t);
      } catch (e) {
        /* A local handler that throws must not take the turn down with it, and must not take
           the REST OF THE LADDER down either. */
        continue;
      }
      /* A HANDLER DECLINING IS NOT THE MESSAGE BEING UNANSWERABLE. This was `return null`, which
         ended tryAnswer outright -- so a matched pattern whose handler then declined skipped the
         classifier and the knowledge base and went straight to the generic no-answer reply.

         That is why "how much protein should i eat" returned nothing while the knowledge base
         held that exact question at a score of 1.000. The food-log pattern matched on "eat",
         its handler declined because nothing was logged, and the answer sitting one step further
         down was never reached. Every question shaped like a command about food, weight or
         training was losing its answer this way.

         Declining means THIS handler has nothing; the next one, or the knowledge base, still
         might. */
      if (!out) continue;

      /* THE SAME RULE THE PROMOTED PATH ALREADY HAS, APPLIED HERE TOO. A read handler that
         succeeds is not proof the message was a request for records: "is soya good for muscle"
         matched the workout read and returned today's workout, "what should i eat before a
         workout" returned the food log. Those handlers do not decline -- they have data -- so
         the continue above never fires and the answer below is never reached.
         Records handlers answer questions ABOUT THE USER; the knowledge base answers questions
         about fitness. When the base has a confident answer, the message was the second kind.
         Reads that genuinely address records -- "did i log anything today" -- are not in the
         base at all, so they still win here. */
      if (RECORD_READS[it.name] && window.IgnytKnowledge) {
        var kbFirst = null;
        try { kbFirst = await IgnytKnowledge.ask(t); } catch (e) { kbFirst = null; }
        if (kbFirst && kbFirst.answer) continue;
      }

      out.source = "BUILT_IN_ACTION:" + it.name;
      trace("pattern-match", it.name + " (needs=" + (it.needs || "none") + ")");
      return out;
    }

    /* NO PATTERN MATCHED — ask the classifier before the knowledge base.

       This is the second half of the intent engine. The table above is fast and exact for the
       phrasings it already covers, and the suite proves it does; this catches everything else,
       by similarity to how people actually say things rather than by a pattern the sentence has
       to satisfy. "wipe my food log" and "get rid of everything I ate today" are the same
       request as "delete today's food" and share almost no words with it.

       It runs BELOW the table on purpose. A classifier is a probability and a pattern is a
       certainty, so anything already proven stays exact — and every regex retired later has to
       leave the test count unchanged, which is the only honest way to hand coverage over.

       The classifier decides WHICH intent; the handler that intent already has decides what to
       do. There is no second implementation of any action, so a classified message and a
       matched one execute the identical code. */
    if (window.IgnytIntents) {
      var guess = null;
      try { guess = IgnytIntents.classify(t); } catch (e) { guess = null; }
      if (guess) {
        var late = await runClassified(A, t, guess);
        if (late) return late;
      }
    }

    /* NO ACTION MATCHED — try the knowledge base before giving up on this message.
       Order matters and is not arbitrary: actions first because "log 200g chicken" is a
       command, not a question, and the knowledge base would happily score it against a
       nutrition entry. Only once nothing wants to DO something is it worth asking what the
       question means. */
    if (window.IgnytKnowledge) {
      var kb = null;
      /* THE NORMALISED TEXT, NOT THE RAW MESSAGE. This was passing `message`, so everything
         norm() had just done was thrown away at the door: the language canonicalisation that
         turns "என் எடை" into "weight", and the rephrase strip that removes "actually I said".
         "actually I said what is progressive overload" therefore reached the base with the
         preamble still attached and failed to match a question it contains verbatim, while
         the intent table above — which does use the normalised text — would have matched.
         One argument, and it silently halved the value of two features. */
      try { kb = await window.IgnytKnowledge.ask(t); } catch (e) { kb = null; }

      if (kb && kb.safety) {
        /* A pain or medical question. The base has no vetted answer for these, so it declines
           and so do we — returning null sends the FULL original text to Gemini, which is
           equipped to handle it under its own safety instructions. Answering here from a
           fitness entry is the exact failure the safety guard exists to prevent. */
        return null;
      }
      if (kb && kb.answer) {
        trace("knowledge", kb.question || "answered");
        return { text: kb.answer, source: kb.source, confidence: kb.confidence };
      }
    }

    return null;
  }

  /* Wrapped so every return path files its trace -- there are eight of them and remembering to
     call traceCommit at each is exactly the kind of thing that gets missed at the ninth. */
  async function tracedTryAnswer(message) {
    var out = await tryAnswer(message);
    traceCommit(message);
    return out;
  }

  window.IgnytLocalChat = Object.freeze({
    tryAnswer: tracedTryAnswer,
    lastTrace: function () { return _trace.slice(); },
    /* The trace for a message sent earlier in the session -- substring match, most recent first. */
    traceFor: function (needle) {
      var n = String(needle).toLowerCase();
      for (var i = _traceRing.length - 1; i >= 0; i--) {
        if (_traceRing[i].message.toLowerCase().indexOf(n) !== -1) return _traceRing[i];
      }
      return null;
    },
    traceRing: function () { return _traceRing.slice(); },
    /* The intent -> handler map, exposed read-only so the test suite can assert that a
       message reached the RIGHT HANDLER without caring which route carried it there.
       Promoting an intent changes the reported label from the handler name to
       BUILT_IN_INTENT:NAME while running the identical function; a test pinned to the
       label alone fails on a change that altered no behaviour, which is how a suite
       teaches people to ignore it. Reading the real map means this cannot drift. */
    handlerFor: function (intent) { return HANDLER[intent] || null; },
    /* Whether a question is currently open, and dropping it. The chat screen clears the slot
       when the transcript is cleared — an answer to a question that is no longer on screen is
       not an answer to anything. */
    awaiting: function () { return _awaiting ? _awaiting.name : null; },
    /* The language of the last message handled. processChatMessage reports it. */
    lastLanguage: function () { return _lang; },
    clearAwaiting: function () { _awaiting = null; },
    /* Exposed for tests: which intent claims this sentence, without running it. */
    match: function (message) {
      var t = norm(message);
      var A = window.IgnytAIActions;
      for (var i = 0; i < INTENTS.length; i++) {
        if (INTENTS[i].needs && !has(A, INTENTS[i].needs)) continue;
        if (typeof INTENTS[i].test !== "function") continue;   // retired; classifier owns it
        try { if (INTENTS[i].test(t)) return INTENTS[i].name; } catch (e) {}
      }
      return null;
    },
    normalise: norm
  });
}());
