package com.varun.ignyt.widgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * The JS -> widget bridge.
 *
 * The app calls push() whenever displayed data changes; every widget is then told to redraw
 * from the new snapshot. This is the ONLY way widget content changes — there is no polling and
 * no periodic refresh doing real work, which is the whole battery story:
 *
 *   updatePeriodMillis is 0 in every widget's XML. Android's own periodic refresh cannot be set
 *   below 30 minutes and wakes the device whether or not anything changed. Pushing on change
 *   instead means a user who does not open the app costs nothing at all, and one who logs a set
 *   sees it immediately rather than up to half an hour later. Strictly better on both axes.
 *
 * The one exception is the motivation widget, which genuinely needs a daily tick and gets it
 * from a date check at draw time rather than from a timer.
 */
@CapacitorPlugin(name = "IgnytWidgets")
class WidgetDataPlugin : Plugin() {

    /** Every provider that should redraw on a push. */
    private val providers = listOf(
        ScoreWidget::class.java, WorkoutWidget::class.java, WeightWidget::class.java,
        WaterWidget::class.java, StepsWidget::class.java, CaloriesWidget::class.java,
        MotivationWidget::class.java, StreakWidget::class.java, SleepWidget::class.java,
        CoachWidget::class.java
    )

    @PluginMethod
    fun push(call: PluginCall) {
        val data = call.getObject("data")
        if (data == null) {
            call.resolve(JSObject().apply { put("success", false); put("error", "No data supplied.") })
            return
        }
        try {
            WidgetData.write(context, data.toString())
            refreshAll()
            call.resolve(JSObject().apply { put("success", true); put("widgets", activeCount()) })
        } catch (e: Exception) {
            call.resolve(JSObject().apply { put("success", false); put("error", "Could not update widgets.") })
        }
    }

    /**
     * Hands the app whatever the widgets queued, and clears it in the same call.
     *
     * Read-and-clear together, deliberately: two separate calls leave a window where the app
     * has read the actions but not cleared them, and a crash in between would replay every
     * quick-add. Losing a tap is bad; silently logging 500ml of water twice is worse.
     */
    @PluginMethod
    fun drainActions(call: PluginCall) {
        try {
            val pending = WidgetData.pendingActions(context)
            WidgetData.clearPending(context)
            call.resolve(JSObject().apply {
                put("success", true)
                put("actions", org.json.JSONArray(pending))
            })
        } catch (e: Exception) {
            call.resolve(JSObject().apply { put("success", true); put("actions", org.json.JSONArray()) })
        }
    }

    /** How many widgets the user actually has placed — lets JS skip the push entirely. */
    @PluginMethod
    fun status(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("success", true)
            put("placed", activeCount())
            put("lastUpdatedAt", WidgetData.updatedAt(context))
        })
    }

    private fun activeCount(): Int {
        val mgr = AppWidgetManager.getInstance(context)
        var n = 0
        providers.forEach { cls ->
            try { n += mgr.getAppWidgetIds(ComponentName(context, cls)).size } catch (e: Exception) { }
        }
        return n
    }

    private fun refreshAll() {
        val mgr = AppWidgetManager.getInstance(context)
        providers.forEach { cls ->
            try {
                val ids = mgr.getAppWidgetIds(ComponentName(context, cls))
                if (ids.isNotEmpty()) {
                    val provider = cls.getDeclaredConstructor().newInstance() as IgnytWidget
                    provider.onUpdate(context, mgr, ids)
                }
            } catch (e: Exception) { /* one bad provider must not stop the others */ }
        }
    }
}
