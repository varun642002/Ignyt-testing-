/* Workout page module (list/idle view only). Mirrors the home.js adapter pattern:
   receives already-computed values and existing renderer/helper functions from app.js
   so state, PR logic, and session data stay authoritative during incremental extraction.
   The active-session renderer (sets, supersets, rest timer, plate calc) is large and
   deeply stateful — left in app.js and extracted in a later, dedicated pass.

   Order: Quick Actions, then routines, then Recent Sessions. Do, choose, review.
   choose, review. The This Week stat grid used to lead -- workouts, total time, PRs and volume
   against last week -- but that is a report, and this is the screen someone opens to start
   training. Those four figures live on Progress, which is where you go to read them.

   Light "premium reference" styling: routine cards with a real
   per-routine completion ring, recent sessions -- using the same light design system
   introduced for Home (see home.css's --rh-* tokens, duplicated locally here so this module
   stays self-contained). Every value is genuinely sourced from existing app state -- no
   fabricated numbers, no invented charts. */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  const CATEGORY_COLOR = { Push:'#2563EB', Pull:'#16A34A', Legs:'#7C3AED', Upper:'#EA580C', Lower:'#2563EB' };

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

  /* The muscles a routine trains, from the same getMuscle() the rest of the app uses rather
     than a second table. Deduped and capped at three: a card listing eight muscle groups has
     stopped summarising and started transcribing.

     "Other" is dropped. It is getMuscle's answer for anything unmapped, and printing it tells
     the reader nothing while looking like a real group. */
  function routineMuscles(r, getMuscle) {
    if (!getMuscle) return [];
    const seen = [];
    for (const ex of (r.exercises || [])) {
      const m = getMuscle(ex.name);
      if (m && m !== 'Other' && seen.indexOf(m) === -1) seen.push(m);
      if (seen.length === 3) break;
    }
    return seen;
  }

  /* Personal records set in the last session of this routine. Counted from state.prs by that
     session's id, which is how the rest of the app attributes them — not recomputed from the
     lifts, which would be a second definition of what a PR is. */
  function prsInSession(state, session) {
    if (!session || !state.prs) return 0;
    return state.prs.filter(p => p.workoutId === session.id).length;
  }

  function completionRing(pct, color) {
    const clamped = pct == null ? 0 : Math.max(0, Math.min(100, pct));
    return `<div class="wk-ring" style="--pct:${clamped};--ring-color:${color};">
      <div class="wk-ring__inner">${pct == null ? '—' : pct + '%'}</div>
    </div>`;
  }

  window.IgnytPages.renderWorkoutList = function renderWorkoutList(ctx) {
    /* week / weekStats / prsThisWeek / volumeTrend / todayMuscles / routineEstimatedMinutes went
       with the This Week grid. app.js still passes them and other screens still use them; this
       one simply stopped asking. */
    const { state, svg, renderPRCelebration, renderPlanCard, renderRoutineBuilder, sessionMuscles, sessionTitle,
      workoutDurationLabel, displayW, wUnit, plannedDay, escHtml, getMuscle, routineEstimatedMinutes } = ctx;

    const showAll = state.showAllSessions;
    const recent = showAll ? state.workoutLog : state.workoutLog.slice(0, 2);

    /* The Push/Pull/Legs/Upper/Lower/Favorites chips are gone, so there is no longer any way
       to CHANGE this filter — which means a value left behind by an older build would hide
       most of someone's routines permanently, with no control on screen to clear it. Reset it
       once, here, rather than leaving a trap in stored state. Sorting is unaffected and its
       control remains. */
    if (state.workoutRoutineFilter && state.workoutRoutineFilter !== 'All') {
      state.workoutRoutineFilter = 'All';
    }
    const sort = state.workoutRoutineSort || 'recent';
    let routines = state.routines.slice();
    if (sort === 'name') routines.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'exercises') routines.sort((a, b) => b.exercises.length - a.exercises.length);
    // "recent" = existing stored order (newest-created/edited first) -- no change needed.


    /* ---- ROUTINE FOLDERS ----------------------------------------------------------------
       Folders are a grouping over the SAME routine list, not a second store. A routine carries
       folderId; anything without one — or pointing at a folder that has since been deleted —
       lands in the ungrouped bucket. That fallback is the reason deleting a folder can never
       delete routines, which is the one behaviour a folder feature must not get wrong.

       Sorting still applies WITHIN a group, so the sort control keeps meaning what it says. */
    /* IDS ARE COMPARED AS STRINGS, ALWAYS.
       nextId() returns a number, but the moment an id goes into markup as a data- attribute it
       comes back out of dataset as a string, so `folder.id === el.dataset.folderToggle` is false
       for every folder that ever existed. That mismatch silently killed the collapse caret, the
       ••• menu, rename, delete and move-to-folder — each one looked up a numeric id with a string
       and found nothing. Normalising both sides here and at every handler is the fix; comparing
       raw is the bug. */
    const sameId = (a, b) => a != null && b != null && String(a) === String(b);
    const folders = (state.routineFolders || []).slice();
    const folderIds = new Set(folders.map(f => String(f.id)));
    const inFolder = id => routines.filter(r => sameId(r.folderId, id));
    const ungrouped = routines.filter(r => r.folderId == null || !folderIds.has(String(r.folderId)));

    const routineCard = r => {
            const last = lastSessionForRoutine(state, r.name);
            const pct = last ? sessionCompletionPct(last) : null;
            const color = r.category ? CATEGORY_COLOR[r.category] : '#64748B';
            /* WHAT THIS CARD DOES NOT SHOW, and why. The brief asks for estimated calories and
               a difficulty rating. Neither has a source in this app: calories from resistance
               work depend on bodyweight, rest and intensity that nothing here records, and
               "difficulty" would be a number invented from exercise count. A fabricated figure
               on a card people use to choose their training is worse than a missing one — so
               they are omitted, which is the same rule the rest of this file already follows.

               Everything below is real: muscles from the app's own getMuscle(), minutes from
               routineEstimatedMinutes(), PRs counted from state.prs by session id. */
            const muscles = routineMuscles(r, getMuscle);
            const prCount = prsInSession(state, last);
            const estMin = (!last && routineEstimatedMinutes) ? routineEstimatedMinutes(r) : null;
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
                  ${last ? `<span>${svg('timer',13)} ${workoutDurationLabel(last)}</span>`
                         : (estMin ? `<span>${svg('timer',13)} ~${estMin} min</span>` : '')}
                  ${last && last.volume ? `<span>${svg('flame',13)} ${displayW(last.volume,0).toLocaleString()} ${wUnit()}</span>` : ''}
                  ${prCount ? `<span class="wk-pr-flag">${svg('trophy',13)} ${prCount} PR${prCount>1?'s':''}</span>` : ''}
                </div>
                ${muscles.length ? `<div class="wk-routine-card__muscles">${
                  muscles.map(m => `<span class="wk-muscle" style="--m:${color};">${escHtml(m)}</span>`).join('')
                }</div>` : ''}
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
                <button class="del" data-edit-routine="${r.id}" aria-label="Edit routine">${svg('pencil',16)}</button>
                <button class="del" data-dup-routine="${r.id}" aria-label="Duplicate routine">${svg('copy',16)}</button>
                <button class="del" data-move-routine="${r.id}" aria-label="Move to folder" title="Move to folder">${svg('plan',16)}</button>
                <button class="del" data-del-routine="${r.id}" aria-label="Delete routine">${svg('x',16)}</button>
              </div>
              ${sameId(state.moveRoutineFor, r.id) ? `<div class="wk-move">
                <div class="wk-move__title">Move to</div>
                ${(state.routineFolders||[]).map(f => `<button data-move-to="${f.id}"${sameId(r.folderId, f.id)?' class="is-on"':''}>${escHtml(f.name)}</button>`).join('')}
                <button data-move-to="__none"${!r.folderId?' class="is-on"':''}>My Routines</button>
                ${!(state.routineFolders||[]).length ? `<div class="wk-move__none">No folders yet — make one with + above.</div>` : ''}
              </div>` : ''}
              <button class="wk-routine-card__start" data-start-routine="${r.id}" aria-label="Start ${escHtml(r.name)}">▶</button>
            </div>`;
    };

    function groupBlock(key, label, list, isFolder) {
      const collapsed = isFolder
        ? !!(folders.find(f => sameId(f.id, key)) || {}).collapsed
        : !!state.ungroupedCollapsed;
      return `<div class="wk-folder" data-folder="${key}">
        <div class="wk-folder__head">
          <button class="wk-folder__toggle" data-folder-toggle="${key}"
                  aria-expanded="${collapsed ? 'false' : 'true'}">
            <span class="wk-folder__caret${collapsed ? '' : ' is-open'}">▶</span>
            <span class="wk-folder__name">${escHtml(label)}</span>
            <span class="wk-folder__count">(${list.length})</span>
          </button>
          ${isFolder ? `<button class="wk-folder__menu" data-folder-menu="${key}" aria-label="Folder options">•••</button>` : ''}
        </div>
        ${isFolder && sameId(state.folderMenuFor, key) ? `<div class="wk-folder__actions">
          <button data-folder-rename="${key}">Rename</button>
          <button data-folder-delete="${key}" class="is-danger">Delete folder</button>
        </div>` : ''}
        ${collapsed ? '' : `<div class="wk-folder__body" id="${isFolder ? 'folder-' + key : 'routine-card-list'}">` +
          (list.length ? list.map(routineCard).join('')
                       : `<div class="rh-card wk-empty wk-folder__empty">Empty — move a routine in from its ••• menu.</div>`) +
          `</div>`}
      </div>`;
    }

    function renderRoutineGroups() {
      if (!routines.length && !folders.length) {
        return `<div class="rh-card wk-empty">No routines saved yet — build one to start logging faster.</div>`;
      }
      /* Folders first, then whatever is not in one. The ungrouped block only gets a header when
         a folder exists — with no folders there is nothing to distinguish it from, and a lone
         "My Routines" header over the whole list is noise. */
      const blocks = folders.map(f => groupBlock(f.id, f.name, inFolder(f.id), true));
      if (folders.length) {
        blocks.push(groupBlock('__ungrouped', 'My Routines', ungrouped, false));
      } else {
        return `<div id="routine-card-list">` + ungrouped.map(routineCard).join('') + `</div>`;
      }
      return blocks.join('');
    }

    return `
      <div class="wk-light">
        ${renderPRCelebration && state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ''}


        ${/* The This Week stat grid -- workouts, total time, PRs, volume vs last week -- was
              the first thing on this screen. It is a report, and this screen is for starting a
              session: the four figures are all on Progress, which is where someone goes to
              read them. Quick Actions leads now, then routines, then what was logged recently.
              Order: do, then choose, then review. */''}
        ${/* Today's plan leads. This screen is for starting a session, and the plan is the
              answer to the question someone opens it with. Quick Actions still sits directly
              under it for anyone who wants to do something else. Renders nothing at all when
              there is no plan, rather than an empty-state card taking the best space on the
              screen to say "no plan yet". */''}
        ${renderPlanCard ? renderPlanCard() : ''}

        <div class="rh-section-head"><span>Quick Actions</span></div>
        ${/* Four cards in a four-column grid — the grid always expected four and had three, so
              Recommendation fills the empty slot rather than forcing a reflow. */''}
        <div class="wk-quick-grid">
          <button class="rh-quick-card" data-action="toggle-routine-builder">${svg('plus',20)}<span>New Routine</span></button>
          <button class="rh-quick-card" data-nav="library">${svg('library',20)}<span>Library</span></button>
          <button class="rh-quick-card" data-nav="recommendation">${svg('target',20)}<span>Recommendation</span></button>
        </div>
        ${/* Start Empty leaves the grid and becomes a full-width button beneath it. It is not a
             shortcut to a screen like the other three -- it STARTS something -- so a tile that
             looks identical to its neighbours understated it. Pulling it out also drops the grid
             from four columns to three, which is what stops "Recommendation" wrapping mid-word:
             a third of the width fits it, a quarter did not. */''}
        <button class="wk-start-empty" data-action="start-session">
          ${svg('workout',18)}<span>Start Empty Workout</span>
        </button>

        ${state.routineBuilder ? renderRoutineBuilder() : ''}

        <div class="rh-section-head">
          <span>Routines</span>
          <div class="wk-routine-tools">
            <select id="workout-routine-sort" class="wk-sort-select">
              <option value="recent" ${sort==='recent'?'selected':''}>Sort: Recent</option>
              <option value="name" ${sort==='name'?'selected':''}>Sort: Name</option>
              <option value="exercises" ${sort==='exercises'?'selected':''}>Sort: Exercises</option>
            </select>
            <button class="wk-folder-add" data-action="new-routine-folder" aria-label="New folder" title="New folder">${svg('plus',16)}</button>
          </div>
        </div>
        ${renderRoutineGroups()}

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
              <div class="wk-session-row__meta">${s.exercises.length} exercise${s.exercises.length!==1?'s':''}${s.durationMin?` · ${workoutDurationLabel(s)}`:''}${prCount?` · ${svg('trophy',12)} ${prCount} PR${prCount>1?'s':''}`:''}</div>
              <div class="wk-session-row__date">${s.date}${s.volume?` · ${displayW(s.volume,0).toLocaleString()} ${wUnit()} vol`:''}</div>
              <div style="margin-top:5px;">${muscles.map(m=>`<span class="muscle-chip">${m}</span>`).join("")}</div>
            </div>
            <button class="del" data-del-session="${s.id}" aria-label="Delete workout">${svg('x',14)}</button>
          </div>`;}).join("")}
      </div>
    `;
  };
})();
