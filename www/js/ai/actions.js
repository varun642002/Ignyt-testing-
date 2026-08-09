/* =========================================================
   IGNYT AI — THE ACTION LAYER

   The AI never touches storage. It names an action and supplies arguments; this file decides
   whether that is allowed, validates the arguments itself, and then calls the SAME code path
   the user's own taps go through. Nothing here is a second implementation of food logging or
   weight logging — those already exist in app.js and are authoritative.

   WHY A FIXED REGISTRY RATHER THAN LETTING THE MODEL WRITE QUERIES
   A model that can emit storage operations can emit any storage operation, including ones
   nobody wrote a test for. The registry below is the entire vocabulary: an action name that
   is not a key of ACTIONS cannot run, whatever the model says. That is the whole security
   boundary, and it is deliberately readable in one screen.

   VALIDATION IS HERE, NOT IN THE PROMPT
   Asking a model nicely for a number between 20 and 400 is not a range check. Every argument
   is re-validated in this file against the same limits the manual UI enforces, because the
   model's output is untrusted input in exactly the way a form field is.

   THREE RISK TIERS, which the confirmation system reads:
     "read"    no mutation. Runs without asking.
     "write"   creates or updates one record from an explicit instruction. Runs, then shows
               a card saying what happened, with undo where the underlying feature has it.
     "destroy" removes something. NEVER runs without the user confirming, no matter how
               explicit the phrasing was — "delete my food log" is exactly the sentence a
               misheard voice command produces.
========================================================= */
(function () {
  "use strict";

  var S = function () { return typeof state !== "undefined" ? state : {}; };
  var has = function (n) { return typeof window[n] === "function"; };

  /* THE FOOD CATALOGUE IS LOADED ON DEMAND, which is why run() is async.
     4,062 foods are not in memory at boot — IgnytFoodCatalogue.load() fetches them the first
     time a food screen needs them. Without this await, a perfectly good "I ate 200g of
     chicken" resolved against an EMPTY index and came back "I couldn't find chicken", which
     is indistinguishable from the food genuinely not existing and would have shipped as a
     mysterious, intermittent failure depending on whether the user had opened Nutrition yet. */
  function ensureCatalogue() {
    var C = window.IgnytFoodCatalogue;
    if (!C || !C.load) return Promise.resolve(false);
    if (C.isReady && C.isReady()) return Promise.resolve(true);
    return C.load().then(function () { return true; }, function () { return false; });
  }

  /* ---------- argument validation ------------------------------------------------------
     Each returns the coerced value or throws an Error whose message is safe to show. */

  function num(v, name, lo, hi) {
    var n = typeof v === "string" ? parseFloat(v.replace(/[^0-9.\-]/g, "")) : Number(v);
    if (!isFinite(n)) throw new Error(name + " must be a number.");
    if (lo != null && n < lo) throw new Error(name + " looks too low (" + n + ").");
    if (hi != null && n > hi) throw new Error(name + " looks too high (" + n + ").");
    return n;
  }

  function str(v, name, max) {
    var s = String(v == null ? "" : v).trim();
    if (!s) throw new Error(name + " is required.");
    return s.slice(0, max || 120);
  }

  /* A date the app will accept. Defaults to today rather than throwing, because "log my
     weight" with no date is the common case, not an error.

     THE WINDOW IS THE POINT, NOT THE FORMAT. A model has no clock. Asked to log something
     "yesterday" it will confidently produce a well-formed date from whenever it thinks now is
     — live testing returned 2025-04-09 for yesterday when today was 2026-08-08, sixteen
     months out, and a format check waves that straight through. Food silently filed to last
     April is worse than a refusal, because nothing on screen looks wrong.

     So: never the future (you cannot have eaten tomorrow), and not more than a year back,
     which is far wider than any real correction and narrow enough to catch a hallucinated
     year. The model is separately TOLD today's date — see service.js — so a correct
     "yesterday" still works; this is the backstop for when it ignores that. */
  var MAX_BACKDATE_DAYS = 365;

  function dateKey(v) {
    var today = has("todayStr") ? window.todayStr() : new Date().toISOString().slice(0, 10);
    if (!v) return today;
    var s = String(v).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Date must look like " + today + ".");
    var t = Date.parse(s + "T00:00:00");
    if (!isFinite(t)) throw new Error("That date isn't real.");
    var now = Date.parse(today + "T00:00:00");
    if (t > now) throw new Error("That date is in the future.");
    if ((now - t) / 86400000 > MAX_BACKDATE_DAYS) throw new Error("That date is too far back — did you mean this year?");
    return s;
  }

  /* ---------- read actions -------------------------------------------------------------
     These shape data for the model. They are also the ONLY thing that decides what leaves
     the device, which is why each returns a hand-picked object rather than a slice of state:
     "send the minimum for this request" is enforced by there being nothing else to send. */

  function getUserProfile() {
    var p = S().profile || {};
    return {
      name: p.name || null, age: p.age || null, gender: p.gender || null,
      heightCm: p.height || null, weightKg: p.weight || null,
      targetWeightKg: p.targetWeight || null,
      trainingDays: p.trainingDays || null, equipment: p.equipment || [],
      experience: p.hyroxExperience || null
    };
  }

  function getGoals() {
    var g = (window.IgnytGoals && IgnytGoals.activeGoal && IgnytGoals.activeGoal()) || null;
    var p = S().profile || {};
    return {
      activeGoal: g ? { type: g.type || null, target: g.target || null, status: g.status || null } : null,
      goalDelta: p.goalDelta || null,
      targetWeightKg: p.targetWeight || null
    };
  }

  function getStreak() {
    return { days: has("computeStreak") ? window.computeStreak() : 0 };
  }

  /* today(), NOT summary(). summary() calls record(), which writes the day's score into
     hx_score_history — a read action that mutates storage would make the risk tier below a
     lie, and asking the score would quietly bump a high-water mark the user never earned by
     doing anything. today() is the same scorer with no write. */
  function getIGNYTScore() {
    if (!window.IgnytScore || !IgnytScore.today) return { available: false };
    try {
      var t = IgnytScore.today();
      return { available: true, score: t && t.score != null ? t.score : null,
               level: t && t.level ? t.level : null };
    } catch (e) { return { available: false }; }
  }

  /* Weight history, newest first, trimmed to what a question about weight actually needs. */
  function getProgress(args) {
    var days = args && args.days ? num(args.days, "days", 1, 365) : 30;
    var cutoff = Date.now() - days * 86400000;
    var rows = (S().bodylog || [])
      .filter(function (e) { return e && e.weight != null && new Date(e.date).getTime() >= cutoff; })
      .slice(0, 60)
      .map(function (e) { return { date: e.date, weightKg: Number(e.weight) }; });
    var trend = null;
    if (rows.length >= 2) {
      var first = rows[rows.length - 1].weightKg, last = rows[0].weightKg;
      trend = Math.round((last - first) * 10) / 10;
    }
    return { days: days, entries: rows, changeKg: trend };
  }

  function getFoodLog(args) {
    var ds = dateKey(args && args.date);
    var rows = (S().foodLog || []).filter(function (f) { return f && f.date === ds; });
    var tot = rows.reduce(function (a, f) {
      a.kcal += Number(f.calories) || 0; a.protein += Number(f.protein) || 0;
      a.carbs += Number(f.carbs) || 0; a.fat += Number(f.fat) || 0; return a;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    return {
      date: ds,
      totals: { kcal: Math.round(tot.kcal), protein: Math.round(tot.protein), carbs: Math.round(tot.carbs), fat: Math.round(tot.fat) },
      items: rows.slice(0, 40).map(function (f) {
        return { id: f.id, name: f.name, meal: f.meal, grams: f.grams, kcal: Math.round(Number(f.calories) || 0) };
      })
    };
  }

  function getTodayWorkout() {
    var live = S().session;
    if (live) return { inProgress: true, title: live.title || null, exercises: (live.exercises || []).map(function (e) { return e.name; }) };
    var planned = has("todaysPlannedDay") ? window.todaysPlannedDay() : null;
    if (!planned) return { inProgress: false, planned: null };
    return {
      inProgress: false,
      planned: { day: planned.day || null, session: planned.session || null,
                 exercises: (planned.exercises || []).map(function (e) { return e.name || e; }).slice(0, 12) }
    };
  }

  function getWorkoutHistory(args) {
    var n = args && args.limit ? num(args.limit, "limit", 1, 30) : 8;
    return {
      workouts: (S().workoutLog || []).slice(0, n).map(function (w) {
        return { date: w.date, title: w.title || null, exercises: (w.exercises || []).length,
                 volumeKg: Math.round(Number(w.volume) || 0), durationMin: w.durationMin || null };
      })
    };
  }

  /* The catalogue search the food screen already uses. Returns few rows on purpose — a long
     list costs tokens and the model only needs enough to pick one. */
  async function searchFood(args) {
    var q = str(args && args.query, "Food name", 60);
    await ensureCatalogue();
    if (!window.IgnytFoodSearch || !IgnytFoodSearch.search) return { results: [], available: false };
    var rows = IgnytFoodSearch.search(q, { limit: 6 }) || [];
    return {
      available: true,
      results: rows.map(function (f) {
        return { id: f.id, name: f.name, per: f.per || 100,
                 kcal: Math.round(Number(f.calories) || 0), protein: Number(f.protein) || 0,
                 carbs: Number(f.carbs) || 0, fat: Number(f.fat) || 0 };
      })
    };
  }

  /* ---------- write actions ------------------------------------------------------------ */

  /* Weight. Bounds match what the manual entry screen accepts; a voice command that produces
     "968" from "96.8" is caught here rather than becoming a body-log entry nobody typed. */
  function logWeight(args) {
    var kg = num(args && args.weightKg, "Weight", 20, 400);
    var ds = dateKey(args && args.date);
    var st = S();
    var rounded = Math.round(kg * 10) / 10;

    var prev = (st.bodylog || []).filter(function (e) { return e && e.weight != null; })[0];
    var existing = (st.bodylog || []).find(function (e) { return e && e.date === ds; });

    if (existing) {
      existing.weight = rounded;
    } else {
      st.bodylog.unshift({ id: window.nextId(), date: ds, weight: rounded });
    }
    /* The manual path treats a new weight as the source of truth for calorie and macro
       targets. Skipping that would leave the AI-logged weight showing on the chart while
       every target on the nutrition screen still used the old one. */
    st.profile.weight = rounded;
    window.persist();

    var delta = prev && prev.weight != null ? Math.round((rounded - Number(prev.weight)) * 10) / 10 : null;
    return {
      card: "weight", weightKg: rounded, date: ds, deltaKg: delta,
      replaced: !!existing,
      /* A single day's swing is water, food and time of day. The card says so when the jump
         is big, so the number does not read as fat gained overnight. */
      note: (delta != null && Math.abs(delta) >= 1.5)
        ? "Day-to-day swings of this size are normal. Watch the weekly trend."
        : null
    };
  }

  /* Food. Resolves against the real catalogue first and only uses model-supplied macros when
     the catalogue genuinely has nothing — inventing numbers for a food the app already knows
     is the failure mode the brief calls out, and it silently corrupts the day's totals. */
  /* COUNTS ARE CONVERTED HERE, NOT GUESSED BY THE MODEL.
     People say "2 eggs" and "3 roti", not "100 g of egg" — and in Hindi and Hinglish the model
     was putting the count inside the food name ("2 eggs", "3 roti") because grams was the only
     amount it could express. Asking a model how much a roti weighs is asking it to invent a
     number that IgnytServingConverter already knows exactly: egg 50 g, roti 40 g, banana 118 g,
     dosa 85 g, keyed per food. So the model now passes the count it heard and the app does the
     arithmetic against its own table. */
  function gramsFromCount(food, quantity, unit) {
    var C = window.IgnytServingConverter;
    if (!C || !C.toGrams) return null;
    var want = unit ? String(unit).toLowerCase() : null;
    /* Prefer the food's own named unit ("egg", "idli", "dosa") over the generic "piece" —
       they are the same weight when both exist, but a food that only has one of them should
       still work whichever the model named. */
    var candidates = want ? [want, "piece"] : ["piece"];
    for (var i = 0; i < candidates.length; i++) {
      var g = C.toGrams(food, quantity, candidates[i]);
      if (g != null && isFinite(g) && g > 0) return Math.round(g);
    }
    return null;
  }

  async function addFoodLog(args) {
    var name = str(args && args.food, "Food", 80);
    var grams = args && args.grams != null ? num(args.grams, "Amount", 1, 5000) : null;
    var quantity = args && args.quantity != null ? num(args.quantity, "Quantity", 0.1, 100) : null;
    var meal = args && args.meal ? String(args.meal).slice(0, 24) : (has("mealForNow") ? window.mealForNow() : "Lunch");
    var ds = dateKey(args && args.date);

    await ensureCatalogue();
    var found = null;
    if (window.IgnytFoodSearch && IgnytFoodSearch.search) {
      var rows = IgnytFoodSearch.search(name, { limit: 1 }) || [];
      found = rows[0] || null;
    }
    if (!found) {
      /* THE LIBRARY IS THE ONLY SOURCE OF NUTRITION, and a miss is a refusal rather than a
         fallback. Nothing here estimates the macros, invents a food row, or asks Gemini what
         a samosa contains — a logged calorie figure is data the user will make decisions from
         for months, and a plausible guess is indistinguishable from a real measurement once
         it is sitting in the log. Being told the food is missing is recoverable; a silently
         invented 250 kcal is not.

         This also keeps food logging at ZERO AI activities, which is the point: the miss
         costs nothing and does not touch the daily allowance. */
      return { card: "error", code: "food_not_found", food: name,
               message: "Food not added.\n\n" + name + " isn't currently available in the " +
                        "IGNYT Food Library.\n\nOur food database will be updated soon." };
    }
    /* A count only becomes grams once the food is known — "3" means nothing until we know
       whether it is 3 eggs or 3 dosa. That is why this runs after the search, not before. */
    var countedAs = null;
    if (grams == null && quantity != null) {
      var g = gramsFromCount(found, quantity, args && args.unit);
      if (g != null) {
        grams = g;
        countedAs = quantity + " × " + (args && args.unit ? String(args.unit) : "piece");
      }
    }

    if (grams == null) {
      /* Still nothing usable. If the food has a countable unit, offer THAT rather than a
         gram figure — someone who said "I had chicken" can answer "2 pieces" far more easily
         than "180 grams", and offering grams to a person eating roti is asking them to weigh
         their dinner. */
      var oneUnit = gramsFromCount(found, 1, null);
      return { card: "clarify", code: "need_amount", food: found.name,
               suggestGrams: oneUnit || found.per || 100,
               suggestUnit: oneUnit ? "piece" : "g",
               message: "How much " + found.name + "?" };
    }

    var per = Number(found.per) || 100;
    var k = grams / per;
    var entry = {
      id: window.nextId(), date: ds, name: found.name, meal: meal,
      grams: grams, quantity: grams, servingUnit: "g",
      calories: Math.round((Number(found.calories) || 0) * k),
      protein: Math.round((Number(found.protein) || 0) * k * 10) / 10,
      carbs: Math.round((Number(found.carbs) || 0) * k * 10) / 10,
      fat: Math.round((Number(found.fat) || 0) * k * 10) / 10,
      fibre: Math.round((Number(found.fibre) || 0) * k * 10) / 10,
      foodId: found.id != null ? found.id : null, at: Date.now()
    };
    S().foodLog.unshift(entry);
    window.persist();
    return { card: "food",
             added: [{ name: entry.name, grams: grams, kcal: entry.calories, protein: entry.protein,
                       /* Carried so the card can say "2 × egg (100 g)" rather than just the
                          gram figure — the user said two eggs and should see two eggs. */
                       countedAs: countedAs }],
             kcal: entry.calories, protein: entry.protein, entryId: entry.id, date: ds, meal: meal };
  }

  function updateFoodLog(args) {
    var id = args && args.entryId;
    var grams = num(args && args.grams, "Amount", 1, 5000);
    var row = (S().foodLog || []).find(function (f) { return String(f.id) === String(id); });
    if (!row) return { card: "error", code: "not_found", message: "I couldn't find that food entry." };
    var oldG = Number(row.grams) || 1, k = grams / oldG;
    ["calories", "protein", "carbs", "fat", "fibre"].forEach(function (m) {
      if (row[m] != null) row[m] = Math.round(Number(row[m]) * k * 10) / 10;
    });
    row.calories = Math.round(row.calories);
    row.grams = row.quantity = grams;
    window.persist();
    return { card: "food", updated: true, name: row.name, grams: grams, kcal: row.calories, protein: row.protein };
  }

  /* Destructive. Reached only after the confirmation layer has a yes — see RISK below. */
  /* ---------- scoped deletion ---------------------------------------------------------------
     THE COUNT IS THE PROOF. Each of these measures the log before and after and reports how
     many rows actually went, so the chat layer can never claim a deletion that did not happen —
     the brief's rule, and the one that matters most for a destructive action. "Deleted" with
     nothing removed is worse than an error, because the user stops looking.

     All three write through the same S().foodLog and window.persist() the manual UI uses, so
     the Food Log screen and the day's calorie and macro totals reflect it immediately. There is
     no second store to keep in step. */

  function deleteFoodLogForDate(args) {
    var ds = dateKey(args && args.date);
    var st = S();
    var before = (st.foodLog || []).length;
    st.foodLog = (st.foodLog || []).filter(function (f) { return String(f.date) !== ds; });
    var removed = before - st.foodLog.length;
    if (!removed) {
      return { card: "error", code: "nothing_to_delete", affectedRecords: 0,
               message: "There's nothing logged on " + ds + " to delete." };
    }
    window.persist();
    return { card: "deleted", scope: "date", date: ds, affectedRecords: removed,
             message: "Deleted " + removed + (removed === 1 ? " entry" : " entries") + " from " + ds + "." };
  }

  function deleteAllFoodLogs() {
    var st = S();
    var removed = (st.foodLog || []).length;
    if (!removed) {
      return { card: "error", code: "nothing_to_delete", affectedRecords: 0,
               message: "Your food log is already empty." };
    }
    st.foodLog = [];
    window.persist();
    return { card: "deleted", scope: "all", affectedRecords: removed,
             message: "Deleted all " + removed + " food log entries." };
  }

  function deleteFoodByName(args) {
    var name = str(args && args.food, "Food", 80).toLowerCase();
    var ds = dateKey(args && args.date);
    var st = S();
    var before = (st.foodLog || []).length;
    /* Substring rather than exact: the user says "chicken", the library row is "Chicken
       Breast". Scoped to one day so a name match cannot reach back through the whole history. */
    st.foodLog = (st.foodLog || []).filter(function (f) {
      var hit = String(f.date) === ds && String(f.name || "").toLowerCase().indexOf(name) !== -1;
      return !hit;
    });
    var removed = before - st.foodLog.length;
    if (!removed) {
      return { card: "error", code: "not_found", affectedRecords: 0,
               message: "I couldn't find \"" + name + "\" in " + ds + "'s food log." };
    }
    window.persist();
    return { card: "deleted", scope: "name", what: name, affectedRecords: removed,
             message: "Deleted " + removed + " " + name + (removed === 1 ? " entry" : " entries") + "." };
  }

  function deleteFoodLog(args) {
    var id = args && args.entryId;
    var st = S();
    var row = (st.foodLog || []).find(function (f) { return String(f.id) === String(id); });
    if (!row) return { card: "error", code: "not_found", message: "I couldn't find that food entry." };
    st.foodLog = st.foodLog.filter(function (f) { return String(f.id) !== String(id); });
    window.persist();
    return { card: "deleted", what: row.name, kcal: Math.round(Number(row.calories) || 0) };
  }

  /* "Start my workout." Builds the session from buildTodaysPlan(), the same builder the
     Start button on the plan screen uses — including its deliberate choice to seed reps but
     NOT weight, because a template can prescribe repetitions and cannot prescribe a load for
     a person it knows nothing about. Reimplementing the shape here would have quietly
     dropped that. */
  function startWorkout() {
    var st = S();
    if (st.session) {
      return { card: "workoutStarted", already: true, title: st.session.title || null,
               exercises: (st.session.exercises || []).length };
    }
    if (!has("buildTodaysPlan")) return { card: "error", code: "unavailable", message: "Couldn't open today's workout." };
    var plan = window.buildTodaysPlan();
    if (!plan || !plan.exercises || !plan.exercises.length) {
      return { card: "error", code: "no_plan", message: "There's no session planned for today." };
    }
    st.session = {
      startedAt: Date.now(), notes: "",
      title: plan.template.name + (has("titleCaseDayKey") ? " — " + window.titleCaseDayKey(plan.dayKey) : ""),
      exercises: plan.exercises.map(function (e) {
        return { name: e.name, notes: "", restDuration: e.rest,
                 sets: (e.sets || []).map(function (s) { return { reps: s.reps, weight: "", done: false }; }) };
      })
    };
    window.persist();
    /* The chat screen is the wrong place to run a session, so this hands over to the workout
       tab — the answer to "start my workout" is the workout, not a card describing it. */
    st.tab = "workout";
    return { card: "workoutStarted", title: st.session.title,
             exercises: st.session.exercises.length, navigated: true };
  }

  /* Workout completion goes through commitFinishedWorkout(), which owns PR detection, XP,
     achievements, the streak and the duplicate-commit ledger. Re-implementing any of that
     here would produce a workout that counted for the history but not for the streak. */
  function completeWorkout() {
    var st = S();
    if (!st.session) return { card: "error", code: "no_session", message: "There's no workout in progress." };
    if (!has("commitFinishedWorkout")) return { card: "error", code: "unavailable", message: "Couldn't finish the workout." };
    var before = (st.prs || []).length;
    var res = window.commitFinishedWorkout(st.session);
    if (!res || res.duplicate) return { card: "error", code: "duplicate", message: "That workout was already saved." };
    st.session = null;
    window.persist();
    return { card: "workout", title: res.title || null, prs: Math.max(0, ((st.prs || []).length) - before),
             streak: has("computeStreak") ? window.computeStreak() : null };
  }

  /* Steps.

     THIS ONE CANNOT FULLY DO WHAT THE BRIEF ASKS, and pretending otherwise is worse than
     saying so. The app has no manual step store: the Home steps card renders only when
     Health Connect is CONNECTED, reads d.steps.steps from the Health Connect cache, and that
     cache is rewritten wholesale on every sync. A hand-written number there survives until
     the next sync and then vanishes, and on a phone without Health Connect it was never
     displayed at all.

     The first version of this wrote to hx_manual_steps. Nothing in the app reads that key, so
     "10,000 steps logged" showed a success card and changed precisely nothing — a hollow
     confirmation, which is the one thing an action card must never be.

     So: if Health Connect has today's figure, report THAT (measured beats typed, per the
     brief). Otherwise say plainly that steps are not tracked manually yet, rather than
     claiming a write that goes nowhere. A real manual-steps feature is its own piece of work
     — a store, a Home surface, and a rule for what happens when a sync later disagrees. */
  function updateSteps(args) {
    var steps = num(args && args.steps, "Steps", 0, 200000);
    var ds = dateKey(args && args.date);
    var cache = null;
    try { cache = JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null"); } catch (e) {}
    /* d.steps is an OBJECT — {steps: n} — which is how renderHealthCards reads it. The first
       version compared cache.steps to a number, so the guard never once fired. */
    var measured = cache && cache.steps && cache.steps.steps != null ? Number(cache.steps.steps) : null;

    if (measured != null && measured > 0 && ds === dateKey()) {
      return { card: "steps", steps: measured, source: "health-connect",
               note: "Health Connect already has today's steps, so I kept its figure." };
    }
    return { card: "error", code: "steps_not_manual",
             message: "IGNYT reads steps from Health Connect rather than storing typed ones. "
                    + "Connect it and today's count appears automatically." };
  }

  /* ---------- the registry ------------------------------------------------------------- */

  var ACTIONS = {
    getUserProfile:   { risk: "read",    fn: getUserProfile },
    getGoals:         { risk: "read",    fn: getGoals },
    getStreak:        { risk: "read",    fn: getStreak },
    getIGNYTScore:    { risk: "read",    fn: getIGNYTScore },
    getProgress:      { risk: "read",    fn: getProgress },
    getFoodLog:       { risk: "read",    fn: getFoodLog },
    getTodayWorkout:  { risk: "read",    fn: getTodayWorkout },
    getWorkoutHistory:{ risk: "read",    fn: getWorkoutHistory },
    searchFood:       { risk: "read",    fn: searchFood },

    logWeight:        { risk: "write",   fn: logWeight },
    updateWeight:     { risk: "write",   fn: logWeight },   // same operation, friendlier name
    addFoodLog:       { risk: "write",   fn: addFoodLog },
    updateFoodLog:    { risk: "write",   fn: updateFoodLog },
    startWorkout:     { risk: "write",   fn: startWorkout },
    completeWorkout:  { risk: "write",   fn: completeWorkout },
    updateSteps:      { risk: "write",   fn: updateSteps },

    deleteFoodLog:    { risk: "destroy", fn: deleteFoodLog },
    /* All destroy-tier, so every one of them stops at the confirmation gate in service.js
       before anything is removed. deleteAllFoodLogs especially: it is the widest action in the
       registry and the one a misheard sentence must never reach unchallenged. */
    deleteFoodForDate: { risk: "destroy", fn: deleteFoodLogForDate },
    deleteAllFoodLogs: { risk: "destroy", fn: deleteAllFoodLogs },
    deleteFoodByName:  { risk: "destroy", fn: deleteFoodByName }
  };

  /* The single entry point. Anything the model asks for arrives here as a name and a plain
     object, and leaves as {ok, result} or {ok:false, error} — never as an exception, because
     a thrown error inside a chat turn would take the screen down with it. */
  async function run(name, args) {
    var spec = ACTIONS[name];
    if (!spec) return { ok: false, error: "Unknown action.", code: "unknown_action" };
    try {
      /* await covers both kinds: the synchronous reads resolve immediately, the food actions
         wait for the catalogue. Callers get one contract instead of having to know which is
         which. */
      var out = await spec.fn(args || {});
      return { ok: true, risk: spec.risk, action: name, result: out };
    } catch (e) {
      return { ok: false, action: name, code: "invalid_args", error: (e && e.message) || "That didn't work." };
    }
  }

  window.IgnytAIActions = Object.freeze({
    run: run,
    risk: function (name) { return ACTIONS[name] ? ACTIONS[name].risk : null; },
    names: function () { return Object.keys(ACTIONS); },
    /* Exposed for the backend's tool schema and for tests; the registry is the contract. */
    REGISTRY: ACTIONS
  });
})();
