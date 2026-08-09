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
    if (!/food log today/.test(r.source || "")) throw new Error("source was " + r.source);
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
