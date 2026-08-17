/* =========================================================
   HEALTH CONNECT — JS wrapper, scoped to IGNYT's current requirements:
   read steps/heart-rate/weight/active-calories/distance, write exercise
   sessions and weight. No Sleep, no Nutrition -- matches the native
   plugin's own scope exactly, not a superset.

   Runs in both the GitHub Pages web build and the Capacitor Android app
   (same index.html). window.Capacitor only exists inside the native app
   shell; every function here checks for that first and returns a clean
   {success:false, error:"..."} instead of throwing on the web version.
========================================================= */

const HealthConnect = (() => {

  /* The platforms are kept apart deliberately, not merged behind one flag.
   *
   *   android — Health Connect, answered by the Kotlin HealthConnectPlugin. Untouched.
   *   ios     — HealthKit, answered by the Swift HealthConnectPlugin. Same JS name, so every
   *             call below is identical; only which native code responds differs.
   *
   *  This is an explicit list rather than `!== "web"` so that a platform with no
   *  implementation falls through to the honest refusal below instead of calling into
   *  nothing. Adding a platform has to be a deliberate edit here, and changing one platform
   *  cannot silently alter the other. */
  const NATIVE_PLATFORMS = ["android", "ios"];

  function platform() {
    return (typeof window.Capacitor !== "undefined"
      && typeof window.Capacitor.getPlatform === "function")
      ? window.Capacitor.getPlatform() : "web";
  }

  function isNative() {
    return typeof window.Capacitor !== "undefined"
      && typeof window.Capacitor.isNativePlatform === "function"
      && window.Capacitor.isNativePlatform()
      && NATIVE_PLATFORMS.indexOf(platform()) !== -1;
  }

  function bridge() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.HealthConnect;
  }

  /* Worded for both platforms now. "Health Connect" is an Android product, and telling an
     iPhone user their phone needs it would send them looking for an app that does not exist. */
  const NOT_NATIVE_RESPONSE = {
    success: false,
    error: "Health data is only available in the IGNYT mobile app, not the web version."
  };

  async function callNative(methodName, options) {
    if (!isNative()) return NOT_NATIVE_RESPONSE;
    const plugin = bridge();
    if (!plugin || typeof plugin[methodName] !== "function") {
      return { success: false, error: `HealthConnect.${methodName} is not available (native plugin not registered).` };
    }
    try {
      return await plugin[methodName](options || {});
    } catch (e) {
      return { success: false, error: "Native call failed: " + (e && e.message ? e.message : String(e)) };
    }
  }

  return {
    isAvailable:              () => callNative("isAvailable"),
    openHealthConnectInstall: () => callNative("openHealthConnectInstall"),
    requestPermissions:       () => callNative("requestPermissions"),
    getPermissionStatus:      () => callNative("getPermissionStatus"),
    revokePermissions:        () => callNative("revokePermissions"),

    getTodaySteps:          () => callNative("getTodaySteps"),
    getHeartRate:            () => callNative("getHeartRate"),
    getLatestWeight:         () => callNative("getLatestWeight"),
    getTodayActiveCalories: () => callNative("getTodayActiveCalories"),
    getTodayDistance:        () => callNative("getTodayDistance"),
    getTodayWorkoutCount:    () => callNative("getTodayWorkoutCount"),
    getSleepSummary:          () => callNative("getSleepSummary"),         // ADDED
    getHeartRateHistory:      () => callNative("getHeartRateHistory"),     // ADDED
    getStepsHistory:          () => callNative("getStepsHistory"),         // ADDED
    getWeightHistory:         (days = 90) => callNative("getWeightHistory", { days }),
    /* Day-bucketed, not a single total: a lifetime figure is impossible to read from Health
       Connect, which caps at 30 days without PERMISSION_READ_HEALTH_DATA_HISTORY and silently
       truncates rather than failing. mergeElevationFromHealth() in app.js keeps the ledger.

       ANDROID ONLY, for now. The iOS plugin declares no getElevationHistory in its pluginMethods
       list, so on iPhone this resolves to the "native plugin not registered" refusal, which
       mergeElevationFromHealth correctly swallows -- the six elev-* badges simply never unlock
       there. That is safe but not honest: HealthKit does carry the data
       (HKQuantityTypeIdentifierFlightsClimbed, and HKMetadataKeyElevationAscended on workouts),
       so this is a missing implementation rather than a platform limit. Until it exists, the
       badges are unreachable on iOS and nothing in the UI says so. */
    getElevationHistory:      (days = 30) => callNative("getElevationHistory", { days }),
    // ADDED -- the 10 newly requested metrics
    getRespiratoryRate:       () => callNative("getRespiratoryRate"),
    getOxygenSaturation:      () => callNative("getOxygenSaturation"),
    getBloodPressure:         () => callNative("getBloodPressure"),
    getBodyTemperature:       () => callNative("getBodyTemperature"),
    getBodyFat:               () => callNative("getBodyFat"),
    getHeight:                () => callNative("getHeight"),
    getLeanBodyMass:          () => callNative("getLeanBodyMass"),
    getBasalMetabolicRate:    () => callNative("getBasalMetabolicRate"),
    getTodayHydration:        () => callNative("getTodayHydration"),
    getTodayNutrition:        () => callNative("getTodayNutrition"),
    syncNow:                  () => callNative("syncNow"),
    // period: "day" | "week" | "month" | "year" -- real period-scoped aggregates for the
    // Insights page (steps/calories/distance/workouts/heart-rate/sleep/hydration/nutrition/
    // weight totals), plus the same point-in-time vitals syncNow already returns.
    getInsights:              (period = "day") => callNative("getInsights", { period }),

    /** ignytWorkoutId/ignytBodyLogId are required -- they're what lets Health Connect's own
     *  upsert-by-clientRecordId mechanism prevent duplicate writes if this ever gets called
     *  twice for the same workout/weight entry. */
    saveWorkout: (ignytWorkoutId, startTime, endTime, title, type = "strength") =>
      callNative("saveWorkout", { ignytWorkoutId, startTime: String(startTime), endTime: String(endTime), title, type }),

    saveWeight: (ignytBodyLogId, weightKg, time = Date.now()) =>
      callNative("saveWeight", { ignytBodyLogId, weightKg, time: String(time) }),

    isNativeAndroid: isNative,

    /**
     * What to CALL the thing, on the platform the user is holding.
     *
     * "Health Connect" is an Android product name. On an iPhone it is not a brand the user has
     * ever seen, cannot be installed, and cannot be opened — so "Connect Health Connect" and
     * "Health Connect isn't installed" send an iPhone owner to the App Store to look for
     * something that does not exist. That already happened once here.
     *
     * The plugin keeps the name HealthConnect on both platforms deliberately (see the header of
     * ios/App/App/HealthConnectPlugin.swift — renaming it would mean touching every call site
     * for no behavioural gain). This is the display name only, and nothing else keys off it.
     */
    brandName: () => (platform() === "ios" ? "Apple Health" : "Health Connect")
  };
})();

window.HealthConnect = HealthConnect; // const alone does not attach to window -- see prior integration notes
