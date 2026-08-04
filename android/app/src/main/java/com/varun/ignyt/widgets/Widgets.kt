package com.varun.ignyt.widgets

import android.content.Context
import android.widget.RemoteViews
import com.varun.ignyt.R

/*  The ten widgets.

    Each one is small on purpose: the base class owns tap targets, the empty state and the
    drawing helpers, so a provider here is only "which fields, and what do they say when the
    number is missing".

    A NOTE ON MISSING DATA, which is most of the care in this file.
    Every widget can be asked to draw before its data exists — Health Connect not yet synced, no
    weigh-in logged, no goal set. The rule throughout is that absent data renders as a dash and
    a plain-language line, never as a zero and never as a fabricated number. A step counter
    showing "0" when it simply has not synced is worse than one showing "—": the first is wrong,
    the second is merely uninformative.
*/

/* ---------- 1. Health Score ------------------------------------------------------------- */
class ScoreWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_score
    override val destination = "home"
    override fun render(ctx: Context, v: RemoteViews) {
        val score = WidgetData.num(ctx, "score.today")
        val target = WidgetData.dbl(ctx, "score.target", 100.0).coerceAtLeast(1.0)
        trySetText(v, R.id.w_value, score?.let { trim(it, 0) } ?: "—")
        trySetText(v, R.id.w_label, WidgetData.str(ctx, "score.band", "IGNYT Score"))
        val streak = WidgetData.int(ctx, "streak.current", 0)
        trySetText(v, R.id.w_sub, if (streak > 0) "$streak day streak" else "Start your streak")
        trySetText(v, R.id.w_tasks, WidgetData.str(ctx, "score.tasks", ""))
        v.setImageViewBitmap(R.id.w_ring,
            ring(ctx, ((score ?: 0.0) / target).toFloat(), colour(ctx, R.color.widget_accent)))
        // Quick actions — each opens the screen that can actually do the thing.
        v.setOnClickPendingIntent(R.id.w_qa_workout, openApp(ctx, "workout"))
        v.setOnClickPendingIntent(R.id.w_qa_food, openApp(ctx, "nutrition"))
        v.setOnClickPendingIntent(R.id.w_qa_water, broadcast(ctx, WidgetActionReceiver.ADD_WATER, 250.0))
    }
}

/* ---------- 2. Workout ------------------------------------------------------------------- */
class WorkoutWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_workout
    override val destination = "workout"
    override fun render(ctx: Context, v: RemoteViews) {
        val title = WidgetData.str(ctx, "workout.title", "")
        val hasPlan = title.isNotEmpty() && title != "—"
        trySetText(v, R.id.w_value, if (hasPlan) title else "Rest day")
        trySetText(v, R.id.w_label, WidgetData.str(ctx, "workout.plan", "No plan yet"))
        val done = WidgetData.int(ctx, "workout.done", 0)
        val total = WidgetData.int(ctx, "workout.total", 0)
        trySetText(v, R.id.w_sub, when {
            !hasPlan -> "Nothing scheduled today"
            total <= 0 -> "Ready when you are"
            done >= total -> "All $total done — nice work"
            else -> "${total - done} of $total exercises left"
        })
        /* The button says what tapping it does. "Start" on a half-finished session is wrong —
           it reads as "discard and begin again", which is the one thing the user does not
           want after four sets. */
        trySetText(v, R.id.w_cta, if (WidgetData.bool(ctx, "workout.inProgress")) "Resume" else "Start")
        v.setOnClickPendingIntent(R.id.w_cta, openApp(ctx, "workout", "start"))
    }
}

