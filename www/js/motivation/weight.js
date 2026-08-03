/* =========================================================
   WEIGHT MOTIVATION — what to say when the scale is read.

   Every weigh-in gets a card. Which card depends on the TREND, not on today's number:
   a single reading moves with water, salt, sleep, glycogen and the time of day, and treating
   it as a verdict is both wrong and the fastest way to make someone stop logging.

   WHAT IT COMPARES
   Current against the previous entry, the 7-day average, the 30-day average and the goal —
   and it reads the goal's direction, so "up 0.3kg" is progress for someone building muscle
   and noise for someone losing fat. Where a comparison has no data behind it (one entry, no
   goal, no 30-day history) that comparison is simply absent rather than assumed.

   NOTHING SHAMES
   There is no branch here that tells anyone they did badly. The increase case says a single
   reading is not a trend, because that is true. The unchanged case says bodies adapt in steps,
   because they do. Neither invents a silver lining — they state a real fact about measurement
   and then point at the next action.

   MILESTONES ARE CLAIMED ONCE
   New-lowest, goal-reached and the kg-lost tiers are keyed through IgnytXP's ledger, so a
   screen that repaints does not re-award or re-celebrate. Everything is derived from
   state.bodylog; nothing is stored twice.
========================================================= */

window.IgnytWeight = (function () {
  "use strict";

  var DAY = 86400000;

  function entries(s) {
    return ((s && s.bodylog) || [])
      .filter(function (b) { return b && Number(b.weight) > 0; })
      .map(function (b) { return { date: b.date, weight: Number(b.weight), t: new Date(b.date + "T12:00:00").getTime() }; })
      .filter(function (b) { return isFinite(b.t); })
      .sort(function (a, b) { return b.t - a.t; });          // newest first, like bodylog itself
  }

  function averageWithin(list, days) {
    var cutoff = Date.now() - days * DAY;
    var within = list.filter(function (e) { return e.t >= cutoff; });
    if (!within.length) return null;
    var sum = within.reduce(function (a, e) { return a + e.weight; }, 0);
    return Math.round(sum / within.length * 10) / 10;
  }

  /** Which way "better" points for this user. Null when there is no goal to read it from. */
  function direction(s) {
    var goal = null;
    try { goal = window.IgnytGoals ? IgnytGoals.activeGoal() : null; } catch (e) {}
    if (goal && goal.targetWeight != null && goal.startWeight != null) {
      if (goal.targetWeight < goal.startWeight) return { want: "down", goal: goal };
      if (goal.targetWeight > goal.startWeight) return { want: "up", goal: goal };
      return { want: "hold", goal: goal };
    }
    /* No goal record: fall back to what onboarding asked for. A muscle-gain user with no
       formal goal should still not be congratulated for losing weight. */
    var primary = "";
    try { primary = (s && s.onboarding && s.onboarding.primaryGoal) || ""; } catch (e) {}
    if (/gain|muscle|bulk|mass/i.test(primary)) return { want: "up", goal: null };
    if (/lose|fat|cut|slim/i.test(primary)) return { want: "down", goal: null };
    if (/maintain|recomp/i.test(primary)) return { want: "hold", goal: null };
    return null;
  }

  /**
   * Everything known about this weigh-in.
   *
   * `moved` is the change against the previous entry. `trend7`/`trend30` compare the newest
   * reading with those averages, which is the number that actually means something — the
   * averages absorb the daily noise the single reading is full of.
   */
  function analyse(s) {
    var list = entries(s);
    if (!list.length) return null;

    var current = list[0];
    var previous = list[1] || null;
    var avg7 = averageWithin(list, 7);
    var avg30 = averageWithin(list, 30);
    var dir = direction(s);
    var goal = dir && dir.goal;

    var round1 = function (v) { return v == null ? null : Math.round(v * 10) / 10; };
    var moved = previous ? round1(current.weight - previous.weight) : null;

    /* The lowest and highest ever, excluding today's entry, so "new lowest" means lower than
       everything that came before rather than lower than itself. */
    var earlier = list.slice(1);
    var lowestBefore = earlier.length ? Math.min.apply(null, earlier.map(function (e) { return e.weight; })) : null;
    var highestBefore = earlier.length ? Math.max.apply(null, earlier.map(function (e) { return e.weight; })) : null;

    var toGoal = (goal && goal.targetWeight != null)
      ? round1(Math.abs(goal.targetWeight - current.weight)) : null;

    /* Reached only counts in the direction of travel: a weight-loss user is done at or below
       target, a gain user at or above. Crossing it from the wrong side is not arriving. */
    var reachedGoal = false;
    if (goal && goal.targetWeight != null && dir) {
      if (dir.want === "down") reachedGoal = current.weight <= goal.targetWeight;
      else if (dir.want === "up") reachedGoal = current.weight >= goal.targetWeight;
      else reachedGoal = toGoal != null && toGoal <= 0.5;
    }

    var totalChange = (goal && goal.startWeight != null) ? round1(current.weight - goal.startWeight) : null;

    var height = Number(s && s.profile && s.profile.height) || 0;
    var bmi = height ? Math.round(current.weight / Math.pow(height / 100, 2) * 10) / 10 : null;
    var bmiBefore = (height && previous) ? Math.round(previous.weight / Math.pow(height / 100, 2) * 10) / 10 : null;

    return {
      current: round1(current.weight),
      previous: previous ? round1(previous.weight) : null,
      moved: moved,
      movedPct: (previous && previous.weight) ? Math.round(moved / previous.weight * 1000) / 10 : null,
      avg7: avg7, avg30: avg30,
      vsAvg7: avg7 != null ? round1(current.weight - avg7) : null,
      vsAvg30: avg30 != null ? round1(current.weight - avg30) : null,
      entries: list.length,
      daysSincePrevious: previous ? Math.max(1, Math.round((current.t - previous.t) / DAY)) : null,
      direction: dir ? dir.want : null,
      goalWeight: goal ? round1(goal.targetWeight) : null,
      startWeight: goal ? round1(goal.startWeight) : null,
      toGoal: toGoal,
      totalChange: totalChange,
      reachedGoal: reachedGoal,
      newLowest: lowestBefore != null && current.weight < lowestBefore,
      newHighest: highestBefore != null && current.weight > highestBefore,
      lowestBefore: round1(lowestBefore),
      bmi: bmi, bmiBefore: bmiBefore,
      bmiImproved: (bmi != null && bmiBefore != null && dir)
        ? (dir.want === "down" ? bmi < bmiBefore : dir.want === "up" ? bmi > bmiBefore : Math.abs(bmi - bmiBefore) < 0.1)
        : null,
      loggingStreak: loggingStreak(list)
    };
  }

  /** Consecutive days with a weigh-in, counting back from the most recent one. */
  function loggingStreak(list) {
    if (!list.length) return 0;
    var seen = {};
    list.forEach(function (e) { seen[e.date] = 1; });
    var streak = 0;
    var cur = new Date(list[0].t);
    var keyOf = function (dt) {
      /* The same local rule the rest of the app uses. `cur` is a noon-LOCAL instant, and
         formatting it as UTC returns the right day only where the offset is small enough that
         noon stays inside the same UTC day — at +13 (Auckland) noon local is 23:00 the previous
         day in UTC, so every streak there was counted against the wrong dates. */
      if (typeof dayKey === "function") return dayKey(dt);
      return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };
    for (var i = 0; i < 400; i++) {
      var key = keyOf(cur);
      if (!seen[key]) break;
      streak++;
      cur.setDate(cur.getDate() - 1);
    }
    return streak;
  }

  /* ---- which message ------------------------------------------------------------------- */

  /**
   * The message context for this weigh-in, chosen by trend.
   * Returns one of: weightGoalReached | weightMilestone | weightProgress | weightSteady |
   *                 weightFluctuation
   */
  function contextFor(a) {
    if (!a) return "weightSteady";
    if (a.reachedGoal) return "weightGoalReached";
    if (a.newLowest && a.direction !== "up") return "weightMilestone";
    if (a.newHighest && a.direction === "up") return "weightMilestone";

    /* Against the 7-day average rather than yesterday, when there is one. Yesterday is noise;
       the average is the signal. Under 0.2kg either way is not a real move at all. */
    var delta = a.vsAvg7 != null ? a.vsAvg7 : a.moved;
    if (delta == null || Math.abs(delta) < 0.2) return "weightSteady";

    var good = a.direction === "up" ? delta > 0
             : a.direction === "hold" ? Math.abs(delta) < 0.5
             : delta < 0;                                   // default: down is progress
    return good ? "weightProgress" : "weightFluctuation";
  }

  function message(a) {
    var ctx = contextFor(a);
    var line = "";
    try { line = (window.IgnytMessages && IgnytMessages.next(ctx)) || ""; } catch (e) {}
    return { context: ctx, line: line };
  }

  /* ---- rewards ------------------------------------------------------------------------- */

  /**
   * Pays XP and raises celebrations for anything this weigh-in earned. Idempotent: every award
   * is keyed in the XP ledger, so calling this twice for the same entry pays once.
   * @returns {string[]} what was awarded, for the caller to show.
   */
  function reward(s, a) {
    var earned = [];
    if (!a || !window.IgnytXP) return earned;
    var key = entries(s)[0];
    if (!key) return earned;

    if (IgnytXP.award("weightUpdate", key.date)) earned.push("+10 XP");

    // Streak bonuses, keyed by the day they were reached so each pays once.
    if (a.loggingStreak >= 7 && IgnytXP.award("weightStreakWeek", key.date)) earned.push("+30 XP · 7-day logging streak");
    if (a.loggingStreak >= 30 && IgnytXP.award("weightStreakMonth", key.date)) earned.push("+100 XP · 30-day logging streak");

    if (a.reachedGoal && IgnytXP.award("weightGoalReached", String(a.goalWeight))) {
      earned.push("+500 XP · goal reached");
      celebrate("\u{1F389}", "Goal Achieved", "You reached " + a.goalWeight + " kg.", "+500 XP");
    } else if (a.newLowest && a.direction !== "up") {
      if (IgnytXP.award("weightNewLowest", key.date)) {
        celebrate("\u{1F3C6}", "New lowest weight", "Lower than anything you have logged before.", null);
      }
    }
    return earned;
  }

  function celebrate(icon, title, body, stat) {
    try {
      if (window.IgnytCelebrate) IgnytCelebrate.celebrate({ kind: "milestone", icon: icon, title: title, body: body, stat: stat });
    } catch (e) { /* a celebration failing must never block a save */ }
  }

  /** Everything a screen needs, in one call. */
  function summary(s) {
    var a = analyse(s);
    if (!a) return null;
    return { analysis: a, message: message(a) };
  }

  return {
    entries: entries, analyse: analyse, direction: direction,
    contextFor: contextFor, message: message, reward: reward, summary: summary,
    loggingStreak: loggingStreak
  };
})();
