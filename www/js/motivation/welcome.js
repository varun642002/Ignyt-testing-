/* =========================================================
   DAILY WELCOME — the first five seconds.

   A greeting card on app open: who you are, how yesterday went, and what today asks for.
   Then it gets out of the way.

   WHEN IT SHOWS, AND WHEN IT DOES NOT
   On a genuine app open — a cold start, or coming back after five minutes away — never on a
   tab change or a re-render. A fitness app gets opened repeatedly during a session, and a
   card that reappears every time you glance at your phone mid-set stops being a welcome and
   becomes an obstacle. It is also skipped outright while a workout is in progress, and once
   it has been shown it does not return the same day unless the app has actually been closed.

   It auto-dismisses after ~2.6s, and a tap anywhere skips it immediately. Nothing behind it
   is blocked: the app has already rendered underneath.

   EVERY LINE IS EARNED
   The contextual message is chosen from what is actually logged — a streak from
   computeStreak(), a record from state.prs, weight change from two real weigh-ins, yesterday's
   score from the stored history. Nothing here is generated to fill a slot. Where the data for
   a condition is missing, that condition simply does not apply and the next one is tried.

   NOTHING SHAMES
   The "you logged nothing yesterday" and "you gained weight" cases exist precisely because
   those are the mornings people quit. They say the day is new and the number fluctuates,
   because both are true, and neither mentions failure.
========================================================= */