/* ---------- 3. Weight -------------------------------------------------------------------- */
class WeightWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_weight
    override val destination = "progress"
    override fun render(ctx: Context, v: RemoteViews) {
        val unit = WidgetData.str(ctx, "weight.unit", "kg")
        val cur = WidgetData.num(ctx, "weight.current")
        val goal = WidgetData.num(ctx, "weight.goal")
        trySetText(v, R.id.w_value, cur?.let { trim(it) + unit } ?: "—")
        trySetText(v, R.id.w_label, goal?.let { "Goal ${trim(it)}$unit" } ?: "No goal set")

        val delta = WidgetData.num(ctx, "weight.weekDelta")
        trySetText(v, R.id.w_sub, when {
            delta == null -> "Log twice to see a trend"
            kotlin.math.abs(delta) < 0.05 -> "Steady this week"
            /* Direction, not judgement. Down is not automatically good — it depends on the
               goal, and this widget does not always know it. */
            delta < 0 -> "${trim(kotlin.math.abs(delta))}$unit down this week"
            else -> "${trim(delta)}$unit up this week"
        })
        val pct = WidgetData.num(ctx, "weight.progressPct") ?: 0.0
        v.setProgressBar(R.id.w_bar, 100, pct.toInt().coerceIn(0, 100), false)
    }
}

/* ---------- 4. Water --------------------------------------------------------------------- */
class WaterWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_water
    override val destination = "nutrition"
    override fun render(ctx: Context, v: RemoteViews) {
        val ml = WidgetData.dbl(ctx, "water.ml", 0.0)
        val goal = WidgetData.dbl(ctx, "water.goalMl", 2500.0).coerceAtLeast(1.0)
        trySetText(v, R.id.w_value, "${(ml / 1000.0).let { trim(it) }}L")
        trySetText(v, R.id.w_label, "of ${trim(goal / 1000.0)}L")
        val left = (goal - ml).coerceAtLeast(0.0)
        trySetText(v, R.id.w_sub, when {
            ml >= goal -> "Goal hit — +${WidgetData.int(ctx, "water.bonus", 0)} score"
            else -> "${trim(left / 1000.0)}L to go"
        })
        v.setProgressBar(R.id.w_bar, 100, ((ml / goal) * 100).toInt().coerceIn(0, 100), false)
        trySetText(v, R.id.w_cta, "+250ml")
        v.setOnClickPendingIntent(R.id.w_cta, broadcast(ctx, WidgetActionReceiver.ADD_WATER, 250.0))
    }
}

/* ---------- 5. Steps --------------------------------------------------------------------- */
class StepsWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_steps
    override val destination = "home"
    override fun render(ctx: Context, v: RemoteViews) {
        val steps = WidgetData.num(ctx, "steps.today")
        val goal = WidgetData.dbl(ctx, "steps.goal", 10000.0).coerceAtLeast(1.0)
        /* Explicitly distinguishes "not synced" from "you have not moved". Health Connect can
           be unlinked or simply not have run yet, and 0 would be a lie in both cases. */
        trySetText(v, R.id.w_value, steps?.let { String.format("%,d", it.toLong()) } ?: "—")
        trySetText(v, R.id.w_label, "of ${String.format("%,d", goal.toLong())}")
        trySetText(v, R.id.w_sub, when {
            steps == null -> "Not synced yet"
            steps >= goal -> "Goal hit"
            else -> "${String.format("%,d", (goal - steps).toLong())} to go"
        })
        v.setImageViewBitmap(R.id.w_ring,
            ring(ctx, ((steps ?: 0.0) / goal).toFloat(), colour(ctx, R.color.widget_green)))
    }
}

/* ---------- 6. Calories ------------------------------------------------------------------ */
class CaloriesWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_calories
    override val destination = "nutrition"
    override fun render(ctx: Context, v: RemoteViews) {
        val kcal = WidgetData.num(ctx, "macros.kcal")
        val target = WidgetData.num(ctx, "macros.kcalTarget")
        trySetText(v, R.id.w_value, kcal?.let { String.format("%,d", it.toLong()) } ?: "—")
        trySetText(v, R.id.w_label, target?.let { "of ${String.format("%,d", it.toLong())} kcal" } ?: "kcal today")
        trySetText(v, R.id.w_sub, if (kcal != null && target != null) {
            val left = target - kcal
            if (left >= 0) "${String.format("%,d", left.toLong())} left" else "${String.format("%,d", (-left).toLong())} over"
        } else "No target set")
        trySetText(v, R.id.w_p, "P ${WidgetData.num(ctx, "macros.protein")?.let { trim(it, 0) } ?: "—"}g")
        trySetText(v, R.id.w_c, "C ${WidgetData.num(ctx, "macros.carbs")?.let { trim(it, 0) } ?: "—"}g")
        trySetText(v, R.id.w_f, "F ${WidgetData.num(ctx, "macros.fat")?.let { trim(it, 0) } ?: "—"}g")
        if (kcal != null && target != null && target > 0)
            v.setProgressBar(R.id.w_bar, 100, ((kcal / target) * 100).toInt().coerceIn(0, 100), false)
    }
}

