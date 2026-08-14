/* =========================================================
   CUSTOM DIET PLAN BUILDER — the screen

   Structure follows the supplied reference: plan selector and Active badge in the header, a
   summary card with the calorie ring and macro columns, then one expandable card per meal
   with per-meal macros, then a sticky primary action.

   MEALS ARE WHATEVER THE PLAN SAYS. The plan carries its own ordered meal list (1–5), so this
   screen renders exactly the meals the user eats — never a placeholder card for a meal they
   have said they do not have. Someone on one meal a day sees one card.

   THEME. The reference is rendered dark. This screen is NOT hard-coded dark: the app is a
   light theme with a blue accent and ships a real dark mode, and a screen that ignored that
   would be the only one in the app that cannot follow the user's setting. Every colour here
   comes from the existing app tokens, so it reads as the reference in dark mode and as the
   rest of IGNYT in light mode. Structure copied, palette inherited.
========================================================= */
(function () {
  /* An icon by name, from app.js's set. Guarded so a missing svg() degrades to no
     decoration rather than taking the page down. */
  function ic(n, s){ return (typeof svg === "function") ? svg(n, s || 16) : ""; }

  "use strict";

  window.IgnytPages = window.IgnytPages || {};

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /** Rounds for display without inventing precision: 1 decimal under 10, whole above. */
  function num(v, unit) {
    if (v == null) return "—";
    var n = Number(v);
    if (isNaN(n)) return "—";
    var s = n < 10 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toLocaleString();
    return unit ? s + unit : s;
  }

  /** "08:00" -> "8:00 am". Empty stays empty rather than becoming a fake time. */
  function prettyTime(t) {
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return "";
    var parts = t.split(":"), h = parseInt(parts[0], 10), m = parts[1];
    var ampm = h >= 12 ? "pm" : "am";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + m + " " + ampm;
  }

  /** The serving line under an item name: "50 g", "1 Medium (118 g)", "200 ml". */
  function servingLabel(item) {
    if (item.quantity != null && item.servingUnit) {
      var qs = (Math.round(Number(item.quantity) * 100) / 100).toString();
      if (item.servingUnit !== "g" && item.grams) {
        return qs + " " + item.servingUnit + " (" + Math.round(item.grams) + " g)";
      }
      return qs + " " + item.servingUnit;
    }
    if (item.grams) return Math.round(item.grams) + " g";
    return "1 serving";
  }

  // -------------------------------------------------------------- summary

  function summaryCard(plan, targets) {
    var D = window.IgnytDietPlans;
    var T = D.dayTotals(plan);
    var kcal = Math.round(T.calories || 0);
    var goal = Math.round((targets && targets.kcal) || 0);
    var pct = goal > 0 ? Math.min(100, Math.round(kcal / goal * 100)) : 0;
    var diff = goal - kcal;

    var macros = [
      { key: "protein", label: "Protein", target: targets && targets.protein, colour: "var(--rh-green)" },
      { key: "carbs",   label: "Carbs",   target: targets && targets.carbs,   colour: "var(--rh-blue)" },
      { key: "fat",     label: "Fat",     target: targets && targets.fat,     colour: "#D97706" },
      { key: "fibre",   label: "Fibre",   target: targets && targets.fibre,   colour: "var(--rh-purple)" }
    ];

    /* The over/under line only appears once there is a goal AND something planned. On an empty
       plan "you are 2,000 Cal under your goal" is arithmetic, not guidance. */
    var note = "";
    if (goal > 0 && kcal > 0) {
      if (Math.abs(diff) <= Math.max(25, goal * 0.02)) {
        note = '<span class="dp-sum__note">This plan matches your daily goal.</span>';
      } else {
        note = '<span class="dp-sum__note">This plan is <b class="' + (diff > 0 ? "dp-under" : "dp-over") +
               '">' + num(Math.abs(diff)) + ' Cal</b> ' + (diff > 0 ? "under" : "over") + ' your daily goal</span>';
      }
    } else if (kcal === 0) {
      note = '<span class="dp-sum__note">Add foods to your meals to build this plan.</span>';
    }

    return '' +
      '<div class="dp-sum">' +
        '<div class="dp-sum__top">' +
          '<div class="pg-ring dp-sum__ring" style="--pct:' + pct + ';--ring-color:var(--rh-blue);">' +
            '<div class="pg-ring__inner">' +
              '<div class="dp-sum__kcal">' + kcal.toLocaleString() + '</div>' +
              (goal > 0 ? '<div class="dp-sum__goal">/ ' + goal.toLocaleString() + '</div>' : '') +
              '<div class="dp-sum__unit">Calories</div>' +
            '</div>' +
          '</div>' +
          '<div class="dp-sum__macros">' +
            macros.map(function (m) {
              return '<div class="dp-macro">' +
                '<div class="dp-macro__value" style="color:' + m.colour + ';">' + num(T[m.key], "g") + '</div>' +
                '<div class="dp-macro__label">' + m.label + '</div>' +
                (m.target ? '<div class="dp-macro__target">/ ' + Math.round(m.target) + 'g</div>' : '') +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>' +
        (goal > 0 ? '<div class="dp-sum__track"><div class="dp-sum__fill" style="width:' + pct + '%;"></div></div>' : '') +
        '<div class="dp-sum__foot">' + note +
          '<button class="dp-sum__details" data-dp-details="1">Details ›</button>' +
        '</div>' +
      '</div>';
  }

  // -------------------------------------------------------------- meals

  function itemRow(item, meal) {
    var img = window.IgnytFoodImages ? window.IgnytFoodImages.thumbHtml(item, 40) : "";
    /* The row is a button: tapping it opens the serving editor. The trailing ⋮ removes the
       item and stops propagation, so the two actions cannot fire together. */
    return '' +
      '<div class="dp-item" role="button" tabindex="0" data-dp-item-edit="' + esc(item.id) +
        '" data-dp-item-meal="' + esc(meal.id) + '">' +
        '<div class="dp-item__img">' + img + '</div>' +
        '<div class="dp-item__body">' +
          '<div class="dp-item__name">' + esc(item.name) + '</div>' +
          '<div class="dp-item__serving">' + esc(servingLabel(item)) + ' · tap to edit</div>' +
        '</div>' +
        '<div class="dp-item__nums">' +
          '<span class="dp-item__cal">' + num(item.calories) + ' Cal</span>' +
          '<span class="dp-item__macro">P ' + num(item.protein, "g") + '</span>' +
          '<span class="dp-item__macro">C ' + num(item.carbs, "g") + '</span>' +
          '<span class="dp-item__macro">F ' + num(item.fat, "g") + '</span>' +
        '</div>' +
        '<button class="dp-item__more" data-dp-item-menu="' + esc(item.id) + '" data-dp-menu-meal="' +
          esc(meal.id) + '" aria-label="Remove ' + esc(item.name) + '">⋮</button>' +
      '</div>';
  }

  function mealCard(plan, meal, expanded, dateStr) {
    var D = window.IgnytDietPlans;
    var T = D.mealTotals(plan, meal.id);
    var done = D.isMealDone(plan.id, dateStr, meal.id);
    var empty = meal.items.length === 0;
    var time = prettyTime(meal.time);

    /* The header is a row, not a single button: the completion tick sits beside the expand
       control so a meal can be ticked off without opening it. Daily tracking is the thing a
       user does every day; making it cost an expand-then-tap on each meal turns a feature
       into a chore. Nested <button> is invalid, hence the two siblings. */
    return '' +
      '<div class="dp-meal' + (expanded ? " is-open" : "") + (done ? " is-done" : "") + '">' +
        '<div class="dp-meal__head">' +
          '<button class="dp-meal__toggle" data-dp-meal-toggle="' + esc(meal.id) + '" aria-expanded="' + (expanded ? "true" : "false") + '">' +
            '<span class="dp-meal__icon" aria-hidden="true">' + ic(meal.icon || "plate", 18) + '</span>' +
            '<span class="dp-meal__title">' +
              '<span class="dp-meal__name">' + esc(meal.name) +
                (time ? '<span class="dp-meal__time">' + esc(time) + '</span>' : '') + '</span>' +
              '<span class="dp-meal__sub">' +
                (empty ? "No foods yet"
                       : num(T.calories) + " Cal · " + meal.items.length + " item" + (meal.items.length === 1 ? "" : "s")) +
              '</span>' +
            '</span>' +
            (empty ? '' :
              '<span class="dp-meal__macros">' +
                '<span class="dp-m dp-m--p">P ' + num(T.protein, "g") + '</span>' +
                '<span class="dp-m dp-m--c">C ' + num(T.carbs, "g") + '</span>' +
                '<span class="dp-m dp-m--f">F ' + num(T.fat, "g") + '</span>' +
              '</span>') +
            '<span class="dp-meal__chev" aria-hidden="true">' + (expanded ? "⌃" : "⌄") + '</span>' +
          '</button>' +
          (empty ? '' :
            '<button class="dp-check' + (done ? " is-on" : "") + '" data-dp-meal-done="' + esc(meal.id) + '" ' +
              'aria-pressed="' + (done ? "true" : "false") + '" ' +
              'aria-label="Mark ' + esc(meal.name) + (done ? ' as not eaten' : ' as eaten') + '">' +
              (done ? ic("check",14) : "") + '</button>') +
        '</div>' +

        (expanded ? '<div class="dp-meal__body">' +
          (empty
            ? '<div class="dp-meal__empty">Nothing planned for ' + esc(meal.name) + ' yet.</div>'
            : meal.items.map(function (it) { return itemRow(it, meal); }).join("")) +
          '<div class="dp-meal__actions">' +
            '<button class="dp-add" data-dp-add-food="' + esc(meal.id) + '">+ Add Food</button>' +
            /* Copy the planned meal into today's Food Log. Only offered when the meal actually
               has items -- an empty meal would log nothing and the button would be a lie. */
            (meal.items && meal.items.length
              ? '<button class="dp-mealcfg" data-dp-log-meal="' + esc(meal.id) + '">Log to Food Log</button>'
              : '') +
            '<button class="dp-mealcfg" data-dp-meal-config="' + esc(meal.id) + '">Edit meal</button>' +
          '</div>' +
        '</div>' : '') +
      '</div>';
  }

  // -------------------------------------------------------------- sheets

  /* Four options, per the brief. "Set as active" and "Meals per day" used to live here too;
     both are still reachable and are better placed than they were - active is the badge in the
     selector bar (visible exactly when the plan is not active), and meals-per-day is the
     "Change" link on the meal bar plus Profile > Diet Settings. A menu that lists everything is
     a menu nobody reads. */
  function planSheet(plan) {
    return '' +
      '<div class="dp-sheet" role="dialog" aria-modal="true" aria-label="Plan options">' +
        '<div class="dp-sheet__backdrop" data-dp-plan-menu="1"></div>' +
        '<div class="dp-sheet__panel">' +
          '<div class="dp-sheet__title">' + esc(plan.name) + '</div>' +
          '<button class="dp-sheet__item" data-dp-plan-action="rename">' +
            '<span aria-hidden="true">' + ic("pencil",15) + '</span> Rename Plan</button>' +
          '<button class="dp-sheet__item" data-dp-plan-action="duplicate">' +
            '<span aria-hidden="true">⧉</span> Duplicate Plan</button>' +
          '<button class="dp-sheet__item dp-sheet__item--danger" data-dp-plan-action="delete">' +
            '<span aria-hidden="true">' + ic("trash",15) + '</span> Delete Plan</button>' +
          '<button class="dp-sheet__cancel" data-dp-plan-menu="1">Cancel</button>' +
        '</div>' +
      '</div>';
  }

  /** "How many meals do you eat in a day?" — 1 to 5, with the preset names shown so the
   *  choice is concrete rather than a number in the abstract. */
  function mealCountSheet(plan) {
    var D = window.IgnytDietPlans;
    var current = plan.meals.length;
    var opts = [1, 2, 3, 4, 5].map(function (n) {
      var names = (D.PRESETS[n] || []).map(function (m) { return m.name; }).join(" · ");
      return '<button class="dp-opt' + (n === current ? " is-on" : "") + '" data-dp-set-meals="' + n + '">' +
        '<span class="dp-opt__n">' + n + '</span>' +
        '<span class="dp-opt__body">' +
          '<span class="dp-opt__label">' + n + (n === 1 ? " Meal" : " Meals") +
            (n === D.DEFAULT_COUNT ? '<span class="dp-opt__tag">Default</span>' : '') + '</span>' +
          '<span class="dp-opt__names">' + esc(names) + '</span>' +
        '</span>' +
        (n === current ? '<span class="dp-opt__tick" aria-hidden="true">' + ic("check",14) + '</span>' : '') +
      '</button>';
    }).join("");

    return '' +
      '<div class="dp-sheet">' +
        '<div class="dp-sheet__backdrop" data-dp-close-sheet="1"></div>' +
        '<div class="dp-sheet__panel">' +
          '<div class="dp-sheet__heading">How many meals do you eat in a day?</div>' +
          '<div class="dp-opts">' + opts + '</div>' +
          '<p class="dp-sheet__note">Reducing the count keeps your food — anything in a removed ' +
            'meal moves into the last one rather than being deleted.</p>' +
          '<button class="dp-sheet__cancel" data-dp-close-sheet="1">Cancel</button>' +
        '</div>' +
      '</div>';
  }

  /** Per-meal editing: rename, time, reorder, delete. */
  function mealConfigSheet(plan, meal) {
    var idx = -1;
    plan.meals.forEach(function (m, i) { if (m.id === meal.id) idx = i; });
    var canDelete = plan.meals.length > window.IgnytDietPlans.MIN_MEALS;
    return '' +
      '<div class="dp-sheet">' +
        '<div class="dp-sheet__backdrop" data-dp-close-sheet="1"></div>' +
        '<div class="dp-sheet__panel">' +
          '<div class="dp-sheet__heading">Edit meal</div>' +
          '<label class="dp-field"><span>Name</span>' +
            '<input type="text" id="dp-meal-name" value="' + esc(meal.name) + '" maxlength="30"></label>' +
          '<label class="dp-field"><span>Time</span>' +
            '<input type="time" id="dp-meal-time" value="' + esc(meal.time || "") + '"></label>' +
          '<div class="dp-sheet__row">' +
            '<button class="dp-sheet__mini" data-dp-move-meal="up" ' + (idx <= 0 ? "disabled" : "") + '>↑ Move earlier</button>' +
            '<button class="dp-sheet__mini" data-dp-move-meal="down" ' + (idx >= plan.meals.length - 1 ? "disabled" : "") + '>↓ Move later</button>' +
          '</div>' +
          (canDelete
            ? '<button class="dp-sheet__item dp-sheet__item--danger" data-dp-delete-meal="1">' +
                '<span aria-hidden="true">' + ic("trash",15) + '</span> Delete this meal</button>'
            : '<p class="dp-sheet__note">A plan needs at least one meal, so this one cannot be deleted.</p>') +
          '<div class="dp-sheet__row">' +
            '<button class="dp-sheet__cancel" data-dp-close-sheet="1">Cancel</button>' +
            '<button class="btn btn-accent dp-sheet__save" data-dp-save-meal="1">Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // -------------------------------------------------------------- empty state

  function emptyState() {
    return '' +
      '<div class="dp-empty">' +
        '<div class="dp-empty__icon" aria-hidden="true">' + ic("plate",30) + '</div>' +
        '<div class="dp-empty__title">No diet plans yet</div>' +
        '<div class="dp-empty__sub">Build a plan around the way you actually eat — anything from ' +
          'one meal a day to five — and IGNYT totals the calories and nutrients as you go.</div>' +
        '<button class="btn btn-accent dp-empty__cta" data-dp-create="1">+ Create Diet Plan</button>' +
      '</div>';
  }

  // -------------------------------------------------------------- main render

  /**
   * ctx: { targets, dateStr, planId, ui }
   *   targets — the user's daily macro targets (macroTargets() in app.js)
   *   dateStr — today's date key, for completion ticks
   *   planId  — the plan being VIEWED, which is not always the active one
   *   ui      — transient screen state: { expanded, planMenu, sheet, sheetMeal, details }
   */
  window.IgnytPages.renderDietPlan = function renderDietPlan(ctx) {
    var D = window.IgnytDietPlans;
    if (!D) return '<div class="dp"><div class="dp-empty">Diet plans are unavailable in this build.</div></div>';

    var plans = D.all();
    var plan = (ctx.planId && D.get(ctx.planId)) || D.active() || plans[0] || null;
    var ui = ctx.ui || {};
    var dateStr = ctx.dateStr;

    var header = '' +
      '<div class="dp-head">' +
        '<button class="food-page__back" data-dp-back="1" aria-label="Back">←</button>' +
        '<div class="dp-head__title">My Diet Plan</div>' +
        (plan ? '<button class="dp-head__menu" data-dp-plan-menu="1" aria-label="Plan options">⋮</button>'
              : '<span style="width:36px;"></span>') +
      '</div>';

    if (!plans.length || !plan) return '<div class="dp">' + header + emptyState() + '</div>';

    var isActive = D.activeId() === plan.id;

    var selector = '' +
      '<div class="dp-bar">' +
        '<div class="dp-bar__select">' +
          '<select id="dp-plan-select" aria-label="Choose a diet plan">' +
            plans.map(function (p) {
              return '<option value="' + esc(p.id) + '"' + (p.id === plan.id ? " selected" : "") + '>' +
                esc(p.name) + '</option>';
            }).join("") +
          '</select>' +
        '</div>' +
        (isActive
          ? '<span class="dp-badge dp-badge--on">Active</span>'
          : '<button class="dp-badge dp-badge--off" data-dp-set-active="' + esc(plan.id) + '">Set active</button>') +
        '<button class="dp-newplan" data-dp-create="1">+ New</button>' +
      '</div>';

    var details = ui.details ? (function () {
      var T = D.dayTotals(plan);
      var rows = [
        ["Calories", T.calories, " Cal"], ["Protein", T.protein, "g"], ["Carbohydrates", T.carbs, "g"],
        ["Fat", T.fat, "g"], ["Fibre", T.fibre, "g"], ["Sugar", T.sugar, "g"], ["Sodium", T.sodium, "mg"]
      ];
      return '<div class="dp-details">' +
        rows.map(function (r) {
          return '<div class="dp-details__row"><span>' + r[0] + '</span><b>' +
            (r[1] == null ? "—" : num(r[1], r[2])) + '</b></div>';
        }).join("") +
        '<p class="dp-details__note">A dash means no food in this plan reports that nutrient — ' +
        'not that the plan contains none of it.</p>' +
      '</div>';
    })() : "";

    var comp = D.completion(plan, dateStr);
    var progress = comp.total > 0 ? '' +
      '<div class="dp-progress">' +
        '<div class="dp-progress__head">' +
          '<span>Today\'s progress</span>' +
          '<span class="dp-progress__count">' + comp.done + ' of ' + comp.total + ' meals · ' + comp.pct + '%</span>' +
        '</div>' +
        '<div class="dp-progress__track"><div class="dp-progress__fill" style="--fill:' + (comp.pct/100) + ';"></div></div>' +
      '</div>' : '';

    /* Exactly the meals this plan has — no placeholders. The first is open by default so a
       new plan shows its "+ Add Food" rather than a stack of closed rows. */
    var meals = plan.meals.map(function (m, i) {
      var expanded = ui.expanded ? ui.expanded === m.id : i === 0;
      return mealCard(plan, m, expanded, dateStr);
    }).join("");

    var mealBar = '' +
      '<div class="dp-mealbar">' +
        '<span>' + plan.meals.length + (plan.meals.length === 1 ? " meal" : " meals") + ' a day</span>' +
        '<button data-dp-plan-action="meals">Change</button>' +
      '</div>';

    var sheet = "";
    if (ui.planMenu) sheet = planSheet(plan);
    else if (ui.sheet === "meals") sheet = mealCountSheet(plan);
    else if (ui.sheet === "meal" && ui.sheetMeal) {
      var sm = D.mealById(plan, ui.sheetMeal);
      if (sm) sheet = mealConfigSheet(plan, sm);
    }

    var firstMealId = plan.meals[0] ? plan.meals[0].id : "";
    var stickyTarget = (ui.expanded && D.mealById(plan, ui.expanded)) ? ui.expanded : firstMealId;

    return '' +
      '<div class="dp">' +
        header + selector +
        summaryCard(plan, ctx.targets) +
        details + progress + mealBar +
        '<div class="dp-meals">' + meals + '</div>' +
        (plan.meals.length < D.MAX_MEALS
          ? '<button class="dp-addmeal" data-dp-add-meal="1">+ Add a meal</button>' : '') +
        '<div class="dp-spacer"></div>' +
        sheet +
        '<div class="dp-sticky">' +
          '<button class="btn btn-accent dp-sticky__btn" data-dp-add-food="' + esc(stickyTarget) + '">' +
            '+ Add Food to Plan</button>' +
        '</div>' +
      '</div>';
  };
})();
