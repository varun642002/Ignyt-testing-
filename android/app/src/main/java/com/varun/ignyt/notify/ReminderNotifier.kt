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
    fun show(context: Context, id: String, title: String, body: String) {
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPi = PendingIntent.getActivity(
            context, id.hashCode(), openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotifyPlugin.CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentPi)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        try {
            // User can revoke the notification permission any time after a reminder was
            // scheduled -- NotificationManagerCompat.notify() then throws SecurityException
            // on API 33+ instead of just silently no-oping, so this must be caught.
            NotificationManagerCompat.from(context).notify(id.hashCode(), notification)
        } catch (e: SecurityException) { /* permission revoked since scheduling; nothing to do */ }
    }
}
