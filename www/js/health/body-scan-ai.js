/* =========================================================
   BODY SCAN AI — placeholder interface (NOT implemented yet)

   Mirrors health-security.js's pattern: a stable, documented surface that
   the Body Scan Archive UI can call today (every method resolves honestly
   with available:false, never a fabricated result), so wiring in a real
   model later is a change in ONE place instead of a UI refactor.

   TODO (future increment, once a specific model/approach is chosen):
   - Body Composition Analysis: estimate body-fat % / composition from a
     photo pair, cross-checked against manually-entered measurements
     (never presented as more accurate than a real DEXA/InBody reading).
   - Pose Detection: normalize stance across photos (e.g. MediaPipe Pose or
     a similar on-device model) so before/after comparisons align body
     position automatically instead of relying on the user framing shots
     identically.
   - Symmetry Analysis: left/right comparison using the pose landmarks.
   - Fat Distribution: region-level estimate from pose + measurements.
   - Muscle Growth Detection: cross-photo diffing once pose-normalized.
   Everything here should run on-device (no photo ever leaves the device
   for this) to stay consistent with the rest of Body Scan Archive.
========================================================= */
(function () {
  "use strict";

  function notAvailable(feature) {
    return Promise.resolve({ available: false, feature: feature, result: null,
      reason: "Not implemented yet — see body-scan-ai.js for the planned approach." });
  }

  window.IgnytBodyScanAI = {
    isAvailable: function () { return false; },
    analyzeComposition: function (photoId) { return notAvailable("body-composition"); },
    detectPose: function (photoId) { return notAvailable("pose-detection"); },
    symmetryScore: function (photoIdLeft, photoIdRight) { return notAvailable("symmetry-analysis"); },
    fatDistribution: function (photoId) { return notAvailable("fat-distribution"); },
    muscleGrowthDelta: function (photoIdBefore, photoIdAfter) { return notAvailable("muscle-growth-detection"); }
  };
})();
