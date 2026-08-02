/* =========================================================
   XP AND LEVELS

   Points for the things worth repeating, a level every 1000, and a title per level.

   WHY THE LEDGER IS AN EVENT LOG AND NOT A COUNTER
   A bare `xp += 100` cannot answer "have I already paid for this?", so a screen that repaints
   twice awards twice, and a workout edited after the fact pays again. Every award is recorded
   against a key that identifies the thing that earned it — "workout:1730�" — and awarding the
   same key twice is a no-op. That makes award() safe to call from a render path, which is
   where these calls naturally want to live.

   WHY XP IS DERIVED, NOT STORED
   The total is the sum of the ledger. There is no separate number to drift out of step with
   it, and deleting a workout can take its points back honestly rather than leaving the user
   at a level they no longer qualify for.
========================================================= */

window.IgnytXP = (function () {
  "use strict";

  var LEDGER_KEY = "hx_xp_ledger";
  var PER_LEVEL = 1000;

  /* What each action is worth. Roughly proportional to effort, so a workout is not worth the
     same as opening the app — points that are trivial to farm stop meaning anything. */
  var AWARDS = {
    workout:      { xp: 100, label: "Workout completed" },
    meal:         { xp: 20,  label: "Meal logged" },
    steps10k:     { xp: 40,  label: "10,000 steps" },
    waterGoal:    { xp: 20,  label: "Water goal reached" },
    sleepGoal:    { xp: 30,  label: "Sleep goal reached" },
    weightUpdate: { xp: 10,  label: "Weight updated" },
    proteinGoal:  { xp: 30,  label: "Protein goal reached" },
    achievement:  { xp: 150, label: "Achievement unlocked" },
    personalBest: { xp: 75,  label: "Personal record" }
  };

  /* Titles by level. Deliberately about commitment rather than physique — the app cannot see
     what someone looks like and should not imply it can. */
  var TITLES = [
    { from: 1,  title: "Beginner" },
    { from: 4,  title: "Active" },
    { from: 8,  title: "Committed" },
    { from: 13, title: "Dedicated" },
    { from: 20, title: "Athlete" },
    { from: 30, title: "Elite" },
    { from: 45, title: "Champion" },
    { from: 65, title: "Legend" }
  ];

  function readLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function writeLedger(l) {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(l)); return true; }
    catch (e) { return false; }
  }

  /**
   * Record an award once.
   *
   * @param {string} kind  a key of AWARDS
   * @param {string} key   what earned it — a workout id, a date, a meal id. Awarding the same
   *                       kind+key twice does nothing, which is what makes this safe to call
   *                       from anywhere including a re-render.
   * @returns {object|null} {xp, levelBefore, levelAfter, leveledUp} or null if already awarded
   */
  function award(kind, key) {
    var def = AWARDS[kind];
    if (!def) return null;
    var id = kind + ":" + key;
    var ledger = readLedger();
    if (ledger[id]) return null;

    var before = level();
    ledger[id] = { xp: def.xp, at: Date.now() };
    writeLedger(ledger);
    var after = level();

    var result = { xp: def.xp, label: def.label, levelBefore: before, levelAfter: after,
                   leveledUp: after > before };
    try {
      window.dispatchEvent(new CustomEvent("ignyt:xp-awarded", { detail: result }));
    } catch (e) { /* a listener throwing must not lose the award */ }
    return result;
  }

  /** Take points back — used when the thing that earned them is deleted. */
  function revoke(kind, key) {
    var ledger = readLedger();
    var id = kind + ":" + key;
    if (!ledger[id]) return false;
    delete ledger[id];
    writeLedger(ledger);
    return true;
  }

  function total() {
    var ledger = readLedger(), sum = 0;
    for (var k in ledger) if (ledger.hasOwnProperty(k)) sum += Number(ledger[k].xp) || 0;
    return sum;
  }

  function level() { return Math.floor(total() / PER_LEVEL) + 1; }

  /** Progress through the current level, for the bar. */
  function progress() {
    var t = total();
    var into = t % PER_LEVEL;
    return { xp: t, level: level(), title: title(), intoLevel: into,
             toNext: PER_LEVEL - into, percent: Math.round(into / PER_LEVEL * 100) };
  }

  function title(forLevel) {
    var l = forLevel || level(), out = TITLES[0].title;
    for (var i = 0; i < TITLES.length; i++) if (l >= TITLES[i].from) out = TITLES[i].title;
    return out;
  }

  return {
    AWARDS: AWARDS, TITLES: TITLES, PER_LEVEL: PER_LEVEL,
    award: award, revoke: revoke,
    total: total, level: level, title: title, progress: progress,
    /** Test seam. Never called by the app. */
    _reset: function () { writeLedger({}); }
  };
})();
