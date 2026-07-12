import { ACTIVITY_KCAL_PER_MIN, BODY_MUSCLES, FINE_TO_BROAD, LIBRARY, PHASE_LABEL, PLAN_MUSCLE_MAP, RADAR_MUSCLES, SET_TYPE_CYCLE } from './constants.js';
import { displayW, wUnit } from './utils.js';
import { LS, state } from './storage.js';

/* =========================================================
   WORKOUT — HYROX plan structure, Race Mode logic, PR detection,
   achievements, set/session helpers, and workout-history/progress
   computations. The exercise/plan DATA itself lives in constants.js;
   this is the logic that operates on it.
========================================================= */

export function phaseFor(w){ if(w<=2)return"base"; if(w<=4)return"build"; if(w<=6)return"load"; if(w===7)return"peak"; return"deload"; }

export function buildWeek(w, level){
  level = level || "intermediate";
  const p = phaseFor(w);
  const T = {
    base:{squat:"4x6 @ RPE 6-7",rdl:"3x8 @ moderate",lunge:"3x12/leg, light DB",bench:"4x6 @ RPE 6-7",row:"4x8 @ moderate",ohp:"3x8 @ moderate",carry:"4x40m, moderate load",intervals:"6x400m hard, 90s rest",z2:"35 min steady, conversational",sled:"3 rounds, light-mod, focus technique",wallball:"3x15 @ 6-9kg",burpee:"3x8 broad jump burpees",ski:"3x200m",pallof:"3x10/side, light band",hanging:"3x8-10 knee raises",situp:"3x10 bodyweight"},
    build:{squat:"4x5 @ +5-10%, RPE 7",rdl:"3x8 @ +5% load",lunge:"3x12/leg, moderate DB",bench:"4x5 @ +5% load",row:"4x8 @ +5% load",ohp:"3x8 @ +5% load",carry:"4x40m, heavier load",intervals:"7x400m hard, 75s rest",z2:"40 min steady, conversational",sled:"4 rounds, moderate load",wallball:"4x15 @ 6-9kg",burpee:"3x10 broad jump burpees",ski:"4x250m",pallof:"3x12/side, moderate band",hanging:"3x10 leg raises",situp:"3x12 weighted, light plate"},
    load:{squat:"5x5 @ +5%, RPE 7-8",rdl:"4x6 @ +5-10% load",lunge:"4x12/leg, heavier DB",bench:"5x5 @ +5% load",row:"4x10 @ +5% load",ohp:"4x6 @ +5% load",carry:"4x50m, heavier load",intervals:"8x400m hard, 75s rest",z2:"45 min steady, conversational",sled:"4 rounds, race-approaching load",wallball:"4x15-20 @ 9kg",burpee:"4x10 broad jump burpees",ski:"4x300m",pallof:"3x12/side, heavier band",hanging:"3x12 straight leg raises",situp:"3x12-15 weighted"},
    peak:{squat:"5x5 @ +5%, RPE 8",rdl:"4x6 @ +5% load",lunge:"4x12/leg, heaviest DB",bench:"5x5 @ +5% load",row:"4x10 @ +5% load",ohp:"4x6 @ +5% load",carry:"5x50m, heaviest load",intervals:"6x800m hard, 2min rest",z2:"45-50 min steady",sled:"5 rounds, near race load",wallball:"5x15-20 @ 9kg",burpee:"4x10-12 broad jump burpees",ski:"5x300m",pallof:"3x12/side, heaviest band",hanging:"3x12-15 straight leg raises",situp:"4x15 weighted"},
    deload:{squat:"3x5 @ light, RPE 5",rdl:"3x6 @ light",lunge:"2x12/leg, light",bench:"3x5 @ light",row:"3x8 @ light",ohp:"3x6 @ light",carry:"3x40m, moderate",intervals:"4x400m moderate, full recovery",z2:"25 min easy",sled:"2 rounds, light, technique refresh",wallball:"3x12 @ 6kg",burpee:"2x8",ski:"3x200m easy",pallof:"2x10/side, light",hanging:"2x8 knee raises",situp:"2x10 bodyweight"}
  }[p];

  // Level scaling: beginner strips one set / eases conditioning; advanced adds a set / extends conditioning
  function scale(presc, kind){
    if(level==="intermediate") return presc;
    const m = /^(\d+)x/.exec(presc);
    if(level==="beginner"){
      if(m){ const sets=Math.max(2, Number(m[1])-1); presc = presc.replace(/^\d+x/, sets+"x"); }
      presc = presc.replace(/(\d+)x(\d+)m/, (s,r,d)=> r+"x"+d+"m"); // carries stay
      if(kind==="cond") presc += ", longer rest";
      return presc;
    }
    if(level==="advanced"){
      if(m){ const sets=Number(m[1])+1; presc = presc.replace(/^\d+x/, sets+"x"); }
      if(kind==="cond") presc += ", minimal rest";
      return presc;
    }
    return presc;
  }

  return {
    week:w, phase:p, phaseLabel:PHASE_LABEL[p], level,
    days:[
      {day:"Day 1",session:"Lower Body Strength",exercises:[
        {name:"Back Squat",presc:scale(T.squat)},{name:"Romanian Deadlift",presc:scale(T.rdl)},
        {name:"Walking Lunges",presc:scale(T.lunge)},{name:"Plank",presc:"3x45s"},
        {name:"Pallof Press",presc:scale(T.pallof),note:"Core finisher — anti-rotation, resists sled drift"}]},
      {day:"Day 2",session:"Run Intervals",exercises:[
        {name:"Warm-up",presc:"10 min easy jog"},{name:"Intervals",presc:scale(T.intervals,"cond")},
        {name:"Cool-down",presc:"10 min easy jog"}]},
      {day:"Day 3",session:"Upper Body + Carries",exercises:[
        {name:"Bench Press",presc:scale(T.bench)},{name:"Bent-Over Row",presc:scale(T.row)},
        {name:"Overhead Press",presc:scale(T.ohp)},{name:"Farmer's Carry",presc:scale(T.carry)},
        {name:"Hanging Leg Raise",presc:scale(T.hanging),note:"Core finisher — swap for dead bug if grip is fried"}]},
      {day:"Day 4",session:"Zone 2 Steady State",exercises:[
        {name:"Row / Ski / Run",presc:scale(T.z2),note:"Stay conversational — don't drift into threshold"}]},
      {day:"Day 5",session:"Hyrox Station Circuit",exercises:[
        {name:"Sled Push/Pull",presc:scale(T.sled,"cond")},{name:"Wall Balls",presc:scale(T.wallball,"cond")},
        {name:"Burpee Broad Jumps",presc:scale(T.burpee,"cond")},{name:"Ski Erg",presc:scale(T.ski,"cond")},
        {name:"Weighted Sit-Up",presc:scale(T.situp),note:"Core finisher — race-specific, done under fatigue"}]},
      {day:"Day 6",session:"Optional — Easy Movement",exercises:[
        {name:"Walk / Mobility / Light Swim",presc:"20-30 min, low intensity",note:"Skip if fatigue score is high"}]}
    ]
  };
}
// WEEKS is rebuilt for the active level whenever it changes

