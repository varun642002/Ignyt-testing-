/* Home page module. It receives its dependencies from app.js so the existing state and Health
   Connect behaviour stay authoritative.

   THIS PASS: minimal. The reference is a summary screen — a title, a date, one rings card, and
   a grid of small tiles that are almost entirely number. What Home carried before was a
   greeting, a quote of the day, an XP bar, two chips, a weekly ring, a goal-projection card
   with five figures and a sentence, the score block with a coach line and four mini stats, four
   summary tiles, a fasting card, habits, a nutrition breakdown with three macro bars, a
   motivation line, a weekly challenge, three daily challenges and six quick actions. Every one
   of those still exists on its own screen; none of them were deleted, they were moved off the
   front page. Home's job here is "where am I today", answered in one screenful with as few
   words as possible.

   NOTHING IS INVENTED. A tile renders a number only where a real one exists, and an em dash
   where it does not — steps read "—" without Health Connect rather than 0, and the sparkline
   under a tile is drawn only for the two series the app genuinely holds day by day (calories
   from the food log, training volume from the workout log). Steps have no stored history, so
   that tile has no chart rather than a decorative one. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  const DEFAULT_STEPS_GOAL = 10000;      // no configurable step goal exists yet
  const DEFAULT_WORKOUT_MINUTES_GOAL = 60;

  function healthValue(cache, path, fallback) {
    try { return path.split('.').reduce((value, key) => value == null ? null : value[key], cache) ?? fallback; }
    catch (_) { return fallback; }
  }

  /* One arc of the gauge — a half circle, drawn left to right across the top.
     Path length is exactly pi*r, so stroke-dasharray takes that and stroke-dashoffset the
     unfilled remainder; no rotate() is needed because the path already starts where the fill
     should. The track is the same arc at low opacity, which is what makes an empty gauge read
     as "not done" rather than "not there". Capped at 100%: an arc that runs past its own end
     cap looks like a rendering fault, not an overachievement. */
  function arc(r, pct, color) {
    const L = Math.PI * r;
    const p = Math.max(0, Math.min(1, pct || 0));
    const d = `M ${60 - r} 62 A ${r} ${r} 0 0 1 ${60 + r} 62`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity=".16" stroke-width="10" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - p)).toFixed(1)}"/>`;
  }

  /* A seven-bar chart of real daily values. Returns "" for an empty series rather than a row
     of zero-height bars, which reads as a broken chart instead of an absent one. */
  function spark(series, color) {
    if (!series || !series.length || !series.some(v => v > 0)) return '';
    const max = Math.max(...series);
    return `<div class="hm2__spark" aria-hidden="true">${series.map(v =>
      `<i style="height:${max > 0 ? Math.max(3, Math.round(v / max * 100)) : 3}%;background:${color};"></i>`
    ).join('')}</div>`;
  }

  window.IgnytPages.renderHome = function renderHome(ctx) {
    /* Calories and water are off this screen now, so their ctx values are no longer pulled in
       — app.js still passes them, and Nutrition still uses them; Home simply stopped asking. */
    const { state, streak, displayW, wUnit, svg,
            renderAchievementCelebration, renderPRCelebration } = ctx;

    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);

    const key = (typeof dayKey === 'function') ? dayKey : (d) => new Date(d || Date.now()).toISOString().slice(0, 10);
    const today = key();

    const todayWorkouts = state.workoutLog.filter(s => key(s.startedAt || s.date) === today);
    const trainedMin = todayWorkouts.reduce((a, s) => a + (Number(s.durationMin) || 0), 0);

    const score = (() => {
      try { return window.IgnytScore ? window.IgnytScore.summary(state).today.score : null; } catch (_) { return null; }
    })();

    /* The gauge: steps, score, training. Calories and water are off it — food and hydration
       have their own screens and the point here is the three things that say whether today
       moved.

       160 is the score's own ceiling, the same denominator IgnytScore's ring uses; picking a
       rounder 100 would show a full arc for a day that is not actually complete.

       A missing input gives a flat arc, not a full one: steps read null without Health
       Connect, and null/goal would otherwise draw as zero anyway — but stating it means a
       later change to the fallback cannot quietly fill the gauge with a number nobody has. */
    const rings = [
      { label: 'Steps',       color: '#BF5AF2', now: steps == null ? null : Number(steps), goal: DEFAULT_STEPS_GOAL, unit: '' },
      { label: 'IGNYT Score', color: '#30D158', now: score,                                goal: 160,               unit: '' },
      { label: 'Training',    color: '#8CE01F', now: trainedMin,                           goal: DEFAULT_WORKOUT_MINUTES_GOAL, unit: 'min' }
    ];

    // Seven days of training volume, oldest first, straight from the log. The calorie series
    // went with the calorie tile.
    const days7 = Array.from({ length: 7 }, (_, i) => key(Date.now() - (6 - i) * 86400000));
    const volSeries = days7.map(d => state.workoutLog.reduce((a, s) => a + (s && key(s.startedAt || s.date) === d ? Number(s.volume) || 0 : 0), 0));

    const latestWeight = state.bodylog.find(b => b && Number(b.weight) > 0);

    /* Weight now answers three things instead of one: where you are, where you are going, and
       how long is left. All three come from the Smart Goal Engine, the same module the Log
       Weight screen and Goals already use — target and completion date are the goal's own, not
       recomputed here, so the three screens cannot disagree.

       With no active goal there is no target and no deadline to show, and the card says so
       rather than inventing a date. */
    const goals = window.IgnytGoals;
    const activeGoal = goals ? goals.activeGoal() : null;
    const goalCompute = (activeGoal && goals) ? goals.compute(activeGoal) : null;
    const daysLeft = (goalCompute && goalCompute.completion)
      ? Math.max(0, Math.round((new Date(goalCompute.completion) - new Date()) / 86400000))
      : null;
    const lastSession = state.workoutLog[0] || null;
    const lastAward = state.achievements.length ? state.achievements[state.achievements.length - 1] : null;
    const awardDef = lastAward && typeof ACHIEVEMENT_DEFS !== 'undefined'
      ? ACHIEVEMENT_DEFS.find(d => d.id === lastAward.id) : null;

    const dateLine = new Date().toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'short' });

    /* A tile: title, the number, and nothing else unless there is something true to add.
       `sub` is the one line of context allowed — a goal, a date, a unit. */
    const tile = (title, nav, value, color, sub, chart) => `
      <button class="hm2__tile" ${nav}>
        <span class="hm2__tiletop">${title}<span class="hm2__chev">${svg('chevronDown', 14)}</span></span>
        <span class="hm2__big" style="color:${color};">${value}</span>
        ${sub ? `<span class="hm2__sub">${sub}</span>` : ''}
        ${chart || ''}
      </button>`;

    return `
    <div class="home-light hm2">
      ${renderAchievementCelebration ? (state.lastUnlockedAchievements && state.lastUnlockedAchievements.length ? renderAchievementCelebration() : '') : ''}
      ${renderPRCelebration ? (state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : '') : ''}

      <header class="hm2__head">
        <h1 class="hm2__title">Summary</h1>
        <div class="hm2__date">${dateLine}</div>
      </header>

      <section class="hm2__card hm2__gauge">
        <div class="hm2__arcwrap">
          <svg viewBox="0 0 120 72" aria-hidden="true">
            ${arc(52, rings[0].goal ? rings[0].now / rings[0].goal : 0, rings[0].color)}
            ${arc(38, rings[1].goal ? rings[1].now / rings[1].goal : 0, rings[1].color)}
            ${arc(24, rings[2].goal ? rings[2].now / rings[2].goal : 0, rings[2].color)}
          </svg>
        </div>
        <div class="hm2__legend">
          ${rings.map(r => `<div class="hm2__leg">
            <span class="hm2__legname" style="color:${r.color};">${r.label}</span>
            <span class="hm2__legval">${r.now == null ? '—' : r.now.toLocaleString()}<em>/${r.goal.toLocaleString()}${r.unit ? ' ' + r.unit : ''}</em></span>
          </div>`).join('')}
        </div>
      </section>

      ${/* Weight, full width because it carries three figures. Target and days-left appear only
            when a goal exists — an em dash under "Target" is honest, an invented one is not. */''}
      <button class="hm2__card hm2__weight" data-nav="body">
        <span class="hm2__tiletop">Weight<span class="hm2__chev">${svg('chevronDown', 14)}</span></span>
        <span class="hm2__wrow">
          <span class="hm2__wcell">
            <b style="color:#0A84FF;">${latestWeight ? displayW(Number(latestWeight.weight)) : '—'}</b>
            <em>Current${latestWeight ? ' · ' + wUnit() : ''}</em>
          </span>
          <span class="hm2__wcell">
            <b>${activeGoal ? displayW(activeGoal.targetWeight) : '—'}</b>
            <em>Target${activeGoal ? ' · ' + wUnit() : ''}</em>
          </span>
          <span class="hm2__wcell">
            <b>${daysLeft != null ? daysLeft : '—'}</b>
            <em>${daysLeft != null ? 'Days left' : 'No goal set'}</em>
          </span>
        </span>
      </button>

      <div class="hm2__grid">
        ${/* Sessions logged in the last seven days, not the plan day's tick count. The gauge
              above already answers "how long did I train today"; repeating it here in a
              different unit made the two look like they disagreed (0/5 beside 35 min). */
          tile('Sessions', 'data-nav="workout"',
          String(volSeries.filter(v => v > 0).length), '#8CE01F',
          lastSession ? new Date(lastSession.startedAt || lastSession.date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : 'None yet',
          spark(volSeries, '#8CE01F'))}

        <button class="hm2__tile hm2__tile--award" data-open-progress-view="achievements">
          <span class="hm2__tiletop">Awards<span class="hm2__chev">${svg('chevronDown', 14)}</span></span>
          ${awardDef && typeof achievementBadgeSvg === 'function'
            ? `<span class="hm2__badge">${achievementBadgeSvg(awardDef, true)}</span>
               <span class="hm2__sub">${escHtml(awardDef.name)}</span>`
            : `<span class="hm2__big" style="color:var(--rh-muted);">—</span>
               <span class="hm2__sub">${state.achievements.length ? state.achievements.length + ' earned' : 'None yet'}</span>`}
        </button>
      </div>
    </div>`;
  };
})();
