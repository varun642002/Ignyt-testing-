import { state } from '../storage.js';
import { displayW, svg, wUnit } from '../utils.js';
import { getMuscle, prTypeLabel, prValueLabel, sessionMuscles, sessionTitle } from '../workout.js';

/* =========================================================
   TABLES — tabular data displays: a single session's full set-by-set
   breakdown, and an exercise's chronological history table.
========================================================= */

export function renderSessionDetail(s){
  const muscles = sessionMuscles(s.exercises);
  const workingSets = s.exercises.reduce((a,e)=>a+e.sets.filter(set=>set.weight||set.reps).length, 0);
  const prs = state.prs.filter(p=>p.workoutId===s.id);
  const startTime = s.startedAt ? new Date(s.startedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : null;
  const endTime = s.finishedAt ? new Date(s.finishedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : null;
  return `
    <div class="row-between" style="margin-bottom:4px;">
      <button class="btn btn-ghost" data-action="close-session-detail" style="padding:6px 12px;font-size:12px;">← Back</button>
    </div>
    <div style="margin:12px 0 4px;">
      <div style="font-size:18px;font-weight:900;">${sessionTitle(s)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:1px;">${s.exercises.length} exercise${s.exercises.length!==1?'s':''}</div>
      <div class="mono" style="font-size:12px;color:var(--muted);margin-top:2px;">${new Date(s.date).toLocaleDateString('default',{weekday:'long',month:'long',day:'numeric'})}${startTime&&endTime?` · ${startTime}–${endTime}`:''}</div>
    </div>
    ${muscles.length? `<div style="margin:8px 0 4px;">${muscles.map(m=>`<span class="muscle-chip active">${m}</span>`).join("")}</div>`:""}
    ${s.notes? `<div class="info-box" style="padding:10px 14px;margin:8px 0;font-size:12px;font-style:italic;color:var(--text);">"${s.notes}"</div>`:""}

    <div class="grid2" style="margin-top:12px;margin-bottom:8px;">
      <div class="stat-card"><div class="stat-label">Duration</div><div class="stat-value">${s.durationMin||'–'}<span class="stat-unit">min</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Volume</div><div class="stat-value">${displayW(s.volume||0,0).toLocaleString()}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Working Sets</div><div class="stat-value">${workingSets}</div></div>
      <div class="stat-card"><div class="stat-label">Personal Records</div><div class="stat-value" style="color:${prs.length?'var(--accent)':'var(--text)'};">${prs.length?'🏆 ':''}${prs.length}</div></div>
    </div>

    ${prs.length? `<div class="info-box" style="padding:10px 14px;margin-bottom:14px;">
      ${prs.map(pr=>`<div style="font-size:12px;padding:4px 0;"><b>${pr.exerciseName||'Session'}</b> — ${prTypeLabel(pr)}: <span style="color:var(--accent);font-weight:700;">${prValueLabel(pr)}</span></div>`).join("")}
    </div>` : ""}

    <div class="eyebrow-label">Exercises</div>
    ${s.exercises.map(ex=>`<div class="ex-log-card">
      <div style="font-weight:800;color:var(--steel);font-size:15px;">${ex.name}</div>
      <span class="muscle-chip">${getMuscle(ex.name)}</span>
      ${ex.notes?`<div style="font-size:12px;color:var(--muted);margin-top:6px;font-style:italic;">"${ex.notes}"</div>`:""}
      <div style="margin-top:8px;">
        ${ex.sets.map((set,i)=>`<div class="row-between" style="padding:5px 0;border-top:1px solid var(--border);">
          <span class="mono" style="font-size:12px;color:var(--muted);">Set ${i+1}</span>
          <span class="mono" style="font-size:13px;">${set.weight?displayW(set.weight):'–'}${wUnit()} × ${set.reps||'–'}${set.rpe?` <span style="color:var(--muted);">@ RPE ${set.rpe}</span>`:''}</span>
        </div>`).join("")}
      </div>
    </div>`).join("")}

    <div class="grid2" style="margin-top:16px;">
      <button class="btn btn-accent" data-action="repeat-workout" data-session-id="${s.id}" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('workout',15)} Repeat Workout</button>
      <button class="btn btn-steel" data-action="edit-workout" data-session-id="${s.id}">Edit Workout</button>
    </div>
    <button class="btn btn-ghost btn-block" data-action="save-session-as-routine" data-session-id="${s.id}" style="margin-top:8px;">Save as Routine</button>
    <button class="btn btn-ghost btn-block" data-action="delete-session-confirmed" data-session-id="${s.id}" style="margin-top:8px;color:#ff6b6b;">Delete Workout</button>
  `;
}

export function renderExerciseDetailHistory(history){
  if(history.length===0) return `<div class="empty-note" style="margin:20px 0;">No history for this exercise yet — once you log it in a workout, every session will show up here.</div>`;
  return `
    ${history.map(h=>`<div class="info-box" style="padding:14px;margin-bottom:10px;">
      <div class="row-between" style="margin-bottom:6px;">
        <div>
          <div style="font-weight:800;font-size:14px;">${h.title}</div>
          <div class="mono" style="font-size:11px;color:var(--muted);">${h.date}</div>
        </div>
        ${h.prs.length ? `<span style="font-size:11px;font-weight:800;color:var(--accent);">🏆 ${h.prs.length} PR${h.prs.length>1?'s':''}</span>` : ''}
      </div>
      ${h.notes ? `<div style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:6px;">"${h.notes}"</div>` : ''}
      ${h.sets.map((s,i)=>`<div class="row-between" style="padding:4px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <span class="mono" style="font-size:11px;color:var(--muted);">Set ${i+1}</span>
        <span class="mono" style="font-size:12px;">${s.weight?displayW(s.weight):'–'}${wUnit()} × ${s.reps||'–'}${s.rpe?` <span style="color:var(--muted);">@ RPE ${s.rpe}</span>`:''}</span>
      </div>`).join("")}
    </div>`).join("")}
  `;
}