// Starts empty rather than reading LS.get(...) directly here: this module and storage.js
// import from each other (a legitimate cycle -- storage.js's CSV validators need workout
// helpers), and evaluating LS.get() at this module's top level can run before storage.js's
// own top-level code has finished, in the specific case where storage.js is what pulled this
// module in. app.js's bootstrap calls rebuildWeeks() (which reads state.activeLevel, already
// safe since that's set in storage.js's own module body) right after all modules are loaded
// and before the first render, so WEEKS is always populated before anything reads it.

export let WEEKS = [];

export function rebuildWeeks(){ WEEKS = Array.from({length:8},(_,i)=>buildWeek(i+1, state.activeLevel)); }

/* ---------- Exercise library ---------- */

export function recentExerciseNames(limit=10){
  const seen = new Set();
  const out = [];
  for(const session of state.workoutLog){
    for(const ex of session.exercises){
      if(!seen.has(ex.name)){ seen.add(ex.name); out.push(ex.name); }
      if(out.length>=limit) return out;
    }
  }
  return out;
}

export function allLibraryExercises(){
  const custom = LS.get("hx_custom_exercises", []);
  const list = [];
  Object.entries(LIBRARY).forEach(([cat, items])=> items.forEach(([name,presc,unit,muscle])=> list.push({name,cat,presc,unit,muscle,custom:false})));
  custom.forEach(ex=> list.push({...ex, custom:true}));
  return list;
}

