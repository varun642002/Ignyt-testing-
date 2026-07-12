import { FINE_TO_BROAD, ICONS, MUSCLE_AVATAR_COLOR, MUSCLE_GROUP_COLOR, PLATE_SIZES, RPE_OPTIONS, SET_TYPE_CYCLE } from './constants.js';
import { state } from './storage.js';
import { render } from './ui.js';

/* =========================================================
   UTILS — small, broadly-reusable helpers with no single domain owner:
   CSV parsing, date/duration formatting, debounce, weight-unit
   conversion, icon rendering, and the plate-math calculator.
========================================================= */

export function csvEscape(s){ s = String(s==null?"":s); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }

export function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

/* Minimal CSV line parser: handles quoted fields containing commas/quotes.
   Deliberately simple (no external library) since this is a small exercise
   list, not a general-purpose data file. */
export function parseCsvText(text){
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i], next = text[i+1];
    if(inQuotes){
      if(c==='"' && next==='"'){ field+='"'; i++; }
      else if(c==='"'){ inQuotes=false; }
      else field += c;
    } else {
      if(c==='"') inQuotes = true;
      else if(c===','){ row.push(field); field=""; }
      else if(c==='\r'){ /* skip */ }
      else if(c==='\n'){ row.push(field); rows.push(row); row=[]; field=""; }
      else field += c;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length===1 && r[0].trim()===""));
}

/* =========================================================
   CSV WORKOUT IMPORT — supports the standard Hevy-style export format
   (title, start_time, end_time, description, exercise_title, superset_id,
   exercise_notes, set_index, set_type, weight_kg, reps, distance_km,
   duration_seconds, rpe) — one row per SET. Verified against a real
   304-session / 4593-row export before writing this, per the "inspect
   before importing" rule: set_type values (normal/warmup/dropset/failure)
   map directly onto this app's own SET_TYPE_CYCLE, weight is already in kg,
   and rpe values already match this app's RPE_OPTIONS format.

   Distance/duration-based cardio sets (Treadmill etc.) are imported with
   blank weight/reps -- so they never corrupt volume or PR math -- with a
   note on the exercise flagging that distance/duration weren't preserved,
   since this app's set schema has no field for them (same honest gap as
   PRs/Race analytics elsewhere in this build).

   Additive only: existing workout history is never touched or replaced.
   Re-importing the same file is safe -- sessions already present (matched
   by title + exact start time) are skipped as duplicates, not re-added.
========================================================= */

export function parseHevyDateTime(str){
  if(!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}) (\w{3}) (\d{4}),\s*(\d{1,2}):(\d{2})$/);
  if(!m) return null;
  const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const mon = MONTHS[m[2]];
  if(mon===undefined) return null;
  const d = new Date(Number(m[3]), mon, Number(m[1]), Number(m[4]), Number(m[5]));
  return isNaN(d.getTime()) ? null : d.getTime();
}

/* Sniffs the header row to decide which importer applies. */

export function formatDuration(ms){
  const totalSec = Math.max(0, Math.floor(ms/1000));
  const h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60), s = totalSec%60;
  return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

export function formatTime(s){ const m=Math.floor(s/60); const r=s%60; return `${m}:${r.toString().padStart(2,'0')}`; }

export function avatarColorFor(muscle){ return MUSCLE_AVATAR_COLOR[muscle] || "#8B8B94"; }

export function muscleGroupColor(muscle){
  return MUSCLE_GROUP_COLOR[FINE_TO_BROAD[muscle]] || (muscle==="Cardio" ? MUSCLE_GROUP_COLOR.Cardio : muscle==="Mobility" ? MUSCLE_GROUP_COLOR.Mobility : "var(--muted)");
}

/* Most-recently-logged exercise names, newest first, deduped. Used to open the
   exercise picker on "Recent" by default the way most workout-logging apps do. */

export const _debounceTimers = {};

export function debounce(key, fn, ms){
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(fn, ms);
}

/* =========================================================
   WEIGHT UNIT CONVERSION — display/input layer only. Every gram of storage
   (set weights, body weight, PRs, volume) stays in kg always, so history,
   PR detection, and volume math never need to know or care which unit the
   screen currently shows. Converting only at the edges (render + input
   handlers) means nothing downstream can drift out of sync.

   Deliberately NOT converted: the plate calculator (lb plates are different
   physical denominations -- 45/35/25/10/5/2.5 -- not just a unit rescale of
   kg plates, so that's a separate feature, not covered here) and the
   BMR/LBM/Ideal-Weight/Body-Fat calculators (their formulas are defined in
   kg/cm; converting those inputs/outputs safely would mean also handling
   height in inches, which is a separate "distance unit" concern).
========================================================= */

export function wUnit(){ return state.settings.weightUnit==="lb" ? "lb" : "kg"; }

export function kgToLb(kg){ return kg*2.2046226218; }

export function lbToKg(lb){ return lb/2.2046226218; }
/* For showing a kg-stored value on screen in the user's preferred unit */

export function displayW(kg, decimals=1){
  const n = Number(kg);
  if(isNaN(n) || kg==="" || kg==null) return "";
  const v = wUnit()==="lb" ? kgToLb(n) : n;
  return decimals===0 ? Math.round(v) : +v.toFixed(decimals);
}
/* For converting a value the user just typed (in their preferred unit) back to kg for storage */

export function parseInputW(raw){
  const n = parseFloat(raw);
  if(isNaN(n)) return raw===""||raw==null ? "" : raw;
  return wUnit()==="lb" ? +lbToKg(n).toFixed(2) : n;
}

/* Plate calculator: greedy plates-per-side for a target barbell weight */
export function calcPlates(target, barWeight){
  if(!target || target <= barWeight) return { perSide:[], remainder:0 };
  let perSideWeight = (target - barWeight)/2;
  const perSide = [];
  let rem = perSideWeight;
  PLATE_SIZES.forEach(p=>{
    const count = Math.floor(rem/p + 1e-9);
    if(count>0){ perSide.push({plate:p, count}); rem = +(rem - count*p).toFixed(3); }
  });
  return { perSide, remainder: rem };
}

export function todayStr(){ return new Date().toISOString().slice(0,10); }

export function svg(name, size=19){ return `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${ICONS[name]}</svg>`; }
