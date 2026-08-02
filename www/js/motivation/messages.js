/* =========================================================
   MOTIVATION — the words IGNYT says.

   One library, many contexts, no repeats. Every encouraging line in the app comes from here
   so the tone is consistent and so "don't say the same thing twice" is solvable in one place
   rather than per screen.

   HOW NO-REPEAT WORKS
   Each context keeps a list of recently-shown indices in localStorage and draws only from
   what is left. When a context is exhausted it starts again — which is the honest ceiling:
   with a finite library, "never repeat" eventually means "repeat in the same order", and
   shuffling on exhaustion is better than pretending otherwise.

   The daily line is seeded by the date instead, so it is stable if the app is opened five
   times in a day and different tomorrow. A user who sees a new quote every time they tap Home
   learns the quotes are noise.

   TWO RULES ABOUT CONTENT

   No unverifiable comparisons. "You're in the top 1% of users" is a claim about a population
   this app has never measured. That kind of line is flattering, checkable, and false, and one
   user who does the arithmetic stops trusting everything else here. Nothing below compares
   the user to anyone but themselves.

   No medical claims. Encouragement can say a habit is worth keeping; it cannot promise an
   outcome, diagnose anything, or tell someone what their body will do. IGNYT is not a medical
   device and the privacy policy says so.
========================================================= */

