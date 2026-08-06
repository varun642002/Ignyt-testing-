/* =========================================================
   SUPPLEMENTS — the screen

   Two things on one page, in the order they matter: what to take TODAY, then everything else.
   The daily list is what someone opens this for every morning; the stack, history and charts
   are what they look at once a month. Putting the editor first would put the rare task above
   the frequent one.
========================================================= */
(function () {
  "use strict";

  window.IgnytPages = window.IgnytPages || {};

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function doseLabel(s) {
    var S = window.IgnytSupplements;
    var parts = [];
    if (s.dosage != null) parts.push(s.dosage + (s.unit === "g" || s.unit === "mg" || s.unit === "mcg" || s.unit === "IU" || s.unit === "ml" ? "" : " ") + s.unit);
    else if (s.quantity) parts.push(s.quantity + " " + s.unit + (s.quantity === 1 ? "" : "s"));
    var t = S.TIMINGS.filter(function (x) { return x.id === s.timing; })[0];
    if (t && t.id !== "anytime") parts.push(t.label.toLowerCase());
    if (s.time) parts.push(s.time);
    return parts.join(" · ");
  }

  // -------------------------------------------------------------- today

  function todayCard(S) {
    var due = S.dueToday();
    var p = S.todayProgress();
    var key = S.dayKey();

    if (!S.all().length) {
      return '<div class="sp-empty">' +
        '<div class="sp-empty__icon" aria-hidden="true">💊</div>' +
        '<div class="sp-empty__title">No supplements yet</div>' +
        '<div class="sp-empty__sub">Add what you actually take and IGNYT will track the doses, ' +
          'the streak and how long each tub has left.</div>' +
        '<button class="btn btn-accent sp-empty__cta" data-sup-add="1">+ Add supplement</button>' +
      '</div>';
    }

    if (!due.length) {
      return '<div class="sp-card"><div class="sp-card__title">Today</div>' +
        '<div class="sp-none">Nothing due today — none of your supplements are scheduled for ' +
        'this day of the week.</div></div>';
    }

    return '<div class="sp-card">' +
      '<div class="sp-today__head">' +
        '<div class="sp-card__title">Today</div>' +
        '<div class="sp-today__count"><b>' + p.done + '</b> / ' + p.total + ' · ' + p.pct + '%</div>' +
      '</div>' +
      '<div class="sp-track"><div class="sp-fill" style="--fill:' + (p.pct/100) + ';"></div></div>' +
      '<div class="sp-list">' +
        due.map(function (s) {
          var taken = S.isTaken(s.id, key);
          var cat = S.categoryById(s.category);
          return '<button class="sp-row' + (taken ? " is-done" : "") + '" data-sup-take="' + esc(s.id) + '" ' +
            'aria-pressed="' + (taken ? "true" : "false") + '">' +
            '<span class="sp-check" aria-hidden="true">' + (taken ? "✓" : "") + '</span>' +
            '<span class="sp-row__icon" aria-hidden="true">' + cat.icon + '</span>' +
            '<span class="sp-row__body">' +
              '<span class="sp-row__name">' + esc(s.name) + '</span>' +
              '<span class="sp-row__dose">' + esc(doseLabel(s)) + '</span>' +
            '</span>' +
          '</button>';
        }).join("") +
      '</div></div>';
  }

  // -------------------------------------------------------------- stack

  function stackCard(S) {
    var list = S.all();
    if (!list.length) return "";
    return '<div class="sp-card">' +
      '<div class="sp-today__head">' +
        '<div class="sp-card__title">Your stack</div>' +
        '<button class="sp-add" data-sup-add="1">+ Add</button>' +
      '</div>' +
      '<div class="sp-stack">' +
        list.map(function (s) {
          var cat = S.categoryById(s.category);
          var left = S.daysRemaining(s);
          var low = left != null && left <= 7;
          return '<div class="sp-item">' +
            '<span class="sp-row__icon" aria-hidden="true">' + cat.icon + '</span>' +
            '<div class="sp-item__body">' +
              '<div class="sp-item__name">' + esc(s.name) +
                (s.brand ? ' <span class="sp-item__brand">' + esc(s.brand) + '</span>' : '') + '</div>' +
              '<div class="sp-item__meta">' + esc(cat.label) + ' · ' + esc(doseLabel(s) || "—") + '</div>' +
              (left != null
                ? '<div class="sp-item__stock' + (low ? " is-low" : "") + '">' +
                    (left === 0 ? "Out of stock" : left + " day" + (left === 1 ? "" : "s") + " left") +
                    ' · ' + s.inventory + ' ' + esc(s.unit) + (s.inventory === 1 ? "" : "s") + '</div>'
                : '<div class="sp-item__stock is-muted">Stock not tracked</div>') +
            '</div>' +
            '<button class="sp-item__edit" data-sup-edit="' + esc(s.id) + '" aria-label="Edit ' + esc(s.name) + '">⋮</button>' +
          '</div>';
        }).join("") +
      '</div></div>';
  }

  // -------------------------------------------------------------- stats + chart

  function statsCard(S) {
    if (!S.all().length) return "";
    var st = S.stats();
    var cells = [
      ["Streak", st.streak + (st.streak === 1 ? " day" : " days")],
      ["30-day adherence", st.adherence30 + "%"],
      ["Missed this week", String(st.missed7)],
      ["Supplements", String(st.count)]
    ];
    return '<div class="sp-card"><div class="sp-card__title">Consistency</div>' +
      '<div class="sp-stats">' + cells.map(function (c) {
        return '<div><div class="sp-stat__v">' + esc(c[1]) + '</div><div class="sp-stat__l">' + esc(c[0]) + '</div></div>';
      }).join("") + '</div>' +
      (st.lowStock.length
        ? '<div class="sp-warn">Running low: ' +
            st.lowStock.map(function (s) { return esc(s.name); }).join(", ") + '</div>'
        : "") +
    '</div>';
  }

  function chartCard(S) {
    if (!S.all().length) return "";
    var days = S.series(14);
    var any = days.some(function (d) { return d.due > 0; });
    return '<div class="sp-card"><div class="sp-card__title">Last 14 days</div>' +
      (any
        ? '<div class="sp-chart">' + days.map(function (d) {
            /* A day with nothing due gets a flat marker rather than a zero bar: nothing was
               missed, so drawing it as a miss would be a lie the chart tells every week. */
            if (d.due === 0) return '<div class="sp-bar"><span class="sp-bar__none"></span>' +
              '<span class="sp-bar__lab">' + d.label + '</span></div>';
            var h = Math.max(3, Math.round(d.pct / 100 * 78));
            return '<div class="sp-bar" title="' + d.done + ' of ' + d.due + '">' +
              '<span class="sp-bar__fill' + (d.pct === 100 ? " is-full" : "") + '" style="height:' + h + 'px;"></span>' +
              '<span class="sp-bar__lab">' + d.label + '</span></div>';
          }).join("") + '</div>' +
          '<p class="sp-note">A flat mark is a day with nothing scheduled — not a missed one.</p>'
        : '<div class="sp-none">No scheduled days in this period yet.</div>') +
    '</div>';
  }

  // -------------------------------------------------------------- editor

  function editorSheet(S, editing) {
    var s = editing || {};
    var isNew = !editing;
    return '<div class="sp-sheet">' +
      '<div class="sp-sheet__backdrop" data-sup-close="1"></div>' +
      '<div class="sp-sheet__panel">' +
        '<div class="sp-sheet__title">' + (isNew ? "Add supplement" : "Edit supplement") + '</div>' +

        '<label class="sp-field"><span>Name</span>' +
          '<input type="text" id="sup-name" value="' + esc(s.name || "") + '" placeholder="Whey Protein" maxlength="40"></label>' +
        '<label class="sp-field"><span>Brand</span>' +
          '<input type="text" id="sup-brand" value="' + esc(s.brand || "") + '" placeholder="Optional" maxlength="40"></label>' +

        '<div class="sp-field"><span>Category</span>' +
          '<select id="sup-category">' + S.CATEGORIES.map(function (c) {
            return '<option value="' + c.id + '"' + (s.category === c.id ? " selected" : "") + '>' + c.icon + " " + esc(c.label) + '</option>';
          }).join("") + '</select></div>' +

        '<div class="sp-field"><span>Dose</span>' +
          '<input type="number" id="sup-dosage" value="' + esc(s.dosage != null ? s.dosage : "") + '" placeholder="e.g. 25" step="any" min="0">' +
          '<select id="sup-unit">' + S.UNITS.map(function (u) {
            return '<option value="' + u + '"' + (s.unit === u ? " selected" : "") + '>' + u + '</option>';
          }).join("") + '</select></div>' +

        '<label class="sp-field"><span>Per dose</span>' +
          '<input type="number" id="sup-quantity" value="' + esc(s.quantity != null ? s.quantity : 1) + '" min="0.25" step="any">' +
          '<em>units, for stock</em></label>' +

        '<div class="sp-field"><span>When</span>' +
          '<select id="sup-timing">' + S.TIMINGS.map(function (t) {
            return '<option value="' + t.id + '"' + (s.timing === t.id ? " selected" : "") + '>' + esc(t.label) + '</option>';
          }).join("") + '</select></div>' +

        '<label class="sp-field"><span>Time</span>' +
          '<input type="time" id="sup-time" value="' + esc(s.time || "") + '"></label>' +

        '<div class="sp-field"><span>Days</span>' +
          '<select id="sup-frequency">' + S.FREQUENCIES.map(function (f) {
            return '<option value="' + f.id + '"' + (s.frequency === f.id ? " selected" : "") + '>' + esc(f.label) + '</option>';
          }).join("") + '</select></div>' +

        '<label class="sp-field"><span>In stock</span>' +
          '<input type="number" id="sup-inventory" value="' + esc(s.inventory != null ? s.inventory : "") + '" placeholder="Optional" min="0" step="any">' +
          '<em>units left</em></label>' +

        '<label class="sp-field sp-field--notes"><span>Notes</span>' +
          '<textarea id="sup-notes" rows="2" maxlength="200" placeholder="Optional">' + esc(s.notes || "") + '</textarea></label>' +

        '<div class="sp-sheet__row">' +
          (isNew ? "" : '<button class="sp-sheet__delete" data-sup-delete="' + esc(s.id) + '">Delete</button>') +
          '<button class="sp-sheet__cancel" data-sup-close="1">Cancel</button>' +
          '<button class="btn btn-accent sp-sheet__save" data-sup-save="' + esc(s.id || "") + '">Save</button>' +
        '</div>' +
      '</div></div>';
  }

  // -------------------------------------------------------------- main

  /** ctx: { ui } — { editorOpen: null | "new" | supplementId } */
  window.IgnytPages.renderSupplements = function renderSupplements(ctx) {
    var S = window.IgnytSupplements;
    if (!S) return '<div class="sp"><div class="sp-none">Supplements are unavailable in this build.</div></div>';
    var ui = ctx.ui || {};

    var sheet = "";
    if (ui.editorOpen === "new") sheet = editorSheet(S, null);
    else if (ui.editorOpen) {
      var editing = S.get(ui.editorOpen);
      if (editing) sheet = editorSheet(S, editing);
    }

    return '<div class="sp">' +
      '<div class="sp-head">' +
        '<button class="food-page__back" data-sup-back="1" aria-label="Back">←</button>' +
        '<div class="sp-head__title">Supplements</div>' +
        '<button class="sp-head__add" data-sup-add="1" aria-label="Add supplement">+</button>' +
      '</div>' +
      todayCard(S) + statsCard(S) + stackCard(S) + chartCard(S) + sheet +
    '</div>';
  };
})();
