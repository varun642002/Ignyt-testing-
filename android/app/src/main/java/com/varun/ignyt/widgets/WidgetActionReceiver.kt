package com.varun.ignyt.widgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Handles taps on a widget's own controls — currently "+250ml".
 *
 * THE HONEST LIMIT OF THIS, stated plainly because it shapes the design:
 * a widget runs in the launcher's process with no WebView, so it CANNOT write to localStorage,
 * which is where IGNYT's water log actually lives. There is no way for a home-screen tap to
 * log water directly. What it can do is:
 *
 *   1. queue the intent, and
 *   2. optimistically update the snapshot so the widget reflects the tap immediately.
 *
 * The app drains the queue on its next launch or resume and does the real logging. So the
 * number on the widget moves the instant you tap it, and the actual entry lands the next time
 * IGNYT runs. That gap is real and unavoidable without a foreground service, which would be a
 * wildly disproportionate cost for a water button.
 *
 * The alternative — doing nothing until the app opens — looks broken, and people tap a
 * seemingly-dead button repeatedly. Four queued taps then land at once and 1000ml appears from
 * nowhere. Optimistic display is what makes the queue comprehensible.
 */
class WidgetActionReceiver : BroadcastReceiver() {

    companion object {
        const val ADD_WATER = "com.varun.ignyt.widget.ADD_WATER"
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        try {
            when (intent.action) {
                ADD_WATER -> {
                    val ml = intent.getDoubleExtra("amount", 250.0)
                    WidgetData.queueAction(ctx, "water", ml)
                    WidgetData.bumpWater(ctx, ml)
                    /* Both widgets that show water redraw — the water widget for its own
                       number, the score widget because hydration feeds the score. */
                    IgnytWidget.refresh(ctx, WaterWidget::class.java)
                    IgnytWidget.refresh(ctx, ScoreWidget::class.java)
                }
            }
        } catch (e: Exception) {
            /* A broadcast receiver that throws crashes the launcher's binder call and the user
               sees IGNYT blamed for their home screen misbehaving. Never worth it for a tap. */
        }
    }
}
