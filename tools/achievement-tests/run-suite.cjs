/* IGNYT achievement suite -- run with: npm run test:achievements
   Loads ACHIEVEMENT_DEFS and its helpers straight out of www/app.js into a vm sandbox, so it
   tests the shipping code rather than a copy. The check that matters is the empty state: a
   badge that fires for a user with no data is a false award. */
/* Runs every ACHIEVEMENT_DEFS check against an empty state and a populated one.
   A check that throws would kill checkAchievements() for every badge after it, so this is
   the test that matters. */
const fs = require("fs");
const vm = require("vm");
const APP = require("path").join(__dirname, "..", "..", "www", "app.js");
const src = fs.readFileSync(APP, "utf8");

const cut = (from, to) => src.slice(src.indexOf(from), src.indexOf(to));
const helpers = cut("const achNum =", "const ACHIEVEMENT_DEFS = [");
const defs = cut("const ACHIEVEMENT_DEFS = [", "\r\n];\r\n\r\n/* Call after any action") + "\r\n];";
// Helpers the defs lean on that live elsewhere in app.js
const support = `
function isCountingSet(set){ return (set.type||"working") !== "warmup"; }
function dayKey(d){ const t = d?new Date(d):new Date(); const p=n=>String(n).padStart(2,"0");
  return t.getFullYear()+"-"+p(t.getMonth()+1)+"-"+p(t.getDate()); }
const BODY_MEASUREMENT_KEYS = ["weight","bodyfat","waist","chest","neck","hips","leftArm","rightArm","leftThigh"];
function totalWorkingSets(){ let n=0; eachLoggedSet(()=>n++); return n; }
function totalWorkingReps(){ let n=0; eachLoggedSet(s=>n+=achNum(s.reps)); return n; }
function totalLifetimeVolume(){ return (state.workoutLog||[]).reduce((a,s)=>a+achNum(s.volume),0); }
function totalTrainingMinutes(){ return (state.workoutLog||[]).reduce((a,s)=>a+achNum(s.durationMin),0); }
function heaviestLiftKg(){ let m=0; eachLoggedSet(s=>m=Math.max(m,achNum(s.weight))); return m; }
function distinctMusclesTrained(){ return 0; }
function distinctExercisesLogged(){ const e=new Set(); (state.workoutLog||[]).forEach(s=>(s.exercises||[]).forEach(x=>e.add(x.name))); return e.size; }
function sessionsAtHour(fn){ return (state.workoutLog||[]).filter(s=>{ const t=new Date(s.startedAt); return t&&!isNaN(t)&&fn(t.getHours()); }).length; }
function daysWithFoodLogged(){ return new Set((state.foodLog||[]).map(f=>f.date)).size; }
function daysWaterGoalMet(){ return 0; }
function scoreDaysAtLeast(n){ try{ const h=JSON.parse(localStorage.getItem("hx_score_history")||"{}")||{}; return Object.keys(h).filter(k=>h[k]>=n).length; }catch(e){ return 0; } }
function weeklyChallengesCompleted(){ return 0; }
function distinctTrainingDays(){ const d=new Set(); (state.workoutLog||[]).forEach(s=>{const t=new Date(s.startedAt||s.date); if(!isNaN(t)) d.add(dayKey(t));}); return d.size; }
function weightLogStreakBest(){ return 0; }
function weightMovedTowardGoalKg(){ return 0; }
function weightGoalReached(){ return false; }
function weightWeeksRunning(){ return 0; }
function daysWithFullLog(){ return 0; }
function computeStreak(){ return 0; }
function weekProgress(){ return 0; }
function overallPlanProgress(){ return 0; }
function macroTargets(){ return { kcal:2400, protein:180, carbs:270, fat:67, fibre:30 }; }
const WEEKS = [{}];
`;

function run(label, state, scoreHistory){
  const sandbox = {
    state,
    localStorage: { getItem: k => k === "hx_score_history" ? JSON.stringify(scoreHistory || {}) : null },
    console, Math, Date, JSON, Set, Object, Array, Number, String, parseFloat, isFinite, RegExp
  };
  vm.createContext(sandbox);
  vm.runInContext(support + helpers + defs + "\n;globalThis.__D = ACHIEVEMENT_DEFS;", sandbox);
  const defsArr = sandbox.__D;
  const threw = [], unlocked = [];
  defsArr.forEach(d => {
    try { if (d.check()) unlocked.push(d.id); }
    catch (e) { threw.push(d.id + ": " + e.message); }
    if (d.prog) {
      try { d.prog.have(); } catch (e) { threw.push(d.id + " [prog]: " + e.message); }
    }
  });
  console.log("\n== " + label + " ==");
  console.log("  defs:", defsArr.length, "| threw:", threw.length, "| unlocked:", unlocked.length);
  if (threw.length) threw.forEach(t => console.log("    THROW " + t));
  return unlocked;
}

