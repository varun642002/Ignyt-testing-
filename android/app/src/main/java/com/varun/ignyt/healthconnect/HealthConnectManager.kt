package com.varun.ignyt.healthconnect

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BasalMetabolicRateRecord
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeightRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.LeanBodyMassRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import androidx.health.connect.client.units.Mass
import androidx.health.connect.client.units.Percentage
import androidx.health.connect.client.units.Power
import androidx.health.connect.client.units.Pressure
import androidx.health.connect.client.units.Temperature
import androidx.health.connect.client.units.Volume
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.Period
import java.time.ZoneId

/**
 * Thin wrapper around the AndroidX Health Connect client, scoped to exactly the data this
 * version of IGNYT uses: read steps / heart rate / weight / active calories / distance,
 * write exercise sessions and weight. No Sleep, no Nutrition, no other record types --
 * matches the explicit initial-scope requirement, not a placeholder for "more later" that
 * accidentally requests permissions nobody asked for yet.
 *
 * Written against the documented Health Connect API; not compiled in the environment that
 * wrote it (no Android toolchain available there). Needs a real build to confirm.
 */
class HealthConnectManager(private val context: Context) {

    companion object {
        const val HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata"
        private const val TAG = "IgnytHealthConnect" // debug logs only, never surfaced in UI
    }

    private val client: HealthConnectClient by lazy { HealthConnectClient.getOrCreate(context) }

