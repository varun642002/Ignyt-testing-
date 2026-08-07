/* =========================================================
   BADGE ART — the supplied medal artwork, with the hand-drawn SVG as the floor.

   badge-image-generator/import_badges.py cuts the artwork out of the source images into
   www/assets/badges/<achievement id>.webp, plus a manifest listing what it actually produced.
   This module is the app's side of that contract.

   KEYED ON ACHIEVEMENT ID, NOT CATEGORY+TIER. The first version of this file assumed 30 shared
   frames — six category shapes times five tiers — with the numeral drawn over the top. The real
   artwork is one unique image per achievement: an owl for Night Owl, a globe for lifetime
   volume, scales for weigh-ins, a sunrise for the early starts. A shared "milestone gold" frame
   cannot give Night Owl an owl, so the art is per badge and the id is the key.

   THE NUMERAL IS IN THE IMAGE, so nothing is drawn over it. That also followed from the artwork
   rather than being chosen: the value is engraved metal catching the same light as the frame,
   not text sitting on a picture. An SVG numeral laid over "100 EXERCISES" would simply print
   the number twice.

   THE FALLBACK IS THE POINT, not a safety net bolted on afterwards. There are three states this
   has to be correct in, and only one of them has every badge:

     nothing imported yet    every badge draws the existing SVG.
     partly imported         the imported ones use art, the rest use SVG, in the same grid.
     fully imported          every badge uses art.

   The middle case is where this actually lives — 61 of 82 badges have art today, and the rest
   are waiting on separate uploads. So "is there art for this badge" is answered per badge, from
   the manifest, every time. The manifest lists what is ON DISK rather than what was requested,
   because a badge advertised but missing renders a broken image instead of falling back.

   WHY THE MANIFEST AND NOT AN <img> onerror. onerror works, but it fires AFTER the browser has
   requested a URL that is not there — a 404 per missing badge, every time the screen renders.
   Asking a single JSON file once is cheaper and quieter.
========================================================= */

window.IgnytBadgeFrames = (function () {
  "use strict";

  var BASE = "assets/badges/";
  var _ids = null;         // Set of achievement ids, or null until the manifest resolves
  var _loading = null;

  /** Load the manifest once. Absent is a normal answer — it means nothing has been imported —
   *  so a failure resolves to an empty set rather than rejecting. */
  function load() {
    if (_ids) return Promise.resolve(_ids);
    if (_loading) return _loading;
    _loading = fetch(BASE + "manifest.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        _ids = new Set(Array.isArray(j && j.badges) ? j.badges : []);
        return _ids;
      })
      .catch(function () { _ids = new Set(); return _ids; });
    return _loading;
  }

  /**
   * Synchronous, because render() is synchronous. Before the manifest resolves this answers
   * false for everything, so the first paint uses the SVG and the next render — after ready()
   * fires — uses the art. One frame of the hand-drawn badge beats blocking the screen on a
   * network round trip, and beats a layout that shifts as images arrive at different times.
   */
  function has(id) {
    return !!(_ids && _ids.has(String(id)));
  }

  function src(id) {
    return BASE + encodeURIComponent(String(id)) + ".webp";
  }

  /** Resolves once the manifest is known. app.js re-renders on this so the art appears without
   *  the user having to navigate away and back. */
  function ready() { return load(); }

  return { ready: ready, has: has, src: src };
})();
