import { ACTIVITY_KCAL_PER_MIN } from './constants.js';
import { todayStr } from './utils.js';
import { state } from './storage.js';

/* =========================================================
   NUTRITION — food/water logging, macro & calorie targets, and the
   body-metric calculators (BMR, LBM, ideal weight, body fat, HR zones).
========================================================= */

export function profileMaintenance(){
  const p = state.profile;
  return Math.round(calcBMR(p.age, p.gender, p.height, p.weight) * p.activityMultiplier);
}

export function profileCalorieTarget(){
  return Math.round(profileMaintenance() + state.profile.goalDelta);
}

export function calcBMR(age, gender, heightCm, weightKg){
  // Mifflin-St Jeor
  const base = 10*weightKg + 6.25*heightCm - 5*age;
  return gender==="male" ? base+5 : base-161;
}

export function calcLBM(gender, heightCm, weightKg){
  const boer = gender==="male"
    ? 0.407*weightKg + 0.267*heightCm - 19.2
    : 0.252*weightKg + 0.473*heightCm - 48.3;
  const hume = gender==="male"
    ? 0.3281*weightKg + 0.33929*heightCm - 29.5336
    : 0.29569*weightKg + 0.41813*heightCm - 43.2933;
  return { boer, hume };
}

export function calcIdealWeight(gender, heightCm){
  const inchesOver5ft = Math.max(0, (heightCm/2.54) - 60);
  const table = gender==="male"
    ? { Robinson:52+1.9*inchesOver5ft, Miller:56.2+1.41*inchesOver5ft, Devine:50+2.3*inchesOver5ft, Hamwi:48+2.7*inchesOver5ft }
    : { Robinson:49+1.7*inchesOver5ft, Miller:53.1+1.36*inchesOver5ft, Devine:45.5+2.3*inchesOver5ft, Hamwi:45.5+2.2*inchesOver5ft };
  return table;
}

export function calcBodyFatNavy(gender, heightCm, neckCm, waistCm, hipCm){
  if(gender==="male"){
    return 495/(1.0324 - 0.19077*Math.log10(waistCm-neckCm) + 0.15456*Math.log10(heightCm)) - 450;
  }
  return 495/(1.29579 - 0.35004*Math.log10(waistCm+(hipCm||0)-neckCm) + 0.22100*Math.log10(heightCm)) - 450;
}

export function calcHeartRateZones(age, restingHR){
  const maxHR = 220-age;
  const zones = [
    {label:"50-60% (Very Light)", lo:0.5, hi:0.6},
    {label:"60-70% (Light)", lo:0.6, hi:0.7},
    {label:"70-80% (Moderate)", lo:0.7, hi:0.8},
    {label:"80-90% (Hard)", lo:0.8, hi:0.9},
    {label:"90-100% (Maximum)", lo:0.9, hi:1.0}
  ];
  const useKarvonen = restingHR && restingHR>0;
  const rows = zones.map(z=>{
    if(useKarvonen){
      const lo = Math.round((maxHR-restingHR)*z.lo + restingHR);
      const hi = Math.round((maxHR-restingHR)*z.hi + restingHR);
      return {label:z.label, lo, hi};
    }
    return {label:z.label, lo:Math.round(maxHR*z.lo), hi:Math.round(maxHR*z.hi)};
  });
  return { maxHR, rows, useKarvonen };
}

export function calcMacros(tdee){
  // Standard splits used by calculator.net-style tools
  return {
    carbs:   { lo: tdee*0.40/4, hi: tdee*0.65/4 },   // 40-65% of kcal, 4 kcal/g
    protein: { lo: tdee*0.10/4, hi: tdee*0.35/4 },   // 10-35% of kcal
    fat:     { lo: tdee*0.20/9, hi: tdee*0.35/9 },   // 20-35% of kcal, 9 kcal/g
    satFatMax: tdee*0.10/9                            // <10% kcal from saturated fat
  };
}

