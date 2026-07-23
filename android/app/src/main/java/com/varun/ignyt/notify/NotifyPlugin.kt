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
        const val PREFS = "ignyt_reminders_prefs"
    }

    override fun load() {
        val channel = NotificationChannel(
            CHANNEL_ID, "IGNYT Reminders", NotificationManager.IMPORTANCE_DEFAULT
        ).apply { description = "Workout, hydration, and weekly report reminders" }
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
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

    private fun persist(id: String, hour: Int, minute: Int, title: String, body: String, intervalDays: Int) {
        val json = org.json.JSONObject().apply {
            put("id", id); put("hour", hour); put("minute", minute)
            put("title", title); put("body", body); put("intervalDays", intervalDays)
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(keyFor(id), json.toString()).apply()
    }
}
