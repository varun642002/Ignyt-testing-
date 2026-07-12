package com.varun.ignyt.healthconnect

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.ExerciseSessionRecord
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.time.Instant

/**
 * Capacitor bridge for Health Connect, scoped to IGNYT's current requirements: read
 * steps/heart-rate/weight/active-calories/distance, write exercise sessions and weight.
 * Every method resolves {"success": true, "data": ...} or {"success": false, "error": "..."}
 * -- never rejects -- so the JS side always gets a normal resolved promise.
 *
 * Permissions are requested ONLY from requestPermissions(), never automatically. Every
 * read/write method checks permissions first and returns a clear error (not an automatic
 * permission prompt) if they're missing -- matches "request only after explicit user action".
 */
@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : com.getcapacitor.Plugin() {

    private lateinit var manager: HealthConnectManager
    private val pluginScope = CoroutineScope(Dispatchers.Main)

    override fun load() {
        manager = HealthConnectManager(context)
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        try {
            val status = manager.sdkStatus()
            // Health Connect 1.1.0 does not expose SDK_AVAILABLE_UPDATE_REQUIRED as a usable
            // constant here (that three-way distinction is a later-version addition) -- rather
            // than reference something that doesn't compile against 1.1.0, this collapses to
            // a plain available/unavailable check. Still fully correct and still drives the
            // "open Play Store when unavailable" flow; it just can't distinguish "not
            // installed" from "installed but needs updating" until upgrading past 1.1.0.
            val data = JSObject().apply {
                put("available", status == HealthConnectClient.SDK_AVAILABLE)
                put("status", if (status == HealthConnectClient.SDK_AVAILABLE) "AVAILABLE" else "UNAVAILABLE")
            }
            resolveSuccess(call, data)
        } catch (e: Exception) {
            resolveError(call, "isAvailable failed: ${e.message}")
        }
    }

    /** Separate from isAvailable() on purpose: opening the Play Store is a real user-facing
     *  action, so it only happens when explicitly called, not as a side effect of a status check. */
    @PluginMethod
    fun openHealthConnectInstall(call: PluginCall) {
        try {
            activity.startActivity(manager.playStoreInstallIntent())
            resolveSuccess(call, JSObject().apply { put("opened", true) })
        } catch (e: Exception) {
            resolveError(call, "Could not open Play Store: ${e.message}")
        }
    }

    // Capacitor's own Plugin base class already declares requestPermissions(PluginCall) as an
    // overridable hook -- it's the documented extension point for plugins whose permission
    // model isn't standard Android runtime permissions (like Health Connect's). Overriding it
    // is the correct fix, not a naming collision to work around: it keeps the JS-facing method
    // name exactly "requestPermissions" with no remapping needed.
    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        if (!manager.isAvailable()) {
            resolveError(call, "Health Connect is not available on this device.")
            return
        }
        pluginScope.launch {
            try {
                if (manager.hasAllPermissions()) {
                    resolveSuccess(call, JSObject().apply { put("granted", true) })
                    return@launch
                }
                val contract = manager.permissionRequestContract()
                val intent = contract.createIntent(context, manager.allPermissions)
                saveCall(call)
                startActivityForResult(call, intent, "permissionCallback")
            } catch (e: Exception) {
                resolveError(call, "requestPermissions failed: ${e.message}")
            }
        }
    }

    @ActivityCallback
    private fun permissionCallback(call: PluginCall?, result: androidx.activity.result.ActivityResult) {
        if (call == null) return
        pluginScope.launch {
            try {
                val granted = manager.grantedPermissions()
                val data = JSObject().apply {
                    put("granted", granted.containsAll(manager.allPermissions))
                    put("grantedPermissions", JSONArray(granted.toList()))
                }
                resolveSuccess(call, data)
            } catch (e: Exception) {
                resolveError(call, "Permission result handling failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        if (!manager.isAvailable()) {
            resolveSuccess(call, JSObject().apply { put("granted", false); put("available", false) })
            return
        }
        pluginScope.launch {
            try {
                val granted = manager.grantedPermissions()
                resolveSuccess(call, JSObject().apply {
                    put("available", true)
                    put("granted", granted.containsAll(manager.allPermissions))
                    put("grantedPermissions", JSONArray(granted.toList()))
                })
            } catch (e: Exception) {
                resolveError(call, "getPermissionStatus failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun revokePermissions(call: PluginCall) {
        pluginScope.launch {
            try {
                manager.revokeAllPermissions()
                resolveSuccess(call, JSObject().apply { put("revoked", true) })
            } catch (e: Exception) {
                resolveError(call, "revokePermissions failed: ${e.message}")
            }
        }
    }

    private suspend fun ensurePermissions(call: PluginCall): Boolean {
        if (!manager.isAvailable()) {
            resolveError(call, "Health Connect is not available on this device.")
            return false
        }
        if (manager.hasAllPermissions()) return true
        resolveError(call, "Health Connect permissions have not been granted yet. Call requestPermissions() first.")
        return false
    }

    @PluginMethod
    fun getTodaySteps(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getTodaySteps() } } }

    @PluginMethod
    fun getHeartRate(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getHeartRate() } } }

    @PluginMethod
    fun getLatestWeight(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestWeight() } } }

    @PluginMethod
    fun getTodayActiveCalories(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getTodayActiveCalories() } } }

    @PluginMethod
    fun getTodayDistance(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getTodayDistance() } } }

    // ADDED
    @PluginMethod
    fun getTodayWorkoutCount(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getTodayExerciseSessionCount() } } }

    // ADDED -- the 10 newly requested metrics
    @PluginMethod
    fun getRespiratoryRate(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestRespiratoryRate() } } }

    @PluginMethod
    fun getOxygenSaturation(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestOxygenSaturation() } } }

    @PluginMethod
    fun getBloodPressure(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestBloodPressure() } } }

    @PluginMethod
    fun getBodyTemperature(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestBodyTemperature() } } }

    @PluginMethod
    fun getBodyFat(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestBodyFat() } } }

    @PluginMethod
    fun getHeight(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestHeight() } } }

    @PluginMethod
    fun getLeanBodyMass(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestLeanBodyMass() } } }

    @PluginMethod
    fun getBasalMetabolicRate(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestBasalMetabolicRate() } } }

    @PluginMethod
    fun getTodayHydration(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getTodayHydration() } } }

    @PluginMethod
    fun getTodayNutrition(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getTodayNutrition() } } }

    // ADDED: trend data + sleep, for the redesigned Home dashboard's mini charts
    @PluginMethod
    fun getSleepSummary(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolve(call) { manager.getLatestSleepSession() } } }

    @PluginMethod
    fun getHeartRateHistory(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolveArray(call) { manager.getHeartRateRecentSeries() } } }

    @PluginMethod
    fun getStepsHistory(call: PluginCall) { pluginScope.launch { if (ensurePermissions(call)) safeResolveArray(call) { manager.getStepsHistory7Days() } } }

    @PluginMethod
    fun getWeightHistory(call: PluginCall) {
        val days = call.getInt("days", 90) ?: 90
        pluginScope.launch { if (ensurePermissions(call)) safeResolveArray(call) { manager.getWeightHistory(days) } }
    }

    private suspend fun safeResolveArray(call: PluginCall, block: suspend () -> JSONArray) {
        try {
            resolveSuccess(call, JSObject().apply { put("items", block()) })
        } catch (e: Exception) {
            resolveError(call, "Read failed: ${e.message}")
        }
    }

    private suspend fun safeResolve(call: PluginCall, block: suspend () -> org.json.JSONObject) {
        try {
            resolveSuccess(call, JSObject.fromJSONObject(block()))
        } catch (e: Exception) {
            resolveError(call, "Read failed: ${e.message}")
        }
    }

    /** One call for the dashboard/Sync button: fetches all 5 "today" reads. Individual
     *  failures don't abort the whole thing -- each field is null if its own read failed. */
    @PluginMethod
    fun syncNow(call: PluginCall) {
        pluginScope.launch {
            if (!ensurePermissions(call)) return@launch
            val data = JSObject()
            // Every field is independently wrapped in safeOrNull -- one metric failing
            // (missing permission for a newly-added type, a transient read error, etc.)
            // never prevents the others from returning. No single bad read blanks the screen.
            data.put("steps", safeOrNull { manager.getTodaySteps() }?.let { JSObject.fromJSONObject(it) })
            data.put("heartRate", safeOrNull { manager.getHeartRate() }?.let { JSObject.fromJSONObject(it) })
            data.put("weight", safeOrNull { manager.getLatestWeight() }?.let { JSObject.fromJSONObject(it) })
            data.put("activeCalories", safeOrNull { manager.getTodayActiveCalories() }?.let { JSObject.fromJSONObject(it) })
            data.put("distance", safeOrNull { manager.getTodayDistance() }?.let { JSObject.fromJSONObject(it) })
            data.put("workouts", safeOrNull { manager.getTodayExerciseSessionCount() }?.let { JSObject.fromJSONObject(it) })
            data.put("sleep", safeOrNull { manager.getLatestSleepSession() }?.let { JSObject.fromJSONObject(it) }) // ADDED
            data.put("steps7Days", safeOrNull { manager.getStepsHistory7Days() }) // ADDED
            data.put("heartRateSeries", safeOrNull { manager.getHeartRateRecentSeries() }) // ADDED
            data.put("weightHistory", safeOrNull { manager.getWeightHistory(90) }) // ADDED
            // ADDED -- the 10 newly requested metrics, each independently wrapped so one
            // missing permission or empty result never affects any other field
            data.put("respiratoryRate", safeOrNull { manager.getLatestRespiratoryRate() }?.let { JSObject.fromJSONObject(it) })
            data.put("oxygenSaturation", safeOrNull { manager.getLatestOxygenSaturation() }?.let { JSObject.fromJSONObject(it) })
            data.put("bloodPressure", safeOrNull { manager.getLatestBloodPressure() }?.let { JSObject.fromJSONObject(it) })
            data.put("bodyTemperature", safeOrNull { manager.getLatestBodyTemperature() }?.let { JSObject.fromJSONObject(it) })
            data.put("bodyFat", safeOrNull { manager.getLatestBodyFat() }?.let { JSObject.fromJSONObject(it) })
            data.put("height", safeOrNull { manager.getLatestHeight() }?.let { JSObject.fromJSONObject(it) })
            data.put("leanBodyMass", safeOrNull { manager.getLatestLeanBodyMass() }?.let { JSObject.fromJSONObject(it) })
            data.put("basalMetabolicRate", safeOrNull { manager.getLatestBasalMetabolicRate() }?.let { JSObject.fromJSONObject(it) })
            data.put("hydration", safeOrNull { manager.getTodayHydration() }?.let { JSObject.fromJSONObject(it) })
            data.put("nutrition", safeOrNull { manager.getTodayNutrition() }?.let { JSObject.fromJSONObject(it) })
            data.put("syncedAt", System.currentTimeMillis())
            resolveSuccess(call, data)
        }
    }

    private suspend fun <T> safeOrNull(block: suspend () -> T): T? = try { block() } catch (e: Exception) { null }

    /** ignytWorkoutId is required, not optional -- it's what makes duplicate-export
     *  prevention actually work (see HealthConnectManager's clientRecordId comment). */
    @PluginMethod
    fun saveWorkout(call: PluginCall) {
        pluginScope.launch {
            if (!ensurePermissions(call)) return@launch
            try {
                val startMillis = call.getString("startTime")?.toLongOrNull()
                val endMillis = call.getString("endTime")?.toLongOrNull()
                val title = call.getString("title") ?: "Workout"
                val ignytWorkoutId = call.getString("ignytWorkoutId")
                if (startMillis == null || endMillis == null || ignytWorkoutId.isNullOrBlank()) {
                    resolveError(call, "saveWorkout requires startTime, endTime, and ignytWorkoutId.")
                    return@launch
                }
                val exerciseType = mapIgnytExerciseType(call.getString("type"))
                val id = manager.saveWorkout(
                    Instant.ofEpochMilli(startMillis), Instant.ofEpochMilli(endMillis), title, exerciseType, ignytWorkoutId
                )
                resolveSuccess(call, JSObject().apply { put("recordId", id) })
            } catch (e: Exception) {
                resolveError(call, "saveWorkout failed: ${e.message}")
            }
        }
    }

    /** ignytBodyLogId required for the same reason. */
    @PluginMethod
    fun saveWeight(call: PluginCall) {
        pluginScope.launch {
            if (!ensurePermissions(call)) return@launch
            try {
                val weightKg = call.getDouble("weightKg")
                val ignytBodyLogId = call.getString("ignytBodyLogId")
                if (weightKg == null || ignytBodyLogId.isNullOrBlank()) {
                    resolveError(call, "saveWeight requires weightKg and ignytBodyLogId.")
                    return@launch
                }
                val timeMillis = call.getString("time")?.toLongOrNull() ?: System.currentTimeMillis()
                val id = manager.saveWeight(weightKg, Instant.ofEpochMilli(timeMillis), ignytBodyLogId)
                resolveSuccess(call, JSObject().apply { put("recordId", id) })
            } catch (e: Exception) {
                resolveError(call, "saveWeight failed: ${e.message}")
            }
        }
    }

    private fun resolveSuccess(call: PluginCall, data: JSObject) {
        call.resolve(JSObject().apply { put("success", true); put("data", data) })
    }

    private fun resolveError(call: PluginCall, message: String) {
        call.resolve(JSObject().apply { put("success", false); put("error", message) })
    }

    private fun mapIgnytExerciseType(ignytType: String?): Int = when (ignytType) {
        "race" -> ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING
        "cardio" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
        else -> ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
    }
}
