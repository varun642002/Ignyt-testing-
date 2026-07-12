import { BODY_MUSCLES, RADAR_MUSCLES } from './constants.js';
import { displayW, svg } from './utils.js';
import { activityDates, computeMuscleDistributionFine, weekRange } from './workout.js';

/* =========================================================
   CHARTS — reusable chart-rendering primitives (sparkline, weekly bars,
   muscle-distribution radar, calendar heatmap).
========================================================= */

export function renderBodyDistribution(weekOffset){
  const { start, end } = weekRange(weekOffset);
  const dates = activityDates();
  const todayStr0 = new Date().toISOString().slice(0,10);
  const dayLabels = ["M","T","W","T","F","S","S"];
  let strip = "";
  for(let i=0;i<7;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const dStr = d.toISOString().slice(0,10);
    const active = dates.has(dStr);
    const isToday = dStr===todayStr0;
    strip += `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
      <span style="font-size:10px;color:var(--muted);font-weight:700;">${dayLabels[i]}</span>
      <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:800;font-family:'SF Mono',monospace;
        background:${active?'var(--accent)':'transparent'};
        color:${active?'#151515':'var(--muted)'};
        ${isToday && !active?'box-shadow:inset 0 0 0 1.5px var(--steel);color:var(--steel);':''}">${d.getDate()}</div>
    </div>`;
  }
  const rangeLabel = `${start.toLocaleDateString('default',{day:'2-digit',month:'short'})} – ${new Date(end.getTime()-86400000).toLocaleDateString('default',{day:'2-digit',month:'short',year:'numeric'})}`;

  const counts = computeMuscleDistributionFine(start.getTime(), end.getTime());
  const totalSets = Object.values(counts).reduce((a,b)=>a+b,0);

  return `
    <div class="row-between" style="margin-bottom:12px;">
      <button class="btn btn-ghost" data-bodydist-nav="1" style="padding:6px 12px;">‹</button>
      <span class="mono" style="font-size:12px;font-weight:700;color:var(--text);">${rangeLabel}</span>
      <button class="btn btn-ghost" data-bodydist-nav="-1" style="padding:6px 12px;" ${weekOffset<=0?'disabled':''}>›</button>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:18px;">${strip}</div>
    <div style="display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;">
      <span>Muscle</span><span>Sets</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:10px 2px;border-bottom:1px solid var(--border);">
      <span style="font-weight:800;font-size:14px;">Total</span><span class="mono" style="font-weight:800;color:var(--accent);">${totalSets}</span>
    </div>
    ${BODY_MUSCLES.map(m=>`<div style="display:flex;justify-content:space-between;padding:9px 2px;border-bottom:1px solid var(--border);">
      <span style="font-size:13px;color:${counts[m]>0?'var(--text)':'var(--muted)'};">${m}</span>
      <span class="mono" style="font-size:13px;color:${counts[m]>0?'var(--steel)':'var(--muted)'};">${counts[m]}</span>
    </div>`).join("")}
  `;
}

/* Actual values for "this week" (rolling last 7 days, consistent with computeWeeklyActivity's
   bucketing below). Never invents a goal -- the only target shown (workoutsGoal) is the
   trainingDays value the user actually set during onboarding/profile; everything else is
   the real logged total with no target, per spec. */

