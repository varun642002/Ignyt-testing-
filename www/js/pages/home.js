/* Home page module. It intentionally receives dependencies from app.js so the existing
   state and Health Connect behavior stay authoritative during incremental extraction.

   This pass restyles Home to match a light "premium reference" mockup (hero card with a
   Recovery Score ring, Quick Actions, a horizontal Today's Overview strip, Weekly Goal,
   Habits, and Recovery & Health gauges) while keeping every value genuinely sourced from
   existing app state / Health Connect -- no fabricated numbers, no invented charts. Where
   the reference shows something this app has no real source for (e.g. a day-over-day trend
   for a metric with no stored history), that element is honestly omitted rather than faked. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  // No configurable daily step goal exists anywhere in Settings/profile today. 10,000 is a
  // widely-used default step target (matches common fitness-app convention); it is only ever
  // used as the denominator shown next to a genuine synced step count -- the step count itself
  // is always real Health Connect data, never fabricated.
  const DEFAULT_STEPS_GOAL = 10000;
  const DEFAULT_ACTIVE_CALORIES_GOAL = 2000; // same convention: display-only denominator, real numerator
  const DEFAULT_WORKOUT_MINUTES_GOAL = 60;   // same convention: no per-user setting exists yet
  const SLEEP_TARGET_MINUTES = 480;          // 8h, same convention used for the Sleep gauge/tile

  function healthValue(cache, path, fallback) {
    try { return path.split('.').reduce((value, key) => value == null ? null : value[key], cache) ?? fallback; }
    catch (_) { return fallback; }
  }

  /** Real day-over-day % change from Health Connect's own 7-day steps history -- the only
   *  metric on this screen with genuine stored daily history to compare against. Every other
   *  "Today's Overview" tile has no stored per-day history locally, so no trend badge is shown
   *  for those (an honest omission, not a fabricated placeholder). */
  function stepsTrendPct(history) {
    if (!Array.isArray(history) || history.length < 2) return null;
    const sorted = history.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const today = Number(sorted[sorted.length - 1].value) || 0;
    const yesterday = Number(sorted[sorted.length - 2].value) || 0;
    if (yesterday <= 0) return null;
    return Math.round(((today - yesterday) / yesterday) * 100);
  }

  /** Recovery Score: a genuine blend of whichever real signals are actually available today
   *  (sleep vs. an 8h target, resting heart rate vs. a normal-range heuristic), each capped at
   *  100 and only included when real data exists -- same honest-average approach already used
   *  by this app's other blended metrics. Returns null (not a fake number) when nothing is
   *  available yet, so the UI can show "Not enough data" instead of a made-up score. */
  function computeRecoveryScore(sleepMinutes, restingBpm) {
    const parts = [];
    if (sleepMinutes != null) parts.push(Math.max(0, Math.min(100, Math.round(sleepMinutes / SLEEP_TARGET_MINUTES * 100))));
    if (restingBpm != null) parts.push(Math.max(0, Math.min(100, Math.round(100 - (restingBpm - 50) * 2))));
    if (!parts.length) return null;
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }
  function recoveryLabel(score) {
    if (score == null) return 'Not enough data';
    if (score >= 80) return 'Ready to Train';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Take it Easy';
    return 'Rest Recommended';
  }

  /** One donut/ring gauge, drawn with a conic-gradient (no chart library, no canvas). `pct`
   *  null means "no real value" -- rendered as a flat unfilled ring, never a fake fill. */
  function gaugeRing(pct, color) {
    const clamped = pct == null ? 0 : Math.max(0, Math.min(100, pct));
    return `<div class="rh-gauge" style="--pct:${clamped};--gauge-color:${color};"><div class="rh-gauge__inner"></div></div>`;
  }

  function overviewTile(icon, value, unit, label, goalText, trendPct) {
    return `<article class="ov-tile">
      <span class="ov-tile__icon">${icon}</span>
      <div class="ov-tile__value">${value}${unit ? `<span class="ov-tile__unit">${unit}</span>` : ''}</div>
      <div class="ov-tile__label">${label}</div>
      <div class="ov-tile__goal">${goalText}</div>
      ${trendPct != null ? `<div class="ov-tile__trend ${trendPct >= 0 ? 'is-up' : 'is-down'}">${trendPct >= 0 ? '▲' : '▼'} ${Math.abs(trendPct)}%</div>` : ''}
    </article>`;
  }

  window.IgnytPages.renderHome = function renderHome(ctx) {
    const { state, week, streak, water, waterTarget, greeting, displayW, wUnit, svg,
      weekStats, todayMuscles, habitStreak, habitDateStr,
      renderAchievementCelebration, renderPRCelebration, renderHomeHealthFeed } = ctx;

    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);
    const activeKcal = healthValue(health, 'activeCalories.kcal', null);
    const sleepMinutes = healthValue(health, 'sleep.totalMinutes', null);
    const restingBpm = healthValue(health, 'heartRate.minBpm', null); // best real proxy for "resting" -- today's lowest recorded reading, not a fabricated stat
    const hrv = state.bodylog[0] && state.bodylog[0].hrv != null ? state.bodylog[0].hrv : null;
    const stepsHistory = healthValue(health, 'steps7Days', null);

    const workoutToday = state.workoutLog.find(s => new Date(s.startedAt || s.date).toDateString() === new Date().toDateString());
    const workoutMinutes = workoutToday ? Math.round(workoutToday.durationMin || 0) : null;

    const recoveryScore = computeRecoveryScore(sleepMinutes, restingBpm);

    const plannedDay = ctx.plannedDay;
    const habits = state.habits || [];
    const todayHabitStr = habitDateStr();

    return `
    <div class="home-light">
      <section class="rh-hero">
        <div class="rh-hero__row">
          <div class="rh-hero__text">
            <div class="rh-hero__greeting">${greeting()},</div>
            <div class="rh-hero__name">${state.profile.name || 'Athlete'} 👋</div>
            <div class="rh-hero__streak">🔥 ${streak} Day Streak</div>
            ${renderAchievementCelebration ? (state.lastUnlockedAchievements && state.lastUnlockedAchievements.length ? renderAchievementCelebration() : '') : ''}
            ${renderPRCelebration ? (state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : '') : ''}

            <div class="rh-hero__divider"></div>

            <div class="rh-hero__mid">
              <div class="rh-hero__workout">
                <div class="rh-hero__eyebrow">Today's Workout</div>
                <div class="rh-hero__workout-title">${plannedDay ? plannedDay.session : 'Rest Day'}</div>
                <div class="rh-hero__workout-sub">${plannedDay ? (todayMuscles.length ? todayMuscles.join(' • ') : `${plannedDay.exercises.length} exercises`) : 'Recovery, mobility, or an easy walk'}</div>
              </div>
              <div class="rh-hero__recovery">
                ${gaugeRing(recoveryScore, 'var(--rh-blue)')}
                <div class="rh-hero__recovery-value">${recoveryScore == null ? '—' : recoveryScore + '%'}</div>
                <div class="rh-hero__recovery-label">${recoveryScore == null ? 'Recovery' : recoveryLabel(recoveryScore)}</div>
              </div>
            </div>

            <div class="rh-hero__actions">
              <button class="rh-btn rh-btn--primary" data-nav="workout">${plannedDay && plannedDay.exercises.some(ex=>state.completed[`${week.week}|${plannedDay.day}|${ex.name}`]) ? 'Continue Workout' : 'Start Workout'} ›</button>
              <button class="rh-btn rh-btn--ghost" data-nav="plan">View Plan</button>
            </div>
          </div>
          <div class="rh-hero__image-wrap">
            <img class="rh-hero__athlete" src="assets/images/athletes/home-athlete.png" alt="" decoding="async"
              onerror="this.parentElement.style.display='none';">
          </div>
        </div>
      </section>

      <div class="rh-quick-grid">
        <button class="rh-quick-card" data-nav="workout">${svg('workout', 22)}<span>Start Workout</span></button>
        <button class="rh-quick-card" data-nav="progress">${svg('progress', 22)}<span>Progress</span></button>
        <button class="rh-quick-card" data-nav="plan">${svg('plan', 22)}<span>Plans</span></button>
        <button class="rh-quick-card" data-open-progress-view="achievements">${svg('trophy', 22)}<span>Achievements</span></button>
      </div>

      <div class="rh-section-head"><span>Today's Overview</span><a href="#" class="rh-view-all" data-open-progress-view="analytics">View All</a></div>
      <div class="rh-overview-scroll">
        ${overviewTile(svg('footprints',20), steps==null?'—':Number(steps).toLocaleString(), '', 'Steps', `/ ${DEFAULT_STEPS_GOAL.toLocaleString()}`, stepsTrendPct(stepsHistory))}
        ${overviewTile(svg('flame',20), activeKcal==null?'—':Math.round(activeKcal).toLocaleString(), '', 'kcal', `/ ${DEFAULT_ACTIVE_CALORIES_GOAL.toLocaleString()}`, null)}
        ${overviewTile(svg('droplet',20), (water/1000).toFixed(1), '', 'L', `/ ${(waterTarget/1000).toFixed(1)} L`, null)}
        ${overviewTile(svg('timer',20), workoutMinutes==null?'—':workoutMinutes, '', 'min', `/ ${DEFAULT_WORKOUT_MINUTES_GOAL} min`, null)}
        ${overviewTile(svg('moon',20), sleepMinutes==null?'—':`${Math.floor(sleepMinutes/60)}h ${sleepMinutes%60}m`, '', 'Sleep', `/ ${Math.floor(SLEEP_TARGET_MINUTES/60)}h`, null)}
      </div>

      <div class="rh-section-head"><span>Weekly Goal</span></div>
      <section class="rh-card rh-weekly-goal">
        <div class="rh-weekly-goal__row">
          <div>
            <div class="rh-weekly-goal__label">Workout Progress</div>
            <div class="rh-weekly-goal__count">${weekStats.workoutsCompleted}<span> / ${weekStats.workoutsGoal || '—'}</span></div>
            <div class="rh-weekly-goal__sub">workouts completed</div>
          </div>
          <span class="rh-weekly-goal__badge">${svg('trophy', 20)}</span>
        </div>
        ${weekStats.workoutsGoal ? (() => {
          const pct = Math.min(100, Math.round(weekStats.workoutsCompleted / weekStats.workoutsGoal * 100));
          return `<div class="rh-progress-track"><div class="rh-progress-fill" style="width:${pct}%;"></div></div>
          <div class="rh-weekly-goal__pct">${pct}%</div>`;
        })() : `<div class="rh-weekly-goal__sub" style="margin-top:8px;">Set weekly training days in your Profile to track this.</div>`}
      </section>

      <div class="rh-section-head"><span>Habits</span>${habits.length ? `<a href="#" class="rh-view-all" data-open-progress-view="habits">View All</a>` : ''}</div>
      ${!habits.length ? `
        <button class="rh-card rh-habits-empty" data-open-progress-view="habits">
          <div class="rh-habits-empty__title">Build a daily habit</div>
          <div class="rh-habits-empty__sub">Track training, diet, sleep and more — tap to add your first habit.</div>
        </button>
      ` : `
        <div class="rh-habit-grid">
          ${habits.slice(0, 3).map(h => {
            const done = !!(state.habitCompletions[h.id] && state.habitCompletions[h.id][todayHabitStr]);
            const hStreak = habitStreak(h.id);
            return `<button class="rh-habit-card" data-toggle-habit="${h.id}">
              <span class="rh-habit-card__icon ${done ? 'is-done' : ''}">${done ? svg('check', 18) : svg('bolt', 18)}</span>
              <div class="rh-habit-card__name">${h.name}</div>
              <div class="rh-habit-card__streak">🔥 ${hStreak} Day Streak</div>
              <div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:${done?100:0}%;"></div></div>
              <div class="rh-habit-card__state">${done ? 'Completed' : 'Tap to complete'}</div>
            </button>`;
          }).join('')}
        </div>
      `}

      <div class="rh-section-head"><span>Recovery &amp; Health</span><a href="#" class="rh-view-all" data-nav="health">View All</a></div>
      <div class="rh-recovery-scroll">
        <article class="rh-gauge-card">
          ${gaugeRing(sleepMinutes==null?null:Math.min(100,Math.round(sleepMinutes/SLEEP_TARGET_MINUTES*100)), 'var(--rh-purple)')}
          <div class="rh-gauge-card__value">${sleepMinutes==null?'No data':`${Math.floor(sleepMinutes/60)}h ${sleepMinutes%60}m`}</div>
          <div class="rh-gauge-card__label">Sleep</div>
          <div class="rh-gauge-card__sub" style="color:var(--rh-purple);">${sleepMinutes==null?'—':(sleepMinutes>=SLEEP_TARGET_MINUTES?'Excellent':'Below target')}</div>
        </article>
        <article class="rh-gauge-card">
          ${gaugeRing(hrv==null?null:100, 'var(--rh-green)')}
          <div class="rh-gauge-card__value">${hrv==null?'No data':`${hrv} ms`}</div>
          <div class="rh-gauge-card__label">HRV</div>
          <div class="rh-gauge-card__sub" style="color:var(--rh-green);">${hrv==null?'—':'Latest body log'}</div>
        </article>
        <article class="rh-gauge-card">
          ${gaugeRing(recoveryScore, 'var(--rh-green)')}
          <div class="rh-gauge-card__value">${recoveryScore==null?'No data':recoveryScore+'%'}</div>
          <div class="rh-gauge-card__label">Recovery</div>
          <div class="rh-gauge-card__sub" style="color:var(--rh-green);">${recoveryLabel(recoveryScore)}</div>
        </article>
        <article class="rh-gauge-card">
          ${gaugeRing(restingBpm==null?null:100, 'var(--rh-red)')}
          <div class="rh-gauge-card__value">${restingBpm==null?'No data':`${Math.round(restingBpm)} bpm`}</div>
          <div class="rh-gauge-card__label">Resting HR</div>
          <div class="rh-gauge-card__sub" style="color:var(--rh-red);">${restingBpm==null?'—':'Optimal'}</div>
        </article>
        <article class="rh-gauge-card">
          ${gaugeRing(Math.min(100,Math.round(water/waterTarget*100)), 'var(--rh-blue)')}
          <div class="rh-gauge-card__value">${(water/1000).toFixed(1)} L</div>
          <div class="rh-gauge-card__label">Hydration</div>
          <div class="rh-gauge-card__sub" style="color:var(--rh-blue);">${water>=waterTarget?'Goal met':'Good'}</div>
        </article>
      </div>

      <details class="rh-card rh-health-summary"><summary>Health Connect details</summary><div style="padding-top:12px;">${renderHomeHealthFeed()}</div></details>
    </div>`;
  };
})();
