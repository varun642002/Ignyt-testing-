package com.varun.ignyt.tracking

import android.content.Context
import android.location.Location
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * The session state for a GPS-tracked activity, and the rules that decide which of the
 * device's location fixes are allowed to affect it.
 *
 * This is deliberately separate from TrackingService. The service owns the Android
 * lifecycle - a foreground notification, a wake lock, a subscription to the fused
 * provider - and this owns what a run actually IS. Keeping them apart is what lets the
 * service be killed and restarted by the system without the run being lost, and it is
 * what makes the filtering below testable by reasoning rather than by going outside.
 *
 * A singleton because there is exactly one run in progress on a phone at a time, and
 * because the service and the Capacitor plugin both need to see the same one.
 */
object RouteTracker {

    /* ---------------- FILTERING CONSTANTS ----------------

       Raw GPS is not a track; it is a noisy estimate of one, and the difference between
       an app whose distances match a real watch and one that reads 10% long is almost
       entirely these four numbers.

       Every constant here is a rejection rule, and each rejects a different failure. */

    /** Fixes worse than this are guesses, not positions. Under trees or between buildings
     *  the phone will happily report a 60m-accuracy fix; accepting it teleports the track
     *  sideways and adds distance that was never run. */
    private const val MAX_ACCURACY_M = 25f

    /** Below this, a "movement" is indistinguishable from the receiver jittering in place.
     *  This is the rule that stops a run gaining distance while its owner waits at a
     *  crossing, and it is scaled by the fix's own reported accuracy rather than being a
     *  fixed number, because a 4m-accurate fix and a 20m-accurate one disagree about what
     *  counts as standing still. */
    private const val JITTER_FLOOR_FACTOR = 0.5

    /** Movement slower than this is not travel. Used to separate moving time from elapsed
     *  time, which is why a run paused at a junction still reports an honest pace. */
    private const val MOVING_MIN_MPS = 0.5

    /** Altitude from GPS is far noisier than position, and naively summing every rise
     *  invents hundreds of metres of climb on flat ground. Gain is only banked once the
     *  climb since the last banked low exceeds this, which is the standard hysteresis
     *  approach and the only one that survives a phone sitting still on a table. */
    private const val ELEVATION_HYSTERESIS_M = 3.0

    /** Implied speeds above the activity's ceiling are impossible and mean a bad fix, not
     *  a fast athlete. Generous on purpose: the point is to catch a fix that jumped a
     *  kilometre, not to police anyone's sprint. */
    private fun maxSpeedFor(activity: String): Double = when (activity) {
        "ride" -> 30.0   // 108 km/h, descending on a bike
        "walk" -> 5.0    // 18 km/h, faster than any walk
        else   -> 12.0   // 43 km/h, comfortably above a world-record sprint
    }

    /* ---------------- SESSION STATE ---------------- */

    data class Fix(
        val lat: Double,
        val lon: Double,
        val alt: Double,
        val acc: Float,
        val t: Long
    )

    const val IDLE = "idle"
    const val RUNNING = "running"
    const val PAUSED = "paused"

    @Volatile var state: String = IDLE; private set
    @Volatile var activity: String = "run"; private set
    @Volatile var sessionId: String = ""; private set

    private var startedAt: Long = 0
    private var pausedTotalMs: Long = 0
    private var pausedAt: Long = 0

    private var distanceM: Double = 0.0
    private var movingMs: Long = 0
    private var gainM: Double = 0.0

    private var lastFix: Fix? = null
    private var elevationAnchor: Double = Double.NaN

    private val points = ArrayList<Fix>()
    private var journal: File? = null

    private val lock = Any()

    /* ---------------- LIFECYCLE ---------------- */

    fun start(ctx: Context, activityType: String, id: String) {
        synchronized(lock) {
            reset()
            activity = activityType
            sessionId = id
            startedAt = System.currentTimeMillis()
            state = RUNNING
            journal = File(ctx.filesDir, JOURNAL_NAME).also { f ->
                // Header line first, so a recovered journal knows what it is before it
                // knows where it went.
                f.writeText(
                    JSONObject()
                        .put("id", id)
                        .put("activity", activityType)
                        .put("startedAt", startedAt)
                        .toString() + "\n"
                )
            }
        }
    }