export function getMuscle(name){
  for(const items of Object.values(LIBRARY)){
    const hit = items.find(i=>i[0]===name);
    if(hit) return hit[3];
  }
  const custom = LS.get("hx_custom_exercises", []);
  const c = custom.find(i=>i.name===name);
  if(c) return c.muscle || "Other";
  if(PLAN_MUSCLE_MAP[name]) return PLAN_MUSCLE_MAP[name];
  return "Other";
}

export function parseSets(presc){
  const m = /^(\d+)\s*x/i.exec(presc||"");
  return m ? Number(m[1]) : 3;
}

export function getPlanPresc(weekNum, dayName, exName){
  const w = WEEKS[weekNum-1];
  if(!w) return "";
  const d = w.days.find(dd=>dd.day===dayName);
  if(!d) return "";
  const ex = d.exercises.find(e=>e.name===exName);
  return ex ? ex.presc : "";
}

/* ---------- Icons (inline SVG, no deps) ---------- */

export function weekProgress(w){
  let total=0, done=0;
  w.days.forEach(d=>d.exercises.forEach(ex=>{ total++; if(state.completed[`${w.week}|${d.day}|${ex.name}`]) done++; }));
  return total? Math.round(done/total*100):0;
}

/* =========================================================
   HOME TAB — dashboard
========================================================= */

export function overallPlanProgress(){
  let total=0, done=0;
  WEEKS.forEach(w=> w.days.forEach(d=> d.exercises.forEach(ex=>{
    total++; if(state.completed[`${w.week}|${d.day}|${ex.name}`]) done++;
  })));
  return total? Math.round(done/total*100):0;
}

export function todaysPlannedDay(){
  // Best-effort mapping: today's weekday index -> plan day index (Mon=Day1...Sat=Day6, Sun=rest)
  const dow = new Date().getDay(); // 0=Sun..6=Sat
  const idx = dow===0 ? null : dow-1; // Mon(1)->0 ... Sat(6)->5
  const week = WEEKS[state.activeWeek-1];
  if(idx===null || idx>=week.days.length) return null;
  return week.days[idx];
}

export function bestRaceTime(){
  if(!state.raceLog.length) return null;
  return Math.min(...state.raceLog.map(r=>r.totalMs));
}

export function estimatedOneRM(weight, reps){
  // Epley formula — standard estimate, most reliable under ~12 reps
  return weight * (1 + reps/30);
}

export function computeHistoricalBests(){
  const bests = {}; // { [exerciseName]: { weight, oneRM, repsAtWeight:{ "60":8 } } }
  let maxVolume = 0;
  state.workoutLog.forEach(session=>{
    if(session.volume && session.volume > maxVolume) maxVolume = session.volume;
    (session.exercises||[]).forEach(ex=>{
      if(!bests[ex.name]) bests[ex.name] = { weight:0, oneRM:0, repsAtWeight:{} };
      (ex.sets||[]).forEach(s=>{
        if(!isCountingSet(s)) return;
        const w = parseFloat(s.weight), r = parseFloat(s.reps);
        if(isNaN(w) || isNaN(r) || r<=0) return;
        if(w > bests[ex.name].weight) bests[ex.name].weight = w;
        const orm = estimatedOneRM(w,r);
        if(orm > bests[ex.name].oneRM) bests[ex.name].oneRM = orm;
        const wKey = String(w);
        if(!bests[ex.name].repsAtWeight[wKey] || r > bests[ex.name].repsAtWeight[wKey]) bests[ex.name].repsAtWeight[wKey] = r;
      });
    });
  });
  return { bests, maxVolume };
}

export function makePR(exerciseName, type, value, previousValue, workoutId, achievedAt, weightContext){
  const improvementPct = (previousValue>0) ? Math.round((value-previousValue)/previousValue*1000)/10 : null;
  return {
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    exerciseName, type, value, previousValue, improvementPct, workoutId, achievedAt,
    weightContext: weightContext!=null ? weightContext : null
  };
}

/* Runs once per finished session, against bests computed from PRIOR history only
   (the session being detected hasn't been pushed to workoutLog yet), so re-finishing
   or re-rendering never produces duplicate PRs. */

