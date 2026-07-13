/* Home page module. It intentionally receives dependencies from app.js so the existing
   state and Health Connect behavior stay authoritative during incremental extraction. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  function healthValue(cache, path, fallback) {
    try { return path.split('.').reduce((value, key) => value == null ? null : value[key], cache) ?? fallback; }
    catch (_) { return fallback; }
  }

  window.IgnytPages.renderHome = function renderHome(ctx) {
    const { state, week, plannedDay, planPct, streak, targets, eaten, proteinToday,
      latestWeight, dayDone, dayTotal, greeting, displayW, wUnit, svg,
      renderAchievementCelebration, renderPRCelebration, renderHomeHealthFeed } = ctx;
    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);
    const sleepMinutes = healthValue(health, 'sleep.totalMinutes', null);
    const sleep = sleepMinutes == null ? 'Not synced' : `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m`;
    const workoutName = plannedDay ? plannedDay.session : 'Recovery day';
    const workoutDetail = plannedDay ? `${plannedDay.exercises.length} exercises · ${dayDone}/${dayTotal} complete` : 'Mobility, an easy walk, or complete rest.';
    const workoutAction = plannedDay ? (dayDone > 0 && dayDone < dayTotal ? 'Continue workout' : dayDone === dayTotal ? 'View completed day' : 'Start today’s workout') : 'View plan';

    return `
      <section class="premium-card premium-card--elevated home-hero">
        <div class="home-greeting">${greeting()}</div>
        <div class="home-name">${state.profile.name || 'Athlete'}</div>
        ${renderAchievementCelebration ? (state.lastUnlockedAchievements?.length ? renderAchievementCelebration() : '') : ''}
        ${renderPRCelebration ? (state.lastSessionPRs?.length ? renderPRCelebration() : '') : ''}
        <div class="home-goal">
          <div class="home-goal__ring">${planPct}%</div>
          <div>
            <div class="home-goal__title">Today’s goal</div>
            <div class="home-goal__detail">Week ${week.week} of 8 · ${week.phaseLabel.split(' — ')[0]}</div>
          </div>
        </div>
      </section>

      <div class="section-heading"><span class="section-heading__label">Today’s overview</span><span class="mono" style="color:var(--color-primary);font-weight:800;">${streak} day streak</span></div>
      <section class="home-metrics">
        <article class="premium-card metric-card"><div class="metric-card__label">Calories</div><div class="metric-card__value">${eaten}</div><div class="metric-card__detail">of ${targets.kcal} kcal</div></article>
        <article class="premium-card metric-card"><div class="metric-card__label">Protein</div><div class="metric-card__value">${proteinToday}g</div><div class="metric-card__detail">of ${Math.round(targets.protein)}g</div></article>
        <article class="premium-card metric-card"><div class="metric-card__label">Steps</div><div class="metric-card__value">${steps == null ? 'Not synced' : Number(steps).toLocaleString()}</div><div class="metric-card__detail">Health Connect</div></article>
        <article class="premium-card metric-card"><div class="metric-card__label">Sleep</div><div class="metric-card__value">${sleep}</div><div class="metric-card__detail">Latest Health Connect data</div></article>
      </section>

      <div class="section-heading"><span class="section-heading__label">Next workout</span><button class="btn btn-ghost" data-nav="plan" style="padding:5px 8px;font-size:12px;">Plan</button></div>
      <button class="premium-card home-next-workout" data-home-day="${plannedDay ? week.days.indexOf(plannedDay) : 0}" style="width:100%;border:none;color:var(--color-text-primary);text-align:left;">
        <span class="home-next-workout__icon">${svg('workout', 20)}</span><span class="home-next-workout__copy"><span class="home-next-workout__title">${workoutName}</span><span class="home-next-workout__detail">${workoutDetail}</span></span>
        <span style="margin-left:auto;color:var(--color-primary);font-size:var(--font-size-sm);font-weight:800;">${workoutAction}</span>
      </button>

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