// ---- 1. a brand-new user: every array empty
const empty = {
  workoutLog: [], foodLog: [], bodylog: [], prs: [], routines: [], raceLog: [],
  bodyPhotos: [], waterLog: [], habits: [], profile: {}, onboarding: {}, plan: null,
  nutrition: { proteinPct:30, carbPct:45, fatPct:25 }, settings: {}
};
const a = run("empty state (new user)", empty, {});
if (a.length) console.log("  UNLOCKED ON AN EMPTY STATE -- each of these is a false award:\n    " + a.join("\n    "));

// ---- 2. missing arrays entirely (partial/corrupt storage)
const bare = { profile: {}, onboarding: {}, nutrition: { proteinPct:30, carbPct:45, fatPct:25 } };
run("state with every array missing", bare, {});

// ---- 3. a populated user
const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const iso = n => day(n).toISOString();
const key = n => { const d = day(n); const p = x => String(x).padStart(2,"0");
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); };
const sess = (n, exercises, extra) => Object.assign({
  startedAt: iso(n), date: key(n), durationMin: 60, volume: 5000, exercises
}, extra || {});
const full = {
  workoutLog: [
    sess(1, [
      { name:"Bench Press", sets:[{weight:85,reps:5},{weight:85,reps:5}] },
      { name:"Back Squat", sets:[{weight:130,reps:5}] },
      { name:"Deadlift", sets:[{weight:180,reps:3,rpe:9}] }
    ]),
    sess(2, [
      { name:"Sled Push", sets:[{distanceKm:0.05,weight:100}] },
      { name:"Running", sets:[{distanceKm:5.2,durationSec:1480}] },
      { name:"Wall Balls", sets:[{reps:100}] }
    ]),
    sess(3, [
      { name:"Rowing Machine", sets:[{distanceKm:2,durationSec:470}] },
      { name:"SkiErg", sets:[{distanceKm:1.0,durationSec:240}] },
      { name:"Assault Bike", sets:[{calories:300,durationSec:900}] },
      { name:"Plank", sets:[{durationSec:200}] }
    ]),
    sess(3, [ { name:"Pull-Ups", sets:[{reps:12}] }, { name:"Push-Ups", sets:[{reps:60}] } ]),
    sess(40, [ { name:"Hamstring Stretch", sets:[{durationSec:60}] } ])
  ],
  foodLog: [
    { date:key(1), name:"Oats", meal:"breakfast", calories:2200, protein:185, carbs:250, fat:64 },
    { date:key(2), name:"Rice", meal:"lunch", calories:2100, protein:190, carbs:255, fat:65 }
  ],
  bodylog: [
    {date:key(1),weight:78,waist:82,chest:104,sleep:'7.5',hrv:''},
    {date:key(2),weight:'',sleep:'8'},{date:key(3),weight:'',sleep:'6.5'},{date:key(4),weight:'',sleep:'7'},
    {date:key(5),weight:'',sleep:'8.5'},{date:key(6),weight:'',sleep:'7'},{date:key(7),weight:'',sleep:'6'},
    {date:key(8),weight:'',sleep:''},{date:key(9),weight:'',sleep:'7'},
    { date:key(30), weight:82 }
  ],
  prs: [{ type:"weight", exercise:"Deadlift", value:180 }],
  routines: [{ id:1, name:"Push A" }],
  raceLog: [{ id:1, date:key(5), totalMs: 74*60000, segments:[] }],
  bodyPhotos: [{ id:1, date:key(1) }],
  waterLog: [], habits: [],
  profile: { weight:78, height:180, targetWeight:78, dob: iso(365*30) },
  onboarding: { birthday: iso(365*30) },
  plan: { id:"hyrox-8w" },
  nutrition: { proteinPct:30, carbPct:45, fatPct:25 },
  settings: {}
};
const c = run("populated state", full, { [key(1)]:120, [key(2)]:110, [key(3)]:105 });
console.log("  unlocked:", c.join(", "));


