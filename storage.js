import { ALL_DATA_KEYS, SCHEMA_VERSION, SET_TYPE_IMPORT_MAP, VALID_MUSCLES } from './constants.js';
import { csvEscape, downloadFile, parseCsvText, parseHevyDateTime, todayStr } from './utils.js';
import { allLibraryExercises, computeSessionVolume, getMuscle, sessionTitle } from './workout.js';
import { render } from './ui.js';

/* =========================================================
   STORAGE — localStorage wrapper, app state, persistence, migrations,
   onboarding-status resolution, and JSON/CSV backup export & import.
   Nothing here renders HTML.
========================================================= */

export const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

/* ---------- Hyrox 8-week plan data ---------- */

export const state = {
  tab: LS.get("hx_tab","home"),
  activeWeek: LS.get("hx_active_week",1),
  activeLevel: LS.get("hx_active_level","intermediate"),
  activeDayIdx: 0,
  completed: LS.get("hx_completed",{}),
  // SHARED PROFILE — single source of truth for weight/height/age/gender/activity/goal
  profile: Object.assign({
    weight:101, height:180, age:25, gender:"male",
    activityMultiplier:1.465, goalDelta:-400,
    name:"", hyroxExperience:"first-timer", trainingDays:5,
    equipment:["Barbell","Dumbbell","Machines","Sled","Rower","Ski Erg","Kettlebell"]
  }, LS.get("hx_profile",{})),
  onboardingComplete: LS.get("hx_onboarding_complete", null), // resolved to true/false at boot in resolveOnboardingStatus()
  nutrition: Object.assign({proteinPct:30,carbPct:45,fatPct:25,fibreTarget:30},
    LS.get("hx_nutrition",{})),
  mealOpen: null,
  bodylog: LS.get("hx_bodylog",[]),
  customExercises: LS.get("hx_custom_exercises",[]),
  workoutLog: LS.get("hx_workout_log",[]),
  foodLog: LS.get("hx_food_log",[]),
  routines: LS.get("hx_routines",[]),
  routineBuilder: null,
  calc: LS.get("hx_calc", {
    activeCalc:"bmr", result:null,
    neck:38, waist:90, hip:95, restingHR:60,
    bust:90, bwaist:75, highHip:85, bhip:95
  }),
  settings: Object.assign({
    sounds:true, vibration:true, defaultRest:90, keepAwake:false,
    plateCalc:true, rpeTracking:true, autoStartRest:true, waterTargetMl:2500,
    workoutReminders:false, hydrationReminders:false, weeklyReports:false,
    lastWorkoutReminderDate:null, lastHydrationReminderDate:null, lastWeeklyReportAt:null,
    theme:"dark", weightUnit:"kg"
  }, LS.get("hx_settings", {})),
  plateCalcOpen: null, // element id string when plate calc popover open
  restDuration: LS.get("hx_rest_duration",90),
  session: LS.get("hx_active_session", null),
  prs: LS.get("hx_prs", []),
  lastSessionPRs: null, // transient — set right after finishing a workout, shown as a celebration banner
  viewingSessionId: null, // when set, Workout tab shows the detailed history view for this session
  showAllSessions: false,
  editingSessionId: null, // when set, active session editor is patching an existing finished workout instead of creating a new one
  libCategory: "All",
  libSearch: "",
  showCustomForm: false,
  chartMetric: "sets",
  calendarMonthOffset: 0,
  bodyDistWeekOffset: 0,
  progressExercise: null,
  viewingExerciseDetail: null,
  showExercisePicker: false,
  exercisePickerSearch: "",
  exercisePickerEquipment: "All",
  exercisePickerMuscle: "All",
  exercisePickerShowCreate: false,
  exercisePickerContext: "session", // "session" adds to the active workout; "routine" adds to the routine builder
  routineBuilderSets: 3,
  viewingHyroxSchedule: false,
  csvImportPreview: null,
  exerciseMenuOpen: null,
  replacingExerciseIndex: null,
  exerciseDetailTab: "summary",
  raceActive: LS.get("hx_race_active", null),
  raceLog: LS.get("hx_race_log", []),
  viewingRaceMode: !!LS.get("hx_race_active", null),
  achievements: LS.get("hx_achievements", []),
  lastUnlockedAchievements: null, // transient celebration, mirrors lastSessionPRs pattern
  favoriteFoods: LS.get("hx_favorite_foods", []),
  waterLog: LS.get("hx_water_log", []),
  timer: null
};

