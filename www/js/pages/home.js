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

  /* One ring. r is chosen per band so the three nest with a clear gap; the track is the same
     arc at low opacity, which is what makes an unfilled ring read as "not done" rather than
     "not there". Capped at 100% — a ring that overshoots its own circle looks like a bug. */
  function ring(r, pct, color) {
    const C = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(1, pct || 0));
    return `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-opacity=".18" stroke-width="11"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"
        stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - p)).toFixed(1)}"
        transform="rotate(-90 60 60)"/>`;
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
    const { state, streak, displayW, wUnit, svg, targets, eaten,
            water, waterTarget, dayDone, dayTotal,
            renderAchievementCelebration, renderPRCelebration } = ctx;

    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);

    const key = (typeof dayKey === 'function') ? dayKey : (d) => new Date(d || Date.now()).toISOString().slice(0, 10);
    const today = key();

    const todayWorkouts = state.workoutLog.filter(s => key(s.startedAt || s.date) === today);
    const trainedMin = todayWorkouts.reduce((a, s) => a + (Number(s.durationMin) || 0), 0);

    /* The three rings, from goals the app already holds. Not Apple's Move/Exercise/Stand:
       there is no stand data here and inventing one would be the one dishonest pixel on the
       screen. Water replaces it — it is tracked, it has a real target, and it belongs to the
       same "did I look after myself today" question the other two ask. */
    const rings = [
      { label: 'Calories', color: '#FA3C4C', now: Math.round(eaten), goal: Math.round(targets.kcal), unit: 'kcal' },
      { label: 'Training', color: '#8CE01F', now: trainedMin, goal: DEFAULT_WORKOUT_MINUTES_GOAL, unit: 'min' },
      { label: 'Water',    color: '#1AD5E0', now: Math.round(water), goal: Math.round(waterTarget), unit: 'ml' }
    ];

    // Seven-day series, oldest first. Both come straight from the logs.
    const days7 = Array.from({ length: 7 }, (_, i) => key(Date.now() - (6 - i) * 86400000));
    const kcalSeries = days7.map(d => state.foodLog.reduce((a, f) => a + (f && f.date === d ? Number(f.calories) || 0 : 0), 0));
    const volSeries  = days7.map(d => state.workoutLog.reduce((a, s) => a + (s && key(s.startedAt || s.date) === d ? Number(s.volume) || 0 : 0), 0));

    const score = (() => {
      try { return window.IgnytScore ? window.IgnytScore.summary(state).today.score : null; } catch (_) { return null; }
    })();

    const latestWeight = state.bodylog.find(b => b && Number(b.weight) > 0);
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

      <section class="hm2__card hm2__rings">
        <div class="hm2__ringwrap">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            ${ring(50, rings[0].goal ? rings[0].now / rings[0].goal : 0, rings[0].color)}
            ${ring(36, rings[1].goal ? rings[1].now / rings[1].goal : 0, rings[1].color)}
            ${ring(22, rings[2].goal ? rings[2].now / rings[2].goal : 0, rings[2].color)}
          </svg>
        </div>
        <div class="hm2__legend">
          ${rings.map(r => `<div class="hm2__leg">
            <span class="hm2__legname" style="color:${r.color};">${r.label}</span>
            <span class="hm2__legval">${r.now.toLocaleString()}<em>/${r.goal.toLocaleString()} ${r.unit}</em></span>
          </div>`).join('')}
        </div>
      </section>

      <div class="hm2__grid">
        ${tile('Steps', 'data-nav="health"',
          steps == null ? '—' : Number(steps).toLocaleString(), '#BF5AF2',
          steps == null ? 'Connect Health' : `of ${DEFAULT_STEPS_GOAL.toLocaleString()}`, '')}

        ${tile('IGNYT Score', 'data-open-progress-view="analytics"',
          score == null ? '—' : score, '#30D158',
          streak > 0 ? `${streak} day streak` : 'Today', '')}

        ${tile('Calories', 'data-nav="nutrition"',
          Math.round(eaten).toLocaleString(), '#FA3C4C',
          `of ${Math.round(targets.kcal).toLocaleString()}`, spark(kcalSeries, '#FA3C4C'))}

        ${tile('Weight', 'data-nav="body"',
          latestWeight ? displayW(Number(latestWeight.weight)) : '—', '#0A84FF',
          latestWeight ? wUnit() : 'Log your first', '')}

        ${/* Sessions logged in the last seven days, not the plan day's tick count. The rings
              above already answer "how long did I train today"; repeating it here in a
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
