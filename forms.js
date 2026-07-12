import { render } from './index.js';
import { ACTIVITY_MULTIPLIERS, BODY_MUSCLES, CALCULATORS, EQUIPMENT_OPTIONS, GOAL_OPTIONS, HYROX_EXPERIENCE_OPTIONS, LEVELS, LIBRARY } from '../constants.js';
import { state } from '../storage.js';
import { svg } from '../utils.js';
import { rebuildWeeks } from '../workout.js';

/* =========================================================
   FORMS — input-heavy screens: onboarding, the routine builder, the
   custom-exercise form, and the body-metric calculators.
========================================================= */

export function customExerciseForm(hideButton){
  return `<div class="info-box" style="margin-bottom:16px;">
    <input type="text" id="custom-name" placeholder="Exercise name" style="background:var(--surface-alt);border-radius:8px;padding:10px;width:100%;margin-bottom:8px;font-size:14px;color:var(--text);">
    <select class="select-input" id="custom-cat">
      ${Object.keys(LIBRARY).map(c=>`<option value="${c}">${c}</option>`).join("")}
    </select>
    <select class="select-input" id="custom-muscle">
      ${[...BODY_MUSCLES,"Mobility","Other"].map(m=>`<option value="${m}">${m}</option>`).join("")}
    </select>
    <input type="text" id="custom-presc" placeholder="Default prescription (e.g. 3x12)" style="background:var(--surface-alt);border-radius:8px;padding:10px;width:100%;margin-bottom:8px;font-size:14px;color:var(--text);">
    ${hideButton?'':'<button class="btn btn-accent btn-block" data-action="save-custom">Save Exercise</button>'}
  </div>`;
}

/* =========================================================
   BODY TAB
========================================================= */
/* =========================================================
   FITNESS CALCULATORS — BMR, TDEE, LBM, Ideal Weight, Body Fat, HR Zones
========================================================= */

export function calcInputRow(id, label, val, unit){
  return `<div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">${label}</label>
    <div style="display:flex;align-items:center;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;">
      <input type="number" id="${id}" value="${val}" style="flex:1;background:none;color:var(--text);font-family:'SF Mono',monospace;font-weight:700;font-size:13px;">
      ${unit?`<span style="font-size:11px;color:var(--muted);">${unit}</span>`:""}
    </div></div>`;
}

export function genderToggle(id, current){
  return `<div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Gender</label>
    <div style="display:flex;gap:6px;margin-top:4px;">
      <button class="cat-chip ${current==='male'?'active':''}" data-gender-toggle="${id}|male" style="flex:1;text-align:center;">Male</button>
      <button class="cat-chip ${current==='female'?'active':''}" data-gender-toggle="${id}|female" style="flex:1;text-align:center;">Female</button>
    </div></div>`;
}

export function renderRoutineBuilder(){
  const b = state.routineBuilder;
  return `<div class="info-box" style="padding:14px;margin-bottom:12px;">
    <input type="text" id="routine-name" placeholder="Routine name (e.g. Leg Day 2)" value="${b.name}"
      style="width:100%;background:var(--surface-alt);border-radius:8px;padding:10px;font-size:14px;color:var(--text);margin-bottom:10px;">

    ${b.exercises.length? b.exercises.map((e,i)=>`<div class="history-row" style="margin-bottom:4px;">
      <span style="font-size:13px;font-weight:600;">${e.name}</span>
      <span class="mono" style="font-size:12px;color:var(--steel);">${e.sets} sets</span>
      <button class="del" data-remove-builder-ex="${i}" aria-label="Remove exercise">${svg('x',12)}</button>
    </div>`).join("") : ""}

    <div style="display:flex;gap:6px;align-items:center;margin-top:${b.exercises.length?'10px':'0'};">
      <button class="btn btn-ghost" style="flex:1;text-align:left;display:flex;align-items:center;gap:8px;" data-action="open-exercise-picker-for-routine">${svg('plus',14)} Choose Exercise…</button>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
        <span style="font-size:11px;color:var(--muted);">sets</span>
        <input type="number" id="routine-ex-sets" value="${state.routineBuilderSets}" min="1" style="width:44px;background:var(--surface-alt);border-radius:8px;padding:9px 4px;text-align:center;color:var(--accent);font-family:'SF Mono',monospace;font-weight:700;border:none;">
      </div>
    </div>
    <button class="btn btn-accent btn-block" data-action="save-routine" style="margin-top:10px;">Save Routine</button>
  </div>`;
}

