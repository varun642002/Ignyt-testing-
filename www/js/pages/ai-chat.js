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

  /* Under the input. Deliberately verbs, not topics — a button that says "Nutrition" makes
     the user compose a sentence; one that says "Log food" is already the sentence. */
  var QUICK = [
    { label: "Today's plan", icon: "barbell",  say: "What should I train today?" },
    { label: "Log food",     icon: "plate",    say: "Log food" },
    { label: "Log weight",   icon: "scale",    say: "Log my weight" },
    { label: "My progress",  icon: "trend",    say: "How is my progress?" },
    { label: "Recovery",     icon: "moon",     say: "How is my recovery?" }
  ];

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
        body = '<div class="aic-card__big">' + esc(r.what || "") + '</div>';
        break;
      default:
        return "";
    }
    return '<div class="aic-card"><div class="aic-card__head">' + ic(icon, 15) +
           '<span>' + title + '</span></div>' + body + '</div>';
  }

  /* ---------- transcript ------------------------------------------------------------- */

  function bubble(e) {
    if (e.role === "user") return '<div class="aic-msg aic-msg--me">' + esc(e.text) + '</div>';
    if (e.role === "assistant") return '<div class="aic-msg aic-msg--ai">' + esc(e.text) + '</div>';
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

    var empty = !chat.length;
    var hour = new Date().getHours();
    var greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    var name = (st.profile && st.profile.name) ? st.profile.name : null;

    return '<div class="pg-light aic">' +
      '<div class="aic-head"><div class="aic-head__title">IGNYT AI</div>' +
        '<div class="aic-head__sub">Your coach. Ask, or just tell it what you did.</div></div>' +

      '<div class="aic-scroll" id="ai-scroll">' +
        (empty
          ? '<div class="aic-hello"><div class="aic-hello__greet">' + greet + (name ? ", " + esc(name) : "") + '</div>' +
            '<div class="aic-hello__sub">What can I help with?</div></div>'
          : chat.map(bubble).join("")) +
        (st.aiBusy ? '<div class="aic-typing" aria-label="Thinking"><i></i><i></i><i></i></div>' : '') +
      '</div>' +

      '<div class="aic-quick">' + QUICK.map(function (q) {
        return '<button class="aic-chip" data-ai-say="' + esc(q.say) + '">' + ic(q.icon, 13) +
               '<span>' + q.label + '</span></button>';
      }).join("") + '</div>' +

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
