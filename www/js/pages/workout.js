/* Workout page module (list/idle view only). Mirrors the home.js adapter pattern:
   receives already-computed values and existing renderer/helper functions from app.js
   so state, PR logic, and session data stay authoritative during incremental extraction.
   The active-session renderer (sets, supersets, rest timer, plate calc) is large and
   deeply stateful — left in app.js and extracted in a later, dedicated pass. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  window.IgnytPages.renderWorkoutList = function renderWorkoutList(ctx) {
    const { state, svg, renderPRCelebration, sessionMuscles, sessionTitle,
      workoutDurationLabel, displayW, wUnit } = ctx;
    const showAll = state.showAllSessions;
    const recent = showAll ? state.workoutLog : state.workoutLog.slice(0, 5);

    return `
      ${state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ""}
      <button class="btn btn-accent btn-block" data-action="start-session" style="margin-top:4px;">${svg('plus',16)} Start Empty Workout</button>
      <div style="font-size:11px;color:var(--muted);margin:8px 0 0;text-align:center;">Looking for your routines? They've moved to the <b style="color:var(--text);">Plan</b> tab.</div>

      <div class="section-heading">
        <span class="section-heading__label">Recent Sessions</span>
        ${state.workoutLog.length>5 ? `<button class="btn btn-ghost" data-action="toggle-show-all-sessions" style="padding:4px 10px;font-size:11px;">${showAll?'Show Less':'Show All ('+state.workoutLog.length+')'}</button>` : ""}
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
