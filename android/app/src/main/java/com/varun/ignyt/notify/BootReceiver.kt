package com.varun.ignyt.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/** AlarmManager alarms are cleared on reboot -- this re-arms every reminder that was
 *  persisted by NotifyPlugin.scheduleDaily() so a phone restart doesn't silently kill the
 *  user's reminders. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = context.getSharedPreferences(NotifyPlugin.PREFS, Context.MODE_PRIVATE)
        prefs.all.values.forEach { value ->
            try {
                val json = JSONObject(value as String)
                ReminderScheduler.arm(
                    context,
                    json.getString("id"),
                    json.getInt("hour"),
                    json.getInt("minute"),
                    json.getString("title"),
                    json.getString("body"),
                    json.optInt("intervalDays", 1)
                )
            } catch (e: Exception) { /* skip malformed/legacy entries */ }
        }
    }
}
