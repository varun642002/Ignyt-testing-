/* =========================================================
   BMI COMPANION — the number, its category, and something worth reading next to it.

   WHY THIS IS A SEPARATE MODULE AND NOT A ONE-LINE FORMULA
   The formula is trivial. What isn't trivial is everything shown around it: which of six
   categories the figure falls in, what a healthy weight range means for this person's height,
   and — the part that actually matters — a line of copy that encourages a habit without
   labelling anyone. Those three belong together, because getting the arithmetic right and the
   tone wrong is still getting it wrong.

   WHAT BMI IS
   Weight in kilograms over height in metres squared. It is a population screening ratio. It
   knows nothing about muscle, bone, body composition, ethnicity, age or pregnancy, so a lifter
   and a sedentary person of the same height and weight receive the same figure and one of them
   is being told something false. Every surface built on this module states that, and the copy
   in `messages.js` never diagnoses, never predicts and never promises a timeframe.

   WHAT THE APP CALLS THE CATEGORIES
   The six WHO cut-offs are used because they are the standard ones and inventing softer
   boundaries would make the number incomparable with anything else the user reads. The
   *labels* shown to the user are the app's own, and are deliberately not the clinical wording:
   a screening bucket is not an identity, and "Class II obesity" printed on a home screen tells
   someone nothing they can act on. The cut-offs are honest; the framing is kind. Both.
========================================================= */

window.IgnytBMI = (function () {
  "use strict";

  /* Lower bound inclusive, upper bound exclusive — the standard reading of the WHO bands, so
     a BMI of exactly 25.0 is Overweight rather than falling between two categories. */
  var BANDS = [
    { key: "underweight", from: 0,    to: 18.5, label: "Below healthy range", context: "bmiUnderweight", tone: "blue"  },
    { key: "healthy",     from: 18.5, to: 25,   label: "Healthy range",       context: "bmiHealthy",     tone: "green" },
    { key: "overweight",  from: 25,   to: 30,   label: "Above healthy range", context: "bmiOverweight",  tone: "amber" },
    { key: "obeseI",      from: 30,   to: 35,   label: "High",                context: "bmiObeseI",      tone: "amber" },
    { key: "obeseII",     from: 35,   to: 40,   label: "Very high",           context: "bmiObeseII",     tone: "red"   },
    { key: "obeseIII",    from: 40,   to: 1e9,  label: "Very high",           context: "bmiObeseIII",    tone: "red"   }
  ];

  var HEALTHY_LOW = 18.5, HEALTHY_HIGH = 24.9;

  function round1(v) { return v == null || !isFinite(v) ? null : Math.round(v * 10) / 10; }

  /** BMI from raw numbers, or null when either input is missing or nonsense. */
  function calculate(weightKg, heightCm) {
    var w = Number(weightKg), h = Number(heightCm);
    if (!(w > 0) || !(h > 0)) return null;
    var m = h / 100;
    var bmi = w / (m * m);
    // A 40cm "height" or a 900kg "weight" is a typo, not a person. Returning null lets the
    // caller show nothing rather than a card claiming a BMI of 5625.
    if (!isFinite(bmi) || bmi < 5 || bmi > 100) return null;
    return round1(bmi);
  }

  function bandFor(bmi) {
    if (bmi == null) return null;
    for (var i = 0; i < BANDS.length; i++) {
      if (bmi >= BANDS[i].from && bmi < BANDS[i].to) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  /** The weight range that would put this height inside the healthy band. */
  function healthyRange(heightCm) {
    var h = Number(heightCm);
    if (!(h > 0)) return null;
    var m = h / 100;
    return { min: round1(HEALTHY_LOW * m * m), max: round1(HEALTHY_HIGH * m * m) };
  }

  /**
   * How far this weight is from the healthy range, in kg, and in which direction.
   * Zero when already inside it — which is the answer, not a missing value.
   */
  function distanceToHealthy(weightKg, heightCm) {
    var r = healthyRange(heightCm);
    var w = Number(weightKg);
    if (!r || !(w > 0)) return null;
    if (w < r.min) return { direction: "up",   kg: round1(r.min - w) };
    if (w > r.max) return { direction: "down", kg: round1(w - r.max) };
    return { direction: "none", kg: 0 };
  }

  function messageFor(band) {
    if (!band) return "";
    try { return (window.IgnytMessages && IgnytMessages.next(band.context)) || ""; }
    catch (e) { return ""; }
  }

  /**
   * The daily line — stable for the whole day rather than changing on every repaint. The BMI
   * card sits on screens that re-render constantly (any weight edit, any tab return), and copy
   * that shuffles under the user reads as decoration instead of as something said to them.
   */
  function dailyMessageFor(band) {
    if (!band) return "";
    try { return (window.IgnytMessages && IgnytMessages.forDay(band.context)) || ""; }
    catch (e) { return ""; }
  }

  /**
   * Everything a BMI surface needs, from app state.
   * Returns null when height or weight is unknown — the card then simply does not appear,
   * which is better than a card apologising for its own missing inputs.
   */
  function summary(s, opts) {
    opts = opts || {};
    var profile = (s && s.profile) || {};
    var weight = Number(profile.weight) || 0;
    // The most recent weigh-in wins over the profile field when both exist: the profile value
    // is a copy that is only refreshed on save, and a user who logged this morning expects the
    // card to reflect this morning.
    var log = (s && s.bodylog) || [];
    for (var i = 0; i < log.length; i++) {
      if (log[i] && Number(log[i].weight) > 0) { weight = Number(log[i].weight); break; }
    }
    var height = Number(profile.height) || 0;
    var bmi = calculate(weight, height);
    if (bmi == null) return null;

    var band = bandFor(bmi);
    var range = healthyRange(height);
    return {
      bmi: bmi,
      weight: round1(weight),
      height: height,
      category: band.key,
      label: band.label,
      tone: band.tone,
      context: band.context,
      healthyRange: range,
      inHealthyRange: band.key === "healthy",
      distance: distanceToHealthy(weight, height),
      message: opts.daily === false ? messageFor(band) : dailyMessageFor(band)
    };
  }

  return {
    BANDS: BANDS,
    calculate: calculate,
    bandFor: bandFor,
    healthyRange: healthyRange,
    distanceToHealthy: distanceToHealthy,
    messageFor: messageFor,
    dailyMessageFor: dailyMessageFor,
    summary: summary
  };
})();