/* ---------- Derived values from shared profile (auto-recalc everywhere) ---------- */

export function persist(){
  LS.set("hx_tab", state.tab==="more" ? (LS.get("hx_tab","home")) : state.tab);
  LS.set("hx_active_week", state.activeWeek);
  LS.set("hx_active_level", state.activeLevel);
  LS.set("hx_profile", state.profile);
  LS.set("hx_onboarding_complete", state.onboardingComplete);
  LS.set("hx_completed", state.completed);
  LS.set("hx_nutrition", state.nutrition);
  LS.set("hx_bodylog", state.bodylog);
  LS.set("hx_custom_exercises", state.customExercises);
  LS.set("hx_achievements", state.achievements);
  LS.set("hx_favorite_foods", state.favoriteFoods);
  LS.set("hx_water_log", state.waterLog);
  LS.set("hx_race_log", state.raceLog);
  LS.set("hx_race_active", state.raceActive);
  LS.set("hx_workout_log", state.workoutLog);
  LS.set("hx_food_log", state.foodLog);
  LS.set("hx_routines", state.routines);
  LS.set("hx_calc", state.calc);
  LS.set("hx_settings", state.settings);
  LS.set("hx_rest_duration", state.restDuration);
  LS.set("hx_active_session", state.session);
  LS.set("hx_prs", state.prs);
  LS.set("hx_schema_version", SCHEMA_VERSION);
}

/* ---------- Migration: runs once on boot if stored schema is older than current ---------- */

export function runMigrations(){
  const stored = LS.get("hx_schema_version", null);
  if(stored===null){
    // Pre-versioning install (or brand new) — just stamp current version, no data shape to migrate
    LS.set("hx_schema_version", SCHEMA_VERSION);
    return;
  }
  if(stored > SCHEMA_VERSION){
    console.warn("Ignyt: backup/data is from a newer app version ("+stored+" > "+SCHEMA_VERSION+"). Some fields may be ignored.");
    return;
  }
  // Example future migration:
  // if(stored < 2){ /* transform old shape -> new shape here */ LS.set("hx_schema_version", 2); }
  if(stored < SCHEMA_VERSION){
    LS.set("hx_schema_version", SCHEMA_VERSION);
  }
}

/* Decide once whether to show the onboarding wizard. Never interrupts a returning
   user: if hx_onboarding_complete was never set but real usage data already exists
   (this app predates the onboarding feature), it's silently marked complete. */

export function resolveOnboardingStatus(){
  if(state.onboardingComplete !== null) return; // already resolved on a prior boot
  const hasExistingData = state.bodylog.length>0 || state.workoutLog.length>0 ||
    Object.keys(state.completed).length>0 || state.routines.length>0;
  state.onboardingComplete = hasExistingData ? true : false;
  LS.set("hx_onboarding_complete", state.onboardingComplete);
}

/* Applies the resolved theme (dark/light) as a data-attribute on <html> so all
   CSS var overrides cascade. "system" resolves live against the OS preference. */

export function exportAllJSON(){
  const data = { app:"ignyt", version:1, schemaVersion:SCHEMA_VERSION, exportedAt:new Date().toISOString(), data:{} };
  ALL_DATA_KEYS.forEach(k=>{ const v = localStorage.getItem(k); if(v!==null) data.data[k]=v; });
  downloadFile("ignyt-backup-"+todayStr()+".json", JSON.stringify(data,null,2), "application/json");
}

export function exportWorkoutsCSV(){
  const rows = [["date","workout_title","exercise","muscle","set_number","weight_kg","reps","rpe","duration_min","session_volume_kg","notes"]];
  state.workoutLog.slice().reverse().forEach(s=>{
    s.exercises.forEach(ex=>{
      ex.sets.forEach((set,si)=>{
        rows.push([s.date, sessionTitle(s), ex.name, getMuscle(ex.name), si+1, set.weight||"", set.reps||"", set.rpe||"", s.durationMin||"", s.volume?Math.round(s.volume):"", ex.notes||""]);
      });
    });
  });
  // plan completions as their own rows
  Object.entries(state.completed).forEach(([key,ts])=>{
    const [wk,day,exName] = key.split("|");
    rows.push([new Date(ts).toISOString().slice(0,10), "Plan "+wk+" "+day, exName, getMuscle(exName), "", "", "", "", "", "", "plan check-off"]);
  });
  const csv = rows.map(r=>r.map(csvEscape).join(",")).join("\n");
  downloadFile("ignyt-workouts-"+todayStr()+".csv", csv, "text/csv");
}