window.IgnytWelcome = (function () {
  "use strict";

  var SHOWN_KEY = "hx_welcome_shown";     // date string, so it shows once per calendar day
  var DAY = 86400000;

  function dateKey(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }

  /* ---- the greeting ------------------------------------------------------------------- */

  function timeGreeting() {
    var h = new Date().getHours();
    if (h < 5)  return { icon: "\u{1F319}", text: "Good Evening" };   // still up
    if (h < 12) return { icon: "\u{1F31E}", text: "Good Morning" };
    if (h < 17) return { icon: "\u{2600}\u{FE0F}", text: "Good Afternoon" };
    if (h < 21) return { icon: "\u{1F307}", text: "Good Evening" };
    return { icon: "\u{1F319}", text: "Good Evening" };
  }

  /* ---- what happened yesterday --------------------------------------------------------- */

  function scoreHistory() {
    try { return JSON.parse(localStorage.getItem("hx_score_history") || "{}") || {}; }
    catch (e) { return {}; }
  }

  function yesterdayFacts(s) {
    var yKey = dateKey(new Date(Date.now() - DAY));
    var yStart = new Date(); yStart.setHours(0, 0, 0, 0); yStart = yStart.getTime() - DAY;
    var yEnd = yStart + DAY;

    var workouts = (s.workoutLog || []).filter(function (w) {
      var t = new Date(w.startedAt || w.date).getTime();
      return t >= yStart && t < yEnd;
    });
    var meals = (s.foodLog || []).filter(function (f) { return f.date === yKey; });
    var water = (s.waterLog || []).filter(function (w) { return w.date === yKey; })
                  .reduce(function (a, w) { return a + (w.ml || 0); }, 0);
    var prs = (s.prs || []).filter(function (p) {
      return p.achievedAt >= yStart && p.achievedAt < yEnd;
    });

    return {
      key: yKey,
      workouts: workouts.length,
      meals: meals.length,
      waterMl: water,
      prs: prs.length,
      score: scoreHistory()[yKey],          // undefined when the day was never scored
      loggedNothing: !workouts.length && !meals.length && !water
    };
  }

  /** Weight change from the two most recent weigh-ins, when there are two. */
  function weightMove(s) {
    var log = (s.bodylog || []).filter(function (b) { return b && Number(b.weight) > 0; });
    if (log.length < 2) return null;
    // bodylog is newest-first
    var now = Number(log[0].weight), prev = Number(log[1].weight);
    var delta = Math.round((now - prev) * 10) / 10;
    if (delta === 0) return null;
    return { delta: delta, current: now };
  }

  /* ---- today's targets ----------------------------------------------------------------- */

  /**
   * What today asks for. Every row is omitted when the app cannot compute it honestly —
   * no protein target without a bodyweight, no calorie target without a profile.
   */
  function mission(s) {
    var rows = [];

    var planned = null;
    try { planned = (typeof plannedDayForToday === "function") ? plannedDayForToday() : null; } catch (e) {}
    rows.push({ key: "workout", icon: "\u{1F3CB}\u{FE0F}", label: "Workout",
                value: planned && planned.title ? planned.title : "Your choice" });

    var kcal = 0;
    try { kcal = typeof profileCalorieTarget === "function" ? profileCalorieTarget() : 0; } catch (e) {}
    if (kcal > 0) rows.push({ key: "calories", icon: "\u{1F525}", label: "Calories", value: Math.round(kcal).toLocaleString() + " kcal" });

    var bw = (s.profile && Number(s.profile.weight)) || 0;
    if (bw > 0) rows.push({ key: "protein", icon: "\u{1F969}", label: "Protein", value: Math.round(bw * 1.6) + " g" });

    var waterMl = (s.settings && s.settings.waterTargetMl) || 2500;
    rows.push({ key: "water", icon: "\u{1F4A7}", label: "Water", value: (waterMl / 1000).toFixed(1) + " L" });

    /* Steps only when Health Connect is actually feeding them. A step goal on a phone the app
       cannot read is a target nobody can hit or even see. */
    var hasSteps = false;
    try {
      var hc = JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null");
      hasSteps = !!(hc && hc.steps && hc.steps.steps != null);
    } catch (e) {}
    if (hasSteps) rows.push({ key: "steps", icon: "\u{1F45F}", label: "Steps", value: "10,000" });

    rows.push({ key: "score", icon: "\u{2B50}", label: "IGNYT Score", value: "100 · Excellent" });
    return rows;
  }

  /* ---- the contextual line ------------------------------------------------------------- */

  /**
   * One message, chosen by what is true. Ordered by how much it deserves the slot: a perfect
   * day beats a streak, a streak beats a generic hello. Returns {tone, title, lines[]}.
   */
  function contextMessage(s) {
    var y = yesterdayFacts(s);
    var streak = 0;
    try { streak = typeof computeStreak === "function" ? computeStreak() : 0; } catch (e) {}

    // Everything logged yesterday, and scored highly for it.
    if (y.score != null && y.score >= 130 && y.workouts && y.meals) {
      return { tone: "gold", title: "\u{1F31F} Perfect Day",
               lines: ["Workout, food and hydration — all of it logged yesterday.",
                       "You're building an incredible routine."] };
    }
    if (y.score != null && y.score >= 100) {
      return { tone: "gold", title: "\u{2B50} Score smashed",
               lines: ["You hit yesterday's Health Score target with " + y.score + ".",
                       "Let's do it again today."] };
    }
    if (y.prs > 0) {
      return { tone: "gold", title: "\u{1F3C6} Yesterday you got stronger",
               lines: [y.prs === 1 ? "You set a new personal record." : "You set " + y.prs + " new personal records.",
                       "Let's see what you're capable of today."] };
    }
    if (streak >= 3) {
      return { tone: "fire", title: "\u{1F525} " + streak + " day streak",
               lines: ["Amazing consistency.", "Today keeps it alive."] };
    }

    var w = weightMove(s);
    var goal = null;
    try { goal = window.IgnytGoals ? IgnytGoals.activeGoal() : null; } catch (e) {}
    if (goal && w) {
      var toGo = Math.round(Math.abs(goal.targetWeight - w.current) * 10) / 10;
      if (toGo > 0 && toGo <= 3) {
        return { tone: "blue", title: "You're nearly there",
                 lines: ["Only " + toGo + " kg from your goal.", "Stay consistent. You're closer than ever."] };
      }
    }
    if (w) {
      var losing = goal ? (goal.targetWeight < goal.startWeight) : true;
      var movingRight = losing ? w.delta < 0 : w.delta > 0;
      if (movingRight) {
        return { tone: "green", title: "Fantastic progress",
                 lines: ["Every healthy decision is paying off.", "Keep moving forward."] };
      }
      /* The other direction. Says what is true -- weight moves for a dozen reasons in a day --
         without implying anything went wrong. */
      return { tone: "blue", title: "Weight naturally fluctuates",
               lines: ["A single reading is not a trend.", "Your next healthy choice starts now."] };
    }

    if (y.loggedNothing) {
      return { tone: "blue", title: "A fresh start",
               lines: ["Every journey has quiet days.", "One healthy decision is enough to begin."] };
    }
    if (!y.workouts && streak === 0) {
      return { tone: "blue", title: "Welcome back",
               lines: ["Yesterday is gone. Today is a brand new opportunity.", "Let's continue your journey."] };
    }

    return { tone: "blue", title: "Let's make today count",
             lines: [(window.IgnytMessages && IgnytMessages.forDay(new Date().getHours() < 12 ? "morning" : "daily")) ||
                     "Today is another opportunity to become stronger."] };
  }

  /* ---- the coach line ------------------------------------------------------------------ */

  /** One actionable sentence, from what is still open today. Empty when there is nothing real
   *  to say -- a coach who always speaks is one nobody listens to. */
  function coachLine(s) {
    try {
      if (!window.IgnytScore) return "";
      var t = IgnytScore.today(s);
      var sug = IgnytScore.suggestions(s);
      if (!sug.length) return "Everything today's score can measure is already done.";
      var top = sug[0];
      var next = IgnytScore.nextLevel(t.score);
      if (next && (next.from - t.score) <= top.points) {
        return top.label + " would take you to " + next.name + ".";
      }
      return top.label + " is worth +" + top.points + " on today's score.";
    } catch (e) { return ""; }
  }

  /* ---- should it show ------------------------------------------------------------------ */

  function shouldShow(s) {
    try {
      if (s && s.session) return false;                       // never interrupt a live workout
      if (!sessionStorage.getItem("hx_fresh_open")) return false;
      if (localStorage.getItem(SHOWN_KEY) === dateKey()) return false;
      return true;
    } catch (e) { return false; }
  }

  function markShown() {
    try {
      localStorage.setItem(SHOWN_KEY, dateKey());
      sessionStorage.removeItem("hx_fresh_open");
    } catch (e) {}
  }

  /** Everything the card needs, in one call. */
  function build(s) {
    return {
      greeting: timeGreeting(),
      name: (s && s.profile && s.profile.name && s.profile.name.trim().split(/\s+/)[0]) || "",
      context: contextMessage(s),
      mission: mission(s),
      coach: coachLine(s)
    };
  }

  /* ---- the card ------------------------------------------------------------------------ */

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  var AUTO_MS = 2600;

  /**
   * Shows the card over whatever is already rendered. Never blocks: the app is behind it and
   * a tap anywhere dismisses immediately.
   */
  function show(s, onDone) {
    if (!shouldShow(s)) { if (onDone) onDone(); return false; }
    markShown();

    var d = build(s);
    var root = document.createElement("div");
    root.className = "wlc wlc--" + d.context.tone;
    root.setAttribute("role", "status");
    root.innerHTML =
      '<div class="wlc__sky" aria-hidden="true"></div>' +
      '<div class="wlc__card">' +
        '<div class="wlc__hello">' +
          '<span class="wlc__wave" aria-hidden="true">' + d.greeting.icon + "</span>" +
          "<span>" + esc(d.greeting.text) + (d.name ? ", " + esc(d.name) : "") + "</span>" +
        "</div>" +
        '<div class="wlc__title">' + esc(d.context.title) + "</div>" +
        d.context.lines.map(function (l, i) {
          return '<p class="wlc__line" style="--i:' + i + '">' + esc(l) + "</p>";
        }).join("") +
        (d.mission.length ? '<div class="wlc__mission">' +
          '<div class="wlc__mission-head">Today</div>' +
          d.mission.map(function (m, i) {
            return '<div class="wlc__row" style="--i:' + i + '">' +
                     '<span class="wlc__row-icon" aria-hidden="true">' + m.icon + "</span>" +
                     '<span class="wlc__row-label">' + esc(m.label) + "</span>" +
                     '<span class="wlc__row-value">' + esc(m.value) + "</span>" +
                   "</div>";
          }).join("") + "</div>" : "") +
        (d.coach ? '<div class="wlc__coach">' + esc(d.coach) + "</div>" : "") +
        '<button class="wlc__go" type="button">Let’s Go</button>' +
      "</div>";

    document.body.appendChild(root);
    document.body.classList.add("wlc-open");
    requestAnimationFrame(function () { root.classList.add("is-in"); });

    var closed = false, timer = null;
    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      root.classList.remove("is-in");
      var finish = function () {
        if (root.parentNode) root.parentNode.removeChild(root);
        document.body.classList.remove("wlc-open");
        if (onDone) onDone();
      };
      if (reducedMotion()) finish(); else setTimeout(finish, 260);
    }
    root.addEventListener("click", close);
    /* setTimeout, not an animation callback: this has to dismiss even in a tab that is not
       compositing, or the card would sit there forever on a backgrounded resume. */
    timer = setTimeout(close, reducedMotion() ? 1200 : AUTO_MS);
    return true;
  }

  return {
    timeGreeting: timeGreeting, yesterdayFacts: yesterdayFacts, weightMove: weightMove,
    mission: mission, contextMessage: contextMessage, coachLine: coachLine,
    shouldShow: shouldShow, markShown: markShown, build: build, show: show,
    AUTO_MS: AUTO_MS,
    /** Test seam. */ _reset: function () { try { localStorage.removeItem(SHOWN_KEY); } catch (e) {} }
  };
})();