    fun pause() = synchronized(lock) {
        if (state != RUNNING) return@synchronized
        state = PAUSED
        pausedAt = System.currentTimeMillis()
        // Dropped so the first fix after resuming cannot draw a straight line across
        // however far the phone travelled while paused.
        lastFix = null
    }

    fun resume() = synchronized(lock) {
        if (state != PAUSED) return@synchronized
        pausedTotalMs += System.currentTimeMillis() - pausedAt
        pausedAt = 0
        state = RUNNING
    }

    /** Ends the session and returns it. The journal is deleted only here, so any exit that
     *  is not a deliberate finish leaves it on disk to be recovered. */
    fun finish(): JSONObject = synchronized(lock) {
        if (state == PAUSED) pausedTotalMs += System.currentTimeMillis() - pausedAt
        val out = snapshot(includeTrack = true)
        journal?.delete()
        reset()
        return@synchronized out
    }

    fun discard() = synchronized(lock) {
        journal?.delete()
        reset()
    }

    private fun reset() {
        state = IDLE
        sessionId = ""
        startedAt = 0; pausedTotalMs = 0; pausedAt = 0
        distanceM = 0.0; movingMs = 0; gainM = 0.0
        lastFix = null
        elevationAnchor = Double.NaN
        points.clear()
        journal = null
    }

    /* ---------------- THE FILTER ----------------

       Returns true if this fix changed the session, which is the service's cue to refresh
       its notification. A rejected fix is not an error and is not reported as one; on a
       normal run a good number of fixes are rejected and the track is better for it. */

    fun onLocation(loc: Location): Boolean {
        synchronized(lock) {
            if (state != RUNNING) return false
            if (!loc.hasAccuracy() || loc.accuracy > MAX_ACCURACY_M) return false

            val now = if (loc.time > 0) loc.time else System.currentTimeMillis()
            val fix = Fix(loc.latitude, loc.longitude, if (loc.hasAltitude()) loc.altitude else Double.NaN, loc.accuracy, now)

            val prev = lastFix
            if (prev == null) {
                // First fix of the session, or the first after a resume. It establishes
                // where we are without claiming anyone travelled to get here.
                accept(fix)
                return true
            }

            val dt = (fix.t - prev.t) / 1000.0
            if (dt <= 0) return false

            val d = haversineM(prev.lat, prev.lon, fix.lat, fix.lon)

            // Inside the noise floor: the receiver moved, the athlete did not.
            if (d < prev.acc * JITTER_FLOOR_FACTOR) return false

            // Physically impossible for this activity, so the fix is wrong rather than
            // the athlete being fast. Dropped without updating lastFix, so the next good
            // fix is still measured from the last position we actually trust.
            if (d / dt > maxSpeedFor(activity)) return false

            distanceM += d
            if (d / dt >= MOVING_MIN_MPS) movingMs += (dt * 1000).toLong()

            if (!fix.alt.isNaN()) {
                if (elevationAnchor.isNaN()) {
                    elevationAnchor = fix.alt
                } else if (fix.alt - elevationAnchor >= ELEVATION_HYSTERESIS_M) {
                    gainM += fix.alt - elevationAnchor
                    elevationAnchor = fix.alt
                } else if (elevationAnchor - fix.alt >= ELEVATION_HYSTERESIS_M) {
                    // Descending resets the anchor low, so the next climb is measured
                    // from the bottom of the dip rather than from the top.
                    elevationAnchor = fix.alt
                }
            }

            accept(fix)
            return true
        }
    }

    /** Appends to the on-disk journal as well as memory.
     *
     *  Writing every accepted fix rather than saving at the end is what makes this
     *  survivable. A tracking service is exactly the kind of process an aggressive OEM
     *  battery manager kills without warning, and a run that only exists in RAM is a run
     *  the athlete loses. One line per fix, appended, so a kill mid-write costs the last
     *  point and nothing else. */
    private fun accept(fix: Fix) {
        points.add(fix)
        try {
            journal?.appendText(
                "${fix.lat},${fix.lon},${fix.alt},${fix.acc},${fix.t}," +
                "${"%.2f".format(distanceM)},$movingMs,${"%.1f".format(gainM)}\n"
            )
        } catch (_: Exception) { /* a failed journal write must never stop the run */ }
    }

