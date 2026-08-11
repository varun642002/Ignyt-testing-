/* =========================================================
   IGNYT VOICE — speech in, speech out. No AI involved.

   VOICE IS NOT GEMINI, and this file is where that is enforced. Speech recognition and speech
   synthesis are device capabilities; the transcript this produces goes into exactly the same
   router a typed message does (js/ai/local-chat.js first, js/ai/service.js only if that
   declines). Speaking a sentence therefore costs the same number of AI activities as typing
   it — usually zero.

   WHY THE WEB SPEECH API RATHER THAN A CAPACITOR PLUGIN
   The Android WebView is Chrome, so SpeechRecognition and speechSynthesis are both present
   without adding a dependency, a permission declaration, or a native build step — and this app
   also runs as a PWA in a browser, where a Capacitor plugin would not exist at all. One code
   path covers both. The trade-off is real and worth stating: Chrome's recognition is a network
   service, so dictation needs connectivity even though nothing here calls our backend. TTS is
   fully offline. If offline dictation becomes a requirement, @capacitor-community/speech-
   recognition is the swap, and only start() below changes.

   EVERYTHING DEGRADES RATHER THAN THROWS. A device with no microphone, a denied permission, a
   language the synthesiser lacks — each returns a typed reason the UI can show, and the app
   stays fully usable by typing. Voice is an input method, never a dependency.
========================================================= */
(function () {
  "use strict";

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var synth = window.speechSynthesis || null;

  /* Indian locales first — this is the audience, and "en-IN" recognises Indian English names
     and numbers far better than "en-US" does. The router itself is language-agnostic; this
     only tells the DEVICE what to expect. */
  var LANGS = {
    en: "en-IN", ta: "ta-IN", hi: "hi-IN",
    te: "te-IN", kn: "kn-IN", ml: "ml-IN"
  };
  var LANG_KEY = "hx_voice_lang";

  var _rec = null;          // the live recognition object, if listening
  var _speaking = false;

  /* How long a silence ends the turn, and the hard cap on holding the microphone. 1.8s is long
     enough to think mid-sentence without the turn ending, short enough that finishing does not
     feel like waiting. */
  var SILENCE_MS = 1800;
  var MAX_LISTEN_MS = 60000;

  function lang() {
    try { return localStorage.getItem(LANG_KEY) || LANGS.en; } catch (e) { return LANGS.en; }
  }

  function setLang(code) {
    var v = LANGS[code] || code || LANGS.en;
    try { localStorage.setItem(LANG_KEY, v); } catch (e) {}
    return v;
  }

  /* ---------- capability -------------------------------------------------------------------
     Asked rather than assumed, because the honest answer differs per platform and the UI needs
     to know whether to render a microphone at all. A button that cannot work is worse than no
     button. */
  function canListen() { return !!SR; }
  function canSpeak() { return !!(synth && typeof synth.speak === "function"); }

  /* ---------- speech to text ----------------------------------------------------------------
     Resolves with a transcript, or rejects with { code, message } — never a raw browser event,
     because those differ between engines and say things like "not-allowed" that no user should
     be shown.

     onState fires idle -> listening -> processing so the caller can drive its own UI without
     knowing anything about SpeechRecognition. */
  function listen(opts) {
    opts = opts || {};
    var onState = opts.onState || function () {};
    var onPartial = opts.onPartial || function () {};

    return new Promise(function (resolve, reject) {
      if (!SR) {
        return reject({ code: "unsupported",
                        message: "This device can't do voice input. You can still type." });
      }
      /* One session at a time. Starting a second recognition while one is live throws
         InvalidStateError in Chrome, which surfaces as a dead microphone button rather than an
         error anyone can act on. */
      if (_rec) { try { _rec.abort(); } catch (e) {} _rec = null; }

      var rec = new SR();
      _rec = rec;
      /* ENGLISH ONLY FOR NOW. The multilingual plumbing below is intact -- lang(), setLang() and
         LANGS still work and the router still detects the language of typed text -- but speech
         recognition is pinned to English until the other languages are picked up again. Passing
         opts.lang still overrides, so nothing is lost, only defaulted. */
      rec.lang = opts.lang || LANGS.en;
      rec.interimResults = true;      // drives the live transcript while the user is talking
      rec.maxAlternatives = 1;
      /* LISTEN UNTIL THE PERSON HAS ACTUALLY FINISHED. continuous:false ends recognition at the
         first pause in speech, which cuts people off mid-sentence -- anyone who pauses to think,
         or says "log two eggs ... and a banana", loses the second half. Continuous keeps the
         stream open, and a silence timer decides when the sentence is over.
         The engine still fires onend on its own at a pause on some platforms; when that happens
         and the user has not gone quiet long enough, recognition is restarted rather than
         resolved. MAX_LISTEN_MS is the backstop so a live microphone can never be left open. */
      rec.continuous = true;

      /* TWO SEPARATE STORES, AND THE DISTINCTION IS THE BUG THAT WAS SHIPPED.
         `carry` is what earlier recognition instances finalised, `sessionFinal` is what THIS
         instance has finalised. sessionFinal is RECOMPUTED from e.results every time rather than
         appended to, because with continuous:true the engine re-delivers earlier results
         whenever one of them is revised -- so "+=" appended the same words again on every
         event, and restarting after a pause did it once more from the top. The result on a
         device was "howhow tohow to dohow to do late", which is the same phrase glued to itself
         at every restart. */
      var carry = "";
      var sessionFinal = "";
      function transcript() { return (carry + " " + sessionFinal).replace(/\s+/g, " ").trim(); }
      var settled = false;
      var stopping = false;              // stop() was called deliberately; do not restart
      var lastVoiceAt = Date.now();
      var startedAt = Date.now();
      var silenceTimer = null;

      function clearSilence() {
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
      }

      /* Restarted on every scrap of speech, interim included -- interim results arrive while the
         person is still talking, so they are the signal that the sentence is not over. */
      function armSilence() {
        clearSilence();
        silenceTimer = setTimeout(function () {
          stopping = true;
          try { rec.stop(); } catch (e) { try { rec.abort(); } catch (e2) {} }
        }, SILENCE_MS);
      }

      function done(fn, arg) {
        if (settled) return;
        settled = true;
        clearSilence();
        _rec = null;
        onState("idle");
        fn(arg);
      }

      rec.onstart = function () { onState("listening"); };

      rec.onresult = function (e) {
        /* From zero every time, over ALL results -- not from e.resultIndex, and never appending
           to what is already stored. */
        var finals = "", interim = "";
        for (var i = 0; i < e.results.length; i++) {
          var r = e.results[i];
          if (r.isFinal) finals += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        sessionFinal = finals.trim();
        if (interim) onPartial((carry + " " + sessionFinal + " " + interim).replace(/\s+/g, " ").trim());
        if (interim || sessionFinal) { lastVoiceAt = Date.now(); armSilence(); }
      };

      rec.onerror = function (e) {
        var err = e && e.error;
        /* Translated into something a person can act on. "not-allowed" and "audio-capture" are
           the two that need INSTRUCTIONS rather than an apology — the user has to change a
           setting, and telling them only that it failed leaves them tapping a dead button. */
        var map = {
          "not-allowed":   { code: "permission_denied",
                             message: "Microphone access is off. Turn it on in Settings › Apps › IGNYT › Permissions, then try again." },
          "service-not-allowed": { code: "permission_denied",
                             message: "Microphone access is off. Turn it on in Settings › Apps › IGNYT › Permissions, then try again." },
          "audio-capture": { code: "no_microphone",
                             message: "No microphone found on this device." },
          "no-speech":     { code: "no_speech",
                             message: "Didn't catch that. Try again." },
          "network":       { code: "network",
                             message: "Voice input needs a connection. You can still type." },
          "aborted":       { code: "aborted", message: "" }
        };
        done(reject, map[err] || { code: "failed", message: "Unable to hear you. Try again." });
      };

      rec.onend = function () {
        if (settled) return;
        var quietFor = Date.now() - lastVoiceAt;
        var openFor = Date.now() - startedAt;
        /* The engine gave up at a pause, but the person has not finished: keep listening. Only
           a deliberate stop, a long enough silence, or the backstop ends the turn. */
        /* Both flags matter: `stopping` is the silence timer's own stop, `_ignytStopping` is the
           user tapping the mic off from outside this closure. Checking only one restarts the
           microphone on a deliberate stop, which is the opposite of what the tap meant. */
        if (!stopping && !rec._ignytStopping && quietFor < SILENCE_MS && openFor < MAX_LISTEN_MS) {
          /* BANK ONLY WHAT THE NEXT INSTANCE WILL NOT REPEAT. The assumption here was that a
             restarted recogniser begins with an empty e.results. On the device it does not --
             Android re-delivers the whole utterance to the new instance, so banking the text and
             then receiving it again doubled it on every pause. Reported twice from a device:
             "delete delete delete all delete all the..." and "today today lunch today lunch
             chicken", each phrase glued to itself once per restart.
             So carry is only extended by the part of this instance's text that is not already
             the tail of what is banked. If the engine repeats itself, the repeat is dropped; if
             it genuinely starts fresh, nothing is lost. */
          try {
            var here = sessionFinal.trim();
            if (here) {
              /* CONTAINMENT BOTH WAYS, because Android re-delivers the whole utterance AND adds
                 to it. "delete all the logged foods" came back as "delete all the logged foods
                 today" -- longer than what was banked, so a plain "have I seen this?" check
                 missed and appended the lot. If either string contains the other, the longer one
                 IS the transcript; only genuinely new text is appended. */
              if (!carry) carry = here;
              else if (here.indexOf(carry) !== -1) carry = here;
              else if (carry.indexOf(here) === -1) carry = (carry + " " + here).replace(/\s+/g, " ").trim();
            }
            sessionFinal = "";
            rec.start();
            return;
          } catch (e) { /* fall through and settle below */ }
        }
        clearSilence();
        var text = transcript();
        if (!text) return done(reject, { code: "no_speech", message: "Didn't catch that. Try again." });
        onState("processing");
        settled = true; _rec = null;
        resolve(text);
      };

      try {
        rec.start();
      } catch (e) {
        done(reject, { code: "failed", message: "Unable to start voice input. Try again." });
      }
    });
  }

  /* The user tapping the mic off is a deliberate stop: resolve with whatever was said rather
     than restarting on the onend that follows. */
  function stopListening() {
    if (!_rec) return false;
    try { _rec._ignytStopping = true; } catch (e) {}
    try { _rec.stop(); } catch (e) { try { _rec.abort(); } catch (e2) {} }
    return true;
  }

  /* ---------- text to speech ----------------------------------------------------------------
     Never automatic. The caller decides when to speak, because an app that starts talking on
     its own in a gym is a setting people turn off once and never turn back on. */

  /* Long answers are TRUNCATED rather than read in full. A knowledge-base answer can run to
     several paragraphs, and two minutes of unstoppable speech is not a feature — the full text
     is on screen and can be read faster than it can be heard. */
  var MAX_SPOKEN = 450;

  function speakableText(text) {
    var t = String(text || "")
      .replace(/[•*_#`]/g, "")             // markdown that would be read out as punctuation
      .replace(/\s*\n\s*/g, ". ")          // line breaks become sentence breaks, not pauses
      .replace(/\.\s*\.+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
    if (t.length <= MAX_SPOKEN) return t;
    /* Cut at a sentence end so it does not stop mid-word. */
    var cut = t.slice(0, MAX_SPOKEN);
    var lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    return (lastStop > 120 ? cut.slice(0, lastStop + 1) : cut) + " The rest is on screen.";
  }

  function speak(text, opts) {
    opts = opts || {};
    var onState = opts.onState || function () {};
    return new Promise(function (resolve, reject) {
      if (!canSpeak()) {
        /* Not an error the user should see. The answer is already on screen; TTS being absent
           changes nothing about whether they got it. */
        return reject({ code: "unsupported", message: "" });
      }
      var body = speakableText(text);
      if (!body) return reject({ code: "empty", message: "" });

      try { synth.cancel(); } catch (e) {}   // never queue on top of something already playing

      var u = new SpeechSynthesisUtterance(body);
      u.lang = opts.lang || lang();
      u.rate = 1.0; u.pitch = 1.0;

      /* A voice for the requested language if the device has one. If it does not, the utterance
         is left on the default voice rather than refused — wrong accent is better than silence,
         and getVoices() is empty on the first call in Chrome until they load. */
      try {
        var voices = synth.getVoices() || [];
        var want = (u.lang || "").toLowerCase().slice(0, 2);
        var match = voices.filter(function (v) { return (v.lang || "").toLowerCase().indexOf(want) === 0; })[0];
        if (match) u.voice = match;
      } catch (e) {}

      u.onstart = function () { _speaking = true; onState("speaking"); };
      u.onend = function () { _speaking = false; onState("idle"); resolve(true); };
      u.onerror = function () {
        _speaking = false; onState("idle");
        reject({ code: "failed", message: "" });
      };

      try { synth.speak(u); }
      catch (e) { _speaking = false; reject({ code: "failed", message: "" }); }
    });
  }

  function stopSpeaking() {
    if (!canSpeak()) return false;
    try { synth.cancel(); } catch (e) {}
    _speaking = false;
    return true;
  }

  function isSpeaking() { return _speaking; }
  function isListening() { return !!_rec; }

  window.IgnytVoice = Object.freeze({
    canListen: canListen,
    canSpeak: canSpeak,
    listen: listen,
    stopListening: stopListening,
    isListening: isListening,
    speak: speak,
    stopSpeaking: stopSpeaking,
    isSpeaking: isSpeaking,
    setLang: setLang,
    lang: lang,
    LANGS: LANGS,
    /* Exposed for tests: what would actually be spoken for this answer. */
    speakableText: speakableText
  });
}());
