/* =========================================================
   SMART GOAL ENGINE (Phase 1)

   Central, reusable goal engine. Isolated module so it can't destabilise the rest of the app;
   it owns its own localStorage keys (hx_goals, hx_active_goal). Fully offline via localStorage —
   the app has never used SQLite and doesn't need it; localStorage already satisfies "works
   completely offline", and the existing Firestore cloud-sync layer can adopt these keys later.

   REAL integration (modules that exist): on activation the goal writes state.profile.goalDelta
   and the nutrition macro split, so the app's existing calorie/macro pipeline
   (profileCalorieTarget -> macroTargets -> Nutrition + Home) automatically adapts to the active
   goal — no changes to nutrition code. Progress reads the real weight log (state.bodylog) and
   workout history (state.workoutLog).

   Deliberately NOT faked: a workout generator, DEXA, InBody, challenges, a recovery engine and a
   calendar don't exist in this app, so the engine doesn't pretend to drive them.
========================================================= */
(function () {
  "use strict";
  var GOALS = "hx_goals", ACTIVE = "hx_active_goal";
  var KCAL_PER_KG = 7700;

  var GOAL_TYPES = [
    { id: "weight_loss", label: "Weight Loss", dir: -1, protein: 2.0 },
    { id: "fat_loss", label: "Fat Loss", dir: -1, protein: 2.2 },
    { id: "muscle_gain", label: "Muscle Gain", dir: 1, protein: 2.0 },
    { id: "recomp", label: "Body Recomposition", dir: 0, protein: 2.2 },
    { id: "strength", label: "Strength", dir: 1, protein: 1.8 },
    { id: "powerlifting", label: "Powerlifting", dir: 1, protein: 1.8 },
    { id: "bodybuilding", label: "Bodybuilding", dir: 1, protein: 2.2 },
    { id: "hyrox", label: "HYROX", dir: 0, protein: 1.8 },
    { id: "marathon", label: "Marathon", dir: 0, protein: 1.6 },
    { id: "running", label: "Running", dir: 0, protein: 1.6 },
    { id: "cycling", label: "Cycling", dir: 0, protein: 1.6 },
    { id: "functional", label: "Functional Fitness", dir: 0, protein: 1.8 },
    { id: "general", label: "General Fitness", dir: 0, protein: 1.6 },
    { id: "athletic", label: "Athletic Performance", dir: 0, protein: 1.8 },
    { id: "custom", label: "Custom Goal", dir: 0, protein: 1.8 }
  ];
  var typeById = {}; GOAL_TYPES.forEach(function (t) { typeById[t.id] = t; });

  /* ---------- storage ---------- */
  function loadGoals() { try { var a = JSON.parse(localStorage.getItem(GOALS) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveGoals(a) { try { localStorage.setItem(GOALS, JSON.stringify(a)); } catch (e) {} }
  function activeId() { try { return JSON.parse(localStorage.getItem(ACTIVE) || "null"); } catch (e) { return null; } }
  function setActiveId(id) { try { localStorage.setItem(ACTIVE, JSON.stringify(id)); } catch (e) {} }
  function activeGoal() { var id = activeId(); return loadGoals().filter(function (g) { return String(g.id) === String(id) && g.status === "active"; })[0] || null; }
  function uid() { return window.nextId ? window.nextId() : Date.now(); }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d == null ? null : d); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function currentWeightKg() { var b = (typeof state !== "undefined" && state.bodylog) || []; return b.length ? Number(b[0].weight) : null; }

  /* ---------- calculations (reuse the app's own formulas) ---------- */
  function compute(g) {
    var bmr = window.calcBMR ? Math.round(window.calcBMR(g.age, g.gender, g.height, g.startWeight)) : Math.round(10 * g.startWeight + 6.25 * g.height - 5 * g.age + (g.gender === "male" ? 5 : -161));
    var maintenance = Math.round(bmr * (g.activityMultiplier || 1.4));
    var lbmObj = window.calcLBM ? window.calcLBM(g.gender, g.height, g.startWeight) : { boer: null };
    var lbm = lbmObj.boer != null ? Math.round(lbmObj.boer * 10) / 10 : null;
    var bmi = g.height ? Math.round((g.startWeight / Math.pow(g.height / 100, 2)) * 10) / 10 : null;
    var t = typeById[g.type] || typeById.custom;

    // weekly rate: from target date if set, else a safe default per direction
    var deltaKg = (g.targetWeight != null && g.startWeight != null) ? (g.targetWeight - g.startWeight) : 0; // negative = loss
    var weeks = null, weeklyRate;
    if (g.targetDate) {
      var d = (new Date(g.targetDate) - new Date(g.startDate || todayISO())) / (7 * 864e5);
      weeks = Math.max(1, Math.round(d));
      weeklyRate = deltaKg / weeks;
    } else {
      weeklyRate = deltaKg === 0 ? 0 : (deltaKg < 0 ? -0.5 : 0.25); // safe defaults
      weeks = weeklyRate ? Math.abs(deltaKg / weeklyRate) : null;
    }
    // clamp to safe bounds (loss up to ~1kg/wk, gain up to ~0.5kg/wk)
    if (weeklyRate < -1.0) weeklyRate = -1.0; if (weeklyRate > 0.5) weeklyRate = 0.5;

    var goalDelta = Math.round(weeklyRate * KCAL_PER_KG / 7); // daily kcal delta (neg = deficit)
    var calories = Math.max(1200, maintenance + goalDelta);
    var proteinG = Math.round((t.protein || 1.8) * g.startWeight);
    var fatKcal = calories * 0.25, fatG = Math.round(fatKcal / 9);
    var proteinKcal = proteinG * 4;
    var carbG = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4));

    var targetLeanMass = null, targetFatMass = null;
    if (g.targetWeight != null && g.targetBodyFat != null) {
      targetFatMass = Math.round(g.targetWeight * g.targetBodyFat / 100 * 10) / 10;
      targetLeanMass = Math.round((g.targetWeight - targetFatMass) * 10) / 10;
    }
    var completion = null;
    if (weeks != null && isFinite(weeks) && deltaKg !== 0) {
      var c = new Date(g.startDate || todayISO()); c.setDate(c.getDate() + Math.round(weeks * 7)); completion = c.toISOString().slice(0, 10);
    }
    return {
      bmr: bmr, maintenance: maintenance, lbm: lbm, bmi: bmi,
      weeklyRate: Math.round(weeklyRate * 100) / 100, goalDelta: goalDelta, calories: calories,
      protein: proteinG, fat: fatG, carbs: carbG,
      targetLeanMass: targetLeanMass, targetFatMass: targetFatMass,
      weeks: weeks != null ? Math.round(weeks) : null, completion: completion,
      proteinPct: Math.round(proteinKcal / calories * 100), fatPct: 25, carbPct: Math.round(carbG * 4 / calories * 100)
    };
  }

  function milestonesFor(g) {
    var ms = [], start = g.startWeight, target = g.targetWeight;
    if (start != null && target != null && start !== target) {
      var loss = target < start, step = loss ? -5 : 5, v = start + step;
      while (loss ? v > target : v < target) { ms.push({ label: (loss ? "Reach " : "Reach ") + v + " kg", weight: Math.round(v * 10) / 10 }); v += step; }
      ms.push({ label: "Reach goal weight " + target + " kg", weight: target });
    }
    if (g.targetBodyFat != null) ms.push({ label: "Reach " + g.targetBodyFat + "% body fat", bodyFat: g.targetBodyFat });
    return ms;
  }
  // A milestone is "reached" when current weight has crossed it in the goal's direction.
  function milestoneDone(g, m, cur) {
    if (cur == null) return false;
    if (m.weight != null) return g.targetWeight < g.startWeight ? cur <= m.weight : cur >= m.weight;
    return false;
  }

  function progressPct(g, cur) {
    if (cur == null || g.startWeight == null || g.targetWeight == null || g.startWeight === g.targetWeight) return null;
    var p = (g.startWeight - cur) / (g.startWeight - g.targetWeight) * 100;
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  /* ---------- apply active goal to the app's existing nutrition pipeline ---------- */
  function applyToProfile(g) {
    if (typeof state === "undefined") return;
    var c = compute(g), p = state.profile;
    // Sync the profile fields the wizard collected so profileMaintenance() computes the SAME
    // maintenance the goal did — then profileCalorieTarget() -> macroTargets() -> Nutrition/Home
    // reflect the goal's exact calorie/macro targets with no changes to nutrition code.
    if (g.startWeight != null) p.weight = g.startWeight;
    if (g.height != null) p.height = g.height;
    if (g.age != null) p.age = g.age;
    if (g.gender) p.gender = g.gender;
    if (g.activityMultiplier != null) p.activityMultiplier = g.activityMultiplier;
    p.goalDelta = c.goalDelta;
    if (state.nutrition) { state.nutrition.proteinPct = c.proteinPct; state.nutrition.fatPct = c.fatPct; state.nutrition.carbPct = Math.max(0, 100 - c.proteinPct - c.fatPct); }
    if (window.persist) window.persist();
  }

  /* ---------- rendering ---------- */
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var svg = function (n, s) { return window.svg ? window.svg(n, s) : ""; };
  var fmtDate = function (d) { try { return new Date(d).toLocaleDateString("default", { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return d || ""; } };
  var wUnit = function () { return (window.wUnit ? window.wUnit() : "kg"); };
  var dW = function (kg) { return (window.displayW ? window.displayW(kg, 1) : kg); };

  var view = { screen: null, step: 1, draft: null }; // screen: null=auto, 'wizard','history','timeline'
  function resetView() { view = { screen: null, step: 1, draft: null }; }

  function render() {
    if (view.screen === "wizard") return renderWizard();
    if (view.screen === "history") return renderHistory();
    if (view.screen === "timeline") return renderTimeline();
    return activeGoal() ? renderDashboard() : renderIntro();
  }

  function head(title, back) {
    return (back ? '<button class="btn btn-ghost" data-goal="home" style="padding:8px 14px;font-size:14px;margin:4px 0 10px;">← Back</button>' : "") +
      '<div style="font-size:25px;font-weight:900;margin-bottom:4px;">🎯 ' + esc(title) + "</div>";
  }

  function renderIntro() {
    var archived = loadGoals().length;
    return head("Goals") +
      '<div style="font-size:14px;color:var(--muted);margin-bottom:14px;">Set a goal and IGNYT tailors your daily calories, macros and progress tracking to it.</div>' +
      '<button class="btn btn-accent btn-block" data-goal="new">' + svg("plus", 16) + ' Create a Goal</button>' +
      (archived ? '<button class="btn btn-secondary btn-block" data-goal="history" style="margin-top:10px;">Past goals (' + archived + ')</button>' : "");
  }

  /* ----- wizard (3 steps) ----- */
  function draftInit() {
    var p = (typeof state !== "undefined" && state.profile) || {};
    return {
      type: "weight_loss", startDate: todayISO(), targetDate: "",
      startWeight: currentWeightKg() || p.weight || 80, targetWeight: "", startBodyFat: "", targetBodyFat: "",
      height: p.height || 175, age: p.age || 30, gender: p.gender || "male",
      activityMultiplier: p.activityMultiplier || 1.465, trainingDays: p.trainingDays || 4, workoutDuration: 60,
      equipment: "", foodPref: "", restrictions: "", injuries: "", motivation: ""
    };
  }
  function renderWizard() {
    var d = view.draft || (view.draft = draftInit());
    var s = view.step;
    var h = head("New Goal", true) + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Step ' + s + ' of 3</div>';
    if (s === 1) {
      h += '<div class="goal-card"><label class="goal-label">Goal type</label><select id="g-type" class="goal-input">' +
        GOAL_TYPES.map(function (t) { return '<option value="' + t.id + '"' + (d.type === t.id ? " selected" : "") + '>' + esc(t.label) + '</option>'; }).join("") + '</select>' +
        '<label class="goal-label">Current weight (' + wUnit() + ')</label><input id="g-cw" class="goal-input" inputmode="decimal" value="' + esc(d.startWeight) + '">' +
        '<label class="goal-label">Target weight (' + wUnit() + ', optional)</label><input id="g-tw" class="goal-input" inputmode="decimal" value="' + esc(d.targetWeight) + '">' +
        '<label class="goal-label">Target date (optional)</label><input id="g-td" type="date" class="goal-input" value="' + esc(d.targetDate) + '">' +
        '</div>';
    } else if (s === 2) {
      h += '<div class="goal-card">' +
        '<div class="goal-two"><div><label class="goal-label">Height (cm)</label><input id="g-h" class="goal-input" inputmode="decimal" value="' + esc(d.height) + '"></div>' +
        '<div><label class="goal-label">Age</label><input id="g-age" class="goal-input" inputmode="numeric" value="' + esc(d.age) + '"></div></div>' +
        '<label class="goal-label">Gender</label><select id="g-gender" class="goal-input"><option value="male"' + (d.gender === "male" ? " selected" : "") + '>Male</option><option value="female"' + (d.gender === "female" ? " selected" : "") + '>Female</option></select>' +
        '<label class="goal-label">Activity level</label><select id="g-act" class="goal-input">' +
        [[1.2, "Sedentary"], [1.375, "Light"], [1.465, "Moderate"], [1.55, "Active"], [1.725, "Very active"]].map(function (a) { return '<option value="' + a[0] + '"' + (Number(d.activityMultiplier) === a[0] ? " selected" : "") + '>' + a[1] + '</option>'; }).join("") + '</select>' +
        '<div class="goal-two"><div><label class="goal-label">Current body fat % (opt)</label><input id="g-cbf" class="goal-input" inputmode="decimal" value="' + esc(d.startBodyFat) + '"></div>' +
        '<div><label class="goal-label">Target body fat % (opt)</label><input id="g-tbf" class="goal-input" inputmode="decimal" value="' + esc(d.targetBodyFat) + '"></div></div>' +
        '<div class="goal-two"><div><label class="goal-label">Training days/week</label><input id="g-days" class="goal-input" inputmode="numeric" value="' + esc(d.trainingDays) + '"></div>' +
        '<div><label class="goal-label">Session (min)</label><input id="g-dur" class="goal-input" inputmode="numeric" value="' + esc(d.workoutDuration) + '"></div></div>' +
        '</div>';
    } else {
      var g = draftToGoal(d), c = compute(g);
      h += '<div class="goal-card"><label class="goal-label">Equipment (optional)</label><input id="g-equip" class="goal-input" value="' + esc(d.equipment) + '" placeholder="e.g. Full gym, dumbbells only">' +
        '<label class="goal-label">Food preference (optional)</label><input id="g-food" class="goal-input" value="' + esc(d.foodPref) + '" placeholder="e.g. Vegetarian">' +
        '<label class="goal-label">Injuries / restrictions (optional)</label><input id="g-inj" class="goal-input" value="' + esc(d.injuries) + '">' +
        '<label class="goal-label">Primary motivation (optional)</label><input id="g-mot" class="goal-input" value="' + esc(d.motivation) + '"></div>' +
        '<div class="section-heading"><span class="section-heading__label">Your plan</span></div>' + planGrid(c) +
        (c.completion ? '<div style="font-size:12px;color:var(--muted);margin:8px 2px;">Est. completion ' + fmtDate(c.completion) + ' at ~' + Math.abs(c.weeklyRate) + ' ' + wUnit() + '/week.</div>' : "");
    }
    h += '<div style="display:flex;gap:8px;margin-top:14px;">' +
      (s > 1 ? '<button class="btn btn-secondary" data-goal="prev" style="flex:1;">Back</button>' : "") +
      (s < 3 ? '<button class="btn btn-accent" data-goal="next" style="flex:2;">Next</button>' : '<button class="btn btn-accent" data-goal="create" style="flex:2;">Start Goal</button>') +
      '</div>';
    return h;
  }
  function planGrid(c) {
    var cell = function (l, v, u) { return '<div class="goal-metric"><div class="goal-metric__l">' + l + '</div><div class="goal-metric__v">' + v + (u ? '<span class="goal-metric__u">' + u + '</span>' : '') + '</div></div>'; };
    return '<div class="goal-grid">' +
      cell("Daily calories", c.calories, "kcal") + cell("Maintenance", c.maintenance, "kcal") +
      cell("Protein", c.protein, "g") + cell("Carbs", c.carbs, "g") + cell("Fat", c.fat, "g") +
      cell("BMR", c.bmr, "kcal") + cell("Lean mass", c.lbm != null ? c.lbm : "—", "kg") + cell("BMI", c.bmi != null ? c.bmi : "—", "") +
      (c.targetLeanMass != null ? cell("Target lean", c.targetLeanMass, "kg") + cell("Target fat", c.targetFatMass, "kg") : "") +
      cell("Weekly change", (c.weeklyRate > 0 ? "+" : "") + c.weeklyRate, "kg") + '</div>';
  }
  function draftToGoal(d) {
    return {
      type: d.type, startDate: d.startDate, targetDate: d.targetDate || null,
      startWeight: num(d.startWeight), targetWeight: num(d.targetWeight), startBodyFat: num(d.startBodyFat), targetBodyFat: num(d.targetBodyFat),
      height: num(d.height, 175), age: num(d.age, 30), gender: d.gender, activityMultiplier: num(d.activityMultiplier, 1.4),
      trainingDays: num(d.trainingDays, 4), workoutDuration: num(d.workoutDuration, 60),
      equipment: d.equipment, foodPref: d.foodPref, restrictions: d.restrictions, injuries: d.injuries, motivation: d.motivation
    };
  }

  /* ----- dashboard ----- */
  function workoutsThisWeek() {
    var log = (typeof state !== "undefined" && state.workoutLog) || [], now = new Date(), day = (now.getDay() + 6) % 7;
    var mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - day);
    return log.filter(function (w) { return new Date(w.startedAt || w.date) >= mon; }).length;
  }
  function renderDashboard() {
    var g = activeGoal(), c = compute(g), cur = currentWeightKg(), t = typeById[g.type] || typeById.custom;
    var pct = progressPct(g, cur);
    var remaining = (cur != null && g.targetWeight != null) ? Math.round(Math.abs(cur - g.targetWeight) * 10) / 10 : null;
    var ms = milestonesFor(g).map(function (m) { m.done = milestoneDone(g, m, cur); return m; });
    var next = ms.filter(function (m) { return !m.done; })[0];
    var eaten = window.todayEaten ? Math.round(window.todayEaten()) : null;
    var protToday = window.todayMacros ? Math.round(window.todayMacros().protein) : null;
    var wk = workoutsThisWeek();

    var h = head(t.label) +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Started ' + fmtDate(g.startDate) + (g.targetDate ? ' · target ' + fmtDate(g.targetDate) : "") + '</div>';

    // progress ring-ish bar
    h += '<div class="goal-card"><div class="row-between"><span style="font-weight:800;">Goal progress</span><span class="mono" style="font-weight:900;color:var(--color-interactive);">' + (pct == null ? "—" : pct + "%") + '</span></div>' +
      (pct != null ? '<div class="goal-bar"><span style="width:' + pct + '%;"></span></div>' : "") +
      '<div class="row-between" style="margin-top:8px;font-size:13px;color:var(--muted);">' +
      '<span>' + (cur != null ? dW(cur) + " " + wUnit() : "no weight logged") + '</span>' +
      '<span>' + (remaining != null ? remaining + " " + wUnit() + " to go" : "") + '</span></div>' +
      (c.completion ? '<div style="font-size:12px;color:var(--muted);margin-top:6px;">Est. completion ' + fmtDate(c.completion) + '</div>' : "") + '</div>';

    h += '<div class="section-heading"><span class="section-heading__label">Today</span></div>' +
      '<div class="goal-grid">' +
      '<div class="goal-metric"><div class="goal-metric__l">Calories</div><div class="goal-metric__v">' + (eaten != null ? eaten : "—") + '<span class="goal-metric__u">/ ' + c.calories + '</span></div></div>' +
      '<div class="goal-metric"><div class="goal-metric__l">Protein</div><div class="goal-metric__v">' + (protToday != null ? protToday : "—") + '<span class="goal-metric__u">/ ' + c.protein + 'g</span></div></div>' +
      '<div class="goal-metric"><div class="goal-metric__l">Workouts (wk)</div><div class="goal-metric__v">' + wk + '<span class="goal-metric__u">/ ' + (g.trainingDays || "—") + '</span></div></div>' +
      '<div class="goal-metric"><div class="goal-metric__l">Streak</div><div class="goal-metric__v">' + (window.computeStreak ? window.computeStreak() : 0) + '<span class="goal-metric__u">days</span></div></div>' +
      '</div>';

    h += '<div class="section-heading"><span class="section-heading__label">Nutrition targets</span></div>' + planGrid(c) +
      '<div style="font-size:11px;color:var(--muted);margin:6px 2px;">These targets drive your Nutrition and Home calorie/macro goals automatically.</div>';

    h += '<div class="section-heading"><span class="section-heading__label">Milestones</span></div><div class="goal-card">' +
      (ms.length ? ms.map(function (m) { return '<div class="row-between" style="padding:7px 0;border-top:1px solid var(--border);"><span>' + (m.done ? "✅ " : "⬜ ") + esc(m.label) + '</span></div>'; }).join("") : '<div style="color:var(--muted);font-size:13px;">Set a target weight to generate milestones.</div>') +
      (next ? '<div style="font-size:12px;color:var(--muted);margin-top:8px;">Next: ' + esc(next.label) + '</div>' : "") + '</div>';

    h += '<div class="section-heading"><span class="section-heading__label">Manage</span></div><div style="display:flex;flex-wrap:wrap;gap:8px;">' +
      '<button class="btn btn-secondary" data-goal="pause" style="flex:1;">Pause</button>' +
      '<button class="btn btn-secondary" data-goal="complete" style="flex:1;">Complete</button>' +
      '<button class="btn btn-secondary" data-goal="timeline" style="flex:1;">Timeline</button>' +
      '<button class="btn btn-ghost" data-goal="cancel" style="flex:1;color:var(--accent);">Cancel</button>' +
      '</div><button class="btn btn-secondary btn-block" data-goal="history" style="margin-top:8px;">Past goals</button>';
    return h;
  }

  function renderHistory() {
    var goals = loadGoals().slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    var h = head("Past Goals", true);
    if (!goals.length) return h + '<div class="empty-note">No goals yet.</div>';
    goals.forEach(function (g) {
      var t = typeById[g.type] || typeById.custom;
      h += '<div class="goal-card"><div class="row-between"><div><div style="font-weight:800;">' + esc(t.label) + '</div>' +
        '<div style="font-size:12px;color:var(--muted);">' + fmtDate(g.startDate) + ' · ' + esc(g.status) + '</div></div>' +
        (g.status !== "active" ? '<button class="btn btn-ghost" data-goal="resume" data-id="' + g.id + '" style="padding:6px 12px;font-size:12px;">Reactivate</button>' : '<span class="mono" style="color:var(--color-interactive);font-size:12px;">ACTIVE</span>') + '</div></div>';
    });
    return h;
  }
  function renderTimeline() {
    var g = activeGoal(); if (!g) { resetView(); return render(); }
    var ev = (g.history || []).slice().sort(function (a, b) { return b.at - a.at; });
    var h = head("Goal Timeline", true);
    (state.bodylog || []).slice(0, 12).forEach(function (b) { ev.push({ at: new Date(b.date).getTime(), event: "Weight " + dW(b.weight) + " " + wUnit() }); });
    ev.sort(function (a, b) { return b.at - a.at; });
    if (!ev.length) return h + '<div class="empty-note">No events yet.</div>';
    ev.forEach(function (e) { h += '<div class="goal-row"><span style="color:var(--muted);">' + fmtDate(e.at) + '</span><span>' + esc(e.event) + '</span></div>'; });
    return h;
  }

  /* ---------- mutations ---------- */
  function hist(g, event) { (g.history = g.history || []).push({ at: Date.now(), event: event }); }
  function persistGoals(goals) { saveGoals(goals); }
  function createFromDraft() {
    var g = draftToGoal(view.draft);
    g.id = uid(); g.status = "active"; g.createdAt = Date.now(); g.history = [];
    hist(g, "Goal created");
    var goals = loadGoals();
    goals.forEach(function (x) { if (x.status === "active") { x.status = "archived"; } }); // one active goal
    goals.unshift(g); persistGoals(goals); setActiveId(g.id);
    applyToProfile(g);
    resetView();
    if (window.showToast) window.showToast("Goal started — your nutrition targets are set.", "info", window.render);
  }
  function updateActive(fn, toast) {
    var goals = loadGoals(), id = activeId(), changed = false;
    goals.forEach(function (g) { if (String(g.id) === String(id)) { fn(g); changed = true; } });
    if (changed) { persistGoals(goals); if (toast && window.showToast) window.showToast(toast, "info", window.render); }
  }

  /* ---------- handlers (one-time delegated) ---------- */
  var _bound = false;
  function repaint() { if (window.render) window.render(); }
  function readStep() {
    var d = view.draft; if (!d) return; var v = function (id) { var e = document.getElementById(id); return e ? e.value : undefined; };
    if (view.step === 1) { d.type = v("g-type"); d.startWeight = v("g-cw"); d.targetWeight = v("g-tw"); d.targetDate = v("g-td"); }
    else if (view.step === 2) { d.height = v("g-h"); d.age = v("g-age"); d.gender = v("g-gender"); d.activityMultiplier = v("g-act"); d.startBodyFat = v("g-cbf"); d.targetBodyFat = v("g-tbf"); d.trainingDays = v("g-days"); d.workoutDuration = v("g-dur"); }
    else if (view.step === 3) { d.equipment = v("g-equip"); d.foodPref = v("g-food"); d.injuries = v("g-inj"); d.motivation = v("g-mot"); }
  }
  function attach() {
    if (_bound) return; _bound = true;
    document.addEventListener("click", function (e) {
      if (typeof state === "undefined" || state.tab !== "goals") return;
      var el = e.target.closest("[data-goal]"); if (!el) return;
      var a = el.getAttribute("data-goal");
      if (a === "home") { resetView(); return repaint(); }
      if (a === "new") { view.screen = "wizard"; view.step = 1; view.draft = draftInit(); return repaint(); }
      if (a === "next") { readStep(); if (view.step < 3) view.step++; return repaint(); }
      if (a === "prev") { readStep(); if (view.step > 1) view.step--; return repaint(); }
      if (a === "create") { readStep(); createFromDraft(); return repaint(); }
      if (a === "history") { view.screen = "history"; return repaint(); }
      if (a === "timeline") { view.screen = "timeline"; return repaint(); }
      if (a === "pause") { updateActive(function (g) { g.status = "paused"; hist(g, "Paused"); }); setActiveId(null); resetView(); return repaint(); }
      if (a === "complete") { updateActive(function (g) { g.status = "completed"; g.completedAt = Date.now(); hist(g, "Completed"); }); setActiveId(null); resetView(); if (window.showToast) window.showToast("Goal completed 🎉", "info", window.render); return repaint(); }
      if (a === "cancel") {
        var go = function (ok) { if (!ok) return; updateActive(function (g) { g.status = "cancelled"; hist(g, "Cancelled"); }); setActiveId(null); resetView(); repaint(); };
        if (window.confirmDialog) window.confirmDialog("Cancel this goal? Your history is kept.", window.render).then(go); else go(true);
        return;
      }
      if (a === "resume") {
        var id = el.getAttribute("data-id"), goals = loadGoals();
        goals.forEach(function (g) { if (g.status === "active") g.status = "archived"; if (String(g.id) === String(id)) { g.status = "active"; hist(g, "Reactivated"); } });
        persistGoals(goals); setActiveId(id);
        var ng = loadGoals().filter(function (g) { return String(g.id) === String(id); })[0]; if (ng) applyToProfile(ng);
        resetView(); return repaint();
      }
    });
    document.addEventListener("input", function (e) {
      if (typeof state === "undefined" || state.tab !== "goals" || view.screen !== "wizard") return;
      // keep type selection live for the review step preview
      if (e.target.id === "g-type" && view.draft) view.draft.type = e.target.value;
    });
  }

  window.IgnytGoals = { render: render, attach: attach, activeGoal: activeGoal, compute: compute, GOAL_TYPES: GOAL_TYPES };
})();
