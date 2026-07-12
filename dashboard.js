import { renderAchievementCelebration, renderPRCelebration } from './index.js';
import { LEVELS } from '../constants.js';
import { macroTargets, todayEaten, todayMacros, todayWater } from '../nutrition.js';
import { persist, state } from '../storage.js';
import { displayW, svg, todayStr, wUnit } from '../utils.js';
import { WEEKS, computeStreak, overallPlanProgress, prTypeLabel, prValueLabel, thisWeekStats, todaysPlannedDay } from '../workout.js';

/* =========================================================
   DASHBOARD — the Home tab: greeting, today's HYROX day, quick stats,
   PR/achievement celebration banners, and the contextual reminder logic.
========================================================= */

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