export function calcBodyType(bust, waist, highHip, hip){
  // calculator.net-style shape classification
  const whr = hip>0 ? (waist/hip) : 0;
  let shape = "Undefined";
  if(bust>0 && waist>0 && hip>0){
    if(Math.abs(bust-hip) <= bust*0.05 && waist < Math.min(bust,hip)*0.75) shape = "Hourglass";
    else if(hip > bust*1.05 && waist < hip*0.8) shape = "Pear / Triangle";
    else if(bust > hip*1.05 && waist < bust*0.8) shape = "Inverted Triangle";
    else if(Math.abs(bust-hip) <= bust*0.05 && waist >= Math.min(bust,hip)*0.75) shape = "Rectangle / Banana";
    else if(waist >= Math.min(bust,hip)) shape = "Apple / Round";
    else shape = "Rectangle / Banana";
  }
  return { shape, whr };
}

export function foodsForDate(dateStr){ return state.foodLog.filter(f=>f.date===dateStr); }

/* Recently-logged distinct foods (most recent instance of each name), for
   one-tap re-logging instead of retyping calories/macros every time. */

export function recentFoodEntries(limit=6){
  const seen = new Set();
  const out = [];
  for(const f of state.foodLog){
    const key = f.name.trim().toLowerCase();
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(f);
    if(out.length>=limit) break;
  }
  return out;
}

export function waterForDate(dateStr){ return state.waterLog.filter(w=>w.date===dateStr).reduce((a,w)=>a+(w.ml||0),0); }

export function todayWater(){ return waterForDate(todayStr()); }

export function todayEaten(){
  return foodsForDate(todayStr()).reduce((a,f)=>a+Number(f.calories||0),0);
}

export function todayActivityKcal(){
  return state.workoutLog
    .filter(s=>s.date===todayStr())
    .reduce((a,s)=>a + (s.durationMin||0)*ACTIVITY_KCAL_PER_MIN, 0);
}

export function todayBurned(){
  return Math.round(profileMaintenance() + todayActivityKcal());
}

export function todayMacros(){
  const t = {protein:0, carbs:0, fat:0, fibre:0};
  foodsForDate(todayStr()).forEach(f=>{
    t.protein += Number(f.protein||0);
    t.carbs += Number(f.carbs||0);
    t.fat += Number(f.fat||0);
    t.fibre += Number(f.fibre||0);
  });
  return t;
}

export function macroTargets(){
  const n = state.nutrition;
  const kcal = profileCalorieTarget();
  return {
    kcal,
    protein: kcal*(n.proteinPct/100)/4,
    carbs: kcal*(n.carbPct/100)/4,
    fat: kcal*(n.fatPct/100)/9,
    fibre: n.fibreTarget || 30
  };
}

export function last7DaysCalories(){
  const out = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const kcal = foodsForDate(ds).reduce((a,f)=>a+Number(f.calories||0),0);
    out.push({label: d.toLocaleDateString('default',{weekday:'short'}), date: ds, kcal});
  }
  return out;
}

export function bodyWeightTrend(limit=20){
  return state.bodylog.slice().reverse() // bodylog is stored newest-first; reverse to chronological
    .filter(e=>e.weight)
    .map(e=>({date:e.date, value:Number(e.weight)}))
    .slice(-limit);
}

/* All exercise names that have at least one completed weighted set in history — for the exercise picker */

export function calorieProteinTrend(days=30){
  const out = [];
  for(let i=days-1;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const foods = foodsForDate(ds);
    out.push({
      date: ds,
      kcal: foods.reduce((a,f)=>a+Number(f.calories||0),0),
      protein: foods.reduce((a,f)=>a+Number(f.protein||0),0)
    });
  }
  return out;
}

/* Simple line/dot sparkline chart shared by weight/1RM/calorie trends.
   points: [{date,value}]. Draws nothing (returns empty state) if <2 points. */