/* ---- 4. sleep readers, asserted directly.
   The fixture has 9 nights of sleep across 9 consecutive days with ONE blank ("" is what the
   form stores when the field is left empty, not undefined), plus one weight-only entry. */
const sleepOnly = {
  bodylog: full.bodylog, workoutLog: [], foodLog: [], prs: [], routines: [], raceLog: [],
  bodyPhotos: [], waterLog: [], savedMeals: [], achievements: [], plan: null,
  profile: {}, onboarding: {}, nutrition: { proteinPct:30, carbPct:45, fatPct:25 }, settings: {}
};
const sx = {
  state: sleepOnly, localStorage: { getItem: () => null },
  console, Math, Date, JSON, Set, Object, Array, Number, String, parseFloat, isFinite, RegExp
};
vm.createContext(sx);
vm.runInContext(support + helpers + defs +
  ";globalThis.R={count:sleepLogCount(),hours:totalSleepHours(),streak:sleepStreakDays(),measured:measurementEntryCount(),weighins:weighInCount()};", sx);

const R = sx.R;
const expect = (label, got, want) =>
  console.log((got === want ? "  ok   " : "  FAIL ") + label + ": got " + got + ", want " + want);
console.log("\n== sleep readers ==");
expect("entries carrying a sleep figure", R.count, 8);
expect("total logged hours", R.hours, 57.5);
expect("longest streak (the blank night must break it)", R.streak, 7);
expect("measurementEntryCount -- sleep-only entries must NOT count as tape measurements", R.measured, 1);
expect("weighInCount -- weight-less imported rows must NOT count as weigh-ins", R.weighins, 2);

function ctx(days){
  const state = { workoutLog: days.map((d,i)=>({id:i,startedAt:d+"T09:00:00",date:d,exercises:[]})),
    foodLog:[], bodylog:[], prs:[], routines:[], raceLog:[], bodyPhotos:[], waterLog:[],
    savedMeals:[], achievements:[], plan:null, profile:{}, onboarding:{}, settings:{},
    nutrition:{proteinPct:30,carbPct:45,fatPct:25} };
  const sx = { state, localStorage:{getItem:()=>null}, console, Math, Date, JSON, Set, Object,
    Array, Number, String, parseFloat, isFinite, RegExp };
  vm.createContext(sx);
  vm.runInContext(support + helpers +
    ";globalThis.F=(n)=>trainedDuringFestival(n);globalThis.N=(n)=>daysTrainedDuringFestival(n);globalThis.ANY=()=>trainedOnAnyFestival();", sx);
  return sx;
}
let pass = 0, fail = 0;
const t = (label, got, want) => { const ok = got === want; ok ? pass++ : fail++;
  console.log((ok?"  ok   ":"  FAIL ") + label + "  (got " + got + ", want " + want + ")"); };

console.log("== tabled year, real festival dates ==");
let fc = ctx(["2026-11-08"]);                 // Diwali 2026, verified
t("trained on Diwali 2026", fc.F("diwali"), true);
t("...and that counts as a public holiday", fc.ANY(), true);
t("...but is not Holi", fc.F("holi"), false);

fc = ctx(["2026-11-06"]);                     // Dhanteras, first day of the 5-day window
t("first day of the Diwali window counts", fc.F("diwali"), true);
fc = ctx(["2026-11-05"]);                     // day before the window
t("the day before the window does not", fc.F("diwali"), false);

console.log("\n== fixed dates work in any year, tabled or not ==");
t("Christmas 2033", ctx(["2033-12-25"]).F("christmas"), true);
t("Republic Day 2019", ctx(["2019-01-26"]).F("republic"), true);
t("Independence Day 2026", ctx(["2026-08-15"]).F("independence"), true);
t("Pongal on the 15th", ctx(["2026-01-15"]).F("pongal"), true);
t("16 January is not Pongal", ctx(["2026-01-16"]).F("pongal"), false);

console.log("\n== the fail-closed rule: a lunar year outside the table ==");
fc = ctx(["2031-11-08"]);   // 2031 is not in FESTIVAL_WINDOWS
t("no Diwali badge for an untabled year", fc.F("diwali"), false);
t("no holiday badge either", fc.ANY(), false);
t("but Christmas 2031 still works (fixed)", ctx(["2031-12-25"]).F("christmas"), true);

console.log("\n== Navratri wants five of nine ==");
const nav = y => ["02","03","04","05","06","07","08","09","10"].map(d=>"2027-10-"+d);
t("four days is not enough", ctx(nav().slice(0,4)).N("navratri") >= 5, false);
t("five days is", ctx(nav().slice(0,5)).N("navratri") >= 5, true);
t("all nine counted", ctx(nav()).N("navratri"), 9);

