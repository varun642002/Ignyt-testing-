/* =========================================================
   IGNYT — BM25 retrieval for the knowledge base.

   Adapted from ignyt-search.js as supplied, with three changes and no others: the ES module
   export becomes a global, the private #build field becomes an ordinary method so the file parses
   as a classic script like the rest of the bundle, and the class keeps its own typo and synonym
   maps rather than reaching for the ones in local-chat.

   WHY IT REPLACES THE COSINE SCORER. "how do i lose weight" and "best way to lose weight" returned
   nothing while nineteen entries discussed it -- a common phrasing scoring just under a fixed
   threshold. BM25 weights rare terms and normalises for document length, the question field is
   weighted three times over the answer, and synonyms are expanded before scoring, which is what
   those phrasings needed.

   The minimum score is what stops a confidently wrong match: below it the caller shows the
   fallback rather than the nearest thing in the corpus. That is the rule that produced "Why does
   magnesium cause loose stools?" when it was missing.
========================================================= */
(function () {
  "use strict";

/**
 * ignyt-search.js — retrieval for the IGNYT AI knowledge base.
 *
 * Fixes the "How to loose weight" -> "Why does magnesium cause loose stools?" bug.
 * That failure had two causes, both handled here:
 *   1. no typo normalisation, so "loose" was taken literally
 *   2. substring matching, so a single shared token could win a match
 *
 * Pipeline: normalise -> fix typos -> stem -> expand synonyms -> BM25 -> threshold.
 *
 * Usage:
 *   import { IgnytSearch } from './ignyt-search.js';
 *   const search = new IgnytSearch(faqArray);   // IGNYT_FAQ_ALL_8000_indexed.json
 *   const hits = search.query('How to loose weight');
 *   // -> [{ id, question, answer, category, score }, ...]
 */

const TYPOS = {
  loose: 'lose', loosing: 'losing', loos: 'lose',
  wieght: 'weight', weigth: 'weight', wight: 'weight',
  weightloss: 'weight loss', fatloss: 'fat loss',
  excercise: 'exercise', exersize: 'exercise', excersize: 'exercise',
  exercize: 'exercise', excercize: 'exercise',
  musle: 'muscle', muscel: 'muscle', mucle: 'muscle',
  protien: 'protein', protine: 'protein',
  calory: 'calorie', calries: 'calories',
  workut: 'workout', workot: 'workout', wrkout: 'workout',
  strenght: 'strength', strengh: 'strength',
  creatin: 'creatine', creatien: 'creatine',
  suppliments: 'supplements', suppliment: 'supplement',
  sopplement: 'supplement', supplment: 'supplement',
  carbes: 'carbs', carbo: 'carbs', carbohyrate: 'carbohydrate',
  streching: 'stretching', strech: 'stretch',
  sholder: 'shoulder', shouler: 'shoulder',
  benchpress: 'bench press',
  hirox: 'hyrox', hyrocks: 'hyrox',
  runing: 'running',
  beginer: 'beginner', begginer: 'beginner',
  reduse: 'reduce',
  dosage: 'dose', dosages: 'dose', dosing: 'dose',
  prep: 'preparation', progam: 'program', programme: 'program'
};

// Maps user language onto corpus language. Keys are matched on WORD BOUNDARIES —
// substring matching here is what made "creatine" match the key "eat".
const SYNONYMS = {
  'lose weight': ['fat', 'loss', 'weight', 'calorie', 'deficit'],
  'losing weight': ['fat', 'loss', 'weight', 'calorie', 'deficit'],
  'weight loss': ['fat', 'loss', 'calorie', 'deficit'],
  'fat loss': ['weight', 'loss', 'calorie', 'deficit'],
  'slim down': ['fat', 'loss', 'weight'],
  'reduce weight': ['fat', 'loss', 'weight'],
  'belly fat': ['abdominal', 'fat', 'loss', 'spot', 'reduction'],
  'tone up': ['muscle', 'fat', 'loss', 'composition'],
  'get ripped': ['fat', 'loss', 'body', 'definition'],
  'bulk up': ['muscle', 'gain', 'surplus', 'bulking'],
  'gain weight': ['muscle', 'gain', 'surplus', 'bulking'],
  'build muscle': ['muscle', 'gain', 'hypertrophy', 'protein'],
  'get stronger': ['strength', 'progressive', 'overload'],
  'six pack': ['abs', 'core', 'body', 'fat'],
  cardio: ['aerobic', 'conditioning', 'running'],
  workout: ['training', 'session', 'exercise'],
  gym: ['training', 'workout'],
  sore: ['soreness', 'doms', 'recovery'],
  injury: ['pain', 'rehab', 'injured'],
  food: ['nutrition', 'diet'],
  supplement: ['supplements', 'creatine', 'protein'],
  beginner: ['starting', 'start', 'new'],
  routine: ['program', 'plan', 'split'],
  hyrox: ['hybrid', 'racing', 'station']
};

const STOP = new Set(('a an the is are was were be been being do does did doing have has had how ' +
  'what when where why which who whom this that these those i me my we our you your he she it ' +
  'they them to of in on at for with about as by from into during and or but if then than so ' +
  'such can could should would may might will just get got make made take tell show help need want')
  .split(' '));

function stem(w) {
  const sufs = ['ingly', 'edly', 'ing', 'ies', 'ied', 'es', 'ed', 's'];
  for (const s of sufs) {
    if (w.length > s.length + 3 && w.endsWith(s)) {
      let base = w.slice(0, -s.length);
      if (s === 'ies') return base + 'y';
      if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) base = base.slice(0, -1);
      return base;
    }
  }
  return w;
}

function normalise(text) {
  const raw = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  for (const w of raw) {
    const mapped = TYPOS[w] || w;          // typo map values may be multi-word
    for (const part of mapped.split(' ')) out.push(stem(part));
  }
  return out.join(' ');
}

function expand(text) {
  const extra = [];
  for (const phrase in SYNONYMS) {
    const stemmedPhrase = normalise(phrase);
    const re = new RegExp('\\b' + stemmedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    if (re.test(text)) extra.push(...SYNONYMS[phrase].map(stem));
  }
  return extra.length ? text + ' ' + extra.join(' ') : text;
}

function contentTokens(text) {
  return normalise(text).split(' ').filter(w => w.length > 1 && !STOP.has(w));
}

class IgnytSearchImpl {
  /** @param {Array} corpus records: {id, category, question, answer, keywords?} */
  constructor(corpus, opts = {}) {
    this.corpus = corpus;
    this.k1 = opts.k1 ?? 1.5;
    this.b = opts.b ?? 0.75;
    // Below this score the answer is not trustworthy — return the fallback instead
    // of a confidently wrong match. This is what stopped the magnesium answer.
    this.minScore = opts.minScore ?? 8.0;
    this.build_();
  }

  build_() {
    this.docs = this.corpus.map(r => {
      const q = normalise(r.question);
      const c = normalise(r.category);
      const kw = (r.keywords || []).join(' ');
      // question weighted x3, category x2 — title relevance should dominate
      const field = `${q} ${q} ${q} ${c} ${c} ${kw} ${normalise(r.answer)}`;
      return field.split(' ').filter(w => w.length > 1 && !STOP.has(w));
    });

    this.tf = this.docs.map(d => {
      const m = new Map();
      for (const w of d) m.set(w, (m.get(w) || 0) + 1);
      return m;
    });
    this.len = this.docs.map(d => d.length);
    this.avgdl = this.len.reduce((a, b) => a + b, 0) / this.len.length;

    // inverted index: term -> [docIndex, ...]
    this.index = new Map();
    this.docs.forEach((d, i) => {
      for (const w of new Set(d)) {
        if (!this.index.has(w)) this.index.set(w, []);
        this.index.get(w).push(i);
      }
    });

    const N = this.docs.length;
    this.idf = new Map();
    for (const [w, list] of this.index) {
      this.idf.set(w, Math.log(1 + (N - list.length + 0.5) / (list.length + 0.5)));
    }
  }

  /**
   * @returns {Array<{id,question,answer,category,score}>} empty array if nothing
   *   clears the confidence threshold — caller should then show the fallback.
   */
  query(text, top = 5) {
    const qTokens = expand(normalise(text)).split(' ')
      .filter(w => w.length > 1 && !STOP.has(w));
    if (!qTokens.length) return [];

    const scores = new Map();
    for (const w of qTokens) {
      const posting = this.index.get(w);
      if (!posting) continue;
      const idf = this.idf.get(w);
      for (const i of posting) {
        const f = this.tf[i].get(w);
        const denom = f + this.k1 * (1 - this.b + this.b * this.len[i] / this.avgdl);
        scores.set(i, (scores.get(i) || 0) + idf * (f * (this.k1 + 1)) / denom);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .filter(([, s]) => s >= this.minScore)
      .map(([i, s]) => ({ ...this.corpus[i], score: +s.toFixed(2) }));
  }

  /** Convenience for the chat UI: best answer or null. */
  answer(text) {
    const hits = this.query(text, 1);
    return hits.length ? hits[0] : null;
  }

  /** Related questions for an answer card. */
  related(id, n = 4) {
    const rec = this.corpus.find(r => r.id === id);
    if (!rec) return [];
    return this.query(rec.question, n + 1).filter(r => r.id !== id).slice(0, n);
  }
}



  /* Built once, lazily, from whatever the knowledge base loaded. */
  var _engine = null;
  window.IgnytSearch = Object.freeze({
    build: function (corpus) {
      try { _engine = new IgnytSearchImpl(corpus || []); } catch (e) { _engine = null; }
      return !!_engine;
    },
    ready: function () { return !!_engine; },
    query: function (text, top) { return _engine ? _engine.query(text, top || 5) : []; },
    answer: function (text) { return _engine ? _engine.answer(text) : null; },
    related: function (id, n) { return _engine ? _engine.related(id, n) : []; }
  });
}());