export function detectPRs(session, workoutId, finishedAt, sessionVolume){
  const { bests, maxVolume } = computeHistoricalBests();
  const newPRs = [];

  (session.exercises||[]).forEach(ex=>{
    const validSets = (ex.sets||[]).filter(s=>{
      if(!isCountingSet(s)) return false;
      const w = parseFloat(s.weight), r = parseFloat(s.reps);
      return !isNaN(w) && !isNaN(r) && r>0;
    });
    if(!validSets.length) return;

    // Best set of THIS session for this exercise: highest weight, tie-break by higher reps
    let bestSet = validSets[0];
    validSets.forEach(s=>{
      const w = parseFloat(s.weight), bw = parseFloat(bestSet.weight);
      if(w>bw || (w===bw && parseFloat(s.reps)>parseFloat(bestSet.reps))) bestSet = s;
    });
    const w = parseFloat(bestSet.weight), r = parseFloat(bestSet.reps);
    const orm = estimatedOneRM(w, r);
    const prior = bests[ex.name] || { weight:0, oneRM:0, repsAtWeight:{} };

    if(w > prior.weight){
      newPRs.push(makePR(ex.name, "weight", w, prior.weight, workoutId, finishedAt));
    }
    if(orm > prior.oneRM){
      newPRs.push(makePR(ex.name, "1rm", Math.round(orm*10)/10, Math.round(prior.oneRM*10)/10, workoutId, finishedAt));
    }
    const priorRepsAtThisWeight = prior.repsAtWeight[String(w)] || 0;
    if(r > priorRepsAtThisWeight){
      newPRs.push(makePR(ex.name, "reps", r, priorRepsAtThisWeight, workoutId, finishedAt, w));
    }
  });

  if(sessionVolume > maxVolume && sessionVolume > 0){
    newPRs.push(makePR(null, "volume", Math.round(sessionVolume), Math.round(maxVolume), workoutId, finishedAt));
  }
  return newPRs;
}

export function prTypeLabel(pr){
  if(pr.type==="weight") return "Heaviest Weight";
  if(pr.type==="1rm") return "Est. 1RM";
  if(pr.type==="reps") return "Most Reps @ "+displayW(pr.weightContext)+wUnit();
  if(pr.type==="volume") return "Session Volume";
  return pr.type;
}

export function prValueLabel(pr){
  if(pr.type==="reps") return pr.value+" reps";
  if(pr.type==="volume") return displayW(pr.value,0).toLocaleString()+" "+wUnit();
  return displayW(pr.value)+" "+wUnit();
}

/* =========================================================
   EXERCISE PICKER — full-screen searchable "Add Exercise" flow
========================================================= */

export function nextSetType(t){
  const i = SET_TYPE_CYCLE.indexOf(t||"working");
  return SET_TYPE_CYCLE[(i+1) % SET_TYPE_CYCLE.length];
}
/* Volume/PR-eligible sets exclude warm-ups (standard practice — warmups don't represent
   a working effort). Backward-compatible: sets logged before this feature have no `type`
   field and are treated as "working". */

export function isCountingSet(set){ return (set.type||"working") !== "warmup"; }

export function computeSessionVolume(exercises){
  let v = 0;
  (exercises||[]).forEach(ex=> (ex.sets||[]).forEach(s=>{
    if(!isCountingSet(s)) return;
    const w = parseFloat(s.weight), r = parseFloat(s.reps);
    if(!isNaN(w) && !isNaN(r)) v += w*r;
  }));
  return v;
}

export function getPreviousSet(exerciseName, setIndex){
  for(const sess of state.workoutLog){
    const ex = sess.exercises.find(e=>e.name===exerciseName);
    if(ex && ex.sets.length){
      const set = ex.sets[setIndex] || ex.sets[ex.sets.length-1];
      if(set && (set.weight||set.reps)) return set;
    }
  }
  return null;
}

export function sessionMuscles(exercises){
  const set = new Set();
  exercises.forEach(ex=> set.add(getMuscle(ex.name)));
  return Array.from(set);
}

export function sessionTitle(s){
  return (s && s.title && s.title.trim()) ? s.title.trim() : "Workout";
}

/* Shared debounce for expensive re-render-on-keystroke handlers (search inputs).
   Keyed by name so multiple independent debounced actions don't clobber each other. */