    val allPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        // ADDED -- the 10 newly requested metrics, read-only (none of these are written by IGNYT)
        HealthPermission.getReadPermission(RespiratoryRateRecord::class),
        HealthPermission.getReadPermission(OxygenSaturationRecord::class),
        HealthPermission.getReadPermission(BloodPressureRecord::class),
        HealthPermission.getReadPermission(BodyTemperatureRecord::class),
        HealthPermission.getReadPermission(BodyFatRecord::class),
        HealthPermission.getReadPermission(HeightRecord::class),
        HealthPermission.getReadPermission(LeanBodyMassRecord::class),
        HealthPermission.getReadPermission(BasalMetabolicRateRecord::class),
        HealthPermission.getReadPermission(HydrationRecord::class),
        HealthPermission.getReadPermission(NutritionRecord::class),
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class)
    )

    fun sdkStatus(): Int = HealthConnectClient.getSdkStatus(context, HEALTH_CONNECT_PACKAGE)
    fun isAvailable(): Boolean = sdkStatus() == HealthConnectClient.SDK_AVAILABLE

    fun playStoreInstallIntent(): Intent {
        val uri = Uri.parse("market://details?id=$HEALTH_CONNECT_PACKAGE&url=healthconnect%3A%2F%2Fonboarding")
        return Intent(Intent.ACTION_VIEW, uri).apply {
            setPackage("com.android.vending")
            putExtra("overlay", true)
            putExtra("callerId", context.packageName)
        }
    }

    fun permissionRequestContract() = PermissionController.createRequestPermissionResultContract()

    suspend fun grantedPermissions(): Set<String> = client.permissionController.getGrantedPermissions()
    suspend fun hasAllPermissions(): Boolean = grantedPermissions().containsAll(allPermissions)
    suspend fun revokeAllPermissions() = client.permissionController.revokeAllPermissions()

    /** Resolves a Health Connect record's data-origin package name to a friendly app label
     *  by asking the OS what that app actually calls itself (PackageManager), rather than
     *  hardcoding any specific provider's name. Falls back to "Health Connect" if the source
     *  app isn't installed/resolvable (e.g. it wrote data previously and was since removed) --
     *  never guesses, never shows a raw package name in the UI. */
    private fun friendlySourceName(packageName: String): String {
        if (packageName == context.packageName) return "IGNYT"
        return try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            "Health Connect"
        }
    }

    private fun todayRange(): TimeRangeFilter {
        val zone = ZoneId.systemDefault()
        val startOfDay = java.time.ZonedDateTime.now(zone).toLocalDate().atStartOfDay(zone).toInstant()
        return TimeRangeFilter.between(startOfDay, Instant.now())
    }

    /** FIXED: was summing raw StepsRecord.count across every individual record, which
     *  double-counts when more than one app (e.g. Zepp alongside another source) writes
     *  overlapping records to Health Connect. aggregate() with COUNT_TOTAL is Health
     *  Connect's own mechanism for correctly merging overlapping multi-source data into one
     *  accurate total -- this is the actual root cause fix, not a cosmetic change.
     *  Returns null (not 0) when there's genuinely no data, so the UI can tell "no data"
     *  apart from a real zero -- that distinction is the aggregate API's own behavior, not
     *  something this code fakes. */
    suspend fun getTodaySteps(): JSONObject {
        val range = todayRange()
        Log.d(TAG, "getTodaySteps: range=$range")
        val result = client.aggregate(AggregateRequest(metrics = setOf(StepsRecord.COUNT_TOTAL), timeRangeFilter = range))
        val total = result[StepsRecord.COUNT_TOTAL]
        Log.d(TAG, "getTodaySteps: aggregate result=$total")
        return JSONObject().apply { put("steps", total ?: JSONObject.NULL) }
    }

    /** Same fix as getTodaySteps -- aggregate instead of raw-record summation. */
    suspend fun getTodayActiveCalories(): JSONObject {
        val result = client.aggregate(AggregateRequest(metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL), timeRangeFilter = todayRange()))
        val kcal = result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories
        return JSONObject().apply { put("kcal", kcal ?: JSONObject.NULL) }
    }

    /** Same fix as getTodaySteps -- aggregate instead of raw-record summation. */
    suspend fun getTodayDistance(): JSONObject {
        val result = client.aggregate(AggregateRequest(metrics = setOf(DistanceRecord.DISTANCE_TOTAL), timeRangeFilter = todayRange()))
        val meters = result[DistanceRecord.DISTANCE_TOTAL]?.inMeters
        return JSONObject().apply {
            put("meters", meters ?: JSONObject.NULL)
            put("km", meters?.let { it / 1000.0 } ?: JSONObject.NULL)
        }
    }

    /** Latest single reading (still needs raw records -- a "latest value" isn't something
     *  you aggregate) plus today's min/max/average via aggregate, which IS the correct
     *  aggregate use for heart rate (BPM_MIN/BPM_MAX/BPM_AVG are real Health Connect
     *  aggregate metrics, distinct from summing, since heart rate isn't additive). */
    suspend fun getHeartRate(): JSONObject {
        val response = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = todayRange()))
        // Track which RECORD each sample came from -- Sample itself carries no metadata,
        // the source/dataOrigin belongs to the containing HeartRateRecord.
        val samplesWithSource = response.records.flatMap { record -> record.samples.map { it to record } }
        val latestPair = samplesWithSource.maxByOrNull { it.first.time }
        val latest = latestPair?.first
        val latestSource = latestPair?.second?.metadata?.dataOrigin?.packageName?.let { friendlySourceName(it) }

        val agg = client.aggregate(AggregateRequest(
            metrics = setOf(HeartRateRecord.BPM_MIN, HeartRateRecord.BPM_MAX, HeartRateRecord.BPM_AVG),
            timeRangeFilter = todayRange()
        ))

        return JSONObject().apply {
            put("latestBpm", latest?.beatsPerMinute ?: JSONObject.NULL)
            put("latestTime", latest?.time?.toString() ?: JSONObject.NULL)
            put("source", latestSource ?: JSONObject.NULL)
            put("minBpm", agg[HeartRateRecord.BPM_MIN] ?: JSONObject.NULL)
            put("maxBpm", agg[HeartRateRecord.BPM_MAX] ?: JSONObject.NULL)
            put("averageBpm", agg[HeartRateRecord.BPM_AVG] ?: JSONObject.NULL)
            put("sampleCount", samplesWithSource.size)
        }
    }

    /** Recent heart-rate samples for the mini trend chart -- last 9 hours, matching the
     *  reference layout's own "Last 9 hours" label, capped so a chart never gets an
     *  unreasonably huge point count on a device with dense sampling. */
    suspend fun getHeartRateRecentSeries(): JSONArray {
        val end = Instant.now()
        val start = end.minus(java.time.Duration.ofHours(9))
        val response = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val samples = response.records.flatMap { it.samples }.sortedBy { it.time }
        val capped = if (samples.size > 60) samples.filterIndexed { i, _ -> i % (samples.size / 60) == 0 } else samples
        val arr = JSONArray()
        capped.forEach { s -> arr.put(JSONObject().apply { put("timestamp", s.time.toString()); put("bpm", s.beatsPerMinute) }) }
        return arr
    }

    /** 7-day daily step totals for the trend chart, using aggregateGroupByPeriod -- the
     *  correct Health Connect API for "one aggregate bucket per day", not 7 separate
     *  aggregate() calls and not raw-record grouping (both would reintroduce the same
     *  double-counting risk the main fix addresses). */
    suspend fun getStepsHistory7Days(): JSONArray {
        val zone = ZoneId.systemDefault()
        val end = java.time.ZonedDateTime.now(zone)
        val start = end.minusDays(6).toLocalDate().atStartOfDay(zone)
        val response = client.aggregateGroupByPeriod(AggregateGroupByPeriodRequest(
            metrics = setOf(StepsRecord.COUNT_TOTAL),
            timeRangeFilter = TimeRangeFilter.between(start.toLocalDateTime(), end.toLocalDateTime()),
            timeRangeSlicer = Period.ofDays(1)
        ))
        val arr = JSONArray()
        response.forEach { bucket ->
            arr.put(JSONObject().apply {
                put("date", bucket.startTime.toLocalDate().toString())
                put("value", bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L)
            })
        }
        return arr
    }

    /** Weight history for the trend chart. Each weight entry is a distinct point-in-time
     *  reading, not additive -- raw records (sorted, not summed) is the correct approach
     *  here, unlike steps/distance/calories above. */
    suspend fun getWeightHistory(days: Int): JSONArray {
        val end = Instant.now()
        val start = end.minus(java.time.Duration.ofDays(days.toLong()))
        val response = client.readRecords(ReadRecordsRequest(WeightRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val arr = JSONArray()
        response.records.sortedBy { it.time }.forEach { r ->
            arr.put(JSONObject().apply { put("timestamp", r.time.toString()); put("kg", r.weight.inKilograms) })
        }
        return arr
    }

    /** Most recent sleep session (not necessarily "today" by calendar date, since sleep
     *  spans midnight -- looks back 2 days and takes the latest one that has ended). Stage
     *  breakdown uses SleepSessionRecord's real stage-type constants; unmapped/unknown stage
     *  types are grouped under "other" rather than silently dropped. */
    suspend fun getLatestSleepSession(): JSONObject {
        val end = Instant.now()
        val start = end.minus(java.time.Duration.ofDays(2))
        val response = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.filter { it.endTime <= end }.maxByOrNull { it.endTime }
            ?: return JSONObject().apply { put("totalMinutes", JSONObject.NULL) }

        val totalMinutes = java.time.Duration.between(latest.startTime, latest.endTime).toMinutes()
        val stageMinutes = mutableMapOf("awake" to 0L, "light" to 0L, "deep" to 0L, "rem" to 0L, "other" to 0L)
        latest.stages.forEach { stage ->
            val key = when (stage.stage) {
                SleepSessionRecord.STAGE_TYPE_AWAKE, SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> "awake"
                SleepSessionRecord.STAGE_TYPE_LIGHT -> "light"
                SleepSessionRecord.STAGE_TYPE_DEEP -> "deep"
                SleepSessionRecord.STAGE_TYPE_REM -> "rem"
                else -> "other"
            }
            stageMinutes[key] = (stageMinutes[key] ?: 0L) + java.time.Duration.between(stage.startTime, stage.endTime).toMinutes()
        }

        val stagesArr = JSONArray()
        stageMinutes.forEach { (stage, minutes) -> stagesArr.put(JSONObject().apply { put("stage", stage); put("minutes", minutes) }) }

        return JSONObject().apply {
            put("totalMinutes", totalMinutes)
            put("startTime", latest.startTime.toString())
            put("endTime", latest.endTime.toString())
            put("stages", stagesArr)
            put("title", latest.title ?: JSONObject.NULL)
        }
    }

    suspend fun getLatestWeight(): JSONObject {
        val end = Instant.now()
        val start = end.minus(java.time.Duration.ofDays(90))
        val response = client.readRecords(ReadRecordsRequest(WeightRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("weightKg", JSONObject.NULL) }
        return JSONObject().apply {
            put("weightKg", latest.weight.inKilograms)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    /** ADDED: today's exercise-session count for the dashboard's Workouts tile. Counts
     *  ALL exercise sessions Health Connect has for today, regardless of source app --
     *  this includes IGNYT's own exported workouts (see saveWorkout below), so a workout
     *  logged in IGNYT today will correctly show up in this count too, not just ones from
     *  other apps. That's a read of what's already in Health Connect, not a new export --
     *  no sync loop, since reading never triggers a write. */
    suspend fun getTodayExerciseSessionCount(): JSONObject {
        val response = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, timeRangeFilter = todayRange()))
        return JSONObject().apply {
            put("count", response.records.size)
        }
    }

    // ---------------------------------------------------------------------
    // ADDED -- the 10 newly requested vitals/body/nutrition metrics. Every one of these is
    // a single latest-value read (or today's-total for Hydration/Nutrition), each wrapped
    // independently by the Plugin layer's safeOrNull -- one of these failing (missing
    // permission, no data, a read error) never affects any of the others or the metrics
    // already working above.
    // ---------------------------------------------------------------------

    suspend fun getLatestRespiratoryRate(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(7))
        val response = client.readRecords(ReadRecordsRequest(RespiratoryRateRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("rpm", JSONObject.NULL) }
        return JSONObject().apply {
            put("rpm", latest.rate)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    suspend fun getLatestOxygenSaturation(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(2))
        val response = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("percentage", JSONObject.NULL) }
        return JSONObject().apply {
            put("percentage", latest.percentage.value)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    suspend fun getLatestBloodPressure(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(7))
        val response = client.readRecords(ReadRecordsRequest(BloodPressureRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("systolic", JSONObject.NULL); put("diastolic", JSONObject.NULL) }
        return JSONObject().apply {
            put("systolic", latest.systolic.inMillimetersOfMercury)
            put("diastolic", latest.diastolic.inMillimetersOfMercury)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    suspend fun getLatestBodyTemperature(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(7))
        val response = client.readRecords(ReadRecordsRequest(BodyTemperatureRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("celsius", JSONObject.NULL) }
        return JSONObject().apply {
            put("celsius", latest.temperature.inCelsius)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    suspend fun getLatestBodyFat(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(90))
        val response = client.readRecords(ReadRecordsRequest(BodyFatRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("percentage", JSONObject.NULL) }
        return JSONObject().apply {
            put("percentage", latest.percentage.value)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    suspend fun getLatestHeight(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(365))
        val response = client.readRecords(ReadRecordsRequest(HeightRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("meters", JSONObject.NULL) }
        return JSONObject().apply {
            put("meters", latest.height.inMeters)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    suspend fun getLatestLeanBodyMass(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(90))
        val response = client.readRecords(ReadRecordsRequest(LeanBodyMassRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("kg", JSONObject.NULL) }
        return JSONObject().apply {
            put("kg", latest.mass.inKilograms)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    /** LOWER CONFIDENCE than the other 9 methods in this block: BasalMetabolicRateRecord's
     *  rate field uses the Power unit type, and Power.kilocaloriesPerDay() is the constructor
     *  I have the least certainty about matching the real 1.1.0 API exactly (unlike Mass/
     *  Pressure/Temperature/Percentage/Length, which are confirmed by the same documented
     *  pattern used successfully elsewhere in this file). If this specific method fails to
     *  compile, the fix is almost certainly just the unit accessor name on Power --
     *  everything else in this method is the same well-established pattern as its siblings. */
    suspend fun getLatestBasalMetabolicRate(): JSONObject {
        val end = Instant.now(); val start = end.minus(java.time.Duration.ofDays(30))
        val response = client.readRecords(ReadRecordsRequest(BasalMetabolicRateRecord::class, timeRangeFilter = TimeRangeFilter.between(start, end)))
        val latest = response.records.maxByOrNull { it.time } ?: return JSONObject().apply { put("kcalPerDay", JSONObject.NULL) }
        return JSONObject().apply {
            put("kcalPerDay", latest.basalMetabolicRate.inKilocaloriesPerDay)
            put("time", latest.time.toString())
            put("source", friendlySourceName(latest.metadata.dataOrigin.packageName))
        }
    }

    /** Today's total water intake -- HydrationRecord entries are summed (not aggregated via
     *  the Health Connect aggregate API), since each entry is typically a distinct logged
     *  glass/bottle from ONE source app (IGNYT itself, if hydration logging is ever added),
     *  not the kind of multi-source-overlap risk that motivated the steps/distance/calories
     *  aggregate fix above. */
    suspend fun getTodayHydration(): JSONObject {
        val response = client.readRecords(ReadRecordsRequest(HydrationRecord::class, timeRangeFilter = todayRange()))
        if (response.records.isEmpty()) return JSONObject().apply { put("liters", JSONObject.NULL) }
        val totalLiters = response.records.sumOf { it.volume.inLiters }
        return JSONObject().apply { put("liters", totalLiters) }
    }

    /** Today's total nutrition -- same summation reasoning as Hydration above. Returns the
     *  full macro breakdown the task asked for (protein/carbs/fat/fiber/sugar/sodium), each
     *  independently null-safe since not every logged entry fills in every optional field. */
    suspend fun getTodayNutrition(): JSONObject {
        val response = client.readRecords(ReadRecordsRequest(NutritionRecord::class, timeRangeFilter = todayRange()))
        if (response.records.isEmpty()) return JSONObject().apply { put("kcal", JSONObject.NULL) }
        return JSONObject().apply {
            put("kcal", response.records.mapNotNull { it.energy?.inKilocalories }.sum())
            put("proteinG", response.records.mapNotNull { it.protein?.inGrams }.sum())
            put("carbsG", response.records.mapNotNull { it.totalCarbohydrate?.inGrams }.sum())
            put("fatG", response.records.mapNotNull { it.totalFat?.inGrams }.sum())
            put("fiberG", response.records.mapNotNull { it.dietaryFiber?.inGrams }.sum())
            put("sugarG", response.records.mapNotNull { it.sugar?.inGrams }.sum())
            put("sodiumMg", response.records.mapNotNull { it.sodium?.inGrams }.sum() * 1000.0)
            put("entryCount", response.records.size)
        }
    }

    /** clientRecordId ties this write to IGNYT's own workout id, so Health Connect itself
     *  de-duplicates if the same workout is ever exported twice (its own documented mechanism
     *  for exactly this problem, rather than IGNYT trying to track Health Connect record IDs
     *  on its own). */
    suspend fun saveWorkout(startTime: Instant, endTime: Instant, title: String, exerciseType: Int, ignytWorkoutId: String): String {
        val record = ExerciseSessionRecord(
            startTime = startTime,
            startZoneOffset = ZoneId.systemDefault().rules.getOffset(startTime),
            endTime = endTime,
            endZoneOffset = ZoneId.systemDefault().rules.getOffset(endTime),
            exerciseType = exerciseType,
            title = title,
            // Health Connect 1.1.0's manualEntryWithId() names its parameter "id", not
            // "clientRecordId" -- despite the name, this IS what populates the record's
            // clientRecordId field (the dedup key), it's just an odd parameter name on
            // Google's part. Confirmed by the compiler's own error, not guessed twice.
            metadata = Metadata.manualEntryWithId(id = "ignyt-workout-$ignytWorkoutId")
        )
        val result = client.insertRecords(listOf(record))
        return result.recordIdsList.firstOrNull() ?: ""
    }

    /** Same de-duplication approach for weight: clientRecordId derived from IGNYT's own
     *  body-log entry id. */
    suspend fun saveWeight(weightKg: Double, time: Instant, ignytBodyLogId: String): String {
        val record = WeightRecord(
            time = time,
            zoneOffset = ZoneId.systemDefault().rules.getOffset(time),
            weight = Mass.kilograms(weightKg),
            metadata = Metadata.manualEntryWithId(id = "ignyt-weight-$ignytBodyLogId")
        )
        val result = client.insertRecords(listOf(record))
        return result.recordIdsList.firstOrNull() ?: ""
    }
}
