package com.varun.ignyt.notify

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.varun.ignyt.MainActivity

/** Shared by ReminderReceiver (scheduled alarms) and NotifyPlugin.sendTest() (immediate test),
 *  so both build the exact same notification. */
object ReminderNotifier {

    /** Broadcast action for the Snooze button. */
    const val ACTION_SNOOZE = "com.varun.ignyt.notify.SNOOZE"

    /**
     * @param route where tapping the notification should land in the app, e.g. "nutrition" or
     *              "fasting". Passed to MainActivity as an extra; the web layer reads it once
     *              at startup and navigates. Empty means "just open the app".
     * @param snoozeMinutes 0 disables the Snooze action. A snooze button on a reminder that
     *              cannot be acted on later (a weekly summary, say) is noise.
     */
    fun show(
        context: Context,
        id: String,
        title: String,
        body: String,
        route: String = "",
        snoozeMinutes: Int = 0,
        vibrate: Boolean = true,
        silent: Boolean = false
    ) {
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            // The deep link. MainActivity hands it to the web layer, which decides what the
            // route means -- Kotlin deliberately knows nothing about the app's screens.
            if (route.isNotEmpty()) putExtra("ignyt_route", route)
        }
        val contentPi = PendingIntent.getActivity(
            context, id.hashCode(), openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        /* Channel choice carries the sound and vibration settings. Android fixes those at
           channel creation and ignores per-notification requests from API 26 on, so a "silent"
           reminder has to be a DIFFERENT channel rather than a flag on the builder. */
        val channel = when {
            silent -> NotifyPlugin.CHANNEL_SILENT
            !vibrate -> NotifyPlugin.CHANNEL_NO_VIBRATE
            else -> NotifyPlugin.CHANNEL_ID
        }

        val builder = NotificationCompat.Builder(context, channel)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(contentPi)
            .setPriority(if (silent) NotificationCompat.PRIORITY_LOW else NotificationCompat.PRIORITY_DEFAULT)

        if (snoozeMinutes > 0) {
            val snoozeIntent = Intent(context, ReminderReceiver::class.java).apply {
                action = ACTION_SNOOZE
                putExtra("id", id)
                putExtra("title", title)
                putExtra("body", body)
                putExtra("route", route)
                putExtra("snoozeMinutes", snoozeMinutes)
                putExtra("vibrate", vibrate)
                putExtra("silent", silent)
            }
            val snoozePi = PendingIntent.getBroadcast(
                context, (id + ":snooze").hashCode(), snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, "Snooze ${snoozeMinutes}m", snoozePi)
        }

        try {
            // User can revoke the notification permission any time after a reminder was
            // scheduled -- NotificationManagerCompat.notify() then throws SecurityException
            // on API 33+ instead of just silently no-oping, so this must be caught.
            NotificationManagerCompat.from(context).notify(id.hashCode(), builder.build())
        } catch (e: SecurityException) { /* permission revoked since scheduling; nothing to do */ }
    }
}