export function exerciseHistoryEntries(name){
  return state.workoutLog
    .filter(s=> s.exercises.some(e=>e.name===name))
    .map(s=>{
      const ex = s.exercises.find(e=>e.name===name);
      const prsThisSession = state.prs.filter(p=> p.workoutId===s.id && p.exerciseName===name);
      return { date:s.date, title: sessionTitle(s), sets: ex.sets, notes: ex.notes, prs: prsThisSession };
    });
}

export function exercisePRs(name){
  return state.prs.filter(p=>p.exerciseName===name).sort((a,b)=>b.achievedAt-a.achievedAt);
}

export function activityDates(){
  // Set of "YYYY-MM-DD" strings with any logged activity (plan completions or freestyle sessions)
  const dates = new Set();
  Object.values(state.completed).forEach(ts=> dates.add(new Date(ts).toISOString().slice(0,10)));
  state.workoutLog.forEach(s=> dates.add(s.date));
  return dates;
}

export function computeStreak(){
  const dates = activityDates();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0,0,0,0);
  // if today has no activity yet, start counting from yesterday (still an active streak)
  if(!dates.has(cursor.toISOString().slice(0,10))) cursor.setDate(cursor.getDate()-1);
  while(dates.has(cursor.toISOString().slice(0,10))){
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

export function computeMuscleDistribution(daysBack, offsetDays){
  // offsetDays=0 => most recent `daysBack` days. offsetDays=daysBack => the period before that.
  const now = Date.now();
  const end = now - offsetDays*86400000;
  const start = end - daysBack*86400000;
  const counts = {}; RADAR_MUSCLES.forEach(m=> counts[m]=0);

  Object.entries(state.completed).forEach(([key, ts])=>{
    if(ts < start || ts > end) return;
    const [wk,,exName] = key.split("|");
    const broad = FINE_TO_BROAD[getMuscle(exName)];
    if(broad){
      const presc = getPlanPresc(Number(wk), key.split("|")[1], exName);
      counts[broad] += parseSets(presc);
    }
  });
  state.workoutLog.forEach(s=>{
    const t = new Date(s.date).getTime();
    if(t < start || t > end) return;
    s.exercises.forEach(ex=>{
      const broad = FINE_TO_BROAD[getMuscle(ex.name)];
      if(broad) counts[broad] += ex.sets.length;
    });
  });
  return counts;
}

// Fine-grained per-muscle set counts within [startTs, endTs), for the Body Distribution table

export function computeMuscleDistributionFine(startTs, endTs){
  const counts = {}; BODY_MUSCLES.forEach(m=> counts[m]=0);
  Object.entries(state.completed).forEach(([key, ts])=>{
    if(ts < startTs || ts >= endTs) return;
    const [wk,day,exName] = key.split("|");
    const muscle = getMuscle(exName);
    if(counts.hasOwnProperty(muscle)){
      const presc = getPlanPresc(Number(wk), day, exName);
      counts[muscle] += parseSets(presc);
    }
  });
  state.workoutLog.forEach(s=>{
    const t = new Date(s.date).getTime();
    if(t < startTs || t >= endTs) return;
    s.exercises.forEach(ex=>{
      const muscle = getMuscle(ex.name);
      if(counts.hasOwnProperty(muscle)) counts[muscle] += ex.sets.length;
    });
  });
  return counts;
}

/* Monday-start week boundaries for a given offset (0 = current week, 1 = last week, ...) */

export function weekRange(weekOffset){
  const now = new Date();
  const day = (now.getDay()+6)%7; // Mon=0
  const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate()-day-7*weekOffset);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+7);
  return { start: monday, end: sunday };
}

export function thisWeekStats(){
  const now = Date.now();
  const cutoff = now - 7*86400000;
  const sessionsThisWeek = state.workoutLog.filter(s=> new Date(s.date).getTime() >= cutoff);
  const trainingMinutes = sessionsThisWeek.reduce((a,s)=>a+(s.durationMin||0), 0);
  const weeklyVolume = sessionsThisWeek.reduce((a,s)=>a+(s.volume||0), 0);
  const caloriesBurned = Math.round(trainingMinutes * ACTIVITY_KCAL_PER_MIN);

  const hyroxDaySet = new Set();
  Object.entries(state.completed).forEach(([key,ts])=>{
    if(ts>=cutoff){ const [wk,day] = key.split("|"); hyroxDaySet.add(wk+"|"+day); }
  });

  return {
    workoutsCompleted: sessionsThisWeek.length,
    workoutsGoal: state.profile.trainingDays || null, // real user setting from onboarding, or null if never set
    trainingMinutes,
    weeklyVolume: Math.round(weeklyVolume),
    caloriesBurned,
    currentStreak: computeStreak(),
    hyroxSessions: hyroxDaySet.size
  };
}

