package com.varun.ignyt.widgets

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * The single snapshot every widget reads from.
 *
 * WHY A SNAPSHOT AND NOT A QUERY
 * All of IGNYT's data lives in the WebView's localStorage. A widget is a separate process with
 * no WebView, no JavaScript and no way to reach it — so a widget can never ask the app a
 * question. The only workable shape is the reverse: the app pushes a flat snapshot whenever
 * something changes, and widgets render whatever was last pushed.
 *
 * That inverts the usual failure mode in a useful way. A widget can be stale, but it can never
 * hang, never block on a cold WebView, and never show a spinner on a home screen.
 *
 * EVERY FIELD IS NULLABLE AND EVERY READ HAS A DEFAULT.
 * A widget that throws is a widget that renders "Problem loading widget" — a grey box on the
 * user's home screen with no way to retry. Nothing here may throw. Missing data renders as a
 * dash, which is honest, rather than as a zero, which is a lie: 0 steps and "we have not synced
 * yet" are different facts and a step counter must not confuse them.
 */
object WidgetData {

    private const val PREFS = "ignyt_widget_data"
    private const val KEY_JSON = "snapshot"
    const val KEY_UPDATED_AT = "updatedAt"

    /* Pending actions queued BY a widget, drained by the app on next open. A widget cannot
       write to localStorage, so "+250ml" cannot actually log water from the home screen. It
       records intent here and the app reconciles it. See WidgetActionReceiver. */
    private const val KEY_PENDING = "pendingActions"

    fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun write(ctx: Context, json: String) {
        prefs(ctx).edit()
            .putString(KEY_JSON, json)
            .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
            .apply()
    }

    fun snapshot(ctx: Context): JSONObject = try {
        JSONObject(prefs(ctx).getString(KEY_JSON, "{}") ?: "{}")
    } catch (e: Exception) {
        JSONObject()
    }

    fun updatedAt(ctx: Context): Long = prefs(ctx).getLong(KEY_UPDATED_AT, 0L)

    /** True when the app has never pushed a snapshot — widgets show an "open IGNYT" prompt. */
    fun isEmpty(ctx: Context): Boolean = updatedAt(ctx) == 0L

    /* ---- safe readers ------------------------------------------------------------------- */

    fun int(ctx: Context, path: String, fallback: Int = 0): Int =
        num(ctx, path)?.toInt() ?: fallback

    fun dbl(ctx: Context, path: String, fallback: Double = 0.0): Double =
        num(ctx, path) ?: fallback

    fun str(ctx: Context, path: String, fallback: String = "—"): String {
        val v = value(ctx, path) ?: return fallback
        val s = v.toString().trim()
        return if (s.isEmpty() || s == "null") fallback else s
    }

    fun bool(ctx: Context, path: String, fallback: Boolean = false): Boolean =
        when (val v = value(ctx, path)) {
            is Boolean -> v
            is Number -> v.toInt() != 0
            is String -> v == "true"
            else -> fallback
        }

    /** Null rather than 0 when absent — the caller decides whether "no data" shows as a dash. */
    fun num(ctx: Context, path: String): Double? = when (val v = value(ctx, path)) {
        is Number -> v.toDouble()
        is String -> v.toDoubleOrNull()
        else -> null
    }

    fun has(ctx: Context, path: String): Boolean = value(ctx, path) != null

    /** Dotted path lookup: "water.ml", "macros.protein". */
    private fun value(ctx: Context, path: String): Any? {
        return try {
            var node: Any? = snapshot(ctx)
            for (part in path.split(".")) {
                node = (node as? JSONObject)?.opt(part)
                if (node == null) return null
            }
            if (node == JSONObject.NULL) null else node
        } catch (e: Exception) { null }
    }

    /* ---- pending actions ----------------------------------------------------------------- */

    /**
     * Queue an action the app will apply when it next runs.
     *
     * Appends rather than replaces, and carries a timestamp, because a user can tap "+250ml"
     * four times before opening the app and all four must count. Collapsing them to a single
     * flag would silently drop three taps, and the user would have no way to know.
     */
    fun queueAction(ctx: Context, type: String, amount: Double) {
        try {
            val p = prefs(ctx)
            val arr = org.json.JSONArray(p.getString(KEY_PENDING, "[]") ?: "[]")
            arr.put(JSONObject().apply {
                put("type", type); put("amount", amount); put("at", System.currentTimeMillis())
            })
            /* Bounded. A widget left tapped on a home screen for a month should not grow an
               unbounded queue that the app then has to chew through at launch. */
            val trimmed = org.json.JSONArray()
            val from = maxOf(0, arr.length() - 50)
            for (i in from until arr.length()) trimmed.put(arr.get(i))
            p.edit().putString(KEY_PENDING, trimmed.toString()).apply()
        } catch (e: Exception) { /* a dropped quick-add must never crash the launcher */ }
    }

    fun pendingActions(ctx: Context): String = prefs(ctx).getString(KEY_PENDING, "[]") ?: "[]"

    fun clearPending(ctx: Context) {
        prefs(ctx).edit().putString(KEY_PENDING, "[]").apply()
    }

    /**
     * Optimistic local nudge so the widget reflects a tap immediately.
     *
     * Without it, "+250ml" would appear to do nothing until the app is next opened, and the
     * user would tap it repeatedly assuming it was broken. The app remains the source of truth
     * and overwrites this on its next push; this only covers the gap in between.
     */
    fun bumpWater(ctx: Context, ml: Double) {
        try {
            val snap = snapshot(ctx)
            val water = snap.optJSONObject("water") ?: JSONObject()
            water.put("ml", water.optDouble("ml", 0.0) + ml)
            snap.put("water", water)
            prefs(ctx).edit().putString(KEY_JSON, snap.toString()).apply()
        } catch (e: Exception) { }
    }
}
