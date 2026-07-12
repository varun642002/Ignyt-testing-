import { confirmDialog, resolveConfirmDialog } from './dialogs.js';
import { customExerciseForm, genderToggle, renderOnboarding, renderRoutineBuilder } from './forms.js';
import { renderExercisePicker, renderPlatePopover } from './modals.js';
import { renderApp } from './navigation.js';
import { renderExerciseDetailHistory, renderSessionDetail } from './tables.js';
import { dismissToast, showToast } from './toast.js';
import { sparklineChart } from '../charts.js';
import { ALL_DATA_KEYS, EXERCISE_DETAILS, LEVELS, LIBRARY, RACE_SEGMENTS, REST_OPTIONS, RPE_OPTIONS, SET_TYPE_META } from '../constants.js';
import { calcBMR, calcBodyFatNavy, calcBodyType, calcHeartRateZones, calcIdealWeight, calcLBM, calcMacros } from '../nutrition.js';
import { applyTheme, settingToggle } from '../settings.js';
import { exportAllJSON, exportMeasurementsCSV, exportWorkoutsCSV, importAllJSON, importCsv, persist, state } from '../storage.js';
import { applyWakeLock, ensureElapsedTimerRunning, ensureRaceTimerRunning, startTimer, stopElapsedTimer, stopRaceTimer } from '../timer.js';
import { debounce, displayW, formatDuration, parseInputW, svg, todayStr, wUnit } from '../utils.js';
import { WEEKS, allLibraryExercises, bestRaceTime, checkAchievements, computeSessionVolume, detectPRs, exerciseHistoryEntries, exercisePRs, exerciseProgressTrend, getMuscle, getPreviousSet, nextSetType, prTypeLabel, prValueLabel, rebuildWeeks, sessionMuscles, sessionTitle, weekProgress } from '../workout.js';

/* =========================================================
   UI INDEX — the render loop, error screen, remaining full-tab screens
   (Plan, Workout, Library, HYROX Schedule, Race Mode, Exercise Detail),
   the PR/achievement celebration banners' markup, the CSV import preview,
   and attachHandlers() which wires up every DOM event listener after
   each render. Re-exports nothing extra -- app.js imports render() and
   renderErrorScreen() directly from here.
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
      showToast("This browser doesn't support notifications.", "error", render);
      return;
    }
    if(Notification.permission==='granted'){
      new Notification("Ignyt", { body:"Notifications are working. Reminders will look like this.", icon:"assets/icons/icon-192.png" });
    } else if(Notification.permission==='denied'){
      showToast("Notifications are blocked for this site — enable them in your browser settings first.", "error", render);
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
      showToast("Imported "+sessionCount+" session"+(sessionCount!==1?"s":"")+", backfilled "+prCount+" PR"+(prCount!==1?"s":"")+(newlyUnlocked.length?", unlocked "+newlyUnlocked.length+" achievement"+(newlyUnlocked.length!==1?"s":""):"")+".", "success", render);
      return;
    }
    if(!r.validRows || !r.validRows.length) return;
    if(r.kind==="foods"){
      state.favoriteFoods = state.favoriteFoods.concat(r.validRows);
      const foodCount = r.validCount;
      state.csvImportPreview = null;
      persist();
      render();
      showToast("Imported "+foodCount+" food"+(foodCount!==1?"s":"")+" as favorites.", "success", render);
      return;
    }
    state.customExercises = state.customExercises.concat(r.validRows);
    const count = r.validCount;
    state.csvImportPreview = null;
    persist();
    render();
    showToast("Imported "+count+" exercise"+(count!==1?"s":"")+".", "success", render);
  });
  const cancelCsvBtn = document.querySelector('[data-action="cancel-csv-import"]');
  if(cancelCsvBtn) cancelCsvBtn.addEventListener("click", ()=>{
    state.csvImportPreview = null;
    render();
  });
  const resetBtn = document.querySelector('[data-action="reset-all"]');
  if(resetBtn) resetBtn.addEventListener("click", async ()=>{
    if(await confirmDialog("This permanently deletes ALL app data (workouts, logs, routines, settings). Are you sure?", render)){
      if(await confirmDialog("Last check — this cannot be undone. Delete everything?", render)){
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
  if(closeRaceBtn) closeRaceBtn.addEventListener("click", async ()=>{
    if(state.raceActive && !(await confirmDialog("Leave race mode? Your in-progress race will be discarded.", render))) return;
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
  if(abortRaceBtn) abortRaceBtn.addEventListener("click", async ()=>{
    if(!(await confirmDialog("Abort this race? Progress so far will not be saved.", render))) return;
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
  if(delConfirmedBtn) delConfirmedBtn.addEventListener("click", async ()=>{
    if(!(await confirmDialog("Delete this workout permanently? This can't be undone.", render))) return;
    const id = Number(delConfirmedBtn.dataset.sessionId);
    state.workoutLog = state.workoutLog.filter(s=>s.id !== id);
    state.viewingSessionId = null;
    render();
  });
  document.querySelectorAll("[data-del-session]").forEach(el=>{
    el.addEventListener("click", async (e)=>{
      e.stopPropagation(); // don't also trigger the row's data-view-session click
      if(!(await confirmDialog("Delete this workout permanently? This can't be undone.", render))) return;
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

  // Toast / confirm dialog
  const toastEl = document.querySelector('[data-action="dismiss-toast"]');
  if(toastEl) toastEl.addEventListener("click", ()=> dismissToast(render));
  document.querySelectorAll("[data-dialog-action]").forEach(el=>{
    el.addEventListener("click", ()=> resolveConfirmDialog(el.dataset.dialogAction==="confirm", render));
  });
}
