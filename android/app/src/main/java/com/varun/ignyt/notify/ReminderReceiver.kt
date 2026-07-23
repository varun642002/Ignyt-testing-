package com.varun.ignyt.notify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fires when a scheduled reminder alarm goes off (app may be fully closed). */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val title = intent.getStringExtra("title") ?: "IGNYT"
        val body = intent.getStringExtra("body") ?: ""
        ReminderNotifier.show(context, id, title, body)
    }
}
