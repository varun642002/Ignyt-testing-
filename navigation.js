import { renderBodyTab, renderNutritionTab, renderProgressTab } from './charts-ui.js';
import { renderHomeTab } from './dashboard.js';
import { renderConfirmDialog } from './dialogs.js';
import { attachHandlers, renderLibraryTab, renderPlanTab, renderWorkoutTab } from './index.js';
import { renderTimerOverlay } from './modals.js';
import { renderToast } from './toast.js';
import { renderSettingsTab } from '../settings.js';
import { persist, state } from '../storage.js';
import { svg } from '../utils.js';

/* =========================================================
   NAVIGATION — the app shell: header, bottom nav, the More sheet, and
   renderApp() which dispatches to the right tab's render function.
========================================================= */

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
    ${renderToast()}
    ${renderConfirmDialog()}
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