export function radarChart(current, previous){
  const size=260, cx=size/2, cy=size/2, r=90;
  const n = RADAR_MUSCLES.length;
  const maxVal = Math.max(4, ...Object.values(current), ...Object.values(previous));
  function pt(i,val){
    const angle = (Math.PI*2*i/n) - Math.PI/2;
    const dist = (val/maxVal)*r;
    return [cx+dist*Math.cos(angle), cy+dist*Math.sin(angle)];
  }
  function labelPt(i){
    const angle = (Math.PI*2*i/n) - Math.PI/2;
    return [cx+(r+26)*Math.cos(angle), cy+(r+22)*Math.sin(angle)];
  }
  function polygon(data,color,fillOpacity){
    const pts = RADAR_MUSCLES.map((m,i)=>pt(i,data[m]).join(",")).join(" ");
    return `<polygon points="${pts}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="2"/>`;
  }
  const rings = [0.33,0.66,1].map(f=>{
    const pts = RADAR_MUSCLES.map((m,i)=>pt(i,maxVal*f).join(",")).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="#33333d" stroke-width="1"/>`;
  }).join("");
  const spokes = RADAR_MUSCLES.map((m,i)=>{
    const [x,y] = pt(i,maxVal);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#33333d" stroke-width="1"/>`;
  }).join("");
  const labels = RADAR_MUSCLES.map((m,i)=>{
    const [x,y] = labelPt(i);
    return `<text x="${x}" y="${y}" fill="#8B8B94" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">${m}</text>`;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${rings}${spokes}
    ${polygon(previous,"#8B8B94",0.12)}
    ${polygon(current,"#FF5A1F",0.28)}
    ${labels}
  </svg>`;
}

/* --- SVG weekly bar chart --- */

export function weeklyBarChart(buckets, metric){
  const vals = buckets.map(b=>b[metric]);
  const max = Math.max(1, ...vals);
  const fmt = (v)=>{
    if(metric==="volume") return v>0 ? displayW(v,0).toLocaleString() : "";
    if(metric==="duration") return v>0 ? v+"m" : "";
    return v>0 ? String(v) : "";
  };
  return `<div style="height:130px;display:flex;align-items:flex-end;gap:5px;">
    ${buckets.map((b,i)=>{
      const val = b[metric];
      const isLast = i===buckets.length-1;
      const bh = Math.max(val>0?4:0, Math.round((val/max)*90));
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;">
        <span class="mono" style="font-size:10px;font-weight:700;color:${isLast?'var(--accent)':'var(--steel)'};min-height:12px;">${fmt(val)}</span>
        <div style="width:65%;border-radius:4px 4px 0 0;background:${isLast?'#FF5A1F':'#4FA8D8'};height:${bh}px;"></div>
      </div>`;
    }).join("")}
  </div>`;
}

/* --- calendar grid (Mon-Sun) for a given month --- */

export function renderCalendarMonth(monthOffset){
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth()+monthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay()+6)%7; // Mon=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const dates = activityDates();
  const monthName = base.toLocaleString('default',{month:'long', year:'numeric'});

  let cells = "";
  for(let i=0;i<startWeekday;i++) cells += `<div></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const active = dates.has(dateStr);
    const isToday = dateStr === new Date().toISOString().slice(0,10);
    cells += `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;
      font-size:12px;font-weight:700;font-family:'SF Mono',monospace;
      background:${active?'#FF5A1F':'transparent'};
      color:${active?'#151515':'var(--muted)'};
      ${isToday && !active ? 'box-shadow:inset 0 0 0 1.5px var(--steel);color:var(--steel);':''}">${d}</div>`;
  }
  return `
    <div class="row-between" style="margin-bottom:10px;">
      <button class="btn btn-ghost" data-cal-nav="-1" style="padding:6px 12px;">‹</button>
      <span style="font-weight:800;font-size:14px;">${monthName}</span>
      <button class="btn btn-ghost" data-cal-nav="1" style="padding:6px 12px;" ${monthOffset>=0?'disabled':''}>›</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:10px;color:var(--muted);font-weight:700;text-align:center;margin-bottom:6px;">
      <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${cells}</div>
  `;
}

/* =========================================================
   ADVANCED PROGRESS ANALYTICS — additional stats/trends/charts
========================================================= */
/* =========================================================
   ACHIEVEMENTS — permanent, no duplicates, checked after actions that
   could unlock one (never scanned on every render). "First 5K" and other
   distance-based achievements are intentionally omitted -- same reason as
   PRs/HYROX race mode: no distance/time fields exist in the logger to
   honestly evaluate them.
========================================================= */

export function sparklineChart(points, opts={}){
  const color = opts.color || "var(--accent)";
  const unit = opts.unit || "";
  if(points.length < 2){
    return `<div class="empty-note" style="padding:20px 0;">Not enough data yet — log a few more entries to see a trend line here.</div>`;
  }
  const w=300, h=110, padX=8, padY=14;
  const vals = points.map(p=>p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = (max-min) || 1;
  const stepX = (w-padX*2) / (points.length-1);
  const coords = points.map((p,i)=>{
    const x = padX + i*stepX;
    const y = padY + (1 - (p.value-min)/range) * (h-padY*2);
    return {x,y,v:p.value};
  });
  const pathD = coords.map((c,i)=> (i===0?'M':'L')+c.x.toFixed(1)+','+c.y.toFixed(1)).join(' ');
  const dots = coords.map((c,i)=> i===coords.length-1 ?
    `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" fill="${color}"/>` : '').join('');
  const first = points[0].value, last = points[points.length-1].value;
  const delta = +(last-first).toFixed(1);
  return `
    <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>
    <div class="row-between" style="margin-top:2px;">
      <span style="font-size:11px;color:var(--muted);">${points[0].date}</span>
      <span class="mono" style="font-size:12px;font-weight:800;color:${delta===0?'var(--muted)':delta>0?'var(--accent)':'var(--mint)'};">${delta>0?'+':''}${delta}${unit} <span style="color:var(--muted);font-weight:400;">since start</span></span>
      <span style="font-size:11px;color:var(--muted);">${points[points.length-1].date}</span>
    </div>
  `;
}
