/* Workout page module (list/idle view only). Mirrors the home.js adapter pattern:
   receives already-computed values and existing renderer/helper functions from app.js
   so state, PR logic, and session data stay authoritative during incremental extraction.
   The active-session renderer (sets, supersets, rest timer, plate calc) is large and
   deeply stateful — left in app.js and extracted in a later, dedicated pass. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  window.IgnytPages.renderWorkoutList = function renderWorkoutList(ctx) {
    const { state, svg, renderPRCelebration, renderRoutineBuilder, sessionMuscles, sessionTitle,
      workoutDurationLabel, displayW, wUnit, routineEstimatedMinutes, escHtml } = ctx;
    const showAll = state.showAllSessions;
    // Section X: exactly the two most recent sessions by default, "Show All" opens the
    // complete history (existing toggle already renders the full stored array -- nothing is
    // ever deleted or capped in storage, only in this default view).
    const recent = showAll ? state.workoutLog : state.workoutLog.slice(0, 2);

    return `
      ${state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ""}
      <button class="btn btn-accent btn-block" data-action="start-session" style="margin-top:4px;">${svg('plus',16)} Start Empty Workout</button>

      <div class="row-between" style="margin-top:20px;">
        <span class="section-heading__label" style="margin:0;">My Routines</span>
        <button class="btn btn-ghost" data-action="toggle-routine-builder" style="padding:6px 12px;font-size:12px;">${state.routineBuilder ? 'Cancel' : svg('plus',13) + ' New Routine'}</button>
      </div>
      ${state.routineBuilder ? renderRoutineBuilder() : ""}
      ${state.routines.length === 0 && !state.routineBuilder ? `<div class="empty-note">No routines saved yet — build one to start logging faster.</div>` :
        `<div id="routine-card-list">${state.routines.map(r => {
          const exCount = Array.isArray(r.exercises) ? r.exercises.length : 0;
          const est = routineEstimatedMinutes(r);
          return `<div class="routine-card" data-routine-card="${r.id}" style="padding:18px;">
          <div class="rt-card__head">
            <button class="rt-drag" data-routine-drag="${r.id}" aria-label="Reorder ${escHtml(r.name)}" title="Drag to reorder">${svg('drag',16)}</button>
            <div class="rt-card__title">
              <span class="rt-card__name">${escHtml(r.name)}</span>
              ${r.description ? `<span class="rt-card__desc">${escHtml(r.description)}</span>` : ""}
            </div>
          </div>
          <div class="rt-card__meta">${exCount} exercise${exCount !== 1 ? 's' : ''}${est > 0 ? ` · <span class="mono">~${est} min</span>` : ''}</div>
          <button class="btn btn-steel btn-block" data-start-routine="${r.id}">Start Workout</button>
          <div class="rt-actions rt-card__actions">
            <button class="rt-act" data-edit-routine="${r.id}">${svg('pencil',13)} Edit</button>
            <button class="rt-act" data-dup-routine="${r.id}">${svg('copy',13)} Duplicate</button>
            <button class="rt-act rt-act--danger" data-del-routine="${r.id}">${svg('x',13)} Delete</button>
          </div>
        </div>`;
        }).join("")}</div>`}
      ${state.routineBuilder ? "" : `<button class="routine-fab" data-action="toggle-routine-builder" aria-label="Create a new routine">${svg('plus',18)}<span>New Routine</span></button>`}

      <div class="section-heading">
        <span class="section-heading__label">Recent Sessions</span>
        ${state.workoutLog.length>2 ? `<button class="btn btn-ghost" data-action="toggle-show-all-sessions" style="padding:4px 10px;font-size:11px;">${showAll?'Show Less':'Show All ('+state.workoutLog.length+')'}</button>` : ""}
      </div>
      ${recent.length===0?`<div class="empty-note">No sessions logged yet.</div>`:
        recent.map(s=>{
          const muscles = sessionMuscles(s.exercises);
          const prCount = state.prs.filter(p=>p.workoutId===s.id).length;
          return `<div class="history-row" style="align-items:flex-start;cursor:pointer;" data-view-session="${s.id}">
          <div>
            <div style="font-weight:800;font-size:16px;">${sessionTitle(s)}</div>
            <div style="font-size:13px;color:var(--muted);margin-top:1px;">${s.exercises.length} exercise${s.exercises.length!==1?'s':''}${s.durationMin?` · ${workoutDurationLabel(s)}`:''}${prCount?` · 🏆 ${prCount} PR${prCount>1?'s':''}`:''}</div>
            <div class="mono" style="font-size:12px;color:var(--muted);margin-top:2px;">${s.date}${s.volume?` · ${displayW(s.volume,0).toLocaleString()} ${wUnit()} vol`:''}</div>
            <div style="margin-top:5px;">${muscles.map(m=>`<span class="muscle-chip">${m}</span>`).join("")}</div>
          </div>
          <button class="del" data-del-session="${s.id}" aria-label="Delete workout">${svg('x',14)}</button>
        </div>`;}).join("")}
    `;
  };
})();