export function exportMeasurementsCSV(){
  const rows = [["date","weight_kg","sleep_hrs","hrv_ms","waist_cm","chest_cm","arms_cm","bodyfat_pct"]];
  state.bodylog.slice().reverse().forEach(e=>{
    rows.push([e.date, e.weight||"", e.sleep||"", e.hrv||"", e.waist||"", e.chest||"", e.arms||"", e.bodyfat||""]);
  });
  const csv = rows.map(r=>r.map(csvEscape).join(",")).join("\n");
  downloadFile("ignyt-measurements-"+todayStr()+".csv", csv, "text/csv");
}

export function importAllJSON(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    let parsed;
    try{
      parsed = JSON.parse(reader.result);
    }catch(e){
      alert("Could not read that file — it isn't valid JSON.");
      return;
    }
    if(!parsed || typeof parsed!=="object" || (parsed.app!=="ignyt" && parsed.app!=="hyrox-prep") || !parsed.data || typeof parsed.data!=="object"){
      alert("This doesn't look like an Ignyt backup file.");
      return;
    }
    // Validate every value is well-formed JSON before writing anything (all-or-nothing import)
    const staged = {};
    const badKeys = [];
    Object.entries(parsed.data).forEach(([k,v])=>{
      if(!ALL_DATA_KEYS.includes(k)) return; // ignore unknown/future keys rather than failing
      try{ JSON.parse(v); staged[k] = v; }
      catch(e){ badKeys.push(k); }
    });
    if(badKeys.length){
      alert("This backup file is corrupted (bad data for: "+badKeys.join(", ")+"). Nothing was changed.");
      return;
    }
    if(Object.keys(staged).length===0){
      alert("This backup file has no recognizable Ignyt data. Nothing was changed.");
      return;
    }
    if(!confirm("Import will REPLACE all current app data with this backup ("+new Date(parsed.exportedAt||Date.now()).toLocaleDateString()+"). Continue?")) return;
    // Everything validated — commit atomically
    Object.entries(staged).forEach(([k,v])=> localStorage.setItem(k, v));
    location.reload();
  };
  reader.onerror = ()=> alert("Could not read that file.");
  reader.readAsText(file);
}

/* =========================================================
   CSV EXERCISE IMPORT — additive only, never overwrites/deletes anything.
   Scoped deliberately to Custom Exercises: it's the one collection in this
   app with a simple, flat, already-understood shape ({name,cat,presc,unit,
   muscle}). Workout history, PRs, and logs have deep relational/computed
   structure (timestamps, nested sets, derived volume/PRs) that a spreadsheet
   can't safely represent, so those are intentionally NOT importable here.
========================================================= */

export function detectCsvKind(header){
  const h = header.map(c=>c.trim().toLowerCase());
  if(h.includes("exercise_title") && h.includes("start_time") && h.includes("set_type")) return "workouts";
  if(h.includes("name") && h.includes("muscle")) return "exercises";
  if(h.includes("name") && h.includes("calories")) return "foods";
  return "unknown";
}

