/* =========================================================
   IGNYT DIET PLANS — data layer for the Custom Diet Plan Builder

   A diet plan is a TEMPLATE, not a log. It says "this is what I intend to eat on a normal
   day"; the food log says "this is what I actually ate". They are deliberately separate
   stores: editing a plan must never rewrite history, and logging a meal must never silently
   alter the plan. The only place they meet is daily tracking, which records which of the
   plan's meals the user ticked off on a given date.

   MEALS ARE AN ORDERED LIST, NOT FIXED SLOTS.
   Each plan carries its own meals: how many (1–5), what they are called, and what time they
   are eaten. A person on one meal a day and a person on five are using the same structure
   with a different length, so there is no concept of an unused slot and never an empty meal
   card for a meal the user does not eat.

   ITEMS CARRY A NUTRITION SNAPSHOT, NOT A FOOD ID ALONE.
   The same rule the food log follows, for the same reason: the catalogue is edited (foods get
   corrected, enriched, re-imported), and a plan built last month must keep the numbers it was
   built from. foodId is stored alongside so an item can still be re-scaled or re-opened, but
   the totals never depend on the catalogue still containing that row.

   STORAGE
     hx_diet_plans          array of plans
     hx_diet_plan_active    id of the active plan
     hx_diet_plan_progress  { "YYYY-MM-DD": { planId, done: [mealId, ...] } }

   All three are additive. Nothing here reads or writes hx_food_log, hx_profile, hx_nutrition
   or any other existing key, so a build without this module behaves exactly as before.
========================================================= */
(function () {
  "use strict";

  var PLANS_KEY    = "hx_diet_plans";
  var ACTIVE_KEY   = "hx_diet_plan_active";
  var PROGRESS_KEY = "hx_diet_plan_progress";

  var MIN_MEALS = 1, MAX_MEALS = 5, DEFAULT_COUNT = 5;

  /* Default names per meal count. Five is the default because it is what most tracking apps
     assume and what existing plans already use; one-meal and two-meal schedules get neutral
     names because "Breakfast" is the wrong word for a meal eaten at 8pm. */
  var PRESETS = {
    1: [{ name: "Main Meal",     time: "13:00", icon: "plate" }],
    2: [{ name: "Meal 1",        time: "12:00", icon: "plate" },
        { name: "Meal 2",        time: "19:30", icon: "plate" }],
    3: [{ name: "Breakfast",     time: "08:00", icon: "sunrise" },
        { name: "Lunch",         time: "13:00", icon: "curry" },
        { name: "Dinner",        time: "19:30", icon: "bowl" }],
    4: [{ name: "Breakfast",     time: "08:00", icon: "sunrise" },
        { name: "Lunch",         time: "13:00", icon: "curry" },
        { name: "Evening Snack", time: "17:00", icon: "cake" },
        { name: "Dinner",        time: "19:30", icon: "bowl" }],
    5: [{ name: "Breakfast",     time: "08:00", icon: "sunrise" },
        { name: "Morning Snack", time: "10:30", icon: "apple" },
        { name: "Lunch",         time: "13:00", icon: "curry" },
        { name: "Evening Snack", time: "17:00", icon: "cake" },
        { name: "Dinner",        time: "19:30", icon: "bowl" }]
  };

  /* Totalled and displayed per the brief. One list so a meal row, a day total and the
     progress comparison can never drift apart. */
  var NUTRIENTS = ["calories", "protein", "carbs", "fat", "fibre", "sugar", "sodium"];

  /* The shape plans were first written in: a fixed six-key object. Kept only so those plans
     can be migrated on read — nothing writes this shape any more. */
  var LEGACY_MEAL_ORDER = ["Breakfast", "Morning Snack", "Lunch", "Evening Snack", "Dinner", "Bedtime Snack"];

  // ---------------------------------------------------------------- storage

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) {
      // Quota or private-mode failure. Report it rather than pretending the save worked —
      // a plan the user believes is saved but is not is worse than an error.
      console.warn("[diet] could not save " + key + ":", e);
      return false;
    }
  }

  function newId(prefix) {
    return (prefix || "dp") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function iconFor(name) {
    var n = String(name || "").toLowerCase();
    if (/breakfast/.test(n)) return "sunrise";
    if (/lunch/.test(n)) return "curry";
    if (/dinner|supper/.test(n)) return "bowl";
    if (/morning/.test(n)) return "apple";
    if (/evening|afternoon/.test(n)) return "cake";
    if (/bed|night/.test(n)) return "moon";
    if (/post|workout|shake/.test(n)) return "cup";
    return "plate";
  }

  function makeMeal(def) {
    return {
      id: newId("m"),
      name: String((def && def.name) || "Meal"),
      time: (def && def.time) || "",
      icon: (def && def.icon) || iconFor(def && def.name),
      items: []
    };
  }

  function mealsForCount(n) {
    var preset = PRESETS[clampCount(n)] || PRESETS[DEFAULT_COUNT];
    return preset.map(makeMeal);
  }

  function clampCount(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return DEFAULT_COUNT;
    return Math.min(MAX_MEALS, Math.max(MIN_MEALS, n));
  }

  /** Every plan read passes through here. It also MIGRATES the original fixed-slot shape:
   *  a plan saved as { meals: { Breakfast: [...], ... } } becomes an ordered meal list with
   *  the same food in the same order. Empty legacy meals are dropped rather than carried
   *  forward as blank cards, but a legacy meal holding food is always kept — losing a user's
   *  food to a schema change would be unforgivable, even if it pushes the count past five. */
  function normalisePlan(p) {
    if (!p || typeof p !== "object") return null;

    var meals;
    if (Array.isArray(p.meals)) {
      meals = p.meals.filter(Boolean).map(function (m) {
        return {
          id: m.id || newId("m"),
          name: String(m.name || "Meal"),
          time: m.time || "",
          icon: m.icon || iconFor(m.name),
          items: (Array.isArray(m.items) ? m.items : []).filter(Boolean).map(function (it) {
            return Object.assign({}, it, { id: it.id || newId("i") });
          })
        };
      });
    } else if (p.meals && typeof p.meals === "object") {
      meals = [];
      LEGACY_MEAL_ORDER.forEach(function (name) {
        var items = Array.isArray(p.meals[name]) ? p.meals[name].filter(Boolean) : [];
        if (!items.length) return;                    // an empty legacy slot is not a meal
        var m = makeMeal({ name: name, time: presetTimeFor(name), icon: iconFor(name) });
        m.items = items.map(function (it) {
          return Object.assign({}, it, { id: it.id || newId("i") });
        });
        meals.push(m);
      });
      // A legacy plan with nothing in it at all still needs a usable structure.
      if (!meals.length) meals = mealsForCount(DEFAULT_COUNT);
    } else {
      meals = mealsForCount(DEFAULT_COUNT);
    }

    if (!meals.length) meals = mealsForCount(1);

    return {
      id: p.id || newId(),
      name: String(p.name || "Untitled Plan"),
      createdAt: p.createdAt || Date.now(),
      updatedAt: p.updatedAt || p.createdAt || Date.now(),
      meals: meals
    };
  }

  function presetTimeFor(name) {
    var hit = null;
    PRESETS[5].forEach(function (m) { if (m.name === name) hit = m.time; });
    return hit || "";
  }

  function all() {
    var raw = readJson(PLANS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalisePlan).filter(Boolean);
  }

  function saveAll(plans) { return writeJson(PLANS_KEY, plans); }

  function get(id) {
    if (!id) return null;
    return all().filter(function (p) { return p.id === id; })[0] || null;
  }

  function mealById(plan, mealId) {
    if (!plan) return null;
    return plan.meals.filter(function (m) { return m.id === mealId; })[0] || null;
  }

  // ---------------------------------------------------------------- plan CRUD

  function create(name, mealCount) {
    var plans = all();
    var plan = {
      id: newId(),
      name: String(name || "").trim() || defaultName(plans),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      meals: mealsForCount(mealCount == null ? DEFAULT_COUNT : mealCount)
    };
    plans.push(plan);
    if (!saveAll(plans)) return null;
    if (!activeId()) setActive(plan.id);   // never leave plans existing with none active
    return plan;
  }

  function defaultName(plans) {
    var base = "My Diet Plan";
    var taken = (plans || all()).map(function (p) { return p.name; });
    if (taken.indexOf(base) === -1) return base;
    for (var i = 2; i < 999; i++) {
      if (taken.indexOf(base + " " + i) === -1) return base + " " + i;
    }
    return base + " " + Date.now();
  }

  function mutate(planId, fn) {
    var plans = all();
    var p = plans.filter(function (x) { return x.id === planId; })[0];
    if (!p) return false;
    if (fn(p) === false) return false;
    p.updatedAt = Date.now();
    return saveAll(plans);
  }

  function rename(id, name) {
    var clean = String(name || "").trim();
    if (!clean) return false;
    return mutate(id, function (p) { p.name = clean; });
  }

  function duplicate(id) {
    var src = get(id);
    if (!src) return null;
    var plans = all();
    var copy = normalisePlan(JSON.parse(JSON.stringify(src)));
    copy.id = newId();
    copy.name = uniqueCopyName(src.name, plans);
    copy.createdAt = copy.updatedAt = Date.now();
    // Fresh ids throughout: two plans sharing meal or item ids makes every edit ambiguous.
    copy.meals = copy.meals.map(function (m) {
      return Object.assign({}, m, {
        id: newId("m"),
        items: m.items.map(function (it) { return Object.assign({}, it, { id: newId("i") }); })
      });
    });
    plans.push(copy);
    return saveAll(plans) ? copy : null;
  }

  function uniqueCopyName(name, plans) {
    var taken = plans.map(function (p) { return p.name; });
    if (taken.indexOf(name + " (Copy)") === -1) return name + " (Copy)";
    for (var i = 2; i < 999; i++) {
      if (taken.indexOf(name + " (Copy " + i + ")") === -1) return name + " (Copy " + i + ")";
    }
    return name + " (Copy " + Date.now() + ")";
  }

  function remove(id) {
    var plans = all().filter(function (p) { return p.id !== id; });
    if (!saveAll(plans)) return false;
    if (activeId() === id) setActive(plans.length ? plans[0].id : null);
    return true;
  }

  // ---------------------------------------------------------------- meal configuration

  /**
   * Sets how many meals a day this plan has (1–5).
   *
   * Growing appends the extra meals from the preset for the new count. Shrinking is the case
   * that matters: food in the meals being removed is MOVED into the last surviving meal, never
   * deleted. Dropping from five meals to two must not silently bin someone's dinner, and a
   * confirmation the user clicks through without reading is not a safeguard.
   *
   * Returns { ok, moved } where `moved` is how many items were relocated, so the caller can
   * say what happened rather than leaving the user to notice.
   */
  function setMealCount(planId, count) {
    var target = clampCount(count);
    var moved = 0;
    var ok = mutate(planId, function (p) {
      var current = p.meals.length;
      if (current === target) return false;      // nothing to do; skip the write

      if (target > current) {
        var preset = PRESETS[target] || PRESETS[DEFAULT_COUNT];
        // Take names from the preset for the slots being added, keeping existing meals as-is.
        for (var i = current; i < target; i++) {
          p.meals.push(makeMeal(preset[i] || { name: "Meal " + (i + 1) }));
        }
      } else {
        var kept = p.meals.slice(0, target);
        var dropped = p.meals.slice(target);
        var sink = kept[kept.length - 1];
        dropped.forEach(function (m) {
          m.items.forEach(function (it) { sink.items.push(it); moved++; });
        });
        p.meals = kept;
      }
      return true;
    });
    return { ok: ok, moved: moved };
  }

  function renameMeal(planId, mealId, name) {
    var clean = String(name || "").trim();
    if (!clean) return false;
    return mutate(planId, function (p) {
      var m = mealById(p, mealId);
      if (!m) return false;
      m.name = clean;
      m.icon = iconFor(clean);
    });
  }

  function setMealTime(planId, mealId, time) {
    return mutate(planId, function (p) {
      var m = mealById(p, mealId);
      if (!m) return false;
      m.time = String(time || "");
    });
  }

  /** Moves a meal up or down the day. Order is the list order — there is no sort key to keep
   *  in sync, so a reorder cannot leave the plan in a contradictory state. */
  function moveMeal(planId, mealId, direction) {
    return mutate(planId, function (p) {
      var i = -1;
      p.meals.forEach(function (m, idx) { if (m.id === mealId) i = idx; });
      var j = i + (direction < 0 ? -1 : 1);
      if (i === -1 || j < 0 || j >= p.meals.length) return false;
      var tmp = p.meals[i]; p.meals[i] = p.meals[j]; p.meals[j] = tmp;
    });
  }

  /** Deletes a meal outright. Refuses to remove the last one — a plan with no meals has no
   *  way back to having any. Food in the deleted meal moves to the previous meal. */
  function deleteMeal(planId, mealId) {
    var moved = 0;
    var ok = mutate(planId, function (p) {
      if (p.meals.length <= MIN_MEALS) return false;
      var i = -1;
      p.meals.forEach(function (m, idx) { if (m.id === mealId) i = idx; });
      if (i === -1) return false;
      var doomed = p.meals[i];
      var sink = p.meals[i === 0 ? 1 : i - 1];
      doomed.items.forEach(function (it) { sink.items.push(it); moved++; });
      p.meals.splice(i, 1);
    });
    return { ok: ok, moved: moved };
  }

  function addMeal(planId, name) {
    var added = null;
    var ok = mutate(planId, function (p) {
      if (p.meals.length >= MAX_MEALS) return false;
      var preset = PRESETS[p.meals.length + 1] || [];
      added = makeMeal({ name: name || (preset[p.meals.length] && preset[p.meals.length].name) ||
                               ("Meal " + (p.meals.length + 1)) });
      p.meals.push(added);
    });
    return ok ? added : null;
  }

  // ---------------------------------------------------------------- active plan

  function activeId() {
    var id = readJson(ACTIVE_KEY, null);
    if (!id) return null;
    return get(id) ? id : null;   // a stale pointer must not resolve to a ghost
  }

  function setActive(id) {
    if (id == null) { try { localStorage.removeItem(ACTIVE_KEY); } catch (e) {} return true; }
    return writeJson(ACTIVE_KEY, id);
  }

  function active() { return get(activeId()); }

  // ---------------------------------------------------------------- items

  /** `record` is the same snapshot shape the food log stores (see commitSelectedFood in
   *  app.js) — name, macros, optional micros, and the provenance needed to re-scale it. */
  function addItem(planId, mealId, record) {
    if (!record) return false;
    return mutate(planId, function (p) {
      var m = mealById(p, mealId);
      if (!m) return false;
      var item = Object.assign({}, record, { id: newId("i") });
      delete item.date;   // a plan item has no date; it is a template row
      delete item.at;
      m.items.push(item);
    });
  }

  function removeItem(planId, mealId, itemId) {
    return mutate(planId, function (p) {
      var m = mealById(p, mealId);
      if (!m) return false;
      var before = m.items.length;
      m.items = m.items.filter(function (it) { return it.id !== itemId; });
      return m.items.length !== before;
    });
  }

  function replaceItem(planId, mealId, itemId, record) {
    return mutate(planId, function (p) {
      var m = mealById(p, mealId);
      if (!m) return false;
      var idx = -1;
      m.items.forEach(function (it, i) { if (it.id === itemId) idx = i; });
      if (idx === -1) return false;
      m.items[idx] = Object.assign({}, record, { id: itemId });
      delete m.items[idx].date;
      delete m.items[idx].at;
    });
  }

  function findItem(planId, mealId, itemId) {
    var m = mealById(get(planId), mealId);
    if (!m) return null;
    return m.items.filter(function (it) { return it.id === itemId; })[0] || null;
  }

  function moveItem(planId, fromMealId, itemId, toMealId) {
    if (fromMealId === toMealId) return false;
    return mutate(planId, function (p) {
      var from = mealById(p, fromMealId), to = mealById(p, toMealId);
      if (!from || !to) return false;
      var item = from.items.filter(function (it) { return it.id === itemId; })[0];
      if (!item) return false;
      from.items = from.items.filter(function (it) { return it.id !== itemId; });
      to.items.push(item);
    });
  }

  // ---------------------------------------------------------------- totals

  /** Sums a set of items. A nutrient absent from EVERY item stays null rather than becoming 0
   *  — "no food here reports sodium" and "this contains no sodium" are different claims, and
   *  the UI shows a dash for the first. */
  function sumItems(items) {
    var out = {};
    NUTRIENTS.forEach(function (k) { out[k] = null; });
    (items || []).forEach(function (it) {
      NUTRIENTS.forEach(function (k) {
        var v = it[k];
        if (v == null || isNaN(Number(v))) return;
        out[k] = (out[k] == null ? 0 : out[k]) + Number(v);
      });
    });
    out.count = (items || []).length;
    return out;
  }

  function mealTotals(plan, mealId) {
    var m = mealById(plan, mealId);
    return sumItems(m ? m.items : []);
  }

  function dayTotals(plan) {
    if (!plan) return sumItems([]);
    var everything = [];
    plan.meals.forEach(function (m) { everything = everything.concat(m.items || []); });
    return sumItems(everything);
  }

  function itemCount(plan) {
    if (!plan) return 0;
    return plan.meals.reduce(function (a, m) { return a + m.items.length; }, 0);
  }

  // ---------------------------------------------------------------- daily tracking

  function progressAll() { return readJson(PROGRESS_KEY, {}) || {}; }

  function progressFor(planId, dateStr) {
    var day = progressAll()[dateStr];
    /* Ticks belong to the plan they were made against, and the key is the date — so a new day
       starts with nothing ticked without needing a reset job to run. Switching plans must not
       carry a half-finished day across to a different set of meals. */
    if (!day || day.planId !== planId) return [];
    return Array.isArray(day.done) ? day.done : [];
  }

  function isMealDone(planId, dateStr, mealId) {
    return progressFor(planId, dateStr).indexOf(mealId) !== -1;
  }

  function toggleMealDone(planId, dateStr, mealId) {
    var store = progressAll();
    var day = store[dateStr];
    if (!day || day.planId !== planId) day = { planId: planId, done: [] };
    var i = day.done.indexOf(mealId);
    if (i === -1) day.done.push(mealId); else day.done.splice(i, 1);
    store[dateStr] = day;
    writeJson(PROGRESS_KEY, store);
    return day.done.indexOf(mealId) !== -1;
  }

  /** Completion over the meals that actually HAVE food. An empty meal cannot be "completed",
   *  and counting it in the denominator would cap a fully-eaten plan below 100%. */
  function completion(plan, dateStr) {
    if (!plan) return { done: 0, total: 0, pct: 0 };
    var done = progressFor(plan.id, dateStr);
    var withFood = plan.meals.filter(function (m) { return m.items.length > 0; });
    var hit = withFood.filter(function (m) { return done.indexOf(m.id) !== -1; });
    return {
      done: hit.length,
      total: withFood.length,
      pct: withFood.length ? Math.round(hit.length / withFood.length * 100) : 0
    };
  }

  /** Totals for the meals ticked off today — what was actually followed, as opposed to what
   *  the plan prescribes. */
  function followedTotals(plan, dateStr) {
    if (!plan) return sumItems([]);
    var done = progressFor(plan.id, dateStr);
    var items = [];
    plan.meals.forEach(function (m) {
      if (done.indexOf(m.id) !== -1) items = items.concat(m.items);
    });
    return sumItems(items);
  }

  window.IgnytDietPlans = {
    MIN_MEALS: MIN_MEALS, MAX_MEALS: MAX_MEALS, DEFAULT_COUNT: DEFAULT_COUNT,
    PRESETS: PRESETS, NUTRIENTS: NUTRIENTS,
    all: all, get: get, create: create, rename: rename, duplicate: duplicate, remove: remove,
    activeId: activeId, setActive: setActive, active: active,
    mealById: mealById, setMealCount: setMealCount, renameMeal: renameMeal,
    setMealTime: setMealTime, moveMeal: moveMeal, deleteMeal: deleteMeal, addMeal: addMeal,
    addItem: addItem, removeItem: removeItem, replaceItem: replaceItem,
    findItem: findItem, moveItem: moveItem,
    mealTotals: mealTotals, dayTotals: dayTotals, sumItems: sumItems, itemCount: itemCount,
    progressFor: progressFor, isMealDone: isMealDone, toggleMealDone: toggleMealDone,
    completion: completion, followedTotals: followedTotals
  };
})();