export function computeWeeklyActivity(weeks=8){
  const buckets = Array.from({length:weeks},(_,i)=>({duration:0, volume:0, sets:0}));
  const now = Date.now();
  state.workoutLog.forEach(s=>{
    const t = new Date(s.date).getTime();
    const idx = Math.floor((now - t) / (7*86400000));
    if(idx>=0 && idx<weeks){
      const b = buckets[weeks-1-idx];
      b.duration += s.durationMin || 0;
      b.volume += s.volume || 0;
      b.sets += s.exercises.reduce((a,ex)=>a+ex.sets.length,0);
    }
  });
  Object.values(state.completed).forEach((ts,i)=>{
    const idx = Math.floor((now - ts) / (7*86400000));
    if(idx>=0 && idx<weeks){
      buckets[weeks-1-idx].sets += 1; // rough count; plan sets already reflected via radar, this is activity volume proxy
    }
  });
  return buckets;
}

/* --- SVG radar chart --- */

export function totalLifetimeVolume(){ return state.workoutLog.reduce((a,s)=>a+(s.volume||0),0); }

export function totalWorkingSets(){ return state.workoutLog.reduce((a,s)=>a+s.exercises.reduce((x,e)=>x+e.sets.filter(isCountingSet).length,0),0); }

export const ACHIEVEMENT_DEFS = [
  { id:"first_workout", name:"First Workout", desc:"Complete your first freestyle workout.", check:()=> state.workoutLog.length>=1 },
  { id:"workouts_5", name:"5 Workouts", desc:"Log 5 freestyle workouts.", check:()=> state.workoutLog.length>=5 },
  { id:"workouts_10", name:"10 Workouts", desc:"Log 10 freestyle workouts.", check:()=> state.workoutLog.length>=10 },
  { id:"workouts_25", name:"25 Workouts", desc:"Log 25 freestyle workouts.", check:()=> state.workoutLog.length>=25 },
  { id:"workouts_50", name:"50 Workouts", desc:"Log 50 freestyle workouts.", check:()=> state.workoutLog.length>=50 },
  { id:"workouts_100", name:"100 Workouts", desc:"Log 100 freestyle workouts.", check:()=> state.workoutLog.length>=100 },
  { id:"workouts_250", name:"250 Workouts", desc:"Log 250 freestyle workouts.", check:()=> state.workoutLog.length>=250 },
  { id:"workouts_500", name:"500 Workouts", desc:"Log 500 freestyle workouts.", check:()=> state.workoutLog.length>=500 },
  { id:"first_pr", name:"First Personal Record", desc:"Set your first PR.", check:()=> state.prs.length>=1 },
  { id:"first_100kg", name:"First 100kg Lift", desc:"Hit 100kg or more on any lift.", check:()=> state.prs.some(p=>p.type==="weight" && p.value>=100) },
  { id:"sets_100", name:"100 Working Sets", desc:"Log 100 working sets total.", check:()=> totalWorkingSets()>=100 },
  { id:"volume_1m", name:"1,000,000kg Lifetime Volume", desc:"Move a million kg over your lifetime.", check:()=> totalLifetimeVolume()>=1000000 },
  { id:"hyrox_week1", name:"Complete HYROX Week 1", desc:"Finish every session in Week 1 of the program.", check:()=> weekProgress(WEEKS[0])===100 },
  { id:"hyrox_full_program", name:"Complete 8-Week HYROX Program", desc:"Finish the entire 8-week structured program.", check:()=> overallPlanProgress()===100 },
  { id:"streak_3", name:"3-Day Streak", desc:"Train 3 days in a row.", check:()=> computeStreak()>=3 },
  { id:"streak_7", name:"7-Day Streak", desc:"Train 7 days in a row.", check:()=> computeStreak()>=7 },
  { id:"streak_14", name:"14-Day Streak", desc:"Train 14 days in a row.", check:()=> computeStreak()>=14 },
  { id:"streak_30", name:"30-Day Streak", desc:"Train 30 days in a row.", check:()=> computeStreak()>=30 },
  { id:"streak_60", name:"60-Day Streak", desc:"Train 60 days in a row.", check:()=> computeStreak()>=60 },
  { id:"streak_100", name:"100-Day Streak", desc:"Train 100 days in a row.", check:()=> computeStreak()>=100 }
];

