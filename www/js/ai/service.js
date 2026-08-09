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

  /* EXTERNAL AI IS OFF. Version one ships as a purely on-device assistant: the knowledge base,
     the intent router and the action registry, with no Gemini, no network call, and no daily
     limit — because nothing here costs anything to answer.
     ONE SWITCH, and the whole Gemini stack below it is intact and untouched: the two-pass tool
     loop, the cold-start retry, the usage accounting, the server that holds the key. Flipping
     this back to true restores all of it, which is why it was gated rather than deleted —
     "add the API later" should be one line, not a rebuild.
     The server agrees independently: AI_REQUIRES_PREMIUM is false and the route still enforces
     its own limit, so turning this on does not bypass anything. */
  var EXTERNAL_AI = false;

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

    /* TODAY'S DATE GOES ON EVERY REQUEST, and it comes from the DEVICE.
       A model has no clock. Asked to log something "yesterday" it invents a plausible date
       from whenever it believes now is — live testing produced 2025-04-09 for yesterday when
       the real date was 2026-08-08. The server's own date would mostly work, but it is the
       wrong clock: a user in Auckland logging breakfast is a day ahead of a server in
       Virginia, and "today" has to mean their today. It is four extra tokens. */
    var ctx = { today: (typeof todayStr === "function") ? todayStr() : new Date().toISOString().slice(0, 10) };
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

    /* COLD STARTS, WHICH ARE NOT THE USER BEING OFFLINE.
       The backend runs on a free Render instance: it sleeps after ~15 minutes idle and takes
       30-60s to wake. The first message after any quiet spell therefore hits a stalled socket,
       and this used to report "You're offline." — blaming the user's connection for the
       server's nap, which is both wrong and unactionable. It is the single most likely reason
       the AI appears to fail intermittently.

       So: a real timeout rather than the WebView's default, and ONE retry. A cold instance
       answers the second attempt because the first is what woke it, which is why the retry is
       worth more here than the usual "retries paper over bugs" objection allows. Only one, and
       only for a genuine connection failure — never for an HTTP error, which is the server
       answering and must not be sent twice, and never for a timeout on the retry itself. */
    var COLD_START_MS = 75000;
    async function attempt(ms) {
      var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms) : null;
      try {
        return await fetch(base + "/v1/ai/chat", {
          method: "POST", headers: headers, body: JSON.stringify(body),
          signal: ctl ? ctl.signal : undefined
        });
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    var res;
    try {
      res = await attempt(COLD_START_MS);
    } catch (e1) {
      try {
        res = await attempt(COLD_START_MS);
      } catch (e2) {
        /* Now say which it actually was. navigator.onLine is only trustworthy when it says
           FALSE — a true reading means a network interface exists, not that anything is
           reachable — so it is used only to confirm the offline case, never to rule it out. */
        var offline = (typeof navigator !== "undefined" && navigator.onLine === false);
        var ne = new Error(offline
          ? "You're offline. The chatbot still works without a connection."
          : "The AI server didn't respond. It may be waking up — try again in a moment.");
        ne.code = offline ? "offline" : "unreachable";
        throw ne;
      }
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

    /* THE LOCAL CHATBOT GETS FIRST REFUSAL.
       "what's my streak" and "log 200g chicken" are mechanical: the sentence names the action.
       Sending those to Gemini costs a network round trip, one of fifteen daily messages, and
       fails entirely on a train — for an answer that js/ai/local-chat.js produces offline in
       about a millisecond from the same actions registry.

       It is a strict filter, not a first guess: it returns null for anything it cannot prove
       it understands, and null falls through to the model below with the message untouched.
       That ordering is what makes it safe to put a pattern matcher in front of a language
       model — the worst case is the behaviour we had before it existed.

       Skipped when the caller is resuming a conversation, because a follow-up like "and the
       day before?" only means something in the context of the previous turns, which patterns
       cannot see and the model can. */
    /* The history guard applies ONLY when there is somewhere to fall through to. With external
       AI off there is not, so local has to answer every message including follow-ups —
       skipping it would send a mid-conversation reply nowhere at all. */
    if ((EXTERNAL_AI ? !history.length : true) && window.IgnytLocalChat) {
      var local = null;
      try { local = await window.IgnytLocalChat.tryAnswer(message); } catch (e) { local = null; }
      if (local) {
        if (local.pending) {
          /* THE ACTION HAS TO ACTUALLY RUN. This emitted { type:"pending" }, and nothing in
             app.js handles that event — its push() knows text, card, clarify, confirm, usage
             and actionError. So the event was dropped on the floor: no execution, no card, no
             error, just silence. Every local write has been a no-op since external AI was
             switched off — logging food, logging weight, steps, all four deletes. Reported as
             answering "97." to "What weight should I log?" and getting nothing back.

             It went unseen because every test asserted on the PENDING PAYLOAD — the right
             action with the right arguments — which was correct the whole time. Fifth bug in
             this codebase from checking that a message routed rather than that data changed.

             Destroy-tier still stops for confirmation, using the "confirm" event the UI already
             understands; the destroy gate is unchanged. Everything else executes here and
             reports what came back. */
          var risk = A && A.risk ? A.risk(local.pending.action) : null;
          if (risk === "destroy") {
            onEvent({ type: "confirm", action: local.pending.action, args: local.pending.args });
            return { text: local.text || null, pending: local.pending, source: local.source };
          }
          var res = await A.run(local.pending.action, local.pending.args || {});
          if (res && res.ok) onEvent({ type: "card", result: res.result });
          else onEvent({ type: "actionError", action: local.pending.action,
                         error: (res && res.error) || "That didn't work." });
          return { text: local.text || null, action: local.pending.action,
                   result: res && res.result, ok: !!(res && res.ok), source: local.source };
        }
        /* CONFIDENCE IS CARRIED THROUGH, not re-derived. It was being dropped here, and the
           caller then had to invent a value — which defaulted to 1.0, so a weak match was
           reported as certain. In a router whose every decision is a confidence threshold,
           a fabricated confidence is worse than no confidence at all. */
        onEvent({ type: "text", text: local.text });
        return { text: local.text, source: local.source, confidence: local.confidence };
      }
    }

    /* NOTHING LOCAL MATCHED, AND THERE IS NO FALLBACK. Say so plainly and point at what this
       assistant can actually do.

       This replaces a much worse ending. The unmatched path used to continue into the network
       call below, which with no backend configured throws — so a perfectly reasonable question
       produced "AI is unavailable right now", an ERROR, in red, for something the user asked in
       good faith. A chatbot that says "I don't know that one yet, but here's what I can do"
       reads as a product; one that reports an outage reads as broken. Nothing failed here —
       the question was simply outside what the knowledge base covers. */
    if (!EXTERNAL_AI) {
      /* In the user's own language. This is the single string they are most likely to see when
         the assistant does not know something, so getting it in English after asking in Tamil
         is exactly the point where a multilingual assistant stops feeling multilingual. */
      var lang = (window.IgnytLang && IgnytLang.languageFor) ? IgnytLang.languageFor(message) : "en";
      var msg = (window.IgnytLang && IgnytLang.t)
        ? IgnytLang.t("unknown", lang)
        : "I don't have a reliable answer for that yet.";
      onEvent({ type: "text", text: msg });
      return { text: msg, source: "BUILT_IN_UNKNOWN", confidence: 0 };
    }

    var context = await pickContext(message);
    /* The device's own zone decides when the daily allowance rolls over. Sent rather than
       inferred server-side because the server's midnight is not the user's. */
    var tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) {}
    var reply = await post({ message: message, context: context, history: history, timezone: tz });

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
      reply = await post({ message: message, context: null, history: history, toolResults: results, timezone: tz });
    }

    if (reply.usage) onEvent({ type: "usage", usage: reply.usage });
    if (reply.text) onEvent({ type: "text", text: reply.text });
    return { text: reply.text || null, remaining: reply.remaining, usage: reply.usage };
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

  /* ---------- the one entry point -------------------------------------------------------
     processChatMessage() is the shape the chatbot brief specifies: one call in, one described
     result out, with WHY it answered as it did rather than only the text.

     It wraps ask() rather than replacing it. ask() is event-driven because the chat screen
     renders action cards as they happen; this is the flat, inspectable view of the same turn —
     what a test asserts on, what analytics record, and what a future caller (voice, a widget,
     a shortcut) can use without knowing anything about onEvent.

     `source` is the honest field: BUILT_IN_ACTION, BUILT_IN_KNOWLEDGE, BUILT_IN_UNKNOWN or
     GEMINI_FALLBACK. It is deliberately not shown to users — it is how you tell a knowledge
     answer from a guess when something looks wrong. */
  async function processChatMessage(message, opts) {
    opts = opts || {};
    var out;
    try {
      out = await ask(message, opts);
    } catch (e) {
      return {
        intent: "ERROR", language: "en", confidence: 0, entities: {},
        requiresFollowUp: false, response: (e && e.message) || "Something went wrong.",
        action: null, data: null, source: "ERROR", error: (e && e.code) || "unknown"
      };
    }

    var src = out.source || "";
    /* A pending action is the follow-up case: nothing has been written yet and the turn is
       waiting on the user to confirm. Naming it here means a caller does not have to infer
       it from the presence of a field. */
    /* An EXECUTED write returns { action, result, ok } and no pending — pending now means only
       "waiting on a confirmation". Reading pending alone left `action` null on every write that
       actually ran, so the one field a caller checks to see what happened was empty precisely
       when something had. */
    var pending = out.pending || null;
    var ran = !pending && out.action ? out.action : null;

    return {
      intent: pending ? pending.action
            : ran ? ran
            : src.indexOf("BUILT_IN_ACTION") === 0 ? src.split(":")[1] || "ACTION"
            : src === "BUILT_IN_KNOWLEDGE" ? "KNOWLEDGE"
            : src === "BUILT_IN_UNKNOWN" ? "UNKNOWN"
            : "ANSWER",
      /* The real detected language, not a placeholder. Read from the router, which set it
         from the ORIGINAL text before canonicalisation erased the script. */
      language: (window.IgnytLocalChat && IgnytLocalChat.lastLanguage)
                  ? IgnytLocalChat.lastLanguage() : "en",
      /* null, not 1, when the layer did not report one. An action match is a parse, not a
         similarity score, and claiming 1.0 for it would put a number on something that was
         never measured. */
      confidence: out.confidence != null ? out.confidence : null,
      entities: pending ? (pending.args || {}) : {},
      /* True only when the action ran AND reported success — never inferred from the
         absence of an error, which is how a failed write gets reported as a done one. */
      ok: pending ? null : (out.ok === true),
      requiresFollowUp: !!pending,
      response: out.text || null,
      action: pending ? pending.action : ran,
      data: out.result || out.card || null,
      source: src || "UNKNOWN"
    };
  }

  window.IgnytAIService = Object.freeze({
    ask: ask,
    confirm: confirm,
    processChatMessage: processChatMessage,
    /* Whether anything would leave the device. False in version one. */
    usesExternalAI: function () { return EXTERNAL_AI; },
    /* Exposed for tests: what would be sent for this sentence, without sending it. */
    pickContext: pickContext,
    configured: function () { return !EXTERNAL_AI || !!apiBase(); }
  });
})();
