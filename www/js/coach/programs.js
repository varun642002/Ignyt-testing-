/* =========================================================
   IGNYT TRAINING PROGRAMS — the structured multi-week plans

   Replaces the 8-week HYROX plan that used to be built inline in app.js. Two programs now, both
   16 weeks in four 4-week phases, and the shape is data rather than code so a third costs a
   literal instead of a function.

   EVERY EXERCISE NAME HERE IS A LIBRARY NAME, EXACTLY.
   This is the one rule that matters and the one that has already been broken once: the old plan
   shipped names like "Back Squat" and "Bench Press" that the library stopped carrying when it
   was rebuilt, so sixteen of its twenty exercises silently resolved to nothing — no illustration
   on the live card, an empty How To screen, and no error anywhere. Every name below was checked
   against allLibraryExercises() before it was written down.

   WHERE THE SOURCE PROGRAM NAMED SOMETHING THE LIBRARY DOES NOT HAVE, the closest real exercise
   is used and the substitution is stated in the note — visible to the user, rather than a
   silent swap. Those are:

     knee push-ups        -> Incline Push Ups        (the library has no knee variant; both are
                             the same regression, and the incline one has artwork)
     hollow-body hold     -> Hollow Rock             (no static hold in the library; the note
                             says to hold it if that is what you want)
     band triceps pushdown-> Band Tricep Extension   (no band pushdown exists)
     band RDL             -> Band Good Morning       (the library's band hinge; Deadlift (Band)
                             is a floor pull, which is a different movement)
     band reverse fly     -> Band Pullaparts         (same movement, the library's name for it)
     band split squat     -> Chair Bulgarian Split Squat, with a note to stand on the band
     band pallof press    -> Cable Core Pallof Press, with a note to anchor a band instead

   NOT CONVERTED TO "SETS x REPS" NUMBERS. The prescriptions are kept as the strings the source
   program uses ("3x8-12", "3x30-45 sec", "3x10/side") because that is what a person reads off a
   plan. The set logger parses what it needs; inventing a numeric schema here would mean two
   representations of the same fact.
========================================================= */
(function () {
  "use strict";

  /* Four phases, four weeks each. The label is what the plan screen prints above the week. */
  var PHASES = [
    { from: 1,  to: 4,  key: "foundation",  label: "FOUNDATION — TECHNIQUE FIRST" },
    { from: 5,  to: 8,  key: "strength",    label: "STRENGTH — ADD SETS AND REPS" },
    { from: 9,  to: 12, key: "advanced",    label: "ADVANCED — HARDER VARIATIONS" },
    { from: 13, to: 16, key: "performance", label: "PERFORMANCE — INTENSITY, LESS REST" }
  ];

  /* ---------------------------------------------------------
     16-WEEK BODYWEIGHT
  --------------------------------------------------------- */
  var BODYWEIGHT = {
    foundation: [
      { day: "Monday", session: "Upper + Core", exercises: [
        { name: "Incline Push Ups",  presc: "3x8-12" },
        { name: "Knee Push Up",      presc: "2x10-15" },
        { name: "Pike Pushup",       presc: "3x6-10" },
        { name: "Plank",             presc: "3x30-45 sec" },
        { name: "Dead Bug",          presc: "3x10/side" } ] },
      { day: "Tuesday", session: "Lower", exercises: [
        { name: "Squat (Bodyweight)", presc: "4x12-15" },
        { name: "Reverse Lunge",      presc: "3x10/leg" },
        { name: "Glute Bridge",       presc: "3x15" },
        { name: "Standing Calf Raise (Bodyweight)", presc: "4x15-20" },
        { name: "Wall Sit",           presc: "3x30-45 sec" } ] },
      { day: "Wednesday", session: "Walk + Mobility", exercises: [
        { name: "Walk / Mobility",   presc: "20-30 min brisk walk", note: "Then 15 min mobility. Easy pace — this is recovery, not a session" } ] },
      { day: "Thursday", session: "Upper + Core", exercises: [
        { name: "Push Up",           presc: "4x8-12" },
        { name: "Close Grip Push Up", presc: "3x6-10" },
        { name: "Pike Pushup",       presc: "3x8" },
        { name: "Mountain Climber",  presc: "3x20" },
        { name: "Plank",             presc: "3x40 sec" } ] },
      { day: "Friday", session: "Lower + Conditioning", exercises: [
        { name: "Squat (Bodyweight)", presc: "3x15" },
        { name: "Walking Lunge",      presc: "3x10/leg" },
        { name: "Glute Bridge",       presc: "3x15" },
        { name: "High Knees",         presc: "4x30 sec" },
        { name: "Burpee",             presc: "3x5-8" } ] },
      { day: "Saturday", session: "Full Body — 3 rounds", exercises: [
        { name: "Push Up",            presc: "3 rounds x 10" },
        { name: "Squat (Bodyweight)", presc: "3 rounds x 15" },
        { name: "Walking Lunge",      presc: "3 rounds x 10/leg" },
        { name: "Mountain Climber",   presc: "3 rounds x 20" },
        { name: "Plank",              presc: "3 rounds x 30 sec" } ] }
    ],
    strength: [
      { day: "Monday", session: "Upper + Core", exercises: [
        { name: "Push Up",           presc: "4x10-15" },
        { name: "Decline Push Up",   presc: "3x8-12" },
        { name: "Diamond Push Up",   presc: "3x8-12" },
        { name: "Pike Pushup",       presc: "3x8-12" },
        { name: "Plank",             presc: "3x45-60 sec" } ] },
      { day: "Tuesday", session: "Lower", exercises: [
        { name: "Squat (Bodyweight)",         presc: "4x15" },
        { name: "Chair Bulgarian Split Squat", presc: "3x10/leg" },
        { name: "Single Leg Glute Bridge",    presc: "3x12/leg" },
        { name: "Standing Calf Raise (Bodyweight)", presc: "4x20" },
        { name: "Wall Sit",                   presc: "3x45-60 sec" } ] },
      { day: "Wednesday", session: "Walk + Mobility", exercises: [
        { name: "Walk / Mobility",   presc: "25-30 min", note: "Keep it conversational" } ] },
      { day: "Thursday", session: "Upper + Core", exercises: [
        { name: "Push Up",           presc: "4x12-15" },
        { name: "Close Grip Push Up", presc: "3x8-12" },
        { name: "Pike Pushup",       presc: "3x10" },
        { name: "Mountain Climber",  presc: "3x25" },
        { name: "Dead Bug",          presc: "3x12/side" } ] },
      { day: "Friday", session: "Lower + Conditioning", exercises: [
        { name: "Jump Squat",        presc: "3x10-12" },
        { name: "Walking Lunge",     presc: "3x12/leg" },
        { name: "Glute Bridge",      presc: "4x15" },
        { name: "High Knees",        presc: "4x40 sec" },
        { name: "Burpee",            presc: "3x8-10" } ] },
      { day: "Saturday", session: "Full Body — 4 rounds", exercises: [
        { name: "Push Up",            presc: "4 rounds x 12" },
        { name: "Squat (Bodyweight)", presc: "4 rounds x 18" },
        { name: "Walking Lunge",      presc: "4 rounds x 12/leg" },
        { name: "Mountain Climber",   presc: "4 rounds x 20" },
        { name: "Plank",              presc: "4 rounds x 40 sec" } ] }
    ],
    advanced: [
      { day: "Monday", session: "Upper Strength", exercises: [
        { name: "Decline Push Up",   presc: "4x8-12" },
        { name: "Archer Push Up",    presc: "3x5-8/side", note: "Progression — go to the depth you can control" },
        { name: "Diamond Push Up",   presc: "3x10" },
        { name: "Pike Pushup",       presc: "4x8-12" },
        { name: "Hollow Body Hold",  presc: "3x30-45 sec" } ] },
      { day: "Tuesday", session: "Lower Strength", exercises: [
        { name: "Chair Bulgarian Split Squat", presc: "4x8-12/leg" },
        { name: "Pistol Squat",      presc: "3x5-8/leg", note: "Progression — box or assisted until the full range is there" },
        { name: "Jump Lunge",        presc: "3x10/leg" },
        { name: "Single Leg Glute Bridge", presc: "3x12/leg" },
        { name: "Standing Calf Raise (Bodyweight)", presc: "4x20" } ] },
      { day: "Wednesday", session: "Conditioning", exercises: [
        { name: "High Knees",        presc: "4x40 sec" },
        { name: "Mountain Climber",  presc: "4x25" },
        { name: "Jumping Jack",      presc: "4x40 sec" },
        { name: "Bear Crawl",        presc: "3x20 m" } ] },
      { day: "Thursday", session: "Upper + Core", exercises: [
        { name: "Decline Push Up",   presc: "4x10" },
        { name: "Close Grip Push Up", presc: "3x10-12" },
        { name: "Pike Pushup",       presc: "4x10" },
        { name: "Plank",             presc: "3x60 sec" },
        { name: "Dead Bug",          presc: "3x12/side" } ] },
      { day: "Friday", session: "Lower + Conditioning", exercises: [
        { name: "Jump Squat",        presc: "4x12" },
        { name: "Walking Lunge",     presc: "3x15/leg" },
        { name: "Glute Bridge",      presc: "4x15" },
        { name: "Burpee",            presc: "4x10" },
        { name: "High Knees",        presc: "4x40 sec" } ] },
      { day: "Saturday", session: "Full Body — 4-5 rounds", exercises: [
        { name: "Push Up",            presc: "4-5 rounds x 12" },
        { name: "Squat (Bodyweight)", presc: "4-5 rounds x 20" },
        { name: "Burpee",             presc: "4-5 rounds x 8" },
        { name: "Mountain Climber",   presc: "4-5 rounds x 20/side" },
        { name: "Plank",              presc: "4-5 rounds x 40 sec", note: "Controlled rest between rounds" } ] }
    ],
    performance: [
      { day: "Monday", session: "Upper Strength", exercises: [
        { name: "Decline Push Up",   presc: "4x10" },
        { name: "Diamond Push Up",   presc: "4x8-12" },
        { name: "Pike Pushup",       presc: "4x10" },
        { name: "Archer Push Up",    presc: "3x6/side" },
        { name: "Hollow Body Hold",  presc: "3x45 sec" } ] },
      { day: "Tuesday", session: "Lower Strength", exercises: [
        { name: "Chair Bulgarian Split Squat", presc: "4x10/leg" },
        { name: "Pistol Squat",      presc: "3x6/leg", note: "Progression" },
        { name: "Jump Squat",        presc: "4x10" },
        { name: "Walking Lunge",     presc: "3x15/leg" },
        { name: "Standing Calf Raise (Bodyweight)", presc: "4x20" } ] },
      { day: "Wednesday", session: "Conditioning — 20-30 min", exercises: [
        { name: "High Knees",        presc: "5x40 sec" },
        { name: "Mountain Climber",  presc: "5x25" },
        { name: "Burpee",            presc: "5x10" },
        { name: "Jumping Jack",      presc: "5x40 sec" },
        { name: "Bear Crawl",        presc: "4x20 m" } ] },
      { day: "Thursday", session: "Upper + Core", exercises: [
        { name: "Decline Push Up",   presc: "4x12", note: "Monday again — beat last session on reps or on tempo" },
        { name: "Diamond Push Up",   presc: "4x10-12" },
        { name: "Pike Pushup",       presc: "4x12" },
        { name: "Archer Push Up",    presc: "3x8/side" },
        { name: "Hollow Body Hold",  presc: "3x45 sec" } ] },
      { day: "Friday", session: "Lower + Conditioning", exercises: [
        { name: "Chair Bulgarian Split Squat", presc: "4x10/leg" },
        { name: "Jump Squat",        presc: "4x12" },
        { name: "Walking Lunge",     presc: "3x15/leg" },
        { name: "Burpee",           presc: "4x10", note: "The 10-15 min conditioning block" },
        { name: "Mountain Climber",  presc: "4x25" } ] },
      { day: "Saturday", session: "Full Body Challenge — 5 rounds", exercises: [
        { name: "Push Up",            presc: "5 rounds x 15" },
        { name: "Squat (Bodyweight)", presc: "5 rounds x 20" },
        { name: "Burpee",             presc: "5 rounds x 10" },
        { name: "Mountain Climber",   presc: "5 rounds x 20/side" },
        { name: "Walking Lunge",      presc: "5 rounds x 15/leg" },
        { name: "Plank",              presc: "5 rounds x 45 sec" } ] }
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK RESISTANCE BAND
     Different weekly split from the bodyweight plan, as the source specifies: a push/pull/legs
     shape rather than upper/lower.
  --------------------------------------------------------- */
  var BAND = {
    foundation: [
      { day: "Monday", session: "Chest + Shoulders + Triceps", exercises: [
        { name: "Chest Press (Band)",  presc: "3x12-15" },
        { name: "Chest Fly (Band)",    presc: "3x12-15" },
        { name: "Band Shoulder Press", presc: "3x10-15" },
        { name: "Lateral Raise (Band)", presc: "3x12-15" },
        { name: "Band Triceps Pushdown", presc: "3x12-15" } ] },
      { day: "Tuesday", session: "Back + Biceps", exercises: [
        { name: "Lat Pulldown (Band)", presc: "3x12-15" },
        { name: "Bent Over Row (Band)", presc: "3x12-15" },
        { name: "Band Face Pull",      presc: "3x12-15" },
        { name: "Band Bicep Curl",     presc: "3x12-15" },
        { name: "Hammer Curl (Band)",  presc: "3x12-15" } ] },
      { day: "Wednesday", session: "Legs + Core", exercises: [
        { name: "Squat (Band)",        presc: "4x12-15" },
        { name: "Band Romanian Deadlift", presc: "3x12-15" },
        { name: "Band Hip Thrust",     presc: "3x15" },
        { name: "Lateral Band Walks",  presc: "3x12/side" },
        { name: "Plank",               presc: "3x30-45 sec" } ] },
      { day: "Thursday", session: "Rest / Mobility", exercises: [
        { name: "Walk / Mobility",     presc: "15-20 min", note: "Optional — movement, not training" } ] },
      { day: "Friday", session: "Upper Body", exercises: [
        { name: "Chest Press (Band)",  presc: "3x12" },
        { name: "Bent Over Row (Band)", presc: "3x12" },
        { name: "Band Shoulder Press", presc: "3x12" },
        { name: "Lateral Raise (Band)", presc: "3x15" },
        { name: "Band Bicep Curl",     presc: "3x12" },
        { name: "Band Tricep Extension", presc: "3x12" } ] },
      { day: "Saturday", session: "Full Body — 3 rounds", exercises: [
        { name: "Squat (Band)",        presc: "3 rounds x 15" },
        { name: "Bent Over Row (Band)", presc: "3 rounds x 15" },
        { name: "Chest Press (Band)",  presc: "3 rounds x 15" },
        { name: "Band Good Morning",   presc: "3 rounds x 12" },
        { name: "Band Shoulder Press", presc: "3 rounds x 12" },
        { name: "Mountain Climber",    presc: "3 rounds x 20" } ] }
    ],
    strength: [
      { day: "Monday", session: "Chest + Shoulders + Triceps", exercises: [
        { name: "Chest Press (Band)",  presc: "4x10-15", note: "Heavier band before more reps" },
        { name: "Chest Fly (Band)",    presc: "3x12-15" },
        { name: "Band Shoulder Press", presc: "3x10-12" },
        { name: "Lateral Raise (Band)", presc: "3x12-15" },
        { name: "Band Tricep Extension", presc: "3x10-15" } ] },
      { day: "Tuesday", session: "Back + Biceps", exercises: [
        { name: "Lat Pulldown (Band)", presc: "4x10-15" },
        { name: "Bent Over Row (Band)", presc: "4x10-15" },
        { name: "Band Face Pull",      presc: "3x12-15" },
        { name: "Band Bicep Curl",     presc: "3x10-15" },
        { name: "Hammer Curl (Band)",  presc: "3x12" } ] },
      { day: "Wednesday", session: "Legs + Core", exercises: [
        { name: "Squat (Band)",        presc: "4x12-15" },
        { name: "Band Good Morning",   presc: "4x10-15" },
        { name: "Chair Bulgarian Split Squat", presc: "3x10/leg", note: "Stand on the band and hold the handles to load it" },
        { name: "Band Hip Thrust",     presc: "3x15" },
        { name: "Cable Core Pallof Press", presc: "3x10/side", note: "Anchor a band at chest height instead of a cable" } ] },
      { day: "Thursday", session: "Rest / Mobility", exercises: [
        { name: "Walk / Mobility",     presc: "15-20 min" } ] },
      { day: "Friday", session: "Upper Body", exercises: [
        { name: "Chest Press (Band)",  presc: "4x12" },
        { name: "Bent Over Row (Band)", presc: "4x12" },
        { name: "Band Shoulder Press", presc: "3x12" },
        { name: "Lat Pulldown (Band)", presc: "3x12" },
        { name: "Band Bicep Curl",     presc: "3x12-15" },
        { name: "Band Tricep Extension", presc: "3x12-15" } ] },
      { day: "Saturday", session: "Full Body — 4 rounds", exercises: [
        { name: "Squat (Band)",        presc: "4 rounds x 15" },
        { name: "Bent Over Row (Band)", presc: "4 rounds x 15" },
        { name: "Chest Press (Band)",  presc: "4 rounds x 15" },
        { name: "Band Good Morning",   presc: "4 rounds x 12" },
        { name: "Band Shoulder Press", presc: "4 rounds x 12" },
        { name: "Burpee",              presc: "4 rounds x 8" } ] }
    ],
    advanced: [
      { day: "Monday", session: "Push", exercises: [
        { name: "Chest Press (Band)",  presc: "4x8-12" },
        { name: "Chest Fly (Band)",    presc: "3x10-15" },
        { name: "Band Shoulder Press", presc: "4x8-12" },
        { name: "Lateral Raise (Band)", presc: "3x12-15" },
        { name: "Band Tricep Extension", presc: "4x10-15" } ] },
      { day: "Tuesday", session: "Pull", exercises: [
        { name: "Lat Pulldown (Band)", presc: "4x8-12" },
        { name: "Bent Over Row (Band)", presc: "4x8-12" },
        { name: "Band Face Pull",      presc: "3x12-15" },
        { name: "Band Pullaparts",     presc: "3x12-15", note: "The band reverse fly — the library's name for the same movement" },
        { name: "Band Bicep Curl",     presc: "4x10-12" } ] },
      { day: "Wednesday", session: "Legs + Core", exercises: [
        { name: "Squat (Band)",        presc: "4x10-15" },
        { name: "Band Good Morning",   presc: "4x10-12" },
        { name: "Chair Bulgarian Split Squat", presc: "3x8-12/leg", note: "Stand on the band to load it" },
        { name: "Band Hip Thrust",     presc: "4x12-15" },
        { name: "Lateral Band Walks",  presc: "3x15/side" },
        { name: "Cable Core Pallof Press", presc: "3x12/side", note: "Band anchored at chest height" } ] },
      { day: "Thursday", session: "Rest / Mobility", exercises: [
        { name: "Walk / Mobility",     presc: "15-20 min" } ] },
      { day: "Friday", session: "Upper — supersets", exercises: [
        { name: "Chest Press (Band)",  presc: "4x10-12", note: "Superset with the row below — no rest between the pair" },
        { name: "Bent Over Row (Band)", presc: "4x10-12" },
        { name: "Band Shoulder Press", presc: "3x10-12", note: "Superset with the pulldown" },
        { name: "Lat Pulldown (Band)", presc: "3x10-12" },
        { name: "Band Bicep Curl",     presc: "3x12-15", note: "Superset with the extension" },
        { name: "Band Tricep Extension", presc: "3x12-15" } ] },
      { day: "Saturday", session: "Conditioning — 4 rounds", exercises: [
        { name: "Squat (Band)",        presc: "4 rounds x 15" },
        { name: "Bent Over Row (Band)", presc: "4 rounds x 15" },
        { name: "Chest Press (Band)",  presc: "4 rounds x 15" },
        { name: "Band Good Morning",   presc: "4 rounds x 12" },
        { name: "Band Shoulder Press", presc: "4 rounds x 12" },
        { name: "Burpee",              presc: "4 rounds x 8-10" } ] }
    ],
    performance: [
      { day: "Monday", session: "Push — heavy band", exercises: [
        { name: "Chest Press (Band)",  presc: "4x8-12", note: "Heaviest band you can control. Slow eccentric" },
        { name: "Chest Fly (Band)",    presc: "3x12" },
        { name: "Band Shoulder Press", presc: "4x8-12", note: "Heavy band" },
        { name: "Lateral Raise (Band)", presc: "4x12-15" },
        { name: "Band Tricep Extension", presc: "4x10-15" } ] },
      { day: "Tuesday", session: "Pull — heavy band", exercises: [
        { name: "Lat Pulldown (Band)", presc: "4x8-12", note: "Heavy band" },
        { name: "Bent Over Row (Band)", presc: "4x8-12", note: "Heavy band" },
        { name: "Band Face Pull",      presc: "3x15" },
        { name: "Band Pullaparts",     presc: "3x12-15" },
        { name: "Band Bicep Curl",     presc: "4x10-12" } ] },
      { day: "Wednesday", session: "Legs", exercises: [
        { name: "Squat (Band)",        presc: "4x10-12", note: "Heavy band" },
        { name: "Band Good Morning",   presc: "4x10-12", note: "Heavy band" },
        { name: "Chair Bulgarian Split Squat", presc: "4x8-10/leg" },
        { name: "Band Hip Thrust",     presc: "4x15" },
        { name: "Lateral Band Walks",  presc: "3x15/side" },
        { name: "Standing Calf Raise (Bodyweight)", presc: "4x15-20", note: "Stand on the band for resistance" } ] },
      { day: "Thursday", session: "Rest / Mobility", exercises: [
        { name: "Walk / Mobility",     presc: "15-20 min" } ] },
      { day: "Friday", session: "Full Upper — 4 rounds", exercises: [
        { name: "Chest Press (Band)",  presc: "4 rounds x 12" },
        { name: "Bent Over Row (Band)", presc: "4 rounds x 12" },
        { name: "Band Shoulder Press", presc: "4 rounds x 10" },
        { name: "Lat Pulldown (Band)", presc: "4 rounds x 12" },
        { name: "Band Bicep Curl",     presc: "4 rounds x 12" },
        { name: "Band Tricep Extension", presc: "4 rounds x 12" } ] },
      { day: "Saturday", session: "Full Body Challenge — 5 rounds", exercises: [
        { name: "Squat (Band)",        presc: "5 rounds x 15" },
        { name: "Bent Over Row (Band)", presc: "5 rounds x 15" },
        { name: "Chest Press (Band)",  presc: "5 rounds x 15" },
        { name: "Band Good Morning",   presc: "5 rounds x 12" },
        { name: "Band Shoulder Press", presc: "5 rounds x 12" },
        { name: "Reverse Lunge",       presc: "5 rounds x 10/leg", note: "Stand on the band to load it" },
        { name: "Mountain Climber",    presc: "5 rounds x 20", note: "60-90 sec rest between rounds" } ] }
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK DUMBBELL ONLY
     Substitutions, for the same reason as above — the library has no one-arm dumbbell row and
     no dumbbell overhead extension, so the nearest real movement is used and said out loud.
  --------------------------------------------------------- */
  var DB_MON = [
    { name: "Bench Press (Dumbbell)",         presc: "3x10-12" },
    { name: "Incline Bench Press (Dumbbell)", presc: "3x10-12" },
    { name: "Chest Fly (Dumbbell)",           presc: "3x12-15" },
    { name: "Pullover (Dumbbell)",            presc: "3x10-12" },
    { name: "Skullcrusher (Dumbbell)",        presc: "3x10-15", note: "The overhead extension slot — take it overhead if you prefer" },
    { name: "Skullcrusher (Dumbbell)",        presc: "3x10-12" } ];
  var DB_TUE = [
    { name: "One Arm Row (Dumbbell)",    presc: "3x10-12/side" },
    { name: "Seal Row (Dumbbell)",       presc: "3x10-12" },
    { name: "Pullover (Dumbbell)",       presc: "3x10-12" },
    { name: "Rear Delt Reverse Fly (Dumbbell)", presc: "3x12-15" },
    { name: "Bicep Curl (Dumbbell)",     presc: "3x10-15" },
    { name: "Hammer Curl (Dumbbell)",    presc: "3x10-15" } ];
  var DB_WED = [
    { name: "Goblet Squat",                   presc: "4x10-15" },
    { name: "Romanian Deadlift (Dumbbell)",   presc: "3x10-15" },
    { name: "Reverse Lunge (Dumbbell)",       presc: "3x10/leg" },
    { name: "Bulgarian Split Squat (Dumbbell)", presc: "3x8-10/leg" },
    { name: "Standing Calf Raise (Dumbbell)", presc: "4x15-20" },
    { name: "Suitcase Carry (Dumbbell)",      presc: "3x30 sec/side" } ];
  var DB_FRI = [
    { name: "Shoulder Press (Dumbbell)", presc: "3x10-12" },
    { name: "Lateral Raise (Dumbbell)",  presc: "3x12-15" },
    { name: "Front Raise (Dumbbell)",    presc: "3x12-15" },
    { name: "Rear Delt Reverse Fly (Dumbbell)", presc: "3x12-15" },
    { name: "Bicep Curl (Dumbbell)",     presc: "3x12" },
    { name: "Hammer Curl (Dumbbell)",    presc: "3x12" },
    { name: "Skullcrusher (Dumbbell)",   presc: "3x12" } ];
  var DB_SAT = [
    { name: "Goblet Squat",                 presc: "3x12" },
    { name: "Romanian Deadlift (Dumbbell)", presc: "3x12" },
    { name: "Bench Press (Dumbbell)",       presc: "3x12" },
    { name: "Bent Over Row (Dumbbell)",     presc: "3x12/side" },
    { name: "Shoulder Press (Dumbbell)",    presc: "3x10" },
    { name: "Hammer Curl (Dumbbell)",       presc: "3x12" } ];

  function dbDays(monR, tueR, wedR, friR, satR, satLabel, satNote) {
    var reps = function (list, over) {
      return list.map(function (e, i) {
        return { name: e.name, presc: over[i] || e.presc, note: e.note };
      });
    };
    return [
      { day: "Monday",   session: "Chest + Triceps", exercises: reps(DB_MON, monR) },
      { day: "Tuesday",  session: "Back + Biceps",   exercises: reps(DB_TUE, tueR) },
      { day: "Wednesday", session: "Legs + Core",    exercises: reps(DB_WED, wedR) },
      { day: "Thursday", session: "Rest", exercises: [
        { name: "Walk / Mobility", presc: "Optional 15-20 min" } ] },
      { day: "Friday",   session: "Shoulders + Arms", exercises: reps(DB_FRI, friR) },
      { day: "Saturday", session: satLabel, exercises: reps(DB_SAT, satR).map(function (e, i) {
        return i === 0 && satNote ? { name: e.name, presc: e.presc, note: satNote } : e; }) }
    ];
  }

  var DUMBBELL = {
    foundation:  dbDays([], [], [], [], [], "Full Body"),
    strength:    dbDays(["4x8-12","3x8-12","3x12-15","3x10-12","3x10-12","3x10-12"],
                        ["4x8-12/side","4x8-12","3x10-12","3x12-15","3x10-12","3x10-12"],
                        ["4x10-12","4x8-12","3x10/leg","3x8-12/leg","4x15-20","3x30 sec/side"],
                        ["4x8-12","3x12-15","3x12-15","3x12-15","3x10-12","3x10-12","3x10-12"],
                        ["3x12","3x12","3x12","3x12/side","3x10","3x12"], "Full Body"),
    advanced:    dbDays(["4x8-10","4x8-10","3x10-12","3x10-12","4x8-12","3x10-12"],
                        ["4x8-10/side","4x8-12","3x10-12","3x12-15","4x8-12","3x10-12"],
                        ["4x8-12","4x8-12","3x10/leg","3x8-10/leg","4x15-20","4x30-45 sec"],
                        ["4x8-10","4x12-15","3x12-15","3x12-15","3x10-12","3x10-12","3x10-12"],
                        ["4 rounds x 12","4 rounds x 10","4 rounds x 10","4 rounds x 10/side",
                         "4 rounds x 10","4 rounds x 30 sec"], "Full Body — 4 rounds"),
    performance: dbDays(["4x6-10","4x8-10","3x10-12","3x10","4x8-12","3x10-12"],
                        ["4x8-10/side","4x8-10","3x10-12","4x12-15","4x8-12","3x10-12"],
                        ["4x8-12","4x8-12","3x12/leg","4x8/leg","4x15-20","4x45 sec"],
                        ["4x8-10","4x12-15","4x12-15","4x12-15","3x8-12","3x10-12","3x8-12"],
                        ["5 rounds x 12","5 rounds x 10","5 rounds x 10","5 rounds x 10/side",
                         "5 rounds x 10","5 rounds x 45 sec"],
                        "Full Body Challenge — 5 rounds", "60-90 sec rest between rounds")
  };

  /* ---------------------------------------------------------
     16-WEEK BARBELL ONLY
  --------------------------------------------------------- */
  var BB_MON = [
    { name: "Bench Press (Barbell)",             presc: "3x10-12" },
    { name: "Incline Bench Press (Barbell)",     presc: "3x10-12" },
    { name: "Bench Press - Close Grip (Barbell)", presc: "3x10-12" },
    { name: "Floor Press (Barbell)",             presc: "3x10-12" } ];
  var BB_TUE = [
    { name: "Bent Over Row (Barbell)", presc: "4x8-12" },
    { name: "Pendlay Row (Barbell)",   presc: "3x8-10" },
    { name: "Shrug (Barbell)",         presc: "3x12-15" },
    { name: "Bicep Curl (Barbell)",    presc: "3x10-15" },
    { name: "Reverse Curl (Barbell)",  presc: "3x10-15" } ];
  var BB_WED = [
    { name: "Squat (Barbell)",              presc: "4x8-12" },
    { name: "Romanian Deadlift (Barbell)",  presc: "3x10-12" },
    { name: "Reverse Lunge (Barbell)",      presc: "3x10/leg" },
    { name: "Hip Thrust (Barbell)",         presc: "3x10-15" },
    { name: "Standing Calf Raise (Barbell)", presc: "4x15-20" } ];
  var BB_FRI = [
    { name: "Overhead Press (Barbell)",          presc: "4x8-12" },
    { name: "Front Raise (Barbell)",             presc: "3x12-15" },
    { name: "Bench Press - Close Grip (Barbell)", presc: "3x10-12" },
    { name: "Bicep Curl (Barbell)",              presc: "3x10-12" },
    { name: "Skullcrusher (Barbell)",            presc: "3x10-12" } ];
  var BB_SAT = [
    { name: "Squat (Barbell)",             presc: "3x10" },
    { name: "Bench Press (Barbell)",       presc: "3x10" },
    { name: "Bent Over Row (Barbell)",     presc: "3x10" },
    { name: "Romanian Deadlift (Barbell)", presc: "3x10" },
    { name: "Overhead Press (Barbell)",    presc: "3x10" } ];

  function bbDays(monR, tueR, wedR, friR, satR, satLabel, satNote) {
    var reps = function (list, over) {
      return list.map(function (e, i) { return { name: e.name, presc: over[i] || e.presc, note: e.note }; });
    };
    return [
      { day: "Monday",   session: "Chest + Triceps", exercises: reps(BB_MON, monR) },
      { day: "Tuesday",  session: "Back + Biceps",   exercises: reps(BB_TUE, tueR) },
      { day: "Wednesday", session: "Legs",           exercises: reps(BB_WED, wedR) },
      { day: "Thursday", session: "Rest", exercises: [
        { name: "Walk / Mobility", presc: "Optional 15-20 min" } ] },
      { day: "Friday",   session: "Shoulders + Arms", exercises: reps(BB_FRI, friR) },
      { day: "Saturday", session: satLabel, exercises: reps(BB_SAT, satR).map(function (e, i) {
        return i === 0 && satNote ? { name: e.name, presc: e.presc, note: satNote } : e; }) }
    ];
  }

  var BARBELL = {
    foundation:  bbDays([], [], [], [], [], "Full Body"),
    strength:    bbDays(["4x8-10","4x8-10","3x8-12","3x8-12"],
                        ["4x8-10","4x6-10","4x10-15","4x8-12","3x10-12"],
                        ["4x8-10","4x8-12","3x10/leg","4x8-12","4x15-20"],
                        ["4x8-10","3x10-12","3x8-12","3x10-12","3x10-12"],
                        ["4 rounds x 8","4 rounds x 8","4 rounds x 8","4 rounds x 8","4 rounds x 8"],
                        "Full Body — 4 rounds"),
    advanced:    bbDays(["4x6-8","4x6-10","3x8-10","3x8-10"],
                        ["4x6-8","4x6-8","4x10-12","4x8-10","3x10-12"],
                        ["4x6-8","4x6-10","3x8-10/leg","4x8-10","4x15-20"],
                        ["4x6-8","3x12-15","3x8-10","4x8-10","4x8-10"],
                        ["4x6","4x6","4x6","3x8","3x8"], "Full Body"),
    performance: bbDays(["5x5","4x6-8","4x6-8","3x8"],
                        ["5x5","4x6","4x8-12","4x8-10","3x10"],
                        ["5x5","4x6-8","3x8/leg","4x8","4x15"],
                        ["5x5","3x12-15","4x6-8","4x8","4x8"],
                        ["5 rounds x 5","5 rounds x 5","5 rounds x 5","5 rounds x 6","5 rounds x 5"],
                        "Full Body — 5 rounds", "2-3 min rest between rounds")
  };

  /* ---------------------------------------------------------
     16-WEEK HOME GYM — barbell AND dumbbell, no machines
     The mix is the point: barbell for the main lifts, dumbbells for everything that wants a
     longer range or a per-side load. Every name here is one already verified in the two
     single-equipment programs above.
  --------------------------------------------------------- */
  var HG_MON = [
    { name: "Bench Press (Barbell)",             presc: "3x10-12" },
    { name: "Incline Bench Press (Dumbbell)",    presc: "3x10-12" },
    { name: "Chest Fly (Dumbbell)",              presc: "3x12-15" },
    { name: "Bench Press - Close Grip (Barbell)", presc: "3x10-12" },
    { name: "Skullcrusher (Dumbbell)",           presc: "3x12", note: "Take it overhead if you prefer that version" } ];
  var HG_TUE = [
    { name: "Bent Over Row (Barbell)",  presc: "4x10" },
    { name: "One Arm Row (Dumbbell)",   presc: "3x10/side" },
    { name: "Pullover (Dumbbell)",      presc: "3x12" },
    { name: "Bicep Curl (Barbell)",     presc: "3x10-12" },
    { name: "Hammer Curl (Dumbbell)",   presc: "3x12" } ];
  var HG_WED = [
    { name: "Squat (Barbell)",                  presc: "4x10" },
    { name: "Romanian Deadlift (Dumbbell)",     presc: "3x10-12" },
    { name: "Bulgarian Split Squat (Dumbbell)", presc: "3x10/leg" },
    { name: "Hip Thrust (Barbell)",             presc: "3x12" },
    { name: "Standing Calf Raise (Dumbbell)",   presc: "4x15-20" },
    { name: "Suitcase Carry (Dumbbell)",        presc: "3x30 sec/side" } ];
  var HG_FRI = [
    { name: "Overhead Press (Barbell)",         presc: "4x10" },
    { name: "Lateral Raise (Dumbbell)",         presc: "3x12-15" },
    { name: "Rear Delt Reverse Fly (Dumbbell)", presc: "3x12-15" },
    { name: "Bicep Curl (Barbell)",             presc: "3x10-12" },
    { name: "Skullcrusher (Dumbbell)",          presc: "3x10-12" } ];
  var HG_SAT = [
    { name: "Squat (Barbell)",              presc: "3x10" },
    { name: "Bench Press (Dumbbell)",       presc: "3x10" },
    { name: "Bent Over Row (Barbell)",      presc: "3x10" },
    { name: "Romanian Deadlift (Dumbbell)", presc: "3x10" },
    { name: "Shoulder Press (Dumbbell)",    presc: "3x10" } ];

  function hgDays(monR, tueR, wedR, friR, satR, satLabel, satNote) {
    var reps = function (list, over) {
      return list.map(function (e, i) { return { name: e.name, presc: over[i] || e.presc, note: e.note }; });
    };
    return [
      { day: "Monday",   session: "Chest + Triceps", exercises: reps(HG_MON, monR) },
      { day: "Tuesday",  session: "Back + Biceps",   exercises: reps(HG_TUE, tueR) },
      { day: "Wednesday", session: "Legs + Core",    exercises: reps(HG_WED, wedR) },
      { day: "Thursday", session: "Rest", exercises: [
        { name: "Walk / Mobility", presc: "Optional 15-20 min" } ] },
      { day: "Friday",   session: "Shoulders + Arms", exercises: reps(HG_FRI, friR) },
      { day: "Saturday", session: satLabel, exercises: reps(HG_SAT, satR).map(function (e, i) {
        return i === 0 && satNote ? { name: e.name, presc: e.presc, note: satNote } : e; }) }
    ];
  }

  var HOMEGYM = {
    foundation:  hgDays([], [], [], [], [], "Full Body"),
    /* Weeks 5-8 raise the main lifts to 3-4 sets of 8-15 and hold the accessories. */
    strength:    hgDays(["4x8-12","4x8-12","3x12-15","3x8-12","3x12"],
                        ["4x8-12","4x10/side","3x12","3x10-12","3x12"],
                        ["4x8-12","4x8-12","3x10/leg","4x12","4x15-20","3x30 sec/side"],
                        ["4x8-12","3x12-15","3x12-15","3x10-12","3x10-12"],
                        ["3x10","3x10","3x10","3x10","3x10"], "Full Body"),
    advanced:    hgDays(["4x6-8","4x8-10","3x10-12","3x8-10","3x10-12"],
                        ["4x6-8","4x8-10/side","3x10-12","4x8-12","3x10-12"],
                        ["4x6-8","4x8","3x8/leg","4x8-12","4x15-20","4x30-45 sec"],
                        ["4x6-8","3x12-15","3x12-15","3x8-12","3x8-12"],
                        ["4x8","4x8","4x8","3x10","3x10"], "Full Body"),
    performance: hgDays(["5x5","4x6-8","3x10-12","4x6-8","3x8-12"],
                        ["5x5","4x8/side","3x10-12","3x8-12","3x10-12"],
                        ["5x5","4x6-8","3x8/leg","4x8","4x15-20","4x45 sec"],
                        ["5x5","3x12-15","3x12-15","3x8-12","3x8-12"],
                        ["5 rounds x 5","5 rounds x 8","5 rounds x 5","5 rounds x 8","5 rounds x 8"],
                        "Full Body — 5 rounds", "2-3 min rest between rounds")
  };


  /* ---------------------------------------------------------
     16-WEEK FULL GYM — free weights, cables and machines
  --------------------------------------------------------- */
  var FG_MON = [
    { name: "Bench Press (Barbell)",              presc: "3x10-12" },
    { name: "Incline Bench Press (Dumbbell)",     presc: "3x10-12" },
    { name: "Cable Fly Crossovers",               presc: "3x12-15" },
    { name: "Chest Press (Machine)",              presc: "3x10-12" },
    { name: "Triceps Pushdown",                   presc: "3x12-15" },
    { name: "Overhead Triceps Extension (Cable)", presc: "3x12-15" } ];
  var FG_TUE = [
    { name: "Lat Pulldown (Cable)",        presc: "4x10-12" },
    { name: "Bent Over Row (Barbell)",     presc: "3x8-12" },
    { name: "Seated Cable Row - Bar Grip", presc: "3x10-12" },
    { name: "Single Arm Cable Row",        presc: "3x10/side" },
    { name: "Bicep Curl (Barbell)",        presc: "3x10-12" },
    { name: "Hammer Curl (Cable)",         presc: "3x12-15" } ];
  var FG_WED = [
    { name: "Squat (Barbell)",             presc: "4x8-12" },
    { name: "Romanian Deadlift (Barbell)", presc: "3x10-12" },
    { name: "Leg Press (Machine)",         presc: "3x10-15" },
    { name: "Seated Leg Curl (Machine)",   presc: "3x12-15" },
    { name: "Leg Extension (Machine)",     presc: "3x12-15" },
    { name: "Standing Calf Raise",         presc: "4x15-20" } ];
  var FG_FRI = [
    { name: "Overhead Press (Barbell)",           presc: "3x8-12" },
    { name: "Lateral Raise (Dumbbell)",           presc: "3x12-15" },
    { name: "Reverse Pec Deck",                   presc: "3x12-15" },
    { name: "Bicep Curl (Cable)",                 presc: "3x10-12" },
    { name: "Hammer Curl (Cable)",                presc: "3x12" },
    { name: "Triceps Rope Pushdown",              presc: "3x12" },
    { name: "Overhead Triceps Extension (Cable)", presc: "3x12" } ];
  var FG_SAT = [
    { name: "Squat (Barbell)",                 presc: "3x8" },
    { name: "Bench Press (Barbell)",           presc: "3x8" },
    { name: "Lat Pulldown (Cable)",            presc: "3x10" },
    { name: "Romanian Deadlift (Barbell)",     presc: "3x10" },
    { name: "Seated Shoulder Press (Machine)", presc: "3x10" },
    { name: "Seated Cable Row - Bar Grip",     presc: "3x10" } ];

  function fgDays(monR, tueR, wedR, friR, satR, satLabel, satNote) {
    var reps = function (list, over) {
      return list.map(function (e, i) { return { name: e.name, presc: over[i] || e.presc, note: e.note }; });
    };
    return [
      { day: "Monday",    session: "Chest + Triceps",  exercises: reps(FG_MON, monR) },
      { day: "Tuesday",   session: "Back + Biceps",    exercises: reps(FG_TUE, tueR) },
      { day: "Wednesday", session: "Legs",             exercises: reps(FG_WED, wedR) },
      { day: "Thursday",  session: "Rest / Recovery",  exercises: [
        { name: "Walk / Mobility", presc: "Optional 15-20 min" } ] },
      { day: "Friday",    session: "Shoulders + Arms", exercises: reps(FG_FRI, friR) },
      { day: "Saturday",  session: satLabel, exercises: reps(FG_SAT, satR).map(function (e, i) {
        return i === 0 && satNote ? { name: e.name, presc: e.presc, note: satNote } : e; }) }
    ];
  }

  var FULLGYM = {
    foundation:  fgDays([], [], [], [], [], "Full Body"),
    strength:    fgDays(["4x8-12","4x8-12","3x12-15","3x10-12","4x10-15","3x12-15"],
                        ["4x8-12","4x8-12","4x10-12","3x10/side","3x10-12","3x12-15"],
                        ["4x8-12","4x10-12","4x10-15","3x12-15","3x12-15","4x15-20"],
                        ["4x8-12","4x12-15","3x12-15","3x10-12","3x12","3x12","3x12"],
                        ["3x8","3x8","3x10","3x10","3x10","3x10"], "Full Body"),
    advanced:    fgDays(["4x6-8","4x8-10","3x12","3x8-12","4x8-12","3x10-12"],
                        ["4x8-10","4x6-8","3x8-12","3x10","4x8-10","3x10-12"],
                        ["4x6-8","4x8","3x10","3x10-12","3x12","4x15-20"],
                        ["4x6-8","4x12-15","3x12-15","3x10","3x10","3x10","3x10"],
                        ["3x6","3x6","3x8","3x8","3x8","3x10"], "Full Body"),
    performance: fgDays(["5x5","4x6-8","3x12","3x8-10","4x8-12","3x10-12"],
                        ["4x8","5x5","4x8-10","3x10","4x8","3x10"],
                        ["5x5","4x6-8","4x8-10","3x10","3x12","4x15"],
                        ["5x5","4x12-15","3x12-15","3x10","3x8-10","3x10","3x10"],
                        ["3x5","3x5","3x8","3x6","3x8","3x10"],
                        "Full Body + Conditioning",
                        "Finish with 15-20 min on the treadmill, bike or rower")
  };

  /* ---------------------------------------------------------
     16-WEEK PLYOMETRIC — power, speed and landing quality

     Volume is deliberately low and stays low. Plyometrics are graded on QUALITY, so the phases
     add height, depth and speed rather than repetitions — the performance phase does 3s and 5s,
     not 15s. The notes carry the landing cues, because a sloppy landing is how this modality
     hurts people.
  --------------------------------------------------------- */
  var PLY_MON = [
    { name: "Countermovement Jump", presc: "3x6", note: "Dip and drive, full reset between reps" },
    { name: "Squat Jump to Box", presc: "3x6" },
    { name: "Jump Lunge",        presc: "3x6/leg" },
    { name: "Skater Jump",       presc: "3x8/side" },
    { name: "Broad Jump",        presc: "3x5", note: "Land soft and hold it for a beat before the next rep" } ];
  var PLY_TUE = [
    { name: "Explosive Push Up",        presc: "3x5" },
    { name: "Plyo Push Up",             presc: "3x5" },
    { name: "Bear Crawl",               presc: "3x20 m" },
    { name: "Medicine Ball Chest Pass", presc: "3x8" },
    { name: "Medicine Ball Slam",       presc: "3x8" } ];
  var PLY_WED = [
    { name: "Lateral Shuffle Drill", presc: "4x20 sec" },
    { name: "Fast Feet",             presc: "4x20 sec", note: "Turnover, not height" },
    { name: "Lateral Hops",          presc: "3x10/side" },
    { name: "Shuttle Run",           presc: "4x20 m" } ];
  var PLY_FRI = [
    { name: "Broad Jump",    presc: "4x5" },
    { name: "Tuck Jump",     presc: "3x5" },
    { name: "Split Jump",    presc: "3x6/leg" },
    { name: "Bounding",      presc: "3x20 m" },
    { name: "Flying Sprint", presc: "6x20 m" } ];
  var PLY_SAT = [
    { name: "Squat Jump to Box", presc: "3 rounds x 6" },
    { name: "Explosive Push Up", presc: "3 rounds x 5" },
    { name: "Skater Jump",       presc: "3 rounds x 8/side" },
    { name: "Broad Jump",        presc: "3 rounds x 5" },
    { name: "Mountain Climber",  presc: "3 rounds x 20" },
    { name: "Flying Sprint",     presc: "3 rounds x 20 m" } ];

  function plyDays(monR, tueR, wedR, friR, satR, satLabel, satNote) {
    var reps = function (list, over) {
      return list.map(function (e, i) { return { name: e.name, presc: over[i] || e.presc, note: e.note }; });
    };
    return [
      { day: "Monday",    session: "Lower-Body Power",       exercises: reps(PLY_MON, monR) },
      { day: "Tuesday",   session: "Upper + Explosive",      exercises: reps(PLY_TUE, tueR) },
      { day: "Wednesday", session: "Agility + Conditioning", exercises: reps(PLY_WED, wedR) },
      { day: "Thursday",  session: "Rest / Recovery", exercises: [
        { name: "Walk / Mobility", presc: "15-20 min", note: "Plyometrics are high impact — take this one" } ] },
      { day: "Friday",    session: "Jump + Sprint Power",    exercises: reps(PLY_FRI, friR) },
      { day: "Saturday",  session: satLabel, exercises: reps(PLY_SAT, satR).map(function (e, i) {
        return i === 0 && satNote ? { name: e.name, presc: e.presc, note: satNote } : e; }) }
    ];
  }

  var PLYO = {
    foundation:  plyDays([], [], [], [], [], "Full Body Plyometrics — 3 rounds"),
    strength:    plyDays(["4x5","4x5","3x6/leg","3x8/side","4x5"],
                         ["4x5","4x5","3x20 m","4x8","4x8"],
                         ["4x20 m","4x20 sec","3x12/side","5x20 m"],
                         ["4x5","3x6","3x6/leg","4x20 m","6x30 m"],
                         ["4 rounds x 5","4 rounds x 5","4 rounds x 8/side","4 rounds x 5",
                          "4 rounds x 20","4 rounds x 30 m"], "Full Body — 4 rounds"),
    advanced:    plyDays(["4x4","4x5","3x6/leg","3x8/side","4x4"],
                         ["4x5","4x5","3x20 m","4x6","4x8"],
                         ["4x20 m","4x20 sec","3x12/side","5 rounds"],
                         ["4x4","3x6","3x6/leg","4x20 m","6x40 m"],
                         ["5 rounds x 5","5 rounds x 5","5 rounds x 8/side","5 rounds x 4",
                          "5 rounds x 20","5 rounds x 30 m"], "Full Body — 5 rounds"),
    performance: plyDays(["4x3","5x3","3x5/leg","3x6/side","5x3"],
                         ["4x5","4x5","3x20 m","5x5","4x6"],
                         ["4x20 m","4x20 sec","3x12/side","5 rounds"],
                         ["4x3","3x5","3x5/leg","4x20 m","8x30 m"],
                         ["5 rounds x 3","5 rounds x 5","5 rounds x 6/side","5 rounds x 3",
                          "5 rounds x 20","5 rounds x 30 m"],
                         "Performance Circuit — 5 rounds",
                         "Quality over volume — 90-120 sec rest between rounds")
  };

  /* A compact day builder for the programs below.

     The seven original programs were written out as literal objects because each phase reused the
     same movements with only the reps changing, which the rep-override helpers expressed well.
     These seven do not work that way — an Olympic phase swaps hang variations for full lifts, and
     a yoga phase swaps poses outright — so there is nothing to override and a literal row per
     exercise is both shorter and closer to the source. */
  function mk(day, session, rows) {
    return { day: day, session: session, exercises: rows.map(function (r) {
      return { name: r[0], presc: r[1], note: r[2] || "" };
    }) };
  }
  /* Every program below has at least one full rest day. It is carried in the data rather than
     left as a gap so the week view shows a complete Monday-to-Saturday, and it uses the same
     "Walk / Mobility" marker the other programs use — recommendation.js keys off that name to
     keep rest days out of the "save as routine" buttons. */
  function rest(day, presc, note) {
    return mk(day, "Rest / Recovery", [["Walk / Mobility", presc || "20-30 min easy", note || ""]]);
  }

  /* ---------------------------------------------------------
     16-WEEK OLYMPIC WEIGHTLIFTING

     The most technical program in the set, and the one where loading ahead of technique does the
     most damage. Every phase keeps a hang or power variation alongside the full lift for that
     reason: the shortened range is where position is learned, and it stays in the program at week
     16 rather than being graduated out of.
  --------------------------------------------------------- */
  var OLYMPIC = {
    foundation: [
      mk("Monday", "Snatch + Squat", [
        ["Hang Power Snatch", "4x3", "From the hang — learn the second pull before the first"],
        ["Overhead Squat", "3x5"],
        ["Squat (Barbell)", "4x8"],
        ["Snatch Pull", "3x5"],
        ["Dead Bug", "3x10/side"]]),
      mk("Tuesday", "Clean & Jerk + Pull", [
        ["Hang Power Clean", "4x3"],
        ["Push Jerk", "4x3"],
        ["Clean Pull", "3x5"],
        ["Front Squat", "4x6"],
        ["Romanian Deadlift (Barbell)", "3x8"]]),
      rest("Wednesday"),
      mk("Thursday", "Snatch + Overhead", [
        ["Muscle Snatch", "3x5", "Light — this is a positional drill, not a max"],
        ["Hang Snatch", "4x3"],
        ["Push Press", "4x5"],
        ["Overhead Squat", "3x5"],
        ["Bent Over Row (Barbell)", "3x10"]]),
      mk("Friday", "Clean & Jerk + Squat", [
        ["Hang Clean", "4x3"],
        ["Split Jerk", "4x3"],
        ["Front Squat", "4x6"],
        ["Clean Pull", "3x5"],
        ["Back Extension (Hyperextension)", "3x12"]]),
      mk("Saturday", "Technique + Power", [
        ["Power Snatch", "4x3"],
        ["Power Clean", "4x3"],
        ["Push Jerk", "3x3"],
        ["Front Squat", "3x6"],
        ["Farmers Walk", "3x30 sec"]])
    ],
    strength: [
      mk("Monday", "Snatch + Squat", [
        ["Power Snatch", "5x2"],
        ["Snatch", "4x2", "First full snatches — drop the weight rather than save a bad position"],
        ["Squat (Barbell)", "4x6"],
        ["Snatch Pull", "4x4"]]),
      mk("Tuesday", "Clean & Jerk + Pull", [
        ["Power Clean", "5x2"],
        ["Clean and Jerk", "4x2"],
        ["Front Squat", "4x5"],
        ["Clean Pull", "4x4"]]),
      rest("Wednesday"),
      mk("Thursday", "Snatch + Overhead", [
        ["Hang Snatch", "4x2"],
        ["Overhead Squat", "3x4"],
        ["Push Press", "4x4"],
        ["Snatch Pull", "3x4"]]),
      mk("Friday", "Clean & Jerk + Squat", [
        ["Clean and Jerk", "5x2"],
        ["Front Squat", "4x5"],
        ["Clean Pull", "4x4"],
        ["Romanian Deadlift (Barbell)", "3x8"]]),
      mk("Saturday", "Technique + Power", [
        ["Power Snatch", "4x2"],
        ["Power Clean", "4x2"],
        ["Push Jerk", "4x2"],
        ["Squat (Barbell)", "3x5"]])
    ],
    advanced: [
      mk("Monday", "Snatch + Squat", [
        ["Snatch", "5x2"],
        ["Snatch Pull", "4x3"],
        ["Squat (Barbell)", "5x4"],
        ["Overhead Squat", "3x3"]]),
      mk("Tuesday", "Clean & Jerk + Pull", [
        ["Clean and Jerk", "5x2"],
        ["Clean Pull", "4x3"],
        ["Front Squat", "5x3"],
        ["Romanian Deadlift (Barbell)", "3x6"]]),
      rest("Wednesday"),
      mk("Thursday", "Snatch + Overhead", [
        ["Hang Snatch", "4x2"],
        ["Snatch", "4x1"],
        ["Push Press", "4x3"],
        ["Overhead Squat", "3x3"]]),
      mk("Friday", "Clean & Jerk + Squat", [
        ["Clean", "5x2"],
        ["Split Jerk", "5x2"],
        ["Front Squat", "5x3"],
        ["Clean Pull", "4x3"]]),
      mk("Saturday", "Technique + Power", [
        ["Power Snatch", "4x2"],
        ["Power Clean", "4x2"],
        ["Push Jerk", "4x2"],
        ["Squat (Barbell)", "3x4"]])
    ],
    performance: [
      mk("Monday", "Snatch + Squat", [
        ["Snatch", "5x1-2", "Singles and doubles only — speed under the bar is the whole point"],
        ["Snatch Pull", "3x3"],
        ["Squat (Barbell)", "4x3"],
        ["Overhead Squat", "3x2"]]),
      mk("Tuesday", "Clean & Jerk + Pull", [
        ["Clean and Jerk", "5x1"],
        ["Clean Pull", "3x3"],
        ["Front Squat", "4x2-3"]]),
      rest("Wednesday"),
      mk("Thursday", "Snatch + Overhead", [
        ["Power Snatch", "4x1-2"],
        ["Hang Snatch", "3x2"],
        ["Push Press", "3x3"],
        ["Overhead Squat", "3x2"]]),
      mk("Friday", "Clean & Jerk + Squat", [
        ["Clean and Jerk", "5x1"],
        ["Front Squat", "4x2"],
        ["Clean Pull", "3x3"]]),
      mk("Saturday", "Technique / Performance", [
        ["Snatch", "3x1"],
        ["Clean and Jerk", "3x1"],
        ["Power Clean", "3x2"],
        ["Front Squat", "3x2"]])
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK HIIT

     The work:rest ratio is the progression, not the exercise list: 30/30, then 40/20, 45/15 and
     50/10. That is why the same movements recur — the stimulus changes without the technique
     having to.
  --------------------------------------------------------- */
  var HIIT = {
    foundation: [
      mk("Monday", "Full Body — 3 rounds, 30 sec on / 30 off", [
        ["Squat (Bodyweight)", "3 rounds x 30 sec"],
        ["Mountain Climber", "3 rounds x 30 sec"],
        ["Reverse Lunge", "3 rounds x 30 sec", "Alternating"],
        ["Push Up", "3 rounds x 30 sec"],
        ["High Knees", "3 rounds x 30 sec"]]),
      mk("Tuesday", "Lower Body — 3 rounds", [
        ["Squat (Bodyweight)", "3 rounds x 30 sec"],
        ["Reverse Lunge", "3 rounds x 30 sec"],
        ["Step Up", "3 rounds x 30 sec"],
        ["Glute Bridge", "3 rounds x 30 sec"],
        ["Standing Calf Raise (Bodyweight)", "3 rounds x 30 sec"]]),
      rest("Wednesday", "20-30 min easy", "Recovery and mobility — HIIT is not a daily maximal effort"),
      mk("Thursday", "Upper Body — 3 rounds", [
        ["Push Up", "3 rounds x 30 sec"],
        ["Dumbbell Row", "3 rounds x 30 sec"],
        ["Shoulder Press (Dumbbell)", "3 rounds x 30 sec"],
        ["Mountain Climber", "3 rounds x 30 sec"],
        ["Plank", "3 rounds x 30 sec"]]),
      mk("Friday", "Cardio Intervals", [
        ["Sprints", "8x30 sec", "5 min warm-up first. 90 sec easy between. Treadmill, bike, rower or outdoors"]]),
      mk("Saturday", "Full Body — 4 rounds, 20 sec on / 40 off", [
        ["Squat (Bodyweight)", "4 rounds x 20 sec"],
        ["Push Up", "4 rounds x 20 sec"],
        ["Mountain Climber", "4 rounds x 20 sec"],
        ["Reverse Lunge", "4 rounds x 20 sec"],
        ["High Knees", "4 rounds x 20 sec"]])
    ],
    strength: [
      mk("Monday", "Full Body — 4 rounds, 40 sec on / 20 off", [
        ["Jump Squat", "4 rounds x 40 sec"],
        ["Push Up", "4 rounds x 40 sec"],
        ["Mountain Climber", "4 rounds x 40 sec"],
        ["Reverse Lunge", "4 rounds x 40 sec"],
        ["High Knees", "4 rounds x 40 sec"],
        ["Plank", "4 rounds x 40 sec"]]),
      mk("Tuesday", "Lower Body — 4 rounds", [
        ["Goblet Squat", "4 rounds x 40 sec"],
        ["Romanian Deadlift (Dumbbell)", "4 rounds x 40 sec"],
        ["Walking Lunge", "4 rounds x 40 sec"],
        ["Kettlebell Swing", "4 rounds x 40 sec"],
        ["Step Up", "4 rounds x 40 sec"]]),
      rest("Wednesday", "20-30 min easy", "Recovery and mobility"),
      mk("Thursday", "Upper Body — 4 rounds", [
        ["Push Up", "4 rounds x 40 sec"],
        ["Dumbbell Row", "4 rounds x 40 sec"],
        ["Shoulder Press (Dumbbell)", "4 rounds x 40 sec"],
        ["Renegade Row (Dumbbell)", "4 rounds x 40 sec"],
        ["Mountain Climber", "4 rounds x 40 sec"]]),
      mk("Friday", "Cardio Intervals", [
        ["Sprints", "8x45 sec", "5 min warm-up first. 75 sec easy between"]]),
      mk("Saturday", "20-minute AMRAP", [
        ["Squat (Bodyweight)", "10", "20-minute AMRAP — as many rounds as possible, record the total"],
        ["Push Up", "8"],
        ["Reverse Lunge", "10"],
        ["Dumbbell Row", "10"],
        ["Mountain Climber", "20"]])
    ],
    advanced: [
      mk("Monday", "Full Body — 5 rounds, 45 sec on / 15 off", [
        ["Kettlebell Swing", "5 rounds x 45 sec"],
        ["Burpee", "5 rounds x 45 sec"],
        ["Goblet Squat", "5 rounds x 45 sec"],
        ["Push Up", "5 rounds x 45 sec"],
        ["Dumbbell Row", "5 rounds x 45 sec"],
        ["High Knees", "5 rounds x 45 sec"]]),
      mk("Tuesday", "Lower Body — 4 rounds", [
        ["Jump Squat", "4 rounds x 10"],
        ["Romanian Deadlift (Dumbbell)", "4 rounds x 12"],
        ["Walking Lunge", "4 rounds x 10/leg"],
        ["Kettlebell Swing", "4 rounds x 15"],
        ["Step Up", "4 rounds x 10/leg"]]),
      rest("Wednesday", "20-30 min easy", "Recovery and mobility"),
      mk("Thursday", "Upper Body — 4 rounds", [
        ["Push Up", "4 rounds x 10"],
        ["Dumbbell Row", "4 rounds x 10/side"],
        ["Shoulder Press (Dumbbell)", "4 rounds x 10"],
        ["Renegade Row (Dumbbell)", "4 rounds x 8/side"],
        ["Mountain Climber", "4 rounds x 20"]]),
      mk("Friday", "Cardio Intervals", [
        ["Sprints", "10x1 min", "5 min warm-up first. 1 min easy between. Treadmill, bike, rower or stepper"]]),
      mk("Saturday", "HIIT Circuit — 5 rounds", [
        ["Burpee", "5 rounds x 8", "90 sec rest between rounds"],
        ["Kettlebell Swing", "5 rounds x 15"],
        ["Goblet Squat", "5 rounds x 12"],
        ["Push Up", "5 rounds x 10"],
        ["Mountain Climber", "5 rounds x 20"],
        ["Sprints", "5 rounds x 20 sec"]])
    ],
    performance: [
      mk("Monday", "Full Body — 5 rounds, 50 sec on / 10 transition", [
        ["Burpee", "5 rounds x 50 sec"],
        ["Kettlebell Swing", "5 rounds x 50 sec"],
        ["Goblet Squat", "5 rounds x 50 sec"],
        ["Push Up", "5 rounds x 50 sec"],
        ["Dumbbell Row", "5 rounds x 50 sec"],
        ["High Knees", "5 rounds x 50 sec"]]),
      mk("Tuesday", "Power HIIT — 5 rounds", [
        ["Jump Squat", "5 rounds x 8"],
        ["Kettlebell Swing", "5 rounds x 15"],
        ["Dumbbell Thruster", "5 rounds x 10"],
        ["Reverse Lunge", "5 rounds x 10/leg"],
        ["Burpee", "5 rounds x 6"]]),
      rest("Wednesday", "20-30 min easy", "Recovery and mobility"),
      mk("Thursday", "Upper Body — 5 rounds", [
        ["Push Up", "5 rounds x 10"],
        ["Dumbbell Row", "5 rounds x 10/side"],
        ["Shoulder Press (Dumbbell)", "5 rounds x 10"],
        ["Renegade Row (Dumbbell)", "5 rounds x 8/side"],
        ["Mountain Climber", "5 rounds x 20"]]),
      mk("Friday", "Maximum Conditioning", [
        ["Sprints", "10x1 min", "5 min warm-up first. 1 min easy between"]]),
      mk("Saturday", "20-minute AMRAP", [
        ["Burpee", "10", "Record rounds + reps and compare week 16 with week 1"],
        ["Kettlebell Swing", "15"],
        ["Goblet Squat", "10"],
        ["Push Up", "10"],
        ["Dumbbell Row", "10"],
        ["Mountain Climber", "20"]])
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK MOBILITY & FLEXIBILITY

     Holds lengthen across the phases (30 sec to 60 sec) while the dynamic work gets more
     demanding rather than longer. Dynamic drills belong before training, long holds after it or
     in their own session — the day labels say which is which.
  --------------------------------------------------------- */
  var MOBILITY = {
    foundation: [
      mk("Monday", "Full-Body Mobility", [
        ["Cat-Cow Stretch", "2x10"],
        ["Thoracic Rotation Stretch", "2x8/side"],
        ["World's Greatest Stretch", "2x6/side"],
        ["90/90 Hip Switch", "2x10"],
        ["Ankle Dorsiflexion Stretch", "2x10/side"],
        ["Child's Pose Stretch", "2x30 sec"]]),
      mk("Tuesday", "Lower-Body Mobility", [
        ["Hip Flexor Stretch", "3x30 sec/side"],
        ["Hamstring Stretch", "3x30 sec/side"],
        ["90/90 Hip Switch", "3x30 sec/side"],
        ["Adductor Rock Back Stretch", "3x10"],
        ["Calf Wall Stretch", "3x30 sec/side"],
        ["Deep Squat Hold Stretch", "3x20 sec"]]),
      mk("Wednesday", "Upper-Body Mobility", [
        ["Shoulder Circles Stretch", "2x10"],
        ["Wall Slide Stretch", "3x10"],
        ["Thread the Needle Stretch", "2x8/side"],
        ["Doorway Chest Stretch", "3x30 sec"],
        ["Lat Stretch on Rack", "3x30 sec/side"],
        ["Thoracic Extension Stretch", "2x10"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Dynamic Mobility", [
        ["Leg Swings Stretch", "2x10/side", "Dynamic work belongs before training"],
        ["Arm Swings Stretch", "2x10"],
        ["Walking Lunge", "2x10/leg"],
        ["World's Greatest Stretch", "2x6/side"],
        ["Inchworm", "2x8"],
        ["Ankle Dorsiflexion Stretch", "2x10/side"]]),
      mk("Saturday", "Full-Body Flexibility", [
        ["Hamstring Stretch", "3x30-45 sec"],
        ["Hip Flexor Stretch", "3x30-45 sec"],
        ["Butterfly Groin Stretch", "3x30 sec"],
        ["Calf Wall Stretch", "3x30 sec"],
        ["Doorway Chest Stretch", "3x30 sec"],
        ["Child's Pose Stretch", "3x30 sec"]])
    ],
    strength: [
      mk("Monday", "Full-Body Mobility", [
        ["Cat-Cow Stretch", "3x10"],
        ["90/90 Hip Switch", "3x10"],
        ["Thoracic Rotation Stretch", "3x10/side"],
        ["World's Greatest Stretch", "3x8/side"],
        ["Deep Squat Hold Stretch", "3x30 sec"]]),
      mk("Tuesday", "Lower-Body Mobility", [
        ["Couch Stretch", "3x40 sec/side"],
        ["Hamstring Stretch", "3x40 sec"],
        ["Adductor Rock Back Stretch", "3x12"],
        ["90/90 Hip Switch", "3x40 sec"],
        ["Calf Wall Stretch", "3x40 sec"]]),
      mk("Wednesday", "Upper-Body Mobility", [
        ["Wall Slide Stretch", "3x12"],
        ["Thread the Needle Stretch", "3x10/side"],
        ["Lat Stretch on Rack", "3x40 sec"],
        ["Doorway Chest Stretch", "3x40 sec"],
        ["Thoracic Extension Stretch", "3x10"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Dynamic Mobility — 3 rounds", [
        ["Leg Swings Stretch", "3 rounds x 12/side"],
        ["Walking Lunge", "3 rounds x 10/leg"],
        ["Inchworm", "3 rounds x 8"],
        ["World's Greatest Stretch", "3 rounds x 6/side"],
        ["Ankle Dorsiflexion Stretch", "3 rounds x 12/side"]]),
      mk("Saturday", "Full-Body Flexibility", [
        ["Hamstring Stretch", "3x30-45 sec", "Full-body static work, 2-3 rounds"],
        ["Hip Flexor Stretch", "3x30-45 sec"],
        ["Butterfly Groin Stretch", "3x30-45 sec"],
        ["Calf Wall Stretch", "3x30-45 sec"],
        ["Doorway Chest Stretch", "3x30-45 sec"],
        ["Lat Stretch on Rack", "3x30-45 sec"]])
    ],
    advanced: [
      mk("Monday", "Full-Body Mobility", [
        ["90/90 Hip Switch", "3x12"],
        ["Cossack Squat", "3x8/side"],
        ["World's Greatest Stretch", "3x8/side"],
        ["Thoracic Rotation Stretch", "3x10/side"],
        ["Deep Squat Hold Stretch", "3x45 sec"]]),
      mk("Tuesday", "Lower-Body Mobility", [
        ["Couch Stretch", "3x45 sec"],
        ["Hamstring Stretch", "3x45 sec"],
        ["90/90 Hip Switch", "3x45 sec"],
        ["Cossack Squat", "3x8/side"],
        ["Calf Wall Stretch", "3x45 sec"]]),
      mk("Wednesday", "Upper-Body Mobility", [
        ["Wall Slide Stretch", "3x15"],
        ["Thread the Needle Stretch", "3x10"],
        ["Lat Stretch on Rack", "3x45 sec"],
        ["Doorway Chest Stretch", "3x45 sec"],
        ["Thoracic Extension Stretch", "3x12"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Dynamic Mobility — 4 rounds", [
        ["Leg Swings Stretch", "4 rounds x 15/side"],
        ["Walking Lunge", "4 rounds x 12/leg"],
        ["Cossack Squat", "4 rounds x 8/side"],
        ["Inchworm", "4 rounds x 10"],
        ["World's Greatest Stretch", "4 rounds x 6/side"]]),
      mk("Saturday", "Full-Body Flexibility", [
        ["Hamstring Stretch", "3x45-60 sec", "Hold the major stretches 45-60 sec, 2-3 rounds"],
        ["Hip Flexor Stretch", "3x45-60 sec"],
        ["Butterfly Groin Stretch", "3x45-60 sec"],
        ["Calf Wall Stretch", "3x45-60 sec"],
        ["Lat Stretch on Rack", "3x45-60 sec"],
        ["Doorway Chest Stretch", "3x45-60 sec"]])
    ],
    performance: [
      mk("Monday", "Athletic Mobility", [
        ["90/90 Hip Switch", "3x15"],
        ["Cossack Squat", "3x10/side"],
        ["Deep Squat Hold Stretch", "3x60 sec"],
        ["Thoracic Rotation Stretch", "3x12/side"],
        ["Ankle Dorsiflexion Stretch", "3x15/side"]]),
      mk("Tuesday", "Lower-Body Mobility", [
        ["Couch Stretch", "3x60 sec"],
        ["Hamstring Stretch", "3x60 sec"],
        ["90/90 Hip Switch", "3x60 sec"],
        ["Adductor Rock Back Stretch", "3x15"],
        ["Calf Wall Stretch", "3x60 sec"]]),
      mk("Wednesday", "Upper-Body Mobility", [
        ["Wall Slide Stretch", "3x15"],
        ["Thread the Needle Stretch", "3x12/side"],
        ["Thoracic Extension Stretch", "3x12"],
        ["Lat Stretch on Rack", "3x60 sec"],
        ["Doorway Chest Stretch", "3x60 sec"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Athletic Mobility — 4 rounds", [
        ["Leg Swings Stretch", "4 rounds x 15/side"],
        ["Walking Lunge", "4 rounds x 12/leg"],
        ["Cossack Squat", "4 rounds x 10/side"],
        ["Inchworm", "4 rounds x 10"],
        ["World's Greatest Stretch", "4 rounds x 8/side"],
        ["Ankle Dorsiflexion Stretch", "4 rounds x 15/side"]]),
      mk("Saturday", "Full Flexibility", [
        ["Hip Flexor Stretch", "1x60 sec/side"],
        ["Hamstring Stretch", "1x60 sec/side"],
        ["90/90 Hip Switch", "1x60 sec/side"],
        ["Butterfly Groin Stretch", "1x60 sec"],
        ["Calf Wall Stretch", "1x60 sec/side"],
        ["Doorway Chest Stretch", "1x60 sec"],
        ["Lat Stretch on Rack", "1x60 sec/side"]])
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK YOGA

     Holds lengthen and the balance work gets harder, but no phase adds an inversion or an arm
     balance. Range is built by holding a position under control, not by reaching a shape.
  --------------------------------------------------------- */
  var YOGA = {
    foundation: [
      mk("Monday", "Full-Body Yoga", [
        ["Cat-Cow Stretch", "2x10"],
        ["Child's Pose Stretch", "2x30 sec"],
        ["Downward Dog", "3x30 sec"],
        ["Low Lunge Stretch", "2x30 sec/side"],
        ["Warrior I Pose", "2x30 sec/side"],
        ["Warrior II Pose", "2x30 sec/side"],
        ["Cobra Pose Stretch", "2x20 sec"],
        ["Savasana", "1x3-5 min"]]),
      mk("Tuesday", "Hips + Legs", [
        ["Butterfly Groin Stretch", "3x30 sec"],
        ["Low Lunge Stretch", "3x30 sec/side"],
        ["Half Split Stretch", "3x30 sec/side"],
        ["Pigeon Pose Stretch", "2x30 sec/side"],
        ["Garland Pose", "3x20 sec"],
        ["Seated Forward Fold Stretch", "2x30 sec"]]),
      mk("Wednesday", "Upper Body + Spine", [
        ["Cat-Cow Stretch", "2x10"],
        ["Thread the Needle Stretch", "3x8/side"],
        ["Sphinx Pose", "3x20 sec"],
        ["Cobra Pose Stretch", "3x20 sec"],
        ["Child's Pose Stretch", "3x30 sec"],
        ["Seated Spinal Twist Stretch", "3x30 sec/side"],
        ["Eagle Pose", "2x30 sec/side"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Strength Yoga — 3 rounds", [
        ["Chair Pose", "3 rounds x 30 sec"],
        ["Warrior II Pose", "3 rounds x 30 sec/side"],
        ["Plank", "3 rounds x 20-30 sec"],
        ["Downward Dog", "3 rounds x 30 sec"],
        ["Boat Pose", "3 rounds x 20 sec"],
        ["Bridge Pose", "3 rounds x 30 sec"]]),
      mk("Saturday", "Recovery + Flexibility", [
        ["Child's Pose Stretch", "1x60 sec"],
        ["Cat-Cow Stretch", "1x10"],
        ["Supine Twist Pose", "1x45 sec/side"],
        ["Happy Baby Pose", "1x45 sec"],
        ["Butterfly Groin Stretch", "1x60 sec"],
        ["Legs Up the Wall", "1x2-3 min"],
        ["Savasana", "1x5 min"]])
    ],
    strength: [
      mk("Monday", "Full-Body Flow", [
        ["Sun Salutation", "4x1", "Four rounds, moving with the breath"],
        ["Warrior I Pose", "1x45 sec/side"],
        ["Warrior II Pose", "1x45 sec/side"],
        ["Triangle Pose", "1x45 sec/side"],
        ["Downward Dog", "1x60 sec"],
        ["Cobra Pose Stretch", "1x30 sec"],
        ["Child's Pose Stretch", "1x60 sec"]]),
      mk("Tuesday", "Hips", [
        ["Low Lunge Stretch", "1x60 sec/side"],
        ["Half Split Stretch", "1x45 sec/side"],
        ["Pigeon Pose Stretch", "1x45 sec/side"],
        ["Butterfly Groin Stretch", "1x60 sec"],
        ["Garland Pose", "1x30-45 sec"],
        ["Seated Forward Fold Stretch", "1x60 sec"]]),
      mk("Wednesday", "Spine + Shoulders", [
        ["Cat-Cow Stretch", "1x12"],
        ["Thread the Needle Stretch", "1x10/side"],
        ["Cobra Pose Stretch", "1x30 sec"],
        ["Sphinx Pose", "1x45 sec"],
        ["Seated Spinal Twist Stretch", "1x45 sec/side"],
        ["Puppy Pose Stretch", "1x45 sec"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Strength Flow — 4 rounds", [
        ["Chair Pose", "4 rounds x 45 sec"],
        ["Warrior II Pose", "4 rounds x 45 sec/side"],
        ["Plank", "4 rounds x 30-45 sec"],
        ["Side Plank", "4 rounds x 20-30 sec/side"],
        ["Boat Pose", "4 rounds x 30 sec"],
        ["Bridge Pose", "4 rounds x 45 sec"]]),
      mk("Saturday", "Recovery", [
        ["Sun Salutation", "2x1", "Recovery-focused session, 30-40 minutes"],
        ["Supine Twist Pose", "1x60 sec/side"],
        ["Happy Baby Pose", "1x60 sec"],
        ["Butterfly Groin Stretch", "1x60 sec"],
        ["Legs Up the Wall", "1x3 min"],
        ["Savasana", "1x5 min"]])
    ],
    advanced: [
      mk("Monday", "Flow — 4-5 rounds", [
        ["Sun Salutation", "4-5 rounds x 1"],
        ["Chair Pose", "4-5 rounds x 45 sec"],
        ["Warrior I Pose", "4-5 rounds x 45 sec/side"],
        ["Warrior II Pose", "4-5 rounds x 45 sec/side"],
        ["Triangle Pose", "4-5 rounds x 45 sec/side"],
        ["Downward Dog", "4-5 rounds x 45 sec"],
        ["Cobra Pose Stretch", "4-5 rounds x 30 sec"],
        ["Child's Pose Stretch", "4-5 rounds x 45 sec"]]),
      mk("Tuesday", "Mobility", [
        ["Pigeon Pose Stretch", "1x60 sec/side"],
        ["Low Lunge Stretch", "1x60 sec/side"],
        ["Half Split Stretch", "1x60 sec/side"],
        ["Garland Pose", "1x30-45 sec"],
        ["Butterfly Groin Stretch", "1x60 sec"],
        ["Seated Forward Fold Stretch", "1x60 sec"]]),
      mk("Wednesday", "Upper + Core", [
        ["Plank", "3x45 sec"],
        ["Side Plank", "3x30 sec/side"],
        ["Boat Pose", "3x30 sec"],
        ["Cobra Pose Stretch", "3x30 sec"],
        ["Puppy Pose Stretch", "3x45 sec"],
        ["Thread the Needle Stretch", "3x10/side"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Strength Flow — 4 rounds", [
        ["Chair Pose", "4 rounds x 60 sec"],
        ["Warrior III Pose", "4 rounds x 30 sec/side"],
        ["Plank", "4 rounds x 45 sec"],
        ["Side Plank", "4 rounds x 30 sec/side"],
        ["Boat Pose", "4 rounds x 30-45 sec"],
        ["Bridge Pose", "4 rounds x 45 sec"]]),
      mk("Saturday", "Recovery + Flexibility", [
        ["Sun Salutation", "2x1", "40-50 minute recovery and flexibility session"],
        ["Pigeon Pose Stretch", "1x60 sec/side"],
        ["Supine Twist Pose", "1x60 sec/side"],
        ["Happy Baby Pose", "1x60 sec"],
        ["Legs Up the Wall", "1x3 min"],
        ["Savasana", "1x5 min"]])
    ],
    performance: [
      mk("Monday", "Full Flow — 5 rounds", [
        ["Sun Salutation", "5 rounds x 1"],
        ["Chair Pose", "5 rounds x 60 sec"],
        ["Warrior I Pose", "5 rounds x 45 sec/side"],
        ["Warrior II Pose", "5 rounds x 45 sec/side"],
        ["Triangle Pose", "5 rounds x 45 sec/side"],
        ["Warrior III Pose", "5 rounds x 30 sec/side"],
        ["Downward Dog", "5 rounds x 45 sec"],
        ["Cobra Pose Stretch", "5 rounds x 30 sec"]]),
      mk("Tuesday", "Lower Body", [
        ["Pigeon Pose Stretch", "1x60 sec/side"],
        ["Low Lunge Stretch", "1x60 sec/side"],
        ["Half Split Stretch", "1x60 sec/side"],
        ["Garland Pose", "1x60 sec"],
        ["Butterfly Groin Stretch", "1x60 sec"],
        ["Seated Forward Fold Stretch", "1x60 sec"]]),
      mk("Wednesday", "Upper + Core", [
        ["Plank", "3x60 sec"],
        ["Side Plank", "3x40 sec/side"],
        ["Boat Pose", "3x45 sec"],
        ["Cobra Pose Stretch", "3x30 sec"],
        ["Puppy Pose Stretch", "3x60 sec"],
        ["Seated Spinal Twist Stretch", "3x45 sec/side"]]),
      rest("Thursday", "Optional easy walk", "Rest or light movement only"),
      mk("Friday", "Performance Yoga — 5 rounds", [
        ["Chair Pose", "5 rounds x 60 sec"],
        ["Warrior III Pose", "5 rounds x 30 sec/side"],
        ["Side Plank", "5 rounds x 30-40 sec/side"],
        ["Boat Pose", "5 rounds x 45 sec"],
        ["Bridge Pose", "5 rounds x 60 sec"],
        ["Downward Dog", "5 rounds x 60 sec"]]),
      mk("Saturday", "Deep Recovery", [
        ["Pigeon Pose Stretch", "1x60 sec/side", "45-60 minutes, unhurried"],
        ["Hamstring Stretch", "1x60 sec/side"],
        ["Thread the Needle Stretch", "1x10/side"],
        ["Lat Stretch on Rack", "1x60 sec/side"],
        ["Cat-Cow Stretch", "1x10"],
        ["Legs Up the Wall", "1x3-5 min"],
        ["Savasana", "1x5-10 min"]])
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK SPRINT TRAINING

     Four training days, and the two rest days are load-bearing: sprinting is the highest-impact
     work in this catalogue and the hamstring, calf and Achilles injuries it causes come from
     sprinting tired, not from sprinting often. Every session opens with a real warm-up.
  --------------------------------------------------------- */
  var SPRINT = {
    foundation: [
      mk("Monday", "Acceleration", [
        ["A March", "3x20 m", "10 min warm-up first — never sprint cold"],
        ["A Skip", "3x20 m"],
        ["Falling Start Sprint", "4x10 m"],
        ["Sprints", "6x20 m", "Walk back, 60-90 sec between"]]),
      mk("Tuesday", "Strength + Mobility", [
        ["Squat (Barbell)", "3x8"],
        ["Romanian Deadlift (Barbell)", "3x8"],
        ["Reverse Lunge", "3x8/leg"],
        ["Standing Calf Raise (Bodyweight)", "3x15"],
        ["Plank", "3x30 sec"]]),
      rest("Wednesday", "Full rest", "Sprinting needs recovery — this day is part of the program"),
      mk("Thursday", "Max-Velocity Speed", [
        ["Stride Out Run", "4x40 m", "10 min warm-up first"],
        ["Sprints", "5x30 m"],
        ["Flying Sprint", "3x20 m", "Full recovery between efforts"]]),
      rest("Friday", "Easy walk or mobility", "Recovery day"),
      mk("Saturday", "Sprint Conditioning", [
        ["Sprints", "6x100 m", "About 70-80% effort. Walk 100 m between"]])
    ],
    strength: [
      mk("Monday", "Acceleration", [
        ["A Skip", "3x20 m"],
        ["Sprints", "6x30 m"],
        ["Sprints", "3x40 m", "2-3 min between the hard sprints"]]),
      mk("Tuesday", "Strength", [
        ["Squat (Barbell)", "4x6"],
        ["Romanian Deadlift (Barbell)", "4x6"],
        ["Bulgarian Split Squat (Dumbbell)", "3x8/leg"],
        ["Standing Calf Raise (Bodyweight)", "4x12"],
        ["Plank", "3x40 sec"]]),
      rest("Wednesday", "Full rest", "Recovery day"),
      mk("Thursday", "Max-Velocity Speed", [
        ["Stride Out Run", "4x40 m"],
        ["Flying Sprint", "5x30 m"],
        ["Sprints", "3x60 m", "Full recovery"]]),
      rest("Friday", "Easy walk or mobility", "Recovery day"),
      mk("Saturday", "Sprint Conditioning", [
        ["Sprints", "6x150 m", "About 75-85% effort. 2-3 min recovery"]])
    ],
    advanced: [
      mk("Monday", "Acceleration", [
        ["Sprints", "4x20 m"],
        ["Sprints", "5x30 m"],
        ["Sprints", "4x40 m", "2-3 min rest"]]),
      mk("Tuesday", "Strength", [
        ["Squat (Barbell)", "4x5"],
        ["Romanian Deadlift (Barbell)", "4x6"],
        ["Split Squat (Dumbbell)", "3x6/leg"],
        ["Standing Calf Raise (Bodyweight)", "4x10"],
        ["Plank", "3x45 sec"]]),
      rest("Wednesday", "Full rest", "Recovery day"),
      mk("Thursday", "Max Velocity", [
        ["Stride Out Run", "4x30 m"],
        ["Flying Sprint", "5x40 m"],
        ["Sprints", "3x60 m", "3-5 min recovery"]]),
      rest("Friday", "Easy walk or mobility", "Recovery day"),
      mk("Saturday", "Sprint Endurance", [
        ["Sprints", "5x200 m", "About 80-85% effort. 3 min recovery"]])
    ],
    performance: [
      mk("Monday", "Acceleration", [
        ["Sprints", "4x20 m"],
        ["Sprints", "4x30 m"],
        ["Sprints", "4x40 m", "Full recovery"]]),
      mk("Tuesday", "Power", [
        ["Squat (Barbell)", "4x4"],
        ["Romanian Deadlift (Barbell)", "3x5"],
        ["Bulgarian Split Squat (Dumbbell)", "3x6/leg"],
        ["Standing Calf Raise (Bodyweight)", "3x10"],
        ["Plank", "3x45 sec"]]),
      rest("Wednesday", "Full rest", "Recovery day"),
      mk("Thursday", "Maximum Speed", [
        ["Stride Out Run", "3x30 m"],
        ["Flying Sprint", "5x40 m"],
        ["Sprints", "3x60 m", "3-5 min recovery"]]),
      rest("Friday", "Easy walk or mobility", "Recovery day"),
      mk("Saturday", "Performance", [
        ["Sprints", "4x200 m", "Option A — sprint endurance at 85-90%"],
        ["Sprints", "3x30 m", "Option B — speed test. Do one option, not both"],
        ["Sprints", "3x60 m", "Option B"],
        ["Sprints", "1x100 m", "Option B — record the time and compare with week 1"]])
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK FUNCTIONAL TRAINING

     Unilateral work and loaded carries are in every phase rather than being accessories at the
     end. They are the point: the program is built around one leg at a time, one arm at a time,
     and holding a load while walking.
  --------------------------------------------------------- */
  var FUNCTIONAL = {
    foundation: [
      mk("Monday", "Full-Body Strength", [
        ["Goblet Squat", "3x10"],
        ["Romanian Deadlift (Dumbbell)", "3x10"],
        ["Push Up", "3x8-12"],
        ["One Arm Row (Dumbbell)", "3x10/side"],
        ["Farmers Walk", "3x30 sec"],
        ["Plank", "3x30 sec"]]),
      mk("Tuesday", "Unilateral + Stability", [
        ["Reverse Lunge", "3x8/leg"],
        ["Single Leg Romanian Deadlift (Dumbbell)", "3x8/leg"],
        ["Step Up", "3x10/leg"],
        ["Overhead Press (Dumbbell)", "3x8/side", "One arm at a time"],
        ["Suitcase Carry (Dumbbell)", "3x30 sec/side"],
        ["Dead Bug", "3x10/side"]]),
      mk("Wednesday", "Conditioning — 3 rounds", [
        ["Kettlebell Swing", "3 rounds x 15"],
        ["Squat (Bodyweight)", "3 rounds x 12"],
        ["Push Up", "3 rounds x 10"],
        ["Walking Lunge", "3 rounds x 10/leg"],
        ["Mountain Climber", "3 rounds x 20"],
        ["Farmers Walk", "3 rounds x 30 sec"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Functional Strength", [
        ["Deadlift (Barbell)", "3x8"],
        ["Goblet Squat", "3x10"],
        ["Bench Press (Dumbbell)", "3x10"],
        ["Dumbbell Row", "3x10"],
        ["Reverse Lunge", "3x8/leg"],
        ["Cable Core Pallof Press", "3x10/side"]]),
      mk("Saturday", "Full-Body Circuit — 4 rounds", [
        ["Kettlebell Swing", "4 rounds x 15"],
        ["Goblet Squat", "4 rounds x 12"],
        ["Push Up", "4 rounds x 10"],
        ["Dumbbell Row", "4 rounds x 10/side"],
        ["Step Up", "4 rounds x 10/leg"],
        ["Farmers Walk", "4 rounds x 30 sec"]])
    ],
    strength: [
      mk("Monday", "Full-Body Strength", [
        ["Goblet Squat", "4x10"],
        ["Romanian Deadlift (Dumbbell)", "4x8-10"],
        ["Push Up", "4x10"],
        ["One Arm Row (Dumbbell)", "4x10/side"],
        ["Farmers Walk", "4x40 sec"],
        ["Plank", "3x40 sec"]]),
      mk("Tuesday", "Unilateral + Stability", [
        ["Bulgarian Split Squat (Dumbbell)", "3x8/leg"],
        ["Single Leg Romanian Deadlift (Dumbbell)", "3x10/leg"],
        ["Step Up", "3x10/leg"],
        ["Overhead Press (Dumbbell)", "3x10/side", "One arm at a time"],
        ["Suitcase Carry (Dumbbell)", "3x40 sec/side"],
        ["Dead Bug", "3x12/side"]]),
      mk("Wednesday", "Conditioning — 4 rounds", [
        ["Kettlebell Swing", "4 rounds x 15"],
        ["Burpee", "4 rounds x 6"],
        ["Goblet Squat", "4 rounds x 12"],
        ["Push Up", "4 rounds x 12"],
        ["Walking Lunge", "4 rounds x 10/leg"],
        ["Farmers Walk", "4 rounds x 40 sec"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Functional Strength", [
        ["Deadlift (Barbell)", "4x6-8"],
        ["Front Squat", "4x8"],
        ["Bench Press (Dumbbell)", "4x8-10"],
        ["Dumbbell Row", "4x8-10"],
        ["Reverse Lunge", "3x10/leg"],
        ["Cable Core Pallof Press", "3x12/side"]]),
      mk("Saturday", "20-minute AMRAP", [
        ["Goblet Squat", "10", "20-minute AMRAP — record rounds + reps"],
        ["Push Up", "10"],
        ["Dumbbell Row", "10"],
        ["Reverse Lunge", "10"],
        ["Kettlebell Swing", "15"],
        ["Farmers Walk", "30 sec"]])
    ],
    advanced: [
      mk("Monday", "Strength", [
        ["Front Squat", "4x6"],
        ["Romanian Deadlift (Dumbbell)", "4x8"],
        ["Push Up", "4x12"],
        ["One Arm Row (Dumbbell)", "4x8/side"],
        ["Farmers Walk", "4x45 sec"]]),
      mk("Tuesday", "Unilateral", [
        ["Bulgarian Split Squat (Dumbbell)", "4x8/leg"],
        ["Single Leg Romanian Deadlift (Dumbbell)", "3x8/leg"],
        ["Overhead Press (Dumbbell)", "4x8/side", "One arm at a time"],
        ["Step Up", "3x10/leg"],
        ["Suitcase Carry (Dumbbell)", "4x40 sec/side"],
        ["Cable Core Pallof Press", "3x12/side"]]),
      mk("Wednesday", "Conditioning — 5 rounds", [
        ["Kettlebell Swing", "5 rounds x 20"],
        ["Burpee", "5 rounds x 8"],
        ["Goblet Squat", "5 rounds x 15"],
        ["Push Up", "5 rounds x 12"],
        ["Walking Lunge", "5 rounds x 10/leg"],
        ["Mountain Climber", "5 rounds x 30"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Functional Strength", [
        ["Deadlift (Barbell)", "5x5"],
        ["Front Squat", "4x6"],
        ["Bench Press (Dumbbell)", "4x8"],
        ["Bent Over Row (Barbell)", "4x8"],
        ["Walking Lunge", "3x10/leg"],
        ["Cable Core Pallof Press", "3x12"]]),
      mk("Saturday", "Full Body — 5 rounds", [
        ["Kettlebell Swing", "5 rounds x 15"],
        ["Goblet Squat", "5 rounds x 10"],
        ["Push Up", "5 rounds x 10"],
        ["Dumbbell Row", "5 rounds x 10/side"],
        ["Reverse Lunge", "5 rounds x 10/leg"],
        ["Farmers Walk", "5 rounds x 45 sec"]])
    ],
    performance: [
      mk("Monday", "Strength", [
        ["Front Squat", "5x5"],
        ["Romanian Deadlift (Dumbbell)", "4x6"],
        ["Push Up", "4x12"],
        ["One Arm Row (Dumbbell)", "4x8/side"],
        ["Farmers Walk", "4x45 sec", "Heavy"]]),
      mk("Tuesday", "Unilateral", [
        ["Bulgarian Split Squat (Dumbbell)", "4x6/leg"],
        ["Single Leg Romanian Deadlift (Dumbbell)", "3x8/leg"],
        ["Overhead Press (Dumbbell)", "4x6-8/side", "One arm at a time"],
        ["Step Up", "3x8/leg"],
        ["Suitcase Carry (Dumbbell)", "4x45 sec/side"],
        ["Cable Core Pallof Press", "3x12/side"]]),
      mk("Wednesday", "Performance Circuit — 5 rounds", [
        ["Kettlebell Swing", "5 rounds x 20"],
        ["Burpee", "5 rounds x 8"],
        ["Goblet Squat", "5 rounds x 12"],
        ["Push Up", "5 rounds x 12"],
        ["Walking Lunge", "5 rounds x 10/leg"],
        ["Farmers Walk", "5 rounds x 45 sec"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Functional Strength", [
        ["Deadlift (Barbell)", "5x3"],
        ["Front Squat", "4x5"],
        ["Bench Press (Dumbbell)", "4x8"],
        ["Dumbbell Row", "4x8"],
        ["Walking Lunge", "3x8/leg"],
        ["Cable Core Pallof Press", "3x12/side"]]),
      mk("Saturday", "20-minute AMRAP", [
        ["Kettlebell Swing", "10", "Record rounds + reps and compare week 16 with week 1"],
        ["Goblet Squat", "10"],
        ["Push Up", "10"],
        ["Dumbbell Row", "10"],
        ["Reverse Lunge", "10"],
        ["Farmers Walk", "40 sec"]])
    ]
  };

  /* ---------------------------------------------------------
     16-WEEK CORE TRAINING

     Built around anti-extension, anti-rotation, anti-lateral-flexion and loaded carries rather
     than around crunches. Flexion work is present but it is a minority of the volume, which is
     the opposite of how most core programs are put together.
  --------------------------------------------------------- */
  var CORE = {
    foundation: [
      mk("Monday", "Core Strength", [
        ["Dead Bug", "3x10/side"],
        ["Plank", "3x30 sec"],
        ["Bird Dog", "3x10/side"],
        ["Glute Bridge", "3x12"],
        ["Reverse Crunch", "3x10"]]),
      mk("Tuesday", "Anti-Rotation + Stability", [
        ["Cable Core Pallof Press", "3x10/side"],
        ["Side Plank", "3x20 sec/side"],
        ["Suitcase Carry (Dumbbell)", "3x30 sec/side"],
        ["Bird Dog", "3x10/side"],
        ["Dead Bug", "3x10/side"]]),
      mk("Wednesday", "Core Conditioning — 3 rounds", [
        ["Mountain Climber", "3 rounds x 20"],
        ["Heel Taps", "3 rounds x 20"],
        ["Shoulder Taps", "3 rounds x 16"],
        ["Reverse Crunch", "3 rounds x 10"],
        ["Plank", "3 rounds x 30 sec"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Advanced Core Strength", [
        ["Hanging Knee Raise", "3x8-10"],
        ["Cable Crunch", "3x12"],
        ["Side Plank", "3x20 sec/side"],
        ["Cable Core Pallof Press", "3x10/side"],
        ["Farmers Walk", "3x30 sec"]]),
      mk("Saturday", "Core Circuit — 4 rounds", [
        ["Dead Bug", "4 rounds x 10/side"],
        ["Plank", "4 rounds x 30 sec"],
        ["Mountain Climber", "4 rounds x 20"],
        ["Reverse Crunch", "4 rounds x 10"],
        ["Side Plank", "4 rounds x 20 sec/side"],
        ["Farmers Walk", "4 rounds x 30 sec"]])
    ],
    strength: [
      mk("Monday", "Core Strength", [
        ["Dead Bug", "3x12/side"],
        ["Plank", "3x40 sec"],
        ["Bird Dog", "3x12/side"],
        ["Reverse Crunch", "3x12"],
        ["Ab Wheel", "3x6-8"]]),
      mk("Tuesday", "Anti-Rotation + Stability", [
        ["Cable Core Pallof Press", "3x12/side"],
        ["Side Plank", "3x30 sec/side"],
        ["Suitcase Carry (Dumbbell)", "3x40 sec/side"],
        ["Cable Woodchop", "3x10/side"],
        ["Bird Dog", "3x12/side"]]),
      mk("Wednesday", "Core Conditioning — 4 rounds", [
        ["Mountain Climber", "4 rounds x 30"],
        ["Shoulder Taps", "4 rounds x 20"],
        ["Reverse Crunch", "4 rounds x 12"],
        ["Bicycle Crunch", "4 rounds x 20"],
        ["Plank", "4 rounds x 40 sec"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Advanced Core Strength", [
        ["Hanging Knee Raise", "4x10"],
        ["Cable Crunch", "4x12"],
        ["Ab Wheel", "3x8"],
        ["Cable Core Pallof Press", "3x12/side"],
        ["Farmers Walk", "4x40 sec"]]),
      mk("Saturday", "20-minute AMRAP", [
        ["Reverse Crunch", "10", "20-minute AMRAP — record rounds + reps"],
        ["Mountain Climber", "20"],
        ["Dead Bug", "10"],
        ["Plank", "30 sec"],
        ["Farmers Walk", "30 sec"]])
    ],
    advanced: [
      mk("Monday", "Core Strength", [
        ["Ab Wheel", "4x8"],
        ["Hanging Knee Raise", "4x10"],
        ["Plank", "3x60 sec"],
        ["Reverse Crunch", "3x15"],
        ["Dead Bug", "3x12/side"]]),
      mk("Tuesday", "Anti-Rotation + Stability", [
        ["Cable Core Pallof Press", "4x12/side"],
        ["Side Plank", "3x40 sec/side"],
        ["Suitcase Carry (Dumbbell)", "4x45 sec/side"],
        ["Cable Woodchop", "3x12/side"],
        ["Bird Dog", "3x12/side"]]),
      mk("Wednesday", "Core Conditioning — 5 rounds", [
        ["Mountain Climber", "5 rounds x 30"],
        ["Bicycle Crunch", "5 rounds x 20"],
        ["Shoulder Taps", "5 rounds x 20"],
        ["Reverse Crunch", "5 rounds x 15"],
        ["Plank", "5 rounds x 45 sec"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Advanced Core Strength", [
        ["Hanging Leg Raise", "4x8"],
        ["Cable Crunch", "4x10"],
        ["Ab Wheel", "4x8"],
        ["Side Plank", "3x45 sec/side"],
        ["Farmers Walk", "4x45 sec"]]),
      mk("Saturday", "Core Circuit — 5 rounds", [
        ["Ab Wheel", "5 rounds x 8"],
        ["Mountain Climber", "5 rounds x 20"],
        ["Reverse Crunch", "5 rounds x 12"],
        ["Side Plank", "5 rounds x 30 sec/side"],
        ["Farmers Walk", "5 rounds x 40 sec"]])
    ],
    performance: [
      mk("Monday", "Core Strength", [
        ["Ab Wheel", "4x10"],
        ["Hanging Leg Raise", "4x10"],
        ["Plank", "3x60-75 sec"],
        ["Reverse Crunch", "3x15"],
        ["Dead Bug", "3x15/side"]]),
      mk("Tuesday", "Anti-Rotation + Stability", [
        ["Cable Core Pallof Press", "4x15/side"],
        ["Side Plank", "3x60 sec/side"],
        ["Suitcase Carry (Dumbbell)", "4x45 sec/side", "Heavy"],
        ["Cable Woodchop", "4x10/side"],
        ["Bird Dog", "3x15/side"]]),
      mk("Wednesday", "Core HIIT — 5 rounds", [
        ["Mountain Climber", "5 rounds x 30 sec", "45 sec rest between rounds"],
        ["Bicycle Crunch", "5 rounds x 30 sec"],
        ["Shoulder Taps", "5 rounds x 30 sec"],
        ["Reverse Crunch", "5 rounds x 30 sec"],
        ["Plank", "5 rounds x 45 sec"]]),
      rest("Thursday", "20-30 min easy", "Rest or mobility"),
      mk("Friday", "Core Strength", [
        ["Hanging Leg Raise", "4x10"],
        ["Cable Crunch", "4x12"],
        ["Ab Wheel", "4x10"],
        ["Cable Core Pallof Press", "3x15/side"],
        ["Farmers Walk", "4x60 sec", "Heavy"]]),
      mk("Saturday", "Core Challenge — 20-minute AMRAP", [
        ["Ab Wheel", "10", "Record rounds + reps"],
        ["Reverse Crunch", "15"],
        ["Mountain Climber", "20"],
        ["Hanging Knee Raise", "10"],
        ["Side Plank", "30 sec"],
        ["Farmers Walk", "40 sec"]])
    ]
  };

  var PROGRAMS = {
    bodyweight: {
      id: "bodyweight", label: "16-Week Bodyweight", equipment: "none",
      blurb: "No equipment. Foundation to advanced bodyweight strength over four phases.",
      weeks: 16, phases: BODYWEIGHT
    },
    band: {
      id: "band", label: "16-Week Resistance Band", equipment: "bands",
      blurb: "One set of bands. Push/pull/legs, progressing by resistance before reps.",
      weeks: 16, phases: BAND
    },
    dumbbell: {
      id: "dumbbell", label: "16-Week Dumbbell", equipment: "dumbbells",
      blurb: "Dumbbells only. A five-day split building from technique to heavy sets.",
      weeks: 16, phases: DUMBBELL
    },
    barbell: {
      id: "barbell", label: "16-Week Barbell", equipment: "barbell",
      blurb: "Barbell only. Volume to strength, finishing on 5x5 across the main lifts.",
      weeks: 16, phases: BARBELL
    },
    homegym: {
      id: "homegym", label: "16-Week Home Gym", equipment: "home",
      blurb: "Barbell and dumbbells, no machines. Barbell for the main lifts, dumbbells for range.",
      weeks: 16, phases: HOMEGYM
    },
    fullgym: {
      id: "fullgym", label: "16-Week Full Gym", equipment: "gym",
      blurb: "Commercial gym. Free weights, cables and machines, foundation through to 5x5.",
      weeks: 16, phases: FULLGYM
    },
    plyometric: {
      id: "plyometric", label: "16-Week Plyometric", equipment: "none",
      blurb: "Power, speed and landing quality. Low volume by design, graded on quality not reps.",
      weeks: 16, phases: PLYO
    },
    olympic: {
      id: "olympic", label: "16-Week Olympic Weightlifting", equipment: "barbell",
      blurb: "Snatch and clean & jerk. Highly technical — hang and power variations stay in every phase.",
      weeks: 16, phases: OLYMPIC
    },
    hiit: {
      id: "hiit", label: "16-Week HIIT", equipment: "dumbbells",
      blurb: "Fat loss and work capacity. The work:rest ratio progresses, not the exercise list.",
      weeks: 16, phases: HIIT
    },
    mobility: {
      id: "mobility", label: "16-Week Mobility & Flexibility", equipment: "none",
      blurb: "Joint mobility and usable range. Dynamic work before training, long holds after.",
      weeks: 16, phases: MOBILITY
    },
    yoga: {
      id: "yoga", label: "16-Week Yoga", equipment: "none",
      blurb: "Mobility, balance, breathing and control. No inversions or arm balances at any phase.",
      weeks: 16, phases: YOGA
    },
    sprint: {
      id: "sprint", label: "16-Week Sprint Training", equipment: "barbell",
      blurb: "Acceleration and max velocity. Four training days — the two rest days are load-bearing.",
      weeks: 16, phases: SPRINT
    },
    functional: {
      id: "functional", label: "16-Week Functional Training", equipment: "home",
      blurb: "Unilateral work and loaded carries in every phase, not as end-of-session accessories.",
      weeks: 16, phases: FUNCTIONAL
    },
    core: {
      id: "core", label: "16-Week Core Training", equipment: "gym",
      blurb: "Anti-extension, anti-rotation and carries. Flexion work is deliberately the minority.",
      weeks: 16, phases: CORE
    }
  };

  /* A prescription string into something the routine builder can hold.

     The programs store prescriptions as people read them — "4x8-12", "3x30-45 sec",
     "3 rounds x 12", "3x10/side", "6x20 m". A routine stores a SET COUNT and a reps string per
     set, so this reads the two numbers out and leaves everything it cannot parse alone rather
     than guessing: an unparsed prescription becomes one set with the original text in the reps
     field, which is still true and still useful, instead of a confident 1x1.

     The reps value keeps the RANGE ("8-12") rather than picking a number from it. Double
     progression works off the range, and choosing 8 or 12 here would be inventing a target the
     program deliberately did not set. */
  function parsePresc(presc) {
    var p = String(presc || "").trim();
    if (!p) return { sets: 1, reps: "" };

    // "3 rounds x 12" and "4-5 rounds x 8/side"
    var rounds = p.match(/^([\d]+)(?:-[\d]+)?\s*rounds?\s*x\s*(.+)$/i);
    if (rounds) return { sets: parseInt(rounds[1], 10), reps: rounds[2].trim() };

    // "4x8-12", "3x30-45 sec", "3x10/side", "6x20 m"
    var std = p.match(/^([\d]+)\s*x\s*(.+)$/i);
    if (std) return { sets: parseInt(std[1], 10), reps: std[2].trim() };

    return { sets: 1, reps: p };
  }

  /** One day of a program as a routine record the app can save. */
  function dayAsRoutine(programId, week, dayIndex) {
    var p = PROGRAMS[programId] || PROGRAMS.bodyweight;
    var w = buildWeek(programId, week);
    var d = w.days[dayIndex];
    if (!d) return null;
    return {
      name: p.label.replace(/^16-Week\s+/, "") + " W" + week + " · " + d.day,
      description: d.session,
      exercises: d.exercises.map(function (e) {
        var q = parsePresc(e.presc);
        return {
          name: e.name,
          sets: q.sets,
          setDetails: Array.from({ length: q.sets }, function () { return { reps: q.reps }; }),
          notes: e.note || ""
        };
      })
    };
  }

  function phaseFor(week) {
    for (var i = 0; i < PHASES.length; i++) {
      if (week >= PHASES[i].from && week <= PHASES[i].to) return PHASES[i];
    }
    return PHASES[PHASES.length - 1];
  }

  /** One week of a program, in the shape app.js's plan screen already renders. */
  function buildWeek(programId, week) {
    var p = PROGRAMS[programId] || PROGRAMS.bodyweight;
    var ph = phaseFor(week);
    return {
      week: week, program: p.id, phase: ph.key, phaseLabel: ph.label,
      days: (p.phases[ph.key] || []).map(function (d) {
        return { day: d.day, session: d.session,
                 exercises: d.exercises.map(function (e) {
                   return { name: e.name, presc: e.presc, note: e.note };
                 }) };
      })
    };
  }

  window.IgnytPrograms = Object.freeze({
    PROGRAMS: PROGRAMS,
    PHASES: PHASES,
    list: function () { return Object.keys(PROGRAMS).map(function (k) { return PROGRAMS[k]; }); },
    get: function (id) { return PROGRAMS[id] || PROGRAMS.bodyweight; },
    phaseFor: phaseFor,
    buildWeek: buildWeek,
    parsePresc: parsePresc,
    dayAsRoutine: dayAsRoutine
  });
})();
