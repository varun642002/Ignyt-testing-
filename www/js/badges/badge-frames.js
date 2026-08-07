/* =========================================================
   BADGE FRAMES — generated medal art, with the hand-drawn SVG as the floor.

   badge-image-generator/generate_badges.py produces one image per category+tier into
   www/assets/badges/, plus a manifest listing what it actually managed to make. This module is
   the app's side of that contract.

   THE FALLBACK IS THE POINT, not a safety net bolted on afterwards. There are three states this
   has to be correct in, and only one of them has all the art:

     nothing generated yet   every badge draws the existing SVG. This is today.
     partly generated        the generated ones use art, the rest use SVG, in the same grid.
     fully generated         every badge uses art.

   A partial run is the normal case, not an edge case — 30 API calls, any of which can fail, and
   the script deliberately continues past a failure rather than abandoning 29 good frames. So
   "does this frame exist" is answered per badge, from the manifest, every time.

   WHY THE MANIFEST AND NOT AN <img> onerror. onerror works, but it fires AFTER the browser has
   requested a URL that is not there — a 404 per missing badge, ~90 of them on the achievements
   screen, every time it renders. Asking a single JSON file once is cheaper and quieter.

   WHY THE NUMERAL IS NOT IN THE IMAGE. It is drawn as SVG on top. Baking "500K KG" into art
   would mean 90 files rather than 30, a re-render whenever a threshold moves, and text
   rasterised at one size for every screen density.
========================================================= */

window.IgnytBadgeFrames = (function () {
  "use strict";

  var BASE = "assets/badges/";
  var _frames = null;      // Set of "category-tier", or null until the manifest resolves
  var _loading = null;

  /** Load the manifest once. Absent is a normal answer — it means nothing has been generated —
   *  so a failure resolves to an empty set rather than rejecting. */
  function load() {
    if (_frames) return Promise.resolve(_frames);
    if (_loading) return _loading;
    _loading = fetch(BASE + "manifest.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : { frames: [] }; })
      .then(function (j) {
        _frames = new Set(Array.isArray(j && j.frames) ? j.frames : []);
        return _frames;
      })
      .catch(function () { _frames = new Set(); return _frames; });
    return _loading;
  }

  function key(category, tier) {
    return String(category || "milestone") + "-" + String(tier || "bronze");
  }

  /**
   * Synchronous, because render() is synchronous. Before the manifest resolves this answers
   * false for everything, so the first paint uses the SVG and the next render — after
   * ready() fires — uses the art. One frame of the old badge beats blocking the screen on a
   * network round trip, and beats a layout that shifts when images arrive at different times.
   */
  function has(category, tier) {
    return !!(_frames && _frames.has(key(category, tier)));
  }

  function src(category, tier) {
    return BASE + key(category, tier) + ".webp";
  }

  /** Resolves once the manifest is known. app.js re-renders on this so generated art appears
   *  without the user having to navigate away and back. */
  function ready() { return load(); }

  return { ready: ready, has: has, src: src, key: key };
})();