export function renderOnboarding(){
  const root = document.getElementById("app");
  const p = state.profile;
  root.innerHTML = `
    <div style="padding:24px 20px 100px;max-width:480px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:800;margin-bottom:4px;">Welcome to</div>
        <h1 style="font-size:32px;font-weight:900;margin:0;">IGNYT</h1>
        <div style="font-size:13px;color:var(--muted);margin-top:6px;">A few quick details so your plan, calories, and macros start off right.</div>
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Your Name</label>
      <input type="text" id="ob-name" value="${p.name||''}" placeholder="What should we call you?" style="width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;font-size:14px;color:var(--text);margin-bottom:14px;border:none;">

      <div class="grid2" style="margin-bottom:14px;">
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Age</label>
          <input type="number" id="ob-age" value="${p.age}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;margin-top:4px;font-size:14px;color:var(--text);border:none;"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Gender</label>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="cat-chip ${p.gender==='male'?'active':''}" data-ob-gender="male" style="flex:1;text-align:center;">Male</button>
            <button class="cat-chip ${p.gender==='female'?'active':''}" data-ob-gender="female" style="flex:1;text-align:center;">Female</button>
          </div></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Height (cm)</label>
          <input type="number" id="ob-height" value="${p.height}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;margin-top:4px;font-size:14px;color:var(--text);border:none;"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Weight (kg)</label>
          <input type="number" id="ob-weight" value="${p.weight}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:11px;margin-top:4px;font-size:14px;color:var(--accent);font-weight:700;border:none;"></div>
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Primary Goal</label>
      <select class="select-input" id="ob-goal" style="margin-bottom:14px;">
        ${GOAL_OPTIONS.map(g=>`<option value="${g.delta}" ${p.goalDelta===g.delta?'selected':''}>${g.label}</option>`).join("")}
      </select>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Training Experience Level</label>
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        ${Object.entries(LEVELS).map(([key,lv])=>`<button class="cat-chip ${state.activeLevel===key?'active':''}" data-ob-level="${key}" style="flex:1;text-align:center;">${lv.label}</button>`).join("")}
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Hyrox Experience</label>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
        ${HYROX_EXPERIENCE_OPTIONS.map(o=>`<button class="cat-chip ${p.hyroxExperience===o.key?'active':''}" data-ob-hyrox="${o.key}" style="text-align:left;padding:11px 14px;">${o.label}</button>`).join("")}
      </div>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Training Days Per Week</label>
      <select class="select-input" id="ob-days" style="margin-bottom:14px;">
        ${[2,3,4,5,6,7].map(n=>`<option value="${n}" ${p.trainingDays===n?'selected':''}>${n} days/week</option>`).join("")}
      </select>

      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;">Available Equipment</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">
        ${EQUIPMENT_OPTIONS.map(eq=>`<button class="cat-chip ${p.equipment.includes(eq)?'active':''}" data-ob-equipment="${eq}">${eq}</button>`).join("")}
      </div>

      <button class="btn btn-accent btn-block" data-action="onboarding-complete" style="margin-bottom:10px;">Get Started</button>
      <button class="btn btn-ghost btn-block" data-action="onboarding-skip">Skip for now</button>
    </div>
  `;
  document.getElementById("ob-name").addEventListener("change", e=> p.name = e.target.value);
  document.getElementById("ob-age").addEventListener("change", e=> p.age = Number(e.target.value)||p.age);
  document.getElementById("ob-height").addEventListener("change", e=> p.height = Number(e.target.value)||p.height);
  document.getElementById("ob-weight").addEventListener("change", e=> p.weight = Number(e.target.value)||p.weight);
  document.getElementById("ob-goal").addEventListener("change", e=> p.goalDelta = Number(e.target.value));
  document.getElementById("ob-days").addEventListener("change", e=> p.trainingDays = Number(e.target.value));
  document.querySelectorAll("[data-ob-gender]").forEach(el=> el.addEventListener("click", ()=>{ p.gender = el.dataset.obGender; renderOnboarding(); }));
  document.querySelectorAll("[data-ob-level]").forEach(el=> el.addEventListener("click", ()=>{ state.activeLevel = el.dataset.obLevel; renderOnboarding(); }));
  document.querySelectorAll("[data-ob-hyrox]").forEach(el=> el.addEventListener("click", ()=>{ p.hyroxExperience = el.dataset.obHyrox; renderOnboarding(); }));
  document.querySelectorAll("[data-ob-equipment]").forEach(el=> el.addEventListener("click", ()=>{
    const eq = el.dataset.obEquipment;
    if(p.equipment.includes(eq)) p.equipment = p.equipment.filter(e=>e!==eq);
    else p.equipment = p.equipment.concat([eq]);
    renderOnboarding();
  }));
  document.querySelector('[data-action="onboarding-complete"]').addEventListener("click", ()=>{
    state.onboardingComplete = true;
    rebuildWeeks();
    render();
  });
  document.querySelector('[data-action="onboarding-skip"]').addEventListener("click", ()=>{
    state.onboardingComplete = true; // don't ask again — defaults remain, editable anytime in Body tab / Settings
    render();
  });
}

