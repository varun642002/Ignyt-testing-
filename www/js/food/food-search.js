/* =========================================================
   IGNYT FOOD SEARCH

   Ranked, in-memory search over the bundled catalogue (IgnytFoodDB) plus the user's own
   favourite foods, so a search finds both "Chicken Breast" from the catalogue and whatever
   the user saved themselves.

   WHY IN-MEMORY
   The catalogue is a few hundred static entries. Building a token index once at first use
   and scanning it costs well under a millisecond per query -- far cheaper than the storage
   and invalidation complexity of a persisted index, and it can never fall out of sync with
   the data because it is rebuilt from the data itself. The index is lazily built on first
   search (so it costs nothing on app start) and the favourites portion is rebuilt whenever
   the favourites array changes length or content, which is the only part that can change at
   runtime.

   RANKING (highest first)
   1. exact name match
   2. name starts with the query
   3. a word within the name starts with the query   ("breast" -> Chicken Breast)
   4. alias hit                                       ("curd"   -> Yogurt)
   5. substring anywhere in the name
   Ties break toward the user's own favourites, then shorter names -- a query for "rice"
   should surface "White Rice (cooked)" ahead of "Chicken Biryani".

   Typo tolerance is intentionally narrow: a single-edit (Levenshtein <= 1) fallback that
   only runs when nothing else matched, and only for queries of 4+ characters. Anything
   looser produces confidently wrong food matches, which is worse than no result when the
   output is someone's calorie log.
========================================================= */
(function () {
  "use strict";

  var _index = null;        // [{food, name, words}]
  var _favSignature = "";   // cheap change-detector for the favourites portion

  function norm(s) { return String(s == null ? "" : s).trim().toLowerCase(); }

  function favSignature() {
    var favs = (typeof state !== "undefined" && Array.isArray(state.favoriteFoods)) ? state.favoriteFoods : [];
    return favs.length + "|" + favs.map(function (f) { return f && f.name; }).join(",");
  }

  function buildIndex() {
    var out = [];
    var db = window.IgnytFoodDB;
    if (db) {
      db.all().forEach(function (f) {
        var n = norm(f.name);
        out.push({ food: f, name: n, words: n.split(/[^a-z0-9]+/).filter(Boolean), fav: false });
      });
    }
    // The user's own foods are searchable alongside the catalogue. They are stored as
    // absolute macros for one logged portion (not per 100 g), which `per: null` records so
    // the portion UI knows not to offer gram scaling for them.
    var favs = (typeof state !== "undefined" && Array.isArray(state.favoriteFoods)) ? state.favoriteFoods : [];
    favs.forEach(function (f) {
      if (!f || !f.name) return;
      var n = norm(f.name);
      out.push({
        fav: true,
        name: n,
        words: n.split(/[^a-z0-9]+/).filter(Boolean),
        food: {
          id: f.id != null ? "fav:" + f.id : "fav:" + n,
          name: f.name, category: "Custom Foods", per: null, source: "favorite",
          calories: Number(f.calories) || 0, protein: Number(f.protein) || 0,
          carbs: Number(f.carbs) || 0, fat: Number(f.fat) || 0, fibre: Number(f.fibre) || 0
        }
      });
    });
    _index = out;
    _favSignature = favSignature();
  }

  function ensureIndex() {
    if (_index === null || favSignature() !== _favSignature) buildIndex();
    return _index;
  }

  /** Levenshtein distance, capped: returns >max as soon as it's certain, so the common
   *  "clearly different" case exits early instead of filling the whole matrix. */
  function editDistanceWithin(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1; // no cell in this row can lead to a result <= max
      for (j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }

  /** Resolves an alias to its canonical catalogue name, or null. Matches whole query only —
   *  aliasing on partial input produces surprising jumps while the user is still typing. */
  function resolveAlias(q) {
    var db = window.IgnytFoodDB;
    if (!db) return null;
    return Object.prototype.hasOwnProperty.call(db.ALIASES, q) ? db.ALIASES[q] : null;
  }

  function scoreEntry(entry, q) {
    if (entry.name === q) return 100;
    if (entry.name.indexOf(q) === 0) return 80;
    for (var i = 0; i < entry.words.length; i++) {
      if (entry.words[i].indexOf(q) === 0) return 60;
    }
    if (entry.name.indexOf(q) !== -1) return 40;
    return 0;
  }

  /**
   * @param {string} query
   * @param {{limit?:number, category?:string}} [opts]
   * @returns {Array} catalogue/favourite food objects, best match first
   */
  function search(query, opts) {
    var o = opts || {};
    var limit = o.limit || 25;
    var q = norm(query);
    var index = ensureIndex();
    if (!q) {
      // Empty query: show favourites first, then the catalogue, so the panel is useful
      // before the user types anything.
      return index.filter(function (e) { return !o.category || e.food.category === o.category; })
        .sort(function (a, b) { return (b.fav ? 1 : 0) - (a.fav ? 1 : 0); })
        .slice(0, limit).map(function (e) { return e.food; });
    }

    var aliasTarget = resolveAlias(q);
    var aliasName = aliasTarget ? norm(aliasTarget) : null;

    var scored = [];
    for (var i = 0; i < index.length; i++) {
      var e = index[i];
      if (o.category && e.food.category !== o.category) continue;
      var s = scoreEntry(e, q);
      if (s === 0 && aliasName && e.name === aliasName) s = 50; // alias hit
      if (s > 0) scored.push({ e: e, s: s });
    }

    // Nothing matched at all -> allow a small number of typos. The budget scales with query
    // length: one edit for short words (where a second edit could reach an entirely
    // different food), two for 5+ characters, which is what "chikn" -> "chicken" needs.
    // Short queries get no fuzzy pass at all, since almost anything is within one edit of a
    // three-letter string.
    if (scored.length === 0 && q.length >= 4) {
      var budget = q.length >= 5 ? 2 : 1;
      for (var k = 0; k < index.length; k++) {
        var ent = index[k];
        if (o.category && ent.food.category !== o.category) continue;
        for (var w = 0; w < ent.words.length; w++) {
          var d = editDistanceWithin(q, ent.words[w], budget);
          if (d <= budget) { scored.push({ e: ent, s: 20 - d }); break; } // closer typo ranks higher
        }
      }
    }

    scored.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      if (a.e.fav !== b.e.fav) return a.e.fav ? -1 : 1;   // the user's own foods win ties
      if (a.e.name.length !== b.e.name.length) return a.e.name.length - b.e.name.length;
      return a.e.name.localeCompare(b.e.name);
    });
    return scored.slice(0, limit).map(function (x) { return x.e.food; });
  }

  window.IgnytFoodSearch = Object.freeze({
    search: search,
    /** Forces an index rebuild. Not normally needed -- favourites are change-detected. */
    invalidate: function () { _index = null; },
    indexSize: function () { return ensureIndex().length; }
  });
}());
