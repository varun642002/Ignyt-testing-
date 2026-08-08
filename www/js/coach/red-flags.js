/* =========================================================
   IGNYT COACH — RED FLAGS: when the app must NOT program at all

   The injury catalogue answers "what should this person avoid". This answers a different and
   more serious question: "should this person be given a workout at all right now, or told to
   get assessed". Those are not the same, and the catalogue cannot express the second — it
   removes movements, and there is no set of removals that makes "chest pain" safe to train
   around.

   WHY THIS IS A SEPARATE LAYER AND RUNS FIRST.
   Every other safety mechanism in the app is subtractive: take the squat out, swap the press,
   lower the volume. Each assumes a workout is the right output. A red flag means the right
   output is NOT A WORKOUT, so it cannot be a rule inside the thing that builds one. It gates
   the builder instead.

   WHAT IS AND IS NOT CLAIMED HERE. This does not diagnose, triage, or estimate severity. It
   recognises a small set of symptoms that published guidance treats as reasons for prompt
   assessment, and on any of them it stops and says so. Being wrong in the cautious direction
   costs a user one session; being wrong the other way is the failure this file exists to
   prevent. The list is deliberately SHORT — a long list gets dismissed without reading, and a
   screen everyone taps past protects nobody.

   THE SOURCES, because these were not invented:
     back pain with new bladder/bowel changes, or severe and rapidly worsening pain
       — NHS back pain guidance treats these as reasons for urgent assessment
     chest pain, unusual breathlessness, fainting during or around exertion
       — standard cardiac stop-and-seek-help guidance
     inability to bear weight after an injury, a pop followed by loss of function,
     obvious deformity or major swelling
       — standard acute musculoskeletal assessment criteria
     new numbness or significant weakness
       — neurological symptoms are never a programming problem

   ONE-SESSION SCOPE, NOT A DIAGNOSIS ON THE PROFILE. The acknowledgement is stored so the
   screen does not reappear on every render, and it EXPIRES. A red flag is a description of how
   someone is today; treating "I confirmed I was fine last month" as still true is exactly the
   assumption that would make this dangerous. See ACK_DAYS.
========================================================= */
window.IgnytRedFlags = (function () {
  "use strict";

  var STORAGE_KEY = "hx_red_flag_ack";
  /* Seven days. Long enough not to nag someone training normally, short enough that a symptom
     which appeared since the last confirmation gets a chance to be reported. */
  var ACK_DAYS = 7;

  /* Nine symptoms. Each is phrased as the user would experience it, not as a clinical sign —
     "you cannot put weight on it" rather than "inability to weight-bear" — because the person
     reading this is not a clinician and a screen they cannot parse is a screen they skip. */
  var FLAGS = [
    { id: "severe_pain",   label: "Severe pain, or pain that is getting rapidly worse" },
    { id: "swelling",      label: "Major swelling, or a joint or limb that looks deformed" },
    { id: "weight_bear",   label: "You cannot put weight on it after an injury" },
    { id: "pop",           label: "A sudden pop or snap, and it stopped working properly afterwards" },
    { id: "numbness",      label: "New numbness, pins and needles, or a limb that has gone weak" },
    { id: "chest_pain",    label: "Chest pain, pressure or tightness" },
    { id: "breathless",    label: "Severe or unusual shortness of breath" },
    { id: "faint",         label: "Fainting, blacking out, or feeling like you might" },
    { id: "bladder",       label: "New problems controlling your bladder or bowels, with back pain" }
  ];

  /* The three that warrant same-day attention rather than "book an appointment". Kept apart so
     the wording can differ — telling someone with chest pain to "see a physio when you can" is
     the kind of flat, one-size response that makes safety copy useless. */
  var URGENT = { chest_pain: 1, breathless: 1, faint: 1, bladder: 1, numbness: 1 };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function save(rec) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rec)); } catch (e) { /* full or blocked — the screen simply asks again, which is the safe direction */ }
  }

  /** Days since the last "none of these apply", or Infinity if never. */
  function ageDays() {
    var rec = load();
    if (!rec || !rec.at) return Infinity;
    return (Date.now() - rec.at) / 86400000;
  }

  /** true when the screen should be shown before anything is programmed. */
  function needsCheck() {
    var rec = load();
    if (!rec) return true;
    if (rec.flags && rec.flags.length) return true;   // still reporting something
    return ageDays() > ACK_DAYS;
  }

  /** The flags currently reported, as catalogue objects. */
  function active() {
    var rec = load();
    if (!rec || !rec.flags) return [];
    return FLAGS.filter(function (f) { return rec.flags.indexOf(f.id) !== -1; });
  }

  function blocked() { return active().length > 0; }

  function isUrgent() {
    return active().some(function (f) { return !!URGENT[f.id]; });
  }

  /** Record a submission. An empty array is the "none of these apply" answer. */
  function report(ids) {
    save({ at: Date.now(), flags: Array.isArray(ids) ? ids.slice() : [] });
  }

  /** Clear entirely — used when the user says a symptom has resolved. */
  function clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  /* The message shown in place of a workout. Two registers, because the two situations are not
     equally urgent and pretending otherwise costs the wording its credibility. */
  function message() {
    var flags = active();
    if (!flags.length) return null;
    return {
      urgent: isUrgent(),
      title: isUrgent() ? "Please get this checked today"
                        : "Get this looked at before training",
      body: isUrgent()
        ? "What you have described needs assessing by a medical professional promptly — today, "
          + "or through an urgent care service. IGNYT is not going to suggest a workout while "
          + "this is the case, and that is deliberate."
        : "What you have described should be assessed before you train on it. IGNYT is not going "
          + "to suggest a workout while this is the case, and that is deliberate — training "
          + "through it is how a manageable problem becomes a long one.",
      flags: flags.map(function (f) { return f.label; })
    };
  }

  /* THE SCREEN LIVES HERE, not in the page that first needed it.
     It started as a private function inside recommendation.js, which was right while one
     surface used it and wrong the moment the plan tab and the ad-hoc session needed the same
     gate — three copies of a safety screen is three chances for one of them to drift into
     saying something softer than the others. One renderer, one wording, every surface.

     `esc` is passed in rather than imported because this module has no dependencies and is
     worth keeping that way; the caller already has the app's escaper. */
  function screenHtml(esc, opts) {
    opts = opts || {};
    var msg = message();
    var back = opts.backAction
      ? '<button class="rh-btn rh-btn--ghost rf-back" ' + opts.backAction + '>' +
        esc(opts.backLabel || "Back") + '</button>'
      : "";

    if (msg) {
      return '<div class="pg-light rec">' + back +
        '<div class="pg-card rf-stop' + (msg.urgent ? ' rf-stop--urgent' : '') + '">' +
          '<div class="rf-stop__title">' + esc(msg.title) + '</div>' +
          '<div class="rf-stop__body">' + esc(msg.body) + '</div>' +
          '<ul class="rf-stop__list">' +
            msg.flags.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join("") +
          '</ul>' +
          '<button class="rh-btn rh-btn--ghost rf-stop__clear" data-rf-clear="1">' +
            'This has resolved — ask me again</button>' +
        '</div>' +
        '<div class="pg-card rf-universal">' + esc(UNIVERSAL) + '</div>' +
      '</div>';
    }

    return '<div class="pg-light rec">' + back +
      '<div class="rec-intro">' +
        '<div class="rec-intro__title">' + esc(opts.title || "Before you train") + '</div>' +
        '<div class="rec-intro__sub">Tick anything that applies to you right now. If none of ' +
        'them do, say so and this will open.</div>' +
      '</div>' +
      '<div class="pg-card rf-check">' +
        FLAGS.map(function (f) {
          return '<label class="rf-item">' +
            '<input type="checkbox" class="rf-item__box" value="' + f.id + '">' +
            '<span>' + esc(f.label) + '</span>' +
          '</label>';
        }).join("") +
      '</div>' +
      '<div class="rf-actions">' +
        '<button class="rh-btn rh-btn--primary" data-rf-submit="none">None of these apply</button>' +
        '<button class="rh-btn rh-btn--ghost" data-rf-submit="checked">Report what I ticked</button>' +
      '</div>' +
      '<div class="pg-card rf-universal">' + esc(UNIVERSAL) + '</div>' +
    '</div>';
  }

  var UNIVERSAL = "Stop if an exercise causes sharp, severe or worsening pain. Do not train "
                + "through injury pain. Mild symptoms can be acceptable under a clinician's "
                + "protocol — if you have one, follow it over this.";

  return Object.freeze({
    FLAGS: FLAGS, ACK_DAYS: ACK_DAYS, screenHtml: screenHtml,
    needsCheck: needsCheck, active: active, blocked: blocked, isUrgent: isUrgent,
    report: report, clear: clear, message: message, ageDays: ageDays,
    /* The universal rule, in one place so every surface that shows it shows the same words. */
    UNIVERSAL: UNIVERSAL
  });
})();