export function renderCalculators(){
  const c = state.calc;
  // Pull shared profile values as the defaults shown in calculators
  c.age = state.profile.age; c.gender = state.profile.gender;
  c.height = state.profile.height; c.weight = state.profile.weight;
  if(c.activityMultiplier==null) c.activityMultiplier = state.profile.activityMultiplier;
  if(c.goalDelta==null) c.goalDelta = state.profile.goalDelta;
  const active = c.activeCalc;
  let fields = "", result = "";

  if(active==="bmr"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>`;
    if(c.result && c.result.type==="bmr"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Basal Metabolic Rate</div>
        <div class="mono" style="font-weight:900;font-size:28px;color:var(--accent);">${Math.round(c.result.bmr)}<span style="font-size:13px;color:var(--muted);margin-left:4px;">kcal/day</span></div>
      </div>`;
    }
  }

  if(active==="calorie"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Your Goal</label>
    <select class="select-input" id="calc-goal">
      ${GOAL_OPTIONS.map(g=>`<option value="${g.delta}" ${c.goalDelta===g.delta?'selected':''}>${g.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="calorie"){
      const goalKcal = c.result.tdee + c.result.goalDelta;
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Maintenance (TDEE)</div><div class="stat-value" style="color:var(--steel);">${Math.round(c.result.tdee)}<span class="stat-unit">kcal</span></div></div>
        <div class="stat-card"><div class="stat-label">Goal Calories</div><div class="stat-value" style="color:var(--accent);">${Math.round(goalKcal)}<span class="stat-unit">kcal</span></div></div>
      </div>
      <div class="info-box" style="text-align:center;padding:12px;margin-top:8px;">
        <button class="btn btn-steel" data-action="apply-calc-profile" style="padding:8px 16px;">Apply These Stats to Profile</button>
      </div>`;
    }
  }

  if(active==="protein"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="protein"){
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">RDA Minimum (0.8g/kg)</div><div class="stat-value" style="color:var(--steel);">${c.result.rda.toFixed(0)}<span class="stat-unit">g/day</span></div></div>
        <div class="stat-card"><div class="stat-label">% of Calories (10-35%)</div><div class="stat-value" style="color:var(--steel);">${Math.round(c.result.pctLo)}–${Math.round(c.result.pctHi)}<span class="stat-unit">g</span></div></div>
        <div class="stat-card" style="grid-column:1/-1;"><div class="stat-label">Training / Muscle Building (1.6-2.2g/kg)</div><div class="stat-value" style="color:var(--accent);">${c.result.trainLo.toFixed(0)}–${c.result.trainHi.toFixed(0)}<span class="stat-unit">g/day</span></div></div>
      </div>
      <div class="info-box" style="margin-top:10px;font-size:12px;">For your Hyrox training + fat loss goal, the training range is the one to aim for.</div>`;
    }
  }

  if(active==="carbs"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="carbs"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Daily Carbohydrates (40–65% of ${Math.round(c.result.tdee)} kcal)</div>
        <div class="mono" style="font-weight:900;font-size:26px;color:var(--accent);">${Math.round(c.result.lo)}–${Math.round(c.result.hi)}<span style="font-size:13px;color:var(--muted);margin-left:4px;">g/day</span></div>
      </div>`;
    }
  }

  if(active==="fat"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
    <select class="select-input" id="calc-activity">
      ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${c.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
    </select>`;
    if(c.result && c.result.type==="fat"){
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Total Fat (20-35%)</div><div class="stat-value" style="color:var(--accent);">${Math.round(c.result.lo)}–${Math.round(c.result.hi)}<span class="stat-unit">g/day</span></div></div>
        <div class="stat-card"><div class="stat-label">Saturated Fat Max (<10%)</div><div class="stat-value" style="color:var(--steel);">${Math.round(c.result.satMax)}<span class="stat-unit">g/day</span></div></div>
      </div>
      <div class="info-box" style="margin-top:10px;font-size:12px;">Based on ${Math.round(c.result.tdee)} kcal/day. Keeping saturated fat under the max supports heart health.</div>`;
    }
  }

  if(active==="bodytype"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-bust","Bust",c.bust,"cm")}
      ${calcInputRow("calc-bwaist","Waist",c.bwaist,"cm")}
      ${calcInputRow("calc-highhip","High Hip",c.highHip,"cm")}
      ${calcInputRow("calc-bhip","Hip",c.bhip,"cm")}
    </div>`;
    if(c.result && c.result.type==="bodytype"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Body Shape</div>
        <div style="font-weight:900;font-size:24px;color:var(--accent);margin:4px 0;">${c.result.shape}</div>
        <div class="stat-label" style="margin-top:8px;">Waist-Hip Ratio</div>
        <div class="mono" style="font-weight:900;font-size:20px;color:var(--steel);">${c.result.whr.toFixed(2)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;">WHR is a better health indicator than shape category.</div>
      </div>`;
    }
  }

  if(active==="lbm"){
    fields = `<div class="grid2">
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-weight","Weight",c.weight,"kg")}
    </div>`;
    if(c.result && c.result.type==="lbm"){
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Boer Formula</div><div class="stat-value" style="color:var(--accent);">${c.result.boer.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Hume Formula</div><div class="stat-value" style="color:var(--steel);">${c.result.hume.toFixed(1)}<span class="stat-unit">kg</span></div></div>
      </div>
      <div class="info-box" style="margin-top:10px;font-size:12px;">Two different formulas, shown for comparison — both are estimates, not measurements.</div>`;
    }
  }

  if(active==="ideal"){
    fields = `<div class="grid2">
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
    </div>`;
    if(c.result && c.result.type==="ideal"){
      const r = c.result;
      result = `<div class="grid2" style="margin-top:10px;">
        <div class="stat-card"><div class="stat-label">Robinson</div><div class="stat-value">${r.Robinson.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Miller</div><div class="stat-value">${r.Miller.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Devine</div><div class="stat-value">${r.Devine.toFixed(1)}<span class="stat-unit">kg</span></div></div>
        <div class="stat-card"><div class="stat-label">Hamwi</div><div class="stat-value">${r.Hamwi.toFixed(1)}<span class="stat-unit">kg</span></div></div>
      </div>`;
    }
  }

  if(active==="bodyfat"){
    fields = `<div class="grid2">
      ${genderToggle("calc-gender", c.gender)}
      ${calcInputRow("calc-height","Height",c.height,"cm")}
      ${calcInputRow("calc-neck","Neck",c.neck,"cm")}
      ${calcInputRow("calc-waist","Waist",c.waist,"cm")}
      ${c.gender==="female" ? calcInputRow("calc-hip","Hip",c.hip,"cm") : ""}
    </div>`;
    if(c.result && c.result.type==="bodyfat"){
      result = `<div class="info-box" style="text-align:center;padding:16px;margin-top:10px;">
        <div class="stat-label">Estimated Body Fat (US Navy method)</div>
        <div class="mono" style="font-weight:900;font-size:28px;color:var(--accent);">${c.result.bf.toFixed(1)}<span style="font-size:13px;color:var(--muted);margin-left:4px;">%</span></div>
      </div>`;
    }
  }

  if(active==="hr"){
    fields = `<div class="grid2">
      ${calcInputRow("calc-age","Age",c.age,"")}
      ${calcInputRow("calc-resting","Resting HR (optional)",c.restingHR,"bpm")}
    </div>`;
    if(c.result && c.result.type==="hr"){
      result = `<div class="info-box" style="padding:14px;margin-top:10px;">
        <div class="row-between" style="margin-bottom:10px;">
          <span class="stat-label">Max Heart Rate</span>
          <span class="mono" style="font-weight:900;color:var(--accent);">${c.result.maxHR} bpm</span>
        </div>
        ${c.result.rows.map(z=>`<div class="row-between" style="padding:6px 0;border-top:1px solid var(--border);">
          <span style="font-size:12px;color:var(--muted);">${z.label}</span>
          <span class="mono" style="font-size:13px;color:var(--steel);">${z.lo}–${z.hi} bpm</span>
        </div>`).join("")}
        ${c.result.useKarvonen ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Calculated using the Karvonen formula (accounts for resting HR).</div>` : ""}
      </div>`;
    }
  }

  return `
    <select class="select-input" id="calc-picker">
      ${CALCULATORS.map(cc=>`<option value="${cc.key}" ${active===cc.key?'selected':''}>${cc.label}</option>`).join("")}
    </select>
    ${fields}
    <button class="btn btn-accent btn-block" data-action="run-calculator" style="margin-top:10px;">Calculate</button>
    ${result}
  `;
}