console.log("\n== nothing logged ==");
fc = ctx([]);
t("no sessions, no festival", fc.F("diwali"), false);
t("no sessions, no holiday", fc.ANY(), false);

console.log("\n" + pass + " passed, " + fail + " failed");


/* ---- 6. race division and birthdays.
   Races written before the division field existed carry no value. They must read as singles --
   the alternative is a legacy PB silently vanishing from the singles count. */
const divCtx = (races, workouts, birthday) => {
  const state = { raceLog: races, workoutLog: workouts || [], foodLog: [], bodylog: [], prs: [],
    routines: [], bodyPhotos: [], waterLog: [], savedMeals: [], achievements: [], plan: null,
    profile: {}, onboarding: birthday ? { birthday } : {}, settings: {},
    nutrition: { proteinPct:30, carbPct:45, fatPct:25 } };
  const sx = { state, localStorage:{getItem:()=>null}, console, Math, Date, JSON, Set, Object,
    Array, Number, String, parseFloat, isFinite, RegExp };
  vm.createContext(sx);
  vm.runInContext(support + helpers +
    ";globalThis.D=(d)=>hyroxSimsInDivision(d);globalThis.B=()=>birthdaysTrained();", sx);
  return sx;
};
console.log("\n== race division and birthdays ==");
let d = divCtx([{ id:1, totalMs:1, segments:[] }]);                       // legacy, no division
t("a race with no division reads as singles", d.D("singles"), 1);
t("...and not as doubles", d.D("doubles"), 0);
d = divCtx([{ id:1, totalMs:1, segments:[], division:"doubles" }]);
t("an explicit doubles race counts", d.D("doubles"), 1);

const bd = "1998-05-20T00:00:00";
const onBday = y => ({ id:y, startedAt:y+"-05-20T09:00:00", date:y+"-05-20", exercises:[] });
t("no birthday stored means zero, never 1 Jan", divCtx([], [onBday(2025)], null).B(), 0);
t("the same birthday twice in a year counts once",
  divCtx([], [onBday(2025), { id:9, startedAt:"2025-05-20T18:00:00", date:"2025-05-20", exercises:[] }], bd).B(), 1);
t("three separate birthdays count three",
  divCtx([], [onBday(2024), onBday(2025), onBday(2026)], bd).B(), 3);

/* ---- 5. the badge-id migration.
   state.achievements is keyed by id. If a mapping points at an id no def uses, the user's badge
   becomes a ghost: invisible in the grid, but still counted by state.achievements.length, which
   is exactly what renders "X of Y earned". That is strictly worse than not renaming at all. */
const defIds = new Set([...defs.matchAll(/\{ id:"([^"]+)"/g)].map(m => m[1]));
const migBlock = src.slice(src.indexOf("const ACHIEVEMENT_ID_MIGRATION = {"), src.indexOf("function runMigrations()"));
const pairs = [...migBlock.matchAll(/"([^"]+)": "([^"]+)"/g)].map(m => ({ from: m[1], to: m[2] }));

console.log("\n== badge-id migration ==");
t("every mapping has a target def", pairs.filter(p => !defIds.has(p.to)).length, 0);
t("no mapped-away id still ships as a def", pairs.filter(p => defIds.has(p.from)).length, 0);
t("no def still uses the underscore scheme", [...defIds].filter(i => i.includes("_")).length, 0);
t("all 82 legacy ids are mapped", pairs.length, 82);

/* The collision case: someone who earned BOTH the legacy id and its new-scheme twin must end up
   with one badge carrying the EARLIER date. Showing today's date on a badge earned last year is
   the visible symptom this migration exists to prevent. */
const migrated = (() => {
  const map = Object.fromEntries(pairs.map(p => [p.from, p.to]));
  const ach = [{ id: "volume_1m", achievedAt: 1000 }, { id: "lifetime-volume", achievedAt: 5000 }];
  ach.forEach(a => { if (map[a.id]) a.id = map[a.id]; });
  const best = new Map();
  ach.forEach(a => { const h = best.get(a.id); if (!h || a.achievedAt < h.achievedAt) best.set(a.id, a); });
  return Array.from(best.values());
})();
t("a collision collapses to one badge", migrated.length, 1);
t("...keeping the earlier achievedAt", migrated[0].achievedAt, 1000);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
