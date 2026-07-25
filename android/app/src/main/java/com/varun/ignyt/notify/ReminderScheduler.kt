package com.varun.ignyt.notify

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/** Arms/cancels the repeating AlarmManager alarm behind a reminder id. Uses inexact repeating
 *  alarms deliberately -- exact alarms need the user to separately grant "Alarms & reminders"
 *  on Android 12+ (SCHEDULE_EXACT_ALARM), which is a heavy ask for a fitness nudge that's fine
 *  landing within a battery-friendly window rather than to the exact minute. Shared by
 *  NotifyPlugin (initial schedule) and BootReceiver (re-arm after reboot, since AlarmManager
 *  alarms don't survive one). */
object ReminderScheduler {
    private fun requestCode(id: String) = id.hashCode()

    private fun pendingIntent(context: Context, id: String, title: String, body: String): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("body", body)
        }
        return PendingIntent.getBroadcast(
            context, requestCode(id), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun arm(context: Context, id: String, hour: Int, minute: Int, title: String, body: String, intervalDays: Int) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = pendingIntent(context, id, title, body)
        val trigger = nextTrigger(hour, minute)
        val intervalMs = AlarmManager.INTERVAL_DAY * intervalDays.coerceAtLeast(1)
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, trigger, intervalMs, pi)
    }

    fun cancel(context: Context, id: String) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(pendingIntent(context, id, "", ""))
    }

    private fun nextTrigger(hour: Int, minute: Int): Long {
        val cal = Calendar.getInstance()
        val now = cal.timeInMillis
        cal.set(Calendar.HOUR_OF_DAY, hour)
        cal.set(Calendar.MINUTE, minute)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        if (cal.timeInMillis <= now) cal.add(Calendar.DAY_OF_YEAR, 1)
        return cal.timeInMillis
    }
}
