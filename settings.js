import { state } from './storage.js';
import { renderCsvImportPreview } from './ui/index.js';

/* =========================================================
   SETTINGS — theme application and the Settings tab (toggles, water
   target, weight unit, notifications, CSV import, danger zone).
========================================================= */

export function applyTheme(){
  const pref = state.settings.theme || "dark";
  const resolved = pref==="system"
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : pref;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function settingToggle(key, label, desc){
  const on = !!state.settings[key];
  return `<div style="padding:14px 0;border-bottom:1px solid var(--border);">
    <div class="row-between">
      <span style="font-weight:700;font-size:15px;">${label}</span>
      <button data-setting-toggle="${key}" style="width:46px;height:26px;border-radius:13px;border:none;cursor:pointer;position:relative;background:${on?'var(--steel)':'var(--surface-alt)'};transition:background .15s;">
        <span style="position:absolute;top:3px;${on?'right:3px':'left:3px'};width:20px;height:20px;border-radius:50%;background:${on?'#fff':'#6a6a74'};"></span>
      </button>
    </div>
    ${desc?`<div style="font-size:12px;color:var(--muted);margin-top:4px;max-width:85%;">${desc}</div>`:""}
  </div>`;
}

/* =========================================================
   ONBOARDING — shown once, only for genuinely new installs
========================================================= */

export function renderSettingsTab(){
  const s = state.settings;
  return `
    <div class="eyebrow-label" style="margin-top:4px;">Export Data</div>
    <div class="info-box" style="padding:14px;">
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Export your entire workout and measurement history. The JSON backup can be imported back; CSVs are for spreadsheets.</div>
      <button class="btn btn-accent btn-block" data-action="export-json" style="margin-bottom:8px;">Full Backup (JSON)</button>
      <button class="btn btn-steel btn-block" data-action="export-workouts-csv" style="margin-bottom:8px;">Export Workouts (CSV)</button>
      <button class="btn btn-steel btn-block" data-action="export-measurements-csv">Export Measurements (CSV)</button>
    </div>

    <div class="eyebrow-label">Import Data</div>
    <div class="info-box" style="padding:14px;">
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Restore from a Full Backup (JSON) file. This replaces all current data in the app.</div>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none;">
      <button class="btn btn-ghost btn-block" data-action="import-json">Choose Backup File…</button>
    </div>

    <div class="eyebrow-label">Import CSV</div>
    <div class="info-box" style="padding:14px;">
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">
        Import from a spreadsheet. Three formats are auto-detected:<br>
        <b style="color:var(--text);">Exercises</b> — columns <b style="color:var(--text);">name</b>, <b style="color:var(--text);">muscle</b> (optional: cat, presc, unit). Adds to Custom Exercises only.<br>
        <b style="color:var(--text);">Workout History</b> — a Hevy-style export (title, start_time, exercise_title, set_type, weight_kg, reps, …). Adds full past workouts and backfills PRs.<br>
        <b style="color:var(--text);">Foods</b> — columns <b style="color:var(--text);">name</b>, <b style="color:var(--text);">calories</b> (optional: protein, carbs, fat, fibre). Adds to Favorite Foods for quick-add — never creates fake dated food-log entries.<br>
        Either way, this only adds — it never overwrites or deletes anything, and re-importing the same file skips what's already there.
      </div>
      <input type="file" id="import-csv" accept=".csv,text/csv" style="display:none;">
      <button class="btn btn-ghost btn-block" data-action="import-csv">Choose CSV File…</button>
      ${state.csvImportPreview ? renderCsvImportPreview() : ""}
    </div>

    <div class="eyebrow-label">Workout Settings</div>
    <div class="info-box" style="padding:0 14px;">
      ${settingToggle("sounds","Sounds","Beep when the rest timer finishes.")}
      ${settingToggle("vibration","Vibration","Vibrate when the rest timer finishes.")}
      ${settingToggle("autoStartRest","Auto-Start Rest Timer","Checking off a set automatically starts that exercise's rest timer.")}
      ${settingToggle("keepAwake","Keep Awake During Workout","Prevents your phone screen from sleeping while a session is in progress.")}
      ${settingToggle("plateCalc","Plate Calculator","Shows a plates button next to weight inputs for barbell exercises.")}
      ${settingToggle("rpeTracking","RPE Tracking","Show the RPE column in the workout logger.")}
      <div style="padding:14px 0;">
        <div class="row-between">
          <span style="font-weight:700;font-size:15px;">Default Rest Timer</span>
          <select class="select-input" id="default-rest-select" style="width:auto;margin:0;padding:6px 10px;">
            ${[0,30,60,90,120,150,180,240].map(v=>`<option value="${v}" ${s.defaultRest===v?'selected':''}>${v===0?'Off':v+'s'}</option>`).join("")}
          </select>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">New exercises added to a session start with this rest duration.</div>
      </div>
      <div style="padding:14px 0;">
        <div class="row-between">
          <span style="font-weight:700;font-size:15px;">Weight Unit</span>
          <div style="display:flex;gap:6px;">
            <button class="cat-chip ${s.weightUnit==='kg'?'active':''}" data-weight-unit="kg">kg</button>
            <button class="cat-chip ${s.weightUnit==='lb'?'active':''}" data-weight-unit="lb">lb</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">Applies to workout logging, body weight, and PRs. Calculators and the plate calculator stay in kg.</div>
      </div>
      <div style="padding:14px 0;">
        <div class="row-between">
          <span style="font-weight:700;font-size:15px;">Daily Water Target</span>
          <select class="select-input" id="water-target-select" style="width:auto;margin:0;padding:6px 10px;">
            ${[1500,2000,2500,3000,3500,4000].map(v=>`<option value="${v}" ${s.waterTargetMl===v?'selected':''}>${(v/1000).toFixed(1)}L</option>`).join("")}
          </select>
        </div>
      </div>
    </div>

    <div class="eyebrow-label">Appearance</div>
    <div class="info-box" style="padding:14px;">
      <div style="display:flex;gap:6px;">
        ${[{key:"dark",label:"Dark"},{key:"light",label:"Light"},{key:"system",label:"System"}].map(t=>`
          <button class="cat-chip ${s.theme===t.key?'active':''}" data-theme-select="${t.key}" style="flex:1;text-align:center;">${t.label}</button>
        `).join("")}
      </div>
    </div>

    <div class="eyebrow-label">Notifications</div>
    <div class="info-box" style="padding:0 14px;">
      <div style="font-size:12px;color:var(--muted);padding:14px 0 4px;">
        Reminders only fire while Ignyt is open in a browser tab or the installed app — mobile browsers don't allow true background notifications without a push server, so this isn't a set-and-forget alarm.
      </div>
      ${settingToggle("workoutReminders","Workout Reminders","Nudge you in the evening if you haven't logged a workout yet today.")}
      ${settingToggle("hydrationReminders","Hydration Reminders","Nudge you mid-afternoon if you're well behind your water target.")}
      ${settingToggle("weeklyReports","Weekly Reports","Show a summary of the week's training when you open the app.")}
      <div style="padding:14px 0;">
        <button class="btn btn-ghost btn-block" data-action="test-notification">Send Test Notification</button>
        ${typeof Notification!=='undefined' && Notification.permission==='denied' ? `<div style="font-size:11px;color:var(--accent);margin-top:6px;">Notifications are blocked for this site in your browser settings — re-enable them there to use reminders.</div>` : ''}
      </div>
    </div>

    <div class="eyebrow-label">Danger Zone</div>
    <div class="info-box" style="padding:14px;">
      <button class="btn btn-ghost btn-block" data-action="reset-all" style="color:#ff6b6b;">Reset All App Data</button>
    </div>
  `;
}

/* =========================================================
   EVENT HANDLERS
========================================================= */
