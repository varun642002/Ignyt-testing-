package com.varun.ignyt.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/** AlarmManager alarms are cleared on reboot -- this re-arms every reminder NotifyPlugin
 *  persisted, so a phone restart doesn't silently kill the user's reminders.
 *
 *  Handles both shapes: the original daily/interval reminders and the weekday ones. The id
 *  comes from the PREFERENCE KEY rather than the payload, because the key is written by
 *  keyFor() on every path and is therefore the one field guaranteed to be present — reading it
 *  from inside the JSON meant a reminder saved without it was skipped in silence. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = context.getSharedPreferences(NotifyPlugin.PREFS, Context.MODE_PRIVATE)

        prefs.all.forEach { (key, value) ->
            if (!key.startsWith("reminder_")) return@forEach
            val id = key.removePrefix("reminder_")
            try {
                val json = JSONObject(value as String)
                if (json.optString("kind") == "weekly") {
                    val daysJson = json.optJSONArray("days")
                    val days = mutableListOf<Int>()
                    if (daysJson != null) for (i in 0 until daysJson.length()) days.add(daysJson.getInt(i))
                    ReminderScheduler.armWeekly(
                        context, id, days,
                        json.getInt("hour"), json.getInt("minute"),
                        json.optString("title", "IGNYT"), json.optString("body", ""),
                        json.optString("route", ""), json.optInt("snoozeMinutes", 0),
                        json.optBoolean("vibrate", true), json.optBoolean("silent", false)
                    )
                } else {
                    ReminderScheduler.arm(
                        context, id,
                        json.getInt("hour"), json.getInt("minute"),
                        json.optString("title", "IGNYT"), json.optString("body", ""),
                        json.optInt("intervalDays", 1)
                    )
                }
            } catch (e: Exception) { /* skip malformed/legacy entries */ }
        }
    }
}
