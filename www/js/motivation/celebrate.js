/* =========================================================
   CELEBRATIONS — the visible payoff.

   One entry point, celebrate({...}), used for achievements, level-ups, milestones and
   personal records. Queued rather than stacked: finishing a workout can unlock a badge, a
   level and a streak at once, and three overlays fighting for the screen reads as a bug.

   BUILT WITHOUT A LIBRARY
   Confetti is a few dozen absolutely-positioned divs animated by CSS. A confetti dependency
   would be more code than this and another thing to keep working.

   RESPECTS prefers-reduced-motion
   The pieces are simply not created when the user has asked for less motion. The message and
   badge still appear — the celebration is the point, the animation is the decoration, and
   people who turn motion down should not lose the former to lose the latter.
========================================================= */

window.IgnytCelebrate = (function () {
  "use strict";

  var queue = [];
  var showing = false;

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /**
   * Queue a celebration.
   * @param {object} c
   *   c.kind    "achievement" | "level" | "milestone" | "pr"
   *   c.title   the headline, e.g. "100 Workouts"
   *   c.body    a line of encouragement
   *   c.icon    emoji or short string shown in the badge
   *   c.stat    optional secondary line, e.g. "+150 XP"
   */
  function celebrate(c) {
    if (!c || !c.title) return;
    queue.push(c);
    if (!showing) drain();
  }

  function drain() {
    var c = queue.shift();
    if (!c) { showing = false; return; }
    showing = true;
    show(c, function () { setTimeout(drain, 220); });
  }

  function show(c, done) {
    var root = document.createElement("div");
    root.className = "celebrate";
    root.setAttribute("role", "status");        // announced, but does not steal focus
    root.innerHTML =
      '<div class="celebrate__backdrop"></div>' +
      '<div class="celebrate__card">' +
        '<div class="celebrate__icon">' + (c.icon || "⭐") + "</div>" +
        '<div class="celebrate__title">' + esc(c.title) + "</div>" +
        (c.body ? '<div class="celebrate__body">' + esc(c.body) + "</div>" : "") +
        (c.stat ? '<div class="celebrate__stat">' + esc(c.stat) + "</div>" : "") +
        '<button class="celebrate__ok" type="button">Nice</button>' +
      "</div>";

    if (!reducedMotion()) root.appendChild(confetti());
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add("is-in"); });

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      root.classList.remove("is-in");
      setTimeout(function () {
        if (root.parentNode) root.parentNode.removeChild(root);
        if (done) done();
      }, 240);
    }
    root.querySelector(".celebrate__ok").addEventListener("click", close);
    root.querySelector(".celebrate__backdrop").addEventListener("click", close);
    // Auto-dismiss so a celebration never blocks the app if it is missed.
    setTimeout(close, 6000);
  }

  function confetti() {
    var wrap = document.createElement("div");
    wrap.className = "celebrate__confetti";
    var colours = ["#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];
    for (var i = 0; i < 36; i++) {
      var p = document.createElement("i");
      p.style.left = (Math.random() * 100) + "%";
      p.style.background = colours[i % colours.length];
      p.style.animationDelay = (Math.random() * 0.5) + "s";
      p.style.animationDuration = (1.6 + Math.random() * 1.2) + "s";
      p.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      wrap.appendChild(p);
    }
    return wrap;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---- the app's own events ---------------------------------------------------------- */

  /** Newly unlocked achievements, from checkAchievements(). */
  function forAchievements(list) {
    (list || []).forEach(function (a) {
      var xp = window.IgnytXP ? window.IgnytXP.award("achievement", a.id) : null;
      celebrate({
        kind: "achievement",
        icon: "🏅",
        title: a.name,
        body: a.desc || (window.IgnytMessages ? IgnytMessages.next("streak") : ""),
        stat: xp ? "+" + xp.xp + " XP" : null
      });
    });
  }

  /** A level-up, raised from the xp-awarded event rather than called directly. */
  function forLevel(result) {
    if (!result || !result.leveledUp) return;
    var title = window.IgnytXP ? IgnytXP.title(result.levelAfter) : "";
    celebrate({
      kind: "level",
      icon: "⬆️",
      title: "Level " + result.levelAfter,
      body: title ? "You're now " + title + "." : "",
      stat: null
    });
  }

  try {
    window.addEventListener("ignyt:xp-awarded", function (e) { forLevel(e.detail); });
  } catch (e) { /* no window events available — celebrations still work when called directly */ }

  return {
    celebrate: celebrate,
    forAchievements: forAchievements,
    forLevel: forLevel,
    /** Test seam. */
    _pending: function () { return queue.length; }
  };
})();
