package com.varun.ignyt.drivebackup

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-arms the backup reminder alarm after a reboot -- AlarmManager alarms don't survive one. */
class BackupBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        BackupReminderScheduler.rearmIfNeeded(context)
    }
}
