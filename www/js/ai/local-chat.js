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
      .replace(/[^\w\s.+-]/g, " ")
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
      [/\block(?=\s+(my\s+|the\s+|a\s+|an\s+)?(food|weight|workout|meal|steps?|water))/g, "log"],
      [/\block(?=\s+\d)/g, "log"],
      [/\blocked(?=\s+(food|weight|workout|meal))/g, "logged"],
      [/\blog\s+in(?=\s+(food|weight|my))/g, "log"],
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
      test: function (t) {
        /* FIRST, BEFORE THE LITERAL PHRASES. "clear my food log today" contains "my food log"
           verbatim, so an early return on that list handed a delete command to the reader —
           and the guard below never ran. A veto has to be the first thing tested, or the
           shortcut above it decides the case. */
        if (/\b(delete|remove|clear|wipe|erase|undo)\b/.test(t)) return false;
        if (/\b(what did i eat|what have i eaten|my food log|calories today|how many calories|food today)\b/.test(t)) return true;
        /* A QUANTITY MEANS IT IS A LOG, NOT A VIEW. "I ate 2 eggs" shares its past tense with
           "what did I eat" and would otherwise be claimed here — and this intent is ordered
           first, so it would win and silently stop food logging working. Nobody views their
           food log by naming an amount; they name an amount to record one. The calorie
           questions are the exception, since "how many calories today" is a genuine read. */
        if (/\d/.test(t) && !/\b(how many calories|calories today|how much protein)\b/.test(t)) return false;
        var past = /\b(logged|recorded|eaten|ate)\b/.test(t);
        var view = /\b(show|see|view|list|display|whats|what is|check)\b/.test(t);
        var food = /\b(food|meal|meals|eat|eaten|ate|calories|macros|nutrition)\b/.test(t);
        return food && (past || view);
      },
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
      test: function (t) {
        return /\b(show|whats|see|view|my)\b/.test(t) && /\bprogress\b/.test(t)
            && !/\b(workout|history)\b/.test(t);
      },
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
    {
      name: "add exercise to routine",
      needs: "addExerciseToRoutine",
      test: function (t) { return /\b(add|put)\b/.test(t) && /\bto (my |the )?[a-z]/.test(t) && !/\b(food|meal|weight|steps?)\b/.test(t); },
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
      test: function (t) { return /\b(remove|delete|take)\b/.test(t) && /\bfrom (my |the )?[a-z]/.test(t) && !/\b(food|meal|weight)\b/.test(t); },
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
            && !/\b(food|meal|workout|history|all|everything)\b/.test(t);
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
      test: function (t) {
        if (/\b(delete|remove|log|record|update)\b/.test(t)) return false;   // those are writes
        return /\b(weight)\b/.test(t)
            && /\b(history|trend|progress|chart|graph|last week|last month|over time|changed?|losing|lost|gained?)\b/.test(t);
      },
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
        return /\b(delete|remove|clear|wipe|erase)\b/.test(t)
            && /\b(all|every|everything|entire|whole)\b/.test(t)
            && /\b(food|meal|meals|log|logs|logged|diet|nutrition|ate|eaten)\b/.test(t);
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
        if (/^(food|meal|entry|log|item|thing)s?$/.test(food)) return null;
        return { text: null, pending: { action: "deleteFoodByName", args: { food: food } } };
      }
    },
    {
      name: "delete todays food",
      needs: "deleteFoodForDate",
      test: function (t) {
        return /\b(delete|remove|clear|wipe)\b/.test(t)
            && /\b(today|todays|this day)\b/.test(t)
            && /\b(food|meal|meals|log|diet|nutrition)\b/.test(t)
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
        return /\b(delete|remove|undo|clear)\b/.test(t)
            && /\b(food|meal|entry|log|last|that)\b/.test(t)
            && !/\b(weight|workout|steps?|history|all|everything)\b/.test(t);
      },
      run: async function (A) {
        var r = await A.run("getFoodLog", {});
        var d = (r && r.result) || {};
        var items = d.entries || d.items || d.foods;
        if (!Array.isArray(items) || !items.length) {
          return { text: "There's nothing in today's food log to delete." };
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
          return { text: say("one_food") };
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

        /* "LOG FOOD" NAMES NO FOOD. It is a request to start logging, and the Quick Action
           button sends exactly that string — so this was creating an entry for a food called
           "food", searching the library for it, and reporting it missing. The user asked to
           log something and was told their something does not exist.
           Ask instead, and hold the slot open for the answer, which is the same mechanism
           "log my weight" already uses. */
        if (/^(my |the |a |an |some )?(food|foods|meal|meals|something|thing|it|this|that|entry|item)$/.test(food)) {
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
              if (!f2 || /^(food|meal|it|this|that)s?$/.test(f2)) return null;
              var a2 = { food: f2, quantity: q2 };
              if (u2) {
                a2.unit = u2.replace(/s$/, "").replace(/^gram$/, "g");
                if (/^(g|kg|ml|oz)$/.test(a2.unit)) a2.grams = a2.unit === "kg" ? q2 * 1000 : q2;
              }
              return { pending: { action: "addFoodLog", args: a2 } };
            }
          };
          return { text: "What would you like to log?" };
        }

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
      out.source = "BUILT_IN_ACTION:" + it.name;
      return out;
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
        return { text: kb.answer, source: kb.source, confidence: kb.confidence };
      }
    }

    return null;
  }

  window.IgnytLocalChat = Object.freeze({
    tryAnswer: tryAnswer,
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
        try { if (INTENTS[i].test(t)) return INTENTS[i].name; } catch (e) {}
      }
      return null;
    },
    normalise: norm
  });
}());
