/* =========================================================
   IGNYT COACH — TEMPLATE LIBRARY (spec §1)

   Sixteen named starting plans. Data only: no logic lives here, so a template can be added or
   corrected without reading a line of the matcher.

   A TEMPLATE IS A SHAPE, NOT AN EXERCISE LIST
   Every slot names a MOVEMENT PATTERN, never a specific movement. "horizontal_press", not
   "Bench Press (Barbell)". The pattern is resolved against the user's real equipment and real
   injuries at build time by exercise-engine, which is what stops a Bro Split from prescribing
   a cable fly to someone training in a garage with two dumbbells.

   This is also why the library does not conflict with the generative engine already shipping.
   goal-engine deliberately produces PARAMETERS rather than templates, and that remains the
   right call for week-to-week adaptation. What it cannot do is tell a new user what they are
   following. "Push Pull Legs" is an answer; "a 6-day split at 65-80% intensity with a 0.55
   compound bias" is not. Templates own the first week; the engine owns every week after.

   REP RANGES ARE RANGES ON PURPOSE
   Each slot carries [min, max]. That pair is the entire contract with overload-engine: reps
   climb to max at a fixed load, then load rises and reps reset to min. A single rep target
   would make double progression impossible to express.
========================================================= */
window.IgnytCoachTemplates = (function () {
  "use strict";

  /* Slot helper — keeps the templates readable. role is used by exercise-engine to bias
     selection toward compounds early in a session, when the lifter is freshest. */
  function slot(pattern, sets, min, max, rest, role) {
    return { pattern: pattern, sets: sets, reps: [min, max], rest: rest, role: role || "accessory" };
  }

  var PUSH = [
    slot("horizontal_press", 4, 6, 8, 180, "primary"),
    slot("incline_press", 3, 8, 12, 120, "secondary"),
    slot("vertical_press", 3, 8, 12, 120, "secondary"),
    slot("lateral_raise", 3, 12, 15, 60),
    slot("tricep_isolation", 3, 10, 15, 60)
  ];
  var PULL = [
    slot("horizontal_pull", 4, 6, 10, 150, "primary"),
    slot("vertical_pull", 3, 8, 12, 120, "secondary"),
    slot("rear_delt", 3, 12, 15, 60),
    slot("bicep_isolation", 3, 10, 15, 60),
    slot("core_antiext", 3, 10, 15, 60)
  ];
  var LEGS = [
    slot("squat", 4, 5, 8, 180, "primary"),
    slot("hinge", 3, 6, 10, 150, "secondary"),
    slot("lunge", 3, 10, 12, 90),
    slot("knee_flexion", 3, 10, 15, 60),
    slot("calf", 3, 12, 20, 45)
  ];
  var UPPER = [
    slot("horizontal_press", 4, 6, 10, 150, "primary"),
    slot("horizontal_pull", 4, 6, 10, 150, "primary"),
    slot("vertical_press", 3, 8, 12, 120, "secondary"),
    slot("vertical_pull", 3, 8, 12, 120, "secondary"),
    slot("lateral_raise", 2, 12, 15, 60),
    slot("bicep_isolation", 2, 10, 15, 60)
  ];
  var LOWER = [
    slot("squat", 4, 5, 8, 180, "primary"),
    slot("hinge", 3, 6, 10, 150, "primary"),
    slot("lunge", 3, 10, 12, 90),
    slot("knee_flexion", 3, 10, 15, 60),
    slot("core_antiext", 3, 10, 15, 60)
  ];
  var FULL = [
    slot("squat", 3, 8, 12, 120, "primary"),
    slot("horizontal_press", 3, 8, 12, 120, "primary"),
    slot("horizontal_pull", 3, 8, 12, 120, "primary"),
    slot("hinge", 2, 8, 12, 120, "secondary"),
    slot("core_antiext", 2, 10, 15, 60)
  ];

  var TEMPLATES = [
    { id:"beginner_full_body", name:"Beginner Full Body",
      goals:["muscle","general","fatloss","recomp"], experience:["beginner"],
      daysRange:[2,3], minMinutes:30, equipment:["full_gym","home_gym","dumbbells"],
      schedule:["full","rest","full","rest","full","rest","rest"],
      days:{ full: FULL }, progression:"linear", deloadEvery:8,
      why:"Three full-body sessions a week hit every muscle three times — the highest useful frequency when each session is still teaching technique." },

    { id:"beginner_upper_lower", name:"Beginner Upper Lower",
      goals:["muscle","general","recomp"], experience:["beginner"],
      daysRange:[4,4], minMinutes:45, equipment:["full_gym","home_gym","dumbbells"],
      schedule:["upper","lower","rest","upper","lower","rest","rest"],
      days:{ upper: UPPER, lower: LOWER }, progression:"linear", deloadEvery:8,
      why:"Four days is where full-body starts running long. Splitting upper and lower keeps each session under an hour without losing frequency." },

    { id:"intermediate_upper_lower", name:"Intermediate Upper Lower",
      goals:["muscle","strength","recomp"], experience:["intermediate","advanced"],
      daysRange:[4,4], minMinutes:60, equipment:["full_gym","home_gym"],
      schedule:["upper","lower","rest","upper","lower","rest","rest"],
      days:{ upper: UPPER, lower: LOWER }, progression:"double_progression", deloadEvery:6,
      why:"Same split, heavier ranges and longer rests — the point where load starts mattering more than volume." },

    { id:"ppl_6day", name:"Push Pull Legs",
      goals:["muscle","recomp"], experience:["intermediate","advanced"],
      daysRange:[6,6], minMinutes:60, equipment:["full_gym","home_gym"],
      schedule:["push","pull","legs","push","pull","legs","rest"],
      days:{ push: PUSH, pull: PULL, legs: LEGS }, progression:"double_progression", deloadEvery:6,
      why:"Six days lets every muscle be trained twice a week with enough per-session volume to drive growth." },

    { id:"arnold_split", name:"Arnold Split",
      goals:["muscle"], experience:["advanced"],
      daysRange:[6,6], minMinutes:75, equipment:["full_gym"],
      schedule:["chest_back","shoulders_arms","legs","chest_back","shoulders_arms","legs","rest"],
      days:{
        chest_back:[ slot("horizontal_press",4,8,12,120,"primary"), slot("horizontal_pull",4,8,12,120,"primary"),
                     slot("incline_press",3,8,12,90,"secondary"), slot("vertical_pull",3,8,12,90,"secondary"),
                     slot("chest_fly",3,12,15,60) ],
        shoulders_arms:[ slot("vertical_press",4,8,12,120,"primary"), slot("lateral_raise",4,12,15,60),
                         slot("rear_delt",3,12,15,60), slot("bicep_isolation",4,10,15,60),
                         slot("tricep_isolation",4,10,15,60) ],
        legs: LEGS
      }, progression:"double_progression", deloadEvery:6,
      why:"Antagonist pairing lets chest and back share a session at high volume. Needs the work capacity to recover from it, which is why it is advanced-only." },

    { id:"bro_split", name:"Bro Split",
      goals:["muscle"], experience:["intermediate","advanced"],
      daysRange:[5,5], minMinutes:60, equipment:["full_gym"],
      schedule:["chest","back","shoulders","arms","legs","rest","rest"],
      days:{
        chest:[ slot("horizontal_press",4,8,12,120,"primary"), slot("incline_press",4,8,12,90,"secondary"),
                slot("chest_fly",3,12,15,60), slot("tricep_isolation",3,10,15,60) ],
        back:[ slot("vertical_pull",4,8,12,120,"primary"), slot("horizontal_pull",4,8,12,120,"primary"),
               slot("rear_delt",3,12,15,60), slot("bicep_isolation",3,10,15,60) ],
        shoulders:[ slot("vertical_press",4,8,12,120,"primary"), slot("lateral_raise",4,12,15,60),
                    slot("rear_delt",3,12,15,60), slot("core_antiext",3,10,15,60) ],
        arms:[ slot("bicep_isolation",4,10,15,60), slot("tricep_isolation",4,10,15,60),
               slot("forearm",3,12,20,45) ],
        legs: LEGS
      }, progression:"double_progression", deloadEvery:6,
      why:"One muscle per day at high volume. Frequency is lower than ideal for growth, but it is what many people actually enjoy, and a plan followed beats a better plan abandoned." },

    { id:"powerlifting", name:"Powerlifting",
      goals:["strength"], experience:["intermediate","advanced"],
      daysRange:[4,4], minMinutes:75, equipment:["full_gym"],
      schedule:["squat_day","bench_day","rest","deadlift_day","press_day","rest","rest"],
      days:{
        squat_day:[ slot("squat",5,3,5,300,"primary"), slot("hinge",3,5,8,180,"secondary"),
                    slot("lunge",3,8,10,90), slot("core_antiext",3,10,15,60) ],
        bench_day:[ slot("horizontal_press",5,3,5,300,"primary"), slot("incline_press",3,6,8,150,"secondary"),
                    slot("horizontal_pull",4,8,12,90), slot("tricep_isolation",3,10,15,60) ],
        deadlift_day:[ slot("hinge",5,3,5,300,"primary"), slot("horizontal_pull",4,6,10,150,"secondary"),
                       slot("hip_extension",3,8,12,90), slot("core_antiext",3,10,15,60) ],
        press_day:[ slot("vertical_press",5,3,5,240,"primary"), slot("vertical_pull",4,6,10,150,"secondary"),
                    slot("lateral_raise",3,12,15,60), slot("tricep_isolation",3,10,15,60) ]
      }, progression:"wave", deloadEvery:4,
      why:"Low reps, long rests, the competition lifts trained heavy twice a week. Deloads every 4 weeks rather than 6 because this is the most fatiguing way to train." },

    { id:"strength_5x5", name:"Strength 5×5",
      goals:["strength","muscle"], experience:["beginner","intermediate"],
      daysRange:[3,3], minMinutes:45, equipment:["full_gym","home_gym"],
      schedule:["a","rest","b","rest","a","rest","rest"],
      days:{
        a:[ slot("squat",5,5,5,180,"primary"), slot("horizontal_press",5,5,5,180,"primary"),
            slot("horizontal_pull",5,5,5,180,"primary") ],
        b:[ slot("squat",5,5,5,180,"primary"), slot("vertical_press",5,5,5,180,"primary"),
            slot("hinge",1,5,5,180,"primary") ]
      }, progression:"linear", deloadEvery:8,
      why:"The most proven beginner strength template there is. Fixed 5s mean progression is unambiguous: made all five, add weight." },

    { id:"fat_loss_circuit", name:"Fat Loss Circuit",
      goals:["fatloss"], experience:["beginner","intermediate","advanced"],
      daysRange:[3,5], minMinutes:30, equipment:["full_gym","home_gym","dumbbells","bodyweight"],
      schedule:["circuit","circuit","rest","circuit","circuit","rest","rest"],
      days:{ circuit:[ slot("squat",3,12,20,45,"primary"), slot("horizontal_press",3,12,20,45,"primary"),
                       slot("horizontal_pull",3,12,20,45,"primary"), slot("lunge",3,12,20,45),
                       slot("core_antiext",3,15,20,45) ] },
      progression:"density", deloadEvery:8,
      why:"Short rests keep the heart rate up, and resistance training in a deficit is what preserves muscle while weight comes off. Progression is density — same work in less time — because load rarely climbs while eating under maintenance." },

    /* HIIT and metabolic conditioning. Separate from Fat Loss Circuit on purpose: a circuit is
       continuous work at a moderate effort, HIIT is genuinely maximal intervals with real rest.
       Prescribing them as the same thing is why "HIIT" so often means "a circuit done tired".

       Only THREE sessions a week at most, and never on consecutive days. Interval work at true
       intensity is the most fatiguing thing in this whole library, and the common failure is
       not doing too little of it — it is doing it five days a week until nothing recovers. */
    { id:"hiit_beginner", name:"HIIT Starter",
      goals:["fatloss","general","recomp"], experience:["beginner"],
      daysRange:[2,3], minMinutes:30, equipment:["full_gym","home_gym","dumbbells","bodyweight"],
      schedule:["hiit","rest","strength","rest","hiit","rest","rest"],
      days:{
        hiit:[ slot("run_interval",1,1,1,90,"primary"), slot("squat",3,15,20,60),
               slot("horizontal_press",3,12,15,60), slot("core_antiext",3,20,30,45) ],
        strength:[ slot("squat",3,10,12,90,"primary"), slot("horizontal_press",3,10,12,90,"primary"),
                   slot("horizontal_pull",3,10,12,90,"primary"), slot("hinge",2,10,12,90) ]
      }, progression:"density", deloadEvery:6,
      why:"Two interval sessions and one strength day. Intervals are capped at two a week here because a beginner's limiter is recovery, not effort." },

    { id:"hiit_conditioning", name:"HIIT Conditioning",
      goals:["fatloss","recomp","general"], experience:["intermediate","advanced"],
      daysRange:[4,5], minMinutes:45, equipment:["full_gym","home_gym"],
      schedule:["hiit","strength","rest","hiit","strength","zone2","rest"],
      days:{
        hiit:[ slot("run_interval",1,1,1,90,"primary"), slot("sled_push",4,1,1,90,"primary"),
               slot("wall_ball",4,15,20,60), slot("row_erg",3,1,1,90) ],
        strength:[ slot("squat",4,6,10,120,"primary"), slot("horizontal_press",4,6,10,120,"primary"),
                   slot("horizontal_pull",4,6,10,120,"primary"), slot("core_antiext",3,15,20,60) ],
        zone2:[ slot("run_easy",1,1,1,0,"primary") ]
      }, progression:"density", deloadEvery:5,
      why:"Intervals and strength alternate so neither is done on tired legs, with one easy aerobic day. Deloads every five weeks — interval work accumulates fatigue faster than lifting does." },

    { id:"hyrox_beginner", name:"HYROX Beginner",
      goals:["hyrox"], experience:["beginner"],
      daysRange:[3,3], minMinutes:60, equipment:["full_gym"],
      schedule:["strength","zone2","rest","stations","rest","zone2","rest"],
      days:{
        strength:[ slot("squat",3,8,12,120,"primary"), slot("horizontal_press",3,8,12,90,"secondary"),
                   slot("horizontal_pull",3,8,12,90,"secondary"), slot("core_antiext",3,10,15,60) ],
        zone2:[ slot("run_easy",1,1,1,0,"primary") ],
        stations:[ slot("sled_push",4,1,1,120,"primary"), slot("sled_pull",4,1,1,120,"primary"),
                   slot("carry",3,1,1,90), slot("wall_ball",4,15,20,90) ]
      }, progression:"volume_first", deloadEvery:6,
      why:"Aerobic base before intensity. A first-timer's limiter is almost never strength — it is being able to run the eight kilometres at all." },

    { id:"hyrox_intermediate", name:"HYROX Intermediate",
      goals:["hyrox"], experience:["intermediate"],
      daysRange:[4,5], minMinutes:75, equipment:["full_gym"],
      schedule:["strength","compromised","zone2","stations","rest","long_run","rest"],
      days:{
        strength:[ slot("squat",4,5,8,180,"primary"), slot("hinge",3,5,8,150,"primary"),
                   slot("vertical_press",3,8,12,90) ],
        compromised:[ slot("run_interval",1,1,1,0,"primary"), slot("sled_push",4,1,1,90,"primary"),
                      slot("wall_ball",4,15,20,60) ],
        zone2:[ slot("run_easy",1,1,1,0,"primary") ],
        stations:[ slot("sled_pull",4,1,1,120,"primary"), slot("carry",4,1,1,90),
                   slot("sandbag_lunge",3,1,1,120), slot("row_erg",3,1,1,90) ],
        long_run:[ slot("run_easy",1,1,1,0,"primary") ]
      }, progression:"pace_and_load", deloadEvery:5,
      why:"Compromised running — stations immediately before a run — is the specific skill HYROX tests and the one that cannot be trained by doing each separately." },

    { id:"hyrox_advanced", name:"HYROX Advanced",
      goals:["hyrox"], experience:["advanced"],
      daysRange:[5,6], minMinutes:90, equipment:["full_gym"],
      schedule:["strength","compromised","zone2","stations","race_sim","long_run","rest"],
      days:{
        strength:[ slot("squat",4,3,5,240,"primary"), slot("hinge",4,3,5,240,"primary") ],
        compromised:[ slot("run_interval",1,1,1,0,"primary"), slot("sled_push",5,1,1,90,"primary"),
                      slot("wall_ball",5,15,20,60) ],
        zone2:[ slot("run_easy",1,1,1,0,"primary") ],
        stations:[ slot("sled_pull",5,1,1,90,"primary"), slot("carry",4,1,1,90),
                   slot("sandbag_lunge",4,1,1,90), slot("ski_erg",4,1,1,90), slot("row_erg",4,1,1,90) ],
        race_sim:[ slot("race_simulation",1,1,1,0,"primary") ],
        long_run:[ slot("run_easy",1,1,1,0,"primary") ]
      }, progression:"race_pace_taper", deloadEvery:4,
      why:"Full race simulation plus station specificity. Deloads every 4 weeks — this volume is not sustainable without them." },

    { id:"running_strength", name:"Running + Strength",
      goals:["endurance"], experience:["beginner","intermediate","advanced"],
      daysRange:[4,5], minMinutes:45, equipment:["full_gym","home_gym","dumbbells","bodyweight"],
      schedule:["easy_run","strength","interval","rest","strength","long_run","rest"],
      days:{
        easy_run:[ slot("run_easy",1,1,1,0,"primary") ],
        interval:[ slot("run_interval",1,1,1,0,"primary") ],
        long_run:[ slot("run_easy",1,1,1,0,"primary") ],
        strength:[ slot("squat",3,5,8,150,"primary"), slot("hinge",3,5,8,150,"primary"),
                   slot("lunge",3,8,12,90), slot("core_antiext",3,10,15,60) ]
      }, progression:"mileage_capped", deloadEvery:4,
      why:"Heavy, low-rep strength work improves running economy without adding the muscle mass that would cost you. Weekly mileage is capped at +10% — the most common cause of running injury is doing too much too soon." },

    { id:"home_workout", name:"Home Workout",
      goals:["general","fatloss","muscle"], experience:["beginner","intermediate","advanced"],
      daysRange:[3,4], minMinutes:30, equipment:["home_gym","dumbbells","bodyweight"],
      schedule:["full","rest","full","rest","full","rest","rest"],
      days:{ full: FULL }, progression:"double_progression", deloadEvery:8,
      why:"Whatever is actually at home. Falls back through the substitution chain until every pattern resolves to something available." },

    { id:"dumbbell_only", name:"Dumbbell Only",
      goals:["muscle","general","recomp"], experience:["beginner","intermediate","advanced"],
      daysRange:[3,5], minMinutes:45, equipment:["dumbbells","home_gym"],
      schedule:["upper","lower","rest","upper","lower","rest","rest"],
      days:{ upper: UPPER, lower: LOWER }, progression:"double_progression", deloadEvery:8,
      why:"Upper/lower works with dumbbells in a way a heavy-compound split does not — every pattern here has a real dumbbell version." },

    { id:"bodyweight", name:"Bodyweight",
      goals:["general","fatloss"], experience:["beginner","intermediate"],
      daysRange:[3,5], minMinutes:30, equipment:["bodyweight"],
      schedule:["full","rest","full","rest","full","rest","rest"],
      days:{ full:[ slot("squat",3,10,20,60,"primary"), slot("horizontal_press",3,8,20,60,"primary"),
                    slot("vertical_pull",3,3,12,90,"primary"), slot("lunge",3,10,15,60),
                    slot("core_antiext",3,20,45,45) ] },
      progression:"leverage", deloadEvery:8,
      why:"Progresses by leverage, not load — incline pushup to flat to decline to archer. Treating bodyweight as 'just add reps' produces 40-rep sets that train endurance rather than strength." }
  ];

  var byId = {};
  TEMPLATES.forEach(function (t) { byId[t.id] = t; });

  function get(id) { return byId[id] || null; }
  function all() { return TEMPLATES.slice(); }

  /** Total working sets in a week — used by the matcher to sanity-check session length. */
  function weeklySets(template) {
    var total = 0;
    (template.schedule || []).forEach(function (dayKey) {
      var day = template.days[dayKey];
      if (!day) return;                       // "rest" has no entry, by design
      day.forEach(function (sl) { total += sl.sets; });
    });
    return total;
  }

  return Object.freeze({ get: get, all: all, weeklySets: weeklySets, TEMPLATES: TEMPLATES });
})();
