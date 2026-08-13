/* =========================================================
   IGNYT AI — the chat screen

   Renders from a transcript array held in state.aiChat. Every turn appends entries; the
   screen is a pure function of that array, which is why retry works by re-sending the last
   user entry rather than by unpicking half-applied UI.

   AN ACTION CARD IS NOT A CHAT BUBBLE. When the AI logs a weight the useful artefact is the
   number and the date, not a sentence saying it happened — so a card renders the fact and the
   model's words sit under it, short. That is the brief's §17, and it is also why the cards
   read from the ACTION RESULT rather than from the model's text: the card states what the app
   actually did, which is not always what the model said it did.
========================================================= */
(function () {
  "use strict";
  window.IgnytPages = window.IgnytPages || {};

  var ic = function (n, s) { return (typeof svg === "function") ? svg(n, s || 16) : ""; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };

  /* The preset chips are gone. Two of the five -- Log food, Log weight -- told people to ask
     for something the chat stopped doing when logging moved to the screens, so the suggestions
     were advertising a refusal. The rest set the expectation that this is a menu of five
     things, when it answers eleven and a half thousand questions. */

  /* ---------- action cards ---------------------------------------------------------- */

  function card(entry) {
    var r = entry.result || {};
    var body, icon, title;
    switch (r.card) {
      case "weight":
        icon = "scale"; title = "Weight logged";
        body = '<div class="aic-card__big">' + r.weightKg + ' kg</div>' +
               /* A zero delta is not information — re-logging the same number rendered
                  "· 0 kg", which reads like a measurement rather than "nothing changed". */
               '<div class="aic-card__sub">' + esc(r.date) +
               (r.deltaKg ? ' · ' + (r.deltaKg > 0 ? "+" : "") + r.deltaKg + ' kg' : '') + '</div>' +
               (r.note ? '<div class="aic-card__note">' + esc(r.note) + '</div>' : '');
        break;
      case "food":
        icon = "plate"; title = r.updated ? "Food updated" : "Food added";
        body = '<div class="aic-card__big">' + Math.round(r.kcal || 0) + ' kcal</div>' +
               '<div class="aic-card__sub">' + (r.protein != null ? r.protein + 'g protein' : '') +
               (r.added && r.added[0] ? ' · ' + esc(r.added[0].name) + ' ' + r.added[0].grams + 'g'
                                      : (r.name ? ' · ' + esc(r.name) + ' ' + r.grams + 'g' : '')) + '</div>';
        break;
      case "workout":
        icon = "flame"; title = "Workout complete";
        body = '<div class="aic-card__big">' + (r.streak != null ? r.streak + ' day streak' : 'Saved') + '</div>' +
               (r.prs ? '<div class="aic-card__sub">' + r.prs + ' new PR' + (r.prs > 1 ? 's' : '') + '</div>' : '');
        break;
      case "steps":
        icon = "footprints"; title = "Steps";
        body = '<div class="aic-card__big">' + Number(r.steps || 0).toLocaleString() + '</div>' +
               '<div class="aic-card__sub">' + (r.source === "health-connect" ? "From Health Connect" : "Logged") + '</div>' +
               (r.note ? '<div class="aic-card__note">' + esc(r.note) + '</div>' : '');
        break;
      case "deleted":
        icon = "trash"; title = "Removed";
        /* FIVE OF THE SEVEN DELETE ACTIONS NEVER SET `what`. Only deleting a routine or a named
           food does; deleting a day, a meal, a weight entry or the whole log returns a message
           and no `what`, so this rendered the word "Removed" above an empty box -- which is
           exactly what the device showed after "delete all the logged foods today". The message
           already says what went, and it is the only field every one of them sets. */
        body = '<div class="aic-card__big">' + esc(r.what || r.message || "Done") + '</div>';
        break;
      case "food_batch":
        /* SEVERAL FOODS AT ONCE. Without this the batch fell to the default below and rendered
           NOTHING: the entries went into the log, the daily total updated, and the chat said not
           a word -- reported from a device as "it cannot log multiple foods" when in fact it had
           logged them and simply not admitted to it. */
        icon = "plate"; title = "Food added";
        body = '<div class="aic-card__big">' + Math.round(r.kcal || 0) + ' kcal</div>' +
               '<div class="aic-card__sub">' + esc((r.logged || []).join(", ")) + '</div>' +
               (r.dayTotals ? '<div class="aic-card__note">Today: ' +
                  Number(r.dayTotals.kcal || 0).toLocaleString() + ' kcal, ' +
                  (r.dayTotals.protein || 0) + 'g protein</div>' : '') +
               ((r.failed && r.failed.length)
                  ? '<div class="aic-card__note">Not found: ' + esc(r.failed.join(", ")) + '</div>' : '');
        break;
      default:
        /* A CARD THIS SCREEN DOES NOT KNOW STILL HAS SOMETHING TO SAY. Returning "" meant every
           card type added since this switch was written -- the batch log, the protein and calorie
           targets, the weekly summary, the nutrition lookup, the "I need your weight first" reply
           -- displayed as complete silence. The action ran, the answer existed, and the user saw
           nothing. Any card carrying a message now renders it as plain text rather than vanishing;
           only a card with nothing to say returns nothing. */
        if (r && r.message) {
          /* Rendered through the card shell this file already owns -- an earlier draft of this
             invented two class names that exist in no stylesheet, which would have shipped as
             unstyled text. */
          icon = "info"; title = "IGNYT";
          body = '<div class="aic-card__sub">' + esc(r.message) + '</div>';
          break;
        }
        return "";
    }
    return '<div class="aic-card"><div class="aic-card__head">' + ic(icon, 15) +
           '<span>' + title + '</span></div>' + body + '</div>';
  }

  /* ---------- transcript ------------------------------------------------------------- */

  function bubble(e) {
    if (e.role === "user") return '<div class="aic-msg aic-msg--me">' + esc(e.text) + '</div>';
    if (e.role === "assistant") {
      /* A speaker only on answers worth hearing. Below ~40 characters ("Logged.", "You're on a
         3 day streak.") the button is slower to find and press than the sentence is to read,
         so it would be decoration. It is also omitted entirely where the device has no
         synthesiser rather than rendering a control that does nothing — the same rule the
         microphone follows. */
      var speakable = window.IgnytVoice && IgnytVoice.canSpeak() && String(e.text || "").length > 40;
      return '<div class="aic-msg aic-msg--ai">' + esc(e.text) +
        (speakable
          ? '<button class="aic-speak" data-ai-speak="' + esc(e.text) + '" ' +
              'aria-label="Read this answer aloud">' + ic("speaker", 15) + '</button>'
          : '') +
      '</div>';
    }
    if (e.role === "card") return card(e);
    if (e.role === "clarify") {
      var r = e.result || {};
      return '<div class="aic-msg aic-msg--ai">' + esc(r.message || "Could you be more specific?") + '</div>' +
             (r.suggestGrams ? '<div class="aic-quick aic-quick--inline">' +
               '<button class="aic-chip" data-ai-say="' + esc(r.food + " " + r.suggestGrams + "g") + '">' +
               r.suggestGrams + 'g</button></div>' : '');
    }
    if (e.role === "confirm") {
      return '<div class="aic-confirm"><div class="aic-confirm__q">' + esc(e.text) + '</div>' +
             '<div class="aic-confirm__row">' +
             '<button class="rh-btn rh-btn--ghost" data-ai-confirm="no">Cancel</button>' +
             '<button class="rh-btn rh-btn--danger" data-ai-confirm="yes">Delete</button></div></div>';
    }
    if (e.role === "error") {
      return '<div class="aic-error">' + ic("alert", 15) + '<span>' + esc(e.text) + '</span>' +
             '<button class="aic-retry" data-ai-retry="1">Try again</button></div>';
    }
    return "";
  }

  /* ---------- the daily companion ------------------------------------------------------
     One line on the empty screen, built from what is actually true right now: a session in
     progress, a planned day, a live streak, or nothing logged yet.

     IT DOES NOT INVENT A GREETING PER VISIT. The brief asks for a companion and warns against
     spam in the same breath, and those pull in opposite directions unless the line is tied to
     STATE rather than to time — "Push day. Ready?" is worth reading once and irritating on the
     fourth visit before lunch, so it changes when the day does, not when the screen opens.

     Tone comes from IgnytMessages, which already keeps a per-context list of recently-shown
     lines in localStorage. Rolling a second dedupe here would mean two systems disagreeing
     about what the user has already read today. */
  function companion(st) {
    var A = window.IgnytAIActions;
    if (!A) return null;

    if (st.session) {
      var n = (st.session.exercises || []).length;
      return { line: "Workout in progress — " + n + " exercise" + (n === 1 ? "" : "s") + ".",
               say: "I finished my workout" , cta: "Finish it" };
    }
    var planned = (typeof todaysPlannedDay === "function") ? todaysPlannedDay() : null;
    if (planned && planned.session) {
      return { line: "Today: " + planned.session + ".", say: "What should I train today?", cta: "Show me" };
    }
    var streak = (typeof computeStreak === "function") ? computeStreak() : 0;
    if (streak > 0) {
      return { line: streak + " day streak. Keep it going.", say: "What should I train today?", cta: "Today's plan" };
    }
    var logged = (st.foodLog || []).filter(function (f) {
      return f && f.date === (typeof todayStr === "function" ? todayStr() : "");
    }).length;
    if (!logged) return { line: "Nothing logged yet today.", say: "Log food", cta: "Log food" };
    return null;
  }

  window.IgnytPages.renderAIChat = function (ctx) {
    var st = ctx.state;
    var chat = st.aiChat || [];

    /* GATED THROUGH THE EXISTING SEAM, not a bespoke check. Whatever entitlements.js decides
       for "coach" is what happens here, so turning gating on or off stays a one-file change. */
    var allowed = !window.IgnytEntitlements || !IgnytEntitlements.has || IgnytEntitlements.has("coach");
    if (!allowed) {
      return '<div class="pg-light aic"><div class="pg-card aic-locked">' +
        '<div class="aic-locked__icon">' + ic("lock", 26) + '</div>' +
        '<div class="aic-locked__title">IGNYT AI</div>' +
        '<div class="aic-locked__sub">Your AI coach is part of IGNYT Pro.</div>' +
        '<button class="rh-btn rh-btn--primary" data-action="open-paywall">See Pro</button>' +
        '</div></div>';
    }

    var u = st.aiUsage;
    var empty = !chat.length;
    var hour = new Date().getHours();
    var greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    var name = (st.profile && st.profile.name) ? st.profile.name : null;

    return '<div class="pg-light aic">' +
      '<div class="aic-head">' +
        '<div class="aic-head__row">' +
          '<div class="aic-head__title">IGNYT AI</div>' +
          /* Quiet by default and only loud when it matters. A counter that shouts from the
             first message trains people to feel metered; one that stays grey until three are
             left is information rather than pressure. The number is SERVER-REPORTED and is
             display only — the count that governs anything lives in the database, so clearing
             storage changes what is shown here and nothing else. */
          /* THE DAILY COUNTER IS HIDDEN WHILE EXTERNAL AI IS OFF, because there is no longer
             anything to count. Every answer now comes from the device — the knowledge base,
             the intent router, the action registry — and none of it costs anything or has a
             cap. Showing "3 / 15 today" would advertise a limit the user cannot reach and
             would make a free assistant feel rationed.
             It returns automatically with the API: the counter is driven by the same usage
             object the server sends, so nothing here needs changing when that is switched on. */
          ((u && window.IgnytAIService && IgnytAIService.usesExternalAI && IgnytAIService.usesExternalAI())
            ? '<span class="aic-usage' + (u.remaining_today <= 0 ? ' is-spent'
                                        : u.remaining_today <= 3 ? ' is-low' : '') + '">' +
                 u.used_today + ' / ' + u.daily_limit + ' today</span>' : '') +
          /* CLEAR THE TRANSCRIPT. There was no way to, and errors live in it permanently —
             so a failure from days ago sits on screen looking like a live one, and a fixed
             app still reads as broken. That is not a cosmetic problem: it is the difference
             between "the AI is down" and "the AI was down once", which is exactly the
             question a support conversation turns on.
             Only shown when there is something to clear. */
          (chat.length ? '<button class="aic-clear" data-ai-clear="1" ' +
             'aria-label="Clear chat history">' + ic("trash", 15) + '</button>' : '') +
        '</div>' +
        '<div class="aic-head__sub">' +
          (u && u.remaining_today <= 0
            ? 'Your AI Coach resets tomorrow.'
            : 'Your coach. Ask, or just tell it what you did.') +
        '</div></div>' +

      '<div class="aic-scroll" id="ai-scroll">' +
        (empty
          ? (function () {
              var c = companion(st);
              return '<div class="aic-hello">' +
                '<div class="aic-hello__greet">' + greet + (name ? ", " + esc(name) : "") + '</div>' +
                (c ? '<div class="aic-hello__line">' + esc(c.line) + '</div>'
                   : '<div class="aic-hello__sub">What can I help with?</div>') +
              '</div>';
            })()
          : chat.map(bubble).join("")) +
        (st.aiBusy ? '<div class="aic-typing" aria-label="Thinking"><i></i><i></i><i></i></div>' : '') +
      '</div>' +


      '<div class="aic-bar">' +
        '<button class="aic-mic' + (st.aiListening ? ' is-live' : '') + '" data-ai-mic="1" ' +
          'aria-label="' + (st.aiListening ? 'Stop listening' : 'Speak') + '">' + ic("mic", 18) + '</button>' +
        '<input id="ai-input" class="aic-input" type="text" enterkeyhint="send" ' +
          'placeholder="' + (st.aiListening ? 'Listening…' : 'Ask or tell IGNYT…') + '" ' +
          'value="" autocomplete="off">' +
        '<button class="aic-send" data-ai-send="1" aria-label="Send">' + ic("check", 18) + '</button>' +
      '</div>' +
    '</div>';
  };
})();
