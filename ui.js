import { ACTIVITY_MULTIPLIERS, ALL_DATA_KEYS, BODY_MUSCLES, CALCULATORS, EQUIPMENT_OPTIONS, EXERCISE_DETAILS, GOAL_OPTIONS, HYROX_EXPERIENCE_OPTIONS, LEVELS, LIBRARY, MEALS, MEAL_SHARE, RACE_SEGMENTS, REST_OPTIONS, RPE_OPTIONS, SET_TYPE_META } from './constants.js';
import { avatarColorFor, calcPlates, debounce, displayW, formatDuration, formatTime, parseInputW, svg, todayStr, wUnit } from './utils.js';
import { exportAllJSON, exportMeasurementsCSV, exportWorkoutsCSV, importAllJSON, importCsv, persist, state } from './storage.js';
import { applyWakeLock, ensureElapsedTimerRunning, ensureRaceTimerRunning, startTimer, stopElapsedTimer, stopRaceTimer } from './timer.js';
import { radarChart, renderBodyDistribution, renderCalendarMonth, sparklineChart, weeklyBarChart } from './charts.js';
import { applyTheme, renderSettingsTab, settingToggle } from './settings.js';
import { ACHIEVEMENT_DEFS, WEEKS, allLibraryExercises, bestRaceTime, checkAchievements, computeLongestStreak, computeMuscleDistribution, computeSessionVolume, computeStreak, computeWeeklyActivity, detectPRs, exerciseHistoryEntries, exercisePRs, exerciseProgressTrend, exercisesWithHistory, getMuscle, getPreviousSet, monthlyComparison, nextSetType, overallPlanProgress, prTypeLabel, prValueLabel, rebuildWeeks, recentExerciseNames, sessionMuscles, sessionTitle, thisWeekStats, todaysPlannedDay, totalTrainingTimeMin, weekProgress, workoutsPerWeekAvg } from './workout.js';
import { bodyWeightTrend, calcBMR, calcBodyFatNavy, calcBodyType, calcHeartRateZones, calcIdealWeight, calcLBM, calcMacros, calorieProteinTrend, foodsForDate, last7DaysCalories, macroTargets, profileCalorieTarget, profileMaintenance, recentFoodEntries, todayActivityKcal, todayBurned, todayEaten, todayMacros, todayWater } from './nutrition.js';

/* =========================================================
   UI — layout shell and every screen's render function, plus
   attachHandlers() which wires up all DOM event listeners after each
   render. This is the one module that legitimately touches nearly
   everything else, since it's what turns app state into what's on screen.
========================================================= */

export function render(){
  try{
    applyTheme();
    if(!state.onboardingComplete){
      renderOnboarding();
      return;
    }
    renderApp();
    if(state.session) ensureElapsedTimerRunning();
    else stopElapsedTimer();
    if(state.raceActive) ensureRaceTimerRunning();
    else stopRaceTimer();
  }catch(err){
    console.error("Ignyt render error:", err);
    renderErrorScreen(err);
  }
}

export function renderApp(){
  const root = document.getElementById("app");
  const MORE_TABS = ["library","body","nutrition","settings"];
  const isMoreActive = MORE_TABS.includes(state.tab) || state.tab==="more";
  root.innerHTML = `
    <header class="app-header" style="display:flex;align-items:flex-end;justify-content:space-between;">
      <div>
        <div class="eyebrow-row"><div class="eyebrow-dash"></div><span class="eyebrow">Full Training System</span></div>
        <h1 class="title">IGNYT</h1>
      </div>
      <button data-nav="settings" aria-label="Settings" style="background:${state.tab==='settings'?'var(--surface-alt)':'none'};border:none;color:${state.tab==='settings'?'var(--accent)':'var(--muted)'};padding:8px;border-radius:10px;cursor:pointer;">${svg('gear',22)}</button>
    </header>
    <main id="main"></main>
    ${renderTimerOverlay()}
    ${state.tab==="more" ? renderMoreSheet() : ""}
    <nav class="bottom-nav">
      ${navBtn("home","Home")}
      ${navBtn("plan","Plan")}
      ${navBtn("workout","Workout")}
      ${navBtn("progress","Progress")}
      <button class="nav-btn ${isMoreActive?'active':''}" data-nav="more">${svg('more')}<span>More</span></button>
    </nav>
  `;
  const main = document.getElementById("main");
  if(state.tab==="home") main.innerHTML = renderHomeTab();
  if(state.tab==="plan") main.innerHTML = renderPlanTab();
  if(state.tab==="workout") main.innerHTML = renderWorkoutTab();
  if(state.tab==="library") main.innerHTML = renderLibraryTab();
  if(state.tab==="body") main.innerHTML = renderBodyTab();
  if(state.tab==="nutrition") main.innerHTML = renderNutritionTab();
  if(state.tab==="progress") main.innerHTML = renderProgressTab();
  if(state.tab==="settings") main.innerHTML = renderSettingsTab();
  if(state.tab==="more") main.innerHTML = ""; // sheet covers it
  attachHandlers();
  persist();
}

/* Fallback UI so a runtime error never leaves a blank screen. Self-contained —
   doesn't rely on attachHandlers() or any state that may itself be broken. */

export function renderErrorScreen(err){
  const root = document.getElementById("app");
  let msg = "Something went wrong displaying this screen.";
  try{ msg = (err && err.message) ? err.message : msg; }catch{}
  root.innerHTML = `
    <div style="padding:24px 20px;max-width:480px;margin:0 auto;">
      <div style="font-size:38px;margin-bottom:8px;">⚠️</div>
      <h1 style="font-size:20px;font-weight:900;margin-bottom:6px;">Ignyt hit a snag</h1>
      <p style="font-size:13px;color:var(--muted,#9a9aa4);margin-bottom:18px;">
        A screen failed to load. Your saved data is safe — it lives in this browser's storage, untouched.
      </p>
      <div style="background:#1c1c22;border-radius:10px;padding:10px 12px;font-family:monospace;font-size:11px;color:#ff8a5c;margin-bottom:20px;word-break:break-word;">${msg.replace(/</g,"&lt;")}</div>
      <button id="err-reload" style="width:100%;padding:13px;border:none;border-radius:10px;background:#FF5A1F;color:#fff;font-weight:800;font-size:14px;margin-bottom:10px;">Reload App</button>
      <button id="err-home" style="width:100%;padding:13px;border:none;border-radius:10px;background:#2a2a32;color:#fff;font-weight:700;font-size:14px;margin-bottom:10px;">Go to Home</button>
      <button id="err-backup" style="width:100%;padding:13px;border:none;border-radius:10px;background:#2a2a32;color:#fff;font-weight:700;font-size:14px;margin-bottom:10px;">Download Backup Now</button>
      <button id="err-reset" style="width:100%;padding:13px;border:1px solid #ff6b6b;border-radius:10px;background:none;color:#ff6b6b;font-weight:700;font-size:13px;">Reset All App Data</button>
    </div>
  `;
  document.getElementById("err-reload").addEventListener("click", ()=> location.reload());
  document.getElementById("err-home").addEventListener("click", ()=>{
    try{ state.tab = "home"; render(); }
    catch{ location.reload(); }
  });
  document.getElementById("err-backup").addEventListener("click", ()=>{
    try{ exportAllJSON(); }
    catch{ alert("Backup failed too — try Reload first."); }
  });
  document.getElementById("err-reset").addEventListener("click", ()=>{
    if(confirm("This permanently deletes ALL app data. Are you sure?") && confirm("Last check — this cannot be undone. Delete everything?")){
      ALL_DATA_KEYS.forEach(k=>localStorage.removeItem(k));
      location.reload();
    }
  });
}

export function renderMoreSheet(){
  const items = [
    {id:"library", label:"Library", desc:"Exercises & equipment", color:"var(--steel)", icon:"library"},
    {id:"body", label:"Body", desc:"Weight & measurements", color:"var(--accent)", icon:"body"},
    {id:"nutrition", label:"Fuel", desc:"Meals, calories, macros", color:"var(--mint)", icon:"nutrition"},
    {id:"settings", label:"Settings", desc:"Backups & preferences", color:"var(--muted)", icon:"gear"}
  ];
  return `<div class="more-sheet-backdrop" data-close-more>
    <div class="more-sheet">
      <div class="more-sheet-handle"></div>
      <div class="eyebrow-label" style="margin-top:0;margin-bottom:14px;">More</div>
      <div class="more-sheet-grid">
        ${items.map(it=>`<button class="more-sheet-card" data-nav="${it.id}">
          <span class="more-sheet-icon-badge" style="background:${it.color}22;color:${it.color};">${svg(it.icon,22)}</span>
          <div style="font-weight:800;font-size:15px;margin-top:10px;">${it.label}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${it.desc}</div>
        </button>`).join("")}
      </div>
    </div>
  </div>`;
}

export function navBtn(id,label){
  return `<button class="nav-btn ${state.tab===id?'active':''}" data-nav="${id}">${svg(id)}<span>${label}</span></button>`;
}

/* =========================================================
   PLAN TAB
========================================================= */

export function greeting(){
  const h = new Date().getHours();
  if(h<5) return "Still up?";
  if(h<12) return "Good morning";
  if(h<17) return "Good afternoon";
  if(h<21) return "Good evening";
  return "Winding down?";
}

/* Contextual, in-session reminders only -- fires while the app is open, since
   mobile browsers don't allow true background notifications for PWAs without
   a push server. Dedup'd via stored dates so each fires at most once per
   day (workout/hydration) or once per 7 days (weekly report). */

export function maybeShowReminders(){
  if(typeof Notification==='undefined' || Notification.permission!=='granted') return;
  const today = todayStr();
  const now = new Date();
  let changed = false;

  if(state.settings.workoutReminders && state.settings.lastWorkoutReminderDate!==today){
    const hasWorkoutToday = state.workoutLog.some(s=>s.date===today);
    if(!hasWorkoutToday && now.getHours()>=18){
      new Notification("Ignyt", { body:"No workout logged yet today — still time to get one in.", icon:"assets/icons/icon-192.png" });
      state.settings.lastWorkoutReminderDate = today;
      changed = true;
    }
  }
  if(state.settings.hydrationReminders && state.settings.lastHydrationReminderDate!==today){
    const waterMl = todayWater();
    const target = state.settings.waterTargetMl || 2500;
    if(now.getHours()>=15 && waterMl < target*0.5){
      new Notification("Ignyt", { body:"You're at "+waterMl+"ml of your "+target+"ml water target today.", icon:"assets/icons/icon-192.png" });
      state.settings.lastHydrationReminderDate = today;
      changed = true;
    }
  }
  if(state.settings.weeklyReports){
    const last = state.settings.lastWeeklyReportAt || 0;
    if(Date.now() - last >= 7*86400000){
      const w = thisWeekStats();
      new Notification("Ignyt Weekly Report", { body: w.workoutsCompleted+" workouts · "+displayW(w.weeklyVolume,0).toLocaleString()+wUnit()+" volume · "+w.currentStreak+"-day streak", icon:"assets/icons/icon-192.png" });
      state.settings.lastWeeklyReportAt = Date.now();
      changed = true;
    }
  }
  if(changed) persist();
}

export function renderHomeTab(){
  maybeShowReminders();
  const week = WEEKS[state.activeWeek-1];
  const plannedDay = todaysPlannedDay();
  const planPct = overallPlanProgress();
  const streak = computeStreak();
  const targets = macroTargets();
  const eaten = Math.round(todayEaten());
  const proteinToday = Math.round(todayMacros().protein);
  const latestWeight = state.bodylog[0];
  const dateStr = new Date().toLocaleDateString('default',{weekday:'long', month:'long', day:'numeric'});

  let dayDone = 0, dayTotal = 0;
  if(plannedDay){
    dayTotal = plannedDay.exercises.length;
    dayDone = plannedDay.exercises.filter(ex=> state.completed[`${week.week}|${plannedDay.day}|${ex.name}`]).length;
  }

  return `
    <div style="margin-bottom:4px;">
      <div style="font-size:13px;color:var(--muted);font-weight:600;">${greeting()}${state.profile.name?', '+state.profile.name:''}</div>
      <div style="font-size:18px;font-weight:800;">${dateStr}</div>
    </div>
    ${state.lastUnlockedAchievements && state.lastUnlockedAchievements.length ? renderAchievementCelebration() : ""}
    ${state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ""}

    <div class="info-box" style="padding:16px;margin-top:12px;">
      <div class="row-between" style="margin-bottom:8px;">
        <span class="eyebrow-label" style="margin:0;">Week ${week.week} of 8 — ${LEVELS[state.activeLevel].label}</span>
        <span class="mono" style="font-size:12px;color:var(--accent);font-weight:800;">${planPct}%</span>
      </div>
      <div class="progress-track" style="height:8px;margin-bottom:12px;"><div class="progress-fill" style="width:${planPct}%;"></div></div>
      ${plannedDay ? `
        <div class="row-between">
          <div>
            <div style="font-weight:800;font-size:16px;">${plannedDay.session}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">${plannedDay.exercises.length} exercises${dayDone>0?` · ${dayDone}/${dayTotal} done`:''}</div>
          </div>
          <span class="phase-pill">${week.phaseLabel.split(' — ')[0]}</span>
        </div>
        <button class="btn btn-accent btn-block" data-home-day="${week.days.indexOf(plannedDay)}" style="margin-top:12px;">${dayDone>0 && dayDone<dayTotal ? 'Continue Workout' : dayDone===dayTotal ? 'View Completed Day' : "Start Today's Workout"}</button>
      ` : `
        <div style="font-weight:800;font-size:16px;">Rest Day</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">No session scheduled — recovery, mobility, or an easy walk.</div>
      `}
    </div>

    <div class="grid2" style="margin-top:12px;">
      <div class="stat-card"><div class="stat-label">Streak</div><div class="stat-value" style="color:var(--accent);">🔥 ${streak}<span class="stat-unit">days</span></div></div>
      <div class="stat-card"><div class="stat-label">Weight</div><div class="stat-value" style="color:var(--steel);">${displayW(latestWeight?latestWeight.weight:state.profile.weight)}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Calories Today</div><div class="stat-value" style="color:var(--text);">${eaten}<span class="stat-unit">/ ${targets.kcal}</span></div></div>
      <div class="stat-card"><div class="stat-label">Protein Today</div><div class="stat-value" style="color:var(--text);">${proteinToday}<span class="stat-unit">/ ${Math.round(targets.protein)}g</span></div></div>
      ${state.prs.length ? `<div class="stat-card" style="grid-column:1/-1;"><div class="stat-label">Latest PR</div><div class="stat-value" style="color:var(--accent);font-size:16px;">🏆 ${state.prs[0].exerciseName||'Session Volume'} — ${prValueLabel(state.prs[0])}<span class="stat-unit" style="display:block;margin-top:2px;">${prTypeLabel(state.prs[0])}</span></div></div>` : ''}
    </div>

    <div class="eyebrow-label">This Week</div>
    <div class="day-tabs" style="margin-bottom:16px;">
      ${week.days.map((d,i)=>{
        const pct = d.exercises.length ? Math.round(d.exercises.filter(ex=>state.completed[`${week.week}|${d.day}|${ex.name}`]).length/d.exercises.length*100) : 0;
        return `<button class="day-tab ${pct===100?'active':''}" data-home-day="${i}" style="opacity:${pct===100?1:.85};">
          <div class="dtop">${d.day.toUpperCase()}</div><div class="dbot">${pct===100?'✓ Done':pct>0?pct+'%':d.session.split(' ')[0]}</div>
        </button>`;
      }).join("")}
    </div>

    <div class="eyebrow-label">Quick Actions</div>
    <div class="grid2" style="margin-bottom:8px;">
      <button class="btn btn-steel" data-nav="workout" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('workout',16)} Start Workout</button>
      <button class="btn btn-steel" data-nav="body" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('body',16)} Log Weight</button>
      <button class="btn btn-steel" data-nav="nutrition" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('nutrition',16)} Log Food</button>
      <button class="btn btn-steel" data-nav="progress" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('progress',16)} View Progress</button>
    </div>
  `;
}

