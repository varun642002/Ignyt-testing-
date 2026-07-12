import { customExerciseForm } from './forms.js';
import { BODY_MUSCLES, LIBRARY } from '../constants.js';
import { state } from '../storage.js';
import { avatarColorFor, calcPlates, formatTime, svg } from '../utils.js';
import { allLibraryExercises, recentExerciseNames } from '../workout.js';

/* =========================================================
   MODALS — full-screen and overlay UI: the Add Exercise picker, the
   plate-calculator popover, and the rest-timer overlay.
========================================================= */

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
