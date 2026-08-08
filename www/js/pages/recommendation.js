/* =========================================================
   RECOMMENDED PROGRAMS — the seven 16-week plans, chosen by equipment

   Reached from Workout > Quick Actions > Recommendation. Three screens in one render: the
   red-flag safety check, the list of programs, and one program's 16 weeks once chosen.

   THE SAFETY CHECK COMES FIRST AND FAILS CLOSED. If js/coach/red-flags.js has not loaded, this
   shows a message instead of the programs — a missing safety layer must never quietly become
   no safety layer.

   IT DOES NOT TOUCH THE HYROX PLAN. That plan is app.js's WEEKS/buildWeek and the plan tab,
   and it is left exactly as it was — these are recommendations, a different thing in a
   different place. Nothing here writes to state.completed, state.plan or state.activeLevel.

   EQUIPMENT IS THE ONLY QUESTION THAT MATTERS at the point of choosing. Someone with a pair of
   dumbbells and no rack cannot run the barbell plan however good it is, so the card leads with
   what the programme needs rather than with its name.

   THE WEEK VIEW IS READ-ONLY ON PURPOSE. Ticking sessions off belongs to the plan tab, which
   already owns completion state and its storage keys; duplicating that here would mean two
   places recording the same fact. This shows what to do — the set logger records the doing.
========================================================= */
(function () {
  "use strict";
  window.IgnytPages = window.IgnytPages || {};

  var EQUIP_LABEL = { none: "No equipment", bands: "Resistance bands",
                      dumbbells: "Dumbbells", barbell: "Barbell",
                      home: "Barbell + dumbbells", gym: "Full gym" };

  function progList(ctx) {
    var P = window.IgnytPrograms;
    return P.list().map(function (p) {
      return '<button class="pg-card rec-card" data-rec-program="' + p.id + '">' +
        '<div class="rec-card__head">' +
          '<span class="rec-card__equip">' + (EQUIP_LABEL[p.equipment] || p.equipment) + '</span>' +
          '<span class="rec-card__weeks">' + p.weeks + ' weeks</span>' +
        '</div>' +
        '<div class="rec-card__title">' + ctx.escHtml(p.label) + '</div>' +
        '<div class="rec-card__blurb">' + ctx.escHtml(p.blurb) + '</div>' +
        '<div class="rec-card__phases">' +
          P.PHASES.map(function (ph) {
            return '<span>' + ph.from + '–' + ph.to + '</span>';
          }).join('<i></i>') +
        '</div>' +
      '</button>';
    }).join("");
  }

  function weekView(ctx, programId, week) {
    var P = window.IgnytPrograms;
    var prog = P.get(programId);
    var w = P.buildWeek(programId, week);
    var svg = ctx.svg, esc = ctx.escHtml;

    /* The week strip. Sixteen buttons is a lot for one row, so it scrolls — and the phase
       boundaries are marked, because "which phase am I in" is the question the strip is really
       being asked. */
    var strip = Array.from({ length: prog.weeks }, function (_, i) {
      var n = i + 1, ph = P.phaseFor(n);
      return '<button class="rec-week' + (n === week ? ' is-on' : '') +
             '" data-rec-week="' + n + '" data-phase="' + ph.key + '">' + n + '</button>';
    }).join("");

    return '<div class="pg-light rec">' +
      '<button class="rh-btn rh-btn--ghost rec-back" data-rec-program="">' + '← Programs</button>' +
      '<div class="rec-head">' +
        '<div class="rec-head__title">' + esc(prog.label) + '</div>' +
        '<div class="rec-head__phase">' + esc(w.phaseLabel) + '</div>' +
      '</div>' +
      '<div class="rec-weeks">' + strip + '</div>' +
      w.days.map(function (d) {
        return '<div class="pg-card rec-day">' +
          '<div class="rec-day__head">' +
            '<span class="rec-day__day">' + esc(d.day) + '</span>' +
            '<span class="rec-day__session">' + esc(d.session) + '</span>' +
          '</div>' +
          d.exercises.map(function (e) {
            var img = ctx.exerciseImageSrc ? ctx.exerciseImageSrc(e.name) : null;
            return '<div class="rec-ex">' +
              (img ? '<img class="rec-ex__img" src="' + img + '" alt="" loading="lazy">'
                   : '<span class="rec-ex__img rec-ex__img--none">' + svg("workout", 16) + '</span>') +
              '<div class="rec-ex__body">' +
                '<div class="rec-ex__name">' + esc(e.name) + '</div>' +
                (e.note ? '<div class="rec-ex__note">' + esc(e.note) + '</div>' : '') +
              '</div>' +
              '<span class="rec-ex__presc">' + esc(e.presc) + '</span>' +
            '</div>';
          }).join("") +
        '</div>';
      }).join("") +
    '</div>';
  }

  /* THE SAFETY GATE, and it runs before anything else on this screen.
     A red flag means the correct output is not a workout, so it cannot be a filter applied to
     one — it has to stop the screen from offering programs at all. See js/coach/red-flags.js. */
  function redFlagScreen(ctx) {
    var RF = window.IgnytRedFlags;
    var msg = RF.message();
    var esc = ctx.escHtml;

    if (msg) {
      return '<div class="pg-light rec">' +
        '<div class="pg-card rf-stop' + (msg.urgent ? ' rf-stop--urgent' : '') + '">' +
          '<div class="rf-stop__title">' + esc(msg.title) + '</div>' +
          '<div class="rf-stop__body">' + esc(msg.body) + '</div>' +
          '<ul class="rf-stop__list">' +
            msg.flags.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join("") +
          '</ul>' +
          '<button class="rh-btn rh-btn--ghost rf-stop__clear" data-rf-clear="1">' +
            'This has resolved — ask me again</button>' +
        '</div>' +
        '<div class="pg-card rf-universal">' + esc(RF.UNIVERSAL) + '</div>' +
      '</div>';
    }

    return '<div class="pg-light rec">' +
      '<div class="rec-intro">' +
        '<div class="rec-intro__title">Before a program is suggested</div>' +
        '<div class="rec-intro__sub">Tick anything that applies to you right now. If none of ' +
        'them do, say so and the programs will open.</div>' +
      '</div>' +
      '<div class="pg-card rf-check">' +
        RF.FLAGS.map(function (f) {
          return '<label class="rf-item">' +
            '<input type="checkbox" class="rf-item__box" value="' + f.id + '">' +
            '<span>' + esc(f.label) + '</span>' +
          '</label>';
        }).join("") +
      '</div>' +
      '<div class="rf-actions">' +
        '<button class="rh-btn rh-btn--primary" data-rf-submit="none">None of these apply</button>' +
        '<button class="rh-btn rh-btn--ghost" data-rf-submit="checked">Report what I ticked</button>' +
      '</div>' +
      '<div class="pg-card rf-universal">' + esc(RF.UNIVERSAL) + '</div>' +
    '</div>';
  }

  window.IgnytPages.renderRecommendation = function (ctx) {
    if (!window.IgnytPrograms) {
      return '<div class="pg-light"><div class="pg-card">Programs are still loading.</div></div>';
    }
    var RF = window.IgnytRedFlags;
    /* Fail CLOSED if the module did not load. A missing safety layer must not silently become
       no safety layer — the screen says so rather than opening the programs. */
    if (!RF) {
      return '<div class="pg-light"><div class="pg-card">The safety check could not load, so ' +
             'programs are not being shown. Restart the app and try again.</div></div>';
    }
    if (RF.needsCheck()) return redFlagScreen(ctx);

    var st = ctx.state;
    if (st.recProgram) return weekView(ctx, st.recProgram, st.recWeek || 1);

    return '<div class="pg-light rec">' +
      '<div class="rec-intro">' +
        '<div class="rec-intro__title">Recommended programs</div>' +
        '<div class="rec-intro__sub">Seven structured 16-week plans, each in four phases: ' +
        'technique, volume, harder variations, then intensity. Pick the one that matches the ' +
        'equipment you actually have.</div>' +
      '</div>' +
      progList(ctx) +
    '</div>';
  };
})();
