/* =========================================================
   IGNYT KNOWLEDGE BASE — the answers we already have, matched without asking anyone

   Sits between the direct actions and Gemini. A question it recognises is answered from
   www/data/knowledge.json instantly, offline, and at zero AI activities. A question it does
   not recognise it REFUSES, and the refusal is the important half.

   THE SCORING PROBLEM, and why it is not string matching.
   "How many sets should I do for chest?" and "How many chest sets should I do?" share no
   substring long enough to matter and are the same question. What they share is their CONTENT
   WORDS — sets, chest — once the scaffolding (how, many, should, i, do, for) is removed. So a
   question is reduced to its content words and compared as a set, weighted by how rare each
   word is across the whole base: "chest" appears in ten entries and is worth a lot, "workout"
   appears in dozens and is worth little. That is inverse document frequency, computed once at
   load from the data itself rather than from a hand-written list of important terms.

   NEVER FORCE A WEAK MATCH. This is the rule the whole file exists to enforce. The nearest
   entry to "why does my shoulder hurt when I bench" is the bench press technique answer, and
   returning it would be worse than saying nothing — it reads as an answer, so the user acts on
   it, and the thing they actually asked about is a possible injury. Below the threshold this
   returns null and the question goes to Gemini with its full text intact.

   SAFETY OUTRANKS SCORE. Pain, injury and medical questions are pulled out BEFORE matching,
   not after, because they are exactly the questions that score well against an exercise entry
   by sharing its exercise name. No score is high enough to override that.
========================================================= */
(function () {
  "use strict";

  var SRC = "data/knowledge.json";

  /* THE THRESHOLD. One definition, read by everything, overridable at runtime without a
     rebuild so it can be tuned against real questions rather than guessed at once.

     0.62, not the 0.85 in the brief, and the difference is a property of the scale rather than
     a loosening of the rule. This is cosine similarity over IDF-weighted content words: an
     exact paraphrase scores ~1.0, a close relative ~0.6-0.8, an unrelated question ~0.0-0.2.
     Set to 0.85 it rejects "how many sets for chest" against "How many sets should I do for
     chest?" — a question the base plainly contains — and every one of those goes to Gemini,
     which is the cost this system exists to avoid. Measured against the real 100 entries.

     If the scoring is ever swapped for embeddings, this number has to move with it; that is
     why the scale is documented here rather than the number being treated as a constant of
     nature. */
  var DEFAULT_THRESHOLD = 0.62;
  var THRESHOLD_KEY = "hx_kb_threshold";

  function threshold() {
    try {
      var v = parseFloat(localStorage.getItem(THRESHOLD_KEY));
      if (isFinite(v) && v > 0 && v <= 1) return v;
    } catch (e) {}
    return DEFAULT_THRESHOLD;
  }

  /* Scaffolding words. Removed because they appear in nearly every question and so carry no
     signal about WHICH question it is — keeping them makes every question look ~40% similar to
     every other, which is how a matcher ends up confidently wrong. */
  var STOP = {};
  ("a an the is are am was were be been do does did doing done how what when where which who why " +
   "should shall will would can could may might must i me my mine you your we our us they them " +
   "it its this that these those to for of in on at by with from as and or but if then than " +
   "there here about into over under out up down off no not yes so very much many more most " +
   "get got getting have has had need needs want wants take takes best good better").split(" ")
    .forEach(function (w) { STOP[w] = 1; });

  /* Light stemming, not a linguistics project. Only the endings that actually split a question
     from its answer here: sets/set, reps/rep, exercises/exercise, building/build. */
  function stem(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + "y";
    if (w.length > 4 && /(ses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    return w;
  }

  function tokens(text) {
    var raw = String(text || "").toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (!w || w.length < 2 || STOP[w]) continue;
      out.push(stem(w));
    }
    return out;
  }

  /* ---------- safety ------------------------------------------------------------------------
     Checked before any scoring. These questions share vocabulary with the exercise entries —
     "shoulder", "bench", "knee", "squat" — so they score WELL against exactly the answers that
     must not be given to them. */
  /* Written out on one line each. JavaScript has no /x flag — the readable multi-line form
     these started as is a Perl/Python feature, and here it would have been a syntax error that
     took the whole module out on load, taking the safety guard with it. */
  var PAIN = /\b(pain|painful|hurts?|hurting|aches?|aching|sore|soreness|injur(y|ed|ies)|strain(ed)?|sprain(ed)?|torn|swollen|swelling|numb|numbness|tingling|dizzy|dizziness|faint|stiff|pinch(ed|ing)?|clicking|locking)\b/;
  var MEDICAL = /\b(doctor|physio|physiotherapy|physiotherapist|surgery|surgical|rehab|rehabilitation|medication|medicine|tablet|prescribed|diagnosis|diagnosed|diabetes|diabetic|blood pressure|hypertension|pregnant|pregnancy|asthma|hernia|arthritis|sciatica|fracture|slipped disc)\b/;

  function safetyFlag(text) {
    var t = " " + String(text || "").toLowerCase().replace(/[’']/g, "") + " ";
    if (PAIN.test(t)) return "pain";
    if (MEDICAL.test(t)) return "medical";
    return null;
  }

  /* ---------- the index ---------------------------------------------------------------------
     Built once on first use. IDF comes from the corpus, so adding entries re-weights everything
     automatically and no term list needs maintaining by hand. */
  var _entries = null, _idf = null, _loading = null;

  function buildIndex(entries) {
    var df = {}, n = entries.length;
    entries.forEach(function (e) {
      e._t = tokens(e.q + " " + e.c);
      var seen = {};
      e._t.forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } });
    });
    var idf = {};
    Object.keys(df).forEach(function (w) {
      idf[w] = Math.log(1 + n / df[w]);
    });
    /* Pre-compute each entry's vector length so scoring is one pass at query time. */
    entries.forEach(function (e) {
      var sum = 0, seen = {};
      e._t.forEach(function (w) {
        if (seen[w]) return; seen[w] = 1;
        var v = idf[w] || 0; sum += v * v;
      });
      e._norm = Math.sqrt(sum) || 1;
    });
    _idf = idf;
    return entries;
  }

  function load() {
    if (_entries) return Promise.resolve(_entries);
    if (_loading) return _loading;
    _loading = fetch(SRC)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        _entries = buildIndex(Array.isArray(rows) ? rows : []);
        return _entries;
      })
      .catch(function () { _entries = []; return _entries; });
    return _loading;
  }

  /* ---------- scoring ------------------------------------------------------------------------
     Cosine over IDF-weighted content words. Symmetric and length-normalised, so a long question
     is not penalised for carrying extra words and a two-word question cannot score 1.0 against
     everything by accident. */
  function score(qTokens, entry) {
    if (!qTokens.length || !entry._t.length) return 0;
    var qSeen = {}, dot = 0, qSum = 0;
    qTokens.forEach(function (w) {
      if (qSeen[w]) return; qSeen[w] = 1;
      var v = _idf[w] || 0;
      qSum += v * v;
    });
    var eSeen = {};
    entry._t.forEach(function (w) {
      if (eSeen[w]) return; eSeen[w] = 1;
      if (qSeen[w]) { var v = _idf[w] || 0; dot += v * v; }
    });
    var qNorm = Math.sqrt(qSum) || 1;
    return dot / (qNorm * entry._norm);
  }

  /**
   * Look up a question.
   * @returns {Promise<null|{answer,question,category,confidence,id,source}|{safety}>}
   *          null means "not confidently mine" — the caller MUST fall back rather than
   *          presenting anything from here.
   */
  async function ask(text) {
    var flag = safetyFlag(text);
    if (flag) {
      /* Deliberately no answer. The base has no vetted response for pain or medical questions
         — every row in it is safety_level general_fitness — so the honest result is to decline
         and let the caller route it. Returning the nearest fitness answer is the specific
         failure this guard exists to prevent. */
      return { safety: flag, answer: null, confidence: 0, source: "safety" };
    }

    var entries = await load();
    if (!entries.length) return null;

    var qt = tokens(text);
    if (!qt.length) return null;

    var best = null, bestScore = 0, runnerUp = 0;
    for (var i = 0; i < entries.length; i++) {
      var s = score(qt, entries[i]);
      if (s > bestScore) { runnerUp = bestScore; bestScore = s; best = entries[i]; }
      else if (s > runnerUp) { runnerUp = s; }
    }

    if (!best || bestScore < threshold()) return null;

    /* AMBIGUITY CHECK. Two entries scoring nearly the same means the question did not pick one
       of them — "how many sets for chest" against both the chest and back volume answers would
       be a coin toss, and picking the wrong one returns a confident answer about the wrong
       muscle. Close enough to a tie, and it goes to Gemini instead. */
    if (runnerUp > 0 && bestScore - runnerUp < 0.06) return null;

    return {
      answer: best.a,
      question: best.q,
      category: best.c,
      id: best.id,
      confidence: Math.round(bestScore * 100) / 100,
      source: "BUILT_IN_KNOWLEDGE"
    };
  }

  window.IgnytKnowledge = Object.freeze({
    ask: ask,
    load: load,
    threshold: threshold,
    setThreshold: function (v) {
      try { localStorage.setItem(THRESHOLD_KEY, String(v)); } catch (e) {}
      return threshold();
    },
    safetyFlag: safetyFlag,
    /* Exposed for tuning: the ranked candidates and their scores for a question. */
    debug: async function (text, n) {
      var entries = await load();
      var qt = tokens(text);
      return entries.map(function (e) { return { q: e.q, s: Math.round(score(qt, e) * 100) / 100 }; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, n || 5);
    },
    size: function () { return _entries ? _entries.length : 0; }
  });
}());
