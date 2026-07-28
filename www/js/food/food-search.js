/* =========================================================
   IGNYT FOOD SEARCH

   Ranked search over every source IgnytFoodCatalogue exposes (seed foods, USDA, user
   imports) plus the user's own favourites.

   SCALE CHANGED THE DESIGN.
   The previous version scanned all 273 foods on every keystroke, which was fine. At ~8,000
   foods a full scan per keystroke is 8,000 string comparisons times however fast someone
   types, so this version builds a TOKEN POSTINGS INDEX once and looks candidates up instead:

     tokens[]        every distinct word across all food names, sorted
     postings[]      for each token, the indices of the foods containing it

   A sorted token array makes prefix matching a binary search for the range starting with the
   query fragment, rather than a scan of every token. Building the index over 8,000 foods
   costs ~40 ms once; a query then touches only the foods that actually contain a matching
   word.

   MATCHING IS AND, NOT OR.
   "chicken breast" must mean foods containing BOTH words. Scoring the union would bury
   "Chicken Breast" under a thousand foods that merely say "chicken". Each query token
   contributes its own score and a food must satisfy every token to qualify.

   THREE TIERS, cheapest first, each running only if the previous returned too little:
     1. token match   exact word, then word-prefix          (index lookup)
     2. substring     "ghurt" -> "Yogurt"                   (linear, ~2 ms at 8,000 foods)
     3. fuzzy         edit distance, "chikn" -> "chicken"   (linear, only when nothing matched)

   TYPO TOLERANCE STAYS NARROW. The budget scales with query length: none below 4 characters,
   1 edit at 4, 2 at 5+. Anything looser produces confidently wrong food matches, which is
   worse than no result when the output is someone's calorie log.
========================================================= */
(function () {
  "use strict";

  var RECENT_SEARCH_KEY = "hx_recent_food_searches";
  var RECENT_SEARCH_MAX = 20;

  var _entries = null;      // [{food, key, words, boost}]
  var _tokens = null;       // sorted distinct tokens
  var _postings = null;     // token -> [entry index]
  var _signature = "";      // change-detector for the mutable sources
  var _buildMs = 0;
  var _cache = Object.create(null);   // query -> results, cleared on rebuild
  var _cacheKeys = [];
  var CACHE_MAX = 40;

  /* ---------------------------------------------------------
     Normalisation
  --------------------------------------------------------- */

  /** Lowercase, accent-stripped, punctuation-collapsed. "Jalapeño" and "jalapeno" agree. */
  function norm(s) {
    return String(s == null ? "" : s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // strip combining accent marks
      .toLowerCase()
      .replace(/[^a-z0-9%]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function wordsOf(key) {
    return key ? key.split(" ").filter(function (w) { return w.length > 1; }) : [];
  }

  /* ---------------------------------------------------------
     Recent searches
  --------------------------------------------------------- */
  function recentSearches() {
    try {
      var raw = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (s) { return typeof s === "string"; }) : [];
    } catch (e) { return []; }
  }

  /** Records a query the user actually acted on. Most recent first, de-duplicated. */
  function rememberSearch(query) {
    var q = String(query || "").trim();
    if (q.length < 2) return;
    var list = recentSearches().filter(function (s) { return s.toLowerCase() !== q.toLowerCase(); });
    list.unshift(q);
    if (list.length > RECENT_SEARCH_MAX) list.length = RECENT_SEARCH_MAX;
    try { localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list)); } catch (e) { /* quota */ }
  }

  function clearRecentSearches() {
    try { localStorage.removeItem(RECENT_SEARCH_KEY); } catch (e) { /* non-fatal */ }
  }

  /* ---------------------------------------------------------
     Index
  --------------------------------------------------------- */

  function favourites() {
    return (typeof state !== "undefined" && Array.isArray(state.favoriteFoods)) ? state.favoriteFoods : [];
  }

  /** Names logged recently, so foods the user actually eats float up. */
  function recentlyLoggedNames() {
    var out = Object.create(null);
    if (typeof state === "undefined" || !Array.isArray(state.foodLog)) return out;
    var seen = 0;
    for (var i = 0; i < state.foodLog.length && seen < 60; i++) {
      var n = state.foodLog[i] && state.foodLog[i].name;
      if (!n) continue;
      var k = norm(n);
      if (out[k]) continue;
      out[k] = 1;
      seen++;
    }
    return out;
  }

  function signature() {
    var favs = favourites();
    var cat = window.IgnytFoodCatalogue;
    return [
      cat ? cat.status() : "none",
      cat ? cat.count() : 0,
      favs.length,
      favs.map(function (f) { return f && f.name; }).join(""),
      (typeof state !== "undefined" && Array.isArray(state.foodLog)) ? state.foodLog.length : 0
    ].join("|");
  }

  function buildIndex() {
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    var entries = [];
    var recent = recentlyLoggedNames();

    var catalogue = window.IgnytFoodCatalogue ? window.IgnytFoodCatalogue.all()
      : (window.IgnytFoodDB ? window.IgnytFoodDB.all() : []);

    catalogue.forEach(function (f) {
      var key = norm(f.name);
      entries.push({
        food: f,
        key: key,
        words: wordsOf(key),
        fav: false,
        // A static per-food bonus, folded in once so the hot path never recomputes it.
        // Seed foods carry short familiar names ("Chicken Breast") against USDA's inverted
        // laboratory phrasing, so they lead on ties. Recently logged foods lead outright.
        boost: (recent[key] ? 150 : 0) +
               (f.source === "seed" ? 80 : 0) +
               (f.source === "import" ? 60 : 0)
      });
    });

    // The user's own foods are stored as absolute macros for one logged portion, not per
    // 100 g. `per: null` records that so the portion UI knows not to offer gram scaling.
    favourites().forEach(function (f) {
      if (!f || !f.name) return;
      var key = norm(f.name);
      entries.push({
        fav: true,
        key: key,
        words: wordsOf(key),
        boost: 250 + (recent[key] ? 150 : 0),
        food: {
          id: f.id != null ? "fav:" + f.id : "fav:" + key,
          name: f.name, category: "Custom Foods", per: null, source: "favorite",
          calories: Number(f.calories) || 0, protein: Number(f.protein) || 0,
          carbs: Number(f.carbs) || 0, fat: Number(f.fat) || 0, fibre: Number(f.fibre) || 0
        }
      });
    });

    // token -> entry indices
    var postings = Object.create(null);
    for (var i = 0; i < entries.length; i++) {
      var ws = entries[i].words;
      var seen = Object.create(null);
      for (var j = 0; j < ws.length; j++) {
        var w = ws[j];
        if (seen[w]) continue;
        seen[w] = 1;
        (postings[w] || (postings[w] = [])).push(i);
      }
    }

    _entries = entries;
    _postings = postings;
    _tokens = Object.keys(postings).sort();
    _signature = signature();
    _cache = Object.create(null);
    _cacheKeys = [];
    _buildMs = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;
  }

  function ensureIndex() {
    if (_entries === null || signature() !== _signature) buildIndex();
    return _entries;
  }

  /** First index in the sorted token array at or after `prefix`. */
  function lowerBound(prefix) {
    var lo = 0, hi = _tokens.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (_tokens[mid] < prefix) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  /** Every token starting with `prefix`, via the sorted array rather than a full scan. */
  function tokensWithPrefix(prefix) {
    var out = [];
    for (var i = lowerBound(prefix); i < _tokens.length; i++) {
      if (_tokens[i].indexOf(prefix) !== 0) break;   // sorted, so the run ends here
      out.push(_tokens[i]);
      if (out.length >= 400) break;                  // a 1-char prefix can match thousands
    }
    return out;
  }

  /* ---------------------------------------------------------
     Typo tolerance
  --------------------------------------------------------- */

  /** Levenshtein distance, capped: bails as soon as no result <= max is reachable. */
  function editDistanceWithin(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      for (j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }

  function typoBudget(q) {
    if (q.length < 4) return 0;
    return q.length >= 5 ? 2 : 1;
  }

  /* ---------------------------------------------------------
     Aliases
  --------------------------------------------------------- */

  /** Resolves an alias to a canonical name. Whole-query only — aliasing a partial input
   *  makes results jump around while the user is still typing. */
  function resolveAlias(q) {
    var db = window.IgnytFoodDB;
    if (!db || !db.ALIASES) return null;
    return Object.prototype.hasOwnProperty.call(db.ALIASES, q) ? db.ALIASES[q] : null;
  }

  /* ---------------------------------------------------------
     Scoring
  --------------------------------------------------------- */

  /** Score for one query token against one entry. 0 means no match. */
  function tokenScore(entry, token) {
    var best = 0;
    for (var i = 0; i < entry.words.length; i++) {
      var w = entry.words[i];
      if (w === token) return 100;                       // exact word — cannot be beaten
      if (w.indexOf(token) === 0 && best < 60) best = 60; // word prefix
    }
    if (best === 0 && entry.key.indexOf(token) !== -1) best = 30;  // substring anywhere
    return best;
  }

  /* ---------------------------------------------------------
     Search
  --------------------------------------------------------- */

  /**
   * @param {string} query
   * @param {{limit?:number, category?:string, source?:string}} [opts]
   * @returns {Array} food objects, best match first
   */
  function search(query, opts) {
    var o = opts || {};
    var limit = o.limit || 25;
    var q = norm(query);
    var index = ensureIndex();

    var passesFilter = function (e) {
      if (o.category && e.food.category !== o.category) return false;
      if (o.source && e.food.source !== o.source) return false;
      return true;
    };

    if (!q) {
      // Empty query: favourites first, then whatever the user logs most, then the rest.
      return index.filter(passesFilter)
        .sort(function (a, b) {
          if (b.boost !== a.boost) return b.boost - a.boost;
          return a.key.length - b.key.length;
        })
        .slice(0, limit).map(function (e) { return e.food; });
    }

    var cacheKey = q + "|" + (o.category || "") + "|" + (o.source || "") + "|" + limit;
    if (_cache[cacheKey]) return _cache[cacheKey];

    var queryTokens = wordsOf(q);
    if (!queryTokens.length) queryTokens = [q];   // single short word, e.g. "eg"

    var aliasTarget = resolveAlias(q);
    var aliasTokens = aliasTarget ? wordsOf(norm(aliasTarget)) : null;

    // Best score per entry index. A map rather than a list because an entry can be reached by
    // more than one pass (the query itself and an alias expansion) and should keep its best.
    var scoreByIdx = Object.create(null);
    var seenAny = Object.create(null);

    /** Foods containing `token` exactly or as a word prefix. */
    function candidatesFor(token) {
      var ids = Object.create(null);
      var exact = _postings[token];
      if (exact) for (var i = 0; i < exact.length; i++) ids[exact[i]] = 1;
      tokensWithPrefix(token).forEach(function (tok) {
        var p = _postings[tok];
        for (var k = 0; k < p.length; k++) ids[p[k]] = 1;
      });
      return Object.keys(ids);
    }

    /**
     * Scores one entry against a token set. Every token must match (AND), otherwise the
     * entry is rejected for this pass.
     */
    function evaluate(idx, tokens, bonus) {
      seenAny[idx] = 1;
      var e = index[idx];
      if (!passesFilter(e)) return;

      var total = 0;
      for (var t = 0; t < tokens.length; t++) {
        var s = tokenScore(e, tokens[t]);
        if (s === 0) return;
        total += s;
      }
      total = total / tokens.length + bonus;

      // Whole-name bonuses, which is what separates "Egg" from "Egg Noodles, Cooked".
      if (e.key === q) total += 1000;
      else if (e.key.indexOf(q) === 0) total += 300;
      total += e.boost;

      if (scoreByIdx[idx] === undefined || total > scoreByIdx[idx]) scoreByIdx[idx] = total;
    }

    /** Gathers candidates from the rarest token, then verifies each against the whole set. */
    function runPass(tokens, bonus) {
      var lists = tokens.map(candidatesFor);
      var smallest = 0;
      for (var c = 1; c < lists.length; c++) {
        if (lists[c].length < lists[smallest].length) smallest = c;
      }
      lists[smallest].forEach(function (idx) { evaluate(Number(idx), tokens, bonus); });
    }

    /* --- tier 1: token index --- */
    runPass(queryTokens, 0);

    /* --- alias expansion ---
       An alias has to RETRIEVE, not merely re-rank. "capsicum" matches no food name in any
       dataset, so boosting entries that already matched finds nothing at all — the alias
       target has to be searched in its own right. The bonus ranks alias hits well above
       incidental matches while still losing to a literal hit on what the user typed, so
       "curd" returns the food actually called Curd first and Yogurt just behind it. */
    if (aliasTokens && aliasTokens.length) runPass(aliasTokens, 400);

    function matchCount() { return Object.keys(scoreByIdx).length; }

    /* --- tier 2: substring scan ---
       Catches a query that sits inside a word rather than starting one ("gurt" -> "Yogurt"),
       which a prefix-based token index cannot see. Only runs when tier 1 came up short, and
       it is a single linear pass over ~8,000 short strings. */
    if (matchCount() < limit) {
      for (var i = 0; i < index.length; i++) {
        if (seenAny[i]) continue;
        var e = index[i];
        if (!passesFilter(e)) continue;
        var ok = true;
        for (var t2 = 0; t2 < queryTokens.length; t2++) {
          if (e.key.indexOf(queryTokens[t2]) === -1) { ok = false; break; }
        }
        if (ok) evaluate(i, queryTokens, 0);
      }
    }

    /* --- tier 3: typo tolerance ---
       Matched against the DISTINCT TOKEN LIST (~2,800 words), not every word of every food
       (~40,000). A token that matches then expands to its postings list, so the results are
       identical while the edit-distance matrix runs an order of magnitude fewer times.
       Measured on the full catalogue this took a query from 238 ms to under 10 ms, which is
       the difference between a visible stall on every keystroke and no stall at all. */
    if (matchCount() === 0) {
      var budget = typoBudget(q);
      if (budget > 0) {
        for (var ti = 0; ti < _tokens.length; ti++) {
          var tok = _tokens[ti];
          // Length alone rules most tokens out; check it before building any matrix.
          if (Math.abs(tok.length - q.length) > budget) continue;
          var dist = editDistanceWithin(q, tok, budget);
          if (dist > budget) continue;

          var posts = _postings[tok];
          for (var pi = 0; pi < posts.length; pi++) {
            var eidx = posts[pi];
            if (!passesFilter(index[eidx])) continue;
            // Closer typo ranks higher. Scored directly rather than through evaluate(),
            // which would reject the entry for not containing the misspelled token.
            var sc = (40 - dist * 10) + index[eidx].boost;
            if (scoreByIdx[eidx] === undefined || sc > scoreByIdx[eidx]) scoreByIdx[eidx] = sc;
          }
        }
      }
    }

    var scored = Object.keys(scoreByIdx).map(function (idx) {
      return { e: index[idx], s: scoreByIdx[idx] };
    });

    scored.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      if (a.e.fav !== b.e.fav) return a.e.fav ? -1 : 1;
      if (a.e.key.length !== b.e.key.length) return a.e.key.length - b.e.key.length;
      return a.e.key < b.e.key ? -1 : 1;
    });

    var results = scored.slice(0, limit).map(function (x) { return x.e.food; });

    // Small bounded cache: repeated renders of the same panel are common (the app re-renders
    // wholesale), and re-running a search that has not changed is pure waste.
    _cache[cacheKey] = results;
    _cacheKeys.push(cacheKey);
    if (_cacheKeys.length > CACHE_MAX) delete _cache[_cacheKeys.shift()];

    return results;
  }

  window.IgnytFoodSearch = Object.freeze({
    search: search,
    /** Forces an index rebuild. Not normally needed — sources are change-detected. */
    invalidate: function () { _entries = null; _cache = Object.create(null); _cacheKeys = []; },
    indexSize: function () { return ensureIndex().length; },
    tokenCount: function () { ensureIndex(); return _tokens.length; },
    buildMs: function () { ensureIndex(); return Math.round(_buildMs * 10) / 10; },

    recentSearches: recentSearches,
    rememberSearch: rememberSearch,
    clearRecentSearches: clearRecentSearches,
    RECENT_SEARCH_KEY: RECENT_SEARCH_KEY,

    /** Exposed for tests. */
    _norm: norm
  });
}());
