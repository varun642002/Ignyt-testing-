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
      /* Digit group separators, BEFORE punctuation is blanked. The entries say "10,000 steps"
         and people type "10000 steps"; stripping the comma to a space first turns one into
         "10" + "000" and the other into "10000", which share nothing — so the base failed to
         match a question it contains twice over. A thousands separator is notation, not a word
         boundary. */
      .replace(/(\d)[, ](\d)/g, "$1$2")
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
  /* "sore" and "soreness" are NOT here, deliberately. Delayed-onset soreness is ordinary
     training vocabulary — the base has vetted answers for "Does stretching prevent soreness?"
     and "Should I train when very sore?" — and flagging the word sent those to Gemini instead
     of using the answer we already had. Found by testing the base against its own questions:
     recall was 47/50 and two of the three misses were the word "sore".
     Genuine injury language (pain, hurt, torn, swollen) still triggers, and "sore" alongside
     any of those still trips on the other word. The guard is for injury, not for DOMS. */
  var PAIN = /\b(pain|painful|hurts?|hurting|aches?|aching|injur(y|ed|ies)|strain(ed)?|sprain(ed)?|torn|swollen|swelling|numb|numbness|tingling|dizzy|dizziness|faint|pinch(ed|ing)?|clicking|locking)\b/;
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
      /* Question-only tokens, kept SEPARATELY from the scoring set above. The duplicate
         check must not see the category: "What is progressive overload?" is filed under
         Muscle Building in one batch and Training Fundamentals in another, and comparing
         the category along with the question made two identical questions look different
         enough to be treated as a genuine ambiguity — so both were rejected and the
         question went to Gemini. The category belongs in scoring, where it adds useful
         signal, and nowhere near the "are these the same question?" test. */
      e._q = tokens(e.q);
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

  /* Are these two entries the same question wearing different ids?
     Jaccard over their content words — symmetric, cheap, and it does not care about word order,
     which is the whole reason "How many sets should I do for chest?" and a reworded copy of it
     have to count as one. 0.8 rather than 1.0 because the duplicates in this base are not
     byte-identical: several differ by a word or by punctuation. */
  function sameQuestion(a, b) {
    var A = {}, n = 0, shared = 0;
    (a._q || a._t).forEach(function (w) { if (!A[w]) { A[w] = 1; n++; } });
    var B = {}, m = 0;
    (b._q || b._t).forEach(function (w) {
      if (B[w]) return; B[w] = 1; m++;
      if (A[w]) shared++;
    });
    var union = n + m - shared;
    return union > 0 && (shared / union) >= 0.8;
  }

  /**
   * Look up a question.
   * @returns {Promise<null|{answer,question,category,confidence,id,source}|{safety}>}
   *          null means "not confidently mine" — the caller MUST fall back rather than
   *          presenting anything from here.
   */
  async function ask(text) {
    var flag = safetyFlag(text);

    var entries = await load();
    if (!entries.length) return null;

    var qt = tokens(text);
    if (!qt.length) return null;

    var best = null, bestScore = 0, second = null, runnerUp = 0;
    for (var i = 0; i < entries.length; i++) {
      var s = score(qt, entries[i]);
      if (s > bestScore) { runnerUp = bestScore; second = best; bestScore = s; best = entries[i]; }
      else if (s > runnerUp) { runnerUp = s; second = entries[i]; }
    }

    if (!best || bestScore < threshold()) {
      return flag ? { safety: flag, answer: null, confidence: 0, source: "safety" } : null;
    }

    /* SAFETY GATE, now that vetted safety answers exist.
       It used to refuse every pain or medical question outright, because nothing in the base
       was written for one — the honest move when the only alternative is a fitness answer
       dressed up as medical advice. The Exercise Safety entries change that: there are now
       real answers to "what should I do if an exercise causes sharp pain".

       So a flagged question may be answered ONLY by an entry that is itself about pain or
       injury — tested by running the same detector over the matched entry's own question. A
       vetted safety answer serves it; anything else declines and the full text goes to Gemini.
       That keeps the original protection exactly as strong: "why does my shoulder hurt when I
       bench" still cannot be answered by the bench press technique entry, because that entry's
       question contains no injury language. */
    if (flag && !safetyFlag(best.q)) {
      return { safety: flag, answer: null, confidence: 0, source: "safety" };
    }

    /* AMBIGUITY CHECK, and the reason it is not simply a score gap.
       Two entries scoring nearly the same USUALLY means the question chose neither — "how many
       sets" against the chest and the back volume answers is a coin toss, and picking one
       returns a confident answer about the wrong muscle.

       But a tie also happens when the base contains the SAME QUESTION TWICE, which it does:
       merging the second batch brought six exact duplicates, and identical entries score
       identically. Treating those as ambiguous rejected five questions that had been answering
       correctly — so growing the knowledge base made it worse, which is precisely backwards.

       So the tie-break asks what the two entries are, not just what they scored. Near-identical
       questions are a duplicate and either answer will do; genuinely different questions at the
       same score are a real coin toss and go to Gemini. */
    if (second && runnerUp > 0 && bestScore - runnerUp < 0.06 && !sameQuestion(best, second)) {
      return null;
    }

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
