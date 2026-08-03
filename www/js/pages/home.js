/* Home page module. It intentionally receives dependencies from app.js so the existing
   state and Health Connect behavior stay authoritative during incremental extraction.

   Layout: greeting, weight-goal progress, the summary gauge, then the fasting card, habits,
   nutrition, challenges and quick actions.

   The gauge replaced two blocks that overlapped -- the IGNYT Score card (ring, level, coach
   line, four mini stats) and the four-tile Today's Summary beneath it, which repeated steps
   and training a second time. Three arcs now carry steps, score and training minutes, and the
   score keeps its arc rather than its block. Every value is genuinely sourced from existing app
   state / Health Connect / the Smart Goal Engine (window.IgnytGoals) -- no fabricated numbers.
   Where the reference shows something this app has no real source for, that element is
   honestly omitted rather than faked. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  const DEFAULT_STEPS_GOAL = 10000; // no configurable step goal exists yet; display-only denominator, real numerator
  const DEFAULT_WORKOUT_MINUTES_GOAL = 60;

  function healthValue(cache, path, fallback) {
    try { return path.split('.').reduce((value, key) => value == null ? null : value[key], cache) ?? fallback; }
    catch (_) { return fallback; }
  }

  /* One arc of the summary gauge — a half circle drawn left to right across the top.
     The path length is exactly pi*r, so stroke-dasharray takes that and stroke-dashoffset the
     unfilled remainder; no rotate() is needed because the path already starts where the fill
     should begin. The track is the same arc at low opacity, which is what makes an empty gauge
     read as "not done yet" rather than "not there". Capped at 100%: an arc running past its own
     end cap looks like a rendering fault rather than an overachievement. */
  function gaugeArc(r, pct, color) {
    const L = Math.PI * r;
    const p = Math.max(0, Math.min(1, pct || 0));
    const d = `M ${60 - r} 62 A ${r} ${r} 0 0 1 ${60 + r} 62`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity=".16" stroke-width="10" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - p)).toFixed(1)}"/>`;
  }

  window.IgnytPages.renderHome = function renderHome(ctx) {
    const { state, week, streak, greeting, displayW, wUnit, svg,
      weekStats, targets, eaten, burned, plannedDay,
      water, waterTarget, nutritionToday,
      renderAchievementCelebration, renderPRCelebration, renderHomeHabits } = ctx;

    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);


    /* The summary gauge: steps, score, training minutes.
       Minutes are the SUM of everything logged today, not the first session found — two
       sessions in a day would otherwise show only the first, which is wrong in the direction
       that discourages. dayKey() is the app's local-calendar day; the fallback only matters if
       app.js somehow has not loaded, in which case Home has bigger problems. */
    const dkey = (typeof dayKey === 'function') ? dayKey : (d) => new Date(d || Date.now()).toISOString().slice(0, 10);
    const todayKey = dkey();
    const trainedMin = state.workoutLog.reduce((a, s) =>
      a + (s && dkey(s.startedAt || s.date) === todayKey ? Number(s.durationMin) || 0 : 0), 0);
    const scoreToday = (() => {
      try { return window.IgnytScore ? IgnytScore.summary(state).today.score : null; } catch (_) { return null; }
    })();
    /* IGNYT's own palette, not the reference's. These are the app's tokens rather than fixed
       hexes, so the card follows the theme instead of carrying a second set of colours that
       only look right on one ground.

       The IGNYT Score takes --accent, the brand orange. It is the app's own named metric and
       the one thing on this card that belongs to IGNYT rather than to a sensor, so it gets the
       colour the app is named in. Steps take the interactive blue and Training the success
       green -- the same pairing the rest of the app already uses for "a number from elsewhere"
       and "you finished something". */
    const gauge = [
      { label: 'Steps',       color: 'var(--rh-blue)',  now: steps == null ? null : Number(steps), goal: DEFAULT_STEPS_GOAL,           unit: '' },
      { label: 'IGNYT Score', color: 'var(--accent)',   now: scoreToday,                           goal: 160,                          unit: '' },
      { label: 'Training',    color: 'var(--rh-green)', now: trainedMin,                           goal: DEFAULT_WORKOUT_MINUTES_GOAL, unit: 'min' }
    ];

    const weeklyGoalPct = weekStats.workoutsGoal ? Math.min(100, Math.round(weekStats.workoutsCompleted / weekStats.workoutsGoal * 100)) : 0;

    /* One quote per day, chosen by date rather than at random — a line that changes every time
       the tab is re-rendered is noise, and Home re-renders constantly. */
    /* The daily line comes from js/motivation/messages.js. This used to be seven quotes held
       here, which meant the same one every Tuesday — a rotation short enough to notice is
       worse than none, because it makes the encouragement feel automated. The library is
       forty lines for this context alone and seeded by the date, so it is stable through the
       day and different tomorrow.

       The old list stays as a fallback. Home must render if a script fails to load, and an
       empty greeting card is a worse failure than a repeated quote. */
    const FALLBACK_QUOTES = [
      "Consistency creates results.",
      "The work you do today is tomorrow's baseline.",
      "Small sessions still count. Skipped ones do not.",
      "Progress is what happens between the days you feel like it.",
      "Train the habit and the shape follows.",
      "You do not have to be fresh. You have to turn up.",
      "The plan only works while you are on it."
    ];
    /* Before noon the line comes from the `morning` context, which is written for that hour --
       "Rest tonight, build tomorrow" reads oddly at 6am. Both are seeded by the date, so the
       line is stable through the morning and different tomorrow, and the two libraries share
       no lines, so the morning card and the daily card can never say the same thing. */
    const beforeNoon = new Date().getHours() < 12;
    const quoteOfDay = (window.IgnytMessages && IgnytMessages.forDay(beforeNoon ? "morning" : "daily"))
      || FALLBACK_QUOTES[Math.floor(Date.now() / 86400000) % FALLBACK_QUOTES.length];

    /* Nothing greets the app-open moment any more. A one-line banner lived here, then the
       full welcome card took the job, and now the card is gone too by request -- the app
       opens straight onto Home. If a greeting ever comes back, note the trap that caught the
       pair of them: both read and CLEARED the same hx_fresh_open flag, and Home renders
       first, so the banner consumed the flag and the card could never appear. One owner for
       one flag. */

    /* Consistency is measured, not asserted: how many of the last 28 days carry a workout or a
       food entry. Anything that only counted workouts would call a diligent rest week
       "inactive", which is both wrong and discouraging. */
    const consistency = (() => {
      const DAY = 86400000, now = Date.now();
      const active = new Set();
      for (const w of state.workoutLog) {
        const t = new Date(w.startedAt || w.date).getTime();
        if (now - t < 28 * DAY) active.add(new Date(t).toDateString());
      }
      for (const f of state.foodLog) {
        const t = new Date(f.date + 'T12:00:00').getTime();
        if (now - t < 28 * DAY) active.add(new Date(t).toDateString());
      }
      const pct = Math.round(active.size / 28 * 100);
      if (pct >= 80) return { label: 'Exceptional', icon: '🏆', tone: 'gold', pct };
      if (pct >= 60) return { label: 'Consistent', icon: '⭐', tone: 'good', pct };
      if (pct >= 35) return { label: 'Building', icon: '📈', tone: 'ok', pct };
      return { label: 'Getting started', icon: '🌱', tone: 'new', pct };
    })();


    // Real weight-goal projection from the Smart Goal Engine (same module already used by the
    // Log Weight screen) -- no goal invented here if the user hasn't set one.
    const goals = window.IgnytGoals;
    const activeGoal = goals ? goals.activeGoal() : null;
    const currentWeightKg = state.bodylog[0] ? Number(state.bodylog[0].weight) : (activeGoal ? activeGoal.startWeight : null);
    const goalCompute = activeGoal ? goals.compute(activeGoal) : null;

    /* BMI is no longer on Home. It lives on Log Weight, in a card that shows the figure with
       the healthy range for the user's height and the caveat that it cannot see muscle -- a
       screening ratio needs that context, and a bare number with the word "Obese" beside it on
       the front page was the version without any of it. */
    const goalPct = (activeGoal && goals && currentWeightKg != null) ? (goals.progressPct(activeGoal, currentWeightKg) || 0) : null;
    let daysLeft = null;
    if (goalCompute && goalCompute.completion) {
      daysLeft = Math.max(0, Math.round((new Date(goalCompute.completion) - new Date()) / 86400000));
    }

    const quickAction = (icon, color, label, attrs) => `<button class="rh-quick-card" style="padding:12px 4px;" ${attrs}>
      <span style="color:${color};">${svg(icon, 20)}</span><span>${label}</span>
    </button>`;

    return `
    <div class="home-light">
      ${renderAchievementCelebration ? (state.lastUnlockedAchievements && state.lastUnlockedAchievements.length ? renderAchievementCelebration() : '') : ''}
      ${renderPRCelebration ? (state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : '') : ''}

      <div class="pg-card hm-greet">
        <div class="hm-greet__left">
          <div class="hm-greet__hello">${greeting()}, ${state.profile.name || 'Athlete'} 👋</div>
          <div class="hm-greet__quote">${quoteOfDay}</div>
          ${window.IgnytXP ? (()=>{ const x = IgnytXP.progress(); return `
          <div class="hm-xp">
            <div class="hm-xp__row">
              <span class="hm-xp__level">Level ${x.level} &middot; ${x.title}</span>
              <span class="hm-xp__next">${x.toNext} XP to go</span>
            </div>
            <div class="hm-xp__track"><div class="hm-xp__fill" style="width:${x.percent}%;"></div></div>
          </div>`; })() : ''}
          <div class="hm-greet__chips">
            <span class="hm-chip hm-chip--streak">🔥 ${streak} day${streak === 1 ? '' : 's'}</span>
            <span class="hm-chip hm-chip--${consistency.tone}">${consistency.icon} ${consistency.label}</span>
          </div>
        </div>
        <div class="hm-greet__right">
          <div class="pg-ring" style="--pct:${weeklyGoalPct};--ring-color:var(--rh-blue);width:76px;height:76px;">
            <div class="pg-ring__inner" style="width:62px;height:62px;flex-direction:column;">
              <div style="font-size:17px;font-weight:800;">${weeklyGoalPct}%</div>
            </div>
          </div>
          <div class="hm-greet__ringlabel">Weekly Goal</div>
        </div>
      </div>

      ${activeGoal ? `
      <div class="rh-section-head" style="margin-top:16px;"><span>Goal Progress</span></div>
      ${/* ALIGNMENT.
            The two weight stats used a fixed 20px gap and took their natural widths, so
            "Current Weight" and "Goal Weight" started at whatever x their own content decided
            — the labels did not line up with each other or with anything below. They are equal
            flex halves now, which puts the second label on a predictable column and lets a long
            number ellipse instead of shoving the row.

            The Days Left column was flex:none and top-aligned against a taller neighbour, so it
            sat high with its rule running past it. It now stretches and centres its content, so
            the divider is full height and the figure sits against the middle of the bar.

            "1 kg per week" is gone. It was the only right-aligned thing in a left-aligned card,
            which is what made the bottom edge look unbalanced. */''}
      <div class="pg-card" style="display:flex;gap:14px;align-items:stretch;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;gap:12px;">
            <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;">
              <span class="tl-card__icon" style="width:32px;height:32px;flex:none;background:rgba(37,99,235,.1);color:var(--rh-blue);">${svg('scale', 16)}</span>
              <div style="min-width:0;"><div style="font-size:11px;color:var(--rh-muted);font-weight:600;">Current Weight</div><div style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${currentWeightKg != null ? displayW(currentWeightKg) : '—'} ${wUnit()}</div></div>
            </div>
            <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;">
              <span class="tl-card__icon" style="width:32px;height:32px;flex:none;background:rgba(22,163,74,.1);color:var(--rh-green);">${svg('target', 16)}</span>
              <div style="min-width:0;"><div style="font-size:11px;color:var(--rh-muted);font-weight:600;">Goal Weight</div><div style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${displayW(activeGoal.targetWeight)} ${wUnit()}</div></div>
            </div>
          </div>
          <div class="rh-progress-track"><div class="rh-progress-fill" style="width:${goalPct || 0}%;"></div></div>
          <div class="hm-goal__pct">${goalPct || 0}% of the way there</div>
        </div>
        ${daysLeft != null ? `<div style="flex:none;min-width:66px;border-left:1px solid var(--rh-border);padding-left:14px;text-align:center;display:flex;flex-direction:column;justify-content:center;">
          <div style="font-size:11px;color:var(--rh-blue);font-weight:700;">Days Left</div>
          ${/* The "days left" line that sat under the number said the heading again. */''}
          <div style="font-size:22px;font-weight:800;margin-top:2px;line-height:1.1;">${daysLeft}</div>
        </div>` : ''}
      </div>` : `
      <div class="rh-section-head" style="margin-top:16px;"><span>Goal Progress</span></div>
      <button class="pg-card" style="width:100%;text-align:left;background:none;border-style:dashed;cursor:pointer;" data-nav="goals">
        <div style="font-size:13px;font-weight:700;">Set your first goal</div>
        <div style="font-size:12px;color:var(--rh-muted);margin-top:2px;">Track your progress toward a target weight and date in Fitness Goals.</div>
      </button>`}

      ${/* Replaces the IGNYT Score block and the four-tile Today's Summary that stood here.
            Both said the same thing at different sizes — the score block carried a ring, a
            level, a coach line and four mini stats; the tiles repeated steps and training
            underneath it. This is the three numbers that actually answer "did today move",
            in one card.

            The score keeps its arc rather than its block, so nothing was lost — and 160 stays
            its denominator, the same ceiling IgnytScore's own ring used, because a rounder
            100 would show a full arc for an incomplete day.

            Calories and Active Minutes are not here. Calories has the Nutrition card further
            down this page and its own tab; active minutes was the same figure as Training. */''}
      <div class="rh-section-head"><span>Today's Summary</span></div>
      <div class="pg-card hm-gauge">
        <div class="hm-gauge__arcs">
          <svg viewBox="0 0 120 72" aria-hidden="true">
            ${gaugeArc(52, gauge[0].goal ? gauge[0].now / gauge[0].goal : 0, gauge[0].color)}
            ${gaugeArc(38, gauge[1].goal ? gauge[1].now / gauge[1].goal : 0, gauge[1].color)}
            ${gaugeArc(24, gauge[2].goal ? gauge[2].now / gauge[2].goal : 0, gauge[2].color)}
          </svg>
        </div>
        <div class="hm-gauge__legend">
          ${gauge.map(g => `<div class="hm-gauge__row">
            <span class="hm-gauge__name" style="color:${g.color};">${g.label}</span>
            <span class="hm-gauge__val">${g.now == null ? '—' : g.now.toLocaleString()}<em>/${g.goal.toLocaleString()}${g.unit ? ' ' + g.unit : ''}</em></span>
          </div>`).join('')}
        </div>
      </div>

      ${(window.IgnytPages && window.IgnytPages.renderFastingHomeCard)
          ? window.IgnytPages.renderFastingHomeCard() : ''}

      ${renderHomeHabits ? renderHomeHabits() : ''}

      ${(() => {
        /* Nutrition card. Only shown once something has been logged today — an empty card of
           zeros is noise on a home screen, and the Nutrition tab is one tap away regardless. */
        const n = nutritionToday;
        if (!n || !n.entryCount) return '';
        const remaining = Math.round(targets.kcal) - n.kcal;
        const bar = (label, val, target, color) => {
          const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0;
          return `<div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
              <span style="color:${color};font-weight:700;">${label}</span>
              <span style="color:var(--rh-muted);font-family:'SF Mono',monospace;">${Math.round(val)}g</span>
            </div>
            <div style="height:4px;border-radius:2px;background:rgba(128,128,128,.18);overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;"></div>
            </div>
          </div>`;
        };
        return `
        <div class="rh-section-head"><span>Nutrition</span><a href="#" class="rh-view-all" data-nav="nutrition">View All</a></div>
        <div class="pg-card" style="padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div>
              <div style="font-size:11px;color:var(--rh-muted);font-weight:700;text-transform:uppercase;">Eaten</div>
              <div style="font-family:'SF Mono',monospace;font-size:22px;font-weight:900;">${n.kcal.toLocaleString()}<span style="font-size:11px;font-weight:600;color:var(--rh-muted);"> / ${Math.round(targets.kcal).toLocaleString()} kcal</span></div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:var(--rh-muted);font-weight:700;text-transform:uppercase;">${remaining >= 0 ? 'Remaining' : 'Over'}</div>
              <div style="font-family:'SF Mono',monospace;font-size:22px;font-weight:900;color:${remaining >= 0 ? 'var(--rh-green)' : '#DC2626'};">${Math.abs(remaining).toLocaleString()}</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-bottom:10px;">
            ${bar('Protein', n.protein, targets.protein, 'var(--rh-green)')}
            ${bar('Carbs', n.carbs, targets.carbs, 'var(--rh-blue)')}
            ${bar('Fat', n.fat, targets.fat, '#D97706')}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--rh-muted);border-top:1px solid rgba(128,128,128,.15);padding-top:9px;">
            <span>💧 ${(water / 1000).toFixed(1)} / ${(waterTarget / 1000).toFixed(1)} L</span>
            <span>${n.mealCount} meal${n.mealCount === 1 ? '' : 's'} · ${n.entryCount} item${n.entryCount === 1 ? '' : 's'}</span>
          </div>
          ${n.latestName ? `<div style="font-size:11px;color:var(--rh-muted);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            Last: <span style="color:var(--rh-text,inherit);font-weight:600;">${n.latestName}</span> · ${n.latestKcal} kcal · ${n.latestMeal}
          </div>` : ''}
        </div>`;
      })()}

      ${window.IgnytReview ? (()=>{
        const line = IgnytReview.coachLine(state);
        return `
        ${line ? `<div class="daily-motivation">
          <span class="daily-motivation__icon">${svg('star',16)}</span>
          <span class="daily-motivation__text">${line}</span>
        </div>` : ''}
        ${window.IgnytWeekly ? (()=>{
          /* settle() pays and celebrates a finished week. Safe here: the XP ledger is keyed
             on the ISO week, so a repaint cannot award twice. */
          const wc = IgnytWeekly.settle(state);
          if (!wc) return '';
          return `
        <div class="rh-section-head"><span>This Week's Challenge</span><span class="rh-view-all">${wc.daysLeft} day${wc.daysLeft!==1?'s':''} left</span></div>
        <div class="wch${wc.done?' is-done':''}">
          <div class="wch__top">
            <span class="wch__icon">${wc.icon}</span>
            <span class="wch__name">${escHtml(wc.name)}</span>
            <span class="wch__xp">${wc.done ? 'Complete ✓' : '+'+wc.xp+' XP'}</span>
          </div>
          <div class="wch__label">${escHtml(wc.label)}</div>
          <div class="wch__track"><div class="wch__fill" style="width:${wc.percent}%"></div></div>
          <div class="wch__foot">
            <span><b data-count="${wc.current}" data-count-key="wch-${wc.id}-${wc.weekKey}">${wc.current}</b> / ${wc.target} ${escHtml(wc.unit)}</span>
            <span>${wc.personalised
              ? 'Target from your last '+wc.weeksOfHistory+' week'+(wc.weeksOfHistory!==1?'s':'')
              : 'Starter target — it adapts once you have a few weeks logged'}</span>
          </div>
        </div>`; })() : ''}
`; })() : ''}

      <div class="rh-section-head"><span>Quick Actions</span></div>
      <div class="rh-quick-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        ${/* Three. Workout, Food, Progress and Health all have a bottom-nav tab or a card
              further up this page, so as shortcuts they were pointing at things already one tap
              away. These three are the ones with no other route from Home. */''}
        ${quickAction('scale', 'var(--rh-blue)', 'Log Weight', 'data-nav="body"')}
        ${quickAction('timer', '#7C3AED', 'Fasting', 'data-nav="fasting"')}
        ${quickAction('flask', '#0891B2', 'Supplements', 'data-nav="supplements"')}
      </div>
    </div>`;
  };
})();