export function validateFoodsCsv(text){
  let rows;
  try{ rows = parseCsvText(text); }
  catch(e){ return { error:"Could not read this file as CSV." }; }
  if(rows.length < 2) return { error:"This file has no data rows." };

  const header = rows[0].map(h=>h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const calIdx = header.indexOf("calories");
  if(nameIdx===-1 || calIdx===-1){
    return { error:"Missing required column(s): "+[nameIdx===-1?"name":null, calIdx===-1?"calories":null].filter(Boolean).join(", ")+". Found columns: "+header.join(", ") };
  }
  const proteinIdx = header.indexOf("protein");
  const carbsIdx = header.indexOf("carbs");
  const fatIdx = header.indexOf("fat");
  const fibreIdx = header.indexOf("fibre")!==-1 ? header.indexOf("fibre") : header.indexOf("fiber");

  const existingNames = new Set(state.favoriteFoods.map(f=>f.name.trim().toLowerCase()));
  const seenInFile = new Set();
  const validRows = [], invalidRows = [], duplicateRows = [];

  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r.every(c=>c.trim()==="")) continue;
    const name = (r[nameIdx]||"").trim();
    const calories = Number((r[calIdx]||"").trim());
    if(!name || !calories || isNaN(calories)){
      invalidRows.push({ row:i+1, name, reason: !name?"missing name": "missing or invalid calories" });
      continue;
    }
    const key = name.toLowerCase();
    if(existingNames.has(key) || seenInFile.has(key)){
      duplicateRows.push({ row:i+1, name });
      continue;
    }
    seenInFile.add(key);
    validRows.push({
      name, calories,
      protein: proteinIdx!==-1 ? Number(r[proteinIdx])||0 : 0,
      carbs: carbsIdx!==-1 ? Number(r[carbsIdx])||0 : 0,
      fat: fatIdx!==-1 ? Number(r[fatIdx])||0 : 0,
      fibre: fibreIdx!==-1 ? Number(r[fibreIdx])||0 : 0
    });
  }

  return {
    kind: "foods",
    totalRows: rows.length-1,
    validRows, invalidRows, duplicateRows,
    validCount: validRows.length, invalidCount: invalidRows.length, duplicateCount: duplicateRows.length
  };
}

export function validateWorkoutCsv(text){
  let rows;
  try{ rows = parseCsvText(text); }
  catch(e){ return { error:"Could not read this file as CSV." }; }
  if(rows.length < 2) return { error:"This file has no data rows." };

  const header = rows[0].map(h=>h.trim().toLowerCase());
  const need = ["title","start_time","exercise_title","set_type"];
  const missing = need.filter(c=>header.indexOf(c)===-1);
  if(missing.length) return { error:"Missing required column(s): "+missing.join(", ")+". Found columns: "+header.join(", ") };

  const idx = {}; header.forEach((c,i)=> idx[c]=i);
  const col = (r,name)=> idx[name]!==undefined ? (r[idx[name]]||"").trim() : "";

  const existingSessionKeys = new Set(state.workoutLog.map(s=>s.title+"|"+s.startedAt));

  const sessionOrder = [];         // preserves file order for chronological backfill
  const sessionsByKey = new Map(); // key -> accumulator
  let invalidRows = [];

  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r.every(c=>c.trim()==="")) continue;
    const title = col(r,"title") || "Workout";
    const startTs = parseHevyDateTime(col(r,"start_time"));
    const exerciseTitle = col(r,"exercise_title");
    if(!exerciseTitle || startTs===null){
      invalidRows.push({ row:i+1, reason: !exerciseTitle ? "missing exercise_title" : "unparseable start_time" });
      continue;
    }
    const endTs = parseHevyDateTime(col(r,"end_time"));
    const key = title+"|"+startTs;
    if(!sessionsByKey.has(key)){
      sessionsByKey.set(key, {
        title, startedAt: startTs, finishedAt: endTs,
        notes: col(r,"description"), exercisesByName: new Map(), exerciseOrder: []
      });
      sessionOrder.push(key);
    }
    const sess = sessionsByKey.get(key);
    if(!sess.exercisesByName.has(exerciseTitle)){
      sess.exercisesByName.set(exerciseTitle, { name: exerciseTitle, notes: col(r,"exercise_notes"), sets: [], hasCardio:false });
      sess.exerciseOrder.push(exerciseTitle);
    }
    const ex = sess.exercisesByName.get(exerciseTitle);
    const weight = col(r,"weight_kg");
    const reps = col(r,"reps");
    const distance = col(r,"distance_km");
    const duration = col(r,"duration_seconds");
    if((distance || duration) && !weight && !reps) ex.hasCardio = true;
    ex.sets.push({
      weight: weight || "", reps: reps || "",
      rpe: col(r,"rpe") || "", done:true,
      type: SET_TYPE_IMPORT_MAP[col(r,"set_type").toLowerCase()] || "working"
    });
  }

  const validSessions = [], duplicateSessions = [];
  sessionOrder.forEach(key=>{
    const s = sessionsByKey.get(key);
    const exercises = s.exerciseOrder.map(name=>{
      const ex = s.exercisesByName.get(name);
      return {
        name: ex.name,
        notes: ex.hasCardio ? (ex.notes ? ex.notes+" " : "")+"(Imported cardio set — distance/duration not preserved, this app tracks weight/reps only.)" : ex.notes,
        restDuration: 90,
        sets: ex.sets
      };
    });
    const durationMin = s.finishedAt ? Math.max(1, Math.round((s.finishedAt-s.startedAt)/60000)) : null;
    const volume = computeSessionVolume(exercises);
    const session = {
      id: s.startedAt, // stable id derived from the real timestamp so re-import dedup works
      date: new Date(s.startedAt).toISOString().slice(0,10),
      startedAt: s.startedAt, finishedAt: s.finishedAt, durationMin, volume,
      exercises, notes: s.notes, title: s.title
    };
    if(existingSessionKeys.has(s.title+"|"+s.startedAt)) duplicateSessions.push(session);
    else validSessions.push(session);
  });

  return {
    kind: "workouts",
    totalRows: rows.length-1,
    sessionsFound: sessionOrder.length,
    validSessions, invalidRows, duplicateSessions,
    validCount: validSessions.length, invalidCount: invalidRows.length, duplicateCount: duplicateSessions.length
  };
}

