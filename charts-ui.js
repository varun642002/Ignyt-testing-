import { renderCalculators } from './forms.js';
import { radarChart, renderBodyDistribution, renderCalendarMonth, sparklineChart, weeklyBarChart } from '../charts.js';
import { ACTIVITY_MULTIPLIERS, EQUIPMENT_OPTIONS, GOAL_OPTIONS, HYROX_EXPERIENCE_OPTIONS, MEALS, MEAL_SHARE } from '../constants.js';
import { bodyWeightTrend, calcBodyFatNavy, calcLBM, calorieProteinTrend, foodsForDate, last7DaysCalories, macroTargets, profileCalorieTarget, profileMaintenance, recentFoodEntries, todayActivityKcal, todayBurned, todayEaten, todayMacros, todayWater } from '../nutrition.js';
import { state } from '../storage.js';
import { displayW, svg, todayStr, wUnit } from '../utils.js';
import { ACHIEVEMENT_DEFS, WEEKS, computeLongestStreak, computeMuscleDistribution, computeStreak, computeWeeklyActivity, exerciseProgressTrend, exercisesWithHistory, monthlyComparison, prTypeLabel, prValueLabel, thisWeekStats, totalTrainingTimeMin, workoutsPerWeekAvg } from '../workout.js';

/* =========================================================
   CHARTS-UI — the screens that arrange chart.js's primitives into full
   tabs with labels, filters, and surrounding UI chrome: Progress, Body,
   and Nutrition (macro bars included, since they're chart-shaped too).
========================================================= */

