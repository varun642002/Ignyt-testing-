/* =========================================================
   ANIMATED COUNTERS

   Numbers that count up instead of appearing. Mark up an element as

       <span data-count="1250" data-count-key="volume-week">1,250</span>

   and IgnytCounters.attach() (called once at the end of every render) does the rest.

   THE HARD PART IS NOT THE ANIMATION, IT IS KNOWING WHEN NOT TO RUN
   This app re-renders the whole screen on almost every interaction, and the elements are new
   DOM each time. An IntersectionObserver that fires on first paint would therefore re-count
   every number on the page every time anything changed — logging a meal would set the
   workout counters spinning. So the last value shown is remembered per KEY, in memory, and
   the animation only runs when the number is genuinely new to the user: first time it is
   seen, or when it has actually changed since it was last seen.

   The element's existing text is left alone until the animation starts, so a number is never
   blank and never flashes zero. If anything at all goes wrong the final value is written
   immediately — a counter that fails should look like plain text, not like a bug.

   REDUCED MOTION IS RESPECTED
   Someone who has asked for less movement gets the number, instantly. The information is the
   point; the count-up is the decoration.
========================================================= */

window.IgnytCounters = (function () {
  "use strict";

  /* key -> the value last shown to the user. In memory only: it is a display detail, not
     state, and restoring it across a reload would mean numbers never animate on open — which
     is exactly when they should. */
  var seen = Object.create(null);
  var running = [];                      // frames in flight, so a re-render can cancel them

  var DURATION = 900;

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* Eased so it decelerates into the final value — a linear count reads like a loading
     spinner, and the point is arrival, not progress. */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /** Formats to the same shape as the target: keeps decimals, adds thousands separators. */
  function format(value, decimals, useGrouping) {
    var n = decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value);
    return useGrouping ? n.toLocaleString(undefined, {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }) : String(n);
  }

  function cancelAll() {
    running.forEach(function (id) { cancelAnimationFrame(id); });
    running = [];
  }

  function animate(el, from, to, decimals, grouping, prefix, suffix) {
    var startedAt = null, finished = false;
    var final = prefix + format(to, decimals, grouping) + suffix;

    /* The starting value is written NOW, synchronously. The markup already contains the final
       number — it is rendered straight into the template so the page is correct with no JS at
       all — so waiting for the first frame to write `from` would show the answer, snap
       backwards, and count up to it again. */
    el.textContent = prefix + format(from, decimals, grouping) + suffix;

    function done() {
      if (finished) return;
      finished = true;
      if (el.isConnected) el.textContent = final;
    }

    function frame(now) {
      if (finished) return;
      if (!el.isConnected) { finished = true; return; }   // the render replaced it; stop quietly
      if (startedAt === null) startedAt = now;
      var t = Math.min(1, (now - startedAt) / DURATION);
      el.textContent = prefix + format(from + (to - from) * easeOut(t), decimals, grouping) + suffix;
      if (t < 1) running.push(requestAnimationFrame(frame));
      else done();
    }
    running.push(requestAnimationFrame(frame));

    /* Safety net. requestAnimationFrame does not run in a backgrounded tab, and does not run
       at all in a view that is not compositing frames — verified: rAF never fired once in the
       preview pane. Without this the number would sit on its STARTING value forever, which is
       simply wrong rather than merely unanimated. setTimeout still fires in both cases. */
    setTimeout(done, DURATION + 400);
  }

  /**
   * Animate every [data-count] on the page that has changed since the user last saw it.
   * Safe to call after every render — that is the intended use.
   */
  function attach(root) {
    cancelAll();
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-count]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var to = Number(el.getAttribute("data-count"));
      if (!isFinite(to)) continue;

      var key = el.getAttribute("data-count-key") || el.getAttribute("data-count");
      var decimals = Number(el.getAttribute("data-count-decimals")) || 0;
      var grouping = el.getAttribute("data-count-plain") === null;
      var prefix = el.getAttribute("data-count-prefix") || "";
      var suffix = el.getAttribute("data-count-suffix") || "";

      var had = Object.prototype.hasOwnProperty.call(seen, key);
      var from = had ? seen[key] : 0;
      seen[key] = to;

      // Unchanged since last seen, or motion is turned down: write it and move on.
      if ((had && from === to) || reducedMotion() || to === from) {
        el.textContent = prefix + format(to, decimals, grouping) + suffix;
        continue;
      }
      /* A number that fell should not crawl backwards for a second — that reads as a mistake
         rather than an animation. Drops land immediately; only gains count up. */
      if (to < from) {
        el.textContent = prefix + format(to, decimals, grouping) + suffix;
        continue;
      }
      animate(el, from, to, decimals, grouping, prefix, suffix);
    }
  }

  /** Forget what has been shown, so the next attach() counts everything up again. */
  function reset() { seen = Object.create(null); cancelAll(); }

  return { attach: attach, reset: reset, _seen: function () { return seen; } };
})();