export function validateExerciseCsv(text){
  let rows;
  try{ rows = parseCsvText(text); }
  catch(e){ return { error: "Could not read this file as CSV." }; }

  if(rows.length < 2) return { error: "This file has no data rows (needs a header row plus at least one exercise)." };

  const header = rows[0].map(h=>h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const muscleIdx = header.indexOf("muscle");
  if(nameIdx===-1 || muscleIdx===-1){
    return { error: "Missing required column(s): "+[nameIdx===-1?"name":null, muscleIdx===-1?"muscle":null].filter(Boolean).join(", ")+". Found columns: "+(header.join(", ")||"(none)") };
  }
  const catIdx = header.indexOf("cat");
  const prescIdx = header.indexOf("presc");
  const unitIdx = header.indexOf("unit");

  const existingNames = new Set(allLibraryExercises().map(e=>e.name.trim().toLowerCase()));
  const seenInFile = new Set();
  const validRows = [], invalidRows = [], duplicateRows = [];

  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r.every(c=>c.trim()==="")) continue; // skip fully blank lines
    const name = (r[nameIdx]||"").trim();
    const muscle = (r[muscleIdx]||"").trim();
    const cat = catIdx!==-1 ? (r[catIdx]||"").trim() : "";
    const presc = prescIdx!==-1 ? (r[prescIdx]||"").trim() : "";
    const unit = unitIdx!==-1 ? (r[unitIdx]||"").trim() : "";

    if(!name || !muscle || !VALID_MUSCLES.includes(muscle)){
      invalidRows.push({ row:i+1, name, muscle, reason: !name?"missing name": !muscle?"missing muscle": "unrecognized muscle '"+muscle+"'" });
      continue;
    }
    const key = name.toLowerCase();
    if(existingNames.has(key) || seenInFile.has(key)){
      duplicateRows.push({ row:i+1, name });
      continue;
    }
    seenInFile.add(key);
    validRows.push({ name, muscle, cat: cat || "Custom", presc: presc || "3x10", unit: unit || "reps" });
  }

  return {
    kind: "exercises",
    totalRows: rows.length-1,
    validRows, invalidRows, duplicateRows,
    validCount: validRows.length, invalidCount: invalidRows.length, duplicateCount: duplicateRows.length
  };
}

export function importCsv(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    let rows;
    try{ rows = parseCsvText(reader.result); }
    catch(e){ alert("Couldn't read this file as CSV."); return; }
    if(!rows.length){ alert("This file appears to be empty."); return; }
    const kind = detectCsvKind(rows[0]);
    if(kind==="unknown"){
      alert("Couldn't recognize this CSV's columns. Expected an exercise list (name, muscle, …), a Hevy-style workout export (title, start_time, exercise_title, set_type, …), or a foods list (name, calories, …).");
      return;
    }
    const result = kind==="workouts" ? validateWorkoutCsv(reader.result)
      : kind==="foods" ? validateFoodsCsv(reader.result)
      : validateExerciseCsv(reader.result);
    if(result.error){
      alert("Couldn't import this file: "+result.error);
      return;
    }
    state.csvImportPreview = result; // show summary; nothing written until user confirms
    render();
  };
  reader.onerror = ()=> alert("Could not read that file.");
  reader.readAsText(file);
}
