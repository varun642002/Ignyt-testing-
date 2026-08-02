/* =========================================================
   IGNYT REMINDERS — the notification engine

   One registry of every reminder the app can send, one shape for all of them, and one sync
   that pushes the enabled ones to AlarmManager through the IgnytNotify plugin.

   WHY A REGISTRY RATHER THAN A SWITCH PER REMINDER.
   Fourteen reminder types with individually written scheduling code would be fourteen places
   to get the day maths wrong. Every reminder here is the same record — id, time, days, copy,
   where it lands — so adding one is a line of data, and a fix to the scheduling is a fix for
   all of them.

   REPEAT VOCABULARY LIVES HERE, NOT IN KOTLIN.
   "Daily", "weekdays", "weekends" and "custom" all resolve to a list of day numbers before
   they cross the bridge, so the native layer only ever knows about days. A new repeat option
   is a JS change with no native counterpart.

   WHAT THIS DELIBERATELY DOES NOT DO.
   Two of the requested reminders — missed workout and inactive user — are CONDITIONAL: they
   should fire only if something did not happen. AlarmManager cannot ask that question, and a
   notification that says "you missed your workout" to someone who trained that morning is
   worse than no notification. They are scheduled like the rest, but the app re-evaluates them
   at launch and cancels the next occurrence when the condition is already satisfied. That is
   honest about what a local reminder can know; see syncConditional().

   STORAGE
     hx_reminders   { [id]: {enabled, hour, minute, repeat, days, vibrate, silent, snooze} }
========================================================= */
(function () {
  "use strict";

  var KEY = "hx_reminders";

  /* 0=Sunday .. 6=Saturday, matching Date.getDay() and what the native side expects. */
  var ALL_DAYS      = [0, 1, 2, 3, 4, 5, 6];
  var WEEKDAYS      = [1, 2, 3, 4, 5];
  var WEEKENDS      = [0, 6];

  /* Every reminder the app can send. `route` is the screen tapping it should open — the
     native layer passes it back untouched, so this list is the only place that knows what a
     reminder means. */
  var CATALOGUE = [
    // ---- meals: one per meal in the default plan ----
    { id: "meal-breakfast", group: "Meals", label: "Breakfast", hour: 8,  minute: 0,
      title: "Breakfast", body: "Log your breakfast while you remember it.", route: "nutrition", snooze: 15 ,
        defaultOn: true },
    { id: "meal-morning-snack", group: "Meals", label: "Morning Snack", hour: 10, minute: 30,
      title: "Morning snack", body: "A snack logged now is one you won't guess at later.", route: "nutrition", snooze: 15 ,
        defaultOn: true },
    { id: "meal-lunch", group: "Meals", label: "Lunch", hour: 13, minute: 0,
      title: "Lunch", body: "Time to log lunch.", route: "nutrition", snooze: 15 ,
        defaultOn: true },
    { id: "meal-evening-snack", group: "Meals", label: "Evening Snack", hour: 17, minute: 0,
      title: "Evening snack", body: "Anything between lunch and dinner?", route: "nutrition", snooze: 15 ,
        defaultOn: true },
    { id: "meal-dinner", group: "Meals", label: "Dinner", hour: 19, minute: 30,
      title: "Dinner", body: "Log dinner to close out the day.", route: "nutrition", snooze: 15 ,
        defaultOn: true },

    // ---- training ----
    { id: "workout", group: "Training", label: "Workout", hour: 18, minute: 0,
      title: "Time to train", body: "Your session is waiting.", route: "workout", snooze: 30,
      defaultOn: true },
    { id: "missed-workout", group: "Training", label: "Missed workout", hour: 21, minute: 0,
      title: "No workout logged", body: "Still time, or move it to tomorrow.", route: "workout",
      snooze: 0, conditional: "workout" ,
        defaultOn: true },

    // ---- daily habits ----
    { id: "water", group: "Daily", label: "Water", hour: 15, minute: 0,
      title: "Hydration", body: "Log what you've drunk so far.", route: "nutrition", snooze: 30,
      defaultOn: true },
    { id: "steps", group: "Daily", label: "Steps", hour: 19, minute: 0,
      title: "Steps", body: "Check where your step count is.", route: "health", snooze: 30 ,
        defaultOn: true },
    { id: "supplements", group: "Daily", label: "Supplements", hour: 9, minute: 0,
      title: "Supplements", body: "Take and log today's supplements.", route: "supplements", snooze: 30 ,
        defaultOn: true },
    { id: "sleep", group: "Daily", label: "Sleep", hour: 22, minute: 30,
      title: "Wind down", body: "Aiming for a consistent bedtime makes the rest easier.", route: "health", snooze: 15 ,
        defaultOn: true },

    // ---- fasting: times come from the ACTIVE FAST, not from settings ----
    { id: "fast-start", group: "Fasting", label: "Fasting starts", hour: 20, minute: 0,
      title: "Fasting window", body: "Your eating window closes now.", route: "fasting", snooze: 15 ,
        defaultOn: true },
    { id: "fast-end", group: "Fasting", label: "Fasting ends", hour: 12, minute: 0,
      title: "Fast complete", body: "You can break your fast.", route: "fasting", snooze: 15 ,
        defaultOn: true },

    // ---- progress ----
    { id: "weight", group: "Progress", label: "Weigh-in", hour: 7, minute: 30,
      title: "Weigh-in", body: "Same time, same conditions — that's what makes the trend readable.",
      route: "body", snooze: 60, repeat: "custom", days: [1] ,
        defaultOn: true },
    { id: "progress-check", group: "Progress", label: "Progress check", hour: 18, minute: 0,
      title: "Progress check", body: "See how the week is going.", route: "progress", snooze: 0,
      repeat: "custom", days: [3] ,
        defaultOn: true },
    { id: "weekly-summary", group: "Progress", label: "Weekly summary", hour: 18, minute: 0,
      title: "Your week", body: "Your training and nutrition summary is ready.", route: "progress",
      snooze: 0, repeat: "custom", days: [0] ,
        defaultOn: true },
    { id: "inactive", group: "Progress", label: "Inactive nudge", hour: 17, minute: 0,
      title: "Still with us?", body: "Nothing logged in a few days — pick up where you left off.",
      route: "home", snooze: 0, conditional: "any", repeat: "custom", days: [5] ,
        defaultOn: true },

    // ---- user-defined ----
    { id: "custom", group: "Custom", label: "Custom reminder", hour: 12, minute: 0,
      title: "IGNYT", body: "Your reminder.", route: "home", snooze: 15, custom: true }
  ];

  function byId(id) { return CATALOGUE.filter(function (r) { return r.id === id; })[0] || null; }

  // ---------------------------------------------------------------- storage

  function readAll() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
  }

  function writeAll(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); return true; }
    catch (e) { console.warn("[reminders] could not save:", e); return false; }
  }

  /** The stored settings for one reminder, merged over the catalogue defaults so a reminder
   *  added in a later release arrives with sane values rather than undefined. */
  function settings(id) {
    var def = byId(id);
    if (!def) return null;
    var saved = readAll()[id] || {};
    return {
      id: id,
      enabled: saved.enabled != null ? !!saved.enabled : !!def.defaultOn,
      hour: saved.hour != null ? saved.hour : def.hour,
      minute: saved.minute != null ? saved.minute : def.minute,
      repeat: saved.repeat || def.repeat || "daily",
      days: Array.isArray(saved.days) ? saved.days : (def.days || ALL_DAYS),
      vibrate: saved.vibrate != null ? !!saved.vibrate : true,
      silent: saved.silent != null ? !!saved.silent : false,
      snooze: saved.snooze != null ? saved.snooze : (def.snooze || 0),
      title: saved.title || def.title,
      body: saved.body || def.body
    };
  }

  function update(id, patch) {
    var def = byId(id);
    if (!def) return false;
    var map = readAll();
    map[id] = Object.assign({}, settings(id), patch);
    delete map[id].id;   // the key already is the id
    var ok = writeAll(map);
    if (ok) syncOne(id);
    return ok;
  }

  /** Day list for a repeat mode. "custom" keeps whatever days are stored. */
  function daysFor(s) {
    if (s.repeat === "daily") return ALL_DAYS;
    if (s.repeat === "weekdays") return WEEKDAYS;
    if (s.repeat === "weekends") return WEEKENDS;
    return Array.isArray(s.days) ? s.days : ALL_DAYS;
  }

  // ---------------------------------------------------------------- native sync

  function plugin() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytNotify) || null;
  }

  /* fast-start and fast-end are switches, not schedules. Their real notifications are
     one-shots fired at the ACTIVE fast's own times by syncFastNotifications() in app.js, and
     fastingEnabled() reads these entries to decide whether to fire them at all.

     Scheduling them here would do two wrong things at once: announce an eating window at a
     fixed 20:00 to someone who is not fasting, and — because app.js uses the same "fast-end"
     id for the genuine one-shot — overwrite the real notification with a made-up one. They
     were harmless only because both were off by default; turning every reminder on is exactly
     what would have exposed it. */
  var FASTING_SWITCHES = { "fast-start": 1, "fast-end": 1 };

  /** Pushes one reminder's current state to the system. Disabled means cancel — the native
   *  side treats an empty day list as a cancel too, so there is only one way to be off. */
  function syncOne(id) {
    var p = plugin();
    if (!p) return Promise.resolve(false);
    // Neither scheduled nor cancelled here: app.js owns this id's alarm entirely, and
    // cancelling would delete the real fast notification it had just armed.
    if (FASTING_SWITCHES[id]) return Promise.resolve(false);
    var s = settings(id);
    if (!s) return Promise.resolve(false);
    if (!s.enabled) {
      return p.cancel({ id: id }).then(function () { return true; })
              .catch(function () { return false; });
    }
    return p.scheduleWeekly({
      id: id,
      days: daysFor(s),
      hour: s.hour, minute: s.minute,
      title: s.title, body: s.body,
      route: byId(id).route || "",
      snoozeMinutes: s.snooze,
      vibrate: s.vibrate, silent: s.silent
    }).then(function () { return true; }).catch(function (e) {
      console.warn("[reminders] could not schedule " + id + ":", e);
      return false;
    });
  }

  /** Reconciles every reminder with the system. Called at launch, because the two can drift:
   *  a reboot, a reinstall or a restored backup all leave settings saying "on" with nothing
   *  actually armed. */
  function syncAll() {
    if (!plugin()) return Promise.resolve(0);
    var ids = CATALOGUE.map(function (r) { return r.id; });
    return Promise.all(ids.map(syncOne)).then(function (results) {
      return results.filter(Boolean).length;
    });
  }

  /**
   * The conditional reminders, re-evaluated at launch.
   *
   * "You missed your workout" is only true if no workout was logged today, and AlarmManager
   * cannot check that when it fires. So the alarm is scheduled normally and cancelled for
   * today whenever the condition is already met — the user trained, or logged something. It
   * re-arms on the next sync, which is the next launch.
   *
   * This is a real limitation stated plainly rather than papered over: a phone that is never
   * opened will still deliver the nudge. That is the correct trade — the alternative is a
   * background service running all day to answer a question worth one notification.
   */
  function syncConditional(ctx) {
    var p = plugin();
    if (!p || !ctx) return Promise.resolve();
    var jobs = [];
    var trainedToday = !!ctx.workoutToday;
    var activeRecently = !!ctx.activeRecently;

    if (trainedToday && settings("missed-workout").enabled) {
      jobs.push(p.cancel({ id: "missed-workout" }).catch(function () {}));
    }
    if (activeRecently && settings("inactive").enabled) {
      jobs.push(p.cancel({ id: "inactive" }).catch(function () {}));
    }
    return Promise.all(jobs);
  }

  /** Fasting reminders follow the ACTIVE FAST, not a fixed clock time — scheduling them from
   *  settings would announce a window the user is not in. IgnytFasting owns those one-shots
   *  (see syncFastNotifications in app.js); these two entries exist so they can be turned on
   *  and off in the same place as everything else. */
  function fastingEnabled(which) {
    var s = settings(which === "start" ? "fast-start" : "fast-end");
    return !!(s && s.enabled);
  }

  window.IgnytReminders = {
    CATALOGUE: CATALOGUE, ALL_DAYS: ALL_DAYS, WEEKDAYS: WEEKDAYS, WEEKENDS: WEEKENDS,
    byId: byId, settings: settings, update: update, daysFor: daysFor,
    syncOne: syncOne, syncAll: syncAll, syncConditional: syncConditional,
    fastingEnabled: fastingEnabled,
    groups: function () {
      var out = [];
      CATALOGUE.forEach(function (r) { if (out.indexOf(r.group) === -1) out.push(r.group); });
      return out;
    }
  };
})();
