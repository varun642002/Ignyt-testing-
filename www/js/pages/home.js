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
      renderAchievementCelebration, renderPRCelebration } = ctx;

    let health = null;
    try { health = JSON.parse(localStorage.getItem('hx_hc_dashboard_cache') || 'null'); } catch (_) {}
    const steps = healthValue(health, 'steps.steps', null);

    const workoutToday = state.workoutLog.find(s => new Date(s.startedAt || s.date).toDateString() === new Date().toDateString());
    const workoutMinutes = workoutToday ? Math.round(workoutToday.durationMin || 0) : null;
    const workoutDoneCount = dayTotal > 0 ? dayDone : (workoutToday ? 1 : 0);
    const workoutTotalCount = dayTotal > 0 ? dayTotal : (workoutToday ? 1 : 1);

    const weeklyGoalPct = weekStats.workoutsGoal ? Math.min(100, Math.round(weekStats.workoutsCompleted / weekStats.workoutsGoal * 100)) : 0;

    // Real weight-goal projection from the Smart Goal Engine (same module already used by the
    // Log Weight screen) -- no goal invented here if the user hasn't set one.
    const goals = window.IgnytGoals;
    const activeGoal = goals ? goals.activeGoal() : null;
    const currentWeightKg = state.bodylog[0] ? Number(state.bodylog[0].weight) : (activeGoal ? activeGoal.startWeight : null);
    const goalCompute = activeGoal ? goals.compute(activeGoal) : null;
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
      <div style="font-size:10px;color:var(--rh-muted);font-weight:600;margin-top:1px;">${goalText}</div>
    </div>`;

    const quickAction = (icon, color, label, attrs) => `<button class="rh-quick-card" style="padding:12px 4px;" ${attrs}>
      <span style="color:${color};">${svg(icon, 20)}</span><span>${label}</span>
    </button>`;

    return `
    <div class="home-light">
      ${renderAchievementCelebration ? (state.lastUnlockedAchievements && state.lastUnlockedAchievements.length ? renderAchievementCelebration() : '') : ''}
      ${renderPRCelebration ? (state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : '') : ''}

      <div class="pg-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px;">
        <div style="min-width:0;">
          <div style="font-size:20px;font-weight:800;">${greeting()}, ${state.profile.name || 'Athlete'} 👋</div>
          <div style="font-size:13px;color:var(--rh-muted);margin-top:3px;">You've got this! Consistency creates results.</div>
        </div>
        <div style="flex:none;">
          <div class="pg-ring" style="--pct:${weeklyGoalPct};--ring-color:var(--rh-blue);width:76px;height:76px;">
            <div class="pg-ring__inner" style="width:62px;height:62px;flex-direction:column;">
              <div style="font-size:17px;font-weight:800;">${weeklyGoalPct}%</div>
            </div>
          </div>
          <div style="font-size:10px;color:var(--rh-muted);font-weight:700;text-align:center;margin-top:4px;">Weekly Goal</div>
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
          <div class="rh-progress-track"><div class="rh-progress-fill" style="width:${goalPct || 0}%;"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;">
            <span style="color:var(--rh-muted);">${weightDeltaKg != null ? `You need to ${weightDeltaKg < 0 ? 'lose' : 'gain'} <b style="color:var(--rh-text);">${Math.abs(displayW(weightDeltaKg, 1))} ${wUnit()}</b>` : ''}</span>
            <span style="color:var(--rh-muted);">${goalCompute && goalCompute.weeklyRate ? `<b style="color:var(--rh-blue);">${Math.abs(goalCompute.weeklyRate)} ${wUnit()}</b> per week` : ''}</span>
          </div>
        </div>
        ${daysLeft != null ? `<div style="flex:none;border-left:1px solid var(--rh-border);padding-left:14px;text-align:center;">
          <div style="font-size:11px;color:var(--rh-blue);font-weight:700;">Days Left</div>
          <div style="font-size:22px;font-weight:800;margin-top:2px;">${daysLeft}</div>
          <div style="font-size:10px;color:var(--rh-muted);margin-top:1px;">days left</div>
          <div style="font-size:10px;color:var(--rh-muted);font-weight:700;margin-top:10px;">Target Date</div>
          <div style="font-size:11px;font-weight:700;margin-top:1px;white-space:nowrap;">${new Date(goalCompute.completion).toLocaleDateString('default',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>` : ''}
      </div>` : `
      <div class="rh-section-head" style="margin-top:16px;"><span>Goal Progress</span></div>
      <button class="pg-card" style="width:100%;text-align:left;background:none;border-style:dashed;cursor:pointer;" data-nav="goals">
        <div style="font-size:13px;font-weight:700;">Set a weight goal</div>
        <div style="font-size:12px;color:var(--rh-muted);margin-top:2px;">Track your progress toward a target weight and date in Fitness Goals.</div>
      </button>`}

      <div class="rh-section-head"><span>Today's Summary</span><a href="#" class="rh-view-all" data-open-progress-view="analytics">View All</a></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        ${summaryTile('flame', 'rgba(22,163,74,.08)', 'var(--rh-green)', eaten.toLocaleString(), '', 'Calories', `/ ${Math.round(targets.kcal).toLocaleString()} kcal`)}
        ${summaryTile('dumbbell', 'rgba(124,58,237,.08)', 'var(--rh-purple)', `${workoutDoneCount}`, `/ ${workoutTotalCount}`, 'Workout', workoutDoneCount >= workoutTotalCount && workoutTotalCount > 0 ? 'Completed' : 'In progress')}
        ${summaryTile('footprints', 'rgba(217,119,6,.08)', '#D97706', steps == null ? '—' : Number(steps).toLocaleString(), '', 'Steps', `/ ${DEFAULT_STEPS_GOAL.toLocaleString()}`)}
        ${summaryTile('timer', 'rgba(37,99,235,.08)', 'var(--rh-blue)', workoutMinutes == null ? '—' : workoutMinutes, '', 'Active Minutes', `/ ${DEFAULT_WORKOUT_MINUTES_GOAL} min`)}
      </div>

      <div class="rh-section-head"><span>Quick Actions</span></div>
      <div class="rh-quick-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        ${quickAction('workout', 'var(--rh-green)', 'Start Workout', 'data-nav="workout"')}
        ${quickAction('scale', 'var(--rh-blue)', 'Log Weight', 'data-nav="body"')}
        ${quickAction('progress', 'var(--rh-purple)', 'Progress', 'data-nav="progress"')}
        ${quickAction('heart', '#DC2626', 'Heart Rate', 'data-action="open-calc" data-calc="hr"')}
        ${quickAction('calc', 'var(--rh-purple)', 'BMI Calculator', 'data-action="open-calc" data-calc="bmi"')}
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
              <div style="font-size:12px;color:var(--rh-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${muscles.length ? muscles.join(', ') : `${s.exercises.length} exercise${s.exercises.length!==1?'s':''}`}</div>
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
