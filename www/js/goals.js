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

  var view = { screen: null, step: 1, draft: null, editing: false }; // screen: null=auto, 'wizard','history','timeline'
  function resetView() { view = { screen: null, step: 1, draft: null, editing: false }; }

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
  // One icon-prefixed field row (label above, icon badge + input/select side by side, an
  // optional real computed caption below) -- shared by all three wizard steps so they read as
  // one consistent flow rather than step 1 alone getting the light treatment.
  function iconField(icon, color, label, inputHtml, caption, captionColor) {
    return '<div style="margin-bottom:16px;"><div class="pi-label">' + esc(label) + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<span class="tl-card__icon" style="width:36px;height:36px;flex:none;background:' + color + '1a;color:' + color + ';">' + svg(icon, 17) + '</span>' +
      '<div style="flex:1;min-width:0;">' + inputHtml + '</div></div>' +
      (caption ? '<div style="font-size:11px;font-weight:600;color:' + (captionColor || "var(--rh-muted)") + ';margin:5px 0 0 46px;">' + caption + '</div>' : "") +
      '</div>';
  }
  function stepIndicator(s) {
    var steps = [[1, "Goal"], [2, "Activity Level"], [3, "Confirmation"]];
    return '<div style="display:flex;align-items:flex-start;margin:14px 0 20px;">' +
      steps.map(function (st, i) {
        var n = st[0], active = n <= s, current = n === s;
        var circle = '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex:none;' +
          (active ? "background:var(--rh-blue);color:#fff;" : "background:var(--rh-card);color:var(--rh-muted);border:1px solid var(--rh-border);") + '">' + n + '</div>';
        var label = '<div style="font-size:10px;font-weight:' + (current ? 800 : 600) + ';color:' + (current ? "var(--rh-text)" : "var(--rh-muted)") + ';margin-top:5px;white-space:nowrap;text-align:center;">' + st[1] + '</div>';
        var connector = i < steps.length - 1 ? '<div style="flex:1;height:1px;background:' + (n < s ? "var(--rh-blue)" : "var(--rh-border)") + ';margin:15px 6px 0;"></div>' : '';
        return '<div style="display:flex;flex-direction:column;align-items:center;">' + circle + label + '</div>' + connector;
      }).join('') + '</div>';
  }
  function renderWizard() {
    var d = view.draft || (view.draft = draftInit());
    var s = view.step;
    var h = '<div class="pg-light">' +
      '<button class="rh-btn rh-btn--ghost" style="flex:none;padding:8px 14px;font-size:13px;margin-bottom:10px;" data-goal="home">← Back</button>' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<span class="tl-card__icon" style="width:38px;height:38px;flex:none;background:rgba(239,68,68,.1);color:var(--rh-red);">' + svg("target", 20) + '</span>' +
      '<span style="font-size:22px;font-weight:800;">' + (view.editing ? "Edit Goal" : "New Goal") + '</span></div>' +
      '<div style="font-size:12px;color:var(--rh-muted);margin:2px 0 0 50px;">Step ' + s + ' of 3</div>' +
      stepIndicator(s);
    if (s === 1) {
      var curW = num(d.startWeight), tgtW = num(d.targetWeight);
      var lastLog = (typeof state !== "undefined" && state.bodylog && state.bodylog[0]) || null;
      var updatedCaption = lastLog ? "Last updated: " + (lastLog.date === todayISO() ? "Today" : fmtDate(lastLog.date)) : "";
      var deltaCaption = "", deltaColor = "var(--rh-blue)";
      if (curW != null && tgtW != null && curW !== tgtW) {
        deltaCaption = (tgtW < curW ? "Lose " : "Gain ") + Math.round(Math.abs(curW - tgtW) * 10) / 10 + " " + wUnit();
      }
      var dateCaption = "";
      if (d.targetDate) {
        var days = Math.round((new Date(d.targetDate) - new Date(d.startDate || todayISO())) / 864e5);
        if (days > 0) dateCaption = days + " days remaining (" + Math.round(days / 30) + " months)";
      }
      h += '<div class="pg-card">' +
        iconField("target", "var(--rh-blue)", "Goal type",
          '<select id="g-type" class="pi-input">' + GOAL_TYPES.map(function (t) { return '<option value="' + t.id + '"' + (d.type === t.id ? " selected" : "") + '>' + esc(t.label) + '</option>'; }).join("") + '</select>') +
        iconField("scale", "var(--rh-blue)", "Current weight (" + wUnit() + ")",
          '<input id="g-cw" class="pi-input" inputmode="decimal" value="' + esc(d.startWeight) + '">', updatedCaption) +
        iconField("flag", "var(--rh-blue)", "Target weight (" + wUnit() + ")",
          '<input id="g-tw" class="pi-input" inputmode="decimal" value="' + esc(d.targetWeight) + '">', deltaCaption, deltaColor) +
        iconField("calendar", "var(--rh-blue)", "Target date (optional)",
          '<input id="g-td" type="date" class="pi-input" value="' + esc(d.targetDate) + '">', dateCaption) +
        '</div>';
      // Live "Goal Summary" preview -- same real compute() the confirmation step already uses,
      // just run early against the in-progress draft so the user sees the real projection
      // before reaching step 3, not a fabricated preview number.
      if (curW != null && tgtW != null && curW !== tgtW) {
        var gp = draftToGoal(d), cp = compute(gp);
        var daysLeft = cp.completion ? Math.max(0, Math.round((new Date(cp.completion) - new Date()) / 864e5)) : null;
        var paceAbs = Math.abs(cp.weeklyRate);
        var pace = paceAbs <= 0.5 ? "Healthy" : paceAbs <= 0.8 ? "Moderate" : "Aggressive";
        var paceColor = pace === "Healthy" ? "var(--rh-green)" : pace === "Moderate" ? "#D97706" : "var(--rh-red)";
        var tip = pace === "Healthy"
          ? "You're on a healthy track to achieve your goal. Stay consistent and trust the process."
          : "This pace is faster than the generally recommended rate — consider a later target date for a more sustainable plan.";
        h += '<div class="pg-card" style="margin-bottom:16px;">' +
          '<div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:14px;">' + svg("progress", 16) + ' Goal Summary</div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px;text-align:center;">' +
          '<div><div style="font-size:11px;color:var(--rh-muted);">Weight to ' + (tgtW < curW ? "lose" : "gain") + '</div><div style="font-size:16px;font-weight:800;color:var(--rh-blue);margin-top:2px;">' + Math.round(Math.abs(curW - tgtW) * 10) / 10 + ' ' + wUnit() + '</div></div>' +
          '<div><div style="font-size:11px;color:var(--rh-muted);">Days remaining</div><div style="font-size:16px;font-weight:800;color:var(--rh-blue);margin-top:2px;">' + (daysLeft != null ? daysLeft : "—") + '</div></div>' +
          '<div><div style="font-size:11px;color:var(--rh-muted);">Target date</div><div style="font-size:13px;font-weight:800;margin-top:4px;">' + (cp.completion ? fmtDate(cp.completion) : "—") + '</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:14px;margin-top:14px;border-top:1px solid var(--rh-border);padding-top:12px;">' +
          '<div style="flex:1;display:flex;align-items:center;gap:8px;"><span style="flex:none;color:var(--rh-green);">' + svg("trend", 16) + '</span><div><div style="font-size:10px;color:var(--rh-muted);font-weight:600;">Required weekly ' + (tgtW < curW ? "loss" : "gain") + '</div><div style="font-size:13px;font-weight:800;color:var(--rh-green);">' + paceAbs + ' ' + wUnit() + '/week</div></div></div>' +
          '<div style="flex:1;display:flex;align-items:center;gap:8px;"><span style="flex:none;color:' + paceColor + ';">' + svg("check", 16) + '</span><div><div style="font-size:10px;color:var(--rh-muted);font-weight:600;">Goal pace</div><div style="font-size:13px;font-weight:800;color:' + paceColor + ';">' + pace + '</div></div></div>' +
          '</div>' +
          '<div style="margin-top:14px;background:' + (pace === "Healthy" ? "rgba(22,163,74,.08)" : "rgba(217,119,6,.08)") + ';border-radius:10px;padding:12px;display:flex;gap:10px;align-items:flex-start;">' +
          '<span style="flex:none;font-size:18px;">' + (pace === "Healthy" ? "🚀" : "⚠️") + '</span>' +
          '<div><div style="font-weight:800;font-size:13px;color:' + (pace === "Healthy" ? "var(--rh-green)" : "#D97706") + ';">' + (pace === "Healthy" ? "Great!" : "Heads up") + '</div>' +
          '<div style="font-size:12px;color:var(--rh-text);margin-top:2px;line-height:1.4;">' + tip + '</div></div></div>' +
          '</div>';
      }
    } else if (s === 2) {
      h += '<div class="pg-card">' +
        '<div class="pi-grid2">' +
        iconField("ruler", "var(--rh-blue)", "Height (cm)", '<input id="g-h" class="pi-input" inputmode="decimal" value="' + esc(d.height) + '">') +
        iconField("profile", "var(--rh-blue)", "Age", '<input id="g-age" class="pi-input" inputmode="numeric" value="' + esc(d.age) + '">') +
        '</div>' +
        iconField("profile", "var(--rh-blue)", "Gender", '<select id="g-gender" class="pi-input"><option value="male"' + (d.gender === "male" ? " selected" : "") + '>Male</option><option value="female"' + (d.gender === "female" ? " selected" : "") + '>Female</option></select>') +
        iconField("run", "var(--rh-blue)", "Activity level", '<select id="g-act" class="pi-input">' +
          [[1.2, "Sedentary"], [1.375, "Light"], [1.465, "Moderate"], [1.55, "Active"], [1.725, "Very active"]].map(function (a) { return '<option value="' + a[0] + '"' + (Number(d.activityMultiplier) === a[0] ? " selected" : "") + '>' + a[1] + '</option>'; }).join("") + '</select>') +
        '<div class="pi-grid2">' +
        iconField("droplet", "var(--rh-blue)", "Current body fat % (opt)", '<input id="g-cbf" class="pi-input" inputmode="decimal" value="' + esc(d.startBodyFat) + '">') +
        iconField("target", "var(--rh-blue)", "Target body fat % (opt)", '<input id="g-tbf" class="pi-input" inputmode="decimal" value="' + esc(d.targetBodyFat) + '">') +
        '</div>' +
        '<div class="pi-grid2">' +
        iconField("calendar", "var(--rh-blue)", "Training days/week", '<input id="g-days" class="pi-input" inputmode="numeric" value="' + esc(d.trainingDays) + '">') +
        iconField("timer", "var(--rh-blue)", "Session (min)", '<input id="g-dur" class="pi-input" inputmode="numeric" value="' + esc(d.workoutDuration) + '">') +
        '</div>' +
        '</div>';
    } else {
      var g = draftToGoal(d), c = compute(g);
      h += '<div class="pg-card">' +
        iconField("dumbbell", "var(--rh-blue)", "Equipment (optional)", '<input id="g-equip" class="pi-input" value="' + esc(d.equipment) + '" placeholder="e.g. Full gym, dumbbells only">') +
        iconField("nutrition", "var(--rh-blue)", "Food preference (optional)", '<input id="g-food" class="pi-input" value="' + esc(d.foodPref) + '" placeholder="e.g. Vegetarian">') +
        iconField("info", "var(--rh-blue)", "Injuries / restrictions (optional)", '<input id="g-inj" class="pi-input" value="' + esc(d.injuries) + '">') +
        iconField("flag", "var(--rh-blue)", "Primary motivation (optional)", '<input id="g-mot" class="pi-input" value="' + esc(d.motivation) + '">') +
        '</div>' +
        '<div class="rh-section-head"><span>Your Plan</span></div><div class="pg-card">' + planGrid(c) + '</div>' +
        (c.completion ? '<div style="font-size:12px;color:var(--rh-muted);margin:8px 2px;">Est. completion ' + fmtDate(c.completion) + ' at ~' + Math.abs(c.weeklyRate) + ' ' + wUnit() + '/week.</div>' : "");
    }
    h += '<div style="display:flex;gap:8px;margin-top:14px;margin-bottom:16px;">' +
      (s > 1 ? '<button class="rh-btn rh-btn--ghost" data-goal="prev" style="flex:1;">Back</button>' : "") +
      (s < 3 ? '<button class="rh-btn rh-btn--primary" data-goal="next" style="flex:2;">Continue →</button>' : '<button class="rh-btn rh-btn--primary" data-goal="create" style="flex:2;">' + (view.editing ? "Save Changes" : "Start Goal") + '</button>') +
      '</div></div>';
    return h;
  }
  function planGrid(c) {
    var cell = function (l, v, u) { return '<div class="pg-stat-card"><div class="pg-stat-card__label">' + l + '</div><div class="pg-stat-card__value" style="font-size:16px;">' + v + (u ? '<span class="pg-stat-card__unit">' + u + '</span>' : '') + '</div></div>'; };
    return '<div class="pg-stat-grid">' +
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
  /* Real area/line chart for the weight trend card -- self-contained (goals.js doesn't reach
     into progress.js's private chart helpers), same visual approach: gridlines + axis labels
     + an end-value bubble, drawn only from genuine state.bodylog entries in range. */
  function weightTrendChart(days) {
    var cutoff = Date.now() - days * 864e5;
    var pts = ((typeof state !== "undefined" && state.bodylog) || [])
      .filter(function (e) { return e.weight && new Date(e.date).getTime() >= cutoff; })
      .slice().reverse() // bodylog is newest-first -> chronological
      .map(function (e) { return { date: new Date(e.date), value: Number(e.weight) }; });
    if (pts.length < 2) return '<div style="color:var(--rh-muted);font-size:13px;padding:24px 0;text-align:center;">Log at least two weigh-ins to see a trend graph.</div>';
    var w = 320, h2 = 170, padL = 30, padR = 10, padT = 10, padB = 22;
    var vals = pts.map(function (p) { return p.value; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var range = (max - min) || 1, yPad = range * 0.15;
    var yMin = min - yPad, yMax = max + yPad;
    var stepX = (w - padL - padR) / (pts.length - 1);
    var coords = pts.map(function (p, i) { return { x: padL + i * stepX, y: padT + (1 - (p.value - yMin) / (yMax - yMin)) * (h2 - padT - padB) }; });
    var pathD = coords.map(function (c, i) { return (i === 0 ? "M" : "L") + c.x.toFixed(1) + "," + c.y.toFixed(1); }).join(" ");
    var areaD = pathD + " L" + coords[coords.length - 1].x.toFixed(1) + "," + (h2 - padB) + " L" + coords[0].x.toFixed(1) + "," + (h2 - padB) + " Z";
    var ySteps = 4, yDecimals = (yMax - yMin) < ySteps * 2 ? 1 : 0;
    var gridlines = "";
    for (var i = 0; i <= ySteps; i++) {
      var v = yMin + (yMax - yMin) * (i / ySteps), y = padT + (1 - i / ySteps) * (h2 - padT - padB);
      gridlines += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + y.toFixed(1) + '" stroke="var(--rh-border)" stroke-width="1"/>' +
        '<text x="2" y="' + (y + 3).toFixed(1) + '" font-size="9" fill="var(--rh-muted)">' + v.toFixed(yDecimals) + '</text>';
    }
    var xIdx = [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
    var xLabels = xIdx.map(function (i) { var c = coords[i]; return '<text x="' + c.x.toFixed(1) + '" y="' + (h2 - 6) + '" font-size="9" fill="var(--rh-muted)" text-anchor="middle">' + fmtDate(pts[i].date) + '</text>'; }).join("");
    var last = coords[coords.length - 1], lastVal = pts[pts.length - 1].value;
    return '<svg width="100%" height="' + h2 + '" viewBox="0 0 ' + w + ' ' + h2 + '" preserveAspectRatio="none">' + gridlines +
      '<path d="' + areaD + '" fill="var(--rh-blue)" fill-opacity="0.12" stroke="none"/>' +
      '<path d="' + pathD + '" fill="none" stroke="var(--rh-blue)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="3.5" fill="var(--rh-blue)"/>' + xLabels + '</svg>' +
      '<div class="pg-chart-bubble">' + dW(lastVal) + ' ' + wUnit() + '</div>';
  }

  function ringHtml(pct, color) {
    var clamped = pct == null ? 0 : Math.max(0, Math.min(100, pct));
    return '<div class="pg-ring" style="--pct:' + clamped + ';--ring-color:' + color + ';width:56px;height:56px;"><div class="pg-ring__inner" style="width:44px;height:44px;font-size:12px;"></div></div>';
  }

  function renderDashboard() {
    var g = activeGoal(), c = compute(g), cur = currentWeightKg(), t = typeById[g.type] || typeById.custom;
    var pct = progressPct(g, cur);
    var remaining = (cur != null && g.targetWeight != null) ? Math.round(Math.abs(cur - g.targetWeight) * 10) / 10 : null;
    var ms = milestonesFor(g).map(function (m) { m.done = milestoneDone(g, m, cur); return m; });
    var next = ms.filter(function (m) { return !m.done; })[0];
    var eaten = window.todayEaten ? Math.round(window.todayEaten()) : 0;
    var todayMac = window.todayMacros ? window.todayMacros() : { protein: 0, carbs: 0, fat: 0 };
    var protToday = Math.round(todayMac.protein || 0), carbToday = Math.round(todayMac.carbs || 0), fatToday = Math.round(todayMac.fat || 0);
    var wk = workoutsThisWeek();
    var streak = window.computeStreak ? window.computeStreak() : 0;

    // Real "on track" status: expected progress by now (elapsed / planned weeks) vs actual --
    // only shown when there's a real target date/rate to judge against, never guessed.
    var onTrack = null;
    if (c.weeks && g.startDate && pct != null) {
      var elapsedWeeks = Math.max(0, (Date.now() - new Date(g.startDate).getTime()) / (7 * 864e5));
      var expectedPct = Math.min(100, Math.round(elapsedWeeks / c.weeks * 100));
      onTrack = pct >= expectedPct - 5;
    }

    var bmiCat = c.bmi == null ? null : c.bmi < 18.5 ? "Low" : c.bmi < 25 ? "Healthy" : c.bmi < 30 ? "High" : "Very High";
    var bmiColor = c.bmi == null ? "var(--rh-muted)" : c.bmi < 18.5 ? "#2563EB" : c.bmi < 25 ? "var(--rh-green)" : c.bmi < 30 ? "#D97706" : "var(--rh-red)";

    var h = '<div class="pg-light">' +
      '<div class="row-between" style="margin-top:4px;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' + svg("target", 22) + '<span style="font-size:22px;font-weight:800;">' + esc(t.label) + '</span></div>' +
      '<button class="rh-btn rh-btn--ghost" style="flex:none;padding:9px 14px;font-size:13px;" data-goal="edit">' + svg("pencil", 13) + ' Edit Goal</button>' +
      '</div>';

    // Goal progress card
    h += '<div class="pg-card" style="margin-top:12px;display:flex;align-items:center;gap:16px;">' +
      '<div class="pg-ring" style="--pct:' + (pct || 0) + ';--ring-color:var(--rh-blue);width:96px;height:96px;flex:none;">' +
      '<div class="pg-ring__inner" style="width:76px;height:76px;flex-direction:column;">' +
      '<div style="font-size:20px;font-weight:800;">' + (pct == null ? "—" : pct + "%") + '</div><div style="font-size:9px;color:var(--rh-muted);font-weight:700;">Complete</div></div></div>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:11px;color:var(--rh-muted);font-weight:600;">Current Weight</div><div style="font-size:19px;font-weight:800;margin-bottom:6px;">' + (cur != null ? dW(cur) + " " + wUnit() : "—") + '</div>' +
      '<div style="font-size:11px;color:var(--rh-muted);font-weight:600;">Target Weight</div><div style="font-size:19px;font-weight:800;">' + (g.targetWeight != null ? dW(g.targetWeight) + " " + wUnit() : "—") + '</div>' +
      (pct != null ? '<div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:' + pct + '%;"></div></div>' : "") +
      (remaining != null ? '<div style="font-size:12px;font-weight:700;color:var(--rh-blue);margin-top:6px;">' + remaining + ' ' + wUnit() + ' remaining</div>' : "") +
      '</div>' +
      '<div style="flex:none;text-align:right;">' +
      (c.completion ? '<div style="font-size:11px;color:var(--rh-muted);font-weight:600;">Est. Completion</div><div style="font-size:13px;font-weight:700;margin-bottom:8px;">' + fmtDate(c.completion) + '</div>' : "") +
      (onTrack != null ? '<span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:' + (onTrack ? "rgba(22,163,74,.12);color:var(--rh-green)" : "rgba(239,68,68,.12);color:var(--rh-red)") + ';">' + (onTrack ? "On Track" : "Behind Pace") + '</span>' : "") +
      '</div></div>';

    // Weight trend chart
    h += '<div class="pg-card" style="margin-top:12px;"><div class="pg-card__head"><span class="pg-card__title">Weight Trend (30 Days)</span></div>' + weightTrendChart(30) + '</div>';

    // Today's summary
    h += '<div class="rh-section-head"><span>Today\'s Summary</span></div>' +
      '<div class="pg-stat-grid">' +
      '<div class="pg-stat-card"><div style="display:flex;align-items:center;gap:8px;">' + ringHtml(c.calories ? Math.min(100, Math.round(eaten / c.calories * 100)) : null, "var(--rh-blue)") + '<div><div style="font-size:12px;font-weight:700;">Calories</div></div></div>' +
      '<div style="font-size:11px;color:var(--rh-muted);margin-top:6px;">' + eaten + ' / ' + c.calories + ' kcal</div>' +
      '<button class="rh-btn rh-btn--ghost" style="width:100%;margin-top:8px;padding:8px;font-size:12px;" data-nav="nutrition">+ Food</button></div>' +
      '<div class="pg-stat-card"><div style="display:flex;align-items:center;gap:8px;">' + ringHtml(c.protein ? Math.min(100, Math.round(protToday / c.protein * 100)) : null, "var(--rh-green)") + '<div><div style="font-size:12px;font-weight:700;">Protein</div></div></div>' +
      '<div style="font-size:11px;color:var(--rh-muted);margin-top:6px;">' + protToday + ' / ' + c.protein + ' g</div>' +
      '<button class="rh-btn rh-btn--ghost" style="width:100%;margin-top:8px;padding:8px;font-size:12px;" data-nav="nutrition">+ Log</button></div>' +
      '<div class="pg-stat-card"><div style="display:flex;align-items:center;gap:8px;color:var(--rh-purple);">' + svg("dumbbell", 20) + '<div><div style="font-size:12px;font-weight:700;color:var(--rh-text);">Workouts</div></div></div>' +
      '<div style="font-size:19px;font-weight:800;margin-top:6px;">' + wk + '<span style="font-size:11px;color:var(--rh-muted);font-weight:600;"> / ' + (g.trainingDays || "—") + ' this week</span></div>' +
      '<button class="rh-btn rh-btn--ghost" style="width:100%;margin-top:8px;padding:8px;font-size:12px;" data-nav="workout">+ Workout</button></div>' +
      '<div class="pg-stat-card"><div style="display:flex;align-items:center;gap:8px;color:#EA580C;">' + svg("flame", 20) + '<div><div style="font-size:12px;font-weight:700;color:var(--rh-text);">Streak</div></div></div>' +
      '<div style="font-size:19px;font-weight:800;margin-top:6px;">' + streak + '<span style="font-size:11px;color:var(--rh-muted);font-weight:600;"> days</span></div>' +
      '<button class="rh-btn rh-btn--ghost" style="width:100%;margin-top:8px;padding:8px;font-size:12px;" data-nav="workout">+ Keep Going</button></div>' +
      '</div>';

    // Nutrition targets
    h += '<div class="rh-section-head"><span>Nutrition Targets</span><a href="#" class="rh-view-all" data-nav="nutrition">Edit Targets</a></div>' +
      '<div class="pg-card" style="margin-bottom:10px;">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--rh-muted);margin-bottom:8px;">' + svg("bolt", 12) + ' Energy</div>' +
      '<div class="pf-progress-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">Calories</div><div class="pf-progress-item__value" style="font-size:15px;">' + eaten + '<span class="pf-progress-item__unit"> / ' + c.calories + '</span></div><div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:' + Math.min(100, Math.round(eaten / c.calories * 100)) + '%;"></div></div></div>' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">BMR</div><div class="pf-progress-item__value" style="font-size:15px;">' + c.bmr + '<span class="pf-progress-item__unit"> kcal</span></div></div>' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">Maintenance</div><div class="pf-progress-item__value" style="font-size:15px;">' + c.maintenance + '<span class="pf-progress-item__unit"> kcal</span></div></div>' +
      '</div></div>' +
      '<div class="pg-card" style="margin-bottom:10px;">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--rh-muted);margin-bottom:8px;">Macros</div>' +
      '<div class="pf-progress-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">Protein</div><div class="pf-progress-item__value" style="font-size:15px;">' + protToday + '<span class="pf-progress-item__unit"> / ' + c.protein + 'g</span></div><div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:' + (c.protein ? Math.min(100, Math.round(protToday / c.protein * 100)) : 0) + '%;background:var(--rh-green);"></div></div></div>' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">Carbs</div><div class="pf-progress-item__value" style="font-size:15px;">' + carbToday + '<span class="pf-progress-item__unit"> / ' + c.carbs + 'g</span></div><div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:' + Math.min(100, (c.carbs ? Math.round(carbToday / c.carbs * 100) : 0)) + '%;background:#D97706;"></div></div></div>' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">Fat</div><div class="pf-progress-item__value" style="font-size:15px;">' + fatToday + '<span class="pf-progress-item__unit"> / ' + c.fat + 'g</span></div><div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:' + Math.min(100, Math.round(fatToday / c.fat * 100)) + '%;background:var(--rh-purple);"></div></div></div>' +
      '</div></div>' +
      '<div class="pg-card">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--rh-muted);margin-bottom:8px;">Body Metrics</div>' +
      '<div class="pf-progress-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">Lean Mass</div><div class="pf-progress-item__value">' + (c.lbm != null ? c.lbm : "—") + '<span class="pf-progress-item__unit"> kg</span></div></div>' +
      '<div class="pf-progress-item"><div class="pf-progress-item__head">BMI</div><div style="display:flex;align-items:center;gap:8px;"><div class="pf-progress-item__value">' + (c.bmi != null ? c.bmi : "—") + '</div>' + (bmiCat ? '<span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:' + bmiColor + '1a;color:' + bmiColor + ';">' + bmiCat + '</span>' : "") + '</div></div>' +
      '</div></div>' +
      '<div style="font-size:11px;color:var(--rh-muted);margin:8px 2px 0;">These targets drive your Nutrition and Home calorie/macro goals automatically.</div>';

    // Milestones (existing feature, kept, restyled to match)
    h += '<div class="rh-section-head"><span>Milestones</span></div><div class="pg-card">' +
      (ms.length ? ms.map(function (m) { return '<div class="row-between" style="padding:8px 0;border-top:1px solid var(--rh-border);font-size:13px;"><span>' + (m.done ? "✅ " : "⬜ ") + esc(m.label) + '</span></div>'; }).join("") : '<div style="color:var(--rh-muted);font-size:13px;">Set a target weight to generate milestones.</div>') +
      (next ? '<div style="font-size:12px;color:var(--rh-muted);margin-top:8px;">Next: ' + esc(next.label) + '</div>' : "") + '</div>';

    // Manage (existing actions, kept, restyled)
    h += '<div class="rh-section-head"><span>Manage</span></div><div style="display:flex;flex-wrap:wrap;gap:8px;">' +
      '<button class="rh-btn rh-btn--ghost" data-goal="pause">Pause</button>' +
      '<button class="rh-btn rh-btn--ghost" data-goal="complete">Complete</button>' +
      '<button class="rh-btn rh-btn--ghost" data-goal="timeline">Timeline</button>' +
      '<button class="rh-btn rh-btn--ghost" style="color:var(--rh-red);" data-goal="cancel">Cancel</button>' +
      '</div><button class="rh-btn rh-btn--ghost" style="width:100%;margin-top:8px;" data-goal="history">Past goals</button>' +
      '</div>';
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
      // Editing an active goal reuses the exact same wizard + createFromDraft() path as
      // creating one -- "Save Changes" archives the current goal and starts a new one with
      // the edited numbers (same mechanism updateActive() uses for pause/complete/cancel,
      // just via the wizard instead of a single-field mutation). No separate edit codepath
      // to keep in sync with create.
      if (a === "edit") { var ag = activeGoal(); if (!ag) return; view.screen = "wizard"; view.step = 1; view.editing = true; view.draft = Object.assign({}, ag); return repaint(); }
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
    // Weight/date fields commit on change (blur), not every keystroke, so the live Goal
    // Summary preview can re-render without ever stealing focus mid-type -- same tradeoff
    // already made for every other numeric input in this app.
    document.addEventListener("change", function (e) {
      if (typeof state === "undefined" || state.tab !== "goals" || view.screen !== "wizard" || view.step !== 1 || !view.draft) return;
      if (e.target.id === "g-cw") { view.draft.startWeight = e.target.value; repaint(); }
      else if (e.target.id === "g-tw") { view.draft.targetWeight = e.target.value; repaint(); }
      else if (e.target.id === "g-td") { view.draft.targetDate = e.target.value; repaint(); }
    });
  }

  // Lets app.js's shared header/nav apply the same light "premium reference" treatment used
  // by Home/Workout/Progress-dashboard/Tools/Profile -- true only while the real dashboard is
  // showing (an active goal, no wizard/history/timeline open), same scoping rule as Progress's
  // own dashboard-vs-detail-view light/dark split.
  function isDashboardShowing() { return view.screen === null && !!activeGoal(); }

  window.IgnytGoals = { render: render, attach: attach, activeGoal: activeGoal, compute: compute, progressPct: progressPct, GOAL_TYPES: GOAL_TYPES, isDashboardShowing: isDashboardShowing };
})();
