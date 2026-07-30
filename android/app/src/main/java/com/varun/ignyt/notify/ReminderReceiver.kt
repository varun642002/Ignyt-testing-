package com.varun.ignyt.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat

/** Fires when a scheduled reminder alarm goes off (app may be fully closed), and when the
 *  Snooze action on one of those notifications is tapped. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val title = intent.getStringExtra("title") ?: "IGNYT"
        val body = intent.getStringExtra("body") ?: ""
        val route = intent.getStringExtra("route") ?: ""
        val snooze = intent.getIntExtra("snoozeMinutes", 0)
        val vibrate = intent.getBooleanExtra("vibrate", true)
        val silent = intent.getBooleanExtra("silent", false)

        if (intent.action == ReminderNotifier.ACTION_SNOOZE) {
            /* Dismiss the one on screen and re-arm it. Re-armed as a ONE-SHOT, not by touching
               the recurring alarm: snoozing today's reminder must not move tomorrow's. */
            try { NotificationManagerCompat.from(context).cancel(id.hashCode()) } catch (e: Exception) {}
            ReminderScheduler.armOnce(
                context, "$id:snoozed",
                System.currentTimeMillis() + snooze * 60_000L,
                title, body, route, 0, vibrate, silent
            )
            return
        }

        ReminderNotifier.show(context, id, title, body, route, snooze, vibrate, silent)
    }
}
