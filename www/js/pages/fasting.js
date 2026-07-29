/* =========================================================
   FASTING TRACKER — the screen

   Two states, one page. With no fast running it is a schedule picker; with one running the
   timer takes the whole top of the screen and everything else moves below it. They are not
   separate routes because a fast starting or ending should not feel like navigating — you tap
   once and the same page is now counting.

   The countdown ticks in place via a 1s interval that writes into existing nodes, NOT by
   re-rendering the page every second: a full render each tick would fight the scroll position,
   drop focus, and rebuild the history list sixty times a minute for no reason.
========================================================= */
(function () {
  "use strict";

  window.IgnytPages = window.IgnytPages || {};

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /** "13h 25m". Seconds only appear under a minute, where they are the only thing moving. */
  function dur(ms) {
    if (ms == null) return "—";
    var neg = ms < 0;
    ms = Math.abs(ms);
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var out = h > 0 ? h + "h " + String(m).padStart(2, "0") + "m"
                    : m > 0 ? m + "m " + String(s).padStart(2, "0") + "s"
                            : s + "s";
    return (neg ? "-" : "") + out;
  }

  function shortDur(ms) {
    var h = ms / 3600000;
    return h >= 10 ? Math.round(h) + "h" : (Math.round(h * 10) / 10) + "h";
  }

  function dateLabel(ms) {
    var d = new Date(ms), today = new Date();
    var sameDay = d.toDateString() === today.toDateString();
    var y = new Date(today); y.setDate(y.getDate() - 1);
    if (sameDay) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  function timeLabel(ms) {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  /** datetime-local wants local time in the input's own format, not an ISO UTC string. */
  function toLocalInput(ms) {
    var d = new Date(ms - d0(ms));
    return d.toISOString().slice(0, 16);
  }
  function d0(ms) { return new Date(ms).getTimezoneOffset() * 60000; }

  // -------------------------------------------------------------- active timer

  function activeCard(F, fast) {
    var p = F.progress(fast);
    var over = p.remainingMs < 0;

    return '' +
      '<div class="ft-live">' +
        '<div class="ft-ringwrap">' +
          '<div class="ft-ring" id="ft-ring" style="--pct:' + p.pct + ';">' +
            '<div class="ft-ring__in">' +
              '<div class="ft-ring__label">' + esc(fast.label) + ' fast</div>' +
              '<div class="ft-ring__time" id="ft-elapsed">' + dur(p.elapsedMs) + '</div>' +
              '<div class="ft-ring__sub" id="ft-remaining">' +
                (over ? dur(-p.remainingMs) + " past goal" : dur(p.remainingMs) + " to go") +
              '</div>' +
              '<div class="ft-ring__pct" id="ft-pct">' + p.pct + '%</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="ft-stage" id="ft-stage">' +
          '<div class="ft-stage__name">' + esc(p.stage.label) + '</div>' +
          '<div class="ft-stage__note">' + esc(p.stage.note) + '</div>' +
        '</div>' +

        '<div class="ft-times">' +
          '<div><span>Started</span><b>' + dateLabel(fast.startAt) + ', ' + timeLabel(fast.startAt) + '</b></div>' +
          '<div><span>Goal</span><b>' + dateLabel(p.endsAt) + ', ' + timeLabel(p.endsAt) + '</b></div>' +
        '</div>' +

        '<div class="ft-live__actions">' +
          '<button class="btn btn-ghost ft-edit" data-ft-edit-start="1">Edit start time</button>' +
          '<button class="btn btn-accent ft-end" data-ft-end="1">' +
            (p.complete ? "Complete fast" : "End fast early") + '</button>' +
        '</div>' +
        (p.complete
          ? '<div class="ft-hit">🎉 You\'ve reached your ' + esc(fast.label) + ' goal.</div>'
          : '') +
      '</div>';
  }

  // -------------------------------------------------------------- picker

  function picker(F, ui) {
    var custom = ui.pickScheduleId === "custom";
    return '' +
      '<div class="ft-pick">' +
        '<div class="ft-pick__head">Choose a fasting schedule</div>' +
        '<div class="ft-pick__grid">' +
          F.SCHEDULES.map(function (s) {
            var on = ui.pickScheduleId === s.id;
            return '<button class="ft-opt' + (on ? " is-on" : "") + '" data-ft-pick="' + esc(s.id) + '">' +
              '<span class="ft-opt__label">' + esc(s.label) + '</span>' +
              (s.hours ? '<span class="ft-opt__hours">' + s.hours + 'h fast</span>'
                       : '<span class="ft-opt__hours">Your choice</span>') +
              (s.popular ? '<span class="ft-opt__tag">Popular</span>' : '') +
            '</button>';
          }).join("") +
        '</div>' +

        (ui.pickScheduleId ? '<div class="ft-pick__detail">' +
          '<p class="ft-pick__blurb">' + esc((F.scheduleById(ui.pickScheduleId) || {}).blurb || "") + '</p>' +
          (custom
            ? '<label class="ft-field"><span>Length</span>' +
                '<input type="number" id="ft-custom-hours" min="1" max="168" step="1" ' +
                'value="' + esc(ui.customHours || 16) + '"><em>hours</em></label>'
            : '') +
          '<label class="ft-field"><span>Started</span>' +
            '<input type="datetime-local" id="ft-start-at" value="' + toLocalInput(Date.now()) + '"></label>' +
          '<p class="ft-note">Already started? Set the real time — the timer counts from there, ' +
            'not from when you tapped.</p>' +
          '<button class="btn btn-accent ft-start" data-ft-start="1">Start fast</button>' +
        '</div>' : '') +
      '</div>';
  }

  // -------------------------------------------------------------- stats + history

  function statsCard(F) {
    var s = F.stats();
    var cells = [
      ["Current streak", s.streak + (s.streak === 1 ? " day" : " days")],
      ["Fasts completed", s.completed + " of " + s.total],
      ["Longest fast", s.longestMs ? shortDur(s.longestMs) : "—"],
      ["Average length", s.averageMs ? shortDur(s.averageMs) : "—"],
      ["This week", Math.round(s.hoursThisWeek) + "h"],
      ["This month", Math.round(s.hoursThisMonth) + "h"]
    ];
    return '<div class="ft-card"><div class="ft-card__title">Your fasting</div>' +
      '<div class="ft-stats">' +
        cells.map(function (c) {
          return '<div class="ft-stat"><div class="ft-stat__v">' + esc(c[1]) + '</div>' +
                 '<div class="ft-stat__l">' + esc(c[0]) + '</div></div>';
        }).join("") +
      '</div></div>';
  }

  function chartCard(F, ui) {
    var days = ui.chartRange === 30 ? 30 : 7;
    var series = F.dailySeries(days);
    var max = Math.max(16, Math.ceil(Math.max.apply(null, series.map(function (d) { return d.hours; }).concat([0]))));
    var any = series.some(function (d) { return d.hours > 0; });

    return '<div class="ft-card">' +
      '<div class="ft-card__head">' +
        '<div class="ft-card__title">Fasting hours</div>' +
        '<div class="ft-seg">' +
          '<button class="' + (days === 7 ? "is-on" : "") + '" data-ft-range="7">7 days</button>' +
          '<button class="' + (days === 30 ? "is-on" : "") + '" data-ft-range="30">30 days</button>' +
        '</div>' +
      '</div>' +
      (any
        ? '<div class="ft-chart">' +
            series.map(function (d) {
              var h = Math.max(2, Math.round(d.hours / max * 90));
              return '<div class="ft-bar" title="' + d.hours.toFixed(1) + 'h">' +
                '<span class="ft-bar__fill" style="height:' + h + 'px;"></span>' +
                (days === 7 ? '<span class="ft-bar__lab">' + d.label + '</span>' : '') +
              '</div>';
            }).join("") +
          '</div>'
        : '<div class="ft-empty-note">No fasting hours in this period yet.</div>') +
    '</div>';
  }

  function historyCard(F, ui) {
    var h = F.history();
    if (!h.length) {
      return '<div class="ft-card"><div class="ft-card__title">History</div>' +
        '<div class="ft-empty-note">Your completed fasts will appear here.</div></div>';
    }
    var shown = ui.historyAll ? h : h.slice(0, 6);
    return '<div class="ft-card">' +
      '<div class="ft-card__head"><div class="ft-card__title">History</div>' +
        '<div class="ft-card__sub">' + h.length + ' fast' + (h.length === 1 ? "" : "s") + '</div></div>' +
      '<div class="ft-hist">' +
        shown.map(function (r) {
          return '<div class="ft-hrow">' +
            '<span class="ft-hrow__dot ' + (r.completed ? "is-done" : "is-stop") + '" aria-hidden="true"></span>' +
            '<div class="ft-hrow__body">' +
              '<div class="ft-hrow__top">' +
                '<b>' + esc(r.label) + '</b>' +
                '<span class="ft-hrow__badge ' + (r.completed ? "is-done" : "is-stop") + '">' +
                  (r.completed ? "Completed" : "Stopped") + '</span>' +
              '</div>' +
              '<div class="ft-hrow__meta">' + dateLabel(r.startAt) + ' · ' + timeLabel(r.startAt) +
                ' → ' + timeLabel(r.endAt) + '</div>' +
              (r.notes ? '<div class="ft-hrow__notes">' + esc(r.notes) + '</div>' : '') +
            '</div>' +
            '<div class="ft-hrow__dur">' + shortDur(r.durationMs) +
              '<span>of ' + r.targetHours + 'h</span></div>' +
            '<button class="ft-hrow__del" data-ft-del="' + esc(r.id) + '" aria-label="Delete this fast">×</button>' +
          '</div>';
        }).join("") +
      '</div>' +
      (h.length > 6
        ? '<button class="ft-more" data-ft-history-all="1">' +
            (ui.historyAll ? "Show less" : "Show all " + h.length) + '</button>' : '') +
    '</div>';
  }

  function notifCard(F) {
    var p = F.prefs();
    var rows = [
      ["notifyStart", "When a fast starts", "A confirmation the timer is running."],
      ["notifyHalf",  "Halfway point",      "A nudge at the midpoint of the fast."],
      ["notifyEnd",   "Time to break the fast", "When you reach your goal."]
    ];
    return '<div class="ft-card"><div class="ft-card__title">Reminders</div>' +
      rows.map(function (r) {
        var on = !!p[r[0]];
        return '<button class="ft-switch' + (on ? " is-on" : "") + '" data-ft-pref="' + r[0] + '" ' +
          'aria-pressed="' + (on ? "true" : "false") + '">' +
          '<span class="ft-switch__body"><b>' + esc(r[1]) + '</b><em>' + esc(r[2]) + '</em></span>' +
          '<span class="ft-switch__track"><span class="ft-switch__knob"></span></span>' +
        '</button>';
      }).join("") +
      '<p class="ft-note">Reminders are scheduled on your device. They need notification ' +
        'permission, and they are cancelled if you end a fast early.</p>' +
    '</div>';
  }

  // -------------------------------------------------------------- main render

  /** ctx: { ui } — transient screen state only; everything else comes from IgnytFasting. */
  window.IgnytPages.renderFasting = function renderFasting(ctx) {
    var F = window.IgnytFasting;
    if (!F) return '<div class="ft"><div class="ft-empty-note">Fasting is unavailable in this build.</div></div>';

    var ui = ctx.ui || {};
    var fast = F.active();

    var header = '' +
      '<div class="ft-head">' +
        '<button class="food-page__back" data-ft-back="1" aria-label="Back">←</button>' +
        '<div class="ft-head__title">Fasting</div>' +
        '<span style="width:36px;"></span>' +
      '</div>';

    return '<div class="ft">' +
      header +
      (fast ? activeCard(F, fast) : picker(F, ui)) +
      statsCard(F) +
      chartCard(F, ui) +
      historyCard(F, ui) +
      notifCard(F) +
      '<p class="ft-disclaimer">Fasting stage descriptions are general information, not medical ' +
        'advice. Talk to a doctor before extended fasts, and if you are pregnant, diabetic, ' +
        'underweight or taking medication.</p>' +
    '</div>';
  };

  /** The compact Home card, shown only while a fast is running. */
  window.IgnytPages.renderFastingHomeCard = function renderFastingHomeCard() {
    var F = window.IgnytFasting;
    if (!F) return "";
    var fast = F.active();
    if (!fast) return "";      // nothing on Home when nothing is running
    var p = F.progress(fast);
    var over = p.remainingMs < 0;
    return '' +
      '<div class="rh-section-head"><span>Fasting</span></div>' +
      '<button class="pg-card ft-home" data-open-fasting="1">' +
        '<div class="ft-home__ring" style="--pct:' + p.pct + ';"><span>' + p.pct + '%</span></div>' +
        '<div class="ft-home__body">' +
          '<div class="ft-home__title">' + esc(fast.label) + ' fast · ' + esc(p.stage.label) + '</div>' +
          '<div class="ft-home__time" id="ft-home-elapsed">' + dur(p.elapsedMs) + ' elapsed</div>' +
          '<div class="ft-home__sub" id="ft-home-remaining">' +
            (over ? dur(-p.remainingMs) + " past goal" : dur(p.remainingMs) + " to go") + '</div>' +
        '</div>' +
        '<span class="ft-home__chev">›</span>' +
      '</button>';
  };
})();
