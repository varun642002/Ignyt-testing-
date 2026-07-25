package com.varun.ignyt.drivebackup

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/**
 * Schedules a repeating "time for your IGNYT backup" reminder -- self-contained here (not
 * shared with the separate Notifications feature's AlarmManager scheduler, which lives on a
 * sibling, not-yet-merged branch). This alarm's ONLY job is to nudge the user to open the app;
 * the actual Drive upload runs in JS once the app is foregrounded (drive-backup.js's
 * maybeRunScheduledBackup(), called at boot), because a real Google Drive upload needs the
 * app's live localStorage data, which only the WebView can produce -- there is no reliable,
 * non-fragile way to read that from a plain background BroadcastReceiver in a Capacitor app
 * without either reverse-engineering the WebView's on-disk storage format or running a heavy,
 * intrusive foreground-service-hosted headless WebView. This is the same honest "runs when the
 * app is next opened, not literally at 2am while the phone sleeps" trade-off already documented
 * elsewhere in this app for Health Connect refresh and cloud sync.
 */
object BackupReminderScheduler {
    private const val REQUEST_CODE = 771001
    private const val DEFAULT_HOUR = 9
    const val PREFS = "ignyt_drive_backup_schedule_prefs"

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, BackupReminderReceiver::class.java)
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** frequency: "daily" | "weekly" | "monthly". Anything else (e.g. "manual") should call
     *  cancel() instead. */
    fun arm(context: Context, frequency: String) {
        val intervalDays = when (frequency) { "daily" -> 1; "weekly" -> 7; "monthly" -> 30; else -> return }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("frequency", frequency).apply()
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val cal = Calendar.getInstance()
        val now = cal.timeInMillis
        cal.set(Calendar.HOUR_OF_DAY, DEFAULT_HOUR); cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
        if (cal.timeInMillis <= now) cal.add(Calendar.DAY_OF_YEAR, 1)
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.timeInMillis, AlarmManager.INTERVAL_DAY * intervalDays, pendingIntent(context))
    }

    fun cancel(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove("frequency").apply()
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(pendingIntent(context))
    }

    /** Re-arms after a reboot (AlarmManager alarms don't survive one) using the persisted
     *  frequency, if any was set. */
    fun rearmIfNeeded(context: Context) {
        val freq = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("frequency", null)
        if (freq != null) arm(context, freq)
    }
}
