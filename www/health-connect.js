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

  function isNative() {
    return typeof window.Capacitor !== "undefined"
      && typeof window.Capacitor.isNativePlatform === "function"
      && window.Capacitor.isNativePlatform()
      && window.Capacitor.getPlatform() === "android";
  }

  function bridge() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.HealthConnect;
  }

  const NOT_NATIVE_RESPONSE = {
    success: false,
    error: "Health Connect is only available in the IGNYT Android app, not the web version."
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

    /** ignytWorkoutId/ignytBodyLogId are required -- they're what lets Health Connect's own
     *  upsert-by-clientRecordId mechanism prevent duplicate writes if this ever gets called
     *  twice for the same workout/weight entry. */
    saveWorkout: (ignytWorkoutId, startTime, endTime, title, type = "strength") =>
      callNative("saveWorkout", { ignytWorkoutId, startTime: String(startTime), endTime: String(endTime), title, type }),

    saveWeight: (ignytBodyLogId, weightKg, time = Date.now()) =>
      callNative("saveWeight", { ignytBodyLogId, weightKg, time: String(time) }),

    isNativeAndroid: isNative
  };
})();

window.HealthConnect = HealthConnect; // const alone does not attach to window -- see prior integration notes
