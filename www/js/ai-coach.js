/* =========================================================
   ADAPTIVE AI COACH (Phase 1 — rule-based, offline, data-driven)

   The spec's offline requirement IS the honest design here: a deterministic RULE ENGINE over
   the user's OWN data — no LLM, no fabricated advice, no random tips. Every recommendation is
   produced by a rule that names its reason, the supporting data, and a confidence level, so it
   is fully explainable and always changes when the underlying data changes. A cloud-AI layer can
   be added later without changing this rule core (the spec explicitly allows that).

   Reads only real data already in the app: the active goal (IgnytGoals), workout history,
   nutrition targets + today's intake, weight log, streak, blood work (IgnytBloodwork), and the
   Health Connect cache (steps/sleep) when present. Nothing is invented; if a signal is missing,
   the related card says so instead of guessing.
========================================================= */
(function () {
  "use strict";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var svg = function (n, s) { return window.svg ? window.svg(n, s) : ""; };
  var S = function () { return typeof state !== "undefined" ? state : {}; };

  /* ---------- data helpers (all real) ---------- */
  function healthCache() { try { return JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null"); } catch (e) { return null; } }
  function daysAgo(n) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; }
  function workoutsSince(d) { return ((S().workoutLog) || []).filter(function (w) { return new Date(w.startedAt || w.date) >= d; }); }
  function workoutsThisWeek() { var now = new Date(), day = (now.getDay() + 6) % 7, mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - day); return workoutsSince(mon).length; }
  function lastWorkout() { var l = (S().workoutLog) || []; return l.length ? l[0] : null; }
  function daysSinceLastWorkout() { var w = lastWorkout(); if (!w) return null; return Math.floor((Date.now() - (w.startedAt || new Date(w.date).getTime())) / 864e5); }
  function streak() { return window.computeStreak ? window.computeStreak() : 0; }
  function goal() { return window.IgnytGoals ? window.IgnytGoals.activeGoal() : null; }
  function goalCompute(g) { return window.IgnytGoals ? window.IgnytGoals.compute(g) : null; }
  function targets() { return window.macroTargets ? window.macroTargets() : null; }
  function eatenToday() { return window.todayEaten ? Math.round(window.todayEaten()) : null; }
  function proteinToday() { return window.todayMacros ? Math.round(window.todayMacros().protein) : null; }
  function waterToday() { return window.todayWater ? Math.round(window.todayWater()) : null; }
  function weightSeries() { return ((S().bodylog) || []).slice().filter(function (b) { return b.weight != null; }); } // newest-first
  function weightChangeSince(days) {
    var s = weightSeries(); if (!s.length) return null;
    var cutoff = daysAgo(days), prior = null;
    for (var i = 0; i < s.length; i++) { if (new Date(s[i].date) <= cutoff) { prior = s[i]; break; } }
    if (!prior) prior = s[s.length - 1];
    return Math.round((Number(s[0].weight) - Number(prior.weight)) * 10) / 10;
  }
  function bloodOutOfRange() {
    if (!window.IgnytBloodwork) return [];
    var reports = window.IgnytBloodwork._load().slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var latestByKey = {}, out = [];
    reports.forEach(function (r) { (r.results || []).forEach(function (x) { if (x.key && latestByKey[x.key] === undefined) latestByKey[x.key] = x; }); });
    Object.keys(latestByKey).forEach(function (k) { var x = latestByKey[k]; if (x.value == null) return; if (x.low != null && x.value < x.low) out.push({ x: x, dir: "low" }); else if (x.high != null && x.value > x.high) out.push({ x: x, dir: "high" }); });
    return out;
  }

  /* ---------- recovery (heuristic over training load + rest + sleep) ---------- */
  function recovery() {
    var factors = [], score = 100;
    var last3 = workoutsSince(daysAgo(2)).length; // today + prev 2 days
    if (last3 >= 3) { score -= 30; factors.push("3 training days in a row"); }
    else if (last3 === 2) { score -= 12; factors.push("2 recent training days"); }
    var dsl = daysSinceLastWorkout();
    if (dsl != null && dsl >= 2) { score += 10; factors.push(dsl + " rest day" + (dsl !== 1 ? "s" : "") + " since last workout"); }
    var hc = healthCache(), sleepMin = hc && hc.sleep ? hc.sleep.totalMinutes : null;
    if (sleepMin != null) {
      var hrs = Math.round(sleepMin / 6) / 10;
      if (sleepMin < 6 * 60) { score -= 25; factors.push("sleep " + hrs + "h (short)"); }
      else if (sleepMin >= 7.5 * 60) { score += 8; factors.push("sleep " + hrs + "h (good)"); }
      else factors.push("sleep " + hrs + "h");
    } else factors.push("no sleep data");
    score = Math.max(0, Math.min(100, score));
    return { score: score, label: score >= 75 ? "Good" : score >= 50 ? "Moderate" : "Low", factors: factors, hasSleep: sleepMin != null };
  }

  /* ---------- recommendation rules -> {title, reason[], data, confidence, cat} ---------- */
  function recommendations() {
    var recs = [], g = goal(), gc = g ? goalCompute(g) : null, tg = targets();
    var rec = recovery(), wtw = workoutsThisWeek(), dsl = daysSinceLastWorkout();

    // Goal-type focus — always present when a goal is active, so advice genuinely differs by goal.
    if (g) {
      var FOCUS = { weight_loss: "Focus: a steady calorie deficit plus daily steps", fat_loss: "Focus: high protein in a deficit to preserve muscle", muscle_gain: "Focus: progressive overload with a small surplus", recomp: "Focus: hit protein, train hard, hold calories near maintenance", strength: "Focus: heavy compound lifts with longer rests", powerlifting: "Focus: squat/bench/deadlift with top-end strength work", bodybuilding: "Focus: hypertrophy volume and protein consistency", hyrox: "Focus: blend strength with Zone-2 and compromised running", marathon: "Focus: build weekly mileage gradually", running: "Focus: mostly easy miles plus one quality session", cycling: "Focus: a Zone-2 base with some intervals", functional: "Focus: varied movement patterns and conditioning", general: "Focus: consistency across training, steps and protein", athletic: "Focus: balance power, speed and recovery", custom: "Focus: keep logging so coaching sharpens" };
      var glabel = ((window.IgnytGoals && window.IgnytGoals.GOAL_TYPES) || []).filter(function (t) { return t.id === g.type; })[0];
      recs.push({ title: FOCUS[g.type] || "Focus: stay consistent", reason: ["Your active goal is " + ((glabel && glabel.label) || g.type)], data: gc ? gc.calories + " kcal target" : "", confidence: "High", cat: "goal", tone: "ok" });
    }

    // 1) recovery-driven training guidance
    if (rec.score < 50) recs.push({ title: "Take it easy today", reason: rec.factors, data: "Recovery " + rec.score + "%", confidence: rec.hasSleep ? "High" : "Medium", cat: "workout", tone: "warn" });
    else if (g && g.trainingDays && wtw < g.trainingDays && (dsl == null || dsl >= 1)) {
      var last = lastWorkout();
      var suggest = last && /push/i.test(last.title || "") ? "a Pull day" : last && /pull/i.test(last.title || "") ? "a Legs day" : "your next planned session";
      recs.push({ title: "Train today: " + suggest, reason: [wtw + " of " + g.trainingDays + " sessions done this week", rec.label + " recovery (" + rec.score + "%)"], data: "This week " + wtw + "/" + g.trainingDays, confidence: "Medium", cat: "workout", tone: "ok" });
    } else if (dsl != null && dsl >= 4) recs.push({ title: "Get a session in", reason: [dsl + " days since your last workout"], data: dsl + " rest days", confidence: "High", cat: "workout", tone: "warn" });

    // 2) nutrition
    if (tg) {
      var prot = proteinToday();
      if (prot != null && prot < tg.protein * 0.8) recs.push({ title: "Add protein today", reason: ["Protein " + prot + "g vs " + Math.round(tg.protein) + "g target"], data: prot + "/" + Math.round(tg.protein) + "g", confidence: "High", cat: "nutrition", tone: "warn" });
      var eaten = eatenToday();
      if (eaten != null && g) {
        if (gc && gc.goalDelta < 0 && eaten > tg.kcal * 1.1) recs.push({ title: "Ease off calories", reason: ["Eaten " + eaten + " vs " + tg.kcal + " target for your fat-loss goal"], data: eaten + "/" + tg.kcal + " kcal", confidence: "Medium", cat: "nutrition", tone: "warn" });
        else if (gc && gc.goalDelta > 0 && eaten < tg.kcal * 0.9 && eaten > 0) recs.push({ title: "Eat a bit more", reason: ["Under your surplus target for muscle gain"], data: eaten + "/" + tg.kcal + " kcal", confidence: "Medium", cat: "nutrition", tone: "ok" });
      }
    }
    // 3) hydration
    var water = waterToday(), wTarget = (S().settings && S().settings.waterTargetMl) || 2500;
    if (water != null && water < wTarget * 0.6) recs.push({ title: "Drink more water", reason: [(water / 1000).toFixed(1) + "L of " + (wTarget / 1000).toFixed(1) + "L logged"], data: (water / 1000).toFixed(1) + "L", confidence: "Medium", cat: "recovery", tone: "ok" });

    // 4) blood work
    var bor = bloodOutOfRange();
    bor.slice(0, 3).forEach(function (b) { recs.push({ title: b.x.name + " is " + b.dir, reason: [b.x.name + " " + b.x.value + " " + (b.x.unit || "") + " vs ref " + (b.x.low != null ? b.x.low : "—") + "–" + (b.x.high != null ? b.x.high : "—")], data: "Latest blood work", confidence: "High", cat: "health", tone: "warn", educational: true }); });

    // 5) plateau
    var pl = plateau(); if (pl) recs.push(pl);

    if (!recs.length) recs.push({ title: "You're on track", reason: ["No issues detected across recovery, nutrition and training today"], data: "", confidence: "Medium", cat: "workout", tone: "ok" });
    return recs;
  }

  function plateau() {
    var g = goal(); if (!g || g.targetWeight == null) return null;
    var chg2w = weightChangeSince(14), chg4w = weightChangeSince(28);
    var wantLoss = g.targetWeight < g.startWeight;
    if (chg4w != null && Math.abs(chg4w) < 0.5 && weightSeries().length >= 3) {
      return { title: "Possible plateau", reason: ["Weight moved " + (chg4w > 0 ? "+" : "") + chg4w + " kg in ~4 weeks", wantLoss ? "For continued fat loss, consider a small calorie reduction or more activity" : "Consider adjusting your split or intake"], data: "4-wk change " + chg4w + " kg", confidence: "Medium", cat: "goal", tone: "warn" };
    }
    return null;
  }

  /* ---------- reviews ---------- */
  function weeklyReview() {
    var g = goal(), tg = targets();
    return {
      workouts: workoutsThisWeek(), goalDays: g ? g.trainingDays : null,
      weightChange: weightChangeSince(7), streak: streak(),
      proteinTarget: tg ? Math.round(tg.protein) : null, calorieTarget: tg ? tg.kcal : null,
      recovery: recovery().score
    };
  }
  function monthlyReview() {
    return { weightChange: weightChangeSince(30), workouts: workoutsSince(daysAgo(30)).length, prs: ((S().prs) || []).filter(function (p) { return (p.achievedAt || 0) >= daysAgo(30).getTime(); }).length, goal: goal() };
  }

  /* ---------- rendering ---------- */
  var view = { answer: null };
  function greeting() { var h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

  function briefing() {
    var name = (S().profile && S().profile.name) || "there", last = lastWorkout(), tg = targets(), prot = proteinToday(), rec = recovery(), g = goal();
    var lines = [];
    if (last) { var dsl = daysSinceLastWorkout(); lines.push(dsl === 0 ? "You trained today — nice." : (dsl === 1 ? "Yesterday" : dsl + " days ago") + " you did " + esc(last.title || "a workout") + "."); }
    if (tg && prot != null) lines.push("Protein " + prot + "g of your " + Math.round(tg.protein) + "g target.");
    lines.push("Recovery is " + rec.score + "% (" + rec.label + ").");
    if (g) lines.push("Goal: " + (window.IgnytGoals.GOAL_TYPES.filter(function (t) { return t.id === g.type; })[0] || {}).label + ".");
    return '<section class="premium-card premium-card--elevated" style="margin-bottom:12px;"><div style="font-size:20px;font-weight:900;">' + greeting() + (S().profile && S().profile.name ? ", " + esc(S().profile.name) : "") + " 👋</div>" +
      '<div style="margin-top:8px;color:var(--color-text-secondary);line-height:1.6;font-size:14px;">' + lines.map(esc).join("<br>") + '</div></section>';
  }

  function toneColor(t) { return t === "warn" ? "#e5a23d" : "var(--mint)"; }
  function recCard(r) {
    return '<div class="coach-rec"><div class="coach-rec__dot" style="background:' + toneColor(r.tone) + ';"></div>' +
      '<div style="min-width:0;flex:1;"><div style="font-weight:800;">' + esc(r.title) + '</div>' +
      '<div style="font-size:12px;color:var(--color-text-secondary);margin-top:3px;line-height:1.5;">' + r.reason.map(esc).join("<br>") + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">' + (r.data ? '<span class="coach-chip">' + esc(r.data) + '</span>' : '') + '<span class="coach-chip">Confidence: ' + esc(r.confidence) + '</span>' + (r.educational ? '<span class="coach-chip">Educational</span>' : '') + '</div></div></div>';
  }

  function section(label) { return '<div class="section-heading"><span class="section-heading__label">' + esc(label) + '</span></div>'; }

  var QUESTIONS = [
    { q: "What should I do today?", a: "today" },
    { q: "Why isn't my weight changing?", a: "weight" },
    { q: "Review my week", a: "week" },
    { q: "Analyze my blood work", a: "blood" },
    { q: "Explain my recovery", a: "recovery" },
    { q: "How can I improve?", a: "improve" }
  ];
  function answer(kind) {
    if (kind === "today") return recommendations().map(recCard).join("");
    if (kind === "recovery") { var r = recovery(); return recCard({ title: "Recovery " + r.score + "% (" + r.label + ")", reason: r.factors, data: r.hasSleep ? "incl. sleep data" : "no sleep data", confidence: r.hasSleep ? "High" : "Medium", tone: r.score < 50 ? "warn" : "ok" }); }
    if (kind === "blood") { var b = bloodOutOfRange(); if (!b.length) return '<div class="coach-rec"><div style="min-width:0;">No out-of-range biomarkers in your latest blood work (or none imported yet). Educational only — not a diagnosis.</div></div>'; return b.map(function (x) { return recCard({ title: x.x.name + " is " + x.dir, reason: [x.x.name + " " + x.x.value + " " + (x.x.unit || ""), "Educational only — discuss with a healthcare professional."], data: "ref " + (x.x.low != null ? x.x.low : "—") + "–" + (x.x.high != null ? x.x.high : "—"), confidence: "High", tone: "warn", educational: true }); }).join(""); }
    if (kind === "weight") {
      var c7 = weightChangeSince(7), c30 = weightChangeSince(30), wtw = workoutsThisWeek(), g = goal();
      var reasons = [];
      reasons.push(c30 != null ? "Weight change ~30d: " + (c30 > 0 ? "+" : "") + c30 + " kg" : "Not enough weight logs yet");
      reasons.push("Workouts this week: " + wtw + (g && g.trainingDays ? "/" + g.trainingDays : ""));
      var tg = targets(), eaten = eatenToday(); if (tg && eaten != null) reasons.push("Today's calories: " + eaten + "/" + tg.kcal);
      reasons.push("Consistent logging and a small, steady calorie gap drive change — check adherence over 2–3 weeks, not day to day.");
      return recCard({ title: "Weight analysis", reason: reasons, data: c7 != null ? "7d " + (c7 > 0 ? "+" : "") + c7 + "kg" : "", confidence: c30 != null ? "Medium" : "Low", tone: "ok" });
    }
    if (kind === "week") { var w = weeklyReview(); return recCard({ title: "Weekly review", reason: ["Workouts " + w.workouts + (w.goalDays ? "/" + w.goalDays : ""), w.weightChange != null ? "Weight " + (w.weightChange > 0 ? "+" : "") + w.weightChange + " kg" : "No weight change logged", "Streak " + w.streak + " days", "Recovery " + w.recovery + "%"], data: "", confidence: "Medium", tone: "ok" }); }
    if (kind === "improve") { var recs = recommendations().filter(function (r) { return r.tone === "warn"; }); return recs.length ? recs.map(recCard).join("") : recCard({ title: "Keep going", reason: ["No weak spots detected — maintain consistency"], data: "", confidence: "Medium", tone: "ok" }); }
    return "";
  }

  function render() {
    if (!window.IgnytGoals) return '<div class="empty-note">Coach is loading…</div>';
    var recs = recommendations(), rec = recovery(), g = goal(), gc = g ? goalCompute(g) : null, tg = targets();
    var h = briefing();

    h += section("Today's recommendations") + '<div>' + recs.map(recCard).join("") + '</div>';

    h += section("Recovery") + '<div class="coach-rec"><div class="coach-rec__dot" style="background:' + toneColor(rec.score < 50 ? "warn" : "ok") + ';"></div><div style="flex:1;"><div style="font-weight:800;">' + rec.score + '% · ' + rec.label + '</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:3px;">' + rec.factors.map(esc).join(" · ") + '</div></div></div>';

    if (g && gc) {
      var cur = weightSeries().length ? Number(weightSeries()[0].weight) : null;
      h += section("Goal progress") + '<div class="coach-rec"><div style="flex:1;"><div style="font-weight:800;">' + esc((window.IgnytGoals.GOAL_TYPES.filter(function (t) { return t.id === g.type; })[0] || {}).label || "Goal") + '</div>' +
        '<div style="font-size:12px;color:var(--color-text-secondary);margin-top:3px;">' + (cur != null && g.targetWeight != null ? Math.abs(Math.round((cur - g.targetWeight) * 10) / 10) + " kg to target · " : "") + 'daily target ' + gc.calories + ' kcal, ' + gc.protein + 'g protein</div></div></div>';
    } else {
      h += section("Goal") + '<button class="coach-rec" data-nav="goals" style="width:100%;text-align:left;border:none;cursor:pointer;background:var(--color-surface);"><div style="flex:1;"><div style="font-weight:800;">Set a goal</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:3px;">Coaching gets sharper with an active goal — tap to create one.</div></div></button>';
    }

    if (tg) h += section("Nutrition today") + '<div class="coach-rec"><div style="flex:1;"><div style="font-weight:800;">' + (eatenToday() != null ? eatenToday() : "—") + ' / ' + tg.kcal + ' kcal · ' + (proteinToday() != null ? proteinToday() : "—") + ' / ' + Math.round(tg.protein) + 'g protein</div><div style="font-size:12px;color:var(--color-text-secondary);margin-top:3px;">Targets come from your active goal / profile.</div></div></div>';

    // Ask (rule-based, not free-form LLM)
    h += section("Ask the coach") + '<div style="font-size:12px;color:var(--color-text-secondary);margin:-4px 2px 8px;">Answers are computed from your data (rule-based, offline) — not generated text.</div>';
    QUESTIONS.forEach(function (item, i) { h += '<button class="coach-q" data-coach="q" data-a="' + item.a + '">' + esc(item.q) + '</button>'; });
    if (view.answer) h += '<div class="goal-card" style="margin-top:10px;">' + answer(view.answer) + '</div>';

    h += '<div style="font-size:11px;color:var(--color-text-secondary);margin-top:16px;line-height:1.5;">Educational guidance based on your own logged data. Not medical advice. Cloud-AI can be added later without changing this offline rule engine.</div>';
    return h;
  }

  var _bound = false;
  function attach() {
    if (_bound) return; _bound = true;
    document.addEventListener("click", function (e) {
      if (typeof state === "undefined" || state.tab !== "ai-coach") return;
      var el = e.target.closest("[data-coach]"); if (!el) return;
      if (el.getAttribute("data-coach") === "q") { var a = el.getAttribute("data-a"); view.answer = (view.answer === a ? null : a); if (window.render) window.render(); }
    });
  }

  window.IgnytCoach = { render: render, attach: attach, _recommendations: recommendations, _recovery: recovery, _weekly: weeklyReview };
})();
