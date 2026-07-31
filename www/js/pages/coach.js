/* =========================================================
   MY COACH  —  window.IgnytCoachPage

   The screen for everything js/trainer-sync.js does: connect to a coach, see what they have
   assigned, answer check-ins, and message them.

   Reached from Tools > My Coach (state.tab === "coach"). Follows the same shape as
   js/goals.js — { render, attach }, one delegated click listener bound once, guarded on the
   active tab — so it plugs into app.js's existing dispatch with no new machinery.

   RENDER MODEL. app.js owns rendering: it sets main.innerHTML from render() and then calls
   attachHandlers(), which calls attach() here. So this file never touches the DOM directly
   except to READ input values at submit time. It deliberately does not re-render on input —
   a repaint mid-typing would replace the field and drop focus and the caret, which is how a
   message composer becomes unusable.

   NETWORK. Check-ins and the message thread are fetched, not stored, so this module keeps a
   small in-memory cache and a per-section loading flag. Nothing here retries on its own; a
   failed fetch shows what went wrong and offers the button again. IgnytTrainerSync never
   throws, so every call site below handles a result object rather than an exception.
========================================================= */
(function () {
  "use strict";

  var _bound = false;

  /* Screen + transient form state. Deliberately NOT persisted: a half-typed check-in is not
     something to restore three days later, and localStorage is the app's data store, not its
     scratch space. */
  var view = { screen: "home", checkInId: null, error: null, busy: false };

  /* Fetched data. `null` means "not loaded yet", which is a different thing from `[]`
     ("loaded, nothing there") — the empty state and the spinner must not share a condition. */
  var data = { checkIns: null, messages: null };

  function sync() { return window.IgnytTrainerSync || null; }
  function repaint() { if (typeof window.render === "function") window.render(); }

  function esc(value) {
    return typeof window.escHtml === "function"
      ? window.escHtml(String(value == null ? "" : value))
      : String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
  }

  function icon(name, size) {
    return typeof window.svg === "function" ? window.svg(name, size || 18) : "";
  }

  function relativeTime(value) {
    if (!value) return "never";
    var then = typeof value === "number" ? value : Date.parse(value);
    if (!isFinite(then)) return "never";
    var mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + " min ago";
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
    var days = Math.round(hours / 24);
    if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
    return new Date(then).toLocaleDateString("default", { day: "numeric", month: "short" });
  }

  function dayLabel(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" });
  }

  /* ---------------------------------------------------------------- shared chrome */

  function backButton(target) {
    return '<button class="rh-btn rh-btn--ghost cs-back" data-coach="' + target + '">← Back</button>';
  }

  function errorBanner() {
    if (!view.error) return "";
    return '<div class="cs-banner cs-banner--error">' + icon("info", 15) +
           '<span>' + esc(view.error) + '</span></div>';
  }

  function header(title, subtitle) {
    return '<div class="pg-header">' +
             '<div class="pg-header__title">' + esc(title) + '</div>' +
             (subtitle ? '<div class="pg-header__sub">' + esc(subtitle) + '</div>' : "") +
           '</div>';
  }

  /* ================================================================ not connected */

  function renderConnect() {
    return '' +
      '<div class="pg-light">' +
        header("My Coach", "Connect to your trainer with a code") +
        errorBanner() +

        '<div class="pg-card cs-hero">' +
          '<span class="cs-hero__icon">' + icon("link", 26) + '</span>' +
          '<div class="cs-hero__title">Train with a coach</div>' +
          '<div class="cs-hero__text">' +
            'If a trainer is coaching you, they can send workouts and meal plans straight to ' +
            'this app. Everything you log here goes back to them, so your check-ins and ' +
            'progress are already there when you next speak.' +
          '</div>' +
        '</div>' +

        '<div class="pg-card cs-connect">' +
          '<label class="cs-label" for="cs-code">Connection code</label>' +
          '<input id="cs-code" class="pi-input cs-code-input" type="text" inputmode="latin" ' +
            'autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="9" ' +
            'placeholder="ABCD1234" aria-describedby="cs-code-help" />' +
          '<div id="cs-code-help" class="cs-help">' +
            'Eight characters. Your coach can generate one from their dashboard.' +
          '</div>' +
          '<button class="btn btn-accent cs-connect__btn" data-coach="link"' +
            (view.busy ? " disabled" : "") + '>' +
            (view.busy ? "Connecting…" : "Connect") +
          '</button>' +
        '</div>' +

        '<div class="cs-note">' +
          'Your coach only sees what this app already records — workouts, food, measurements ' +
          'and check-ins. You can disconnect at any time.' +
        '</div>' +
      '</div>';
  }

  /* ================================================================ connected home */

  function renderHome() {
    var api = sync();
    var status = api.getStatus();
    var link = api.getLink() || {};
    var targets = api.getTargets();
    var plans = api.getMealPlans();
    var schedule = api.getSchedule();

    var coachRoutines = 0;
    try {
      coachRoutines = (window.state && Array.isArray(state.routines) ? state.routines : [])
        .filter(api.isCoachRoutine).length;
    } catch (e) { coachRoutines = 0; }

    var pending = data.checkIns === null ? null : data.checkIns.length;
    var lastError = status.lastError;

    return '' +
      '<div class="pg-light">' +
        header("My Coach", link.organizationName || "Connected") +
        errorBanner() +

        /* --- who --- */
        '<div class="pg-card cs-coach">' +
          '<span class="cs-coach__avatar">' + icon("profile", 22) + '</span>' +
          '<div class="cs-coach__body">' +
            '<div class="cs-coach__name">' + esc(link.coachName || "Your coach") + '</div>' +
            '<div class="cs-coach__org">' + esc(link.organizationName || "") + '</div>' +
          '</div>' +
          '<span class="cs-chip cs-chip--ok">' + icon("check", 12) + ' Connected</span>' +
        '</div>' +

        /* --- sync --- */
        '<div class="pg-card cs-sync">' +
          '<div class="cs-sync__row">' +
            '<div>' +
              '<div class="cs-sync__label">Last synced</div>' +
              '<div class="cs-sync__value">' + esc(relativeTime(status.lastSyncAt)) + '</div>' +
            '</div>' +
            '<button class="rh-btn rh-btn--ghost cs-sync__btn" data-coach="sync"' +
              (view.busy ? " disabled" : "") + '>' +
              icon("repeat", 15) + (view.busy ? " Syncing…" : " Sync now") +
            '</button>' +
          '</div>' +
          (lastError
            ? '<div class="cs-banner cs-banner--warn">' + icon("info", 14) +
              '<span>' + esc(lastError.message) + '</span></div>'
            : "") +
        '</div>' +

        /* --- what they have assigned --- */
        '<div class="rh-section-head"><span>From your coach</span></div>' +
        '<div class="cs-grid">' +
          tile("check", "Check-ins",
               pending === null ? "Loading…" : (pending ? pending + " waiting for you" : "Nothing due"),
               "checkins", pending) +
          tile("mail", "Messages", "Talk to your coach", "messages", 0) +
          tile("dumbbell", "Workouts",
               coachRoutines ? coachRoutines + " assigned" : "None assigned",
               coachRoutines ? "workouts" : null, 0) +
          tile("nutrition", "Meal plan",
               plans.length ? esc(plans[0].name || "Assigned") : "None assigned",
               plans.length ? "plan" : null, 0) +
        '</div>' +

        renderTargets(targets) +
        renderSchedule(schedule) +

        '<div class="rh-section-head"><span>Connection</span></div>' +
        '<button class="pg-card cs-danger" data-coach="unlink">' +
          '<span class="cs-danger__icon">' + icon("signout", 17) + '</span>' +
          '<div class="cs-danger__body">' +
            '<div class="cs-danger__title">Disconnect from coach</div>' +
            '<div class="cs-danger__desc">Removes their assigned plans. Your own routines, ' +
              'workouts and history stay exactly as they are.</div>' +
          '</div>' +
        '</button>' +
      '</div>';
  }

  function tile(iconName, label, sub, action, badge) {
    var disabled = !action;
    return '<button class="cs-tile' + (disabled ? " is-empty" : "") + '"' +
      (action ? ' data-coach="' + action + '"' : " disabled") + '>' +
      '<span class="cs-tile__icon">' + icon(iconName, 18) + '</span>' +
      (badge ? '<span class="cs-tile__badge">' + badge + '</span>' : "") +
      '<span class="cs-tile__label">' + esc(label) + '</span>' +
      '<span class="cs-tile__sub">' + sub + '</span>' +
    '</button>';
  }

  function renderTargets(targets) {
    if (!targets) return "";
    var rows = [
      ["Calories", targets.calories, "kcal"],
      ["Protein", targets.protein, "g"],
      ["Carbs", targets.carbs, "g"],
      ["Fat", targets.fat, "g"],
      ["Water", targets.water, "ml"]
    ].filter(function (r) { return r[1] != null; });

    if (!rows.length) return "";

    return '<div class="rh-section-head"><span>Your daily targets</span></div>' +
      '<div class="pg-card cs-targets">' +
        rows.map(function (r) {
          return '<div class="cs-target">' +
            '<div class="cs-target__value">' + esc(r[1]) + '<span>' + r[2] + '</span></div>' +
            '<div class="cs-target__label">' + esc(r[0]) + '</div>' +
          '</div>';
        }).join("") +
      '</div>' +
      /* Said plainly because the app computes its own targets elsewhere, and two different
         numbers on two screens with no explanation is worse than either number alone. */
      '<div class="cs-note">Set by your coach. The app\'s own calculator is unchanged and ' +
        'still uses your macro split from Nutrition.</div>';
  }

  function renderSchedule(schedule) {
    if (!schedule || !schedule.length) return "";
    var upcoming = schedule.slice(0, 5);
    return '<div class="rh-section-head"><span>Scheduled sessions</span></div>' +
      '<div class="pg-card cs-schedule">' +
        upcoming.map(function (s) {
          var done = s.status === "completed";
          return '<div class="cs-sched' + (done ? " is-done" : "") + '">' +
            '<span class="cs-sched__dot"></span>' +
            '<div class="cs-sched__body">' +
              '<div class="cs-sched__name">' + esc(s.name) + '</div>' +
              '<div class="cs-sched__date">' + esc(dayLabel(s.date)) + '</div>' +
            '</div>' +
            (done ? '<span class="cs-chip cs-chip--ok">' + icon("check", 11) + '</span>' : "") +
          '</div>';
        }).join("") +
      '</div>';
  }

  /* ================================================================ check-ins */

  function renderCheckIns() {
    if (data.checkIns === null) {
      return '<div class="pg-light">' + backButton("home") + header("Check-ins") +
             '<div class="pg-card cs-loading">Loading…</div></div>';
    }

    if (!data.checkIns.length) {
      return '<div class="pg-light">' + backButton("home") + header("Check-ins") + errorBanner() +
        '<div class="pg-card cs-empty">' +
          '<span class="cs-empty__icon">' + icon("check", 22) + '</span>' +
          '<div class="cs-empty__title">Nothing due</div>' +
          '<div class="cs-empty__text">When your coach schedules a check-in it appears here.</div>' +
        '</div></div>';
    }

    if (view.checkInId) return renderCheckInForm();

    return '<div class="pg-light">' + backButton("home") +
      header("Check-ins", data.checkIns.length + " waiting for you") + errorBanner() +
      data.checkIns.map(function (c) {
        return '<button class="pg-card cs-checkin-row" data-coach="open-checkin" data-id="' + esc(c.id) + '">' +
          '<div class="cs-checkin-row__body">' +
            '<div class="cs-checkin-row__kind">' + esc(c.kind === "daily" ? "Daily check-in" : "Weekly check-in") + '</div>' +
            '<div class="cs-checkin-row__due">Due ' + esc(dayLabel(c.dueOn)) + '</div>' +
          '</div>' +
          '<span class="cs-checkin-row__chev">›</span>' +
        '</button>';
      }).join("") +
    '</div>';
  }

  var SCALES = [
    ["mood", "Mood"],
    ["energy", "Energy"],
    ["sleepQuality", "Sleep quality"],
    ["recovery", "Recovery"],
    ["stress", "Stress"],
    ["soreness", "Soreness"]
  ];

  function renderCheckInForm() {
    var checkIn = (data.checkIns || []).filter(function (c) { return c.id === view.checkInId; })[0];
    if (!checkIn) { view.checkInId = null; return renderCheckIns(); }

    /* Last logged weight, offered as the default. The user is being asked for a number they
       already gave the app this week; making them find it again is a good way to get a blank
       field back instead of an answer. */
    var lastWeight = "";
    try {
      var log = (window.state && Array.isArray(state.bodylog)) ? state.bodylog : [];
      if (log.length && log[0] && log[0].weight != null) lastWeight = log[0].weight;
    } catch (e) { lastWeight = ""; }

    return '<div class="pg-light">' + backButton("checkins") +
      header(checkIn.kind === "daily" ? "Daily check-in" : "Weekly check-in",
             "Due " + dayLabel(checkIn.dueOn)) +
      errorBanner() +

      '<div class="pg-card">' +
        SCALES.map(function (pair) {
          return '<div class="cs-scale">' +
            '<div class="cs-scale__label">' + pair[1] + '</div>' +
            '<div class="cs-scale__row" data-scale="' + pair[0] + '">' +
              [1, 2, 3, 4, 5].map(function (n) {
                return '<button type="button" class="cs-dot" data-coach="scale" ' +
                  'data-field="' + pair[0] + '" data-value="' + n + '">' + n + '</button>';
              }).join("") +
            '</div>' +
          '</div>';
        }).join("") +
      '</div>' +

      '<div class="pg-card cs-fields">' +
        field("cs-weight", "Weight (kg)", "number", lastWeight, "0.1") +
        field("cs-sleep", "Sleep (hours)", "number", "", "0.5") +
        field("cs-steps", "Average daily steps", "number", "", "1") +
        field("cs-adherence", "Nutrition adherence (%)", "number", "", "1") +
      '</div>' +

      (checkIn.questions && checkIn.questions.length
        ? '<div class="pg-card cs-fields">' +
            '<div class="cs-fields__head">From your coach</div>' +
            checkIn.questions.map(function (q) { return renderQuestion(q); }).join("") +
          '</div>'
        : "") +

      '<div class="pg-card cs-fields">' +
        '<label class="cs-label" for="cs-notes">Anything else?</label>' +
        '<textarea id="cs-notes" class="pi-input cs-textarea" rows="4" ' +
          'placeholder="How the week went, what got in the way, what you want help with."></textarea>' +
      '</div>' +

      '<button class="btn btn-accent cs-submit" data-coach="submit-checkin"' +
        (view.busy ? " disabled" : "") + '>' +
        (view.busy ? "Sending…" : "Send to coach") +
      '</button>' +
    '</div>';
  }

  function field(id, label, type, value, step) {
    return '<div class="cs-field">' +
      '<label class="cs-label" for="' + id + '">' + esc(label) + '</label>' +
      '<input id="' + id + '" class="pi-input" type="' + type + '"' +
        (step ? ' step="' + step + '"' : "") +
        (value !== "" && value != null ? ' value="' + esc(value) + '"' : "") +
        ' inputmode="decimal" />' +
    '</div>';
  }

  function renderQuestion(q) {
    var id = "cs-q-" + esc(q.key);
    var label = '<label class="cs-label" for="' + id + '">' + esc(q.prompt) +
                (q.required ? ' <span class="cs-req">*</span>' : "") + '</label>';

    if (q.inputType === "number" || q.inputType === "scale") {
      return '<div class="cs-field" data-question="' + esc(q.key) + '">' + label +
        '<input id="' + id + '" class="pi-input" type="number" data-qkey="' + esc(q.key) + '" /></div>';
    }
    if (q.inputType === "boolean") {
      return '<div class="cs-field" data-question="' + esc(q.key) + '">' + label +
        '<select id="' + id + '" class="pi-input" data-qkey="' + esc(q.key) + '">' +
          '<option value="">—</option><option value="yes">Yes</option><option value="no">No</option>' +
        '</select></div>';
    }
    if (q.inputType === "choice") {
      return '<div class="cs-field" data-question="' + esc(q.key) + '">' + label +
        '<select id="' + id + '" class="pi-input" data-qkey="' + esc(q.key) + '">' +
          '<option value="">—</option>' +
          (q.options || []).map(function (o) {
            return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
          }).join("") +
        '</select></div>';
    }
    return '<div class="cs-field" data-question="' + esc(q.key) + '">' + label +
      '<textarea id="' + id + '" class="pi-input cs-textarea" rows="2" data-qkey="' + esc(q.key) + '"></textarea></div>';
  }

  /* ================================================================ messages */

  function renderMessages() {
    var link = sync().getLink() || {};

    var body;
    if (data.messages === null) {
      body = '<div class="pg-card cs-loading">Loading…</div>';
    } else if (!data.messages.length) {
      body = '<div class="pg-card cs-empty">' +
        '<span class="cs-empty__icon">' + icon("mail", 22) + '</span>' +
        '<div class="cs-empty__title">No messages yet</div>' +
        '<div class="cs-empty__text">Say hello — ' + esc(link.coachName || "your coach") +
          ' will see it on their dashboard.</div>' +
      '</div>';
    } else {
      // The API returns newest-first; a conversation reads oldest-first.
      body = '<div class="cs-thread">' +
        data.messages.slice().reverse().map(function (m) {
          var mine = m.senderType === "client";
          return '<div class="cs-msg' + (mine ? " is-mine" : "") + '">' +
            '<div class="cs-msg__bubble">' + esc(m.body || "") + '</div>' +
            '<div class="cs-msg__time">' + esc(relativeTime(m.createdAt)) + '</div>' +
          '</div>';
        }).join("") +
      '</div>';
    }

    return '<div class="pg-light cs-messages">' + backButton("home") +
      header("Messages", link.coachName || "") + errorBanner() + body +
      '<div class="cs-composer">' +
        '<textarea id="cs-msg" class="pi-input cs-composer__input" rows="1" ' +
          'placeholder="Write a message…"></textarea>' +
        '<button class="btn btn-accent cs-composer__send" data-coach="send"' +
          (view.busy ? " disabled" : "") + '>Send</button>' +
      '</div>' +
    '</div>';
  }

  /* ================================================================ meal plan */

  function renderPlan() {
    var plans = sync().getMealPlans();
    var plan = plans[0];
    if (!plan) { view.screen = "home"; return renderHome(); }

    var targets = plan.targets || {};

    return '<div class="pg-light">' + backButton("home") +
      header(plan.name || "Meal plan", plan.description || "Assigned by your coach") +

      (targets.calories
        ? '<div class="pg-card cs-targets">' +
            [["Calories", targets.calories, "kcal"], ["Protein", targets.protein, "g"],
             ["Carbs", targets.carbs, "g"], ["Fat", targets.fat, "g"]]
              .filter(function (r) { return r[1] != null; })
              .map(function (r) {
                return '<div class="cs-target">' +
                  '<div class="cs-target__value">' + esc(r[1]) + '<span>' + r[2] + '</span></div>' +
                  '<div class="cs-target__label">' + esc(r[0]) + '</div></div>';
              }).join("") +
          '</div>'
        : "") +

      (plan.meals || []).map(function (meal) {
        var totals = meal.totals || {};
        return '<div class="pg-card cs-meal">' +
          '<div class="cs-meal__head">' +
            '<div class="cs-meal__name">' + esc(meal.name) +
              (meal.timeHint ? '<span class="cs-meal__time">' + esc(meal.timeHint) + '</span>' : "") +
            '</div>' +
            (totals.calories != null
              ? '<div class="cs-meal__kcal">' + esc(Math.round(totals.calories)) + ' kcal</div>'
              : "") +
          '</div>' +
          (meal.items || []).map(function (item) {
            return '<div class="cs-item">' +
              '<div class="cs-item__name">' + esc(item.name) + '</div>' +
              '<div class="cs-item__qty">' + esc(item.quantity) + ' ' + esc(item.unit) + '</div>' +
              '<div class="cs-item__kcal">' + esc(Math.round(item.calories || 0)) + '</div>' +
            '</div>';
          }).join("") +
          (meal.notes ? '<div class="cs-meal__notes">' + esc(meal.notes) + '</div>' : "") +
        '</div>';
      }).join("") +
    '</div>';
  }

  /* ================================================================ entry point */

  function render() {
    var api = sync();

    // The module is loaded by index.html, so this only fires if that tag was removed or the
    // file failed to load. Saying so beats an empty screen with no explanation.
    if (!api) {
      return '<div class="pg-light">' + header("My Coach") +
        '<div class="pg-card cs-empty"><div class="cs-empty__title">Coach sync unavailable</div>' +
        '<div class="cs-empty__text">The sync module did not load. Reopen the app, and if it ' +
        'keeps happening reinstall.</div></div></div>';
    }

    if (!api.isLinked()) { view.screen = "home"; return renderConnect(); }

    if (view.screen === "checkins") return renderCheckIns();
    if (view.screen === "messages") return renderMessages();
    if (view.screen === "plan") return renderPlan();
    return renderHome();
  }

  /* ---------------------------------------------------------------- data loading */

  function loadCheckIns(force) {
    var api = sync();
    if (!api || (data.checkIns !== null && !force)) return;
    api.checkIns().then(function (list) {
      data.checkIns = Array.isArray(list) ? list : [];
      repaint();
    });
  }

  function loadMessages(force) {
    var api = sync();
    if (!api || (data.messages !== null && !force)) return;
    api.messages().then(function (list) {
      data.messages = Array.isArray(list) ? list : [];
      repaint();
    });
  }

  /* ---------------------------------------------------------------- actions */

  function readNumber(id) {
    var el = document.getElementById(id);
    if (!el || el.value === "") return null;
    var n = Number(el.value);
    return isFinite(n) ? n : null;
  }

  function collectCheckIn() {
    var payload = {};

    // The chosen scale value lives on the pressed button, not in a form control, so it is
    // read from the DOM the same way — one source, no shadow copy to fall out of step.
    SCALES.forEach(function (pair) {
      var selected = document.querySelector('[data-scale="' + pair[0] + '"] .cs-dot.is-on');
      if (selected) payload[pair[0]] = Number(selected.getAttribute("data-value"));
    });

    var weight = readNumber("cs-weight");
    if (weight !== null) payload.weightKg = weight;
    var sleep = readNumber("cs-sleep");
    if (sleep !== null) payload.sleepHours = sleep;
    var steps = readNumber("cs-steps");
    if (steps !== null) payload.stepsAvg = Math.round(steps);
    var adherence = readNumber("cs-adherence");
    if (adherence !== null) payload.nutritionAdherencePct = Math.round(adherence);

    var notes = document.getElementById("cs-notes");
    if (notes && notes.value.trim()) payload.clientNotes = notes.value.trim();

    var answers = {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-qkey]"), function (el) {
      if (el.value !== "") answers[el.getAttribute("data-qkey")] = el.value;
    });
    if (Object.keys(answers).length) payload.answers = answers;

    return payload;
  }

  function toast(message, type) {
    if (typeof window.showToast === "function") window.showToast(message, type || "info", window.render);
    else repaint();
  }

  function handle(action, el) {
    var api = sync();
    if (!api) return;

    // --- navigation -----------------------------------------------------------
    if (action === "home")     { view.screen = "home"; view.checkInId = null; view.error = null; return repaint(); }
    if (action === "checkins") { view.screen = "checkins"; view.checkInId = null; view.error = null; loadCheckIns(); return repaint(); }
    if (action === "messages") { view.screen = "messages"; view.error = null; loadMessages(); return repaint(); }
    if (action === "plan")     { view.screen = "plan"; view.error = null; return repaint(); }
    if (action === "workouts") {
      // Assigned routines live in the normal routine list; sending the user there beats
      // building a second, diverging copy of that screen here.
      if (window.state) { state.tab = "workout"; }
      return repaint();
    }
    if (action === "open-checkin") { view.checkInId = el.getAttribute("data-id"); view.error = null; return repaint(); }

    // --- scale chips ----------------------------------------------------------
    if (action === "scale") {
      var row = el.parentElement;
      Array.prototype.forEach.call(row.querySelectorAll(".cs-dot"), function (dot) {
        dot.classList.remove("is-on");
      });
      el.classList.add("is-on");
      // No repaint: this is a local visual toggle, and re-rendering would wipe every other
      // field the user has already filled in on this form.
      return;
    }

    // --- link -----------------------------------------------------------------
    if (action === "link") {
      var input = document.getElementById("cs-code");
      var code = input ? input.value : "";
      if (!code || code.replace(/[^A-Za-z0-9]/g, "").length < 4) {
        view.error = "Enter the code your coach gave you.";
        return repaint();
      }
      view.busy = true; view.error = null; repaint();

      return api.link(code).then(function (result) {
        view.busy = false;
        if (!result.ok) { view.error = result.message; return repaint(); }

        data.checkIns = null; data.messages = null;
        loadCheckIns();

        // The link succeeded even if its first sync did not; those need different fixes and
        // conflating them would send the user to re-enter a code that was perfectly fine.
        if (result.sync && !result.sync.ok) {
          view.error = "Connected, but your plan has not downloaded yet: " + result.sync.message;
          return repaint();
        }
        toast("Connected to " + (result.link && result.link.coachName ? result.link.coachName : "your coach"), "success");
        return repaint();
      });
    }

    // --- sync -----------------------------------------------------------------
    if (action === "sync") {
      view.busy = true; view.error = null; repaint();
      return api.sync("manual").then(function (result) {
        view.busy = false;
        if (!result.ok) { view.error = result.message; return repaint(); }
        loadCheckIns(true);
        var applied = result.applied || {};
        toast(applied.routines ? "Synced — " + applied.routines + " workout(s) updated" : "Up to date", "success");
        return repaint();
      });
    }

    // --- unlink ---------------------------------------------------------------
    if (action === "unlink") {
      var ask = typeof window.confirmDialog === "function"
        ? window.confirmDialog(
            "Disconnect from your coach? Their assigned workouts and meal plans will be " +
            "removed from this app. Your own routines and all your history stay.",
            window.render,
            { title: "Disconnect", confirmLabel: "Disconnect", danger: true })
        : Promise.resolve(true);

      return ask.then(function (confirmed) {
        if (!confirmed) return;
        api.unlink();
        data.checkIns = null; data.messages = null;
        view.screen = "home"; view.error = null;
        toast("Disconnected from your coach.", "info");
        return repaint();
      });
    }

    // --- check-in submit ------------------------------------------------------
    if (action === "submit-checkin") {
      var payload = collectCheckIn();
      if (!Object.keys(payload).length) {
        view.error = "Fill in at least one thing before sending.";
        return repaint();
      }
      view.busy = true; view.error = null;
      var id = view.checkInId;
      // Read the values BEFORE the repaint that disables the button — a repaint replaces the
      // inputs, so anything not already captured would be gone by the time the request runs.
      repaint();

      return api.submitCheckIn(id, payload).then(function (result) {
        view.busy = false;
        if (!result.ok) { view.error = result.message; return repaint(); }
        data.checkIns = (data.checkIns || []).filter(function (c) { return c.id !== id; });
        view.checkInId = null;
        view.screen = "checkins";
        toast("Check-in sent to your coach.", "success");
        return repaint();
      });
    }

    // --- send message ---------------------------------------------------------
    if (action === "send") {
      var box = document.getElementById("cs-msg");
      var text = box ? box.value.trim() : "";
      if (!text) return;

      view.busy = true; view.error = null;
      if (box) box.value = "";
      repaint();

      return api.sendMessage(text).then(function (result) {
        view.busy = false;
        if (!result.ok) {
          view.error = result.message;
          repaint();
          // Put the text back so a failed send does not silently eat what they wrote.
          var restored = document.getElementById("cs-msg");
          if (restored) restored.value = text;
          return;
        }
        loadMessages(true);
        return repaint();
      });
    }
  }

  /* ---------------------------------------------------------------- attach */

  function attach() {
    if (_bound) return;
    _bound = true;

    document.addEventListener("click", function (e) {
      if (typeof state === "undefined" || state.tab !== "coach") return;
      var el = e.target.closest("[data-coach]");
      if (!el) return;
      e.preventDefault();
      handle(el.getAttribute("data-coach"), el);
    });

    // Uppercase the connection code as it is typed. Codes are read aloud and written down;
    // making the field agree with the printed form removes a whole class of "it says invalid"
    // support message. Done in place rather than via repaint so the caret survives.
    document.addEventListener("input", function (e) {
      if (typeof state === "undefined" || state.tab !== "coach") return;
      if (!e.target || e.target.id !== "cs-code") return;
      var start = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      try { e.target.setSelectionRange(start, start); } catch (err) { /* non-fatal */ }
    });

    // Enter sends a message, Shift+Enter breaks the line.
    document.addEventListener("keydown", function (e) {
      if (typeof state === "undefined" || state.tab !== "coach") return;
      if (!e.target || e.target.id !== "cs-msg") return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handle("send", e.target);
      }
    });
  }

  /** Pending check-in count for the Tools card badge. Never fetches — the caller is a render
   *  pass, and a network call inside one would fire on every repaint. */
  function pendingCount() {
    return data.checkIns === null ? null : data.checkIns.length;
  }

  /** Warm the check-in cache once, so the Tools badge is populated before the user opens the
   *  screen. Called from boot, not from render. */
  function prefetch() {
    var api = sync();
    if (api && api.isLinked()) loadCheckIns();
  }

  window.IgnytCoachPage = {
    render: render,
    attach: attach,
    pendingCount: pendingCount,
    prefetch: prefetch
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prefetch);
  } else {
    prefetch();
  }
}());