window.IgnytMessages = (function () {
  "use strict";

  var SEEN_KEY = "hx_msg_seen";

  var LIBRARY = {

    /* ---- the daily card -------------------------------------------------------------- */
    daily: [
      "Today is another chance to get stronger than yesterday.",
      "Progress is built one session at a time.",
      "Don't wait for motivation. Build the habit.",
      "You're competing with yesterday's version of you. Nobody else.",
      "Small habits, repeated, become big results.",
      "Every good meal is an investment in the version of you that's coming.",
      "The work you do today, you'll feel next month.",
      "Discipline is choosing what you want most over what you want now.",
      "You don't have to be fast. You have to keep going.",
      "The hardest part of any session is putting your shoes on.",
      "Consistency isn't glamorous. It's just what works.",
      "A short workout beats the perfect one you skipped.",
      "You've already done the hard part: you showed up.",
      "Strength is built in the sets nobody watches.",
      "Rest is part of the plan, not a break from it.",
      "You're allowed to start again as many times as you need.",
      "Nothing changes overnight. Everything changes over months.",
      "Your body adapts to what you ask of it. Keep asking.",
      "Track it and it gets real. Real things are easier to change.",
      "Some days you push. Some days you maintain. Both count.",
      "The goal isn't to be perfect. It's to be consistent enough.",
      "Momentum is easier to keep than to build. Keep it.",
      "You're not behind. You're on your own timeline.",
      "One session won't transform you. A hundred will.",
      "Show up on the days you don't feel like it. Those are the ones that count.",
      "You can't undo last week. You can decide about today.",
      "Sleep, food, training. In that order of neglect-at-your-peril.",
      "Trust the boring work. It compounds.",
      "The version of you in six months is watching what you do now.",
      "Effort you can repeat beats effort you can't.",
      "Progress isn't linear. Keep the average moving.",
      "You logged it. That's more than most intentions ever get.",
      "Being tired is not the same as being finished.",
      "The plan only works if you're still doing it in March.",
      "Fitness is a long conversation with your body. Keep talking.",
      "Strong is a direction, not a destination.",
      "Every rep is a vote for who you're becoming.",
      "You don't need a perfect week. You need a decent one, repeatedly.",
      "Start where you are. Use what you have.",
      "The best program is the one you'll actually finish."
    ],

    /* ---- after finishing a workout ----------------------------------------------------- */
    workoutDone: [
      "Session logged. That's the part most people skip.",
      "Done. Recovery is where the adaptation actually happens — eat and sleep well tonight.",
      "That's another one in the bank.",
      "Good work. Your next session starts with tonight's sleep.",
      "Logged. The trend is what matters, and you just moved it.",
      "That's the work. Nothing flashy, just done.",
      "Nice. Consistency like this is what changes a body.",
      "Finished. Give the muscles you trained a day or two before you hit them again.",
      "Another session behind you. It adds up faster than it feels.",
      "Well done. Hydrate and get some protein in over the next few hours.",
      "That counts. Every one of them counts.",
      "In the log. Future you will be glad this one is there.",
      "Session complete. Momentum kept.",
      "That's the habit holding. Keep it."
    ],

    /* ---- coming back after a gap -------------------------------------------------------
       Never scolding. Someone opening the app after a break has already done the hard part. */
    comeback: [
      "Welcome back. Nobody trains every week of their life — what matters is that you're here.",
      "Good to see you. Start light today; the strength comes back quicker than you'd think.",
      "Back in. Don't try to make up for lost sessions in one go — just get one done.",
      "Everyone misses stretches. The comeback is the only part that matters.",
      "A gap isn't a failure. It's a gap. Today closes it.",
      "You're here. That's the whole first step.",
      "Restarting is a skill, and you're using it.",
      "No need to earn your way back. Just train."
    ],

    /* ---- food logging ------------------------------------------------------------------ */
    foodLogged: [
      "Logged. Staying accountable is most of the battle.",
      "Good. What gets tracked gets understood.",
      "In the log. You can't adjust what you don't measure.",
      "Noted. Consistency here matters more than any single meal.",
      "That's it — keep the picture complete.",
      "Logged. Honest tracking beats perfect eating."
    ],

    proteinHit: [
      "Protein target reached. Your muscles have what they need to repair.",
      "Protein goal done. That's the nutrient that turns training into progress.",
      "Target hit. Recovery is properly fuelled today.",
      "Protein's covered. That's the one worth getting right."
    ],

    waterGoal: [
      "Water goal reached. One of the simplest things you can get right.",
      "Fully hydrated. Everything from training to focus works better for it.",
      "That's the water done. Easy win, real effect.",
      "Hydration sorted for today."
    ],

    calorieOnTarget: [
      "You landed on target today. That's harder than it sounds.",
      "Right where you planned to be.",
      "On target. Days like this are what move the average.",
      "Calories on plan. Repeat that and the rest follows."
    ],

    /* ---- one-off setbacks --------------------------------------------------------------
       The user asked for a line after "junk food". It is written without judgement on
       purpose: an app that comments on the moral quality of a meal is one people stop
       logging honestly, and dishonest logs are worse than indulgent ones. */
    offPlan: [
      "One meal doesn't decide anything. The next one is a fresh choice.",
      "That's a day, not a pattern. Carry on tomorrow.",
      "Nothing to undo. Just keep logging honestly — that's what makes this work.",
      "Averages matter, individual meals don't. Keep going."
    ],

    /* ---- steps ------------------------------------------------------------------------- */
    steps: [
      "Good movement today.",
      "Those steps add up more than people expect.",
      "Walking is the most underrated thing in fitness. Nice work.",
      "That's real activity, and it all counts toward the week."
    ],

    /* ---- weight trending toward the goal ----------------------------------------------
       Never about appearance, never a health promise — just the number and the effort. */
    weightProgress: [
      "That's real progress, and it came from repeated small decisions.",
      "The trend is going where you wanted it to.",
      "Steady change like this is the kind that stays.",
      "That's the plan working. Keep doing what you've been doing.",
      "Moving in the right direction, one week at a time."
    ],

    /* ---- goal progress ----------------------------------------------------------------- */
    goalProgress: [
      "You're further along than you were. Keep the pace.",
      "That's meaningful ground covered.",
      "Still moving. That's the whole job.",
      "Progress you can see on a chart is progress you can trust."
    ],

    /* ---- streaks ----------------------------------------------------------------------- */
    streak: [
      "Consistency beats intensity. Keep it alive.",
      "That's a habit forming, not just a run of good days.",
      "Streaks are just decisions stacked up. Nice stack.",
      "This is the part that separates a phase from a lifestyle.",
      "Keep it going — but don't let one missed day end it in your head."
    ],

    /* ---- notifications ---------------------------------------------------------------- */
    notifyWorkout: [
      "Your session is waiting. Even a short one counts.",
      "Time to train. Twenty minutes is a full workout.",
      "Ready when you are.",
      "Today's session — shall we?",
      "Nothing fancy needed. Just get it started."
    ],
    notifyStreak: [
      "Your streak is still alive. One session keeps it.",
      "Don't let today be the gap.",
      "Still going. Keep it that way."
    ]
  };

  /* ---- selection ------------------------------------------------------------------- */

  function readSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function writeSeen(map) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(map)); } catch (e) { /* non-fatal */ }
  }

  /**
   * A line from `context` that has not been shown recently.
   *
   * Exhausting a context resets it rather than returning nothing — with a finite library the
   * alternative is silence, and silence is worse than a line seen a month ago.
   */
  function next(context) {
    var pool = LIBRARY[context];
    if (!pool || !pool.length) return "";
    var seen = readSeen();
    var used = seen[context] || [];
    if (used.length >= pool.length) used = [];
    var available = [];
    for (var i = 0; i < pool.length; i++) if (used.indexOf(i) === -1) available.push(i);
    var pick = available[Math.floor(Math.random() * available.length)];
    used.push(pick);
    seen[context] = used;
    writeSeen(seen);
    return pool[pick];
  }

  /**
   * The line for a given day. Seeded by the date, so it is the same all day and different
   * tomorrow — a quote that changes on every repaint reads as decoration, not as a message.
   */
  function forDay(context, date) {
    var pool = LIBRARY[context];
    if (!pool || !pool.length) return "";
    var d = date || new Date();
    var key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    // A cheap deterministic scramble, so consecutive days are not adjacent entries.
    var h = key * 2654435761 % 4294967296;
    return pool[Math.floor(h % pool.length)];
  }

  function count(context) { return (LIBRARY[context] || []).length; }
  function total() {
    var n = 0;
    for (var k in LIBRARY) if (LIBRARY.hasOwnProperty(k)) n += LIBRARY[k].length;
    return n;
  }

  return {
    LIBRARY: LIBRARY,
    next: next,
    forDay: forDay,
    count: count,
    total: total,
    contexts: function () { return Object.keys(LIBRARY); }
  };
})();
