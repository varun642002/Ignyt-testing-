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

  /* ---------- responses ---------------------------------------------------------------------
     THE STRINGS THE ASSISTANT ITSELF WRITES, and only those. The knowledge base answers stay in
     English — 2,300 entries is not a translation project, and machine-translating fitness
     guidance is exactly how "train close to failure" becomes advice nobody vetted.

     What IS translated is the small closed set of things the chatbot says in its own voice: the
     question it asks when a value is missing, and what it says when it does not know. Those are
     the moments the assistant is talking rather than quoting, and hearing them in your own
     language is most of what "responds in Tamil" means in practice.

     English is the fallback for any id or language not covered, so a missing translation shows
     the English string rather than an empty bubble or the key itself. */
  var STRINGS = {
    ask_weight: {
      en: "What weight should I log?",
      ta: "எவ்வளவு எடை பதிவு செய்யட்டும்?",
      hi: "मैं कितना वज़न लॉग करूँ?",
      kn: "ಎಷ್ಟು ತೂಕ ಲಾಗ್ ಮಾಡಲಿ?",
      ml: "എത്ര ഭാരം ലോഗ് ചെയ്യണം?",
      te: "ఎంత బరువు లాగ్ చేయాలి?"
    },
    unknown: {
      en: "I don't have a reliable answer for that yet.\n\nTry asking about workouts, exercises, nutrition, recovery or progress — or tell me what you did, like \"log 200g chicken\" or \"weight 82\".",
      ta: "அதற்கு இப்போதைக்கு என்னிடம் சரியான பதில் இல்லை.\n\nபயிற்சி, உடற்பயிற்சிகள், ஊட்டச்சத்து, ஓய்வு அல்லது முன்னேற்றம் பற்றி கேளுங்கள் — அல்லது \"log 200g chicken\", \"weight 82\" போல் நீங்கள் செய்ததைச் சொல்லுங்கள்.",
      hi: "इसका भरोसेमंद जवाब अभी मेरे पास नहीं है।\n\nवर्कआउट, एक्सरसाइज़, न्यूट्रिशन, रिकवरी या प्रोग्रेस के बारे में पूछें — या बताएं आपने क्या किया, जैसे \"log 200g chicken\" या \"weight 82\"।",
      kn: "ಅದಕ್ಕೆ ಸರಿಯಾದ ಉತ್ತರ ಸದ್ಯಕ್ಕೆ ನನ್ನ ಬಳಿ ಇಲ್ಲ.\n\nವ್ಯಾಯಾಮ, ಆಹಾರ, ವಿಶ್ರಾಂತಿ ಅಥವಾ ಪ್ರಗತಿಯ ಬಗ್ಗೆ ಕೇಳಿ — ಅಥವಾ ನೀವು ಏನು ಮಾಡಿದಿರಿ ಎಂದು ಹೇಳಿ, ಉದಾಹರಣೆಗೆ \"log 200g chicken\" ಅಥವಾ \"weight 82\".",
      ml: "അതിന് വിശ്വസനീയമായ ഉത്തരം ഇപ്പോൾ എന്റെ പക്കലില്ല.\n\nവ്യായാമം, ഭക്ഷണം, വിശ്രമം അല്ലെങ്കിൽ പുരോഗതി എന്നിവയെക്കുറിച്ച് ചോദിക്കൂ — അല്ലെങ്കിൽ നിങ്ങൾ ചെയ്തത് പറയൂ, ഉദാഹരണത്തിന് \"log 200g chicken\" അല്ലെങ്കിൽ \"weight 82\".",
      te: "దానికి నమ్మదగిన సమాధానం ప్రస్తుతం నా దగ్గర లేదు.\n\nవ్యాయామం, ఆహారం, విశ్రాంతి లేదా పురోగతి గురించి అడగండి — లేదా మీరు ఏమి చేశారో చెప్పండి, ఉదాహరణకు \"log 200g chicken\" లేదా \"weight 82\"."
    },
    one_food: {
      en: "I can log one food at a time — send them separately and I'll get both.",
      ta: "ஒரு நேரத்தில் ஒரு உணவை மட்டுமே பதிவு செய்ய முடியும் — தனித்தனியாக அனுப்புங்கள்.",
      hi: "मैं एक बार में एक ही खाना लॉग कर सकता हूँ — उन्हें अलग-अलग भेजें।",
      kn: "ಒಂದು ಬಾರಿಗೆ ಒಂದೇ ಆಹಾರವನ್ನು ಲಾಗ್ ಮಾಡಬಲ್ಲೆ — ಪ್ರತ್ಯೇಕವಾಗಿ ಕಳುಹಿಸಿ.",
      ml: "ഒരു സമയത്ത് ഒരു ഭക്ഷണം മാത്രമേ ലോഗ് ചെയ്യാനാകൂ — വെവ്വേറെ അയയ്ക്കൂ.",
      te: "ఒకసారి ఒక ఆహారం మాత్రమే లాగ్ చేయగలను — విడిగా పంపండి."
    }
  };

  function t(id, lang) {
    var row = STRINGS[id];
    if (!row) return "";
    return row[lang] || row.en;
  }

  window.IgnytLang = Object.freeze({
    canonical: canonical,
    t: t,
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
