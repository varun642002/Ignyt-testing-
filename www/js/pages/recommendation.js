/* =========================================================
   RECOMMENDED PROGRAMS — the four 16-week plans, chosen by equipment

   Reached from Workout > Quick Actions > Recommendation. Two screens in one render: the list
   of programs, and one program's 16 weeks once chosen.

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
                      dumbbells: "Dumbbells", barbell: "Barbell" };

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

  window.IgnytPages.renderRecommendation = function (ctx) {
    if (!window.IgnytPrograms) {
      return '<div class="pg-light"><div class="pg-card">Programs are still loading.</div></div>';
    }
    var st = ctx.state;
    if (st.recProgram) return weekView(ctx, st.recProgram, st.recWeek || 1);

    return '<div class="pg-light rec">' +
      '<div class="rec-intro">' +
        '<div class="rec-intro__title">Recommended programs</div>' +
        '<div class="rec-intro__sub">Four structured 16-week plans, in four phases: technique, ' +
        'volume, harder variations, then intensity. Pick the one that matches the equipment you ' +
        'actually have.</div>' +
      '</div>' +
      progList(ctx) +
    '</div>';
  };
})();