export function renderPlanTab(){
  if(state.showExercisePicker && state.exercisePickerContext==="routine") return renderExercisePicker();
  if(state.viewingHyroxSchedule) return renderHyroxSchedule();
  if(state.viewingRaceMode) return renderRaceMode();
  return `
    <div class="row-between" style="margin:4px 0 8px;">
      <span class="eyebrow-label" style="margin:0;">My Routines</span>
      <button class="btn btn-ghost" data-action="toggle-routine-builder" style="padding:6px 12px;font-size:12px;">${state.routineBuilder? 'Cancel' : svg('plus',13)+' New Routine'}</button>
    </div>
    ${state.routineBuilder ? renderRoutineBuilder() : ""}
    ${state.routines.length===0 && !state.routineBuilder ? `<div class="empty-note">No routines saved yet — build one to start logging faster.</div>` :
      state.routines.map(r=>`<div class="routine-card">
        <div class="row-between">
          <span style="font-weight:800;font-size:15px;">${r.name}</span>
          <button class="del" data-del-routine="${r.id}" aria-label="Delete routine">${svg('x',14)}</button>
        </div>
        <div style="font-size:12px;color:var(--muted);margin:4px 0 12px;">${r.exercises.length} exercise${r.exercises.length!==1?'s':''}</div>
        <button class="btn btn-steel btn-block" data-start-routine="${r.id}">Start Workout</button>
      </div>`).join("")}

    <div class="eyebrow-label" style="margin-top:24px;">HYROX Training Schedule</div>
    <div class="info-box" style="padding:18px;">
      <div style="font-weight:900;font-size:17px;margin-bottom:4px;">HYROX Training Schedule</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">8-Week Structured HYROX Program</div>
      <div style="margin-bottom:14px;">
        ${Object.values(LEVELS).map(lv=>`<span class="muscle-chip">${lv.label}</span>`).join("")}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">Week ${state.activeWeek} of 8 · ${weekProgress(WEEKS[state.activeWeek-1])}% this week · ${LEVELS[state.activeLevel].label} level</div>
      <button class="btn btn-accent btn-block" data-action="open-hyrox-schedule">Open Schedule</button>
    </div>

    <div class="eyebrow-label">HYROX Race Simulation</div>
    <div class="info-box" style="padding:18px;">
      <div style="font-weight:900;font-size:17px;margin-bottom:4px;">Race Simulation</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">Live stopwatch through the full 8-run/8-station race format.</div>
      ${bestRaceTime()!=null ? `<div style="font-size:11px;color:var(--muted);margin-bottom:14px;">Personal best: <span class="mono" style="color:var(--accent);font-weight:800;">${formatDuration(bestRaceTime())}</span></div>` : ''}
      <button class="btn btn-steel btn-block" data-action="open-race-mode">Open Race Mode</button>
    </div>
  `;
}

/* =========================================================
   HYROX RACE MODE — a live stopwatch/splits tracker for the official
   8-run/8-station structure. This is a genuinely new, self-contained
   feature: unlike PR/exercise-history distance tracking (which would need
   retrofitting the whole logger with new fields), a race is just a live
   timer with manually-advanced splits, so it doesn't depend on any data
   that doesn't already exist.
========================================================= */

export function renderRaceMode(){
  if(!state.raceActive) return renderRaceStart();
  const r = state.raceActive;
  const idx = r.currentIndex;
  const seg = RACE_SEGMENTS[idx];
  const isLast = idx===RACE_SEGMENTS.length-1;
  return `
    <button class="btn btn-ghost" data-action="close-race-mode" style="padding:6px 12px;font-size:12px;margin-bottom:10px;">← Back to Plan</button>
    <div style="text-align:center;margin:8px 0 20px;">
      <div class="eyebrow-label" style="margin:0;">Total Time</div>
      <div class="mono" id="race-total-elapsed" style="font-size:44px;font-weight:900;color:var(--accent);">${formatDuration(Date.now()-r.startedAt)}</div>
    </div>
    <div class="info-box" style="padding:20px;text-align:center;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;">${seg.type==="run"?"Running":"Station"} · ${idx+1} of ${RACE_SEGMENTS.length}</div>
      <div style="font-size:24px;font-weight:900;margin:6px 0;">${seg.name}${seg.detail?` <span style="color:var(--muted);font-weight:600;font-size:16px;">(${seg.detail})</span>`:''}</div>
      <div class="mono" id="race-segment-elapsed" style="font-size:32px;font-weight:800;color:var(--steel);margin:10px 0;">${formatDuration(Date.now()-r.segmentStartedAt)}</div>
      <button class="btn btn-accent btn-block" data-action="race-next-segment" style="margin-top:8px;">${isLast?'Finish Race':'Complete — Next Segment'}</button>
    </div>
    ${r.segments.length ? `
      <div class="eyebrow-label">Splits So Far</div>
      <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
        ${r.segments.map((s,i)=>`<div class="row-between" style="padding:8px 0;${i>0?'border-top:1px solid var(--border);':''}">
          <span style="font-size:13px;">${s.name}${s.detail?` (${s.detail})`:''}</span>
          <span class="mono" style="font-size:13px;font-weight:700;">${formatDuration(s.durationMs)}</span>
        </div>`).join("")}
      </div>` : ""}
    <button class="btn btn-ghost btn-block" data-action="abort-race" style="color:#ff6b6b;">Abort Race</button>
  `;
}

export function renderRaceStart(){
  const best = bestRaceTime();
  const recentRaces = state.raceLog.slice(0,5);
  return `
    <button class="btn btn-ghost" data-action="close-race-mode" style="padding:6px 12px;font-size:12px;margin-bottom:10px;">← Back to Plan</button>
    <div style="text-align:center;margin:20px 0;">
      <div style="font-size:22px;font-weight:900;">HYROX Race Simulation</div>
      <div style="font-size:13px;color:var(--muted);margin-top:4px;">8 × 1km Run alternating with 8 stations, official order.</div>
    </div>
    ${best!=null ? `<div class="info-box" style="text-align:center;padding:16px;margin-bottom:16px;">
      <div class="stat-label">Personal Best</div>
      <div class="mono" style="font-weight:900;font-size:28px;color:var(--accent);">${formatDuration(best)}</div>
    </div>` : ''}
    <button class="btn btn-accent btn-block" data-action="start-race" style="margin-bottom:20px;">Start Race</button>

    <div class="eyebrow-label">Race Order</div>
    <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
      ${RACE_SEGMENTS.map((s,i)=>`<div class="row-between" style="padding:6px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <span style="font-size:12px;color:${s.type==='run'?'var(--steel)':'var(--text)'};">${i+1}. ${s.name}</span>
        <span style="font-size:11px;color:var(--muted);">${s.detail||''}</span>
      </div>`).join("")}
    </div>

    ${recentRaces.length ? `
      <div class="eyebrow-label">Race History</div>
      <div class="info-box" style="padding:4px 14px;">
        ${recentRaces.map(race=>`<div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:13px;font-weight:700;">${new Date(race.date).toLocaleDateString('default',{month:'short',day:'numeric',year:'numeric'})}</div>
            ${race.totalMs===best?`<div style="font-size:10px;color:var(--mint);font-weight:700;">PERSONAL BEST</div>`:''}
          </div>
          <span class="mono" style="font-size:14px;font-weight:800;color:var(--accent);">${formatDuration(race.totalMs)}</span>
        </div>`).join("")}
      </div>
    ` : `<div class="empty-note">No races completed yet.</div>`}
  `;
}

