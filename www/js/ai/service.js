/* =========================================================
   IGNYT AI — THE CLIENT SERVICE

   One turn of conversation, end to end:

     1. pick the smallest slice of the user's data this request could need
     2. POST it to the IGNYT backend, which holds the API key and calls Gemini
     3. if the model asked for tools, run them through IgnytAIActions and post the results
        back so it can answer in words
     4. hand the UI a list of things to render

   WHY CONTEXT SELECTION LIVES HERE
   The backend cannot choose what personal data is in scope, because it has no copy of it to
   choose from. That makes this file the only place the brief's "send the minimum needed for
   the current request" can actually be enforced — so it is enforced by construction: pickContext
   returns a hand-built object per topic, and there is no branch that returns everything.

   THE DESTROY GATE IS HERE, NOT IN THE PROMPT
   A model can be talked into anything; a switch statement cannot. Any action the registry
   marks "destroy" stops here and becomes a confirmation the user has to answer, no matter how
   explicit the sentence was — "delete my food log" is exactly what a misheard voice command
   produces.
========================================================= */
(function () {
  "use strict";

  var MAX_TOOL_ROUNDS = 2;   // one fetch pass, then the answer. More is a loop, not a coach.

  function apiBase() {
    return (window.IgnytConfig && IgnytConfig.apiBase && IgnytConfig.apiBase()) || window.IGNYT_API_BASE || "";
  }

  /* ---------- context selection --------------------------------------------------------
     Each branch names the fields it sends. Adding a topic means writing another small object,
     which is the point: there is no "everything" case to reach for under time pressure. */

  var TOPIC = [
    { re: /(weigh|kg|lbs|pound|scale|heavier|lighter|gain|lost)/i, keys: ["profile", "weight"] },
    { re: /(ate|eat|food|meal|calorie|protein|carb|fat|macro|breakfast|lunch|dinner|snack)/i, keys: ["profile", "food"] },
    { re: /(workout|train|exercise|session|lift|set|rep|push|pull|legs|rest day)/i, keys: ["profile", "workout"] },
    { re: /(step|walk|cardio|move)/i, keys: ["steps"] },
    { re: /(streak|score|progress|goal|target|how am i)/i, keys: ["profile", "goal", "streak"] }
  ];

  async function pickContext(message) {
    var A = window.IgnytAIActions;
    if (!A) return null;
    var wanted = {};
    TOPIC.forEach(function (t) {
      if (t.re.test(message)) t.keys.forEach(function (k) { wanted[k] = true; });
    });
    // Nothing matched: send only who they are. A question like "what is progressive overload"
    // needs no personal data at all, and sending some anyway is the habit this guards against.
    if (!Object.keys(wanted).length) wanted.profile = true;

    var ctx = {};
    if (wanted.profile) {
      var p = (await A.run("getUserProfile")).result || {};
      ctx.profile = { age: p.age, gender: p.gender, heightCm: p.heightCm,
                      weightKg: p.weightKg, targetWeightKg: p.targetWeightKg,
                      equipment: p.equipment, trainingDays: p.trainingDays };
    }
    if (wanted.weight)  ctx.weight  = (await A.run("getProgress", { days: 30 })).result;
    if (wanted.food)    ctx.food    = (await A.run("getFoodLog", {})).result;
    if (wanted.workout) ctx.workout = (await A.run("getTodayWorkout")).result;
    if (wanted.goal)    ctx.goal    = (await A.run("getGoals")).result;
    if (wanted.streak) {
      ctx.streak = (await A.run("getStreak")).result;
      ctx.score  = (await A.run("getIGNYTScore")).result;
    }
    return ctx;
  }

  /* ---------- transport ---------------------------------------------------------------- */

  async function post(body) {
    var base = apiBase();
    if (!base) {
      var e = new Error("AI isn't set up on this build yet.");
      e.code = "no_backend";
      throw e;
    }
    var headers = { "Content-Type": "application/json" };
    /* A short-lived Firebase ID token, fetched per call and never stored — auth.js is
       deliberate about not caching it, and caching it here would undo that. */
    try {
      var tok = window.IgnytAuth && IgnytAuth.getIdToken ? await IgnytAuth.getIdToken() : null;
      if (tok) headers.Authorization = "Bearer " + tok;
    } catch (e) { /* fall through: the server will answer 401 and the UI says to sign in */ }

    var res;
    try {
      res = await fetch(base + "/v1/ai/chat", { method: "POST", headers: headers, body: JSON.stringify(body) });
    } catch (e) {
      var ne = new Error("You're offline.");
      ne.code = "offline";
      throw ne;
    }
    var json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    if (!res.ok) {
      var err = new Error((json && json.error && json.error.message) || "AI is unavailable right now.");
      err.code = (json && json.error && json.error.code) || ("http_" + res.status);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  /* ---------- the turn ------------------------------------------------------------------
     onEvent is how the UI stays live rather than waiting for the whole thing: it fires for
     each action card as it happens, then once for the final text. */

  async function ask(message, opts) {
    opts = opts || {};
    var onEvent = opts.onEvent || function () {};
    var A = window.IgnytAIActions;
    var history = opts.history || [];

    var context = await pickContext(message);
    var reply = await post({ message: message, context: context, history: history });

    var rounds = 0;
    while (reply.toolCalls && reply.toolCalls.length && rounds < MAX_TOOL_ROUNDS) {
      rounds++;
      var results = [];
      for (var i = 0; i < reply.toolCalls.length; i++) {
        var call = reply.toolCalls[i];
        var risk = A.risk(call.action);

        /* THE DESTROY GATE. Nothing marked destroy runs here; it is handed back to the UI as
           a pending confirmation and the turn ends. The user answering yes calls confirm()
           below, which is the only path that executes it. */
        if (risk === "destroy") {
          onEvent({ type: "confirm", action: call.action, args: call.args });
          return { text: reply.text || null, pending: { action: call.action, args: call.args }, remaining: reply.remaining };
        }

        var out = await A.run(call.action, call.args);
        if (out.ok && out.result && out.result.card && out.result.card !== "clarify") {
          onEvent({ type: "card", action: call.action, result: out.result });
        } else if (out.ok && out.result && out.result.card === "clarify") {
          onEvent({ type: "clarify", action: call.action, result: out.result });
        } else if (!out.ok) {
          onEvent({ type: "actionError", action: call.action, error: out.error });
        }
        results.push({ action: call.action, ok: !!out.ok, result: out.ok ? out.result : { error: out.error } });
      }

      /* Second pass: the model reads what actually happened and writes the sentence. This is
         the same user turn, so the server does not charge it against the daily allowance. */
      reply = await post({ message: message, context: null, history: history, toolResults: results });
    }

    if (reply.text) onEvent({ type: "text", text: reply.text });
    return { text: reply.text || null, remaining: reply.remaining };
  }

  /** Run a previously-gated destructive action. Only reached after the user says yes. */
  async function confirm(pending, opts) {
    opts = opts || {};
    var onEvent = opts.onEvent || function () {};
    var out = await window.IgnytAIActions.run(pending.action, pending.args);
    if (out.ok) onEvent({ type: "card", action: pending.action, result: out.result });
    else onEvent({ type: "actionError", action: pending.action, error: out.error });
    return out;
  }

  window.IgnytAIService = Object.freeze({
    ask: ask,
    confirm: confirm,
    /* Exposed for tests: what would be sent for this sentence, without sending it. */
    pickContext: pickContext,
    configured: function () { return !!apiBase(); }
  });
})();
