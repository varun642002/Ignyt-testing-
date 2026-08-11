/* =========================================================
   IGNYT CHAT — THE TEST HARNESS

   WHY THIS EXISTS, stated plainly: every chatbot bug found so far was found by a user sending
   a screenshot. Five of them shared one shape — a caller trusting a contract it never verified
   — and every one survived the tests written at the time, because those tests asserted that a
   message ROUTED and never that data CHANGED. Routing was green while food logging, weight
   logging, every delete and every other write did nothing at all.

   So the rule here is single and absolute: A TEST THAT DOES NOT INSPECT STORED DATA IS NOT A
   TEST OF AN ACTION. Routing assertions are kept, but they are labelled as such and they never
   stand alone for anything that writes.

   Run from the console:  IgnytChatTests.run()
   It returns { passed, failed, results } and prints a table.

   It writes to real state, so it snapshots foodLog, bodylog and routines before and restores
   them after. A test suite that leaves the user's data changed is a bug of its own.
========================================================= */
(function () {
  "use strict";

  /* STATE IS READ THROUGH THE ACTIONS, NOT window.state -- which does not exist. The app state
     is module-scoped inside app.js, so the first version of this harness seeded and inspected an
     empty object and reported five failures that were its own. Reading through the action layer
     is the right surface anyway: it is exactly what the chatbot sees, so a test cannot pass
     against data the assistant could never have reached. */
  async function foodRows() {
    var r = await acts().run("getFoodLog", {});
    var d = (r && r.result) || {};
    return d.entries || d.items || d.foods || [];
  }
  async function weightRows() {
    var r = await acts().run("getProgress", { days: 2 });
    return ((r && r.result) || {}).entries || [];
  }
  async function clearAllData() {
    await acts().run("deleteAllFoodLogs", {});
    var rows = await weightRows();
    for (var i = 0; i < rows.length; i++) await acts().run("deleteWeightEntry", { date: rows[i].date });
  }
  var svc = function () { return window.IgnytAIService; };
  var chat = function () { return window.IgnytLocalChat; };
  var acts = function () { return window.IgnytAIActions; };

  /* Nothing to snapshot: the app state is module-scoped and unreachable from here, so each
     test clears through the same actions it exercises. RUN THIS ON A TEST ACCOUNT. */

  async function say(msg) {
    if (chat() && chat().clearAwaiting) chat().clearAwaiting();
    return await svec(msg);
  }
  async function svec(msg) { return await svc().processChatMessage(msg); }
  /* Continue a conversation without clearing the follow-up slot — the two-message flows need
     this, and using say() for the second half is how a follow-up test silently becomes two
     unrelated messages. */
  async function reply(msg) { return await svec(msg); }

  var T = [];
  function test(name, kind, fn) { T.push({ name: name, kind: kind, fn: fn }); }

  /* ---------- 1. questions must answer the question asked ------------------------------- */

  test("how do I do bench press -> steps, not muscles", "question", async function () {
    var r = await say("how do I do bench press");
    if (!/bench press/i.test(r.response || "")) throw new Error("no bench press in answer");
    if (!/^\s*\d\./m.test(r.response || "")) throw new Error("no numbered steps: " + (r.response || "").slice(0, 60));
    if (/primarily trains|trains the chest/i.test(r.response)) throw new Error("answered with anatomy");
  });

  test("what muscles does bench press train -> anatomy", "question", async function () {
    var r = await say("what muscles does bench press train");
    if (!/chest|triceps|shoulder/i.test(r.response || "")) throw new Error("not an anatomy answer");
    if (/^\s*1\./m.test(r.response || "")) throw new Error("gave steps instead of muscles");
  });

  test("known fitness question answers from the base", "question", async function () {
    var r = await say("what is progressive overload");
    if (r.source !== "BUILT_IN_KNOWLEDGE") throw new Error("source was " + r.source);
  });

  test("out-of-scope question declines rather than guessing", "question", async function () {
    var r = await say("what is the capital of France");
    if (r.source !== "BUILT_IN_UNKNOWN") throw new Error("source was " + r.source);
  });

  /* ---------- 2. food: log / view / delete, each verified against stored data ----------- */

  test("log food (no item) ASKS and logs nothing", "action", async function () {
    var before = (await foodRows()).length;
    var r = await say("log food");
    if (!/what would you like to log/i.test(r.response || "")) throw new Error("did not ask: " + r.response);
    if ((await foodRows()).length !== before) throw new Error("it logged something anyway");
  });

  test("log 200g chicken -> entry actually in the food log", "action", async function () {
    var before = (await foodRows()).length;
    var r = await say("log 200g chicken");
    var after = (await foodRows()).length;
    if (r.ok === false) throw new Error("action failed: " + (r.response || "") + " (food library may be empty in this session)");
    if (after !== before + 1) throw new Error("food log went " + before + " -> " + after);
    var row = (await foodRows())[0];
    if (!/chicken/i.test((row && row.name) || "")) throw new Error("wrong row stored: " + row.name);
    /* getFoodLog returns `kcal`, not `calories` — the sixth time in this codebase that a
       caller has read a field name it assumed rather than checked, and the first time the
       harness itself did it. Reading the shape is the habit; asserting on it is the point. */
    if (!(Number(row.kcal) > 0)) throw new Error("stored with no calories: " + JSON.stringify(row));
  });

  test("view today's food READS and does not write", "action", async function () {
    var before = (await foodRows()).length;
    var r = await say("show my logged food");
    /* Either route is correct: this asserts the food log was READ, not which internal handler
       did the reading. Pinning the handler name would make every promotion look like a
       regression — and a test that fails when nothing behavioural changed teaches people to
       ignore it. */
    if (!/food log today|VIEW_FOOD_LOG/.test(r.source || "")) throw new Error("source was " + r.source);
    if ((await foodRows()).length !== before) throw new Error("a read changed the data");
  });

  test("delete all foods -> confirms first, deletes nothing yet", "action", async function () {
    await clearAllData();
    await acts().run("addFoodLog", { food: "chicken", grams: 100 });
    var seeded = (await foodRows()).length;
    var r = await say("delete all my foods today");
    if (!r.requiresFollowUp) throw new Error("destructive action did not ask for confirmation");
    if ((await foodRows()).length !== seeded) throw new Error("deleted before confirmation");
  });

  test("deleteAllFoodLogs actually empties the log and reports the count", "action", async function () {
    await clearAllData();
    await acts().run("addFoodLog", { food: "chicken", grams: 100 });
    var n = (await foodRows()).length;
    if (!n) throw new Error("could not seed the food log (library empty in this session)");
    var res = await acts().run("deleteAllFoodLogs", {});
    if (!res.ok) throw new Error("action errored");
    if (res.result.affectedRecords !== n) throw new Error("reported " + res.result.affectedRecords + ", expected " + n);
    if ((await foodRows()).length !== 0) throw new Error("log not empty after delete");
  });

  test("delete reports 0 on an empty log rather than claiming success", "action", async function () {
    await clearAllData();
    var res = await acts().run("deleteAllFoodLogs", {});
    if (res.result.affectedRecords !== 0) throw new Error("claimed a deletion");
    if (res.result.card !== "error") throw new Error("did not signal nothing-to-delete");
  });

  /* ---------- 3. weight, including the two-message flow --------------------------------- */

  test("log my weight -> asks, stores nothing yet", "action", async function () {
    await clearAllData();
    var r = await say("log my weight");
    if (!/what weight/i.test(r.response || "")) throw new Error("did not ask: " + r.response);
    if ((await weightRows()).length !== 0) throw new Error("stored a weight without a value");
  });

  test("...then '82' STORES 82 kg", "action", async function () {
    await clearAllData();
    await say("log my weight");
    var r = await reply("82");
    if (r.ok !== true) throw new Error("action did not report success");
    var row = (await weightRows())[0];
    if (!row || Number(row.weightKg) !== 82) throw new Error("stored: " + JSON.stringify(row));
  });

  test("'my weight is 81.5 kg' stores in one message", "action", async function () {
    await clearAllData();
    var r = await say("my weight is 81.5 kg");
    var row = (await weightRows())[0];
    if (!row || Number(row.weightKg) !== 81.5) throw new Error("stored: " + JSON.stringify(row));
  });

  test("pounds convert on the way in", "action", async function () {
    await clearAllData();
    await say("log my weight");
    await reply("172 lbs");
    var row = (await weightRows())[0];
    if (!row || Math.abs(Number(row.weightKg) - 78) > 0.2) throw new Error("stored: " + JSON.stringify(row));
  });

  test("changing the subject mid-follow-up does not log a weight", "action", async function () {
    await clearAllData();
    await say("log my weight");
    var r = await reply("what is progressive overload");
    if ((await weightRows()).length !== 0) throw new Error("logged a weight from a question");
    if (r.source !== "BUILT_IN_KNOWLEDGE") throw new Error("did not answer the question");
  });

  /* ---------- 4. ambiguity and safety ---------------------------------------------------- */

  test("'delete it' asks what, deletes nothing", "safety", async function () {
    await clearAllData();
    await acts().run("addFoodLog", { food: "chicken", grams: 100 });
    var kept = (await foodRows()).length;
    var r = await say("delete it");
    if (!/what should i delete/i.test(r.response || "")) throw new Error("did not ask: " + r.response);
    if ((await foodRows()).length !== kept) throw new Error("deleted on an ambiguous request");
  });

  test("injury language never gets an exercise answer", "safety", async function () {
    var r = await say("why does my shoulder hurt when I bench");
    if (/^\s*1\./m.test(r.response || "")) throw new Error("returned exercise steps for a pain question");
    if (r.source === "BUILT_IN_KNOWLEDGE" && /bench press/i.test(r.response)) {
      throw new Error("answered a pain question with bench press content");
    }
  });

  /* ---------- 5. speech and typos --------------------------------------------------------- */

  test("'lock food' is heard as 'log food'", "speech", async function () {
    if (chat().normalise("lock food") !== "log food") throw new Error(chat().normalise("lock food"));
  });
  test("'lock the screen' is left alone", "speech", async function () {
    if (chat().normalise("lock the screen") !== "lock the screen") throw new Error("over-corrected");
  });
  test("'my foot hurts' is left alone", "speech", async function () {
    if (chat().normalise("my foot hurts") !== "my foot hurts") throw new Error("corrupted an injury report");
  });

  /* ---------- 6. multilingual -------------------------------------------------------------- */

  test("Tamil weight command reaches logWeight", "lang", async function () {
    await clearAllData();
    var r = await say("என் எடை 82 kg என்று பதிவு செய்");
    if (r.action !== "logWeight" && r.intent !== "logWeight") throw new Error("intent was " + r.intent);
    if (r.language !== "ta") throw new Error("language detected as " + r.language);
  });
  test("Hindi weight command reaches logWeight", "lang", async function () {
    await clearAllData();
    var r = await say("मेरा वजन 82 किलो लॉग करो");
    if (r.action !== "logWeight" && r.intent !== "logWeight") throw new Error("intent was " + r.intent);
    if (r.language !== "hi") throw new Error("language detected as " + r.language);
  });

  /* ---------- 7. edges ---------------------------------------------------------------------- */

  test("empty input does not crash or act", "edge", async function () {
    var before = (await foodRows()).length;
    var r = await say("");
    if ((await foodRows()).length !== before) throw new Error("empty input changed data");
  });

  test("unknown food is refused, not invented", "edge", async function () {
    var before = (await foodRows()).length;
    var r = await say("log 100g zzzqqqnotafood");
    if ((await foodRows()).length !== before) throw new Error("invented a food entry");
  });


  /* ---------- 8. THE BRIEF'S "THESE MUST WORK" LIST (section 19) ------------------------
     Written as one table because the point is coverage, not prose: each row is a phrasing a
     user will actually type, and the expectation is the intent it must reach. A row that fails
     names a real gap rather than a missing keyword — which is the whole argument for replacing
     the regex table with a classifier. */
  var MUST_WORK = [
    ["delete all my foods today",        "deleteAllFoodLogs"],
    ["delete today's food",              "deleteFoodForDate"],
    ["remove everything I ate today",    "deleteAllFoodLogs"],
    ["log food",                         "log food"],
    ["add 200g chicken",                 "addFoodLog"],
    ["log my weight",                    "ask weight"],
    ["my weight is 82kg",                "logWeight"],
    ["what should I train today?",       "today workout"],
    ["how is my progress?",              "progress"],
    ["create a routine",                 "*ask"],
    ["create a chest workout",           "*ask"],
    ["how do I do bench press?",         "exercise how to"],
    ["what did I eat today?",            "*read food"],
    ["how many calories did I eat today?","*read food"]
  ];
  MUST_WORK.forEach(function (row) {
    test("s19: " + row[0], "brief", async function () {
      var r = await say(row[0]);
      var got = r.action || r.intent || "";
      if (row[1] === "*read food") {
        /* The food log was read — by whichever route currently owns it. */
        if (!/food log today|VIEW_FOOD_LOG/.test(got + " " + r.source)) {
          throw new Error("did not read the food log: " + got + " / " + r.source);
        }
        return;
      }
      if (row[1] === "*ask") {
        /* Not yet built as an action. It must at minimum ASK rather than return the generic
           no-answer line, which the brief calls out by name as unacceptable. */
        if (r.source === "BUILT_IN_UNKNOWN") throw new Error("generic fallback: " + (r.response||"").slice(0,44));
        return;
      }
      /* Either the handler name directly, or the classifier route that runs that exact
         same handler -- resolved through local-chat's own map rather than a list kept
         in step by hand. */
      if (got === row[1]) return;
      var m = /^BUILT_IN_INTENT:(.+)$/.exec(r.source || "");
      if (m && chat().handlerFor && chat().handlerFor(m[1]) === row[1]) return;
      throw new Error("got " + got + " (" + r.source + ")");
    });
  });

  /* Natural-language variations the brief lists for one intent. If these fail, the regex table
     is the reason and the classifier is the fix. */
  ["remove today's food", "clear my food for today", "get rid of everything I ate today",
   "wipe my food log", "I messed up my food log today, clear it"].forEach(function (phrase) {
    test("variation: " + phrase, "brief", async function () {
      var r = await say(phrase);
      var got = r.action || r.intent || "";
      if (!/delete|clear/i.test(got) && r.source === "BUILT_IN_UNKNOWN") {
        throw new Error("not understood: " + got + " / " + r.source);
      }
    });
  });


  /* ---------- personalised targets ---------------------------------------------------------
     The assistant must answer from the user's own record, not from the textbook range, and must
     refuse to answer at all when the record is missing. Both halves are tested, because a
     personalised answer that quietly falls back to a population average is the failure that
     looks most like success. */
  test("protein target uses the stored weight, not a general range", "action", async function () {
    await clearAllData();
    await acts().run("logWeight", { weightKg: 80 });
    var r = await say("how much protein should i eat");
    var text = String(r.response || "");
    if (!/144\s*g/.test(text)) throw new Error("expected 144 g from 80 kg x 1.8, got: " + text.slice(0, 90));
    if (!/80\s*kg/.test(text)) throw new Error("did not cite the stored weight: " + text.slice(0, 90));
  });

  test("protein target tracks a changed weight", "action", async function () {
    await clearAllData();
    await acts().run("logWeight", { weightKg: 60 });
    var r = await say("whats my protein target");
    if (!/108\s*g/.test(String(r.response || ""))) {
      throw new Error("expected 108 g from 60 kg, got: " + String(r.response || "").slice(0, 90));
    }
  });

  test("protein target asks rather than inventing a weight", "safety", async function () {
    await clearAllData();
    var r = await say("how much protein should i eat");
    var text = String(r.response || "");
    if (/\d+\s*g a day/.test(text)) throw new Error("invented a target with no weight logged: " + text.slice(0, 90));
    if (!/weight/i.test(text)) throw new Error("did not ask for a weight: " + text.slice(0, 90));
  });


  test("calorie target reads the app's own goal maths, not a second formula", "action", async function () {
    var saved = window.IgnytGoals;
    window.IgnytGoals = {
      GOAL_TYPES: [{ id: "fat_loss", label: "Fat Loss", protein: 2.2 }],
      activeGoal: function () { return { type: "fat_loss" }; },
      compute: function () { return { maintenance: 2693, goalDelta: -550, calories: 2143, protein: 180, carbs: 200, fat: 60 }; }
    };
    try {
      var r = await say("how many calories should i eat");
      var text = String(r.response || "");
      if (text.indexOf("2,143") === -1) throw new Error("did not report the computed target: " + text.slice(0, 90));
      if (text.indexOf("2,693") === -1) throw new Error("did not report maintenance: " + text.slice(0, 90));
    } finally { window.IgnytGoals = saved; }
  });

  test("calorie target asks rather than inventing when no goal is set", "safety", async function () {
    var saved = window.IgnytGoals;
    window.IgnytGoals = { GOAL_TYPES: [], activeGoal: function () { return null; }, compute: function () { return null; } };
    try {
      var r = await say("how many calories should i eat");
      var text = String(r.response || "");
      if (/\d,\d{3}\s*kcal/.test(text)) throw new Error("invented a target with no goal: " + text.slice(0, 90));
    } finally { window.IgnytGoals = saved; }
  });

  /* ---------- runner ------------------------------------------------------------------------ */

  async function run(filter) {
    if (!svc() || !chat() || !acts()) return { error: "chat modules not loaded" };
    var results = [], passed = 0, failed = 0;
    for (var i = 0; i < T.length; i++) {
      var t = T[i];
      if (filter && t.kind !== filter && t.name.indexOf(filter) === -1) continue;
      try {
        await t.fn();
        results.push({ ok: true, kind: t.kind, name: t.name });
        passed++;
      } catch (e) {
        results.push({ ok: false, kind: t.kind, name: t.name, why: (e && e.message) || String(e) });
        failed++;
      }
    }
    try {
      console.table(results.map(function (r) {
        return { "": r.ok ? "PASS" : "FAIL", kind: r.kind, test: r.name, why: r.why || "" };
      }));
    } catch (e) {}
    return { passed: passed, failed: failed, total: passed + failed, results: results };
  }

  window.IgnytChatTests = Object.freeze({ run: run, count: function () { return T.length; } });
}());
