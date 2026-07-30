package com.varun.ignyt.notify

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/** Arms/cancels the AlarmManager alarms behind a reminder id. Uses inexact alarms deliberately
 *  -- exact alarms need the user to separately grant "Alarms & reminders" on Android 12+
 *  (SCHEDULE_EXACT_ALARM), which is a heavy ask for a fitness nudge that's fine landing within
 *  a battery-friendly window rather than to the exact minute. Shared by NotifyPlugin (initial
 *  schedule) and BootReceiver (re-arm after reboot, since AlarmManager alarms don't survive
 *  one). */
object ReminderScheduler {

    /** Days are 0=Sunday..6=Saturday, matching JavaScript's Date.getDay(). */
    private const val WEEK_MS = AlarmManager.INTERVAL_DAY * 7

    /* One alarm per selected weekday, so each needs its own request code. Derived from the id
       and the day rather than a counter, so re-arming replaces the same alarm instead of
       stacking a second copy on top -- which is how an app ends up notifying twice. */
    private fun requestCode(id: String) = id.hashCode()
    private fun requestCode(id: String, day: Int) = (id + "#" + day).hashCode()

    private fun pendingIntent(
        context: Context, requestCode: Int, id: String, title: String, body: String,
        route: String, snoozeMinutes: Int, vibrate: Boolean, silent: Boolean
    ): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("title", title)
            putExtra("body", body)
            putExtra("route", route)
            putExtra("snoozeMinutes", snoozeMinutes)
            putExtra("vibrate", vibrate)
            putExtra("silent", silent)
        }
        return PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** Daily (or every N days) at a fixed time. */
    fun arm(context: Context, id: String, hour: Int, minute: Int, title: String, body: String, intervalDays: Int) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = pendingIntent(context, requestCode(id), id, title, body, "", 0, true, false)
        val intervalMs = AlarmManager.INTERVAL_DAY * intervalDays.coerceAtLeast(1)
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, nextTrigger(hour, minute), intervalMs, pi)
    }

    /**
     * Weekly on specific days, which is what "weekdays", "weekends" and "custom days" all
     * reduce to. Implemented as one weekly-repeating alarm PER DAY rather than a daily alarm
     * the receiver filters: a daily alarm would wake the device every morning only to decide
     * it has nothing to do, and the whole point of an inexact alarm is to not do that.
     *
     * @param days 0=Sunday..6=Saturday. Empty means never, and cancels instead.
     */
    fun armWeekly(
        context: Context, id: String, days: List<Int>, hour: Int, minute: Int,
        title: String, body: String, route: String, snoozeMinutes: Int,
        vibrate: Boolean, silent: Boolean
    ) {
        cancel(context, id)   // replace, never stack
        if (days.isEmpty()) return
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        days.distinct().filter { it in 0..6 }.forEach { day ->
            val pi = pendingIntent(context, requestCode(id, day), id, title, body,
                                   route, snoozeMinutes, vibrate, silent)
            am.setInexactRepeating(AlarmManager.RTC_WAKEUP, nextTriggerOnDay(day, hour, minute), WEEK_MS, pi)
        }
    }

    /**
     * One-shot alarm at an absolute time, for things that happen once and then are over -- a
     * fast's halfway point and its end, and the snooze re-arm. Uses set() rather than
     * setExact() for the same reason arm() uses inexact repeating: exact alarms need
     * SCHEDULE_EXACT_ALARM on Android 12+, which is a heavy permission ask for a nudge that is
     * fine landing within a battery-friendly window.
     */
    fun armOnce(
        context: Context, id: String, atMillis: Long, title: String, body: String,
        route: String = "", snoozeMinutes: Int = 0, vibrate: Boolean = true, silent: Boolean = false
    ) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        // A time already past would fire immediately, which for a reminder means a
        // notification about something that has already happened.
        if (atMillis <= System.currentTimeMillis()) return
        val pi = pendingIntent(context, requestCode(id), id, title, body,
                               route, snoozeMinutes, vibrate, silent)
        am.set(AlarmManager.RTC_WAKEUP, atMillis, pi)
    }

    /** Cancels the daily alarm AND all seven possible weekly ones, because the caller does not
     *  necessarily know which shape this id was armed with. Cancelling an alarm that was never
     *  set is free. */
    fun cancel(context: Context, id: String) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(pendingIntent(context, requestCode(id), id, "", "", "", 0, true, false))
        for (day in 0..6) {
            am.cancel(pendingIntent(context, requestCode(id, day), id, "", "", "", 0, true, false))
        }
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

    /** @param day 0=Sunday..6=Saturday (JS convention); Calendar uses 1=Sunday. */
    private fun nextTriggerOnDay(day: Int, hour: Int, minute: Int): Long {
        val cal = Calendar.getInstance()
        val now = cal.timeInMillis
        cal.set(Calendar.HOUR_OF_DAY, hour)
        cal.set(Calendar.MINUTE, minute)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val target = day + 1
        var delta = target - cal.get(Calendar.DAY_OF_WEEK)
        if (delta < 0) delta += 7
        cal.add(Calendar.DAY_OF_YEAR, delta)
        // Same weekday but the time has already gone: next occurrence is a week out.
        if (cal.timeInMillis <= now) cal.add(Calendar.DAY_OF_YEAR, 7)
        return cal.timeInMillis
    }
}
