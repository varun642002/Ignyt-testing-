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
        { name: "Incline Push Ups",  presc: "2x10-15", note: "The knee push-up slot — same regression, and this one has artwork" },
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
        { name: "Hollow Rock",       presc: "3x30-45 sec", note: "Hold static for the hollow-body hold if you prefer" } ] },
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
        { name: "Hollow Rock",       presc: "3x45 sec", note: "Hold static if that is the version you are training" } ] },
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
        { name: "Hollow Rock",       presc: "3x45 sec" } ] },
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
        { name: "Band Tricep Extension", presc: "3x12-15", note: "The pushdown slot — anchor high and press down if you have a door anchor" } ] },
      { day: "Tuesday", session: "Back + Biceps", exercises: [
        { name: "Lat Pulldown (Band)", presc: "3x12-15" },
        { name: "Bent Over Row (Band)", presc: "3x12-15" },
        { name: "Band Face Pull",      presc: "3x12-15" },
        { name: "Band Bicep Curl",     presc: "3x12-15" },
        { name: "Hammer Curl (Band)",  presc: "3x12-15" } ] },
      { day: "Wednesday", session: "Legs + Core", exercises: [
        { name: "Squat (Band)",        presc: "4x12-15" },
        { name: "Band Good Morning",   presc: "3x12-15", note: "The band RDL — hinge at the hip, back flat" },
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
    { name: "Bent Over Row (Dumbbell)",  presc: "3x10-12/side", note: "One arm at a time — the library has no separate single-arm entry" },
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
    { name: "Bent Over Row (Dumbbell)", presc: "3x10/side", note: "One arm at a time" },
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
    { name: "Jump Squat",        presc: "3x6", note: "The countermovement jump — dip and drive, full reset between reps" },
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
    { name: "High Knees",            presc: "4x20 sec", note: "The fast-feet drill — turnover, not height" },
    { name: "Lateral Bound",         presc: "3x10/side" },
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
    }
  };

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
    buildWeek: buildWeek
  });
})();