    /* ---------------- RECOVERY ---------------- */

    /** Reads a journal left behind by a killed process, if there is one, without adopting
     *  it. The web layer decides whether to offer it to the user; a run from three days
     *  ago should not silently resume. */
    fun pendingRecovery(ctx: Context): JSONObject? {
        val f = File(ctx.filesDir, JOURNAL_NAME)
        if (!f.exists()) return null
        return try {
            val lines = f.readLines().filter { it.isNotBlank() }
            if (lines.size < 2) { f.delete(); return null }
            val head = JSONObject(lines[0])
            val track = JSONArray()
            var dist = 0.0; var moving = 0L; var gain = 0.0; var lastT = 0L
            for (i in 1 until lines.size) {
                val p = lines[i].split(",")
                if (p.size < 8) continue          // torn final line from a mid-write kill
                track.put(JSONArray().put(p[0].toDouble()).put(p[1].toDouble()))
                dist = p[5].toDouble(); moving = p[6].toLong(); gain = p[7].toDouble()
                lastT = p[4].toLong()
            }
            JSONObject()
                .put("id", head.optString("id"))
                .put("activity", head.optString("activity", "run"))
                .put("startedAt", head.optLong("startedAt"))
                .put("lastFixAt", lastT)
                .put("distanceM", dist)
                .put("movingMs", moving)
                .put("gainM", gain)
                .put("pointCount", track.length())
                .put("track", track)
        } catch (_: Exception) {
            f.delete(); null
        }
    }

    fun clearRecovery(ctx: Context) {
        File(ctx.filesDir, JOURNAL_NAME).delete()
    }

    /* ---------------- READ-OUT ---------------- */

    fun snapshot(includeTrack: Boolean = false): JSONObject = synchronized(lock) {
        val elapsed = if (startedAt == 0L) 0L else {
            val livePause = if (state == PAUSED && pausedAt > 0) System.currentTimeMillis() - pausedAt else 0L
            System.currentTimeMillis() - startedAt - pausedTotalMs - livePause
        }
        val o = JSONObject()
            .put("state", state)
            .put("activity", activity)
            .put("id", sessionId)
            .put("startedAt", startedAt)
            .put("elapsedMs", elapsed.coerceAtLeast(0))
            .put("movingMs", movingMs)
            .put("distanceM", distanceM)
            .put("gainM", gainM)
            .put("pointCount", points.size)
        points.lastOrNull()?.let {
            o.put("lat", it.lat).put("lon", it.lon).put("acc", it.acc.toDouble())
        }
        if (includeTrack) {
            val arr = JSONArray()
            for (p in points) {
                arr.put(JSONArray().put(p.lat).put(p.lon).put(if (p.alt.isNaN()) JSONObject.NULL else p.alt).put(p.t))
            }
            o.put("track", arr)
        }
        return@synchronized o
    }

    /** The tail of the track, for a live map that already has everything before [fromIndex].
     *  Sending the whole polyline every second would grow quadratically over an hour. */
    fun trackSince(fromIndex: Int): JSONArray = synchronized(lock) {
        val arr = JSONArray()
        var i = fromIndex.coerceAtLeast(0)
        while (i < points.size) {
            val p = points[i]
            arr.put(JSONArray().put(p.lat).put(p.lon))
            i++
        }
        return@synchronized arr
    }

    /* ---------------- GEOMETRY ---------------- */

    private const val JOURNAL_NAME = "ignyt_active_route.log"
    private const val EARTH_R = 6371008.8

    fun haversineM(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val p1 = Math.toRadians(lat1); val p2 = Math.toRadians(lat2)
        val dp = Math.toRadians(lat2 - lat1); val dl = Math.toRadians(lon2 - lon1)
        val a = sin(dp / 2) * sin(dp / 2) + cos(p1) * cos(p2) * sin(dl / 2) * sin(dl / 2)
        return 2 * EARTH_R * atan2(sqrt(a), sqrt(1 - a))
    }
}
