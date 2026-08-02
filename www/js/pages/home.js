/* Home page module. It intentionally receives dependencies from app.js so the existing
   state and Health Connect behavior stay authoritative during incremental extraction.

   This pass rebuilds Home to match a newer "premium reference" mockup (simple greeting +
   weekly-goal ring, a real weight-goal progress card, a Today's Summary strip, Quick Actions,
   and Quick Actions) -- replacing the previous hero-image/recovery-score layout, which the
   newer reference deck no longer shows. Every value is genuinely sourced from existing app
   state / Health Connect / the Smart Goal Engine (window.IgnytGoals) -- no fabricated numbers.
   Where the reference shows something this app has no real source for, that element is
   honestly omitted rather than faked. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  const DEFAULT_STEPS_GOAL = 10000; // no configurable step goal exists yet; display-only denominator, real numerator
  const DEFAULT_ACTIVE_CALORIES_GOAL = 2000;
  const DEFAULT_WORKOUT_MINUTES_GOAL = 60;

  function healthValue(cache, path, fallback) {
    try { return path.split('.').reduce((value, key) => value == null ? null : value[key], cache) ?? fallback; }
    catch (_) { return fallback; }
  }

  window.IgnytPages.renderHome = function renderHome(ctx) {
    const { state, week, streak, greeting, displayW, wUnit, svg,
      weekStats, targets, eaten, burned, dayDone, dayTotal, plannedDay,
      water, waterTarget, nutritionToday,
      renderAchievementCelebration, renderPRCelebration, renderHomeHabits } = ctx;

    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);
    // Health Connect reports sleep in minutes; null stays null rather than becoming 0,
    // because "not synced" and "slept nothing" are different facts.
    const sleepMinutes = healthValue(health, 'sleep.minutes', null);
    const sleepHours = sleepMinutes == null ? null : sleepMinutes / 60;

    const workoutToday = state.workoutLog.find(s => new Date(s.startedAt || s.date).toDateString() === new Date().toDateString());
    const workoutMinutes = workoutToday ? Math.round(workoutToday.durationMin || 0) : null;
    const workoutDoneCount = dayTotal > 0 ? dayDone : (workoutToday ? 1 : 0);
    const workoutTotalCount = dayTotal > 0 ? dayTotal : (workoutToday ? 1 : 1);

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
    const quoteOfDay = (window.IgnytMessages && IgnytMessages.forDay("daily"))
      || FALLBACK_QUOTES[Math.floor(Date.now() / 86400000) % FALLBACK_QUOTES.length];

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

    /* BMI from the latest weigh-in and the profile height. Shown next to the weight goal
       because it is the same question asked a different way; omitted when either input is
       missing rather than computed from a default height. */
    const bmiNow = (() => {
      const h = Number(state.profile.height);
      const w = currentWeightKg;
      if (!h || !w) return null;
      return w / Math.pow(h / 100, 2);
    })();
    const bmiCategoryLabel = (b) => b < 18.5 ? 'Underweight' : b < 25 ? 'Healthy' : b < 30 ? 'Overweight' : 'Obese';
    const goalPct = (activeGoal && goals && currentWeightKg != null) ? (goals.progressPct(activeGoal, currentWeightKg) || 0) : null;
    let daysLeft = null;
    if (goalCompute && goalCompute.completion) {
      daysLeft = Math.max(0, Math.round((new Date(goalCompute.completion) - new Date()) / 86400000));
    }
    const weightDeltaKg = (activeGoal && currentWeightKg != null) ? (activeGoal.targetWeight - currentWeightKg) : null;

    const summaryTile = (icon, bg, color, value, unit, label, goalText) => `<div class="pg-card" style="padding:14px;background:${bg};border-color:transparent;">
      <span style="color:${color};">${svg(icon, 18)}</span>
      <div style="font-size:18px;font-weight:800;margin-top:8px;">${value}${unit ? `<span style="font-size:11px;font-weight:600;color:var(--rh-muted);"> ${unit}</span>` : ''}</div>
      <div style="font-size:11px;color:var(--rh-muted);font-weight:600;margin-top:1px;">${label}</div>
      <div style="font-size:11px;color:var(--rh-muted);font-weight:600;margin-top:1px;">${goalText}</div>
    </div>`;

    const quickAction = (icon, color, label, attrs) => `<button class="rh-quick-card" style="padding:12px 4px;" ${attrs}>
      <span style="color:${color};">${svg(icon, 20)}</span><span>${label}</span>
    </button>`;

    return `
    <div class="home-light">
      ${renderAchievementCelebration ? (state.lastUnlockedAchievements && state.lastUnlockedAchievements.length ? renderAchievementCelebration() : '') : ''}
      ${renderPRCelebration ? (state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : '') : ''}

      ${window.IgnytScore ? (()=>{
        // One pass over the logs for the whole block -- see IgnytScore.summary().
        const sum = IgnytScore.summary(state);
        const t = sum.today, st = sum.stats, line = sum.coachLine;
        const sug = sum.suggestions.slice(0,3);
        // 46 radius, 289.03 circumference. Stroke-dashoffset draws the arc; the CSS transition
        // on it is what animates the ring when the score changes.
        const C = 289.03;
        const pct = Math.min(1, t.score / 160);
        return `
        <div class="ign" style="--ign:${t.level.color};">
          <div class="ign__ring">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="ign__track" cx="50" cy="50" r="46"></circle>
              <circle class="ign__arc" cx="50" cy="50" r="46"
                      style="stroke-dasharray:${C};stroke-dashoffset:${C - C*pct};"></circle>
            </svg>
            <div class="ign__center">
              <div class="ign__num" data-count="${t.score}" data-count-key="ignyt-score">${t.score}</div>
              <div class="ign__cap">IGNYT Score</div>
            </div>
          </div>
          <div class="ign__side">
            <div class="ign__level">${escHtml(t.level.name)}</div>
            <div class="ign__line">${escHtml(line)}</div>
            <div class="ign__mini">
              <span><b>${st.yesterday!=null?st.yesterday:'—'}</b>yesterday</span>
              <span><b>${st.best}</b>best</span>
              <span><b>${st.weekAverage!=null?st.weekAverage:'—'}</b>7-day avg</span>
              <span><b>${st.streak}</b>day streak</span>
            </div>
          </div>
        </div>
        ${sug.length ? `
        <div class="ign-todo">
          <div class="ign-todo__head">Still available today</div>
          ${sug.map(x=>`<div class="ign-todo__row"><span>${escHtml(x.label)}</span><b>+${x.points}</b></div>`).join('')}
        </div>` : ''}
        `; })() : ''}

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
      <div class="pg-card" style="display:flex;gap:14px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;gap:20px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="tl-card__icon" style="width:32px;height:32px;flex:none;background:rgba(37,99,235,.1);color:var(--rh-blue);">${svg('scale', 16)}</span>
              <div><div style="font-size:11px;color:var(--rh-muted);font-weight:600;">Current Weight</div><div style="font-size:15px;font-weight:800;">${currentWeightKg != null ? displayW(currentWeightKg) : '—'} ${wUnit()}</div></div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="tl-card__icon" style="width:32px;height:32px;flex:none;background:rgba(22,163,74,.1);color:var(--rh-green);">${svg('target', 16)}</span>
              <div><div style="font-size:11px;color:var(--rh-muted);font-weight:600;">Goal Weight</div><div style="font-size:15px;font-weight:800;">${displayW(activeGoal.targetWeight)} ${wUnit()}</div></div>
            </div>
          </div>
          ${bmiNow != null ? `<div class="hm-goal__bmi">
            <span>BMI <b>${bmiNow.toFixed(1)}</b></span><span class="hm-goal__bmicat">${bmiCategoryLabel(bmiNow)}</span>
          </div>` : ''}
          <div class="rh-progress-track"><div class="rh-progress-fill" style="width:${goalPct || 0}%;"></div></div>
          <div class="hm-goal__pct">${goalPct || 0}% of the way there</div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;">
            <span style="color:var(--rh-muted);">${weightDeltaKg != null ? `You need to ${weightDeltaKg < 0 ? 'lose' : 'gain'} <b style="color:var(--rh-text);">${Math.abs(displayW(weightDeltaKg, 1))} ${wUnit()}</b>` : ''}</span>
            <span style="color:var(--rh-muted);">${goalCompute && goalCompute.weeklyRate ? `<b style="color:var(--rh-blue);">${Math.abs(goalCompute.weeklyRate)} ${wUnit()}</b> per week` : ''}</span>
          </div>
        </div>
        ${daysLeft != null ? `<div style="flex:none;border-left:1px solid var(--rh-border);padding-left:14px;text-align:center;">
          <div style="font-size:11px;color:var(--rh-blue);font-weight:700;">Days Left</div>
          <div style="font-size:22px;font-weight:800;margin-top:2px;">${daysLeft}</div>
          <div style="font-size:11px;color:var(--rh-muted);margin-top:1px;">days left</div>
          <div style="font-size:11px;color:var(--rh-muted);font-weight:700;margin-top:10px;">Target Date</div>
          <div style="font-size:11px;font-weight:700;margin-top:1px;white-space:nowrap;">${new Date(goalCompute.completion).toLocaleDateString('default',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>` : ''}
      </div>` : `
      <div class="rh-section-head" style="margin-top:16px;"><span>Goal Progress</span></div>
      <button class="pg-card" style="width:100%;text-align:left;background:none;border-style:dashed;cursor:pointer;" data-nav="goals">
        <div style="font-size:13px;font-weight:700;">Set your first goal</div>
        <div style="font-size:12px;color:var(--rh-muted);margin-top:2px;">Track your progress toward a target weight and date in Fitness Goals.</div>
        ${bmiNow != null ? `<div class="hm-goal__bmi" style="margin-top:10px;">
          <span>Right now · BMI <b>${bmiNow.toFixed(1)}</b></span><span class="hm-goal__bmicat">${bmiCategoryLabel(bmiNow)}</span>
        </div>` : ''}
      </button>`}

      <div class="rh-section-head"><span>Today's Summary</span><a href="#" class="rh-view-all" data-open-progress-view="analytics">View All</a></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        ${summaryTile('flame', 'rgba(22,163,74,.08)', 'var(--rh-green)', eaten.toLocaleString(), '', 'Calories', `/ ${Math.round(targets.kcal).toLocaleString()} kcal`)}
        ${summaryTile('dumbbell', 'rgba(124,58,237,.08)', 'var(--rh-purple)', `${workoutDoneCount}`, `/ ${workoutTotalCount}`, 'Workout', workoutDoneCount >= workoutTotalCount && workoutTotalCount > 0 ? 'Completed' : 'In progress')}
        ${summaryTile('footprints', 'rgba(217,119,6,.08)', '#D97706', steps == null ? '—' : Number(steps).toLocaleString(), '', 'Steps', `/ ${DEFAULT_STEPS_GOAL.toLocaleString()}`)}
        ${summaryTile('timer', 'rgba(37,99,235,.08)', 'var(--rh-blue)', workoutMinutes == null ? '—' : workoutMinutes, '', 'Active Minutes', `/ ${DEFAULT_WORKOUT_MINUTES_GOAL} min`)}
        ${summaryTile('droplet', 'rgba(8,145,178,.08)', '#0891B2', (water / 1000).toFixed(1), '', 'Water', `/ ${(waterTarget / 1000).toFixed(1)} L`)}
        ${summaryTile('moon', 'rgba(124,58,237,.08)', 'var(--rh-purple)', sleepHours == null ? '—' : sleepHours.toFixed(1), '', 'Sleep', sleepHours == null ? 'Not synced' : '/ 8.0 h')}
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
        const ch = IgnytReview.challenges(state);
        const doneCount = ch.filter(c=>c.done).length;
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

        <div class="rh-section-head"><span>Today's Challenges</span><span class="rh-view-all">${doneCount}/${ch.length}</span></div>
        <div class="chal">
          ${ch.map(c=>`<div class="chal__row${c.done?' is-done':''}">
            <span class="chal__icon">${c.icon}</span>
            <span class="chal__label">${c.label}</span>
            <span class="chal__xp">${c.done ? '✓' : '+'+c.xp+' XP'}</span>
          </div>`).join('')}
        </div>`; })() : ''}

      <div class="rh-section-head"><span>Quick Actions</span></div>
      <div class="rh-quick-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        ${quickAction('workout', 'var(--rh-green)', 'Start Workout', 'data-nav="workout"')}
        ${quickAction('nutrition', '#DC2626', 'Log Food', 'data-nav="nutrition"')}
        ${quickAction('scale', 'var(--rh-blue)', 'Log Weight', 'data-nav="body"')}
        ${quickAction('health', '#0891B2', 'Health', 'data-nav="health"')}
        ${quickAction('progress', 'var(--rh-purple)', 'Progress', 'data-nav="progress"')}
        ${quickAction('more', 'var(--rh-muted)', 'More', 'data-nav="tools"')}
      </div>
    </div>`;
  };
})();
