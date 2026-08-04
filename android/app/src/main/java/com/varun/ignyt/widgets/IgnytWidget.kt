package com.varun.ignyt.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.os.Build
import android.widget.RemoteViews
import com.varun.ignyt.MainActivity
import com.varun.ignyt.R

/**
 * Shared behaviour for all ten widgets.
 *
 * Each subclass supplies a layout and fills it. Everything common — tap targets, the empty
 * state, progress rings, colour resolution — lives here so ten widgets cannot drift into ten
 * slightly different treatments of the same problem.
 */
abstract class IgnytWidget : AppWidgetProvider() {

    abstract val layoutId: Int

    /** Where a tap should land, e.g. "home", "workout", "nutrition". */
    abstract val destination: String

    abstract fun render(ctx: Context, views: RemoteViews)

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { id ->
            val views = RemoteViews(ctx.packageName, layoutId)
            try {
                if (WidgetData.isEmpty(ctx)) {
                    /* Never render zeroes before the app has ever pushed. "0 steps" and "we
                       have not synced yet" are different facts, and a widget that shows the
                       first when it means the second is lying on the user's home screen. */
                    showEmptyState(ctx, views)
                } else {
                    render(ctx, views)
                }
                views.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, destination))
            } catch (e: Exception) {
                /* An exception here renders Android's own "Problem loading widget" — a dead
                   grey box with no retry. Falling back to the empty state at least keeps a
                   tappable surface that opens the app. */
                try { showEmptyState(ctx, views) } catch (ignored: Exception) { }
            }
            try { mgr.updateAppWidget(id, views) } catch (e: Exception) { }
        }
    }

    protected open fun showEmptyState(ctx: Context, views: RemoteViews) {
        trySetText(views, R.id.w_value, "—")
        trySetText(views, R.id.w_label, ctx.getString(R.string.widget_open_app))
        trySetText(views, R.id.w_sub, "")
    }

    /* ---- tap targets --------------------------------------------------------------------- */

    /**
     * Opens IGNYT on the relevant screen.
     *
     * singleTop + CLEAR_TOP so tapping a widget while the app is already open switches tabs
     * rather than stacking a second copy of the activity. The extra is read by MainActivity and
     * handed to JS, which does the actual navigation — the WebView owns routing, not this.
     */
    protected fun openApp(ctx: Context, dest: String, extra: String? = null): PendingIntent {
        val intent = Intent(ctx, MainActivity::class.java).apply {
            action = "com.varun.ignyt.WIDGET_OPEN"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("ignyt_widget_dest", dest)
            if (extra != null) putExtra("ignyt_widget_action", extra)
            /* Distinct data per destination. Without it Android treats these as the same
               PendingIntent and every widget opens whichever screen was registered first —
               a genuinely baffling bug to debug from the outside. */
            data = android.net.Uri.parse("ignyt://widget/$dest/${extra ?: ""}")
        }
        return PendingIntent.getActivity(ctx, dest.hashCode(), intent, pendingFlags())
    }

    protected fun broadcast(ctx: Context, action: String, amount: Double = 0.0): PendingIntent {
        val intent = Intent(ctx, WidgetActionReceiver::class.java).apply {
            this.action = action
            putExtra("amount", amount)
            data = android.net.Uri.parse("ignyt://action/$action/$amount")
        }
        return PendingIntent.getBroadcast(ctx, action.hashCode(), intent, pendingFlags())
    }

    /** FLAG_IMMUTABLE is mandatory from API 31 and correct everywhere — nothing mutates these. */
    private fun pendingFlags(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else PendingIntent.FLAG_UPDATE_CURRENT

    /* ---- drawing ------------------------------------------------------------------------- */

    /**
     * A progress ring, drawn to a bitmap.
     *
     * RemoteViews cannot host a custom View, so a ring has to be rasterised and set as an
     * ImageView source. Deliberately small (dp-sized, not screen-sized): a RemoteViews payload
     * crosses a Binder transaction with a hard ~1MB limit shared by every widget on the screen,
     * and an oversized bitmap here fails as "Problem loading widget" on a crowded home screen
     * rather than anywhere near this code.
     */
    protected fun ring(ctx: Context, pct: Float, colour: Int, sizeDp: Int = 72): Bitmap {
        val d = ctx.resources.displayMetrics.density
        val size = (sizeDp * d).toInt().coerceIn(48, 220)
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val stroke = size * 0.11f
        val pad = stroke / 2f + 1f
        val rect = RectF(pad, pad, size - pad, size - pad)

        val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE; strokeWidth = stroke
            color = colour; alpha = 46            // same hue as the fill, not a grey — reads as one object
            strokeCap = Paint.Cap.ROUND
        }
        c.drawArc(rect, 0f, 360f, false, track)

        if (pct > 0f) {
            val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE; strokeWidth = stroke
                color = colour; strokeCap = Paint.Cap.ROUND
            }
            /* -90 starts the sweep at twelve o'clock. Clamped at 100% so an over-achieved goal
               does not wrap the ring back past its own start and read as 5% done. */
            c.drawArc(rect, -90f, 360f * pct.coerceIn(0f, 1f), false, fill)
        }
        return bmp
    }

    protected fun trySetText(views: RemoteViews, id: Int, text: CharSequence) {
        try { views.setTextViewText(id, text) } catch (e: Exception) { }
    }

    protected fun colour(ctx: Context, resId: Int): Int =
        try { ctx.resources.getColor(resId, ctx.theme) } catch (e: Exception) { 0xFF3E82F7.toInt() }

    /** Formats a number without a trailing ".0" — "78" reads better than "78.0" at widget size. */
    protected fun trim(v: Double, decimals: Int = 1): String {
        if (v == v.toLong().toDouble()) return v.toLong().toString()
        return String.format("%.${decimals}f", v)
    }

    companion object {
        /** Redraw one widget class from anywhere (e.g. the action receiver). */
        fun refresh(ctx: Context, cls: Class<out IgnytWidget>) {
            try {
                val mgr = AppWidgetManager.getInstance(ctx)
                val ids = mgr.getAppWidgetIds(ComponentName(ctx, cls))
                if (ids.isNotEmpty()) {
                    cls.getDeclaredConstructor().newInstance().onUpdate(ctx, mgr, ids)
                }
            } catch (e: Exception) { }
        }
    }
}