export function renderHyroxSchedule(){
  const week = WEEKS[state.activeWeek-1];
  const day = week.days[state.activeDayIdx];
  return `
    <button class="btn btn-ghost" data-action="close-hyrox-schedule" style="padding:6px 12px;font-size:12px;margin-bottom:8px;">← Back to Plan</button>
    <div class="row-between" style="margin-bottom:8px;">
      <span class="eyebrow-label" style="margin:0;">Race Prep — Phase 1</span>
      <span class="phase-pill">${week.phaseLabel}</span>
    </div>
    <div class="level-rail" style="display:flex;gap:6px;margin-bottom:12px;">
      ${Object.entries(LEVELS).map(([key,lv])=>`
        <button class="level-chip ${state.activeLevel===key?'active':''}" data-level="${key}"
          style="flex:1;padding:9px 6px;border-radius:10px;border:1.5px solid ${state.activeLevel===key?'var(--accent)':'var(--border)'};background:${state.activeLevel===key?'rgba(255,90,31,.12)':'var(--surface)'};color:${state.activeLevel===key?'var(--accent)':'var(--muted)'};font-weight:800;font-size:12px;cursor:pointer;">
          ${lv.label}
        </button>`).join("")}
    </div>
    <div class="info-box" style="font-size:11px;color:var(--muted);margin-bottom:12px;padding:8px 12px;">${LEVELS[state.activeLevel].note}</div>
    <div class="week-rail">
      ${WEEKS.map(w=>{
        const pct = weekProgress(w);
        const active = w.week===state.activeWeek;
        return `<button class="week-chip ${active?'active':''}" data-week="${w.week}">
          ${w.week}<span class="week-bar"><span class="week-bar-fill" style="width:${pct}%; ${pct===100?'background:var(--mint);':''}"></span></span>
        </button>`;
      }).join("")}
    </div>
    <div class="day-tabs">
      ${week.days.map((d,i)=>`<button class="day-tab ${i===state.activeDayIdx?'active':''}" data-day="${i}">
        <div class="dtop">${d.day.toUpperCase()}</div><div class="dbot">${d.session}</div></button>`).join("")}
    </div>
    <div>
      ${day.exercises.map(ex=>{
        const key = `${week.week}|${day.day}|${ex.name}`;
        const done = !!state.completed[key];
        return `<div class="ex-card">
          <div class="ex-stripe ${done?'done':'pending'}"></div>
          <div class="ex-body" data-toggle="${key}">
            <div class="ex-check ${done?'done':''}">${done?svg('check',13):''}</div>
            <div style="flex:1;min-width:0;">
              <div class="ex-name ${done?'done':''}">${ex.name}</div>
              <div class="ex-presc ${done?'done':''}">${ex.presc}</div>
              ${ex.note?`<div class="ex-note">${ex.note}</div>`:''}
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

/* =========================================================
   PERSONAL RECORDS — detected automatically when a workout finishes
   Supported types (data-model honest): weight, est. 1RM, reps-at-weight,
   session volume. Running/pace/distance PRs need dedicated distance/time
   fields the logger doesn't currently capture, so they're not faked here.
========================================================= */

export function exercisePickerRow(ex){
  const initial = ex.name.trim().charAt(0).toUpperCase();
  const color = avatarColorFor(ex.muscle);
  const equipSuffix = ex.cat && !["Custom"].includes(ex.cat) ? ` (${ex.cat})` : "";
  return `<div class="ex-picker-row" data-pick-exercise="${ex.name}">
    <div class="ex-picker-avatar" style="background:${color}22;color:${color};">${initial}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ex.name}${equipSuffix}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:1px;">${ex.muscle}</div>
    </div>
    <button class="ex-picker-info" data-view-exercise-from-picker="${ex.name}" title="View exercise guide" aria-label="View exercise guide">${svg('progress',16)}</button>
  </div>`;
}

export function renderExercisePicker(){
  if(state.exercisePickerShowCreate){
    return `
      <div class="row-between" style="margin-bottom:14px;">
        <button class="ex-picker-textbtn" data-action="close-exercise-picker">Cancel</button>
        <span style="font-weight:800;font-size:16px;">New Exercise</span>
        <button class="ex-picker-textbtn" data-action="save-custom-from-picker" style="color:var(--accent);">Create</button>
      </div>
      ${customExerciseForm(true)}
    `;
  }

  const search = state.exercisePickerSearch.trim().toLowerCase();
  const equip = state.exercisePickerEquipment;
  const muscleFilter = state.exercisePickerMuscle;
  let items = allLibraryExercises();
  if(equip!=="All") items = items.filter(i=>i.cat===equip);
  if(muscleFilter!=="All") items = items.filter(i=>i.muscle===muscleFilter);
  if(search) items = items.filter(i=>i.name.toLowerCase().includes(search));

  const isFiltering = !!search || equip!=="All" || muscleFilter!=="All";
  const recentNames = isFiltering ? [] : recentExerciseNames(8);
  const recentItems = recentNames.map(n=> items.find(i=>i.name===n)).filter(Boolean);

  const equipOptions = ["All", ...Object.keys(LIBRARY)];
  const muscleOptions = ["All", ...BODY_MUSCLES, "Cardio", "Mobility"];

  return `
    <div class="row-between" style="margin-bottom:14px;">
      <button class="ex-picker-textbtn" data-action="close-exercise-picker">Cancel</button>
      <span style="font-weight:800;font-size:16px;">${state.exercisePickerContext==="routine"?"Add to Routine":state.exercisePickerContext==="replace"?"Replace Exercise":"Add Exercise"}</span>
      <button class="ex-picker-textbtn" data-action="show-create-in-picker" style="color:var(--accent);">Create</button>
    </div>

    <div class="search-bar" style="margin-bottom:10px;">
      <input type="text" id="ex-picker-search" placeholder="Search exercise" value="${state.exercisePickerSearch}">
    </div>

    <div class="grid2" style="margin-bottom:${state.exercisePickerContext==='routine'?'10px':'14px'};">
      <select class="select-input" id="ex-picker-equip" style="margin:0;">
        ${equipOptions.map(o=>`<option value="${o}" ${equip===o?'selected':''}>${o==="All"?"All Equipment":o}</option>`).join("")}
      </select>
      <select class="select-input" id="ex-picker-muscle" style="margin:0;">
        ${muscleOptions.map(o=>`<option value="${o}" ${muscleFilter===o?'selected':''}>${o==="All"?"All Muscles":o}</option>`).join("")}
      </select>
    </div>
    ${state.exercisePickerContext==="routine" ? `
      <div class="row-between" style="margin-bottom:14px;background:var(--surface-alt);border-radius:8px;padding:8px 12px;">
        <span style="font-size:12px;color:var(--muted);">Sets for the exercise you pick</span>
        <input type="number" id="ex-picker-routine-sets" value="${state.routineBuilderSets}" min="1" style="width:44px;background:var(--surface);border-radius:6px;padding:6px;text-align:center;color:var(--accent);font-family:'SF Mono',monospace;font-weight:700;border:none;">
      </div>
    ` : ""}

    ${!isFiltering && recentItems.length ? `
      <div class="eyebrow-label" style="margin-top:4px;">Recent Exercises</div>
      ${recentItems.map(exercisePickerRow).join("")}
      <div class="eyebrow-label">All Exercises</div>
    ` : ""}

    ${items.length===0 ? `<div class="empty-note">No exercises match.</div>` : items.map(exercisePickerRow).join("")}
  `;
}

/* =========================================================
   WORKOUT TAB — freestyle logger, set-table style
========================================================= */

export function renderRoutineBuilder(){
  const b = state.routineBuilder;
  return `<div class="info-box" style="padding:14px;margin-bottom:12px;">
    <input type="text" id="routine-name" placeholder="Routine name (e.g. Leg Day 2)" value="${b.name}"
      style="width:100%;background:var(--surface-alt);border-radius:8px;padding:10px;font-size:14px;color:var(--text);margin-bottom:10px;">

    ${b.exercises.length? b.exercises.map((e,i)=>`<div class="history-row" style="margin-bottom:4px;">
      <span style="font-size:13px;font-weight:600;">${e.name}</span>
      <span class="mono" style="font-size:12px;color:var(--steel);">${e.sets} sets</span>
      <button class="del" data-remove-builder-ex="${i}" aria-label="Remove exercise">${svg('x',12)}</button>
    </div>`).join("") : ""}

    <div style="display:flex;gap:6px;align-items:center;margin-top:${b.exercises.length?'10px':'0'};">
      <button class="btn btn-ghost" style="flex:1;text-align:left;display:flex;align-items:center;gap:8px;" data-action="open-exercise-picker-for-routine">${svg('plus',14)} Choose Exercise…</button>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
        <span style="font-size:11px;color:var(--muted);">sets</span>
        <input type="number" id="routine-ex-sets" value="${state.routineBuilderSets}" min="1" style="width:44px;background:var(--surface-alt);border-radius:8px;padding:9px 4px;text-align:center;color:var(--accent);font-family:'SF Mono',monospace;font-weight:700;border:none;">
      </div>
    </div>
    <button class="btn btn-accent btn-block" data-action="save-routine" style="margin-top:10px;">Save Routine</button>
  </div>`;
}

export function renderSessionDetail(s){
  const muscles = sessionMuscles(s.exercises);
  const workingSets = s.exercises.reduce((a,e)=>a+e.sets.filter(set=>set.weight||set.reps).length, 0);
  const prs = state.prs.filter(p=>p.workoutId===s.id);
  const startTime = s.startedAt ? new Date(s.startedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : null;
  const endTime = s.finishedAt ? new Date(s.finishedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : null;
  return `
    <div class="row-between" style="margin-bottom:4px;">
      <button class="btn btn-ghost" data-action="close-session-detail" style="padding:6px 12px;font-size:12px;">← Back</button>
    </div>
    <div style="margin:12px 0 4px;">
      <div style="font-size:18px;font-weight:900;">${sessionTitle(s)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:1px;">${s.exercises.length} exercise${s.exercises.length!==1?'s':''}</div>
      <div class="mono" style="font-size:12px;color:var(--muted);margin-top:2px;">${new Date(s.date).toLocaleDateString('default',{weekday:'long',month:'long',day:'numeric'})}${startTime&&endTime?` · ${startTime}–${endTime}`:''}</div>
    </div>
    ${muscles.length? `<div style="margin:8px 0 4px;">${muscles.map(m=>`<span class="muscle-chip active">${m}</span>`).join("")}</div>`:""}
    ${s.notes? `<div class="info-box" style="padding:10px 14px;margin:8px 0;font-size:12px;font-style:italic;color:var(--text);">"${s.notes}"</div>`:""}

    <div class="grid2" style="margin-top:12px;margin-bottom:8px;">
      <div class="stat-card"><div class="stat-label">Duration</div><div class="stat-value">${s.durationMin||'–'}<span class="stat-unit">min</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Volume</div><div class="stat-value">${displayW(s.volume||0,0).toLocaleString()}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Working Sets</div><div class="stat-value">${workingSets}</div></div>
      <div class="stat-card"><div class="stat-label">Personal Records</div><div class="stat-value" style="color:${prs.length?'var(--accent)':'var(--text)'};">${prs.length?'🏆 ':''}${prs.length}</div></div>
    </div>

    ${prs.length? `<div class="info-box" style="padding:10px 14px;margin-bottom:14px;">
      ${prs.map(pr=>`<div style="font-size:12px;padding:4px 0;"><b>${pr.exerciseName||'Session'}</b> — ${prTypeLabel(pr)}: <span style="color:var(--accent);font-weight:700;">${prValueLabel(pr)}</span></div>`).join("")}
    </div>` : ""}

    <div class="eyebrow-label">Exercises</div>
    ${s.exercises.map(ex=>`<div class="ex-log-card">
      <div style="font-weight:800;color:var(--steel);font-size:15px;">${ex.name}</div>
      <span class="muscle-chip">${getMuscle(ex.name)}</span>
      ${ex.notes?`<div style="font-size:12px;color:var(--muted);margin-top:6px;font-style:italic;">"${ex.notes}"</div>`:""}
      <div style="margin-top:8px;">
        ${ex.sets.map((set,i)=>`<div class="row-between" style="padding:5px 0;border-top:1px solid var(--border);">
          <span class="mono" style="font-size:12px;color:var(--muted);">Set ${i+1}</span>
          <span class="mono" style="font-size:13px;">${set.weight?displayW(set.weight):'–'}${wUnit()} × ${set.reps||'–'}${set.rpe?` <span style="color:var(--muted);">@ RPE ${set.rpe}</span>`:''}</span>
        </div>`).join("")}
      </div>
    </div>`).join("")}

    <div class="grid2" style="margin-top:16px;">
      <button class="btn btn-accent" data-action="repeat-workout" data-session-id="${s.id}" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('workout',15)} Repeat Workout</button>
      <button class="btn btn-steel" data-action="edit-workout" data-session-id="${s.id}">Edit Workout</button>
    </div>
    <button class="btn btn-ghost btn-block" data-action="save-session-as-routine" data-session-id="${s.id}" style="margin-top:8px;">Save as Routine</button>
    <button class="btn btn-ghost btn-block" data-action="delete-session-confirmed" data-session-id="${s.id}" style="margin-top:8px;color:#ff6b6b;">Delete Workout</button>
  `;
}

export function renderPRCelebration(){
  const prs = state.lastSessionPRs;
  return `<div class="info-box" style="padding:16px;margin-bottom:14px;background:rgba(255,90,31,.1);border:1px solid rgba(255,90,31,.35);">
    <div class="row-between" style="margin-bottom:10px;">
      <span style="font-weight:900;font-size:15px;color:var(--accent);">🏆 New Personal Record${prs.length>1?'s':''}!</span>
      <button class="del" data-action="dismiss-prs" aria-label="Dismiss">${svg('x',15)}</button>
    </div>
    ${prs.map(pr=>`<div class="row-between" style="padding:6px 0;border-top:1px solid rgba(255,90,31,.15);">
      <span style="font-size:13px;font-weight:700;">${pr.exerciseName||'Session Volume'} <span style="color:var(--muted);font-weight:400;">— ${prTypeLabel(pr)}</span></span>
      <span class="mono" style="font-size:13px;color:var(--accent);font-weight:800;">${prValueLabel(pr)}${pr.improvementPct!=null?` <span style="color:var(--mint);font-size:11px;">+${pr.improvementPct}%</span>`:''}</span>
    </div>`).join("")}
  </div>`;
}

export function renderAchievementCelebration(){
  const list = state.lastUnlockedAchievements;
  return `<div class="info-box" style="padding:16px;margin-bottom:14px;background:rgba(62,207,142,.1);border:1px solid rgba(62,207,142,.35);">
    <div class="row-between" style="margin-bottom:10px;">
      <span style="font-weight:900;font-size:15px;color:var(--mint);">🎖️ Achievement Unlocked${list.length>1?'s':''}!</span>
      <button class="del" data-action="dismiss-achievements" aria-label="Dismiss">${svg('x',15)}</button>
    </div>
    ${list.map(a=>`<div style="padding:6px 0;border-top:1px solid rgba(62,207,142,.15);">
      <div style="font-size:13px;font-weight:700;">${a.name}</div>
      <div style="font-size:11px;color:var(--muted);">${a.desc}</div>
    </div>`).join("")}
  </div>`;
}

export function renderWorkoutTab(){
  if(state.session && state.showExercisePicker) return renderExercisePicker();
  if(!state.session){
    if(state.viewingSessionId){
      const s = state.workoutLog.find(x=>x.id===state.viewingSessionId);
      if(s) return renderSessionDetail(s);
      state.viewingSessionId = null; // stale id (e.g. deleted) — fall through to list
    }
    const showAll = state.showAllSessions;
    const recent = showAll ? state.workoutLog : state.workoutLog.slice(0,5);
    return `
      ${state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ""}
      <button class="btn btn-accent btn-block" data-action="start-session" style="margin-top:4px;">${svg('plus',16)} Start Empty Workout</button>
      <div style="font-size:11px;color:var(--muted);margin:8px 0 0;text-align:center;">Looking for your routines? They've moved to the <b style="color:var(--text);">Plan</b> tab.</div>

      <div class="row-between" style="margin-top:20px;">
        <span class="eyebrow-label" style="margin:0;">Recent Sessions</span>
        ${state.workoutLog.length>5 ? `<button class="btn btn-ghost" data-action="toggle-show-all-sessions" style="padding:4px 10px;font-size:11px;">${showAll?'Show Less':'Show All ('+state.workoutLog.length+')'}</button>` : ""}
      </div>
      ${recent.length===0?`<div class="empty-note">No sessions logged yet.</div>`:
        recent.map(s=>{
          const muscles = sessionMuscles(s.exercises);
          const prCount = state.prs.filter(p=>p.workoutId===s.id).length;
          return `<div class="history-row" style="align-items:flex-start;cursor:pointer;" data-view-session="${s.id}">
          <div>
            <div style="font-weight:800;font-size:14px;">${sessionTitle(s)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:1px;">${s.exercises.length} exercise${s.exercises.length!==1?'s':''}${s.durationMin?` · ${s.durationMin} min`:''}${prCount?` · 🏆 ${prCount} PR${prCount>1?'s':''}`:''}</div>
            <div class="mono" style="font-size:11px;color:var(--muted);margin-top:2px;">${s.date}${s.volume?` · ${displayW(s.volume,0)}${wUnit()} vol`:''}</div>
            <div style="margin-top:5px;">${muscles.map(m=>`<span class="muscle-chip">${m}</span>`).join("")}</div>
          </div>
          <button class="del" data-del-session="${s.id}" aria-label="Delete workout">${svg('x',14)}</button>
        </div>`;}).join("")}
    `;
  }
  const s = state.session;
  const muscles = sessionMuscles(s.exercises);
  const isEditing = !!state.editingSessionId;
  const liveVolume = Math.round(computeSessionVolume(s.exercises));
  return `
    <div class="row-between" style="margin-bottom:4px;">
      <div style="flex:1;min-width:0;">
        <div class="eyebrow-label" style="margin:0 0 2px;">${isEditing ? 'Editing Workout' : 'In Progress'}</div>
        <div class="mono" style="font-size:12px;color:var(--muted);">
          ${isEditing ? s.date : `Started ${new Date(s.startedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · <span id="session-elapsed">${formatDuration(Date.now()-s.startedAt)}</span>`}
          ${liveVolume>0?` · ${displayW(liveVolume,0).toLocaleString()}${wUnit()} vol`:''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        ${isEditing?`<button class="btn btn-ghost" style="padding:10px 14px;" data-action="cancel-edit-session">Cancel</button>`:''}
        <button class="btn btn-accent" style="padding:10px 18px;" data-action="finish-session">${isEditing?'Save':'Finish'}</button>
      </div>
    </div>
    <input type="text" id="session-title" placeholder="Workout title (e.g. Push Day)" value="${(s.title||'').replace(/"/g,'&quot;')}"
      style="width:100%;background:none;border:none;border-bottom:2px solid var(--border);padding:8px 2px;font-size:20px;font-weight:900;color:var(--text);margin:10px 0 8px;font-family:inherit;">
    ${muscles.length? `<div style="margin:2px 0 4px;">${muscles.map(m=>`<span class="muscle-chip active">${m}</span>`).join("")}</div>`:""}
    <textarea id="session-notes" placeholder="Workout notes (how it felt, conditions, anything worth remembering)…"
      style="width:100%;background:var(--surface-alt);border-radius:8px;padding:9px 10px;font-size:12px;color:var(--text);margin:6px 0 14px;resize:vertical;min-height:36px;border:none;font-family:inherit;">${s.notes||''}</textarea>

    <div class="eyebrow-label">Add Exercise</div>
    <button class="btn btn-ghost btn-block" data-action="open-exercise-picker" style="margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:8px;">${svg('plus',16)} Add Exercise</button>

    ${s.exercises.length===0?`<div class="empty-note">No exercises added yet.</div>`:
      s.exercises.map((ex,exi)=>{
        const muscle = getMuscle(ex.name);
        const restLabel = ex.restDuration ? `${ex.restDuration}s` : "OFF";
        const showRPE = state.settings.rpeTracking;
        const isBarbell = (LIBRARY["Barbell"]||[]).some(i=>i[0]===ex.name);
        const showPlates = state.settings.plateCalc && isBarbell;
        const gridCols = showRPE ? "30px 1fr 52px 52px 44px 32px" : "30px 1fr 62px 62px 32px";
        const menuOpen = state.exerciseMenuOpen===exi;
        return `
        <div class="ex-log-card">
          ${ex.supersetWithNext ? `<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px;color:var(--accent);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">${svg('link',12)} Superset with next exercise</div>` : ''}
          <div class="row-between" style="margin-bottom:4px;position:relative;">
            <div>
              <div style="font-weight:800;color:var(--steel);font-size:15px;">${ex.name}</div>
              <span class="muscle-chip">${muscle}</span>
            </div>
            <button class="del" data-toggle-ex-menu="${exi}" aria-label="Exercise options">${svg('moreVert',17)}</button>
            ${menuOpen ? `
              <div class="ex-menu-backdrop" data-close-ex-menu></div>
              <div class="ex-menu">
                <button class="ex-menu-item" data-move-exercise-up="${exi}" ${exi===0?'disabled':''}>${svg('chevronUp',15)} Move Up</button>
                <button class="ex-menu-item" data-move-exercise-down="${exi}" ${exi===s.exercises.length-1?'disabled':''}>${svg('chevronDown',15)} Move Down</button>
                <button class="ex-menu-item" data-replace-exercise="${exi}">${svg('swap',15)} Replace Exercise</button>
                ${exi<s.exercises.length-1 ? `<button class="ex-menu-item" data-toggle-superset="${exi}">${svg('link',15)} ${ex.supersetWithNext?'Remove Superset':'Add to Superset'}</button>` : ''}
                <button class="ex-menu-item" data-view-history="${encodeURIComponent(ex.name)}">${svg('progress',15)} View History</button>
                <button class="ex-menu-item" data-view-instructions="${encodeURIComponent(ex.name)}">${svg('book',15)} View Instructions</button>
                <button class="ex-menu-item" data-del-exercise="${exi}" style="color:#ff6b6b;">${svg('x',15)} Remove Exercise</button>
              </div>
            ` : ''}
          </div>
          <input type="text" class="notes-inline" placeholder="Add notes here…" value="${ex.notes||''}" data-notes-exercise="${exi}">
          <div class="row-between">
            <button class="rest-toggle" data-rest-toggle="${exi}">${svg('workout',13)} Rest Timer: ${restLabel}</button>
            ${showPlates?`<button class="rest-toggle" data-plate-calc="${exi}" style="color:var(--accent);">Plates</button>`:""}
          </div>
          ${state.plateCalcOpen===String(exi) ? renderPlatePopover(exi) : ""}

          <div class="set-table-header" style="grid-template-columns:${gridCols};">
            <span>SET</span><span>PREVIOUS</span><span>${wUnit().toUpperCase()}</span><span>REPS</span>${showRPE?"<span>RPE</span>":""}<span></span>
          </div>
          ${ex.sets.map((set,si)=>{
            const prev = getPreviousSet(ex.name, si);
            const prevLabel = prev ? `${prev.weight?displayW(prev.weight):'–'}${wUnit()} × ${prev.reps||'–'}` : "–";
            const typeMeta = SET_TYPE_META[set.type||"working"];
            const isEmpty = !set.weight && !set.reps;
            const canDelete = ex.sets.length>1;
            return `<div class="set-row ${set.done?'done':''}" style="grid-template-columns:${gridCols};">
              <button class="mono set-num" data-cycle-set-type="${exi}|${si}" style="color:${typeMeta.color};background:none;border:none;cursor:pointer;font-weight:800;" title="Tap to mark warm-up / drop / failure set">${typeMeta.badge}${si+1}</button>
              <span class="mono set-prev">${prevLabel}</span>
              <input type="number" class="mono set-input" value="${displayW(set.weight)}" data-set-field="${exi}|${si}|weight" placeholder="–">
              <input type="text" class="mono set-input" value="${set.reps}" data-set-field="${exi}|${si}|reps" placeholder="–">
              ${showRPE?`<button class="rpe-btn" data-rpe="${exi}|${si}">${set.rpe||'RPE'}</button>`:""}
              ${isEmpty && canDelete
                ? `<button class="set-check" data-del-set="${exi}|${si}" title="Delete unused set" style="color:#ff6b6b;">${svg('x',13)}</button>`
                : `<button class="set-check ${set.done?'done':''}" data-set-done="${exi}|${si}" aria-label="${set.done?'Mark set incomplete':'Mark set complete'}">${set.done?svg('check',13):''}</button>`}
            </div>`;
          }).join("")}
          <button class="add-set-btn" data-add-set="${exi}">${svg('plus',14)} Add Set</button>
        </div>
      `;}).join("")}
  `;
}

/* Safe display title for any workout, old or new. Old workoutLog entries
   (logged before this feature) simply have no `title` field -- falls back
   to "Workout" rather than showing blank or undefined. */

export function renderPlatePopover(exi){
  const target = Number(state.plateTarget||0);
  const bar = Number(state.plateBar||20);
  const res = calcPlates(target, bar);
  return `<div class="info-box" style="padding:12px;margin-bottom:10px;">
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <div style="flex:1;"><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Target (kg)</label>
        <input type="number" id="plate-target" value="${target||''}" placeholder="100" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-family:'SF Mono',monospace;font-weight:700;color:var(--accent);"></div>
      <div style="width:90px;"><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Bar (kg)</label>
        <select class="select-input" id="plate-bar" style="margin:4px 0 0;padding:8px;">
          ${[20,15,10,7.5].map(b=>`<option value="${b}" ${bar===b?'selected':''}>${b}</option>`).join("")}
        </select></div>
    </div>
    <button class="btn btn-steel btn-block" data-action="run-plate-calc">Calculate Plates</button>
    ${target>0 ? (res.perSide.length ?
      `<div style="margin-top:10px;text-align:center;">
        <div class="stat-label">Per Side</div>
        <div class="mono" style="font-weight:900;font-size:16px;color:var(--text);margin-top:4px;">${res.perSide.map(p=>`${p.count}×${p.plate}kg`).join("  +  ")}</div>
        ${res.remainder>0.01?`<div style="font-size:11px;color:var(--accent);margin-top:4px;">${res.remainder.toFixed(2)}kg/side can't be made with standard plates</div>`:""}
      </div>`
      : `<div style="font-size:12px;color:var(--muted);margin-top:8px;text-align:center;">Target must be heavier than the bar.</div>`) : ""}
  </div>`;
}

/* =========================================================
   TIMER OVERLAY
========================================================= */

export function renderTimerOverlay(){
  if(!state.timer) return "";
  return `<div class="timer-overlay">
    <div class="timer-label">Rest</div>
    <div class="timer-ring mono">${formatTime(state.timer.remaining)}</div>
    <button class="btn btn-ghost" data-action="cancel-timer">Skip Rest</button>
  </div>`;
}

export function renderExerciseAnimation(detail){
  if(!detail || !detail.animationAvailable || (!detail.animationWebmUrl && !detail.animationMp4Url)){
    return `<div class="ex-anim-fallback">
      ${detail && detail.thumbnailUrl ? `<img src="${detail.thumbnailUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : svg('workout',28)}
      <div style="font-size:12px;color:var(--muted);margin-top:8px;">No demonstration video yet</div>
    </div>`;
  }
  // Lazy: only the <video> tag with preload="none" is emitted; nothing downloads until
  // the browser actually needs it (and only once this detail screen is on-DOM at all).
  return `<div class="ex-anim-wrap">
    <video id="ex-anim-video" class="ex-anim-video" loop muted playsinline preload="none"
      ${detail.thumbnailUrl?`poster="${detail.thumbnailUrl}"`:''}>
      ${detail.animationWebmUrl?`<source src="${detail.animationWebmUrl}" type="video/webm">`:''}
      ${detail.animationMp4Url?`<source src="${detail.animationMp4Url}" type="video/mp4">`:''}
    </video>
  </div>`;
}

/* Every session that contains this exercise, newest first, with that session's
   PR status for this exercise (if any) attached for a quick indicator. */

export function renderExerciseDetail(name){
  const detail = EXERCISE_DETAILS[name];
  const all = allLibraryExercises();
  const libEntry = all.find(e=>e.name===name);
  const muscle = detail ? detail.primaryMuscle : (libEntry ? libEntry.muscle : getMuscle(name));
  const tab = state.exerciseDetailTab || "summary";
  const history = exerciseHistoryEntries(name);
  const prs = exercisePRs(name);

  return `
    <div class="row-between" style="margin-bottom:4px;">
      <button class="btn btn-ghost" data-action="close-exercise-detail" style="padding:6px 12px;font-size:12px;">← Back</button>
    </div>
    <div style="font-size:20px;font-weight:900;margin:10px 0 6px;">${name}</div>
    <span class="muscle-chip active">${muscle}</span>

    <div style="display:flex;gap:6px;margin:14px 0;">
      ${[["summary","Summary"],["history","History"],["howto","How To"]].map(([key,label])=>`
        <button class="cat-chip ${tab===key?'active':''}" data-ex-detail-tab="${key}" style="flex:1;text-align:center;">${label}</button>
      `).join("")}
    </div>

    ${tab==="summary" ? renderExerciseDetailSummary(name, detail, libEntry, prs) : ""}
    ${tab==="history" ? renderExerciseDetailHistory(history) : ""}
    ${tab==="howto" ? renderExerciseDetailHowTo(name, detail, libEntry) : ""}

    <button class="btn btn-accent btn-block" data-action="add-detail-to-workout" data-exercise-name="${name}" style="margin-top:16px;">${svg('plus',16)} Add to Workout</button>
  `;
}

export function renderExerciseDetailSummary(name, detail, libEntry, prs){
  const trend = exerciseProgressTrend(name, 20);
  const hasHistory = trend.length>=2;
  return `
    ${detail ? `<div class="grid2" style="margin-top:2px;margin-bottom:8px;">
      <div class="stat-card"><div class="stat-label">Equipment</div><div class="stat-value" style="font-size:15px;">${detail.equipment}</div></div>
      <div class="stat-card"><div class="stat-label">Difficulty</div><div class="stat-value" style="font-size:15px;">${detail.difficulty}</div></div>
      <div class="stat-card"><div class="stat-label">Movement Pattern</div><div class="stat-value" style="font-size:15px;">${detail.movementPattern}</div></div>
      <div class="stat-card"><div class="stat-label">Secondary Muscles</div><div class="stat-value" style="font-size:12px;line-height:1.4;">${detail.secondaryMuscles.join(", ")||'–'}</div></div>
    </div>` : ""}

    <div class="eyebrow-label" style="margin-top:14px;">Performance</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${!hasHistory ? `<div class="empty-note">Log this exercise across a couple of workouts to see a trend here.</div>` : `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Top Set Weight</div>
        ${sparklineChart(trend.map(t=>({date:t.date, value:displayW(t.weight)})), {color:"var(--accent)", unit:wUnit()})}
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Estimated 1RM</div>
        ${sparklineChart(trend.map(t=>({date:t.date, value:displayW(t.oneRM)})), {color:"var(--mint)", unit:wUnit()})}
      `}
    </div>

    <div class="eyebrow-label">Personal Records</div>
    ${prs.length===0 ? `<div class="empty-note" style="margin-bottom:16px;">No PRs logged for this exercise yet.</div>` : `
      <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
        ${prs.map(pr=>`<div class="row-between" style="padding:9px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:13px;font-weight:700;">${prTypeLabel(pr)}</span>
          <span style="display:flex;align-items:center;gap:8px;">
            <span class="mono" style="font-size:11px;color:var(--muted);">${new Date(pr.achievedAt).toLocaleDateString('default',{month:'short',day:'numeric',year:'numeric'})}</span>
            <span class="mono" style="font-size:13px;color:var(--accent);font-weight:800;">${prValueLabel(pr)}</span>
          </span>
        </div>`).join("")}
      </div>
    `}
    <div class="info-box" style="font-size:11px;color:var(--muted);margin-bottom:16px;">
      Cardio and HYROX-specific records (pace, distance, station/split times) aren't tracked yet — the logger only captures weight and reps, no distance or duration fields.
    </div>
  `;
}

export function renderExerciseDetailHistory(history){
  if(history.length===0) return `<div class="empty-note" style="margin:20px 0;">No history for this exercise yet — once you log it in a workout, every session will show up here.</div>`;
  return `
    ${history.map(h=>`<div class="info-box" style="padding:14px;margin-bottom:10px;">
      <div class="row-between" style="margin-bottom:6px;">
        <div>
          <div style="font-weight:800;font-size:14px;">${h.title}</div>
          <div class="mono" style="font-size:11px;color:var(--muted);">${h.date}</div>
        </div>
        ${h.prs.length ? `<span style="font-size:11px;font-weight:800;color:var(--accent);">🏆 ${h.prs.length} PR${h.prs.length>1?'s':''}</span>` : ''}
      </div>
      ${h.notes ? `<div style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:6px;">"${h.notes}"</div>` : ''}
      ${h.sets.map((s,i)=>`<div class="row-between" style="padding:4px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <span class="mono" style="font-size:11px;color:var(--muted);">Set ${i+1}</span>
        <span class="mono" style="font-size:12px;">${s.weight?displayW(s.weight):'–'}${wUnit()} × ${s.reps||'–'}${s.rpe?` <span style="color:var(--muted);">@ RPE ${s.rpe}</span>`:''}</span>
      </div>`).join("")}
    </div>`).join("")}
  `;
}

export function renderExerciseDetailHowTo(name, detail, libEntry){
  if(!detail){
    return `<div class="info-box" style="padding:14px;margin:16px 0;">
      <div style="font-size:13px;color:var(--muted);">Instructions not available for this exercise.${libEntry?` Suggested: <span style="color:var(--text);font-weight:700;">${libEntry.presc}</span>`:''}</div>
    </div>`;
  }
  return `
    ${renderExerciseAnimation(detail)}

    <div class="eyebrow-label" style="margin-top:16px;">Step-by-Step</div>
    <div class="info-box" style="padding:14px;">
      ${detail.instructions.map((s,i)=>`<div style="display:flex;gap:10px;padding:6px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <span class="mono" style="color:var(--accent);font-weight:900;font-size:13px;flex-shrink:0;">${i+1}</span>
        <span style="font-size:13px;line-height:1.5;">${s}</span>
      </div>`).join("")}
    </div>

    <div class="eyebrow-label">Form Tips</div>
    <div class="info-box" style="padding:14px;">
      ${detail.formTips.map(t=>`<div style="display:flex;gap:8px;padding:4px 0;font-size:13px;"><span style="color:var(--mint);">✓</span> ${t}</div>`).join("")}
    </div>

    <div class="eyebrow-label">Common Mistakes</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${detail.commonMistakes.map(t=>`<div style="display:flex;gap:8px;padding:4px 0;font-size:13px;"><span style="color:var(--accent);">✕</span> ${t}</div>`).join("")}
    </div>
  `;
}

export function renderLibraryTab(){
  if(state.viewingExerciseDetail) return renderExerciseDetail(state.viewingExerciseDetail);

  const cats = ["All", ...Object.keys(LIBRARY), ...(state.customExercises.length?["Custom"]:[])];
  let items = allLibraryExercises();
  if(state.libCategory!=="All") items = items.filter(i=> i.cat===state.libCategory || (state.libCategory==="Custom" && i.custom));
  if(state.libSearch) items = items.filter(i=> i.name.toLowerCase().includes(state.libSearch.toLowerCase()));

  return `
    <div class="search-bar">
      <input type="text" id="lib-search" placeholder="Search any exercise…" value="${state.libSearch}">
    </div>
    <div style="margin-bottom:8px;">
      ${cats.map(c=>`<button class="cat-chip ${state.libCategory===c?'active':''}" data-cat="${c}">${c}</button>`).join("")}
    </div>
    <button class="btn btn-accent btn-block" data-action="show-add-custom" style="margin-bottom:16px;">${svg('plus',16)} Add Custom Exercise</button>
    <div id="custom-form-slot">${state.showCustomForm ? customExerciseForm() : ""}</div>
    ${items.map(ex=>`<div class="lib-item" data-view-exercise="${ex.name}" style="cursor:pointer;">
      <div><div class="lib-item-name">${ex.name}${ex.custom?' <span style="color:var(--accent);font-size:10px;">CUSTOM</span>':''}${EXERCISE_DETAILS[ex.name]?' <span style="color:var(--mint);font-size:10px;">GUIDE</span>':''}</div>
      <div class="lib-item-cat">${ex.cat} · ${ex.presc}</div></div>
    </div>`).join("")}
    ${items.length===0?`<div class="empty-note">No exercises match.</div>`:""}
  `;
}

export function customExerciseForm(hideButton){
  return `<div class="info-box" style="margin-bottom:16px;">
    <input type="text" id="custom-name" placeholder="Exercise name" style="background:var(--surface-alt);border-radius:8px;padding:10px;width:100%;margin-bottom:8px;font-size:14px;color:var(--text);">
    <select class="select-input" id="custom-cat">
      ${Object.keys(LIBRARY).map(c=>`<option value="${c}">${c}</option>`).join("")}
    </select>
    <select class="select-input" id="custom-muscle">
      ${[...BODY_MUSCLES,"Mobility","Other"].map(m=>`<option value="${m}">${m}</option>`).join("")}
    </select>
    <input type="text" id="custom-presc" placeholder="Default prescription (e.g. 3x12)" style="background:var(--surface-alt);border-radius:8px;padding:10px;width:100%;margin-bottom:8px;font-size:14px;color:var(--text);">
    ${hideButton?'':'<button class="btn btn-accent btn-block" data-action="save-custom">Save Exercise</button>'}
  </div>`;
}

/* =========================================================
   BODY TAB
========================================================= */
/* =========================================================
   FITNESS CALCULATORS — BMR, TDEE, LBM, Ideal Weight, Body Fat, HR Zones
========================================================= */

export function calcInputRow(id, label, val, unit){
  return `<div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">${label}</label>
    <div style="display:flex;align-items:center;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;">
      <input type="number" id="${id}" value="${val}" style="flex:1;background:none;color:var(--text);font-family:'SF Mono',monospace;font-weight:700;font-size:13px;">
      ${unit?`<span style="font-size:11px;color:var(--muted);">${unit}</span>`:""}
    </div></div>`;
}

export function genderToggle(id, current){
  return `<div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Gender</label>
    <div style="display:flex;gap:6px;margin-top:4px;">
      <button class="cat-chip ${current==='male'?'active':''}" data-gender-toggle="${id}|male" style="flex:1;text-align:center;">Male</button>
      <button class="cat-chip ${current==='female'?'active':''}" data-gender-toggle="${id}|female" style="flex:1;text-align:center;">Female</button>
    </div></div>`;
}

export function renderCalculators(){
  const c = state.calc;
  // Pull shared profile values as the defaults shown in calculators
  c.age = state.profile.age; c.gender = state.profile.gender;
  c.height = state.profile.height; c.weight = state.profile.weight;
  if(c.activityMultiplier==null) c.activityMultiplier = state.profile.activityMultiplier;
  if(c.goalDelta==null) c.goalDelta = state.profile.goalDelta;
  const active = c.activeCalc;
  let fields = "", result = "";

  if(active==="bmr"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>`;
    if(c.result && c.result.type==="bmr"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Basal Metabolic Rate</div>
        <div class="mono" style="font-weight:900;font-size:28px;color:var(--accent);">${Math.round(c.result.bmr)}<span style="font-size:13px;color:var(--muted);margin-left:4px;">kcal/day</span></div>
      </div>`;
    }
  }

  if(active==="calorie"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Your Goal</label>
    <select class="select-input" id="calc-goal">
      ${GOAL_OPTIONS.map(g=>`<option value="${g.delta}" ${c.goalDelta===g.delta?'selected':''}>${g.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="calorie"){
      const goalKcal = c.result.tdee + c.result.goalDelta;
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Maintenance (TDEE)</div><div class="stat-value" style="color:var(--steel);">${Math.round(c.result.tdee)}<span class="stat-unit">kcal</span></div></div>
        <div class="stat-card"><div class="stat-label">Goal Calories</div><div class="stat-value" style="color:var(--accent);">${Math.round(goalKcal)}<span class="stat-unit">kcal</span></div></div>
      </div>
      <div class="info-box" style="text-align:center;padding:12px;margin-top:8px;">
        <button class="btn btn-steel" data-action="apply-calc-profile" style="padding:8px 16px;">Apply These Stats to Profile</button>
      </div>`;
    }
  }

  if(active==="protein"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="protein"){
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">RDA Minimum (0.8g/kg)</div><div class="stat-value" style="color:var(--steel);">${c.result.rda.toFixed(0)}<span class="stat-unit">g/day</span></div></div>
        <div class="stat-card"><div class="stat-label">% of Calories (10-35%)</div><div class="stat-value" style="color:var(--steel);">${Math.round(c.result.pctLo)}–${Math.round(c.result.pctHi)}<span class="stat-unit">g</span></div></div>
        <div class="stat-card" style="grid-column:1/-1;"><div class="stat-label">Training / Muscle Building (1.6-2.2g/kg)</div><div class="stat-value" style="color:var(--accent);">${c.result.trainLo.toFixed(0)}–${c.result.trainHi.toFixed(0)}<span class="stat-unit">g/day</span></div></div>
      </div>
      <div class="info-box" style="margin-top:10px;font-size:12px;">For your Hyrox training + fat loss goal, the training range is the one to aim for.</div>`;
    }
  }

  if(active==="carbs"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="carbs"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Daily Carbohydrates (40–65% of ${Math.round(c.result.tdee)} kcal)</div>
        <div class="mono" style="font-weight:900;font-size:26px;color:var(--accent);">${Math.round(c.result.lo)}–${Math.round(c.result.hi)}<span style="font-size:13px;color:var(--muted);margin-left:4px;">g/day</span></div>
      </div>`;
    }
  }

  if(active==="fat"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="fat"){
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Total Fat (20-35%)</div><div class="stat-value" style="color:var(--accent);">${Math.round(c.result.lo)}–${Math.round(c.result.hi)}<span class="stat-unit">g/day</span></div></div>
        <div class="stat-card"><div class="stat-label">Saturated Fat Max (<10%)</div><div class="stat-value" style="color:var(--steel);">${Math.round(c.result.satMax)}<span class="stat-unit">g/day</span></div></div>
      </div>
      <div class="info-box" style="margin-top:10px;font-size:12px;">Based on ${Math.round(c.result.tdee)} kcal/day. Keeping saturated fat under the max supports heart health.</div>`;
    }
  }

  if(active==="bodytype"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-bust","Bust",c.bust,"cm")}
      ${calcInputRow("calc-bwaist","Waist",c.bwaist,"cm")}
      ${calcInputRow("calc-highhip","High Hip",c.highHip,"cm")}
      ${calcInputRow("calc-bhip","Hip",c.bhip,"cm")}
    </div>`;
    if(c.result && c.result.type==="bodytype"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Body Shape</div>
        <div style="font-weight:900;font-size:24px;color:var(--accent);margin:4px 0;">${c.result.shape}</div>
        <div class="stat-label" style="margin-top:8px;">Waist-Hip Ratio</div>
        <div class="mono" style="font-weight:900;font-size:20px;color:var(--steel);">${c.result.whr.toFixed(2)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;">WHR is a better health indicator than shape category.</div>
      </div>`;
    }
  }

  if(active==="lbm"){
    fields = `<div class="grid2">
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>`;
    if(c.result && c.result.type==="lbm"){
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Boer Formula</div><div class="stat-value" style="color:var(--accent);">${c.result.boer.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Hume Formula</div><div class="stat-value" style="color:var(--steel);">${c.result.hume.toFixed(1)}<span class="stat-unit">kg</span></div></div>
      </div>
      <div class="info-box" style="margin-top:10px;font-size:12px;">Two different formulas, shown for comparison — both are estimates, not measurements.</div>`;
    }
  }

  if(active==="ideal"){
    fields = `<div class="grid2">
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
    </div>`;
    if(c.result && c.result.type==="ideal"){
      const r = c.result;
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Robinson</div><div class="stat-value">${r.Robinson.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Miller</div><div class="stat-value">${r.Miller.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Devine</div><div class="stat-value">${r.Devine.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Hamwi</div><div class="stat-value">${r.Hamwi.toFixed(1)}<span class="stat-unit">kg</span></div></div>
      </div>`;
    }
  }

  if(active==="bodyfat"){
    fields = `<div class="grid2">
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-neck","Neck",c.neck,"cm")}
      ${calcInputRow("calc-waist","Waist",c.waist,"cm")}
      ${c.gender==="female" ? calcInputRow("calc-hip","Hip",c.hip,"cm") : ""}
    </div>`;
    if(c.result && c.result.type==="bodyfat"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Estimated Body Fat (US Navy method)</div>
        <div class="mono" style="font-weight:900;font-size:28px;color:var(--accent);">${c.result.bf.toFixed(1)}<span style="font-size:13px;color:var(--muted);margin-left:4px;">%</span></div>
      </div>`;
    }
  }

  if(active==="hr"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${calcInputRow("calc-resting","Resting HR (optional)",c.restingHR,"bpm")}
    </div>`;
    if(c.result && c.result.type==="hr"){
      result = `<div class="info-box" style="padding:14px;margin-top:10px;">
        <div class="row-between" style="margin-bottom:10px;">
          <span class="stat-label">Max Heart Rate</span>
          <span class="mono" style="font-weight:900;color:var(--accent);">${c.result.maxHR} bpm</span>
        </div>
        ${c.result.rows.map(z=>`<div class="row-between" style="padding:6px 0;border-top:1px solid var(--border);">
          <span style="font-size:12px;color:var(--muted);">${z.label}</span>
          <span class="mono" style="font-size:13px;color:var(--steel);">${z.lo}–${z.hi} bpm</span>
        </div>`).join("")}
        ${c.result.useKarvonen ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Calculated using the Karvonen formula (accounts for resting HR).</div>` : ""}
      </div>`;
    }
  }

  return `
    <select class="select-input" id="calc-picker">
      ${CALCULATORS.map(cc=>`<option value="${cc.key}" ${active===cc.key?'selected':''}>${cc.label}</option>`).join("")}
    </select>
    ${fields}
    <button class="btn btn-accent btn-block" data-action="run-calculator" style="margin-top:10px;">Calculate</button>
    ${result}
  `;
}

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

export function renderCsvImportPreview(){
  const r = state.csvImportPreview;
  if(r.kind==="workouts"){
    return `
      <div class="info-box" style="padding:12px 14px;margin-top:12px;background:var(--surface-alt);">
        <div style="font-weight:800;font-size:14px;margin-bottom:8px;">Import Preview — Workout History</div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;">Total rows found</span><span class="mono" style="font-weight:700;">${r.totalRows}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;">Sessions found</span><span class="mono" style="font-weight:700;">${r.sessionsFound}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--mint);">Valid sessions</span><span class="mono" style="font-weight:700;color:var(--mint);">${r.validCount}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--accent);">Invalid rows</span><span class="mono" style="font-weight:700;color:var(--accent);">${r.invalidCount}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--muted);">Duplicate (already imported)</span><span class="mono" style="font-weight:700;color:var(--muted);">${r.duplicateCount}</span></div>
        ${r.invalidRows.length ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Invalid rows: ${r.invalidRows.slice(0,5).map(x=>`row ${x.row} (${x.reason})`).join(", ")}${r.invalidRows.length>5?` +${r.invalidRows.length-5} more`:''}</div>` : ""}
        ${r.validCount>0 ? `
          <div style="font-size:11px;color:var(--muted);margin:10px 0 2px;">This will backfill Personal Records chronologically from your imported history, same as if you'd logged them in the app all along.</div>
          <button class="btn btn-accent btn-block" data-action="confirm-csv-import" style="margin-top:8px;">Import ${r.validCount} Session${r.validCount!==1?'s':''}</button>
        ` : `<div style="font-size:12px;color:var(--muted);margin-top:10px;">Nothing new to import — every session in this file is already in your history.</div>`}
        <button class="btn btn-ghost btn-block" data-action="cancel-csv-import" style="margin-top:8px;">Cancel</button>
      </div>
    `;
  }
  return `
    <div class="info-box" style="padding:12px 14px;margin-top:12px;background:var(--surface-alt);">
      <div style="font-weight:800;font-size:14px;margin-bottom:8px;">Import Preview — ${r.kind==="foods"?"Foods":"Exercises"}</div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;">Total rows found</span><span class="mono" style="font-weight:700;">${r.totalRows}</span></div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--mint);">Valid</span><span class="mono" style="font-weight:700;color:var(--mint);">${r.validCount}</span></div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--accent);">Invalid</span><span class="mono" style="font-weight:700;color:var(--accent);">${r.invalidCount}</span></div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--muted);">Duplicate (already exist)</span><span class="mono" style="font-weight:700;color:var(--muted);">${r.duplicateCount}</span></div>
      ${r.invalidRows.length ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Invalid rows: ${r.invalidRows.slice(0,5).map(x=>`row ${x.row} (${x.reason})`).join(", ")}${r.invalidRows.length>5?` +${r.invalidRows.length-5} more`:''}</div>` : ""}
      ${r.validCount>0 ? `
        ${r.kind==="foods" ? `<div style="font-size:11px;color:var(--muted);margin:8px 0 2px;">Imported as Favorite Foods for quick-add — this doesn't create any dated food-log entries.</div>` : ''}
        <button class="btn btn-accent btn-block" data-action="confirm-csv-import" style="margin-top:8px;">Import ${r.validCount} ${r.kind==="foods"?"Food":"Exercise"}${r.validCount!==1?'s':''}</button>
      ` : `<div style="font-size:12px;color:var(--muted);margin-top:10px;">Nothing valid to import.</div>`}
      <button class="btn btn-ghost btn-block" data-action="cancel-csv-import" style="margin-top:8px;">Cancel</button>
    </div>
  `;
}

export function renderOnboarding(){
  const root = document.getElementById("app");
  const p = state.profile;
  root.innerHTML = `
    <div style="padding:24px 20px 100px;max-width:480px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:800;margin-bottom:4px;">Welcome to</div>
        <h1 style="font-size:32px;font-weight:900;margin:0;">IGNYT</h1>
        <div style="font-size:13px;color:var(--muted);margin-top:6px;">A few quick details so your plan, calories, and macros start off right.</div>
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Your Name</label>
      <input type="text" id="ob-name" value="${p.name||''}" placeholder="What should we call you?" style="width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;font-size:14px;color:var(--text);margin-bottom:14px;border:none;">

      <div class="grid2" style="margin-bottom:14px;">
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Age</label>
          <input type="number" id="ob-age" value="${p.age}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;margin-top:4px;font-size:14px;color:var(--text);border:none;"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Gender</label>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="cat-chip ${p.gender==='male'?'active':''}" data-ob-gender="male" style="flex:1;text-align:center;">Male</button>
            <button class="cat-chip ${p.gender==='female'?'active':''}" data-ob-gender="female" style="flex:1;text-align:center;">Female</button>
          </div></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Height (cm)</label>
          <input type="number" id="ob-height" value="${p.height}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;margin-top:4px;font-size:14px;color:var(--text);border:none;"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Weight (kg)</label>
          <input type="number" id="ob-weight" value="${p.weight}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;margin-top:4px;font-size:14px;color:var(--accent);font-weight:700;border:none;"></div>
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Primary Goal</label>
      <select class="select-input" id="ob-goal" style="margin-bottom:14px;">
        ${GOAL_OPTIONS.map(g=>`<option value="${g.delta}" ${p.goalDelta===g.delta?'selected':''}>${g.label}</option>`).join("")}
      </select>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Training Experience Level</label>
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        ${Object.entries(LEVELS).map(([key,lv])=>`<button class="cat-chip ${state.activeLevel===key?'active':''}" data-ob-level="${key}" style="flex:1;text-align:center;">${lv.label}</button>`).join("")}
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Hyrox Experience</label>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
        ${HYROX_EXPERIENCE_OPTIONS.map(o=>`<button class="cat-chip ${p.hyroxExperience===o.key?'active':''}" data-ob-hyrox="${o.key}" style="text-align:left;padding:11px 14px;">${o.label}</button>`).join("")}
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Training Days Per Week</label>
      <select class="select-input" id="ob-days" style="margin-bottom:14px;">
        ${[2,3,4,5,6,7].map(n=>`<option value="${n}" ${p.trainingDays===n?'selected':''}>${n} days/week</option>`).join("")}
      </select>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Available Equipment</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">
        ${EQUIPMENT_OPTIONS.map(eq=>`<button class="cat-chip ${p.equipment.includes(eq)?'active':''}" data-ob-equipment="${eq}">${eq}</button>`).join("")}
      </div>

      <button class="btn btn-accent btn-block" data-action="onboarding-complete" style="margin-bottom:10px;">Get Started</button>
      <button class="btn btn-ghost btn-block" data-action="onboarding-skip">Skip for now</button>
    </div>
  `;
  document.getElementById("ob-name").addEventListener("change", e=> p.name = e.target.value);
  document.getElementById("ob-age").addEventListener("change", e=> p.age = Number(e.target.value)||p.age);
  document.getElementById("ob-height").addEventListener("change", e=> p.height = Number(e.target.value)||p.height);
  document.getElementById("ob-weight").addEventListener("change", e=> p.weight = Number(e.target.value)||p.weight);
  document.getElementById("ob-goal").addEventListener("change", e=> p.goalDelta = Number(e.target.value));
  document.getElementById("ob-days").addEventListener("change", e=> p.trainingDays = Number(e.target.value));
  document.querySelectorAll("[data-ob-gender]").forEach(el=> el.addEventListener("click", ()=>{ p.gender = el.dataset.obGender; renderOnboarding(); }));
  document.querySelectorAll("[data-ob-level]").forEach(el=> el.addEventListener("click", ()=>{ state.activeLevel = el.dataset.obLevel; renderOnboarding(); }));
  document.querySelectorAll("[data-ob-hyrox]").forEach(el=> el.addEventListener("click", ()=>{ p.hyroxExperience = el.dataset.obHyrox; renderOnboarding(); }));
  document.querySelectorAll("[data-ob-equipment]").forEach(el=> el.addEventListener("click", ()=>{
    const eq = el.dataset.obEquipment;
    if(p.equipment.includes(eq)) p.equipment = p.equipment.filter(e=>e!==eq);
    else p.equipment = p.equipment.concat([eq]);
    renderOnboarding();
  }));
  document.querySelector('[data-action="onboarding-complete"]').addEventListener("click", ()=>{
    state.onboardingComplete = true;
    rebuildWeeks();
    render();
  });
  document.querySelector('[data-action="onboarding-skip"]').addEventListener("click", ()=>{
    state.onboardingComplete = true; // don't ask again — defaults remain, editable anytime in Body tab / Settings
    render();
  });
}

export function attachHandlers(){
  document.querySelectorAll("[data-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.tab = el.dataset.nav; render(); });
  });
  document.querySelectorAll("[data-close-more]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      if(e.target !== el) return; // ignore bubbled clicks from the sheet/cards inside
      state.tab = "home";
      render();
    });
  });
  document.querySelectorAll("[data-home-day]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.activeDayIdx = Number(el.dataset.homeDay);
      state.tab = "plan";
      state.viewingHyroxSchedule = true;
      render();
    });
  });

  // Settings
  document.querySelectorAll("[data-setting-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const key = el.dataset.settingToggle;
      state.settings[key] = !state.settings[key];
      if(key==="keepAwake") applyWakeLock();
      const NOTIFICATION_KEYS = ["workoutReminders","hydrationReminders","weeklyReports"];
      if(NOTIFICATION_KEYS.includes(key) && state.settings[key] && typeof Notification!=='undefined' && Notification.permission==='default'){
        // Contextual request: only fires the moment the user actually turns a reminder on, never at launch
        Notification.requestPermission();
      }
      render();
    });
  });
  const restSelect = document.getElementById("default-rest-select");
  if(restSelect) restSelect.addEventListener("change", ()=>{
    state.settings.defaultRest = Number(restSelect.value);
    persist();
  });
  const waterTargetSelect = document.getElementById("water-target-select");
  if(waterTargetSelect) waterTargetSelect.addEventListener("change", ()=>{
    state.settings.waterTargetMl = Number(waterTargetSelect.value);
    persist();
  });
  document.querySelectorAll("[data-theme-select]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.settings.theme = el.dataset.themeSelect;
      render();
    });
  });
  document.querySelectorAll("[data-weight-unit]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.settings.weightUnit = el.dataset.weightUnit;
      render();
    });
  });
  const testNotifBtn = document.querySelector('[data-action="test-notification"]');
  if(testNotifBtn) testNotifBtn.addEventListener("click", ()=>{
    if(typeof Notification==='undefined'){
      alert("This browser doesn't support notifications.");
      return;
    }
    if(Notification.permission==='granted'){
      new Notification("Ignyt", { body:"Notifications are working. Reminders will look like this.", icon:"assets/icons/icon-192.png" });
    } else if(Notification.permission==='denied'){
      alert("Notifications are blocked for this site — enable them in your browser settings first.");
    } else {
      Notification.requestPermission().then(perm=>{
        if(perm==='granted') new Notification("Ignyt", { body:"Notifications are working. Reminders will look like this.", icon:"assets/icons/icon-192.png" });
      });
    }
  });
  const expJsonBtn = document.querySelector('[data-action="export-json"]');
  if(expJsonBtn) expJsonBtn.addEventListener("click", exportAllJSON);
  const expWkBtn = document.querySelector('[data-action="export-workouts-csv"]');
  if(expWkBtn) expWkBtn.addEventListener("click", exportWorkoutsCSV);
  const expMeasBtn = document.querySelector('[data-action="export-measurements-csv"]');
  if(expMeasBtn) expMeasBtn.addEventListener("click", exportMeasurementsCSV);
  const impBtn = document.querySelector('[data-action="import-json"]');
  const impFile = document.getElementById("import-file");
  if(impBtn && impFile){
    impBtn.addEventListener("click", ()=> impFile.click());
    impFile.addEventListener("change", ()=>{ if(impFile.files.length) importAllJSON(impFile.files[0]); });
  }
  const impCsvBtn = document.querySelector('[data-action="import-csv"]');
  const impCsvFile = document.getElementById("import-csv");
  if(impCsvBtn && impCsvFile){
    impCsvBtn.addEventListener("click", ()=> impCsvFile.click());
    impCsvFile.addEventListener("change", ()=>{ if(impCsvFile.files.length) importCsv(impCsvFile.files[0]); });
  }
  const confirmCsvBtn = document.querySelector('[data-action="confirm-csv-import"]');
  if(confirmCsvBtn) confirmCsvBtn.addEventListener("click", ()=>{
    const r = state.csvImportPreview;
    if(!r) return;
    if(r.kind==="workouts"){
      if(!r.validSessions.length) return;
      // Chronological backfill: process oldest-first, and for each session only let PR
      // detection "see" sessions that genuinely happened before it (existing history up
      // to that point, plus already-backfilled imports) -- not any newer sessions already
      // in the log -- so PRs land on the correct date instead of being silently skipped
      // because a later real session already held the record.
      const chronological = r.validSessions.slice().sort((a,b)=> a.startedAt-b.startedAt);
      const existingSnapshot = state.workoutLog.slice();
      const backfilled = [];
      let prCount = 0;
      chronological.forEach(session=>{
        state.workoutLog = existingSnapshot.filter(e=>e.startedAt <= session.startedAt).concat(backfilled);
        const newPRs = detectPRs(
          { exercises: session.exercises },
          session.id,
          session.finishedAt || session.startedAt,
          session.volume
        );
        if(newPRs.length){ state.prs = newPRs.concat(state.prs); prCount += newPRs.length; }
        backfilled.push(session);
      });
      state.workoutLog = existingSnapshot.concat(backfilled).sort((a,b)=> b.startedAt-a.startedAt);
      const newlyUnlocked = checkAchievements();
      const sessionCount = r.validCount;
      state.csvImportPreview = null;
      persist();
      render();
      alert("Imported "+sessionCount+" session"+(sessionCount!==1?"s":"")+", backfilled "+prCount+" PR"+(prCount!==1?"s":"")+(newlyUnlocked.length?", unlocked "+newlyUnlocked.length+" achievement"+(newlyUnlocked.length!==1?"s":""):"")+".");
      return;
    }
    if(!r.validRows || !r.validRows.length) return;
    if(r.kind==="foods"){
      state.favoriteFoods = state.favoriteFoods.concat(r.validRows);
      const foodCount = r.validCount;
      state.csvImportPreview = null;
      persist();
      render();
      alert("Imported "+foodCount+" food"+(foodCount!==1?"s":"")+" as favorites.");
      return;
    }
    state.customExercises = state.customExercises.concat(r.validRows);
    const count = r.validCount;
    state.csvImportPreview = null;
    persist();
    render();
    alert("Imported "+count+" exercise"+(count!==1?"s":"")+".");
  });
  const cancelCsvBtn = document.querySelector('[data-action="cancel-csv-import"]');
  if(cancelCsvBtn) cancelCsvBtn.addEventListener("click", ()=>{
    state.csvImportPreview = null;
    render();
  });
  const resetBtn = document.querySelector('[data-action="reset-all"]');
  if(resetBtn) resetBtn.addEventListener("click", ()=>{
    if(confirm("This permanently deletes ALL app data (workouts, logs, routines, settings). Are you sure?")){
      if(confirm("Last check — this cannot be undone. Delete everything?")){
        ALL_DATA_KEYS.forEach(k=>localStorage.removeItem(k));
        location.reload();
      }
    }
  });

  // Plan tab
  const openScheduleBtn = document.querySelector('[data-action="open-hyrox-schedule"]');
  if(openScheduleBtn) openScheduleBtn.addEventListener("click", ()=>{
    state.viewingHyroxSchedule = true;
    render();
  });
  const closeScheduleBtn = document.querySelector('[data-action="close-hyrox-schedule"]');
  if(closeScheduleBtn) closeScheduleBtn.addEventListener("click", ()=>{
    state.viewingHyroxSchedule = false;
    render();
  });
  const openRaceBtn = document.querySelector('[data-action="open-race-mode"]');
  if(openRaceBtn) openRaceBtn.addEventListener("click", ()=>{
    state.viewingRaceMode = true;
    render();
  });
  const closeRaceBtn = document.querySelector('[data-action="close-race-mode"]');
  if(closeRaceBtn) closeRaceBtn.addEventListener("click", ()=>{
    if(state.raceActive && !confirm("Leave race mode? Your in-progress race will be discarded.")) return;
    state.raceActive = null;
    state.viewingRaceMode = false;
    stopRaceTimer();
    render();
  });
  const startRaceBtn = document.querySelector('[data-action="start-race"]');
  if(startRaceBtn) startRaceBtn.addEventListener("click", ()=>{
    const now = Date.now();
    state.raceActive = { startedAt: now, segmentStartedAt: now, currentIndex: 0, segments: [] };
    ensureRaceTimerRunning();
    render();
  });
  const raceNextBtn = document.querySelector('[data-action="race-next-segment"]');
  if(raceNextBtn) raceNextBtn.addEventListener("click", ()=>{
    const r = state.raceActive;
    if(!r) return;
    const seg = RACE_SEGMENTS[r.currentIndex];
    const now = Date.now();
    r.segments.push({ name:seg.name, detail:seg.detail||"", type:seg.type, durationMs: now - r.segmentStartedAt });
    if(r.currentIndex >= RACE_SEGMENTS.length-1){
      // Race complete -- auto-save to history, same "commit on finish" pattern as regular workouts
      const totalMs = now - r.startedAt;
      state.raceLog.unshift({ id: now, date: new Date().toISOString().slice(0,10), totalMs, segments: r.segments });
      state.raceActive = null;
      state.viewingRaceMode = false; // return to Plan home rather than parking on the race sub-screen
      stopRaceTimer();
      const newlyUnlocked = checkAchievements();
      if(newlyUnlocked.length) state.lastUnlockedAchievements = newlyUnlocked;
    } else {
      r.currentIndex++;
      r.segmentStartedAt = now;
    }
    render();
  });
  const abortRaceBtn = document.querySelector('[data-action="abort-race"]');
  if(abortRaceBtn) abortRaceBtn.addEventListener("click", ()=>{
    if(!confirm("Abort this race? Progress so far will not be saved.")) return;
    state.raceActive = null;
    stopRaceTimer();
    render();
  });
  document.querySelectorAll("[data-level]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.activeLevel = el.dataset.level;
      rebuildWeeks();
      render();
    });
  });
  document.querySelectorAll("[data-week]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.activeWeek = Number(el.dataset.week); state.activeDayIdx = 0; render(); });
  });
  document.querySelectorAll("[data-day]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.activeDayIdx = Number(el.dataset.day); render(); });
  });
  document.querySelectorAll("[data-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const key = el.dataset.toggle;
      if(state.completed[key]) delete state.completed[key];
      else state.completed[key] = Date.now();
      const newlyUnlocked = checkAchievements();
      if(newlyUnlocked.length) state.lastUnlockedAchievements = newlyUnlocked;
      render();
    });
  });

  // Workout tab
  const startBtn = document.querySelector('[data-action="start-session"]');
  if(startBtn) startBtn.addEventListener("click", ()=>{
    state.session = { startedAt: Date.now(), exercises: [], notes:"", title:"" };
    state.editingSessionId = null;
    applyWakeLock();
    render();
  });

  // Routines
  const toggleBuilderBtn = document.querySelector('[data-action="toggle-routine-builder"]');
  if(toggleBuilderBtn) toggleBuilderBtn.addEventListener("click", ()=>{
    state.routineBuilder = state.routineBuilder ? null : { name:"", exercises:[] };
    render();
  });
  const openPickerForRoutineBtn = document.querySelector('[data-action="open-exercise-picker-for-routine"]');
  if(openPickerForRoutineBtn) openPickerForRoutineBtn.addEventListener("click", ()=>{
    const nameEl = document.getElementById("routine-name");
    if(nameEl) state.routineBuilder.name = nameEl.value;
    const setsEl = document.getElementById("routine-ex-sets");
    if(setsEl) state.routineBuilderSets = Math.max(1, Number(setsEl.value)||3);
    state.showExercisePicker = true;
    state.exercisePickerContext = "routine";
    state.exercisePickerSearch = "";
    state.exercisePickerEquipment = "All";
    state.exercisePickerMuscle = "All";
    state.exercisePickerShowCreate = false;
    render();
  });
  const routineSetsEl = document.getElementById("routine-ex-sets");
  if(routineSetsEl) routineSetsEl.addEventListener("change", ()=>{
    state.routineBuilderSets = Math.max(1, Number(routineSetsEl.value)||3);
    persist();
  });
  const pickerRoutineSetsEl = document.getElementById("ex-picker-routine-sets");
  if(pickerRoutineSetsEl) pickerRoutineSetsEl.addEventListener("change", ()=>{
    state.routineBuilderSets = Math.max(1, Number(pickerRoutineSetsEl.value)||3);
    persist();
  });
  document.querySelectorAll("[data-remove-builder-ex]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const nameEl = document.getElementById("routine-name");
      if(nameEl) state.routineBuilder.name = nameEl.value;
      state.routineBuilder.exercises.splice(Number(el.dataset.removeBuilderEx),1);
      render();
    });
  });
  const saveRoutineBtn = document.querySelector('[data-action="save-routine"]');
  if(saveRoutineBtn) saveRoutineBtn.addEventListener("click", ()=>{
    const nameEl = document.getElementById("routine-name");
    const name = nameEl ? nameEl.value.trim() : "";
    if(!name || !state.routineBuilder.exercises.length) return;
    state.routines.unshift({ id: Date.now(), name, exercises: state.routineBuilder.exercises });
    state.routineBuilder = null;
    render();
  });
  document.querySelectorAll("[data-del-routine]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.routines = state.routines.filter(r=>r.id !== Number(el.dataset.delRoutine));
      render();
    });
  });
  document.querySelectorAll("[data-start-routine]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const routine = state.routines.find(r=>r.id === Number(el.dataset.startRoutine));
      if(!routine) return;
      state.session = {
        startedAt: Date.now(),
        notes: "",
        title: routine.name,
        exercises: routine.exercises.map(e=>({
          name: e.name, notes:"", restDuration:state.settings.defaultRest,
          sets: Array.from({length:e.sets}, ()=>({weight:"",reps:"",rpe:"",done:false,type:"working"}))
        }))
      };
      state.editingSessionId = null;
      state.tab = "workout";
      applyWakeLock();
      render();
    });
  });
  const finishBtn = document.querySelector('[data-action="finish-session"]');
  if(finishBtn) finishBtn.addEventListener("click", ()=>{
    if(state.session.exercises.length){
      const volume = computeSessionVolume(state.session.exercises);

      if(state.editingSessionId){
        // Patch the existing history entry in place — no new PR detection (this is a correction,
        // not a new performance) and no duplicate log entry.
        const idx = state.workoutLog.findIndex(s=>s.id===state.editingSessionId);
        if(idx!==-1){
          state.workoutLog[idx] = Object.assign({}, state.workoutLog[idx], {
            exercises: state.session.exercises,
            notes: state.session.notes || "",
            title: state.session.title || "",
            volume
          });
        }
        state.editingSessionId = null;
      } else {
        const finishedAt = Date.now();
        const durationMin = Math.max(1, Math.round((finishedAt - state.session.startedAt)/60000));
        const workoutId = Date.now();
        const newPRs = detectPRs(state.session, workoutId, finishedAt, volume);
        state.workoutLog.unshift({
          id: workoutId,
          date: new Date().toISOString().slice(0,10),
          startedAt: state.session.startedAt,
          finishedAt, durationMin, volume,
          exercises: state.session.exercises,
          notes: state.session.notes || "",
          title: state.session.title || ""
        });
        if(newPRs.length){
          state.prs = newPRs.concat(state.prs);
          state.lastSessionPRs = newPRs;
        }
      }
      const newlyUnlocked = checkAchievements();
      if(newlyUnlocked.length) state.lastUnlockedAchievements = newlyUnlocked;
    }
    state.session = null;
    applyWakeLock();
    render();
  });
  const cancelEditBtn = document.querySelector('[data-action="cancel-edit-session"]');
  if(cancelEditBtn) cancelEditBtn.addEventListener("click", ()=>{
    state.session = null;
    state.editingSessionId = null;
    applyWakeLock();
    render();
  });
  const editWorkoutBtn = document.querySelector('[data-action="edit-workout"]');
  if(editWorkoutBtn) editWorkoutBtn.addEventListener("click", ()=>{
    const s = state.workoutLog.find(x=>x.id===Number(editWorkoutBtn.dataset.sessionId));
    if(!s) return;
    // Deep-clone so edits don't mutate history until Save is pressed
    state.session = {
      startedAt: s.startedAt || Date.now(),
      date: s.date,
      notes: s.notes || "",
      title: s.title || "",
      exercises: JSON.parse(JSON.stringify(s.exercises))
    };
    state.editingSessionId = s.id;
    state.viewingSessionId = null;
    applyWakeLock();
    render();
  });
  const dismissPRsBtn = document.querySelector('[data-action="dismiss-prs"]');
  if(dismissPRsBtn) dismissPRsBtn.addEventListener("click", ()=>{
    state.lastSessionPRs = null;
    render();
  });
  const dismissAchBtn = document.querySelector('[data-action="dismiss-achievements"]');
  if(dismissAchBtn) dismissAchBtn.addEventListener("click", ()=>{
    state.lastUnlockedAchievements = null;
    render();
  });
  document.querySelectorAll("[data-view-session]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      state.viewingSessionId = Number(el.dataset.viewSession);
      render();
    });
  });
  const closeDetailBtn = document.querySelector('[data-action="close-session-detail"]');
  if(closeDetailBtn) closeDetailBtn.addEventListener("click", ()=>{
    state.viewingSessionId = null;
    render();
  });
  const showAllBtn = document.querySelector('[data-action="toggle-show-all-sessions"]');
  if(showAllBtn) showAllBtn.addEventListener("click", ()=>{
    state.showAllSessions = !state.showAllSessions;
    render();
  });
  const repeatBtn = document.querySelector('[data-action="repeat-workout"]');
  if(repeatBtn) repeatBtn.addEventListener("click", ()=>{
    const s = state.workoutLog.find(x=>x.id===Number(repeatBtn.dataset.sessionId));
    if(!s) return;
    state.session = {
      startedAt: Date.now(),
      notes: "",
      title: s.title || "",
      exercises: s.exercises.map(e=>({
        name: e.name, notes:"", restDuration: e.restDuration || state.settings.defaultRest,
        sets: e.sets.map(()=>({weight:"",reps:"",rpe:"",done:false,type:"working"}))
      }))
    };
    state.viewingSessionId = null;
    state.editingSessionId = null;
    applyWakeLock();
    render();
  });
  const saveAsRoutineBtn = document.querySelector('[data-action="save-session-as-routine"]');
  if(saveAsRoutineBtn) saveAsRoutineBtn.addEventListener("click", ()=>{
    const s = state.workoutLog.find(x=>x.id===Number(saveAsRoutineBtn.dataset.sessionId));
    if(!s) return;
    state.routineBuilder = {
      name: "",
      exercises: s.exercises.map(e=>({ name: e.name, sets: e.sets.length || 1 }))
    };
    state.viewingSessionId = null;
    render();
  });
  const delConfirmedBtn = document.querySelector('[data-action="delete-session-confirmed"]');
  if(delConfirmedBtn) delConfirmedBtn.addEventListener("click", ()=>{
    if(!confirm("Delete this workout permanently? This can't be undone.")) return;
    const id = Number(delConfirmedBtn.dataset.sessionId);
    state.workoutLog = state.workoutLog.filter(s=>s.id !== id);
    state.viewingSessionId = null;
    render();
  });
  document.querySelectorAll("[data-del-session]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      e.stopPropagation(); // don't also trigger the row's data-view-session click
      if(!confirm("Delete this workout permanently? This can't be undone.")) return;
      state.workoutLog = state.workoutLog.filter(s=>s.id !== Number(el.dataset.delSession));
      render();
    });
  });
  const addExBtn = document.querySelector('[data-action="add-exercise"]');
  if(addExBtn) addExBtn.addEventListener("click", ()=>{
    const picker = document.getElementById("ex-picker");
    if(picker && picker.value){
      state.session.exercises.push({ name: picker.value, notes:"", restDuration:state.settings.defaultRest,
        sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
      render();
    }
  });
  document.querySelectorAll("[data-toggle-ex-menu]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      e.stopPropagation();
      const i = Number(el.dataset.toggleExMenu);
      state.exerciseMenuOpen = state.exerciseMenuOpen===i ? null : i;
      render();
    });
  });
  document.querySelectorAll("[data-close-ex-menu]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-toggle-superset]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const i = Number(el.dataset.toggleSuperset);
      const ex = state.session.exercises[i];
      ex.supersetWithNext = !ex.supersetWithNext;
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-replace-exercise]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.replacingExerciseIndex = Number(el.dataset.replaceExercise);
      state.exerciseMenuOpen = null;
      state.showExercisePicker = true;
      state.exercisePickerContext = "replace";
      state.exercisePickerSearch = "";
      state.exercisePickerEquipment = "All";
      state.exercisePickerMuscle = "All";
      state.exercisePickerShowCreate = false;
      render();
    });
  });
  document.querySelectorAll("[data-view-history]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.viewingExerciseDetail = decodeURIComponent(el.dataset.viewHistory);
      state.exerciseDetailTab = "history";
      state.exerciseMenuOpen = null;
      state.tab = "library";
      render();
    });
  });
  document.querySelectorAll("[data-view-instructions]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.viewingExerciseDetail = decodeURIComponent(el.dataset.viewInstructions);
      state.exerciseDetailTab = "howto";
      state.exerciseMenuOpen = null;
      state.tab = "library";
      render();
    });
  });
  document.querySelectorAll("[data-del-exercise]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.session.exercises.splice(Number(el.dataset.delExercise),1);
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-move-exercise-up]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const i = Number(el.dataset.moveExerciseUp);
      if(i<=0) return;
      const ex = state.session.exercises;
      [ex[i-1], ex[i]] = [ex[i], ex[i-1]];
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-move-exercise-down]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const i = Number(el.dataset.moveExerciseDown);
      const ex = state.session.exercises;
      if(i>=ex.length-1) return;
      [ex[i], ex[i+1]] = [ex[i+1], ex[i]];
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-cycle-set-type]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.cycleSetType.split("|");
      const set = state.session.exercises[Number(exi)].sets[Number(si)];
      set.type = nextSetType(set.type);
      render();
    });
  });
  const sessionTitleEl = document.getElementById("session-title");
  if(sessionTitleEl) sessionTitleEl.addEventListener("change", ()=>{
    state.session.title = sessionTitleEl.value;
    persist();
  });
  const sessionNotesEl = document.getElementById("session-notes");
  if(sessionNotesEl) sessionNotesEl.addEventListener("change", ()=>{
    state.session.notes = sessionNotesEl.value;
    persist();
  });
  document.querySelectorAll("[data-notes-exercise]").forEach(el=>{
    el.addEventListener("change", ()=>{
      state.session.exercises[Number(el.dataset.notesExercise)].notes = el.value;
      persist();
    });
  });
  document.querySelectorAll("[data-rest-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const ex = state.session.exercises[Number(el.dataset.restToggle)];
      const idx = REST_OPTIONS.indexOf(ex.restDuration || 0);
      ex.restDuration = REST_OPTIONS[(idx+1) % REST_OPTIONS.length];
      render();
    });
  });
  document.querySelectorAll("[data-plate-calc]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const exi = el.dataset.plateCalc;
      state.plateCalcOpen = state.plateCalcOpen===exi ? null : exi;
      render();
    });
  });
  const runPlateBtn = document.querySelector('[data-action="run-plate-calc"]');
  if(runPlateBtn) runPlateBtn.addEventListener("click", ()=>{
    state.plateTarget = document.getElementById("plate-target").value;
    state.plateBar = document.getElementById("plate-bar").value;
    render();
  });
  document.querySelectorAll("[data-add-set]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const ex = state.session.exercises[Number(el.dataset.addSet)];
      const last = ex.sets[ex.sets.length-1];
      ex.sets.push({ weight: last?last.weight:"", reps: last?last.reps:"", rpe:"", done:false, type:"working" });
      render();
    });
  });
  document.querySelectorAll("[data-del-set]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.delSet.split("|").map(Number);
      const ex = state.session.exercises[exi];
      if(!ex || ex.sets.length<=1) return; // never delete the exercise's last remaining set
      ex.sets.splice(si,1); // remaining sets renumber automatically -- their "Set N" label is just their array index+1
      render();
    });
  });
  document.querySelectorAll("[data-set-field]").forEach(el=>{
    el.addEventListener("change", ()=>{
      const [exi,si,field] = el.dataset.setField.split("|");
      state.session.exercises[Number(exi)].sets[Number(si)][field] = field==="weight" ? parseInputW(el.value) : el.value;
      persist();
    });
  });
  document.querySelectorAll("[data-rpe]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.rpe.split("|").map(Number);
      const set = state.session.exercises[exi].sets[si];
      const idx = RPE_OPTIONS.indexOf(set.rpe || "–");
      set.rpe = RPE_OPTIONS[(idx+1) % RPE_OPTIONS.length];
      if(set.rpe === "–") set.rpe = "";
      render();
    });
  });
  document.querySelectorAll("[data-set-done]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.setDone.split("|").map(Number);
      const ex = state.session.exercises[exi];
      const set = ex.sets[si];
      set.done = !set.done;
      render();
      if(set.done && ex.restDuration>0 && state.settings.autoStartRest && !ex.supersetWithNext) startTimer(ex.restDuration);
    });
  });

  // Timer overlay
  const cancelTimer = document.querySelector('[data-action="cancel-timer"]');
  if(cancelTimer) cancelTimer.addEventListener("click", ()=>{
    if(state.timer && state.timer.handle) clearInterval(state.timer.handle);
    state.timer = null;
    render();
  });

  // Library tab
  const libSearch = document.getElementById("lib-search");
  if(libSearch) libSearch.addEventListener("input", (e)=>{
    state.libSearch = e.target.value;
    debounce("lib-search", ()=>{
      render();
      setTimeout(()=>{ const s=document.getElementById("lib-search"); if(s){ s.focus(); s.setSelectionRange(s.value.length,s.value.length); } },0);
    }, 150);
  });
  document.querySelectorAll("[data-cat]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.libCategory = el.dataset.cat; render(); });
  });
  document.querySelectorAll("[data-view-exercise]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.viewingExerciseDetail = el.dataset.viewExercise;
      state.exerciseDetailTab = "summary";
      render();
    });
  });
  document.querySelectorAll("[data-ex-detail-tab]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.exerciseDetailTab = el.dataset.exDetailTab;
      render();
    });
  });
  const closeExDetailBtn = document.querySelector('[data-action="close-exercise-detail"]');
  if(closeExDetailBtn) closeExDetailBtn.addEventListener("click", ()=>{
    state.viewingExerciseDetail = null;
    render();
  });
  const addDetailBtn = document.querySelector('[data-action="add-detail-to-workout"]');
  if(addDetailBtn) addDetailBtn.addEventListener("click", ()=>{
    const name = addDetailBtn.dataset.exerciseName;
    if(!state.session){
      state.session = { startedAt: Date.now(), exercises: [], notes:"", title:"" };
      state.editingSessionId = null;
      applyWakeLock();
    }
    state.session.exercises.push({ name, notes:"", restDuration:state.settings.defaultRest,
      sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
    state.viewingExerciseDetail = null;
    state.tab = "workout";
    render();
  });
  // Lazy video: only starts loading/playing once the detail screen with a real
  // animation is actually on-DOM, and pauses/releases if the tab is left.
  const exVideo = document.getElementById("ex-anim-video");
  if(exVideo){
    exVideo.play().catch(()=>{}); // preload="none" means this triggers the actual fetch, not before
    if(!window.__exAnimVisibilityHandlerAttached){
      window.__exAnimVisibilityHandlerAttached = true;
      document.addEventListener("visibilitychange", ()=>{
        const v = document.getElementById("ex-anim-video");
        if(!v) return;
        if(document.visibilityState==="hidden") v.pause(); else v.play().catch(()=>{});
      });
    }
  }
  const showCustomBtn = document.querySelector('[data-action="show-add-custom"]');
  if(showCustomBtn) showCustomBtn.addEventListener("click", ()=>{
    state.showCustomForm = !state.showCustomForm;
    render();
  });
  const saveCustomBtn = document.querySelector('[data-action="save-custom"]');
  if(saveCustomBtn) saveCustomBtn.addEventListener("click", ()=>{
    const name = document.getElementById("custom-name").value.trim();
    const cat = document.getElementById("custom-cat").value;
    const muscle = document.getElementById("custom-muscle").value;
    const presc = document.getElementById("custom-presc").value.trim() || "—";
    if(!name) return;
    state.customExercises.push({ name, cat, presc, unit:"reps", muscle });
    state.showCustomForm = false;
    render();
  });

  // Exercise picker (full-screen Add Exercise flow)
  const openPickerBtn = document.querySelector('[data-action="open-exercise-picker"]');
  if(openPickerBtn) openPickerBtn.addEventListener("click", ()=>{
    state.showExercisePicker = true;
    state.exercisePickerContext = "session";
    state.exercisePickerSearch = "";
    state.exercisePickerEquipment = "All";
    state.exercisePickerMuscle = "All";
    state.exercisePickerShowCreate = false;
    render();
  });
  const closePickerBtn = document.querySelector('[data-action="close-exercise-picker"]');
  if(closePickerBtn) closePickerBtn.addEventListener("click", ()=>{
    if(state.exercisePickerShowCreate){ state.exercisePickerShowCreate = false; render(); return; }
    state.showExercisePicker = false;
    state.replacingExerciseIndex = null;
    render();
  });
  const pickerSearchEl = document.getElementById("ex-picker-search");
  if(pickerSearchEl) pickerSearchEl.addEventListener("input", ()=>{
    state.exercisePickerSearch = pickerSearchEl.value;
    debounce("ex-picker-search", ()=>{
      render();
      setTimeout(()=>{ const s=document.getElementById("ex-picker-search"); if(s){ s.focus(); s.setSelectionRange(s.value.length,s.value.length); } },0);
    }, 150);
  });
  const pickerEquipEl = document.getElementById("ex-picker-equip");
  if(pickerEquipEl) pickerEquipEl.addEventListener("change", ()=>{
    state.exercisePickerEquipment = pickerEquipEl.value;
    render();
  });
  const pickerMuscleEl = document.getElementById("ex-picker-muscle");
  if(pickerMuscleEl) pickerMuscleEl.addEventListener("change", ()=>{
    state.exercisePickerMuscle = pickerMuscleEl.value;
    render();
  });
  document.querySelectorAll("[data-pick-exercise]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      if(e.target.closest("[data-view-exercise-from-picker]")) return; // let the info button handle its own click
      const name = el.dataset.pickExercise;
      if(state.exercisePickerContext==="routine"){
        state.routineBuilder.exercises.push({ name, sets: state.routineBuilderSets });
      } else if(state.exercisePickerContext==="replace"){
        const idx = state.replacingExerciseIndex;
        if(idx!=null && state.session.exercises[idx]){
          // New exercise, so old sets (tied to the old movement's weights/reps) don't carry over --
          // start it fresh, same as adding a brand new exercise, but keep its position in the list.
          state.session.exercises[idx] = { name, notes:"", restDuration:state.settings.defaultRest,
            sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] };
        }
        state.replacingExerciseIndex = null;
      } else {
        state.session.exercises.push({ name, notes:"", restDuration:state.settings.defaultRest,
          sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
      }
      state.showExercisePicker = false;
      render();
    });
  });
  document.querySelectorAll("[data-view-exercise-from-picker]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      e.stopPropagation();
      state.viewingExerciseDetail = el.dataset.viewExerciseFromPicker;
      state.exerciseDetailTab = "summary";
      state.showExercisePicker = false;
      state.tab = "library";
      render();
    });
  });
  const showCreateBtn = document.querySelector('[data-action="show-create-in-picker"]');
  if(showCreateBtn) showCreateBtn.addEventListener("click", ()=>{
    state.exercisePickerShowCreate = true;
    render();
  });
  const saveCustomFromPickerBtn = document.querySelector('[data-action="save-custom-from-picker"]');
  if(saveCustomFromPickerBtn) saveCustomFromPickerBtn.addEventListener("click", ()=>{
    const name = document.getElementById("custom-name").value.trim();
    const cat = document.getElementById("custom-cat").value;
    const muscle = document.getElementById("custom-muscle").value;
    const presc = document.getElementById("custom-presc").value.trim() || "—";
    if(!name) return;
    state.customExercises.push({ name, cat, presc, unit:"reps", muscle });
    if(state.exercisePickerContext==="routine"){
      state.routineBuilder.exercises.push({ name, sets: state.routineBuilderSets });
    } else if(state.exercisePickerContext==="replace"){
      const idx = state.replacingExerciseIndex;
      if(idx!=null && state.session.exercises[idx]){
        state.session.exercises[idx] = { name, notes:"", restDuration:state.settings.defaultRest,
          sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] };
      }
      state.replacingExerciseIndex = null;
    } else {
      state.session.exercises.push({ name, notes:"", restDuration:state.settings.defaultRest,
        sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
    }
    state.exercisePickerShowCreate = false;
    state.showExercisePicker = false;
    render();
  });

  // Body tab — profile (single source of truth)
  const pn = document.getElementById("p-name");
  const ph = document.getElementById("p-height");
  const pa = document.getElementById("p-age");
  if(pn) pn.addEventListener("change", ()=>{ state.profile.name = pn.value; render(); });
  if(ph) ph.addEventListener("change", ()=>{ state.profile.height = Number(ph.value)||state.profile.height; render(); });
  if(pa) pa.addEventListener("change", ()=>{ state.profile.age = Number(pa.value)||state.profile.age; render(); });
  document.querySelectorAll("[data-profile-gender]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.profile.gender = el.dataset.profileGender; render(); });
  });
  const pact = document.getElementById("p-activity");
  if(pact) pact.addEventListener("change", ()=>{ state.profile.activityMultiplier = Number(pact.value); render(); });
  const pgoal = document.getElementById("p-goal");
  if(pgoal) pgoal.addEventListener("change", ()=>{ state.profile.goalDelta = Number(pgoal.value); render(); });
  const phyroxExp = document.getElementById("p-hyrox-exp");
  if(phyroxExp) phyroxExp.addEventListener("change", ()=>{ state.profile.hyroxExperience = phyroxExp.value; render(); });
  const ptDays = document.getElementById("p-training-days");
  if(ptDays) ptDays.addEventListener("change", ()=>{ state.profile.trainingDays = Number(ptDays.value); render(); });
  document.querySelectorAll("[data-profile-equipment]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const eq = el.dataset.profileEquipment;
      if(state.profile.equipment.includes(eq)) state.profile.equipment = state.profile.equipment.filter(e=>e!==eq);
      else state.profile.equipment = state.profile.equipment.concat([eq]);
      render();
    });
  });

  const logBodyBtn = document.querySelector('[data-action="log-body"]');
  if(logBodyBtn) logBodyBtn.addEventListener("click", ()=>{
    const rawWeight = document.getElementById("b-weight").value;
    if(!rawWeight) return;
    const weight = parseInputW(rawWeight); // convert from displayed unit to canonical kg for storage
    const bf = document.getElementById("b-bodyfat").value;
    state.bodylog.unshift({
      id: Date.now(),
      date: document.getElementById("b-date").value,
      weight,
      sleep: document.getElementById("b-sleep").value,
      hrv: document.getElementById("b-hrv").value,
      waist: document.getElementById("b-waist").value,
      chest: document.getElementById("b-chest").value,
      arms: document.getElementById("b-arms").value,
      bodyfat: bf
    });
    // Weight logged here becomes the single source of truth -> recalcs calories/macros everywhere
    state.profile.weight = Number(weight) || state.profile.weight;
    render();
  });
  document.querySelectorAll("[data-del-body]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.bodylog = state.bodylog.filter(e=>e.id !== Number(el.dataset.delBody));
      if(state.bodylog.length) state.profile.weight = Number(state.bodylog[0].weight) || state.profile.weight;
      render();
    });
  });

  // Calculators
  const calcPicker = document.getElementById("calc-picker");
  if(calcPicker) calcPicker.addEventListener("change", ()=>{
    state.calc.activeCalc = calcPicker.value;
    state.calc.result = null;
    render();
  });
  document.querySelectorAll("[data-gender-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [, val] = el.dataset.genderToggle.split("|");
      state.calc.gender = val;
      render();
    });
  });
  const runCalcBtn = document.querySelector('[data-action="run-calculator"]');
  if(runCalcBtn) runCalcBtn.addEventListener("click", ()=>{
    const c = state.calc;
    const readNum = (id, fallback)=>{ const el=document.getElementById(id); return el ? (Number(el.value)||fallback) : fallback; };
    c.age = readNum("calc-age", c.age);
    c.height = readNum("calc-height", c.height);
    c.weight = readNum("calc-weight", c.weight);
    c.neck = readNum("calc-neck", c.neck);
    c.waist = readNum("calc-waist", c.waist);
    c.hip = readNum("calc-hip", c.hip);
    c.restingHR = readNum("calc-resting", 0);
    c.bust = readNum("calc-bust", c.bust);
    c.bwaist = readNum("calc-bwaist", c.bwaist);
    c.highHip = readNum("calc-highhip", c.highHip);
    c.bhip = readNum("calc-bhip", c.bhip);
    const activityEl = document.getElementById("calc-activity");
    if(activityEl) c.activityMultiplier = Number(activityEl.value);
    const goalEl = document.getElementById("calc-goal");
    if(goalEl) c.goalDelta = Number(goalEl.value);

    if(c.activeCalc==="bmr"){
      const bmr = calcBMR(c.age, c.gender, c.height, c.weight);
      c.result = { type:"bmr", bmr };
    } else if(c.activeCalc==="calorie"){
      const bmr = calcBMR(c.age, c.gender, c.height, c.weight);
      c.result = { type:"calorie", tdee: bmr*c.activityMultiplier, goalDelta: c.goalDelta };
    } else if(c.activeCalc==="protein"){
      const tdee = calcBMR(c.age, c.gender, c.height, c.weight)*c.activityMultiplier;
      const m = calcMacros(tdee);
      c.result = { type:"protein", rda: c.weight*0.8, pctLo: m.protein.lo, pctHi: m.protein.hi,
        trainLo: c.weight*1.6, trainHi: c.weight*2.2 };
    } else if(c.activeCalc==="carbs"){
      const tdee = calcBMR(c.age, c.gender, c.height, c.weight)*c.activityMultiplier;
      const m = calcMacros(tdee);
      c.result = { type:"carbs", tdee, lo: m.carbs.lo, hi: m.carbs.hi };
    } else if(c.activeCalc==="fat"){
      const tdee = calcBMR(c.age, c.gender, c.height, c.weight)*c.activityMultiplier;
      const m = calcMacros(tdee);
      c.result = { type:"fat", tdee, lo: m.fat.lo, hi: m.fat.hi, satMax: m.satFatMax };
    } else if(c.activeCalc==="bodytype"){
      c.result = { type:"bodytype", ...calcBodyType(c.bust, c.bwaist, c.highHip, c.bhip) };
    } else if(c.activeCalc==="lbm"){
      c.result = { type:"lbm", ...calcLBM(c.gender, c.height, c.weight) };
    } else if(c.activeCalc==="ideal"){
      c.result = { type:"ideal", ...calcIdealWeight(c.gender, c.height) };
    } else if(c.activeCalc==="bodyfat"){
      c.result = { type:"bodyfat", bf: calcBodyFatNavy(c.gender, c.height, c.neck, c.waist, c.hip) };
    } else if(c.activeCalc==="hr"){
      c.result = { type:"hr", ...calcHeartRateZones(c.age, c.restingHR) };
    }
    render();
  });
  const applyProfileBtn = document.querySelector('[data-action="apply-calc-profile"]');
  if(applyProfileBtn) applyProfileBtn.addEventListener("click", ()=>{
    const c = state.calc;
    state.profile.age = c.age; state.profile.gender = c.gender;
    state.profile.height = c.height;
    if(c.activityMultiplier) state.profile.activityMultiplier = c.activityMultiplier;
    if(c.goalDelta!=null) state.profile.goalDelta = c.goalDelta;
    render();
  });

  // Progress tab
  document.querySelectorAll("[data-metric]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.chartMetric = el.dataset.metric; render(); });
  });
  const progExSelect = document.getElementById("progress-exercise-select");
  if(progExSelect) progExSelect.addEventListener("change", ()=>{
    state.progressExercise = progExSelect.value;
    render();
  });
  document.querySelectorAll("[data-cal-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const delta = Number(el.dataset.calNav);
      const next = (state.calendarMonthOffset||0) + delta;
      if(next<=0) state.calendarMonthOffset = next;
      render();
    });
  });
  document.querySelectorAll("[data-bodydist-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const delta = Number(el.dataset.bodydistNav);
      const next = (state.bodyDistWeekOffset||0) + delta;
      if(next>=0) state.bodyDistWeekOffset = next;
      render();
    });
  });

  // Nutrition tab — meals & food log
  document.querySelectorAll("[data-meal-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const meal = el.dataset.mealToggle;
      state.mealOpen = state.mealOpen===meal ? null : meal;
      render();
    });
  });
  document.querySelectorAll("[data-log-meal-food]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const meal = el.dataset.logMealFood;
      const name = document.getElementById("food-name").value.trim();
      const cal = Number(document.getElementById("food-cal").value);
      if(!name || !cal) return;
      state.foodLog.unshift({ id: Date.now(), date: todayStr(), name, calories: cal, meal,
        protein: Number(document.getElementById("food-protein").value)||0,
        carbs: Number(document.getElementById("food-carbs").value)||0,
        fat: Number(document.getElementById("food-fat").value)||0,
        fibre: Number(document.getElementById("food-fibre").value)||0
      });
      render();
    });
  });
  document.querySelectorAll("[data-quick-add-food]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const meal = el.dataset.quickAddFood;
      state.foodLog.unshift({
        id: Date.now(), date: todayStr(), meal,
        name: el.dataset.foodName,
        calories: Number(el.dataset.foodCal)||0,
        protein: Number(el.dataset.foodProtein)||0,
        carbs: Number(el.dataset.foodCarbs)||0,
        fat: Number(el.dataset.foodFat)||0,
        fibre: Number(el.dataset.foodFibre)||0
      });
      render();
    });
  });
  const saveFavBtn = document.querySelector('[data-action="save-as-favorite"]');
  if(saveFavBtn) saveFavBtn.addEventListener("click", ()=>{
    const name = document.getElementById("food-name").value.trim();
    const cal = Number(document.getElementById("food-cal").value);
    if(!name || !cal) return;
    const fav = {
      name, calories: cal,
      protein: Number(document.getElementById("food-protein").value)||0,
      carbs: Number(document.getElementById("food-carbs").value)||0,
      fat: Number(document.getElementById("food-fat").value)||0,
      fibre: Number(document.getElementById("food-fibre").value)||0
    };
    if(!state.favoriteFoods.some(f=>f.name.toLowerCase()===name.toLowerCase())){
      state.favoriteFoods.push(fav);
    }
    render();
  });
  document.querySelectorAll("[data-add-water]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.waterLog.unshift({ id: Date.now(), date: todayStr(), ml: Number(el.dataset.addWater) });
      render();
    });
  });
  const undoWaterBtn = document.querySelector('[data-action="undo-water"]');
  if(undoWaterBtn) undoWaterBtn.addEventListener("click", ()=>{
    const idx = state.waterLog.findIndex(w=>w.date===todayStr());
    if(idx!==-1) state.waterLog.splice(idx,1);
    render();
  });
  document.querySelectorAll("[data-del-food]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.foodLog = state.foodLog.filter(f=>f.id !== Number(el.dataset.delFood));
      render();
    });
  });

  // Nutrition tab
  ["n-proteinpct","n-carbpct","n-fatpct","n-fibre"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener("change", ()=>{
      const g = (i)=>{ const e=document.getElementById(i); return e?Number(e.value):0; };
      state.nutrition.proteinPct = g("n-proteinpct");
      state.nutrition.carbPct = g("n-carbpct");
      state.nutrition.fatPct = g("n-fatpct");
      state.nutrition.fibreTarget = g("n-fibre");
      render();
    });
  });
}
