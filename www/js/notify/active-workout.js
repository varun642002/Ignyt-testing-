/* =========================================================
   LIVE WORKOUT NOTIFICATION

   While a workout is open and the app is not in front, a notification sits in the shade saying
   the session is still running, with a timer counting up, and tapping it goes straight back to
   the workout.

   RECONCILED, NOT TOGGLED
   sync() looks at the world — is there a session, is the app in front — and makes the
   notification match. It is not a pair of show/hide calls sprinkled through the four places a
   session can end (finish, discard, discard-empty, cancel-edit); those are exactly the paths a
   toggle gets wrong, and the failure mode is a notification claiming a workout is running after
   the user finished it. Calling sync() more often than necessary is free, so it is called from
   the render path as well as from the app-state events.

   IN FRONT MEANS NO NOTIFICATION
   Someone looking at the workout screen does not need to be told they are in a workout. It
   appears when the app goes to the background and clears when it comes back.

   THE TIMER IS NATIVE
   The elapsed time is a chronometer driven by Android from the session's startedAt, so it stays
   correct with the app asleep and nothing here has to wake up to redraw it.
========================================================= */

window.IgnytActiveWorkout = (function () {
  "use strict";

  var shown = false;          // what we last asked the OS for, so an unchanged state is a no-op
  var lastKey = "";

  function plugin() {
    try {
      return (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
              window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytNotify) || null;
    } catch (e) { return null; }
  }

  /* Read as a bare identifier, not off window. app.js declares `state` with const, and a
     top-level const lives in the script's lexical scope and never becomes a window property —
     window.state is undefined while `state` resolves perfectly well. Guarding on window.state
     silently reported "no session" forever, which is a notification that never appears. */
  function session() {
    try { return (typeof state !== "undefined" && state && state.session) || null; }
    catch (e) { return null; }
  }

  /** Completed sets across the session — what the body line reports. */
  function progress(s) {
    var done = 0, total = 0;
    (s.exercises || []).forEach(function (e) {
      (e.sets || []).forEach(function (st) { total++; if (st.done) done++; });
    });
    return { done: done, total: total, exercises: (s.exercises || []).length };
  }

  function bodyFor(s) {
    var p = progress(s);
    if (!p.total) return "No sets logged yet. Tap to carry on.";
    if (p.done >= p.total) return "All " + p.total + " sets done. Tap to finish and save.";
    return p.done + " of " + p.total + " sets done. Tap to carry on.";
  }

  function titleFor(s) {
    var name = (s.title && String(s.title).trim()) || "Workout";
    return name + " in progress";
  }

  /**
   * Make the notification match reality.
   * @param {boolean} [inForeground] whether the app is in front. Defaults to the document's own
   *        visibility, which is what a plain render() call knows.
   */
  function sync(inForeground) {
    var p = plugin();
    if (!p) return;                       // web build: no notification to manage

    var s = session();
    var visible = (inForeground === undefined)
      ? (typeof document !== "undefined" && document.visibilityState === "visible")
      : !!inForeground;

    var want = !!s && !visible;
    if (!want) {
      if (shown) {
        shown = false; lastKey = "";
        try { p.hideActiveWorkout(); } catch (e) { /* never fatal */ }
      }
      return;
    }

    /* Re-posting an identical notification is harmless but pointless, and on some launchers it
       makes the shade flicker. The key is everything the notification actually displays. */
    var title = titleFor(s), body = bodyFor(s), startedAt = Number(s.startedAt) || 0;
    var key = title + "|" + body + "|" + startedAt;
    if (shown && key === lastKey) return;

    shown = true; lastKey = key;
    try { p.showActiveWorkout({ title: title, body: body, startedAt: startedAt }); }
    catch (e) { shown = false; lastKey = ""; }
  }

  /** Called when a session ends, so the notification goes at once rather than on next render. */
  function clear() {
    var p = plugin();
    shown = false; lastKey = "";
    if (p) { try { p.hideActiveWorkout(); } catch (e) {} }
  }

  function start() {
    /* Capacitor's appStateChange is the reliable signal on Android — visibilitychange does fire
       in the WebView, but appStateChange is what actually tracks the activity going to the
       background, including the cases where the WebView keeps reporting itself visible. Both
       are wired; sync() is idempotent, so being told twice costs nothing. */
    try {
      var App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (App && App.addListener) {
        App.addListener("appStateChange", function (st) { sync(!!(st && st.isActive)); });
      }
    } catch (e) { /* no App plugin — visibilitychange below still covers it */ }

    try {
      document.addEventListener("visibilitychange", function () { sync(); });
      window.addEventListener("pagehide", function () { sync(false); });
    } catch (e) {}

    // And once now, in case the app was reopened from the notification with a session still open.
    sync();
  }

  return { sync: sync, clear: clear, start: start,
           /** Test seam. */ _state: function () { return { shown: shown, key: lastKey }; } };
})();
