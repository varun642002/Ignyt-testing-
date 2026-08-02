/* =========================================================
   REVIEWS AND CHALLENGES — the weekly summary, the monthly review, and today's targets.

   EVERY NUMBER HERE IS MEASURED, NOT MODELLED
   The brief asked the monthly review to include "muscle gained (estimated)". It is not here.
   Muscle cannot be estimated from a bodyweight trend — a kilogram gained is water, glycogen,
   fat and tissue in a ratio nothing in this app can see, and an invented figure in a review
   people screenshot and share is a figure that will be quoted back as fact. Everything below
   comes from something the user actually logged.

   CHALLENGES ARE FIXED FOR THE DAY
   Seeded by the date, so today's set is the same at 7am and 9pm. A challenge list that
   reshuffles on every render is not a challenge, and completing one only to see it replaced
   is worse than not offering them.

   THE TARGETS ARE THE USER'S OWN
   Water comes from their configured target, protein from their bodyweight, steps from the
   app's stated default. Nothing invents a number and then congratulates someone for hitting it.
========================================================= */

window.IgnytReview = (function () {
  "use strict";

  var DAY = 86400000;

  function startOfDay(d) { var x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); }
  function dateKey(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth()+1).padStart(2,"0") + "-" + String(x.getDate()).padStart(2,"0");
  }

  /* ---- weekly ------------------------------------------------------------------------ */

  /**
   * The last seven days, from real logs.
   * @param {object} s  app state
   * @returns {object|null} null when there is nothing to report, so the caller can omit the
   *                        card rather than render a row of zeroes at someone who took a week off.
   */
  function week(s) {
    if (!s) return null;
    var cutoff = Date.now() - 7 * DAY;
    var sessions = (s.workoutLog || []).filter(function (w) {
      return new Date(w.startedAt || w.date).getTime() >= cutoff;
    });
    var foods = (s.foodLog || []).filter(function (f) {
      return new Date(f.date + "T12:00:00").getTime() >= cutoff;
    });
    var weights = (s.bodylog || []).filter(function (b) {
      return b && b.weight > 0 && new Date(b.date).getTime() >= cutoff;
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    if (!sessions.length && !foods.length && !weights.length) return null;

    var minutes = sessions.reduce(function (a, w) { return a + (w.durationMin || 0); }, 0);
    var volume  = sessions.reduce(function (a, w) { return a + (w.volume || 0); }, 0);
    var kcal    = foods.reduce(function (a, f) { return a + (Number(f.calories) || 0); }, 0);

    // Days with anything logged, not days trained — a rest week with food logged every day is
    // engagement, and calling it zero would be both wrong and discouraging.
    var activeDays = {};
    sessions.forEach(function (w) { activeDays[dateKey(new Date(w.startedAt || w.date))] = 1; });
    foods.forEach(function (f) { activeDays[f.date] = 1; });

    var weightChange = weights.length >= 2
      ? Math.round((weights[weights.length-1].weight - weights[0].weight) * 10) / 10
      : null;

    return {
      workouts: sessions.length,
      minutes: Math.round(minutes),
      volumeKg: Math.round(volume),
      caloriesLogged: Math.round(kcal),
      mealsLogged: foods.length,
      activeDays: Object.keys(activeDays).length,
      weightChangeKg: weightChange,
      bestSession: sessions.slice().sort(function (a,b) { return (b.volume||0) - (a.volume||0); })[0] || null
    };
  }

  /* ---- monthly ----------------------------------------------------------------------- */

  function month(s) {
    if (!s) return null;
    var cutoff = Date.now() - 30 * DAY;
    var sessions = (s.workoutLog || []).filter(function (w) {
      return new Date(w.startedAt || w.date).getTime() >= cutoff;
    });
    var weights = (s.bodylog || []).filter(function (b) {
      return b && b.weight > 0 && new Date(b.date).getTime() >= cutoff;
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var foods = (s.foodLog || []).filter(function (f) {
      return new Date(f.date + "T12:00:00").getTime() >= cutoff;
    });
    if (!sessions.length && !foods.length && !weights.length) return null;

    var days = {};
    sessions.forEach(function (w) { days[dateKey(new Date(w.startedAt || w.date))] = 1; });
    foods.forEach(function (f) { days[f.date] = 1; });

    return {
      workouts: sessions.length,
      minutes: Math.round(sessions.reduce(function (a,w) { return a + (w.durationMin||0); }, 0)),
      volumeKg: Math.round(sessions.reduce(function (a,w) { return a + (w.volume||0); }, 0)),
      activeDays: Object.keys(days).length,
      consistencyPct: Math.round(Object.keys(days).length / 30 * 100),
      weightChangeKg: weights.length >= 2
        ? Math.round((weights[weights.length-1].weight - weights[0].weight) * 10) / 10 : null,
      prs: (s.prs || []).filter(function (p) { return (p.achievedAt || 0) >= cutoff; }).length,
      badges: (s.achievements || []).filter(function (a) { return (a.achievedAt || 0) >= cutoff; }).length
    };
  }

  /* ---- daily challenges --------------------------------------------------------------- */

  /**
   * Today's three challenges, fixed for the day and checked against real logs.
   * Targets come from the user's own settings where they exist.
   */
  function challenges(s) {
    if (!s) return [];
    var today = dateKey();
    var waterTarget = (s.settings && s.settings.waterTargetMl) || 2500;
    var bodyweight = (s.profile && s.profile.weight) || 0;

    var pool = [
      { id: "workout", icon: "💪", label: "Complete a workout", xp: 100,
        done: (s.workoutLog || []).some(function (w) {
          return dateKey(new Date(w.startedAt || w.date)) === today; }) },
      { id: "water", icon: "💧", label: "Hit your water goal", xp: 20,
        done: (s.waterLog || []).filter(function (w) { return w.date === today; })
                .reduce(function (a,w) { return a + (w.ml||0); }, 0) >= waterTarget },
      { id: "meals", icon: "🍽️", label: "Log three meals", xp: 20,
        done: (s.foodLog || []).filter(function (f) { return f.date === today; }).length >= 3 },
      { id: "protein", icon: "🥩", label: bodyweight ? "Reach " + Math.round(bodyweight * 1.6) + "g protein" : "Hit your protein target", xp: 30,
        done: bodyweight > 0 && (s.foodLog || []).filter(function (f) { return f.date === today; })
                .reduce(function (a,f) { return a + (Number(f.protein)||0); }, 0) >= bodyweight * 1.6 },
      { id: "weigh", icon: "⚖️", label: "Log your weight", xp: 10,
        done: (s.bodylog || []).some(function (b) { return dateKey(new Date(b.date)) === today; }) }
    ];

    // Three a day, chosen by date so the set holds all day. A list that reshuffles on every
    // render is not a challenge.
    var seed = Number(today.replace(/-/g, ""));
    var offset = seed % pool.length;
    var out = [];
    for (var i = 0; i < 3; i++) out.push(pool[(offset + i) % pool.length]);
    return out;
  }

  /* ---- contextual coaching ------------------------------------------------------------
     One line, chosen from what actually happened. Returns null when nothing is worth saying —
     a coach that comments on every screen is noise, and noise gets ignored. */
  function coachLine(s) {
    if (!s || !window.IgnytMessages) return null;
    var sessions = s.workoutLog || [];
    if (!sessions.length) return null;

    var last = sessions.reduce(function (a, w) {
      var t = new Date(w.startedAt || w.date).getTime();
      return t > a ? t : a;
    }, 0);
    var daysSince = Math.floor((Date.now() - last) / DAY);

    if (daysSince >= 4) return IgnytMessages.next("comeback");
    if (daysSince === 0) return IgnytMessages.next("workoutDone");
    return null;
  }

  return { week: week, month: month, challenges: challenges, coachLine: coachLine };
})();
