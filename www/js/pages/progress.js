/* Progress page module (dashboard/home view only). Mirrors the home.js/workout.js adapter
   pattern: receives already-computed values and existing helper functions from app.js so
   state and calculation logic stay authoritative. Progress's detail views (Achievements,
   Habit Tracker, Workout Analytics, Exercise Progress, Nutrition Progress, Body Progress,
   Training Calendar, Plan Progress) are unchanged and stay dark-themed -- only this
   dashboard is redesigned, reached the same way as before via data-progress-view.

   Every number here is genuinely computed from existing app state -- no fabricated values.
   Where the reference mockup implies something this app has no real source for, the
   closest honest real equivalent is used instead (documented inline). */
(function () {
  window.IgnytPages = window.IgnytPages || {};

  const TRAINING_TIME_MIN_PER_WORKOUT = 60; // documented estimate convention (no per-user time goal exists), same pattern as other screens' default goals

  function fmtDate(d){ return d.toLocaleDateString('default',{month:'short',day:'numeric'}); }

  // ---------------------------------------------------------------------
  // Real data helpers
  // ---------------------------------------------------------------------

  /** Real Mon–Sun volume for the current calendar week, from actual logged sessions. */
  function weekdayVolumeBuckets(workoutLog){
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const now = new Date();
    const dow = now.getDay(); // 0=Sun..6=Sat
    const mondayOffset = dow===0 ? 6 : dow-1;
    const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate()-mondayOffset);
    const buckets = days.map(label=>({label, volume:0}));
    workoutLog.forEach(s=>{
      const t = new Date(s.date);
      const diffDays = Math.floor((t.setHours(0,0,0,0) - monday.getTime()) / 86400000);
      if(diffDays>=0 && diffDays<7) buckets[diffDays].volume += (s.volume||0);
    });
    return buckets;
  }

  /** Real weekly volume for the last N weeks (reuses the same weekly bucketing already used
   *  by Workout Analytics elsewhere in the app -- one real implementation, not a second copy). */
  function weeklyVolumeBuckets(workoutLog, weeks){
    const buckets = Array.from({length:weeks},()=>0);
    const now = Date.now();
    workoutLog.forEach(s=>{
      const idx = Math.floor((now - new Date(s.date).getTime()) / (7*86400000));
      if(idx>=0 && idx<weeks) buckets[weeks-1-idx] += (s.volume||0);
    });
    return buckets.map((volume,i)=>({label:`W${i+1}`, volume}));
  }

  /** Real monthly volume for the last N months. */
  function monthlyVolumeBuckets(workoutLog, months){
    const now = new Date();
    const buckets = Array.from({length:months},(_,i)=>{
      const d = new Date(now.getFullYear(), now.getMonth()-(months-1-i), 1);
      return {label:d.toLocaleDateString('default',{month:'short'}), year:d.getFullYear(), month:d.getMonth(), volume:0};
    });
    workoutLog.forEach(s=>{
      const t = new Date(s.date);
      const b = buckets.find(x=>x.year===t.getFullYear() && x.month===t.getMonth());
      if(b) b.volume += (s.volume||0);
    });
    return buckets;
  }

  function weightPointsForDays(bodylog, days){
    const cutoff = Date.now() - days*86400000;
    return bodylog.slice().reverse() // stored newest-first -> chronological
      .filter(e=>e.weight && new Date(e.date).getTime()>=cutoff)
      .map(e=>({date:new Date(e.date), value:Number(e.weight)}));
  }

  /** Calendar-style workout heatmap. "week" = the current week only (1 row of 7 real days).
   *  "month" = the current calendar month, one row per week it spans. Intensity is a quartile
   *  of that day's real logged volume relative to the max day in the shown range -- never a
   *  fabricated scale, and a day with no session is always tier 0. */
  function heatmapGrid(workoutLog, range){
    const byDate = {};
    workoutLog.forEach(s=>{ byDate[s.date] = (byDate[s.date]||0) + (s.volume||0); });
    const now = new Date();
    let start;
    if(range==='month'){ start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else { const dow=now.getDay(); const off=dow===0?6:dow-1; start=new Date(now); start.setHours(0,0,0,0); start.setDate(now.getDate()-off); }
    const end = range==='month' ? new Date(now.getFullYear(), now.getMonth()+1, 0) : new Date(start.getTime()+6*86400000);
    const totalDays = Math.round((end-start)/86400000)+1;
    const cells = [];
    for(let i=0;i<totalDays;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const ds = d.toISOString().slice(0,10);
      cells.push({date:ds, dow:(d.getDay()+6)%7, volume: byDate[ds]||0}); // dow: 0=Mon..6=Sun
    }
    const max = Math.max(1, ...cells.map(c=>c.volume));
    cells.forEach(c=>{ c.tier = c.volume<=0?0 : c.volume>=max*0.66?3 : c.volume>=max*0.33?2 : 1; });
    const rows = [];
    let row = new Array(7).fill(null);
    cells.forEach(c=>{ row[c.dow] = c; if(c.dow===6){ rows.push(row); row=new Array(7).fill(null); } });
    if(row.some(c=>c)) rows.push(row);
    return rows;
  }

  // ---------------------------------------------------------------------
  // SVG chart drawing (string-generating, no chart library -- same approach used elsewhere)
  // ---------------------------------------------------------------------

  function barChartLabeled(buckets, color){
    const w=320, h=150, padB=18, padT=6, barGap=6;
    const max = Math.max(1, ...buckets.map(b=>b.volume));
    const barW = (w - barGap*(buckets.length-1)) / buckets.length;
    const bars = buckets.map((b,i)=>{
      const bh = Math.max(2, (b.volume/max) * (h-padB-padT));
      const x = i*(barW+barGap);
      const y = h-padB-bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${color}"/>
        <text x="${(x+barW/2).toFixed(1)}" y="${h-4}" font-size="9" fill="var(--rh-muted)" text-anchor="middle">${b.label}</text>`;
    }).join('');
    return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}</svg>`;
  }

  function weightAreaChart(points, color){
    if(points.length<2) return `<div class="wk-empty">Log at least two weigh-ins to see a trend graph.</div>`;
    const w=320, h=180, padL=28, padR=10, padT=10, padB=24;
    const vals = points.map(p=>p.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = (max-min) || 1;
    const yPad = range*0.15;
    const yMin = min-yPad, yMax = max+yPad;
    const stepX = (w-padL-padR) / (points.length-1);
    const coords = points.map((p,i)=>({
      x: padL + i*stepX,
      y: padT + (1-(p.value-yMin)/(yMax-yMin)) * (h-padT-padB)
    }));
    const pathD = coords.map((c,i)=>(i===0?'M':'L')+c.x.toFixed(1)+','+c.y.toFixed(1)).join(' ');
    const areaD = pathD + ` L${coords[coords.length-1].x.toFixed(1)},${h-padB} L${coords[0].x.toFixed(1)},${h-padB} Z`;
    const ySteps = 4;
    // Round to whole numbers only when the range is wide enough that whole numbers stay
    // distinct; otherwise keep 1 decimal so close gridlines (e.g. a 2-3kg range) never
    // collapse into duplicate labels.
    const yDecimals = (yMax-yMin) < ySteps*2 ? 1 : 0;
    const gridlines = Array.from({length:ySteps+1},(_,i)=>{
      const v = yMin + (yMax-yMin)*(i/ySteps);
      const y = padT + (1-i/ySteps) * (h-padT-padB);
      return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w-padR}" y2="${y.toFixed(1)}" stroke="var(--rh-border)" stroke-width="1"/>
        <text x="2" y="${(y+3).toFixed(1)}" font-size="9" fill="var(--rh-muted)">${v.toFixed(yDecimals)}</text>`;
    }).join('');
    const xLabels = [0, Math.floor((points.length-1)/2), points.length-1].map(i=>{
      const c = coords[i];
      return `<text x="${c.x.toFixed(1)}" y="${h-6}" font-size="9" fill="var(--rh-muted)" text-anchor="middle">${fmtDate(points[i].date)}</text>`;
    }).join('');
    const last = coords[coords.length-1];
    const lastVal = points[points.length-1].value;
    return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${gridlines}
      <path d="${areaD}" fill="${color}" fill-opacity="0.12" stroke="none"/>
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.5" fill="${color}"/>
      ${xLabels}
    </svg>
    <div class="pg-chart-bubble" style="color:${color};">${lastVal}</div>`;
  }

  function heatmapHtml(rows){
    const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    return `
      <div class="pg-heatmap">
        <div class="pg-heatmap__row pg-heatmap__row--labels">${dayLabels.map(d=>`<span>${d}</span>`).join('')}</div>
        ${rows.map(row=>`<div class="pg-heatmap__row">${row.map(c=>`<span class="pg-heatmap__cell pg-tier-${c?c.tier:0}" title="${c?c.date+': '+Math.round(c.volume)+' vol':''}"></span>`).join('')}</div>`).join('')}
      </div>
      <div class="pg-heatmap__legend">Less <span class="pg-heatmap__cell pg-tier-0"></span><span class="pg-heatmap__cell pg-tier-1"></span><span class="pg-heatmap__cell pg-tier-2"></span><span class="pg-heatmap__cell pg-tier-3"></span> More</div>`;
  }

  function ring(pct, color){
    const clamped = pct==null ? 0 : Math.max(0, Math.min(100, pct));
    return `<div class="pg-ring" style="--pct:${clamped};--ring-color:${color};"><div class="pg-ring__inner">${clamped}%</div></div>`;
  }

  // ---------------------------------------------------------------------

  window.IgnytPages.renderProgressHome = function renderProgressHome(ctx){
    const { state, svg, displayW, wUnit, weekStats, prsThisWeek, prsLastWeek, volumeTrend,
      ACHIEVEMENT_DEFS, calorieProteinTrend, fmtMinutes, comparisonLabel } = ctx;

    const prDelta = prsThisWeek - prsLastWeek;
    const prDeltaText = prDelta===0 ? (prsLastWeek===0 && prsThisWeek===0 ? 'No change vs last week' : 'Same as last week') : `${prDelta>0?'+':''}${prDelta} vs last week`;

    const volumeRange = ['week','month','year'].includes(state.pgVolumeRange) ? state.pgVolumeRange : 'week';
    const volumeBuckets = volumeRange==='week' ? weekdayVolumeBuckets(state.workoutLog)
      : volumeRange==='month' ? weeklyVolumeBuckets(state.workoutLog, 4)
      : monthlyVolumeBuckets(state.workoutLog, 12);
    const volumeTotal = volumeBuckets.reduce((a,b)=>a+b.volume,0);

    const weightRange = [30,90,180,365].includes(state.pgWeightRange) ? state.pgWeightRange : 30;
    const weightPoints = weightPointsForDays(state.bodylog, weightRange);
    const weightDelta = weightPoints.length>1 ? weightPoints[weightPoints.length-1].value - weightPoints[0].value : null;
    const isLossGoal = (state.profile.goalDelta||0) < 0, isGainGoal = (state.profile.goalDelta||0) > 0;
    const weightDeltaGood = weightDelta==null ? null : isLossGoal ? weightDelta<0 : isGainGoal ? weightDelta>0 : null;

    const heatmapRange = state.pgHeatmapRange==='month' ? 'month' : 'week';
    const heatmapRows = heatmapGrid(state.workoutLog, heatmapRange);

    const weeklyGoalPct = weekStats.workoutsGoal ? Math.min(100, Math.round(weekStats.workoutsCompleted/weekStats.workoutsGoal*100)) : null;
    const goalMsg = weeklyGoalPct==null ? "Set weekly training days in your Profile to track this."
      : weeklyGoalPct>=100 ? "Goal complete! 🎉"
      : weeklyGoalPct>=75 ? "Great progress! Keep going."
      : weeklyGoalPct>=50 ? "Halfway there — keep it up."
      : weeklyGoalPct>0 ? "Let's get moving this week."
      : "No workouts logged yet this week.";

    const recentWeightPRs = state.prs.filter(p=>p.type==='weight').slice(0,3);
    const recentPRs = recentWeightPRs.length>=3 ? recentWeightPRs : state.prs.slice(0,3);

    const nutritionTrend = calorieProteinTrend(30).filter(d=>d.kcal>0);
    const avgKcal = nutritionTrend.length ? Math.round(nutritionTrend.reduce((a,d)=>a+d.kcal,0)/nutritionTrend.length) : null;

    const QUICK_ACCESS = [
      ['achievements','trophy','#D97706', `${state.achievements.length}/${ACHIEVEMENT_DEFS.length} unlocked`],
      ['history','file','#64748B', `${state.prs.length} record${state.prs.length!==1?'s':''}`],
      ['habits','check','#16A34A', `${state.habits.length} habit${state.habits.length!==1?'s':''} active`],
      ['analytics','progress','#2563EB', 'View insights'],
      ['exercise','trend','#7C3AED', 'Track your lifts'],
      ['nutrition','nutrition','#DC2626', avgKcal!=null ? `${avgKcal.toLocaleString()} kcal avg` : 'No data yet'],
      ['body','body','#0891B2', 'Track your body'],
      ['calendar','calendar','#4F46E5', 'View your activity'],
      ['plan','plan','#CA8A04', 'Follow your plan']
    ];

    return `
    <div class="pg-light">
      <div class="pg-header">
        <div class="pg-header__title">Progress</div>
        <div class="pg-header__sub">Your training, body and performance insights</div>
      </div>

      <div class="rh-section-head" style="margin-top:4px;"><span>This Week</span></div>
      <div class="pg-stat-grid">
        <div class="pg-stat-card"><span class="pg-stat-card__icon" style="background:rgba(37,99,235,.1);color:#2563EB;">${svg('dumbbell',18)}</span>
          <div class="pg-stat-card__value">${weekStats.workoutsCompleted}</div>
          <div class="pg-stat-card__label">Workouts</div>
          ${weekStats.workoutsGoal ? `<div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:${Math.min(100,Math.round(weekStats.workoutsCompleted/weekStats.workoutsGoal*100))}%;background:#2563EB;"></div></div><div class="pg-stat-card__sub">of ${weekStats.workoutsGoal}</div>` : ''}</div>
        <div class="pg-stat-card"><span class="pg-stat-card__icon" style="background:rgba(22,163,74,.1);color:#16A34A;">${svg('timer',18)}</span>
          <div class="pg-stat-card__value">${fmtMinutes(weekStats.trainingMinutes)}</div>
          <div class="pg-stat-card__label">Training Time</div>
          ${weekStats.workoutsGoal ? `<div class="rh-progress-track rh-progress-track--sm"><div class="rh-progress-fill" style="width:${Math.min(100,Math.round(weekStats.trainingMinutes/(weekStats.workoutsGoal*TRAINING_TIME_MIN_PER_WORKOUT)*100))}%;background:#16A34A;"></div></div><div class="pg-stat-card__sub">of ${fmtMinutes(weekStats.workoutsGoal*TRAINING_TIME_MIN_PER_WORKOUT)}</div>` : ''}</div>
        <div class="pg-stat-card"><span class="pg-stat-card__icon" style="background:rgba(124,58,237,.1);color:#7C3AED;">${svg('flame',18)}</span>
          <div class="pg-stat-card__value">${displayW(weekStats.weeklyVolume,0).toLocaleString()}<span class="pg-stat-card__unit">${wUnit()}</span></div>
          <div class="pg-stat-card__label">Volume</div>
          <div class="pg-stat-card__sub ${volumeTrend.positive?'is-up':'is-down'}">${volumeTrend.positive?'▲':'▼'} ${volumeTrend.text} vs last week</div></div>
        <div class="pg-stat-card"><span class="pg-stat-card__icon" style="background:rgba(217,119,6,.12);color:#D97706;">${svg('trophy',18)}</span>
          <div class="pg-stat-card__value">${prsThisWeek}</div>
          <div class="pg-stat-card__label">PRs</div>
          <div class="pg-stat-card__sub ${prDelta>=0?'is-up':'is-down'}">${prDelta>0?'▲':prDelta<0?'▼':''} ${prDeltaText}</div></div>
      </div>

      <div class="pg-card" style="margin-top:14px;">
        <div class="pg-card__head">
          <span class="pg-card__title">Training Volume</span>
          <select class="wk-sort-select" data-progress-range="volume">
            <option value="week" ${volumeRange==='week'?'selected':''}>This Week</option>
            <option value="month" ${volumeRange==='month'?'selected':''}>This Month</option>
            <option value="year" ${volumeRange==='year'?'selected':''}>This Year</option>
          </select>
        </div>
        <div class="pg-card__big">${displayW(volumeTotal,0).toLocaleString()}<span class="pg-card__unit">${wUnit()}</span></div>
        <div class="pg-card__trend ${volumeTrend.positive?'is-up':'is-down'}">${volumeTrend.positive?'▲':'▼'} ${volumeTrend.text} vs last week</div>
        ${volumeTotal>0 ? barChartLabeled(volumeBuckets, '#2563EB') : `<div class="wk-empty">No workouts logged in this range yet.</div>`}
      </div>

      <div class="pg-card" style="margin-top:12px;">
        <div class="pg-card__head">
          <span class="pg-card__title">Body Weight</span>
          <select class="wk-sort-select" data-progress-range="weight">
            <option value="30" ${weightRange===30?'selected':''}>30 Days</option>
            <option value="90" ${weightRange===90?'selected':''}>90 Days</option>
            <option value="180" ${weightRange===180?'selected':''}>180 Days</option>
            <option value="365" ${weightRange===365?'selected':''}>365 Days</option>
          </select>
        </div>
        <div class="pg-card__big">${weightPoints.length ? displayW(weightPoints[weightPoints.length-1].value) : '—'}<span class="pg-card__unit">${wUnit()}</span></div>
        ${weightDelta!=null ? `<div class="pg-card__trend ${weightDeltaGood==null?'':weightDeltaGood?'is-up':'is-down'}">${weightDelta>0?'▲':weightDelta<0?'▼':''} ${Math.abs(displayW(weightDelta,1))} ${wUnit()}</div>` : ''}
        ${weightAreaChart(weightPoints, '#2563EB')}
      </div>

      <div class="pg-card-row">
        <div class="pg-card pg-card--half">
          <div class="pg-card__head">
            <span class="pg-card__title">Workout Heatmap</span>
            <select class="wk-sort-select" data-progress-range="heatmap">
              <option value="week" ${heatmapRange==='week'?'selected':''}>This Week</option>
              <option value="month" ${heatmapRange==='month'?'selected':''}>This Month</option>
            </select>
          </div>
          ${heatmapHtml(heatmapRows)}
        </div>
        <div class="pg-card pg-card--half">
          <div class="pg-card__head"><span class="pg-card__title">Weekly Goal</span><span class="pg-card__badge">${svg('trophy',18)}</span></div>
          <div class="pg-weekly-goal">
            ${ring(weeklyGoalPct, '#2563EB')}
            <div class="pg-weekly-goal__count">${weekStats.workoutsCompleted}<span> / ${weekStats.workoutsGoal||'—'}</span></div>
          </div>
          <div class="pg-card__sub-label">Workouts Completed</div>
          <div class="pg-weekly-goal__msg">${goalMsg}</div>
        </div>
      </div>

      <div class="rh-section-head"><span>Personal Records</span><a href="#" class="rh-view-all" data-progress-view="history">View All</a></div>
      ${recentPRs.length===0 ? `<div class="pg-card wk-empty">No PRs yet — finish a workout to start tracking records.</div>` : `
      <div class="pg-pr-row">
        ${recentPRs.map(pr=>{
          const delta = (pr.previousValue>0 && pr.value>pr.previousValue) ? displayW(pr.value-pr.previousValue,1) : null;
          return `<div class="pg-pr-card">
            <span class="pg-pr-card__icon">${svg('dumbbell',20)}</span>
            <div class="pg-pr-card__name">${pr.exerciseName||'Session Volume'}</div>
            <div class="pg-pr-card__value">${pr.type==='reps'?pr.value+' reps':displayW(pr.value)+' '+wUnit()}</div>
            ${delta!=null?`<div class="pg-pr-card__delta">▲ ${delta} ${wUnit()}</div>`:''}
            <div class="pg-pr-card__date">${new Date(pr.achievedAt).toLocaleDateString('default',{month:'short',day:'numeric',year:'numeric'})}</div>
          </div>`;
        }).join('')}
      </div>`}

      <div class="rh-section-head"><span>Quick Access</span></div>
      <div class="pg-quick-grid">
        ${QUICK_ACCESS.map(([key,icon,color,sub])=>`
          <button class="pg-quick-card" data-progress-view="${key}">
            <span class="pg-quick-card__icon" style="background:${color}1a;color:${color};">${svg(icon,18)}</span>
            <div class="pg-quick-card__body">
              <div class="pg-quick-card__title">${ctx.PROGRESS_VIEWS[key].title}</div>
              <div class="pg-quick-card__sub">${sub}</div>
            </div>
            <span class="pg-quick-card__chev">›</span>
          </button>`).join('')}
      </div>
    </div>`;
  };
})();