export function renderProgressTab(){
  let total=0, done=0;
  const perWeek = WEEKS.map(w=>{
    let wt=0, wd=0;
    w.days.forEach(d=>d.exercises.forEach(ex=>{ wt++; total++; if(state.completed[`${w.week}|${d.day}|${ex.name}`]){wd++; done++;} }));
    return {week:w.week, pct: wt?Math.round(wd/wt*100):0, phase:w.phase};
  });
  const overall = total? Math.round(done/total*100):0;
  const phaseColor = {base:'var(--steel)',build:'var(--steel)',load:'var(--accent)',peak:'var(--accent)',deload:'var(--mint)'};
  const sessions = state.workoutLog.length;
  const streak = computeStreak();
  const metric = state.chartMetric || "sets";
  const buckets = computeWeeklyActivity(8);
  const currentMuscles = computeMuscleDistribution(30,0);
  const prevMuscles = computeMuscleDistribution(30,30);
  const totalVolume = state.workoutLog.reduce((a,s)=>a+(s.volume||0),0);
  const totalSets = state.workoutLog.reduce((a,s)=>a+s.exercises.reduce((x,e)=>x+e.sets.length,0),0);
  const longestStreak = computeLongestStreak();
  const trainingHours = Math.floor(totalTrainingTimeMin()/60);
  const trainingMinsRem = totalTrainingTimeMin()%60;
  const freqAvg = workoutsPerWeekAvg();

  return `
    <div class="eyebrow-label" style="margin-top:4px;">Overview</div>
    <div class="grid2" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-label">Current Streak</div><div class="stat-value" style="color:var(--accent);">🔥 ${streak}<span class="stat-unit">days</span></div></div>
      <div class="stat-card"><div class="stat-label">Longest Streak</div><div class="stat-value" style="color:var(--steel);">${longestStreak}<span class="stat-unit">days</span></div></div>
      <div class="stat-card"><div class="stat-label">Freestyle Sessions</div><div class="stat-value">${sessions}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Frequency</div><div class="stat-value">${freqAvg}<span class="stat-unit">/wk</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Volume</div><div class="stat-value">${displayW(totalVolume,0).toLocaleString()}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Training Time</div><div class="stat-value">${trainingHours}<span class="stat-unit">h ${trainingMinsRem}m</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Sets Logged</div><div class="stat-value">${totalSets}</div></div>
    </div>

    <div class="eyebrow-label">Personal Records</div>
    ${state.prs.length===0 ? `<div class="empty-note" style="margin-bottom:16px;">No PRs yet — finish a freestyle workout to start tracking heaviest weight, estimated 1RM, rep records, and session volume.</div>` : `
    <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
      ${state.prs.slice(0,10).map(pr=>`<div class="history-row" style="background:none;padding:10px 0;margin:0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:700;">${pr.exerciseName||'Session Volume'}</div>
          <div style="font-size:11px;color:var(--muted);">${prTypeLabel(pr)} · ${new Date(pr.achievedAt).toLocaleDateString('default',{month:'short',day:'numeric'})}</div>
        </div>
        <span class="mono" style="font-size:13px;color:var(--accent);font-weight:800;">${prValueLabel(pr)}</span>
      </div>`).join("")}
      ${state.prs.length>10?`<div style="font-size:11px;color:var(--muted);padding:8px 0;text-align:center;">+ ${state.prs.length-10} more in your export</div>`:""}
    </div>`}

    <div class="row-between">
      <span class="eyebrow-label" style="margin:18px 0 8px;">Achievements</span>
      <span class="mono" style="font-size:11px;color:var(--muted);">${state.achievements.length} / ${ACHIEVEMENT_DEFS.length}</span>
    </div>
    ${state.achievements.length===0 ? `<div class="empty-note" style="margin-bottom:16px;">No achievements unlocked yet — your first workout is the first one.</div>` : `
    <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
      ${state.achievements.slice().sort((a,b)=>b.achievedAt-a.achievedAt).slice(0,10).map(a=>`<div class="history-row" style="background:none;padding:10px 0;margin:0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:700;">🎖️ ${a.name}</div>
          <div style="font-size:11px;color:var(--muted);">${a.desc}</div>
        </div>
        <span class="mono" style="font-size:11px;color:var(--muted);">${new Date(a.achievedAt).toLocaleDateString('default',{month:'short',day:'numeric'})}</span>
      </div>`).join("")}
      ${state.achievements.length>10?`<div style="font-size:11px;color:var(--muted);padding:8px 0;text-align:center;">+ ${state.achievements.length-10} more</div>`:""}
    </div>`}

    <div class="eyebrow-label">This Week — Actual Values</div>
    <div class="info-box" style="padding:14px;">
      ${(()=>{
        const w = thisWeekStats();
        const th = Math.floor(w.trainingMinutes/60), tm = w.trainingMinutes%60;
        const row = (label, valueHtml) => `<div class="row-between" style="padding:8px 0;border-top:1px solid var(--border);">
          <span style="font-size:13px;font-weight:700;">${label}</span>
          <span class="mono" style="font-size:13px;font-weight:800;color:var(--text);">${valueHtml}</span>
        </div>`;
        return `
          ${row("Workouts", w.workoutsGoal ? `${w.workoutsCompleted} / ${w.workoutsGoal} completed` : `${w.workoutsCompleted} completed`)}
          ${row("Training Time", `${th}h ${tm}m`)}
          ${row("Weekly Volume", `${displayW(w.weeklyVolume,0).toLocaleString()} ${wUnit()}`)}
          ${row("Calories Burned (est.)", `${w.caloriesBurned.toLocaleString()} kcal`)}
          ${row("Current Streak", `${w.currentStreak} day${w.currentStreak!==1?'s':''}`)}
          ${row("HYROX Sessions", `${w.hyroxSessions} completed`)}
        `;
      })()}
      ${!state.profile.trainingDays ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Set a weekly training-days target in Body → Your Profile to see a goal here.</div>` : ''}
    </div>

    <div class="eyebrow-label">Weekly Activity — Last 8 Weeks</div>
    <div class="info-box" style="padding:14px;">
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        ${["sets","duration","volume"].map(m=>`<button class="cat-chip ${metric===m?'active':''}" data-metric="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join("")}
      </div>
      ${weeklyBarChart(buckets, metric)}
    </div>

    <div class="eyebrow-label">Muscle Distribution — Last 30 Days</div>
    <div class="info-box" style="display:flex; flex-direction:column; align-items:center; padding:16px;">
      ${radarChart(currentMuscles, prevMuscles)}
      <div style="display:flex; gap:16px; margin-top:6px;">
        <span style="font-size:11px;color:var(--muted);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent);margin-right:5px;"></span>Current</span>
        <span style="font-size:11px;color:var(--muted);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--muted);margin-right:5px;"></span>Previous 30d</span>
      </div>
    </div>

    <div class="eyebrow-label">Body Weight Trend</div>
    <div class="info-box" style="padding:14px;">
      ${sparklineChart(bodyWeightTrend(20).map(p=>({date:p.date, value:displayW(p.value)})), {color:"var(--steel)", unit:wUnit()})}
    </div>

    <div class="eyebrow-label">Exercise Progress</div>
    <div class="info-box" style="padding:14px;">
      ${exercisesWithHistory().length===0 ? `<div class="empty-note">Log the same exercise across a few workouts to see its strength trend here.</div>` : `
        <select class="select-input" id="progress-exercise-select" style="margin-bottom:12px;">
          ${exercisesWithHistory().map(n=>`<option value="${n}" ${state.progressExercise===n?'selected':''}>${n}</option>`).join("")}
        </select>
        ${(() => {
          const exName = state.progressExercise && exercisesWithHistory().includes(state.progressExercise) ? state.progressExercise : exercisesWithHistory()[0];
          const trend = exerciseProgressTrend(exName, 20);
          const weightPoints = trend.map(t=>({date:t.date, value:displayW(t.weight)}));
          const ormPoints = trend.map(t=>({date:t.date, value:displayW(t.oneRM)}));
          return `
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Top Set Weight</div>
            ${sparklineChart(weightPoints, {color:"var(--accent)", unit:wUnit()})}
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Estimated 1RM</div>
            ${sparklineChart(ormPoints, {color:"var(--mint)", unit:wUnit()})}
          `;
        })()}
      `}
    </div>

    <div class="eyebrow-label">This Month vs Last Month</div>
    <div class="info-box" style="padding:14px;">
      ${(() => {
        const mc = monthlyComparison();
        const row = (label, a, b, unit) => {
          const delta = a-b;
          const pct = b>0 ? Math.round(delta/b*100) : (a>0?100:0);
          return `<div class="row-between" style="padding:8px 0;border-top:1px solid var(--border);">
            <span style="font-size:13px;font-weight:700;">${label}</span>
            <span style="display:flex;gap:10px;align-items:center;">
              <span class="mono" style="font-size:13px;">${a}${unit}</span>
              <span class="mono" style="font-size:11px;color:${delta>=0?'var(--mint)':'var(--accent)'};font-weight:800;">${delta>=0?'+':''}${pct}%</span>
            </span>
          </div>`;
        };
        return `
          <div class="row-between" style="margin-bottom:4px;">
            <span style="font-size:11px;color:var(--muted);font-weight:700;">THIS MONTH</span>
            <span style="font-size:11px;color:var(--muted);font-weight:700;">VS LAST MONTH</span>
          </div>
          ${row("Sessions", mc.thisMonth.sessions, mc.lastMonth.sessions, "")}
          ${row("Volume", displayW(mc.thisMonth.volume,0).toLocaleString(), displayW(mc.lastMonth.volume,0), wUnit())}
          ${row("Training Time", mc.thisMonth.minutes, mc.lastMonth.minutes, "m")}
        `;
      })()}
    </div>

    <div class="eyebrow-label">Calories & Protein — Last 30 Days</div>
    <div class="info-box" style="padding:14px;">
      ${(() => {
        const ct = calorieProteinTrend(30).filter(d=>d.kcal>0 || d.protein>0);
        if(ct.length<2) return `<div class="empty-note">Log food across a few more days to see calorie and protein trends here.</div>`;
        return `
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Calories</div>
          ${sparklineChart(ct.map(d=>({date:d.date,value:Math.round(d.kcal)})), {color:"var(--accent)", unit:"kcal"})}
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Protein</div>
          ${sparklineChart(ct.map(d=>({date:d.date,value:Math.round(d.protein)})), {color:"var(--steel)", unit:"g"})}
        `;
      })()}
    </div>

    <div class="eyebrow-label">Body Distribution</div>
    <div class="info-box" style="padding:14px;">
      ${renderBodyDistribution(state.bodyDistWeekOffset||0)}
    </div>

    <div class="eyebrow-label">Calendar</div>
    <div class="info-box" style="padding:14px;">
      ${renderCalendarMonth(state.calendarMonthOffset||0)}
    </div>

    <div class="eyebrow-label">Phase 1 Completion</div>
    <div class="info-box" style="text-align:center;padding:20px;margin-bottom:16px;">
      <div class="mono" style="font-weight:900;font-size:36px;color:var(--accent);">${overall}%</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">${done} of ${total} plan sessions logged</div>
    </div>
    <div class="eyebrow-label">By Week</div>
    ${perWeek.map(w=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div class="mono" style="width:50px;font-size:11px;font-weight:700;color:var(--muted);">WK ${w.week}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${w.pct}%;background:${phaseColor[w.phase]};"></div></div>
      <div class="mono" style="width:36px;text-align:right;font-size:11px;">${w.pct}%</div>
    </div>`).join("")}
  `;
}

/* =========================================================
   SETTINGS TAB — export/import + workout settings
========================================================= */

export function renderBodyTab(){
  const entries = state.bodylog;
  const first = entries[entries.length-1];
  const latest = entries[0];
  const delta = (first && latest) ? (Number(latest.weight)-Number(first.weight)) : null;
  const fieldSm = (id,label,ph,color) => `<div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">${label}</label>
    <input type="number" id="${id}" placeholder="${ph}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:${color};"></div>`;

  const p = state.profile;
  const maint = profileMaintenance();
  const target = profileCalorieTarget();

  // Body composition: prefer latest logged body fat %, else estimate via Navy from latest measurements
  let bfPct = null;
  const latestBF = entries.find(e=>e.bodyfat);
  const latestWaist = entries.find(e=>e.waist);
  if(latestBF) bfPct = Number(latestBF.bodyfat);
  else if(latestWaist && state.calc.neck){
    bfPct = calcBodyFatNavy(p.gender, p.height, state.calc.neck, Number(latestWaist.waist), state.calc.hip);
  }
  const lbmBoer = calcLBM(p.gender, p.height, p.weight).boer;
  let fatMass = null, leanMass = null, muscleMass = null;
  if(bfPct!=null && bfPct>0){
    fatMass = p.weight * bfPct/100;
    leanMass = p.weight - fatMass;
    muscleMass = leanMass * 0.535; // skeletal muscle ≈ 53.5% of lean mass (Lee et al. estimate)
  }

  return `
    <div class="eyebrow-label" style="margin-top:4px;">Your Profile</div>
    <div class="info-box" style="padding:14px;">
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Name</label>
      <input type="text" id="p-name" value="${p.name||''}" placeholder="Optional" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin:4px 0 12px;font-size:13px;color:var(--text);">
      <div class="grid2">
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Weight (${wUnit()})</label>
          <div style="padding:8px;margin-top:4px;font-size:13px;color:var(--accent);font-weight:700;">${displayW(p.weight)} <span style="font-size:10px;color:var(--muted);font-weight:400;">(from log)</span></div></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Height (cm)</label>
          <input type="number" id="p-height" value="${p.height}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:var(--text);"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Age</label>
          <input type="number" id="p-age" value="${p.age}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:var(--text);"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Gender</label>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="cat-chip ${p.gender==='male'?'active':''}" data-profile-gender="male" style="flex:1;text-align:center;">Male</button>
            <button class="cat-chip ${p.gender==='female'?'active':''}" data-profile-gender="female" style="flex:1;text-align:center;">Female</button>
          </div></div>
      </div>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
      <select class="select-input" id="p-activity">
        ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${p.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:6px 0 4px;">Goal</label>
      <select class="select-input" id="p-goal">
        ${GOAL_OPTIONS.map(g=>`<option value="${g.delta}" ${p.goalDelta===g.delta?'selected':''}>${g.label}</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:6px 0 4px;">Hyrox Experience</label>
      <select class="select-input" id="p-hyrox-exp">
        ${HYROX_EXPERIENCE_OPTIONS.map(o=>`<option value="${o.key}" ${p.hyroxExperience===o.key?'selected':''}>${o.label}</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:6px 0 4px;">Training Days / Week</label>
      <select class="select-input" id="p-training-days" style="margin-bottom:0;">
        ${[2,3,4,5,6,7].map(n=>`<option value="${n}" ${p.trainingDays===n?'selected':''}>${n} days/week</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Available Equipment</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${EQUIPMENT_OPTIONS.map(eq=>`<button class="cat-chip ${p.equipment.includes(eq)?'active':''}" data-profile-equipment="${eq}">${eq}</button>`).join("")}
      </div>
    </div>

    <div class="grid2" style="margin-top:10px;margin-bottom:6px;">
      <div class="stat-card"><div class="stat-label">Maintenance</div><div class="stat-value" style="color:var(--steel);">${maint}<span class="stat-unit">kcal</span></div></div>
      <div class="stat-card"><div class="stat-label">Daily Calorie Goal</div><div class="stat-value" style="color:var(--accent);">${target}<span class="stat-unit">kcal</span></div></div>
    </div>
    <div class="info-box" style="font-size:12px;">These numbers, plus your protein/carb/fat targets in the Fuel tab, recalculate automatically whenever you change your weight or goal here.</div>

    <div class="eyebrow-label">Body Composition</div>
    <div class="info-box" style="padding:14px;">
      ${bfPct!=null ? `<div class="grid2">
        <div class="stat-card"><div class="stat-label">Body Fat</div><div class="stat-value" style="color:var(--accent);">${bfPct.toFixed(1)}<span class="stat-unit">%</span></div></div>
        <div class="stat-card"><div class="stat-label">Fat Mass</div><div class="stat-value" style="color:var(--text);">${displayW(fatMass)}<span class="stat-unit">${wUnit()}</span></div></div>
        <div class="stat-card"><div class="stat-label">Lean Body Mass</div><div class="stat-value" style="color:var(--steel);">${displayW(leanMass)}<span class="stat-unit">${wUnit()}</span></div></div>
        <div class="stat-card"><div class="stat-label">Est. Muscle Mass</div><div class="stat-value" style="color:var(--mint);">${displayW(muscleMass)}<span class="stat-unit">${wUnit()}</span></div></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:8px;">Fat/lean/muscle computed from your body-fat %${latestBF?' (from your latest log)':' (estimated from waist + neck via US Navy method)'}. Muscle mass is a lean-mass-based estimate, not a scan.</div>`
      : `<div style="font-size:13px;color:var(--muted);">Log a <b style="color:var(--text);">Body Fat %</b> below — or a waist measurement (with neck set in the Body Fat calculator) — to see fat mass, lean mass, and estimated muscle mass here.</div>
      <div class="stat-card" style="margin-top:10px;"><div class="stat-label">Lean Body Mass (Boer estimate)</div><div class="stat-value" style="color:var(--steel);">${displayW(lbmBoer)}<span class="stat-unit">${wUnit()}</span></div></div>`}
    </div>

    <div class="eyebrow-label">Log Entry</div>
    <div class="info-box" style="padding:14px;">
      <div class="grid2">
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Date</label>
          <input type="date" id="b-date" value="${new Date().toISOString().slice(0,10)}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:var(--text);"></div>
        ${fieldSm("b-weight",`Weight (${wUnit()})`,wUnit()==='lb'?'220':'101.0',"var(--accent)")}
        ${fieldSm("b-sleep","Sleep (hrs)","7.5","var(--steel)")}
        ${fieldSm("b-hrv","HRV (ms)","91","var(--steel)")}
        ${fieldSm("b-waist","Waist (cm)","","var(--text)")}
        ${fieldSm("b-chest","Chest (cm)","","var(--text)")}
        ${fieldSm("b-arms","Arms (cm)","","var(--text)")}
        ${fieldSm("b-bodyfat","Body Fat (%)","","var(--text)")}
      </div>
      <div style="font-size:11px;color:var(--muted);margin:8px 0;">Logging a weight here updates your profile weight and recalculates calories & macros everywhere.</div>
      <button class="btn btn-accent btn-block" data-action="log-body">Log Entry</button>
    </div>

    ${delta!==null?`<div class="field" style="margin-top:12px;"><label>Total weight change</label>
      <span class="mono" style="font-weight:900;color:${delta<=0?'var(--mint)':'var(--accent)'};">${delta>0?'+':''}${displayW(delta)} ${wUnit()}</span></div>`:''}

    <div class="eyebrow-label">History</div>
    ${entries.length===0?`<div class="empty-note">No entries yet.</div>`:
      entries.map(e=>`<div class="history-row">
        <span class="mono" style="font-size:11px;color:var(--muted);">${e.date}</span>
        <span class="mono" style="font-size:12px;color:var(--accent);">${displayW(e.weight)}${wUnit()}</span>
        <span class="mono" style="font-size:12px;color:var(--steel);">${e.sleep||'–'}h</span>
        <span class="mono" style="font-size:12px;color:var(--steel);">${e.hrv||'–'}ms</span>
        <button class="del" data-del-body="${e.id}" aria-label="Delete body log entry">${svg('x',12)}</button>
      </div>`).join("")}

    <div class="eyebrow-label">Calculators</div>
    <div class="info-box" style="padding:14px;">
      ${renderCalculators()}
    </div>
  `;
}

/* =========================================================
   NUTRITION TAB — meals, macro budgets, insights
========================================================= */

export function renderNutritionTab(){
  const n = state.nutrition;
  const targets = macroTargets();
  const weeklyLoss = (Math.abs(state.profile.goalDelta)*7)/7700;

  const eaten = todayEaten();
  const burned = todayBurned();
  const netDeficit = burned - eaten;
  const activityKcal = Math.round(todayActivityKcal());
  const macros = todayMacros();
  const macroPctTotal = (n.proteinPct||0)+(n.carbPct||0)+(n.fatPct||0);
  const todaysFood = foodsForDate(todayStr());
  const week = last7DaysCalories();
  const weekTotal = week.reduce((a,d)=>a+d.kcal,0);
  const weekAvg = Math.round(weekTotal/7);
  const maxKcal = Math.max(targets.kcal, ...week.map(d=>d.kcal), 1);

  return `
    <div class="eyebrow-label" style="margin-top:4px;">Today</div>
    <div class="grid2" style="margin-bottom:8px;">
      <div class="stat-card"><div class="stat-label">Eaten</div><div class="stat-value" style="color:var(--text);">${Math.round(eaten)}<span class="stat-unit">/ ${targets.kcal} kcal</span></div></div>
      <div class="stat-card"><div class="stat-label">Burned (est.)</div><div class="stat-value" style="color:var(--steel);">${burned}<span class="stat-unit">kcal</span></div></div>
    </div>
    <div class="info-box" style="text-align:center;padding:14px;margin-bottom:16px;background:${netDeficit>=0?'rgba(62,207,142,.08)':'rgba(255,90,31,.08)'};">
      <div class="stat-label">${netDeficit>=0?'Deficit Created':'Surplus (over target)'}</div>
      <div class="mono" style="font-weight:900;font-size:26px;color:${netDeficit>=0?'var(--mint)':'var(--accent)'};margin-top:2px;">${netDeficit>=0?'':'+'}${Math.abs(netDeficit)}<span style="font-size:13px;font-weight:700;color:var(--muted);margin-left:4px;">kcal</span></div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;">Burned = ${profileMaintenance()} maintenance + ~${activityKcal} workout est.</div>
    </div>

    <div class="eyebrow-label">Macronutrients Today</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${macroBar("Protein", macros.protein, targets.protein, "var(--accent)", "g")}
      ${macroBar("Carbs", macros.carbs, targets.carbs, "var(--steel)", "g")}
      ${macroBar("Fat", macros.fat, targets.fat, "#FFB020", "g")}
      ${macroBar("Fibre", macros.fibre, targets.fibre, "var(--mint)", "g")}
    </div>

    <div class="eyebrow-label">Water</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${(()=>{
        const waterMl = todayWater();
        const waterTarget = state.settings.waterTargetMl || 2500;
        return macroBar("Water", waterMl, waterTarget, "var(--steel)", "ml");
      })()}
      <div style="display:flex;gap:6px;margin-top:4px;">
        ${[250,500,750].map(ml=>`<button class="cat-chip" data-add-water="${ml}" style="flex:1;text-align:center;">+${ml}ml</button>`).join("")}
        <button class="cat-chip" data-action="undo-water" style="flex:1;text-align:center;color:var(--muted);">Undo</button>
      </div>
    </div>

    <div class="eyebrow-label">Meals</div>
    ${MEALS.map(meal=>{
      const mealFoods = todaysFood.filter(f=>(f.meal||"Lunch")===meal);
      const mealKcal = mealFoods.reduce((a,f)=>a+Number(f.calories||0),0);
      const budget = Math.round(targets.kcal * MEAL_SHARE[meal]);
      const isOpen = state.mealOpen===meal;
      return `<div class="info-box" style="padding:12px 14px;margin-bottom:8px;">
        <div class="row-between" data-meal-toggle="${meal}" style="cursor:pointer;">
          <span style="font-weight:800;font-size:15px;">${meal}</span>
          <span class="mono" style="font-size:12px;color:${mealKcal>budget?'var(--accent)':'var(--muted)'};">${mealKcal} of ${budget} Cal <span style="color:var(--accent);font-weight:900;margin-left:6px;">${isOpen?'−':'+'}</span></span>
        </div>
        ${mealFoods.map(f=>`<div class="history-row" style="margin-top:8px;">
          <div><div style="font-size:13px;font-weight:600;">${f.name}</div>
          ${(f.protein||f.carbs||f.fat)?`<div class="mono" style="font-size:10px;color:var(--muted);">P${f.protein||0} C${f.carbs||0} F${f.fat||0}</div>`:""}</div>
          <span class="mono" style="font-size:12px;color:var(--accent);">${f.calories} kcal</span>
          <button class="del" data-del-food="${f.id}" aria-label="Delete food entry">${svg('x',12)}</button>
        </div>`).join("")}
        ${isOpen?`<div style="margin-top:10px;">
          ${recentFoodEntries(6).length ? `
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:5px;">Recent</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
              ${recentFoodEntries(6).map(f=>`<button class="cat-chip" data-quick-add-food="${meal}" data-food-name="${f.name.replace(/"/g,'&quot;')}" data-food-cal="${f.calories||0}" data-food-protein="${f.protein||0}" data-food-carbs="${f.carbs||0}" data-food-fat="${f.fat||0}" data-food-fibre="${f.fibre||0}">${f.name} · ${f.calories||0}kcal</button>`).join("")}
            </div>` : ""}
          ${state.favoriteFoods.length ? `
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:5px;">★ Favorites</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
              ${state.favoriteFoods.map(f=>`<button class="cat-chip active" data-quick-add-food="${meal}" data-food-name="${f.name.replace(/"/g,'&quot;')}" data-food-cal="${f.calories||0}" data-food-protein="${f.protein||0}" data-food-carbs="${f.carbs||0}" data-food-fat="${f.fat||0}" data-food-fibre="${f.fibre||0}">${f.name} · ${f.calories||0}kcal</button>`).join("")}
            </div>` : ""}
          <input type="text" id="food-name" placeholder="Food name" style="width:100%;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:13px;color:var(--text);margin-bottom:6px;">
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <input type="number" id="food-cal" placeholder="kcal*" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--accent);text-align:center;">
            <input type="number" id="food-protein" placeholder="P g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
            <input type="number" id="food-carbs" placeholder="C g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
            <input type="number" id="food-fat" placeholder="F g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
            <input type="number" id="food-fibre" placeholder="Fb g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-accent" style="flex:1;" data-log-meal-food="${meal}">Add to ${meal}</button>
            <button class="btn btn-ghost" style="width:44px;flex-shrink:0;" data-action="save-as-favorite" title="Save as favorite">★</button>
          </div>
        </div>`:""}
      </div>`;
    }).join("")}

    <div class="eyebrow-label">Last 7 Days</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      <div class="grid2" style="margin-bottom:12px;">
        <div><div class="stat-label">Weekly Total</div><div class="mono" style="font-weight:900;font-size:18px;">${weekTotal.toLocaleString()} <span style="font-size:11px;color:var(--muted);">Cal</span></div></div>
        <div><div class="stat-label">Average / Day</div><div class="mono" style="font-weight:900;font-size:18px;">${weekAvg.toLocaleString()} <span style="font-size:11px;color:var(--muted);">Cal</span></div></div>
      </div>
      <div style="position:relative;height:110px;display:flex;align-items:flex-end;gap:6px;">
        <div style="position:absolute;left:0;right:0;top:${100-Math.min(100,targets.kcal/maxKcal*100)}%;border-top:1.5px dashed var(--accent);opacity:.6;"></div>
        ${week.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end;">
          ${d.kcal>0?`<span class="mono" style="font-size:9px;color:var(--muted);">${d.kcal}</span>`:""}
          <div style="width:70%;border-radius:4px 4px 0 0;background:${d.kcal>targets.kcal?'var(--accent)':'#FFB020'};height:${Math.max(2,Math.round(d.kcal/maxKcal*80))}px;"></div>
          <span style="font-size:9px;color:var(--muted);font-weight:700;">${d.label}</span>
        </div>`).join("")}
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:6px;">Dashed line = your ${targets.kcal} kcal daily target.</div>
    </div>

    <div class="eyebrow-label">Calorie & Macro Budget</div>
    <div class="info-box" style="padding:12px 14px;margin-bottom:8px;font-size:12px;color:var(--muted);">
      Your calorie target updates automatically from your weight, stats, and goal (set in the <b style="color:var(--steel);">Body</b> tab). Maintenance right now: <b class="mono" style="color:var(--text);">${profileMaintenance()} kcal</b>.
    </div>
    <div class="field"><label>Protein %</label><div><input type="number" id="n-proteinpct" value="${n.proteinPct}"><span class="unit">%</span></div></div>
    <div class="field"><label>Carb %</label><div><input type="number" id="n-carbpct" value="${n.carbPct}"><span class="unit">%</span></div></div>
    <div class="field"><label>Fat %</label><div><input type="number" id="n-fatpct" value="${n.fatPct}"><span class="unit">%</span></div></div>
    <div class="field"><label>Fibre target</label><div><input type="number" id="n-fibre" value="${n.fibreTarget}"><span class="unit">g</span></div></div>
    <div class="info-box" style="padding:10px 14px;margin-bottom:8px;${macroPctTotal!==100?'background:rgba(255,90,31,.1);':''}">
      <div class="row-between"><span style="font-size:13px;font-weight:700;">Macro Total</span>
      <span class="mono" style="font-weight:900;color:${macroPctTotal===100?'var(--mint)':'var(--accent)'};">${macroPctTotal}%</span></div>
      ${macroPctTotal!==100?`<div style="font-size:11px;color:var(--accent);margin-top:2px;">Should add up to 100%</div>`:""}
    </div>

    <div class="grid2">
      <div class="stat-card"><div class="stat-label">Calorie Target</div><div class="stat-value" style="color:var(--accent);">${targets.kcal}<span class="stat-unit">kcal</span></div></div>
      <div class="stat-card"><div class="stat-label">Weekly Loss (est.)</div><div class="stat-value" style="color:var(--mint);">${displayW(weeklyLoss,2)}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Protein Target</div><div class="stat-value" style="color:var(--steel);">${Math.round(targets.protein)}<span class="stat-unit">g</span></div></div>
      <div class="stat-card"><div class="stat-label">Carb Target</div><div class="stat-value" style="color:var(--steel);">${Math.round(targets.carbs)}<span class="stat-unit">g</span></div></div>
      <div class="stat-card"><div class="stat-label">Fat Target</div><div class="stat-value" style="color:var(--steel);">${Math.round(targets.fat)}<span class="stat-unit">g</span></div></div>
      <div class="stat-card"><div class="stat-label">Fibre Target</div><div class="stat-value" style="color:var(--mint);">${targets.fibre}<span class="stat-unit">g</span></div></div>
    </div>
    <div class="info-box" style="margin-top:14px;">Recalculate maintenance every 2–3 weeks against your actual weight trend. Don't drop below ~1800–2000 kcal given training volume — recovery beats speed here.</div>
  `;
}

/* =========================================================
   PROGRESS TAB — stats, radar, weekly activity, calendar/streak
========================================================= */

/* --- data helpers --- */

export function macroBar(label, val, target, color, unit){
  const pct = target>0 ? Math.min(100, Math.round(val/target*100)) : 0;
  return `<div style="margin-bottom:10px;">
    <div class="row-between" style="margin-bottom:4px;">
      <span style="font-size:13px;font-weight:700;">${label}</span>
      <span class="mono" style="font-size:12px;color:var(--muted);">${val.toFixed(0)} / ${target.toFixed(0)} ${unit} <span style="color:${color};font-weight:800;margin-left:4px;">${pct}%</span></span>
    </div>
    <div class="progress-track" style="height:7px;"><div class="progress-fill" style="width:${pct}%;background:${color};"></div></div>
  </div>`;
}