/* Call after any action that could unlock an achievement (finish workout,
   check off a plan exercise). Idempotent -- never re-awards or duplicates
   an achievement already in state.achievements. Returns newly unlocked ones
   so callers can show a celebration if desired. */

export function checkAchievements(){
  const unlockedIds = new Set(state.achievements.map(a=>a.id));
  const newlyUnlocked = [];
  ACHIEVEMENT_DEFS.forEach(def=>{
    if(unlockedIds.has(def.id)) return;
    if(def.check()){
      const a = { id:def.id, name:def.name, desc:def.desc, achievedAt: Date.now() };
      state.achievements.push(a);
      newlyUnlocked.push(a);
    }
  });
  return newlyUnlocked;
}

export function computeLongestStreak(){
  const dates = Array.from(activityDates()).sort();
  if(dates.length===0) return 0;
  let longest = 1, cur = 1;
  for(let i=1;i<dates.length;i++){
    const prev = new Date(dates[i-1]);
    const currD = new Date(dates[i]);
    const diffDays = Math.round((currD-prev)/86400000);
    if(diffDays===1){ cur++; longest = Math.max(longest,cur); }
    else if(diffDays>1){ cur = 1; }
  }
  return longest;
}

export function totalTrainingTimeMin(){
  return state.workoutLog.reduce((a,s)=>a+(s.durationMin||0), 0);
}

export function workoutsPerWeekAvg(){
  if(state.workoutLog.length===0) return 0;
  const dates = state.workoutLog.map(s=>new Date(s.date)).sort((a,b)=>a-b);
  const spanDays = Math.max(1, Math.round((dates[dates.length-1]-dates[0])/86400000)+1);
  return +(state.workoutLog.length / (spanDays/7)).toFixed(1);
}

export function exercisesWithHistory(){
  const names = new Set();
  state.workoutLog.forEach(s=> s.exercises.forEach(ex=>{
    if(ex.sets.some(st=>{ const w=parseFloat(st.weight), r=parseFloat(st.reps); return !isNaN(w)&&!isNaN(r)&&r>0; })) names.add(ex.name);
  }));
  return Array.from(names).sort();
}

/* Chronological best-set-per-session series for one exercise: weight + estimated 1RM over time */

export function exerciseProgressTrend(name, limit=20){
  const sessions = state.workoutLog.slice().reverse(); // oldest first
  const out = [];
  sessions.forEach(s=>{
    const ex = s.exercises.find(e=>e.name===name);
    if(!ex) return;
    const validSets = ex.sets.filter(st=>{
      const w=parseFloat(st.weight), r=parseFloat(st.reps);
      return !isNaN(w) && !isNaN(r) && r>0 && isCountingSet(st);
    });
    if(!validSets.length) return;
    let best = validSets[0];
    validSets.forEach(st=>{
      const w=parseFloat(st.weight), bw=parseFloat(best.weight);
      if(w>bw || (w===bw && parseFloat(st.reps)>parseFloat(best.reps))) best = st;
    });
    const w = parseFloat(best.weight), r = parseFloat(best.reps);
    out.push({date:s.date, weight:w, oneRM: Math.round(estimatedOneRM(w,r)*10)/10});
  });
  return out.slice(-limit);
}

export function monthlyComparison(){
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;
  function statsFor(monthKey){
    const sessions = state.workoutLog.filter(s=>s.date.startsWith(monthKey));
    return {
      sessions: sessions.length,
      volume: Math.round(sessions.reduce((a,s)=>a+(s.volume||0),0)),
      minutes: sessions.reduce((a,s)=>a+(s.durationMin||0),0)
    };
  }
  return { thisMonth: statsFor(thisMonthKey), lastMonth: statsFor(lastMonthKey) };
}
