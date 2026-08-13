/* Node runner for IgnytChatTests. Loads the real www/js/ai modules against a stub app shell.

   node run-suite.js [filter]  — filter matches kind or test-name substring. */

const fs = require("fs"), path = require("path"), vm = require("vm");

/* Resolved from this file's own location so the suite runs from any checkout, on any
   machine. It was a hard-coded absolute path while it lived in a scratchpad. */
const ROOT = path.resolve(__dirname, "..", "..", "www");



const store = {};

const localStorage = {

  getItem: (k) => (k in store ? store[k] : null),

  setItem: (k, v) => { store[k] = String(v); },

  removeItem: (k) => { delete store[k]; },

};



function today() { return new Date().toISOString().slice(0, 10); }



// The app's module-scoped `state`, as a bare global — actions.js reads `typeof state`.

const state = {

  foodLog: [], bodylog: [], routines: [], workouts: [], history: [],

  goals: {}, profile: { name: "Test", weightKg: 80 }, settings: {},

};



const win = {

  todayStr: today,

  nextId: () => "id" + Math.random().toString(36).slice(2, 9),

  persist: () => {},

  mealForNow: () => "Lunch",

  computeStreak: () => 0,

  titleCaseDayKey: (d) => String(d),

  todaysPlannedDay: () => null,

  buildTodaysPlan: () => null,

  commitFinishedWorkout: () => {},

  normalizeRoutine: (r) => r,

  enforceRoutineIntegrity: (r) => r,

  localStorage,

  fetch: async (u) => {

    const f = path.join(ROOT, String(u).replace(/^\.?\//, ""));

    return { ok: fs.existsSync(f), json: async () => JSON.parse(fs.readFileSync(f, "utf-8")) };

  },

  addEventListener: () => {}, dispatchEvent: () => {},

  CustomEvent: function (t, o) { return Object.assign({ type: t }, o); },

  speechSynthesis: null, navigator: { onLine: false, language: "en-IN" },

  console,

};

win.window = win;



const ctx = vm.createContext(Object.assign(Object.create(null), win, {

  state, localStorage, console, fetch: win.fetch, setTimeout, clearTimeout,

  Promise, JSON, Math, Date, Object, Array, String, Number, RegExp, Error,

  isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Intl,

  document: { addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, classList: { add(){}, remove(){} }, appendChild(){} }) },

}));

ctx.window = ctx;

ctx.globalThis = ctx;



const FILES = [

  "js/food/food-db.js", "js/food/serving-converter.js", "js/food/food-catalogue.js",

  "js/food/food-search.js", "js/food/nutrition-engine.js",

  "js/workout/exercise-instructions.js", "js/workout/exercise-instructions-extra.js",

  "js/ai/ignyt-search.js", "js/ai/knowledge.js", "js/ai/lang.js", "js/ai/intents.js",

  "js/ai/ai-intent.js", "js/ai/actions.js", "js/ai/local-chat.js", "js/ai/service.js", "js/ai/chat-tests.js",

];

for (const f of FILES) {

  const p = path.join(ROOT, f);

  if (!fs.existsSync(p)) { console.log("MISSING " + f); continue; }

  try { vm.runInContext(fs.readFileSync(p, "utf-8"), ctx, { filename: f }); }

  catch (e) { console.log("LOAD FAIL " + f + ": " + e.message); }

}



(async () => {

  for (const m of ['IgnytKnowledge','IgnytFoodCatalogue']) {

    if (ctx[m] && ctx[m].load) { try { await ctx[m].load(); } catch (e) { console.log('preload ' + m + ': ' + e.message); } }

  }

  console.log('kb=' + ((ctx.IgnytKnowledge && ctx.IgnytKnowledge.count && ctx.IgnytKnowledge.count()) || '?') + ' foods=' + ((ctx.IgnytFoodCatalogue && ctx.IgnytFoodCatalogue.count && ctx.IgnytFoodCatalogue.count()) || '?'));

  

  if (process.env.TRACE_IN_SUITE) ctx.localStorage.setItem('hx_trace','1');

  const r = await ctx.IgnytChatTests.run(process.argv[2] || undefined);

  if (r.error) { console.log("ERROR: " + r.error); process.exit(2); }

  for (const x of r.results) if (!x.ok) console.log("FAIL [" + x.kind + "] " + x.name + "  --  " + x.why);

  console.log("\n" + r.passed + "/" + r.total + " passed, " + r.failed + " failed");

  process.exit(r.failed ? 1 : 0);

})();

