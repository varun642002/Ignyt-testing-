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

  window.IgnytPages.renderHome = function renderHome(ctx) {
    const { state, week, streak, burned,
      latestWeight, water, waterTarget, greeting, displayW, wUnit, svg,
      renderAchievementCelebration, renderPRCelebration, renderHomeHealthFeed, renderHomeHabits } = ctx;
    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);
    const sleepMinutes = healthValue(health, 'sleep.totalMinutes', null);
    const sleep = sleepMinutes == null ? 'Not synced' : `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m`;
    const hrv = latestWeight && latestWeight.hrv != null ? `${latestWeight.hrv} ms` : 'No data';

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
      <section class="premium-card home-steps-card">
        <span class="home-steps-card__icon">${svg('progress',22)}</span>
        <div class="home-steps-card__body">
          <div class="home-steps-card__value">${steps == null ? 'Not synced' : `${Number(steps).toLocaleString()}<span class="home-steps-card__goal"> / ${DEFAULT_STEPS_GOAL.toLocaleString()}</span>`}</div>
          <div class="home-steps-card__label">Steps${steps == null ? '' : ' today'}</div>
          ${steps == null ? '' : `<div class="home-steps-card__bar"><span style="width:${Math.min(100, Math.round(Number(steps) / DEFAULT_STEPS_GOAL * 100))}%;"></span></div>`}
        </div>
      </section>

      ${renderHomeHabits ? renderHomeHabits() : ''}

      <div class="section-heading"><span class="section-heading__label">Recovery &amp; hydration</span></div>
      <section class="home-metrics">
        <article class="premium-card metric-card"><div class="metric-card__label">Sleep</div><div class="metric-card__value">${sleep}</div><div class="metric-card__detail">Health Connect</div></article>
        <article class="premium-card metric-card"><div class="metric-card__label">HRV</div><div class="metric-card__value">${hrv}</div><div class="metric-card__detail">Latest body log</div></article>
        <article class="premium-card metric-card"><div class="metric-card__label">Water</div><div class="metric-card__value">${(water/1000).toFixed(1)}L</div><div class="metric-card__detail">of ${(waterTarget/1000).toFixed(1)}L</div></article>
      </section>

      <div class="section-heading"><span class="section-heading__label">Quick actions</span></div>
      <section class="home-metrics">
        <button class="btn btn-secondary" data-nav="workout">${svg('workout',16)} Start workout</button>
        <button class="btn btn-secondary" data-nav="uploads">${svg('health',16)} Medical reports</button>
        <button class="btn btn-secondary" data-nav="body">${svg('body',16)} Log weight</button>
        <button class="btn btn-secondary" data-nav="progress">${svg('progress',16)} View progress</button>
      </section>

      <details class="premium-card home-health-summary"><summary>Health Connect details</summary><div style="padding-top:var(--space-sm);">${renderHomeHealthFeed()}</div></details>`;
  };
})();