/* ---------- 7. Daily Motivation ---------------------------------------------------------- */
class MotivationWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_motivation
    override val destination = "home"
    override fun render(ctx: Context, v: RemoteViews) {
        trySetText(v, R.id.w_value, WidgetData.str(ctx, "motivation.quote", "Today is another chance."))
        trySetText(v, R.id.w_label, WidgetData.str(ctx, "motivation.date", ""))
        trySetText(v, R.id.w_sub, "")
    }
    /* No timer drives this. The app writes a quote keyed to the date on every open, and the
       daily alarm that already exists for reminders pokes the widget each morning. Adding a
       second scheduled wake-up purely to rotate a line of text would cost battery for
       something the user is not looking at at 6am. */
    override fun showEmptyState(ctx: Context, v: RemoteViews) {
        trySetText(v, R.id.w_value, "Open IGNYT to start your day.")
        trySetText(v, R.id.w_label, "")
    }
}

/* ---------- 8. Streak -------------------------------------------------------------------- */
class StreakWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_streak
    override val destination = "progress"
    override fun render(ctx: Context, v: RemoteViews) {
        val cur = WidgetData.int(ctx, "streak.current", 0)
        val best = WidgetData.int(ctx, "streak.best", 0)
        trySetText(v, R.id.w_value, cur.toString())
        trySetText(v, R.id.w_label, if (cur == 1) "day streak" else "day streak")
        trySetText(v, R.id.w_sub, "Best $best")
        /* Never shames a broken streak. The morning someone opens this on zero is the morning
           they are deciding whether to bother, and "you lost your streak" is the wrong thing
           to put in front of that decision. */
        trySetText(v, R.id.w_msg, when {
            cur == 0 -> "Today is day one."
            cur < best -> "$best is the record. Keep going."
            cur >= best && best > 0 -> "Your best ever. Keep it alive."
            else -> "Keep it alive."
        })
    }
}

/* ---------- 9. Sleep --------------------------------------------------------------------- */
class SleepWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_sleep
    override val destination = "progress"
    override fun render(ctx: Context, v: RemoteViews) {
        val hrs = WidgetData.num(ctx, "sleep.hours")
        trySetText(v, R.id.w_value, hrs?.let {
            val h = it.toInt(); val m = ((it - h) * 60).toInt()
            if (m > 0) "${h}h ${m}m" else "${h}h"
        } ?: "—")
        trySetText(v, R.id.w_label, WidgetData.str(ctx, "sleep.source", "Sleep"))
        val rec = WidgetData.num(ctx, "recovery.score")
        trySetText(v, R.id.w_sub, rec?.let { "Recovery ${trim(it, 0)}" } ?: "No recovery data")
        v.setImageViewBitmap(R.id.w_ring,
            ring(ctx, ((rec ?: 0.0) / 100.0).toFloat(), colour(ctx, R.color.widget_purple)))
    }
}

/* ---------- 10. AI Coach ----------------------------------------------------------------- */
class CoachWidget : IgnytWidget() {
    override val layoutId = R.layout.widget_coach
    override val destination = "workout"
    override fun render(ctx: Context, v: RemoteViews) {
        trySetText(v, R.id.w_value, WidgetData.str(ctx, "coach.headline", "Open IGNYT for today's plan"))
        trySetText(v, R.id.w_label, WidgetData.str(ctx, "coach.detail", ""))
        trySetText(v, R.id.w_sub, WidgetData.str(ctx, "coach.why", ""))
        trySetText(v, R.id.w_cta, "Start")
        v.setOnClickPendingIntent(R.id.w_cta, openApp(ctx, "workout", "start"))
    }
}
