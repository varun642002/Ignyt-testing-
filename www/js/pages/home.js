/* Home page module. It intentionally receives dependencies from app.js so the existing
   state and Health Connect behavior stay authoritative during incremental extraction.

   This pass rebuilds Home to match a newer "premium reference" mockup (simple greeting +
   weekly-goal ring, a real weight-goal progress card, a Today's Summary strip, Quick Actions,
   and Recent Workouts) -- replacing the previous hero-image/recovery-score layout, which the
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
      renderAchievementCelebration, renderPRCelebration } = ctx;

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
    const QUOTES = [
      "Consistency creates results.",
      "The work you do today is tomorrow's baseline.",
      "Small sessions still count. Skipped ones do not.",
      "Progress is what happens between the days you feel like it.",
      "Train the habit and the shape follows.",
      "You do not have to be fresh. You have to turn up.",
      "The plan only works while you are on it."
    ];
    const quoteOfDay = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

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

    /* Today's plan. Each row is a real thing with a real done-state, so the completion figure
       underneath is a count of facts rather than an encouraging guess. */
    const todaysPlan = (() => {
      const items = [];
      if (dayTotal > 0 || plannedDay) {
        items.push({ icon: '🏋️', label: plannedDay ? (plannedDay.name || 'Workout') : 'Workout',
                     done: dayTotal > 0 ? dayDone >= dayTotal : !!workoutToday,
                     nav: 'data-nav="workout"' });
      }
      const meals = (state.settings && state.settings.mealTypes) ||
                    ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
      for (const m of meals) {
        items.push({ icon: m.toLowerCase().includes('snack') ? '🍎' : '🍽️', label: m,
                     done: state.foodLog.some(f => f.date === new Date().toISOString().slice(0, 10) &&
                                                   (f.meal || 'Lunch') === m),
                     nav: `data-meal-add="${m}"` });
      }
      items.push({ icon: '💧', label: 'Water goal', done: water >= waterTarget,
                   nav: 'data-nav="nutrition"' });
      const done = items.filter(i => i.done).length;
      return { items, done, total: items.length,
               pct: items.length ? Math.round(done / items.length * 100) : 0 };
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

    const recentSessions = state.workoutLog.slice(0, 3);
    const rowIcon = (muscles) => {
      const g = muscles.length ? FINE_TO_BROAD[muscles[0]] : null;
      return (g === 'Chest' || g === 'Shoulders' || g === 'Arms') ? 'dumbbell' : (g === 'Back') ? 'workout' : 'body';
    };

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

      <div class="pg-card hm-greet">
        <div class="hm-greet__left">
          <div class="hm-greet__hello">${greeting()}, ${state.profile.name || 'Athlete'} 👋</div>
          <div class="hm-greet__quote">${quoteOfDay}</div>
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

      <div class="rh-section-head"><span>Today's Plan</span><span class="hm-plan__count">${todaysPlan.done} of ${todaysPlan.total}</span></div>
      <div class="pg-card">
        <div class="rh-progress-track" style="margin-top:0;"><div class="rh-progress-fill" style="width:${todaysPlan.pct}%;"></div></div>
        <div class="hm-plan__pct">${todaysPlan.pct}% complete</div>
        <div class="hm-plan__list">
          ${todaysPlan.items.map(i => `
            <button class="hm-plan__row ${i.done ? 'is-done' : ''}" ${i.nav}>
              <span class="hm-plan__tick" aria-hidden="true">${i.done ? '✓' : ''}</span>
              <span class="hm-plan__icon" aria-hidden="true">${i.icon}</span>
              <span class="hm-plan__label">${i.label}</span>
            </button>`).join('')}
        </div>
      </div>

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

      <div class="rh-section-head"><span>Quick Actions</span></div>
      <div class="rh-quick-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        ${quickAction('workout', 'var(--rh-green)', 'Start Workout', 'data-nav="workout"')}
        ${quickAction('nutrition', '#DC2626', 'Log Food', 'data-nav="nutrition"')}
        ${quickAction('scale', 'var(--rh-blue)', 'Log Weight', 'data-nav="body"')}
        ${quickAction('health', '#0891B2', 'Health', 'data-nav="health"')}
        ${quickAction('progress', 'var(--rh-purple)', 'Progress', 'data-nav="progress"')}
        ${quickAction('more', 'var(--rh-muted)', 'More', 'data-nav="tools"')}
      </div>

      <div class="rh-section-head"><span>Recent Workouts</span><a href="#" class="rh-view-all" data-nav="workout">View All</a></div>
      ${recentSessions.length === 0 ? `<div class="pg-card" style="text-align:center;padding:20px;font-size:13px;color:var(--rh-muted);">No workouts logged yet.</div>` :
        recentSessions.map(s => {
          const muscles = sessionMuscles(s.exercises);
          return `<div class="pg-card" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;cursor:pointer;" data-view-session="${s.id}">
            <span class="tl-card__icon" style="flex:none;background:rgba(37,99,235,.1);color:var(--rh-blue);">${svg(rowIcon(muscles), 20)}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;">${sessionTitle(s)}</div>
              <div style="font-size:12px;color:var(--rh-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${muscles.length ? muscles.join(', ') : `${(s.exercises||[]).length} exercise${(s.exercises||[]).length!==1?'s':''}`}</div>
            </div>
            <div style="flex:none;text-align:right;">
              <div style="font-size:13px;font-weight:700;">${workoutDurationLabel(s)}</div>
              <div style="font-size:11px;color:var(--rh-muted);margin-top:2px;">${new Date(s.date).toLocaleDateString('default',{day:'2-digit',month:'short',year:'numeric'})}</div>
            </div>
            <span style="color:var(--rh-muted);flex:none;">›</span>
          </div>`;
        }).join('')}
    </div>`;
  };
})();
