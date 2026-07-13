/* Home page module. It intentionally receives dependencies from app.js so the existing
   state and Health Connect behavior stay authoritative during incremental extraction. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  // No configurable daily step goal exists anywhere in Settings/profile today. 10,000 is a
  // widely-used default step target (matches common fitness-app convention); it is only ever
  // used as the denominator shown next to a genuine synced step count -- the step count itself
  // is always real Health Connect data, never fabricated.
  const DEFAULT_STEPS_GOAL = 10000;

  function healthValue(cache, path, fallback) {
    try { return path.split('.').reduce((value, key) => value == null ? null : value[key], cache) ?? fallback; }
    catch (_) { return fallback; }
  }

  /* Today's Progress ring: the average of whichever of {calorie adherence, protein progress,
     step progress} are genuinely available today, each capped at 100%. Calorie/protein targets
     always exist (macroTargets() falls back to profile defaults), so those two are always
     included; steps is included only when Health Connect has actually synced a value today.
     Nothing here is fabricated -- an unsynced metric is simply left out of the average rather
     than assumed. */
  function computeTodayProgress(eaten, proteinToday, targets, steps) {
    const parts = [];
    if (targets.kcal > 0) parts.push(Math.min(100, Math.round((eaten / targets.kcal) * 100)));
    if (targets.protein > 0) parts.push(Math.min(100, Math.round((proteinToday / targets.protein) * 100)));
    if (steps != null) parts.push(Math.min(100, Math.round((steps / DEFAULT_STEPS_GOAL) * 100)));
    if (!parts.length) return null;
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  window.IgnytPages.renderHome = function renderHome(ctx) {
    const { state, week, plannedDay, streak, targets, eaten, proteinToday,
      latestWeight, water, waterTarget, dayDone, dayTotal, greeting, displayW, wUnit, svg,
      renderAchievementCelebration, renderPRCelebration, renderHomeHealthFeed } = ctx;
    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);
    const sleepMinutes = healthValue(health, 'sleep.totalMinutes', null);
    const sleep = sleepMinutes == null ? 'Not synced' : `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m`;
    const hrv = latestWeight && latestWeight.hrv != null ? `${latestWeight.hrv} ms` : 'No data';
    const todayProgress = computeTodayProgress(eaten, proteinToday, targets, steps);
    const workoutName = plannedDay ? plannedDay.session : 'Recovery day';
    const workoutDetail = plannedDay ? `${plannedDay.exercises.length} exercises · ${dayDone}/${dayTotal} complete` : 'Mobility, an easy walk, or complete rest.';
    const workoutAction = plannedDay ? (dayDone > 0 && dayDone < dayTotal ? 'Continue workout' : dayDone === dayTotal ? 'View completed day' : 'Start today’s workout') : 'View plan';

    return `
      <section class="premium-card premium-card--elevated home-hero">
        <div class="home-hero__row">
          <div class="home-hero__text">
            <div class="home-greeting">${greeting()}</div>
            <div class="home-name">${state.profile.name || 'Athlete'}</div>
            <div class="mono" style="margin-top:2px;color:var(--color-primary);font-weight:800;font-size:var(--font-size-sm);">🔥 ${streak} day streak</div>
            ${renderAchievementCelebration ? (state.lastUnlockedAchievements?.length ? renderAchievementCelebration() : '') : ''}
            ${renderPRCelebration ? (state.lastSessionPRs?.length ? renderPRCelebration() : '') : ''}
          </div>
          <div class="home-hero__image-wrap">
            <div class="home-hero__scrim"></div>
            <img class="home-hero__athlete" src="assets/images/athletes/home-athlete.png" alt="" decoding="async"
              onerror="this.parentElement.style.display='none';">
          </div>
        </div>
      </section>

      <div class="section-heading"><span class="section-heading__label">Today’s Progress</span><span style="color:var(--color-text-secondary);font-size:var(--font-size-xs);">Week ${week.week} of 8 · ${week.phaseLabel.split(' — ')[0]}</span></div>
      <section class="premium-card home-progress-card">
        <div class="home-progress-ring" style="--pct:${todayProgress == null ? 0 : todayProgress};">
          <div class="home-progress-ring__inner">
            <div class="home-progress-ring__value">${todayProgress == null ? '–' : todayProgress + '%'}</div>
            <div class="home-progress-ring__label">Goal</div>
          </div>
        </div>
        <div class="home-progress-stats">
          <div class="home-progress-stat"><span class="home-progress-stat__icon">${svg('nutrition',15)}</span><div><div class="home-progress-stat__value">${eaten} <span>/ ${targets.kcal} kcal</span></div><div class="home-progress-stat__label">Calories</div></div></div>
          <div class="home-progress-stat"><span class="home-progress-stat__icon">${svg('body',15)}</span><div><div class="home-progress-stat__value">${proteinToday} <span>/ ${Math.round(targets.protein)} g</span></div><div class="home-progress-stat__label">Protein</div></div></div>
          <div class="home-progress-stat"><span class="home-progress-stat__icon">${svg('progress',15)}</span><div><div class="home-progress-stat__value">${steps == null ? 'Not synced' : `${Number(steps).toLocaleString()} <span>/ ${DEFAULT_STEPS_GOAL.toLocaleString()}</span>`}</div><div class="home-progress-stat__label">Steps</div></div></div>
        </div>
      </section>

      <div class="section-heading"><span class="section-heading__label">Next workout</span><button class="btn btn-ghost" data-nav="plan" style="padding:5px 8px;font-size:12px;">Plan</button></div>
      <button class="premium-card home-next-workout" data-home-day="${plannedDay ? week.days.indexOf(plannedDay) : 0}" style="width:100%;border:none;color:var(--color-text-primary);text-align:left;">
        <span class="home-next-workout__icon">${svg('workout', 20)}</span><span class="home-next-workout__copy"><span class="home-next-workout__title">${workoutName}</span><span class="home-next-workout__detail">${workoutDetail}</span></span>
        <span style="margin-left:auto;color:var(--color-primary);font-size:var(--font-size-sm);font-weight:800;">${workoutAction}</span>
      </button>

      <div class="section-heading"><span class="section-heading__label">Recovery &amp; hydration</span></div>
      <section class="home-metrics">
        <article class="premium-card metric-card"><div class="metric-card__label">Sleep</div><div class="metric-card__value">${sleep}</div><div class="metric-card__detail">Health Connect</div></article>
        <article class="premium-card metric-card"><div class="metric-card__label">HRV</div><div class="metric-card__value">${hrv}</div><div class="metric-card__detail">Latest body log</div></article>
        <article class="premium-card metric-card"><div class="metric-card__label">Water</div><div class="metric-card__value">${(water/1000).toFixed(1)}L</div><div class="metric-card__detail">of ${(waterTarget/1000).toFixed(1)}L</div></article>
      </section>

      <div class="section-heading"><span class="section-heading__label">Quick actions</span></div>
      <section class="home-metrics">
        <button class="btn btn-secondary" data-nav="workout">${svg('workout',16)} Start workout</button>
        <button class="btn btn-secondary" data-nav="nutrition">${svg('nutrition',16)} Log food</button>
        <button class="btn btn-secondary" data-nav="body">${svg('body',16)} Log weight</button>
        <button class="btn btn-secondary" data-nav="progress">${svg('progress',16)} View progress</button>
      </section>

      <details class="premium-card home-health-summary"><summary>Health Connect details</summary><div style="padding-top:var(--space-sm);">${renderHomeHealthFeed()}</div></details>`;
  };
})();
