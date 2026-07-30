package com.varun.ignyt.notify

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Real, background-capable daily reminders (workout / hydration / weekly report), hand-rolled
 * like every other IGNYT plugin -- no third-party Capacitor plugin, no push server. Backed by
 * AlarmManager (see ReminderScheduler) + NotificationManager, which is exactly what a local
 * reminder needs; a push server would only be required to notify about something that happens
 * on a *server*, which none of these reminders are.
 *
 * Same contract as the other plugins: resolves {"success"/"granted"/... }, never rejects on
 * expected failure paths.
 */
@CapacitorPlugin(
    name = "IgnytNotify",
    permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")]
)
class NotifyPlugin : com.getcapacitor.Plugin() {

    companion object {
        const val CHANNEL_ID = "ignyt_reminders"
        /* Sound and vibration are fixed on a channel at creation and cannot be overridden per
           notification from API 26 on, so "silent" and "no vibration" have to be separate
           channels rather than flags. Three channels, one per combination the settings offer. */
        const val CHANNEL_NO_VIBRATE = "ignyt_reminders_quiet"
        const val CHANNEL_SILENT = "ignyt_reminders_silent"
        const val PREFS = "ignyt_reminders_prefs"
    }

    override fun load() {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_ID, "Reminders", NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Meal, workout, hydration and progress reminders"
            enableVibration(true)
        })

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_NO_VIBRATE, "Reminders (no vibration)", NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "The same reminders, with vibration off"
            enableVibration(false)
        })

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_SILENT, "Reminders (silent)", NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Reminders that appear without sound or vibration"
            enableVibration(false)
            setSound(null, null)
        })
    }

    private fun hasPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= 33) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else {
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        }
    }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        call.resolve(JSObject().apply { put("granted", hasPermission()) })
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && !hasPermission()) {
            requestPermissionForAlias("notifications", call, "permissionCallback")
        } else {
            call.resolve(JSObject().apply { put("granted", hasPermission()) })
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        call.resolve(JSObject().apply { put("granted", hasPermission()) })
    }

    @PluginMethod
    fun scheduleDaily(call: PluginCall) {
        val id = call.getString("id")
        if (id.isNullOrEmpty()) { call.reject("id is required"); return }
        val hour = call.getInt("hour") ?: 20
        val minute = call.getInt("minute") ?: 0
        val title = call.getString("title") ?: "IGNYT"
        val body = call.getString("body") ?: ""
        val intervalDays = call.getInt("intervalDays") ?: 1

        persist(id, hour, minute, title, body, intervalDays)
        ReminderScheduler.arm(context, id, hour, minute, title, body, intervalDays)
        call.resolve(JSObject().apply { put("scheduled", true) })
    }

    /**
     * One-shot notification at an absolute epoch time. Used by the Fasting Tracker for the
     * halfway nudge and the break-fast alert, both of which happen once per fast and are
     * cancelled when the fast is stopped early.
     *
     * Deliberately NOT persisted the way scheduleDaily is: a daily reminder must survive a
     * reboot, but a one-shot tied to a specific fast should not be resurrected by BootReceiver
     * hours later when that fast may already be over. The JS layer re-arms from the active
     * fast on launch, which is the only place that knows whether the fast still exists.
     */
    @PluginMethod
    fun scheduleAt(call: PluginCall) {
        val id = call.getString("id")
        if (id.isNullOrEmpty()) { call.reject("id is required"); return }
        // getLong is unavailable on PluginCall; epoch millis exceeds Int, so it crosses the
        // bridge as a double and is narrowed here.
        val at = call.getDouble("at")
        if (at == null || at <= 0) { call.reject("at (epoch millis) is required"); return }
        val title = call.getString("title") ?: "IGNYT"
        val body = call.getString("body") ?: ""
        ReminderScheduler.armOnce(context, id, at.toLong(), title, body)
        call.resolve(JSObject().apply { put("scheduled", true) })
    }

    /**
     * Schedules a reminder on specific weekdays. "Daily", "weekdays", "weekends" and "custom
     * days" are all the same call with a different day list -- the JS layer owns that
     * vocabulary and this only ever sees the resulting days, so a new repeat option needs no
     * native change.
     *
     * days: 0=Sunday..6=Saturday (JavaScript's Date.getDay()). An empty list cancels.
     */
    @PluginMethod
    fun scheduleWeekly(call: PluginCall) {
        val id = call.getString("id")
        if (id.isNullOrEmpty()) { call.reject("id is required"); return }
        val daysArr = call.getArray("days")
        val days = mutableListOf<Int>()
        if (daysArr != null) {
            for (i in 0 until daysArr.length()) {
                (daysArr.opt(i) as? Number)?.let { days.add(it.toInt()) }
            }
        }
        val hour = call.getInt("hour") ?: 9
        val minute = call.getInt("minute") ?: 0
        val title = call.getString("title") ?: "IGNYT"
        val body = call.getString("body") ?: ""
        val route = call.getString("route") ?: ""
        val snooze = call.getInt("snoozeMinutes") ?: 0
        val vibrate = call.getBoolean("vibrate", true) ?: true
        val silent = call.getBoolean("silent", false) ?: false

        persistWeekly(id, days, hour, minute, title, body, route, snooze, vibrate, silent)
        ReminderScheduler.armWeekly(context, id, days, hour, minute, title, body, route, snooze, vibrate, silent)
        call.resolve(JSObject().apply { put("scheduled", days.isNotEmpty()); put("days", days.size) })
    }

    /** Every scheduled reminder, so the JS layer can reconcile after a reinstall or a restore
     *  rather than assuming its own settings and the system agree. */
    @PluginMethod
    fun listScheduled(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val ids = prefs.all.keys.filter { it.startsWith("reminder_") }.map { it.removePrefix("reminder_") }
        call.resolve(JSObject().apply { put("ids", com.getcapacitor.JSArray(ids.toTypedArray())) })
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        val id = call.getString("id")
        if (id.isNullOrEmpty()) { call.reject("id is required"); return }
        ReminderScheduler.cancel(context, id)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(keyFor(id)).apply()
        call.resolve(JSObject().apply { put("cancelled", true) })
    }

    @PluginMethod
    fun sendTest(call: PluginCall) {
        val title = call.getString("title") ?: "IGNYT"
        val body = call.getString("body") ?: "Notifications are working."
        ReminderNotifier.show(context, "test", title, body)
        call.resolve(JSObject().apply { put("sent", true) })
    }

    private fun keyFor(id: String) = "reminder_$id"

    /* Weekly reminders are persisted in the same store as daily ones so BootReceiver can
       re-arm them: AlarmManager alarms do not survive a reboot, and a reminder that silently
       stops after a restart is worse than one that was never set. */
    private fun persistWeekly(
        id: String, days: List<Int>, hour: Int, minute: Int, title: String, body: String,
        route: String, snooze: Int, vibrate: Boolean, silent: Boolean
    ) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (days.isEmpty()) { prefs.edit().remove(keyFor(id)).apply(); return }
        val json = org.json.JSONObject().apply {
            put("kind", "weekly")
            put("days", org.json.JSONArray(days))
            put("hour", hour); put("minute", minute)
            put("title", title); put("body", body); put("route", route)
            put("snoozeMinutes", snooze); put("vibrate", vibrate); put("silent", silent)
        }
        prefs.edit().putString(keyFor(id), json.toString()).apply()
    }

    private fun persist(id: String, hour: Int, minute: Int, title: String, body: String, intervalDays: Int) {
        val json = org.json.JSONObject().apply {
            put("id", id); put("hour", hour); put("minute", minute)
            put("title", title); put("body", body); put("intervalDays", intervalDays)
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(keyFor(id), json.toString()).apply()
    }
}
