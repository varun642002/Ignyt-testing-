/* Workout page module (list/idle view only). Mirrors the home.js adapter pattern:
   receives already-computed values and existing renderer/helper functions from app.js
   so state, PR logic, and session data stay authoritative during incremental extraction.
   The active-session renderer (sets, supersets, rest timer, plate calc) is large and
   deeply stateful — left in app.js and extracted in a later, dedicated pass.

   This pass restyles the list view to match a light "premium reference" mockup (Today's
   Workout hero, This Week stats, Quick Actions, category filter chips, routine cards with
   a real per-routine completion ring, Recent Sessions) using the same light design system
   introduced for Home (see home.css's --rh-* tokens, duplicated locally here so this module
   stays self-contained). Every value is genuinely sourced from existing app state -- no
   fabricated numbers, no invented charts. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  const CATEGORY_COLOR = { Push:'#2563EB', Pull:'#16A34A', Legs:'#7C3AED', Upper:'#EA580C', Lower:'#0891B2' };

  function daysAgoLabel(dateStr) {
    if (!dateStr) return null;
    const start = new Date(dateStr); start.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.round((today - start) / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  function lastSessionForRoutine(state, name) {
    // workoutLog is newest-first; matched by title since sessions don't store a routineId.
    // A renamed routine loses its link to past matching sessions -- an honest limitation of
    // the existing data model, not something this redesign silently papers over.
    return state.workoutLog.find(s => s.title === name) || null;
  }

  function sessionCompletionPct(session) {
    let total = 0, done = 0;
    session.exercises.forEach(ex => (ex.sets||[]).forEach(s => { total++; if (s.done) done++; }));
    return total ? Math.round(done / total * 100) : null;
  }

  function completionRing(pct, color) {
    const clamped = pct == null ? 0 : Math.max(0, Math.min(100, pct));
    return `<div class="wk-ring" style="--pct:${clamped};--ring-color:${color};">
      <div class="wk-ring__inner">${pct == null ? '—' : pct + '%'}</div>
    </div>`;
  }

  window.IgnytPages.renderWorkoutList = function renderWorkoutList(ctx) {
    const { state, svg, renderPRCelebration, renderRoutineBuilder, sessionMuscles, sessionTitle,
      workoutDurationLabel, displayW, wUnit, week, plannedDay, weekStats, prsThisWeek,
      volumeTrend, todayMuscles, ROUTINE_CATEGORIES, routineEstimatedMinutes, escHtml } = ctx;

    const showAll = state.showAllSessions;
    const recent = showAll ? state.workoutLog : state.workoutLog.slice(0, 2);

    const filter = state.workoutRoutineFilter || 'All';
    const sort = state.workoutRoutineSort || 'recent';
    let routines = state.routines.slice();
    if (filter === 'Favorites') routines = routines.filter(r => r.favorite);
    else if (filter !== 'All') routines = routines.filter(r => r.category === filter);
    if (sort === 'name') routines.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'exercises') routines.sort((a, b) => b.exercises.length - a.exercises.length);
    // "recent" = existing stored order (newest-created/edited first) -- no change needed.

    /* Today's recommendation, from the coach engine. Rendered before This Week because it is
       the one thing on this screen that tells the user what to do NEXT rather than what they
       have already done. Absent when the engine could not run — the tab must work without it. */
    const coachCard = (() => {
      const c = ctx.coach;
      if (!c) return '';
      const open = state.coachExpanded;
      const rest = c.today.type === 'rest';

      return `
        <div class="rh-section-head">
          <span>Today</span>
          <a href="#" class="rh-view-all" data-action="coach-regenerate">Regenerate</a>
        </div>
        <div class="pg-card coach-card">
          <div class="coach-card__head">
            <div style="min-width:0;flex:1;">
              <div class="coach-card__title">${escHtml(rest ? c.today.label : c.today.label)}</div>
              <div class="coach-card__sub">
                ${rest ? 'Recovery' : `${c.today.exercises.length} exercises · ${c.today.totalSets} sets · ~${c.today.estimatedMinutes} min`}
              </div>
            </div>
            <span class="coach-badge coach-badge--${c.recovery.band}">
              ${c.recovery.score}<span class="coach-badge__unit">/100</span>
            </span>
          </div>

          ${rest ? `
            <ul class="coach-list">${c.today.activities.map(a=>`<li>${escHtml(a)}</li>`).join('')}</ul>
            <div class="coach-why">${escHtml(c.today.why)}</div>
          ` : `
            <div class="coach-ex">
              ${c.today.exercises.map(e=>`
                <div class="coach-ex__row">
                  <span class="coach-ex__name">${escHtml(e.name)}</span>
                  <span class="coach-ex__dose">${e.sets} × ${e.repRange[0]}-${e.repRange[1]}</span>
                </div>`).join('')}
            </div>
            ${c.today.intensityNote ? `<div class="coach-note">${escHtml(c.today.intensityNote)}</div>` : ''}
            <button class="wk-primary-btn coach-start" data-action="coach-start">Start this workout</button>
          `}

          <button class="coach-toggle" data-action="coach-toggle">
            ${open ? 'Hide reasoning' : 'Why this?'} <span aria-hidden="true">${open ? '⌃' : '⌄'}</span>
          </button>

          ${open ? `
            <div class="coach-detail">
              ${c.explanation.map(p=>`<p>${escHtml(p)}</p>`).join('')}
              ${c.today.deferred && c.today.deferred.length ? `
                <p class="coach-detail__muted">Skipped today: ${c.today.deferred.map(d=>
                  escHtml(d.muscle) + ' (' + d.readiness + '% recovered)').join(', ')}.</p>` : ''}
              ${c.cardio ? `<p class="coach-detail__muted">Cardio: ${escHtml(c.cardio.style)} ×${c.cardio.sessionsPerWeek} — ${escHtml(c.cardio.detail)}.</p>` : ''}
              <p class="coach-detail__muted">Confidence ${c.confidence}% (${escHtml(c.confidenceLabel)}) · generated in ${c.elapsedMs} ms.</p>
            </div>` : ''}

          ${c.insights && c.insights.length ? `
            <div class="coach-insights">
              ${c.insights.slice(0, open ? 6 : 2).map(i=>`
                <div class="coach-insight coach-insight--${i.tone}">
                  <b>${escHtml(i.title)}</b> ${escHtml(i.body)}
                </div>`).join('')}
            </div>` : ''}
        </div>`;
    })();

    /* Recovery dashboard (§29). Sits under Today because it answers the follow-up question:
       the coach card says what to do, this says whether the body is ready for it. */
    const recoveryCard = (() => {
      const rd = ctx.readiness;
      if (!rd) return '';
      const open = state.recoveryExpanded;
      const bandFor = s => s >= 85 ? 'high' : s >= 70 ? 'normal' : s >= 50 ? 'reduced' : 'low';

      return `
        <div class="rh-section-head"><span>Recovery</span></div>
        <div class="pg-card coach-card">
          <div class="coach-card__head">
            <div style="min-width:0;flex:1;">
              <div class="coach-card__title">${escHtml(rd.status)}</div>
              <div class="coach-card__sub">${escHtml(rd.session.label)}</div>
            </div>
            <span class="coach-badge coach-badge--${bandFor(rd.score)}">
              ${rd.score}<span class="coach-badge__unit">/100</span>
            </span>
          </div>

          ${rd.why.length ? `<div class="coach-why">${escHtml(rd.why.slice(0, 2).join(' · '))}</div>` : ''}
          ${rd.session.why ? `<div class="coach-note">${escHtml(rd.session.why)}</div>` : ''}

          ${rd.muscles.length ? `
            <div class="rec-map">
              ${rd.muscles.slice(0, open ? 12 : 4).map(m => `
                <div class="rec-map__row">
                  <span class="rec-map__name">${escHtml(m.muscle)}</span>
                  <span class="rec-map__bar"><i style="width:${Math.min(100, m.readiness)}%;" data-status="${m.status}"></i></span>
                  <span class="rec-map__eta">${escHtml(m.status)} · ${escHtml(m.eta)}</span>
                </div>`).join('')}
            </div>` : ''}

          <button class="coach-toggle" data-action="recovery-toggle">
            ${open ? 'Hide detail' : 'Detail'} <span aria-hidden="true">${open ? '⌃' : '⌄'}</span>
          </button>

          ${open ? `
            <div class="coach-detail">
              ${rd.sleep.available ? `
                <p><b>Sleep</b> — ${rd.sleep.avgHours} h average over ${rd.sleep.nights} night${rd.sleep.nights === 1 ? '' : 's'},
                consistency ${rd.sleep.consistency}%${rd.sleep.trend ? ', trend ' + escHtml(rd.sleep.trend) : ''}.</p>
                ${rd.sleep.recommendations.map(r => `<p class="coach-detail__muted">${escHtml(r)}</p>`).join('')}
              ` : `<p class="coach-detail__muted">No sleep data — connect Health Connect or add it in your profile to sharpen this.</p>`}

              ${rd.overtraining.signals.length ? `
                <p><b>Overtraining signals (${escHtml(rd.overtraining.level)})</b></p>
                ${rd.overtraining.signals.map(s => `<p class="coach-detail__muted">• ${escHtml(s.why)}</p>`).join('')}
              ` : `<p class="coach-detail__muted">No overtraining signals.</p>`}

              <p><b>Suggested today</b></p>
              ${rd.actions.map(a => `<p class="coach-detail__muted">• <b style="color:var(--rh-text);">${escHtml(a.label)}</b> — ${escHtml(a.detail)}</p>`).join('')}

              <p class="coach-detail__muted" style="margin-top:10px;">
                Confidence ${rd.confidence}%${rd.missingInputs.length ? ' · missing: ' + escHtml(rd.missingInputs.join(', ')) : ''}.
                Based on ${escHtml(rd.basis)}.
              </p>
            </div>` : ''}
        </div>`;
    })();

    return `
      <div class="wk-light">
        ${renderPRCelebration && state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ''}

        ${coachCard}
        ${recoveryCard}

        <div class="rh-section-head"><span>This Week</span><a href="#" class="rh-view-all" data-nav="plan">Week ${week.week} of 8 ›</a></div>
        <div class="wk-stat-grid">
          <div class="wk-stat-card"><span class="wk-stat-card__icon" style="background:rgba(37,99,235,.1);color:#2563EB;">${svg('dumbbell',18)}</span>
            <div class="wk-stat-card__value">${weekStats.workoutsCompleted}</div>
            <div class="wk-stat-card__label">Workouts</div>
            <div class="wk-stat-card__sub">${weekStats.workoutsGoal ? `Goal ${weekStats.workoutsGoal}` : ''}</div></div>
          <div class="wk-stat-card"><span class="wk-stat-card__icon" style="background:rgba(22,163,74,.1);color:#16A34A;">${svg('timer',18)}</span>
            <div class="wk-stat-card__value">${fmtMinutes(weekStats.trainingMinutes)}</div>
            <div class="wk-stat-card__label">Total Time</div>
            <div class="wk-stat-card__sub">${weekStats.workoutsGoal ? `Goal ${weekStats.workoutsGoal}h` : ''}</div></div>
          <div class="wk-stat-card"><span class="wk-stat-card__icon" style="background:rgba(245,158,11,.12);color:#D97706;">${svg('trophy',18)}</span>
            <div class="wk-stat-card__value">${prsThisWeek}</div>
            <div class="wk-stat-card__label">PRs</div>
            <div class="wk-stat-card__sub">This Week</div></div>
          <div class="wk-stat-card"><span class="wk-stat-card__icon" style="background:rgba(124,58,237,.1);color:#7C3AED;">${svg('flame',18)}</span>
            <div class="wk-stat-card__value">${displayW(weekStats.weeklyVolume,0).toLocaleString()}<span class="wk-stat-card__unit">${wUnit()}</span></div>
            <div class="wk-stat-card__label">Volume</div>
            <div class="wk-stat-card__sub ${volumeTrend.positive?'is-up':'is-down'}">${volumeTrend.text} vs last week</div></div>
        </div>

        <div class="rh-section-head"><span>Quick Actions</span></div>
        <div class="wk-quick-grid">
          <button class="rh-quick-card" data-action="toggle-routine-builder">${svg('plus',20)}<span>New Routine</span></button>
          <button class="rh-quick-card" data-workout-filter="Favorites">${svg('star',20)}<span>Favorites</span></button>
          <button class="rh-quick-card" data-nav="library">${svg('library',20)}<span>Library</span></button>
          <button class="rh-quick-card" data-action="start-session">${svg('workout',20)}<span>Start Empty</span></button>
        </div>

        ${state.routineBuilder ? renderRoutineBuilder() : ''}

        <div class="wk-filter-row">
          ${['All', ...ROUTINE_CATEGORIES, 'Favorites'].map(c => `<button class="cat-chip ${filter===c?'active':''}" data-workout-filter="${c}">${c}</button>`).join('')}
        </div>

        <div class="rh-section-head">
          <span>My Routines</span>
          <select id="workout-routine-sort" class="wk-sort-select">
            <option value="recent" ${sort==='recent'?'selected':''}>Sort: Recent</option>
            <option value="name" ${sort==='name'?'selected':''}>Sort: Name</option>
            <option value="exercises" ${sort==='exercises'?'selected':''}>Sort: Exercises</option>
          </select>
        </div>
        ${routines.length === 0 ? `<div class="rh-card wk-empty">${state.routines.length===0 ? 'No routines saved yet — build one to start logging faster.' : 'No routines match this filter.'}</div>` :
          `<div id="routine-card-list">` + routines.map(r => {
            const last = lastSessionForRoutine(state, r.name);
            const pct = last ? sessionCompletionPct(last) : null;
            const color = r.category ? CATEGORY_COLOR[r.category] : '#64748B';
            const preview = r.exercises.slice(0, 3).map(e => escHtml(e.name)).join(' • ') + (r.exercises.length > 3 ? ` • +${r.exercises.length - 3} more` : '');
            return `<div class="wk-routine-card" data-routine-card="${r.id}">
              <button class="rt-drag" data-routine-drag="${r.id}" aria-label="Reorder ${escHtml(r.name)}" title="Drag to reorder">${svg('drag',16)}</button>
              <div class="wk-routine-card__badge" style="background:${color}1a;color:${color};">${svg('dumbbell', 20)}</div>
              <div class="wk-routine-card__body">
                <div class="wk-routine-card__top">
                  <span class="wk-routine-card__name">${escHtml(r.name)}</span>
                  ${plannedDay && plannedDay.session===r.name ? `<span class="wk-badge-today">Today</span>` : ''}
                </div>
                <div class="wk-routine-card__meta">
                  <span>${svg('dumbbell',13)} ${r.exercises.length} Exercises</span>
                  ${last ? `<span>${svg('timer',13)} ${workoutDurationLabel(last)}</span>` : ''}
                  ${last && last.volume ? `<span>${svg('flame',13)} ${displayW(last.volume,0).toLocaleString()} ${wUnit()}</span>` : ''}
                </div>
                <div class="wk-routine-card__preview">${preview}</div>
                <div class="wk-routine-card__foot">
                  <div>
                    <div class="wk-routine-card__last-label">Last performed</div>
                    <div class="wk-routine-card__last-value">${last ? daysAgoLabel(last.date) : 'Not yet performed'}</div>
                  </div>
                  ${completionRing(pct, color)}
                </div>
              </div>
              <div class="wk-routine-card__actions">
                <button class="del" data-toggle-favorite-routine="${r.id}" aria-label="${r.favorite?'Remove from favorites':'Add to favorites'}">${svg(r.favorite?'starFilled':'star',16)}</button>
                <button class="del" data-edit-routine="${r.id}" aria-label="Edit routine">✎</button>
                <button class="del" data-dup-routine="${r.id}" aria-label="Duplicate routine">${svg('copy',16)}</button>
                <button class="del" data-del-routine="${r.id}" aria-label="Delete routine">${svg('x',16)}</button>
              </div>
              <button class="wk-routine-card__start" data-start-routine="${r.id}" aria-label="Start ${escHtml(r.name)}">▶</button>
            </div>`;
          }).join('') + `</div>`}

        <div class="section-heading">
          <span class="section-heading__label">Recent Sessions</span>
          ${state.workoutLog.length>2 ? `<button class="btn btn-ghost" data-action="toggle-show-all-sessions" style="padding:4px 10px;font-size:11px;">${showAll?'Show Less':'Show All ('+state.workoutLog.length+')'}</button>` : ''}
        </div>
        ${recent.length===0?`<div class="rh-card wk-empty">No sessions logged yet.</div>`:
          recent.map(s=>{
            const muscles = sessionMuscles(s.exercises);
            const prCount = state.prs.filter(p=>p.workoutId===s.id).length;
            return `<div class="wk-session-row" data-view-session="${s.id}">
            <div>
              <div class="wk-session-row__title">${sessionTitle(s)}</div>
              <div class="wk-session-row__meta">${s.exercises.length} exercise${s.exercises.length!==1?'s':''}${s.durationMin?` · ${workoutDurationLabel(s)}`:''}${prCount?` · 🏆 ${prCount} PR${prCount>1?'s':''}`:''}</div>
              <div class="wk-session-row__date">${s.date}${s.volume?` · ${displayW(s.volume,0).toLocaleString()} ${wUnit()} vol`:''}</div>
              <div style="margin-top:5px;">${muscles.map(m=>`<span class="muscle-chip">${m}</span>`).join("")}</div>
            </div>
            <button class="del" data-del-session="${s.id}" aria-label="Delete workout">${svg('x',14)}</button>
          </div>`;}).join("")}
      </div>
    `;
  };
})();
