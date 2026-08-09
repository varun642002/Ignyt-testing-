/* =========================================================
   IGNYT LANGUAGE — one canonical knowledge base, many input languages

   THE RULE THIS FILE EXISTS TO ENFORCE: there is exactly ONE knowledge base, in English, and
   there will never be five. Translating 2,300 entries into five languages means five copies to
   keep in step, five places for an answer to drift, and five times the work every time a batch
   is added. Instead the INPUT is normalised down to the canonical representation the router
   already speaks, and the existing intents and matcher are untouched.

   So "என் எடை 85 கிலோ" becomes "weight 85 kilo" before anything tries to understand it, and
   the same intent that handles "weight 85" handles it — no new branch, no second table.

   THREE MECHANICAL STEPS, in this order and for a reason:

     1. DIGITS.  ௮௫ and ८५ and ೮೫ are all 85. This is a pure character mapping with no
                 ambiguity, so it runs first and everything downstream sees ASCII numbers.
     2. SCRIPT.  Which language this is, decided by the Unicode block the letters live in.
                 Reliable because these scripts do not overlap — a Tamil letter cannot be
                 mistaken for a Devanagari one.
     3. KEYWORDS. The handful of words that carry intent — weight, log, how much, kilo — mapped
                 onto their English equivalents.

   WHAT THIS DELIBERATELY DOES NOT DO: translate. It is not a translator and must not pretend to
   be one. It recognises the vocabulary of COMMANDS, which is small, closed and worth hand-
   writing. A Tamil sentence asking an open fitness question still reaches the knowledge base as
   mostly-Tamil text and will not match — that is honest, and Phase 3's remaining half (localised
   responses, and native-script alternative_questions on the entries) is what closes it.

   ROMANISED INPUT IS FIRST-CLASS, not an afterthought. "En weight 85 kg ah log pannu" is what
   people actually type on a phone keyboard — far more often than the native script — so the
   Tanglish and Hinglish command words are mapped alongside the native ones.
========================================================= */
(function () {
  "use strict";

  /* ---------- 1. digits -------------------------------------------------------------------
     Each Indic script has its own digit block, laid out in the same order as 0-9, so the
     conversion is arithmetic on the code point rather than a lookup table per language. */
  var DIGIT_BLOCKS = [
    [0x0966, "hi"],   // Devanagari  ०-९
    [0x0BE6, "ta"],   // Tamil       ௦-௯
    [0x0C66, "te"],   // Telugu      ౦-౯
    [0x0CE6, "kn"],   // Kannada     ೦-೯
    [0x0D66, "ml"]    // Malayalam   ൦-൯
  ];

  function normaliseDigits(text) {
    var out = "";
    for (var i = 0; i < text.length; i++) {
      var cp = text.charCodeAt(i), replaced = false;
      for (var b = 0; b < DIGIT_BLOCKS.length; b++) {
        var base = DIGIT_BLOCKS[b][0];
        if (cp >= base && cp <= base + 9) { out += String(cp - base); replaced = true; break; }
      }
      if (!replaced) out += text[i];
    }
    return out;
  }

  /* ---------- 2. script detection ---------------------------------------------------------
     By Unicode block, counting letters rather than testing for a single character: a Tanglish
     sentence with one Tamil word in it is still mostly English, and should be treated as such.
     Mixed input therefore resolves to whichever script carries most of the message, which is
     what "respond in the dominant language" means in practice. */
  var SCRIPTS = [
    ["ta", /[஀-௿]/g],
    ["hi", /[ऀ-ॿ]/g],
    ["kn", /[ಀ-೿]/g],
    ["ml", /[ഀ-ൿ]/g],
    ["te", /[ఀ-౿]/g]
  ];

  function detect(text) {
    var s = String(text || "");
    var best = null, bestN = 0;
    for (var i = 0; i < SCRIPTS.length; i++) {
      var m = s.match(SCRIPTS[i][1]);
      var n = m ? m.length : 0;
      if (n > bestN) { bestN = n; best = SCRIPTS[i][0]; }
    }
    if (!best) return "en";
    /* A couple of stray characters is not a language. Requiring a few letters stops an emoji
       or a single pasted word from switching the whole conversation. */
    return bestN >= 3 ? best : "en";
  }

  /* ---------- 3. command vocabulary --------------------------------------------------------
     Only the words that change what the router DOES. Ordered longest-first at match time so
     "பதிவு செய்" is consumed before "பதிவு" alone.

     Native script and romanised forms sit in the same table on purpose: they are the same word
     to the user, and splitting them into two tables is how one of them silently stops being
     maintained. */
  var LEXICON = [
    // ---- weight ----
    ["எடை", "weight"], ["எடையை", "weight"], ["வெயிட்", "weight"],
    ["वजन", "weight"], ["वज़न", "weight"],
    ["ತೂಕ", "weight"], ["ഭാരം", "weight"], ["బరువు", "weight"],
    // ---- log / record, the verb that makes it a command ----
    ["பதிவு செய்", "log"], ["பதிவு", "log"], ["போடு", "log"], ["சேர்", "add"],
    ["लॉग करो", "log"], ["लॉग", "log"], ["दर्ज करो", "log"], ["जोड़ो", "add"],
    ["ಲಾಗ್ ಮಾಡಿ", "log"], ["ಲಾಗ್", "log"], ["ಸೇರಿಸಿ", "add"],
    ["ലോഗ് ചെയ്യൂ", "log"], ["ലോഗ്", "log"], ["ചേർക്കൂ", "add"],
    ["లాగ్ చేయి", "log"], ["లాగ్", "log"],
    // ---- units ----
    ["கிலோ", "kg"], ["किलो", "kg"], ["ಕೆಜಿ", "kg"], ["കിലോ", "kg"], ["కిలో", "kg"],
    ["கிராம்", "g"], ["ग्राम", "g"], ["ಗ್ರಾಂ", "g"], ["ഗ്രാം", "g"],
    // ---- question words that pick an intent ----
    ["எவ்வளவு", "how much"], ["எத்தனை", "how many"],
    ["कितना", "how much"], ["कितने", "how many"],
    ["ಎಷ್ಟು", "how much"], ["എത്ര", "how much"], ["ఎంత", "how much"],
    // ---- today / food / workout ----
    ["இன்று", "today"], ["இன்றைய", "today"], ["आज", "today"], ["ಇಂದು", "today"],
    ["ഇന്ന്", "today"], ["ఈరోజు", "today"],
    ["உணவு", "food"], ["खाना", "food"], ["ಆಹಾರ", "food"], ["ഭക്ഷണം", "food"],
    ["பயிற்சி", "workout"], ["वर्कआउट", "workout"], ["कसरत", "workout"],
    ["ವ್ಯಾಯಾಮ", "workout"], ["വ്യായാമം", "workout"],

    /* ---- ROMANISED. What people actually type on a phone. ----
       These are matched as whole words only, because they are short and would otherwise fire
       inside English words — "pannu" is safe, but "kar" inside "karate" is not. */
    ["pannu", "log"], ["pannunga", "log"], ["pannanum", "log"], ["podu", "log"],
    ["karo", "log"], ["kar do", "log"], ["kardo", "log"], ["likho", "log"],
    ["madi", "log"], ["cheyyu", "log"], ["seiyu", "log"],
    ["edai", "weight"], ["vajan", "weight"], ["thooka", "weight"], ["bharam", "weight"],
    ["evlo", "how much"], ["evvalavu", "how much"], ["ethana", "how many"],
    ["kitna", "how much"], ["kitne", "how many"], ["eshtu", "how much"],
    ["indru", "today"], ["innaiku", "today"], ["aaj", "today"], ["indu", "today"]
  ];

  /* Longest first, so multi-word phrases win over their own first word. Computed once. */
  var SORTED = LEXICON.slice().sort(function (a, b) { return b[0].length - a[0].length; });

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  var COMPILED = SORTED.map(function (pair) {
    var term = pair[0];
    /* Latin terms get word boundaries; Indic scripts do not, because \b is defined on ASCII
       word characters and would never match against Tamil or Devanagari text. */
    var latin = /^[\x00-\x7F]+$/.test(term);
    return [new RegExp(latin ? "\\b" + escapeRe(term) + "\\b" : escapeRe(term), "gi"), pair[1]];
  });

  function mapKeywords(text) {
    var s = text;
    for (var i = 0; i < COMPILED.length; i++) s = s.replace(COMPILED[i][0], " " + COMPILED[i][1] + " ");
    return s.replace(/\s+/g, " ").trim();
  }

  /**
   * Normalise any supported input to the canonical form the router understands.
   * @returns {{text:string, language:string, changed:boolean}}
   */
  function canonical(input) {
    var raw = String(input || "");
    var lang = detect(raw);
    var text = mapKeywords(normaliseDigits(raw));
    return { text: text, language: lang, changed: text !== raw };
  }

  /* The user's chosen language, or null for auto-detect. Stored locally, as the brief asks. */
  var PREF_KEY = "hx_chat_lang";
  function preference() {
    try { var v = localStorage.getItem(PREF_KEY); return v || null; } catch (e) { return null; }
  }
  function setPreference(code) {
    try {
      if (!code || code === "auto") localStorage.removeItem(PREF_KEY);
      else localStorage.setItem(PREF_KEY, code);
    } catch (e) {}
    return preference();
  }
  /* A manual choice overrides detection; auto falls back to what the script says. */
  function languageFor(text) { return preference() || detect(text); }

  window.IgnytLang = Object.freeze({
    canonical: canonical,
    detect: detect,
    languageFor: languageFor,
    preference: preference,
    setPreference: setPreference,
    SUPPORTED: ["en", "ta", "hi", "kn", "ml", "te"],
    /* Exposed for tests. */
    normaliseDigits: normaliseDigits,
    mapKeywords: mapKeywords
  });
}());
