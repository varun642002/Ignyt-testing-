package com.varun.ignyt.drivebackup

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.varun.ignyt.MainActivity

/** Fires on the scheduled daily/weekly/monthly cadence. Only shows a notification -- the
 *  actual backup runs in JS once the app is opened (see BackupReminderScheduler's header for
 *  why). Tapping the notification opens the app, which is exactly what's needed to trigger
 *  drive-backup.js's maybeRunScheduledBackup() at boot. */
class BackupReminderReceiver : BroadcastReceiver() {
    companion object { const val CHANNEL_ID = "ignyt_backup_reminders" }

    override fun onReceive(context: Context, intent: Intent) {
        val channel = NotificationChannel(CHANNEL_ID, "IGNYT Backup Reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Reminds you to open IGNYT so your scheduled Google Drive backup can run"
        }
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPi = PendingIntent.getActivity(
            context, 771002, openIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle("IGNYT Backup")
            .setContentText("Open IGNYT to run your scheduled Google Drive backup.")
            .setAutoCancel(true)
            .setContentIntent(contentPi)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(771002, notification)
        } catch (e: SecurityException) { /* notification permission revoked since scheduling */ }
    }
}
