/* =========================================================
   CONSTANTS — pure static data: exercise library, HYROX plan structure,
   icons, set-type/RPE/rest options, calculators, nutrition defaults, and
   schema/backup key lists. No functions with logic live here on purpose,
   so this file never needs to import anything.
========================================================= */

export const SCHEMA_VERSION = 1; // bump when localStorage shape changes; add a migrate() step below

/* ---------- Storage ---------- */

export const ALL_DATA_KEYS = ["hx_completed","hx_active_week","hx_active_level","hx_profile","hx_nutrition","hx_bodylog","hx_custom_exercises",
  "hx_workout_log","hx_food_log","hx_routines","hx_calc","hx_settings","hx_rest_duration","hx_active_session","hx_prs","hx_onboarding_complete","hx_achievements","hx_favorite_foods","hx_water_log","hx_race_log","hx_race_active","hx_tab","hx_schema_version"];

export const SET_TYPE_IMPORT_MAP = { normal:"working", warmup:"warmup", dropset:"drop", failure:"failure" };

/* "10 Jul 2026, 11:53" -> timestamp (ms), or null if unparseable */

export const PHASE_LABEL = {base:"BASE — FORM FIRST", build:"BUILD — ADD LOAD", load:"LOAD — RAISE INTENSITY", peak:"PEAK — HEAVIEST WEEK", deload:"DELOAD — BACK OFF"};

export const LEVELS = {
  beginner:    { label:"Beginner",    note:"Lighter volume, more technique focus, longer rest.", vol:"lower" },
  intermediate:{ label:"Intermediate",note:"Balanced strength + conditioning (your current plan).", vol:"standard" },
  advanced:    { label:"Advanced",    note:"Higher volume, heavier loads, race-pace conditioning.", vol:"higher" }
};

export const LIBRARY = {
  "Barbell":[["Back Squat","4x6","reps","Quadriceps"],["Front Squat","4x6","reps","Quadriceps"],["Deadlift","4x5","reps","Hamstrings"],
    ["Romanian Deadlift","3x8","reps","Hamstrings"],["Sumo Deadlift","4x5","reps","Glutes"],["Bench Press","4x6","reps","Chest"],
    ["Incline Bench Press","4x8","reps","Chest"],["Overhead Press","3x8","reps","Shoulders"],["Push Press","3x6","reps","Shoulders"],
    ["Bent-Over Row","4x8","reps","Lats"],["Barbell Curl","3x10","reps","Biceps"],["Hip Thrust","3x10","reps","Glutes"],["Barbell Bench Press","3x10","reps","Chest"],["Decline Barbell Bench Press","3x10","reps","Chest"],["Meadows Row","3x10","reps","Lats"],["Barbell Bent-Over Row","3x10","reps","Lats"],["Landmine Press","3x10","reps","Shoulders"],["Reverse-Grip Barbell Curl","3x10","reps","Biceps"],["Dumbbell EZ-Bar Curl","3x10","reps","Biceps"],["Resistance Band Preacher Curl","3x10","reps","Biceps"],["Dumbbell Close-Grip Bench Press","3x10","reps","Triceps"],["Barbell Close-Grip Bench Press","3x10","reps","Triceps"],["Kettlebell Skull Crusher","3x10","reps","Triceps"],["Cable Close-Grip Bench Press","3x10","reps","Triceps"],["Resistance Band Skull Crusher","3x10","reps","Triceps"],["Barbell Back Squat","3x10","reps","Quadriceps"],["Pin Barbell Back Squat","3x10","reps","Quadriceps"],["Tempo Front Squat","3x10","reps","Quadriceps"],["Single-Leg Dumbbell Romanian Deadlift","3x10","reps","Hamstrings"],["Snatch-Grip Romanian Deadlift","3x10","reps","Hamstrings"],["Good Morning","3x10","reps","Hamstrings"],["Barbell Romanian Deadlift","3x10","reps","Hamstrings"],["Barbell Good Morning","3x10","reps","Hamstrings"],["Cable Stiff-Leg Deadlift","3x10","reps","Hamstrings"],["Resistance Band Romanian Deadlift","3x10","reps","Hamstrings"],["Barbell Hip Thrust","3x10","reps","Glutes"],["Banded Barbell Hip Thrust","3x10","reps","Glutes"],["Conventional Deadlift","3x10","reps","Glutes"],["Paused Conventional Deadlift","3x10","reps","Glutes"],["Deficit Conventional Deadlift","3x10","reps","Glutes"],["Rack Pull Conventional Deadlift","3x10","reps","Glutes"],["Block Pull Conventional Deadlift","3x10","reps","Glutes"],["Snatch-Grip Conventional Deadlift","3x10","reps","Glutes"],["Paused Sumo Deadlift","3x10","reps","Glutes"],["Deficit Sumo Deadlift","3x10","reps","Glutes"],["Block Pull Sumo Deadlift","3x10","reps","Glutes"],["Dumbbell Conventional Deadlift","3x10","reps","Glutes"],["Dumbbell Sumo Deadlift","3x10","reps","Glutes"],["Barbell Conventional Deadlift","3x10","reps","Glutes"],["Barbell Sumo Deadlift","3x10","reps","Glutes"],["Kettlebell Conventional Deadlift","3x10","reps","Glutes"],["Kettlebell Sumo Deadlift","3x10","reps","Glutes"],["Cable Conventional Deadlift","3x10","reps","Glutes"],["Cable Sumo Deadlift","3x10","reps","Glutes"],["Resistance Band Conventional Deadlift","3x10","reps","Glutes"],["Resistance Band Sumo Deadlift","3x10","reps","Glutes"],["Power Clean","3x10","reps","Glutes"],["Hang Power Clean","3x10","reps","Glutes"],["Block Power Clean","3x10","reps","Glutes"],["High-Hang Power Clean","3x10","reps","Glutes"],["Muscle Power Clean","3x10","reps","Glutes"],["Clean and Jerk","3x10","reps","Cardio"],["Snatch","3x10","reps","Cardio"],["Hang Snatch","3x10","reps","Cardio"],["Block Snatch","3x10","reps","Cardio"],["High-Hang Snatch","3x10","reps","Cardio"],["Muscle Snatch","3x10","reps","Cardio"],["Split Snatch","3x10","reps","Cardio"],["Power Snatch","3x10","reps","Cardio"],["Hang Clean","3x10","reps","Glutes"],["Dumbbell Power Clean","3x10","reps","Glutes"],["Dumbbell Clean and Jerk","3x10","reps","Cardio"],["Dumbbell Snatch","3x10","reps","Cardio"],["Dumbbell Power Snatch","3x10","reps","Cardio"],["Dumbbell Hang Clean","3x10","reps","Glutes"],["Dumbbell Push Press","3x10","reps","Shoulders"],["Barbell Power Clean","3x10","reps","Glutes"],["Barbell Clean and Jerk","3x10","reps","Cardio"],["Barbell Snatch","3x10","reps","Cardio"],["Barbell Power Snatch","3x10","reps","Cardio"],["Barbell Hang Clean","3x10","reps","Glutes"],["Barbell Push Press","3x10","reps","Shoulders"],["Kettlebell Power Clean","3x10","reps","Glutes"],["Kettlebell Clean and Jerk","3x10","reps","Cardio"],["Kettlebell Power Snatch","3x10","reps","Cardio"],["Kettlebell Hang Clean","3x10","reps","Glutes"],["Kettlebell Push Press","3x10","reps","Shoulders"],["Cable Power Clean","3x10","reps","Glutes"],["Cable Clean and Jerk","3x10","reps","Cardio"],["Cable Snatch","3x10","reps","Cardio"],["Cable Power Snatch","3x10","reps","Cardio"],["Cable Hang Clean","3x10","reps","Glutes"],["Cable Push Press","3x10","reps","Shoulders"],["Resistance Band Power Clean","3x10","reps","Glutes"],["Resistance Band Clean and Jerk","3x10","reps","Cardio"],["Resistance Band Snatch","3x10","reps","Cardio"],["Resistance Band Power Snatch","3x10","reps","Cardio"],["Resistance Band Hang Clean","3x10","reps","Glutes"],["Resistance Band Push Press","3x10","reps","Shoulders"],["Jefferson Curl","3x10","reps","Abdominals"],["Trap-Bar Deadlift","3x10","reps","Glutes"],["Dumbbell Trap-Bar Deadlift","3x10","reps","Glutes"],["Barbell Trap-Bar Deadlift","3x10","reps","Glutes"],["Kettlebell Trap-Bar Deadlift","3x10","reps","Glutes"],["Cable Trap-Bar Deadlift","3x10","reps","Glutes"],["Resistance Band Trap-Bar Deadlift","3x10","reps","Glutes"]],
  "Dumbbell":[["DB Bench Press","4x8","reps","Chest"],["DB Row","4x10","reps","Lats"],["DB Shoulder Press","3x10","reps","Shoulders"],
    ["Goblet Squat","3x12","reps","Quadriceps"],["Walking Lunges","3x12/leg","reps","Quadriceps"],["Bulgarian Split Squat","3x10/leg","reps","Quadriceps"],
    ["Farmer's Carry","4x40m","distance","Forearms"],["DB Curl","3x12","reps","Biceps"],["Lateral Raise","3x12","reps","Shoulders"],
    ["DB RDL","3x10","reps","Hamstrings"],["Renegade Row","3x8/side","reps","Lats"],["Dumbbell Bench Press","3x10","reps","Chest"],["Dumbbell Fly","3x10","reps","Chest"],["Incline Dumbbell Press","3x10","reps","Chest"],["One-Arm Dumbbell Row","3x10","reps","Lats"],["Dumbbell Lateral Raise","3x10","reps","Shoulders"],["One-Arm Dumbbell Lateral Raise","3x10","reps","Shoulders"],["Kettlebell Arnold Press","3x10","reps","Shoulders"],["Dumbbell Rear Delt Fly","3x10","reps","Shoulders"],["Cable Arnold Press","3x10","reps","Shoulders"],["Alternating Dumbbell Curl","3x10","reps","Biceps"],["Zottman Dumbbell Curl","3x10","reps","Biceps"],["Rope Cable Hammer Curl","3x10","reps","Biceps"],["Dumbbell Concentration Curl","3x10","reps","Biceps"],["Barbell Hammer Curl","3x10","reps","Biceps"],["Incline Dumbbell Curl","3x10","reps","Biceps"],["Kettlebell Hammer Curl","3x10","reps","Biceps"],["Cable Hammer Curl","3x10","reps","Biceps"],["Front-Rack Walking Lunge","3x10","reps","Quadriceps"],["Front-Rack Reverse Lunge","3x10","reps","Quadriceps"],["High-Box Step-Up","3x10","reps","Quadriceps"]],
  "Machine":[["Leg Press","4x10","reps","Quadriceps"],["Hack Squat","4x10","reps","Quadriceps"],["Leg Extension","3x12","reps","Quadriceps"],
    ["Leg Curl","3x12","reps","Hamstrings"],["Lat Pulldown","4x10","reps","Lats"],["Seated Cable Row","4x10","reps","Lats"],
    ["Chest Press Machine","4x10","reps","Chest"],["Shoulder Press Machine","3x10","reps","Shoulders"],["Pec Deck","3x12","reps","Chest"],
    ["Cable Crossover","3x12","reps","Chest"],["Smith Machine Squat","4x8","reps","Quadriceps"],["Assisted Pull-up","3x8","reps","Lats"],
    ["Assisted Dip","3x8","reps","Triceps"],["Cable Tricep Pushdown","3x12","reps","Triceps"],["Cable Face Pull","3x15","reps","Traps"],
    ["Hip Abductor Machine","3x15","reps","Abductors"],["Hip Adductor Machine","3x15","reps","Adductors"],["Calf Raise Machine","4x15","reps","Calves"],["Cable Pec Deck Fly","3x10","reps","Chest"],["Resistance Band Pec Deck Fly","3x10","reps","Chest"],["T-Bar Row","3x10","reps","Lats"],["Cable Lat Pulldown","3x10","reps","Lats"],["Cable Straight-Arm Pulldown","3x10","reps","Lats"],["Resistance Band Straight-Arm Pulldown","3x10","reps","Lats"],["Face Pull","3x10","reps","Shoulders"],["Cuff Cable Lateral Raise","3x10","reps","Shoulders"],["Dumbbell Reverse Pec Deck Fly","3x10","reps","Shoulders"],["Cable Curl","3x10","reps","Biceps"],["Triceps Pushdown","3x10","reps","Triceps"],["Straight-Bar Triceps Pushdown","3x10","reps","Triceps"],["Reverse-Grip Triceps Pushdown","3x10","reps","Triceps"],["Overhead Cable Triceps Extension","3x10","reps","Triceps"],["Barbell Triceps Pushdown","3x10","reps","Triceps"],["Kettlebell Triceps Pushdown","3x10","reps","Triceps"],["Resistance Band Triceps Pushdown","3x10","reps","Triceps"],["Kettlebell Leg Press","3x10","reps","Quadriceps"],["Cable Leg Extension","3x10","reps","Quadriceps"],["Resistance Band Leg Extension","3x10","reps","Quadriceps"],["Seated Leg Curl","3x10","reps","Hamstrings"],["Dumbbell Seated Leg Curl","3x10","reps","Hamstrings"],["Barbell Lying Leg Curl","3x10","reps","Hamstrings"],["Kettlebell Lying Leg Curl","3x10","reps","Hamstrings"],["Resistance Band Seated Leg Curl","3x10","reps","Hamstrings"],["Cable Glute Kickback","3x10","reps","Glutes"],["Hip Abduction Machine","3x10","reps","Glutes"],["Cable Pull-Through","3x10","reps","Glutes"],["Standing Calf Raise","3x10","reps","Calves"],["Single-Leg Standing Calf Raise","3x10","reps","Calves"],["Dumbbell Standing Calf Raise","3x10","reps","Calves"],["Smith Machine Standing Calf Raise","3x10","reps","Calves"],["Donkey Standing Calf Raise","3x10","reps","Calves"],["Dumbbell Seated Calf Raise","3x10","reps","Calves"],["Kettlebell Standing Calf Raise","3x10","reps","Calves"],["Cable Standing Calf Raise","3x10","reps","Calves"],["Cable Seated Calf Raise","3x10","reps","Calves"],["Resistance Band Standing Calf Raise","3x10","reps","Calves"],["Resistance Band Seated Calf Raise","3x10","reps","Calves"],["Tall-Kneeling Pallof Press","3x10","reps","Abdominals"],["Reverse Hyperextension","3x10","reps","Glutes"],["Back Extension","3x10","reps","Abdominals"],["Dumbbell Reverse Hyperextension","3x10","reps","Glutes"],["Dumbbell Back Extension","3x10","reps","Abdominals"],["Barbell Reverse Hyperextension","3x10","reps","Glutes"],["Barbell Back Extension","3x10","reps","Abdominals"],["Kettlebell Reverse Hyperextension","3x10","reps","Glutes"],["Kettlebell Back Extension","3x10","reps","Abdominals"],["Cable Reverse Hyperextension","3x10","reps","Glutes"],["Cable Back Extension","3x10","reps","Abdominals"],["Resistance Band Reverse Hyperextension","3x10","reps","Glutes"],["Resistance Band Back Extension","3x10","reps","Abdominals"],["Hip Adduction Machine","3x10","reps","Adductors"]],
  "Bodyweight":[["Push-up","3x15","reps","Chest"],["Pull-up","3x8","reps","Lats"],["Chin-up","3x8","reps","Biceps"],
    ["Dip","3x10","reps","Triceps"],["Plank","3x45s","time","Abdominals"],["Sit-up","3x15","reps","Abdominals"],["Air Squat","3x20","reps","Quadriceps"],
    ["Burpee","3x10","reps","Cardio"],["Mountain Climbers","3x30s","time","Abdominals"],["Jump Squat","3x12","reps","Quadriceps"],
    ["Handstand Hold","3x20s","time","Shoulders"],["Pistol Squat","3x5/leg","reps","Quadriceps"],["Close-Grip Push-Up","3x10","reps","Chest"],["Deficit Push-Up","3x10","reps","Chest"],["Commando Pull-Up","3x10","reps","Lats"],["Weighted Chin-Up","3x10","reps","Lats"],["Barbell Pull-Up","3x10","reps","Lats"],["Barbell Inverted Row","3x10","reps","Traps"],["Kettlebell Chin-Up","3x10","reps","Lats"],["Kettlebell Inverted Row","3x10","reps","Traps"],["Bench Dip","3x10","reps","Triceps"],["Kettlebell Bench Dip","3x10","reps","Triceps"],["Barbell Sissy Squat","3x10","reps","Quadriceps"],["Kettlebell Sissy Squat","3x10","reps","Quadriceps"],["Kettlebell Nordic Hamstring Curl","3x10","reps","Hamstrings"],["Cable Nordic Hamstring Curl","3x10","reps","Hamstrings"],["Glute Bridge","3x10","reps","Glutes"],["Weighted Glute Bridge","3x10","reps","Glutes"],["Dumbbell Glute Bridge","3x10","reps","Glutes"],["Dumbbell Frog Pump","3x10","reps","Glutes"],["Kettlebell Frog Pump","3x10","reps","Glutes"],["Cable Glute Bridge","3x10","reps","Glutes"],["Tibialis Raise","3x10","reps","Calves"],["Dumbbell Tibialis Raise","3x10","reps","Calves"],["Barbell Tibialis Raise","3x10","reps","Calves"],["Kettlebell Tibialis Raise","3x10","reps","Calves"],["Stability Ball Plank","3x10","reps","Abdominals"],["Hip Dip Side Plank","3x10","reps","Abdominals"],["Toes-to-Bar Hanging Leg Raise","3x10","reps","Abdominals"],["Dead Bug","3x10","reps","Abdominals"],["Dragon Flag","3x10","reps","Abdominals"],["Dumbbell Dead Bug","3x10","reps","Abdominals"],["Dumbbell Hollow Body Hold","3x10","reps","Abdominals"],["Barbell Bird Dog","3x10","reps","Abdominals"],["Kettlebell Side Plank","3x10","reps","Abdominals"],["Cable Hanging Leg Raise","3x10","reps","Abdominals"],["Cable Dragon Flag","3x10","reps","Abdominals"],["Resistance Band Dead Bug","3x10","reps","Abdominals"],["Muscle-Up","3x10","reps","Lats"],["Front Lever","3x10","reps","Lats"],["Dumbbell Handstand Push-Up","3x10","reps","Shoulders"],["Dumbbell L-Sit","3x10","reps","Abdominals"],["Barbell Muscle-Up","3x10","reps","Lats"],["Barbell Pistol Squat","3x10","reps","Quadriceps"],["Barbell Front Lever","3x10","reps","Lats"],["Kettlebell Handstand Push-Up","3x10","reps","Shoulders"],["Kettlebell L-Sit","3x10","reps","Abdominals"],["Cable Muscle-Up","3x10","reps","Lats"],["Cable Pistol Squat","3x10","reps","Quadriceps"],["Cable Front Lever","3x10","reps","Lats"],["Resistance Band Handstand Push-Up","3x10","reps","Shoulders"],["Resistance Band L-Sit","3x10","reps","Abdominals"],["Outdoor Running","3x30s","time","Cardio"],["Zone 2 Outdoor Running","3x30s","time","Cardio"],["Tempo Outdoor Running","3x30s","time","Cardio"],["Interval Outdoor Running","3x30s","time","Cardio"],["Hill Sprint Outdoor Running","3x30s","time","Cardio"],["Fartlek Outdoor Running","3x30s","time","Cardio"],["Long Run Outdoor Running","3x30s","time","Cardio"],["Recovery Outdoor Running","3x30s","time","Cardio"],["Cat-Cow Stretch","3x10","reps","Abdominals"],["Cossack Squat","3x10","reps","Adductors"],["Dumbbell Cossack Squat","3x10","reps","Adductors"],["Barbell Cossack Squat","3x10","reps","Adductors"],["Kettlebell Cossack Squat","3x10","reps","Adductors"],["Cable Cossack Squat","3x10","reps","Adductors"],["Resistance Band Cossack Squat","3x10","reps","Adductors"],["Bear Crawl","3x10","reps","Abdominals"],["Crab Walk","3x10","reps","Triceps"],["Dumbbell Bear Crawl","3x10","reps","Abdominals"],["Dumbbell Crab Walk","3x10","reps","Triceps"],["Barbell Bear Crawl","3x10","reps","Abdominals"],["Barbell Crab Walk","3x10","reps","Triceps"],["Kettlebell Bear Crawl","3x10","reps","Abdominals"],["Kettlebell Crab Walk","3x10","reps","Triceps"],["Cable Bear Crawl","3x10","reps","Abdominals"],["Cable Crab Walk","3x10","reps","Triceps"],["Resistance Band Bear Crawl","3x10","reps","Abdominals"],["Resistance Band Crab Walk","3x10","reps","Triceps"],["Broad Jump","3x10","reps","Glutes"],["Skater Jump","3x10","reps","Glutes"],["Dumbbell Broad Jump","3x10","reps","Glutes"],["Dumbbell Skater Jump","3x10","reps","Glutes"],["Barbell Broad Jump","3x10","reps","Glutes"],["Barbell Skater Jump","3x10","reps","Glutes"],["Kettlebell Broad Jump","3x10","reps","Glutes"],["Kettlebell Skater Jump","3x10","reps","Glutes"],["Cable Broad Jump","3x10","reps","Glutes"],["Cable Skater Jump","3x10","reps","Glutes"],["Resistance Band Broad Jump","3x10","reps","Glutes"],["Resistance Band Skater Jump","3x10","reps","Glutes"]],
  "Cardio Machine":[["Treadmill","20 min","time","Cardio"],["Rowing Machine","2000m","distance","Cardio"],
    ["Ski Erg","1000m","distance","Cardio"],["Assault Bike","15 min","time","Cardio"],["Stationary Bike","30 min","time","Cardio"],
    ["Elliptical","25 min","time","Cardio"],["Stairmaster","20 min","time","Cardio"],["Jacob's Ladder","10 min","time","Cardio"],["Treadmill Running","15 min","time","Cardio"],["Zone 2 Treadmill Running","15 min","time","Cardio"],["Tempo Treadmill Running","15 min","time","Cardio"],["Interval Treadmill Running","15 min","time","Cardio"],["Incline Treadmill Running","15 min","time","Cardio"],["Sprint Treadmill Running","15 min","time","Cardio"],["Recovery Treadmill Running","15 min","time","Cardio"],["Stationary Cycling","15 min","time","Cardio"],["Stair Climber","15 min","time","Cardio"],["Elliptical Trainer","15 min","time","Cardio"]],
  "Cardio Outdoor":[["Running","5 km","distance","Cardio"],["Cycling","20 km","distance","Cardio"],["Swimming","1500m","distance","Cardio"],
    ["Walking","30 min","time","Cardio"],["Hiking","60 min","time","Cardio"],["Jump Rope","10 min","time","Cardio"],["Single-Under Jump Rope","15 min","time","Cardio"],["Double-Under Jump Rope","15 min","time","Cardio"],["Cross-Over Jump Rope","15 min","time","Cardio"],["High-Knee Jump Rope","15 min","time","Cardio"],["Boxer Step Jump Rope","15 min","time","Cardio"]],
  "Hyrox Station":[["Sled Push","4x25m","distance","Quadriceps"],["Sled Pull","4x25m","distance","Lats"],
    ["Sandbag Lunges","4x25m","distance","Quadriceps"],["Wall Balls","4x15","reps","Quadriceps"],["Burpee Broad Jumps","4x10","reps","Cardio"],
    ["Farmer's Carry (station)","4x200m","distance","Forearms"],["Ski Erg (station)","4x250m","distance","Cardio"],["Rowing (station)","4x250m","distance","Cardio"],["SkiErg","3x30s","time","Lats"],["Zone 2 SkiErg","3x30s","time","Lats"],["Sprint Interval SkiErg","3x30s","time","Lats"],["Double-Pole SkiErg","3x30s","time","Lats"],["Alternating-Arm SkiErg","3x30s","time","Lats"],["Heavy Sled Push","4x20m","distance","Quadriceps"],["Light Sprint Sled Push","4x20m","distance","Quadriceps"],["Low-Handle Sled Push","4x20m","distance","Quadriceps"],["High-Handle Sled Push","4x20m","distance","Quadriceps"],["Backward Sled Pull","4x20m","distance","Lats"],["Rope Sled Pull","4x20m","distance","Lats"],["Hand-over-Hand Sled Pull","4x20m","distance","Lats"],["Harness Sled Pull","4x20m","distance","Lats"],["Burpee Broad Jump","4x20m","distance","Cardio"],["Rowing","3x30s","time","Lats"],["Zone 2 Rowing","3x30s","time","Lats"],["Sprint Interval Rowing","3x30s","time","Lats"],["Tempo Rowing","3x30s","time","Lats"],["500 m Time Trial Rowing","3x30s","time","Lats"],["2000 m Time Trial Rowing","3x30s","time","Lats"],["Farmers Carry","4x20m","distance","Forearms"],["Heavy Farmers Carry","4x20m","distance","Forearms"],["Single-Arm Suitcase Farmers Carry","4x20m","distance","Forearms"],["Trap-Bar Farmers Carry","4x20m","distance","Forearms"],["Overhead Farmers Carry","4x20m","distance","Forearms"],["Sandbag Walking Lunge","4x20m","distance","Quadriceps"],["Wall Ball","4x20m","distance","Quadriceps"],["Dumbbell Sled Push","4x20m","distance","Quadriceps"],["Dumbbell Sled Pull","4x20m","distance","Lats"],["Dumbbell Burpee Broad Jump","4x20m","distance","Cardio"],["Dumbbell Farmers Carry","4x20m","distance","Forearms"],["Dumbbell Wall Ball","4x20m","distance","Quadriceps"],["Barbell Sled Push","4x20m","distance","Quadriceps"],["Barbell Sled Pull","4x20m","distance","Lats"],["Barbell Burpee Broad Jump","4x20m","distance","Cardio"],["Barbell Farmers Carry","4x20m","distance","Forearms"],["Barbell Wall Ball","4x20m","distance","Quadriceps"],["Kettlebell Sled Push","4x20m","distance","Quadriceps"],["Kettlebell Sled Pull","4x20m","distance","Lats"],["Kettlebell Burpee Broad Jump","4x20m","distance","Cardio"],["Kettlebell Farmers Carry","4x20m","distance","Forearms"],["Kettlebell Wall Ball","4x20m","distance","Quadriceps"],["Cable Sled Push","4x20m","distance","Quadriceps"],["Cable Sled Pull","4x20m","distance","Lats"],["Cable Burpee Broad Jump","4x20m","distance","Cardio"],["Cable Farmers Carry","4x20m","distance","Forearms"],["Cable Wall Ball","4x20m","distance","Quadriceps"],["Resistance Band Sled Push","4x20m","distance","Quadriceps"],["Resistance Band Sled Pull","4x20m","distance","Lats"],["Resistance Band Burpee Broad Jump","4x20m","distance","Cardio"],["Resistance Band Farmers Carry","4x20m","distance","Forearms"],["Resistance Band Wall Ball","4x20m","distance","Quadriceps"]],
  "Mobility / Stretch":[["Hip Flexor Stretch","2x30s/side","time","Mobility"],["Couch Stretch","2x45s/side","time","Mobility"],
    ["Pigeon Pose","2x45s/side","time","Mobility"],["World's Greatest Stretch","2x5/side","reps","Mobility"],
    ["Thoracic Rotation","2x10/side","reps","Mobility"],["Shoulder Dislocate","2x10","reps","Mobility"],["Cat-Cow","2x10","reps","Mobility"],
    ["90/90 Hip Switch","2x8/side","reps","Mobility"],["Hamstring Stretch","2x30s/side","time","Mobility"],["Calf Stretch","2x30s/side","time","Mobility"],
    ["Ankle Circles","2x10/side","reps","Mobility"],["Foam Rolling — Quads","2 min/side","time","Mobility"],
    ["Foam Rolling — Back","2 min","time","Mobility"],["Band Pull-Apart","3x15","reps","Traps"],["Deep Squat Hold","3x30s","time","Mobility"],["Dumbbell Spanish Squat","3x10","reps","Quadriceps"],["Cable Spanish Squat","3x10","reps","Quadriceps"],["Child's Pose","3x10","reps","Lats"],["Downward-Facing Dog","3x10","reps","Hamstrings"],["Warrior I","3x10","reps","Quadriceps"],["Warrior II","3x10","reps","Quadriceps"],["Boat Pose","3x10","reps","Abdominals"],["Dumbbell Boat Pose","3x10","reps","Abdominals"],["Barbell Boat Pose","3x10","reps","Abdominals"],["Kettlebell Boat Pose","3x10","reps","Abdominals"],["Cable Boat Pose","3x10","reps","Abdominals"],["Resistance Band Boat Pose","3x10","reps","Abdominals"]],
  "Kettlebell":[["Dumbbell Goblet Squat","3x10","reps","Quadriceps"],["Kettlebell Swing","3x10","reps","Glutes"],["Turkish Get-Up","3x10","reps","Cardio"],["Kettlebell Clean","3x10","reps","Glutes"],["Kettlebell Snatch","3x10","reps","Glutes"],["Kettlebell Windmill","3x10","reps","Abdominals"],["Dumbbell Turkish Get-Up","3x10","reps","Cardio"],["Barbell Turkish Get-Up","3x10","reps","Cardio"],["Kettlebell Turkish Get-Up","3x10","reps","Cardio"],["Cable Turkish Get-Up","3x10","reps","Cardio"],["Resistance Band Turkish Get-Up","3x10","reps","Cardio"]],
  "Conditioning":[["Kettlebell Russian Twist","3x10","reps","Abdominals"],["Battle Rope Alternating Waves","3x10","reps","Shoulders"],["Battle Rope Slams","3x10","reps","Shoulders"],["Medicine Ball Slam","3x10","reps","Lats"],["Tire Flip","3x10","reps","Glutes"],["Atlas Stone Load","3x10","reps","Glutes"],["Yoke Walk","3x10","reps","Traps"],["Log Press","3x10","reps","Shoulders"],["Dumbbell Tire Flip","3x10","reps","Glutes"],["Dumbbell Atlas Stone Load","3x10","reps","Glutes"],["Dumbbell Yoke Walk","3x10","reps","Traps"],["Dumbbell Log Press","3x10","reps","Shoulders"],["Barbell Tire Flip","3x10","reps","Glutes"],["Barbell Atlas Stone Load","3x10","reps","Glutes"],["Barbell Yoke Walk","3x10","reps","Traps"],["Barbell Log Press","3x10","reps","Shoulders"],["Kettlebell Tire Flip","3x10","reps","Glutes"],["Kettlebell Atlas Stone Load","3x10","reps","Glutes"],["Kettlebell Yoke Walk","3x10","reps","Traps"],["Kettlebell Log Press","3x10","reps","Shoulders"],["Cable Tire Flip","3x10","reps","Glutes"],["Cable Atlas Stone Load","3x10","reps","Glutes"],["Cable Yoke Walk","3x10","reps","Traps"],["Cable Log Press","3x10","reps","Shoulders"],["Resistance Band Tire Flip","3x10","reps","Glutes"],["Resistance Band Atlas Stone Load","3x10","reps","Glutes"],["Resistance Band Yoke Walk","3x10","reps","Traps"],["Resistance Band Log Press","3x10","reps","Shoulders"],["Box Jump","3x10","reps","Quadriceps"],["Depth Jump","3x10","reps","Quadriceps"],["Dumbbell Box Jump","3x10","reps","Quadriceps"],["Dumbbell Depth Jump","3x10","reps","Quadriceps"],["Barbell Box Jump","3x10","reps","Quadriceps"],["Barbell Depth Jump","3x10","reps","Quadriceps"],["Kettlebell Box Jump","3x10","reps","Quadriceps"],["Kettlebell Depth Jump","3x10","reps","Quadriceps"],["Cable Box Jump","3x10","reps","Quadriceps"],["Cable Depth Jump","3x10","reps","Quadriceps"],["Resistance Band Box Jump","3x10","reps","Quadriceps"],["Resistance Band Depth Jump","3x10","reps","Quadriceps"],["Medicine Ball Chest Pass","3x10","reps","Chest"],["Medicine Ball Rotational Throw","3x10","reps","Abdominals"]]
};

// Names that appear only in the Hyrox 8-week Plan (slightly different wording than library entries)

export const PLAN_MUSCLE_MAP = {
  "Back Squat":"Quadriceps","Romanian Deadlift":"Hamstrings","Walking Lunges":"Quadriceps","Plank":"Abdominals","Pallof Press":"Abdominals",
  "Warm-up":"Cardio","Intervals":"Cardio","Cool-down":"Cardio","Bench Press":"Chest","Bent-Over Row":"Lats",
  "Overhead Press":"Shoulders","Farmer's Carry":"Forearms","Hanging Leg Raise":"Abdominals","Row / Ski / Run":"Cardio",
  "Sled Push/Pull":"Quadriceps","Wall Balls":"Quadriceps","Burpee Broad Jumps":"Cardio","Ski Erg":"Cardio",
  "Weighted Sit-Up":"Abdominals","Walk / Mobility / Light Swim":"Mobility"
};

// Fine-grained muscle categories shown in the Body Distribution table (order matches display order)

export const BODY_MUSCLES = ["Abdominals","Abductors","Adductors","Biceps","Calves","Cardio","Chest","Forearms",
  "Glutes","Hamstrings","Lats","Quadriceps","Shoulders","Traps","Triceps"];

export const VALID_MUSCLES = [...BODY_MUSCLES, "Cardio", "Mobility"];

// Broad grouping used only for the 6-axis radar chart

export const RADAR_MUSCLES = ["Back","Chest","Legs","Core","Arms","Shoulders"];

export const FINE_TO_BROAD = {
  Lats:"Back", Traps:"Back",
  Chest:"Chest",
  Quadriceps:"Legs", Hamstrings:"Legs", Glutes:"Legs", Calves:"Legs", Abductors:"Legs", Adductors:"Legs",
  Abdominals:"Core",
  Biceps:"Arms", Triceps:"Arms", Forearms:"Arms",
  Shoulders:"Shoulders"
};


/* =========================================================
   EXERCISE DETAILS — rich reference data (muscles, form, media) for the
   exercise detail screen. Deliberately kept SEPARATE from LIBRARY: this is
   reference/media metadata, not workout-logging data, so it can be extended
   or left empty per-exercise without touching the plan, logger, or PRs.

   PROOF OF CONCEPT — populated for 3 exercises only, as requested:
   Barbell Back Squat, Barbell Bench Press, Conventional Deadlift.

   IMPORTANT — animation_available is false for all of these. There is no
   real hosted video/CDN for this app; animation_webm_url / animation_mp4_url
   are left null rather than filled with placeholder links, because a fake
   URL would either 404 or silently show unrelated stock footage mislabeled
   as this exercise. The player component below is fully built and will
   activate automatically the moment real URLs are supplied here.
========================================================= */

export const EXERCISE_DETAILS = {
  "Barbell Back Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes","Hamstrings","Lower Back","Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Squat",
    instructions: [
      "Set the bar in a rack at roughly chest height and step under it, resting it across your upper traps.",
      "Unrack the bar, step back, and set feet shoulder-width apart with toes slightly turned out.",
      "Brace your core, break at the hips and knees together, and descend until thighs are at least parallel to the floor.",
      "Drive through the whole foot to stand back up, keeping the chest up and the bar path vertical."
    ],
    formTips: [
      "Keep the bar over your mid-foot throughout the movement, not drifting forward.",
      "Take a full breath and brace your core before each rep.",
      "Track your knees in line with your toes as you descend."
    ],
    commonMistakes: [
      "Letting the knees cave inward on the way up.",
      "Rounding the lower back at the bottom of the squat.",
      "Rising onto the toes instead of driving through the whole foot."
    ],
    animationWebmUrl: null,
    animationMp4Url: null,
    thumbnailUrl: null,
    animationAvailable: false
  },
  "Barbell Bench Press": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps","Anterior Deltoids"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Horizontal Push",
    instructions: [
      "Lie on the bench with eyes roughly under the bar, feet flat on the floor.",
      "Grip the bar slightly wider than shoulder-width and unrack it over your chest.",
      "Lower the bar under control to the mid-chest, keeping elbows at roughly a 45° angle to your torso.",
      "Press the bar back up to full lockout in a slight arc back toward the rack position."
    ],
    formTips: [
      "Keep your shoulder blades pulled back and down against the bench throughout.",
      "Keep a slight, natural arch in your lower back — don't flatten it completely.",
      "Drive your feet into the floor for stability, not to bounce the bar."
    ],
    commonMistakes: [
      "Flaring the elbows out to 90°, which stresses the shoulders.",
      "Bouncing the bar off the chest instead of a controlled touch.",
      "Losing shoulder blade retraction partway through the set."
    ],
    animationWebmUrl: null,
    animationMp4Url: null,
    thumbnailUrl: null,
    animationAvailable: false
  },
  "Conventional Deadlift": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings","Lower Back","Lats","Forearms"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Hip Hinge",
    instructions: [
      "Stand with feet hip-width apart, bar over mid-foot, shins close to the bar.",
      "Hinge at the hips and bend the knees to grip the bar just outside your legs.",
      "Brace your core, flatten your back, and pull the slack out of the bar before lifting.",
      "Drive through the floor, extending hips and knees together until standing tall.",
      "Reverse the motion under control to return the bar to the floor."
    ],
    formTips: [
      "Keep the bar in contact with your legs throughout the entire pull.",
      "Push the floor away with your legs rather than yanking with your back.",
      "Finish with hips fully extended — don't lean back past neutral."
    ],
    commonMistakes: [
      "Letting the bar drift away from the shins, turning it into a squat-pull hybrid.",
      "Rounding the lower back to reach the bar.",
      "Hyperextending the lower back at lockout."
    ],
    animationWebmUrl: null,
    animationMp4Url: null,
    thumbnailUrl: null,
    animationAvailable: false
  }
,
  "Back Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Squat",
    instructions: ["Set the bar in a rack at roughly chest height and step under it, resting it across your upper traps.", "Unrack the bar, step back, and set feet shoulder-width apart with toes slightly turned out.", "Brace your core, break at the hips and knees together, and descend until thighs are at least parallel to the floor.", "Drive through the whole foot to stand back up, keeping the chest up and the bar path vertical."],
    formTips: ["Keep the bar over your mid-foot throughout, not drifting forward.", "Take a full breath and brace your core before each rep.", "Track your knees in line with your toes as you descend."],
    commonMistakes: ["Letting the knees cave inward on the way up.", "Rounding the lower back at the bottom.", "Rising onto the toes instead of driving through the whole foot."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Front Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Core", "Upper Back"],
    equipment: "Barbell",
    difficulty: "Advanced",
    movementPattern: "Squat",
    instructions: ["Rack the bar across your front shoulders, elbows high, fingertips lightly supporting the bar.", "Step back, feet shoulder-width apart, and keep your torso as upright as possible.", "Descend by bending hips and knees together, keeping elbows up throughout.", "Drive up through your heels and mid-foot, maintaining an upright torso to lockout."],
    formTips: ["Keep your elbows as high as you can \u2014 that's what keeps the bar from rolling forward.", "Stay more upright than a back squat; this isn't a hip-hinge movement.", "Brace hard \u2014 the front rack position rewards a tight core."],
    commonMistakes: ["Letting the elbows drop, which tips the bar forward.", "Leaning too far forward at the bottom.", "Using a grip so tight it limits ankle/wrist mobility."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Deadlift": {
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back", "Lats", "Forearms"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Hip Hinge",
    instructions: ["Stand with feet hip-width apart, bar over mid-foot, shins close to the bar.", "Hinge at the hips and bend the knees to grip the bar just outside your legs.", "Brace your core, flatten your back, and pull the slack out of the bar before lifting.", "Drive through the floor, extending hips and knees together until standing tall.", "Reverse the motion under control to return the bar to the floor."],
    formTips: ["Keep the bar in contact with your legs throughout the pull.", "Push the floor away with your legs rather than yanking with your back.", "Finish with hips fully extended \u2014 don't lean back past neutral."],
    commonMistakes: ["Letting the bar drift away from the shins.", "Rounding the lower back to reach the bar.", "Hyperextending the lower back at lockout."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Romanian Deadlift": {
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Hip Hinge",
    instructions: ["Start standing tall holding the bar at hip height, feet hip-width apart.", "Push your hips back while keeping a slight bend in the knees, lowering the bar down the front of your legs.", "Lower until you feel a strong hamstring stretch, roughly mid-shin, keeping the back flat.", "Drive your hips forward to return to standing, squeezing the glutes at the top."],
    formTips: ["This is a hip-hinge, not a squat \u2014 knees stay only slightly bent throughout.", "Keep the bar close to your legs the entire time.", "Stop the descent when your lower back would otherwise round."],
    commonMistakes: ["Squatting the weight down instead of hinging.", "Rounding the back to chase more range of motion.", "Letting the bar drift forward, away from the legs."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Sumo Deadlift": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Quadriceps", "Adductors"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Hip Hinge",
    instructions: ["Set up with a wide stance, toes turned out, gripping the bar inside your knees.", "Drop your hips low with a vertical torso, shins nearly touching the bar.", "Brace and drive through the floor, pushing your knees out as you stand.", "Lock out with hips fully extended, then reverse under control."],
    formTips: ["Push your knees out in line with your toes throughout the pull.", "Keep the torso more upright than a conventional deadlift.", "Drive the floor apart with your feet as you initiate the pull."],
    commonMistakes: ["Knees caving in during the pull.", "Hips rising faster than the chest, turning it into a stiff-leg pull.", "Stance so wide it limits your ability to keep the torso upright."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Bench Press": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Horizontal Push",
    instructions: ["Lie on the bench with eyes roughly under the bar, feet flat on the floor.", "Grip the bar slightly wider than shoulder-width and unrack it over your chest.", "Lower the bar under control to the mid-chest, keeping elbows at roughly a 45\u00b0 angle to your torso.", "Press the bar back up to full lockout in a slight arc back toward the rack position."],
    formTips: ["Keep your shoulder blades pulled back and down against the bench throughout.", "Keep a slight, natural arch in your lower back.", "Drive your feet into the floor for stability, not to bounce the bar."],
    commonMistakes: ["Flaring the elbows out to 90\u00b0, which stresses the shoulders.", "Bouncing the bar off the chest.", "Losing shoulder blade retraction partway through the set."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Incline Bench Press": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Anterior Deltoids", "Triceps"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Horizontal Push",
    instructions: ["Set the bench to a 30\u201345\u00b0 incline and lie back with eyes under the bar.", "Grip slightly wider than shoulder-width and unrack the bar over your upper chest.", "Lower to the upper chest with control, elbows at roughly 45\u00b0.", "Press back up to lockout, keeping the bar path slightly back toward your face."],
    formTips: ["A steeper incline shifts more work to the front delts \u2014 30\u201345\u00b0 keeps it chest-focused.", "Keep shoulder blades retracted throughout, same as flat bench.", "Don't let the bar drift too far forward over your face."],
    commonMistakes: ["Setting the incline too steep, turning it into a shoulder press.", "Bouncing the bar off the chest.", "Flaring the elbows excessively."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Overhead Press": {
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Chest", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Vertical Push",
    instructions: ["Set the bar at rack height, grip just outside shoulder-width, and unrack it to rest on your front delts.", "Brace your core and glutes hard before pressing.", "Press the bar straight up, moving your head back slightly to let the bar pass, then through once it clears.", "Lock out overhead with the bar directly above your mid-foot."],
    formTips: ["Squeeze your glutes and brace your core to avoid leaning back excessively.", "Keep the bar path as vertical as possible.", "Finish with your head through, bar stacked over your shoulders."],
    commonMistakes: ["Leaning back excessively to press around the face instead of through it.", "Flaring elbows too wide at the start.", "Using leg drive when the goal is a strict press."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Push Press": {
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Quadriceps", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Vertical Push",
    instructions: ["Start in the same rack position as an overhead press, feet hip-width apart.", "Dip straight down a few inches by bending the knees, keeping the torso upright.", "Drive explosively through the legs and immediately press the bar overhead.", "Lock out with the bar stacked over your shoulders as your legs reach full extension."],
    formTips: ["Keep the dip short and vertical \u2014 this is a leg drive, not a squat.", "Time the press to start right as the legs finish driving.", "Keep your torso upright through the dip; don't lean forward."],
    commonMistakes: ["Dipping too deep, which turns it into a push jerk.", "Pressing before the leg drive finishes, losing the power transfer.", "Leaning back excessively at lockout."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Bent-Over Row": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Upper Back", "Biceps", "Rear Deltoids"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Horizontal Pull",
    instructions: ["Hold the bar with an overhand grip, hinge at the hips until your torso is roughly 45\u00b0 or lower.", "Let the bar hang with arms extended, keeping a flat back.", "Row the bar toward your lower ribs, driving your elbows back.", "Lower under control back to the start without losing the hip hinge."],
    formTips: ["Keep your torso angle consistent throughout the set \u2014 don't stand up on each rep.", "Drive with your elbows, not just your hands.", "Keep the bar close to your body on the way up."],
    commonMistakes: ["Using body momentum to heave the weight up.", "Rounding the lower back under load.", "Standing more upright each rep as fatigue sets in."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Barbell Curl": {
    primaryMuscle: "Biceps",
    secondaryMuscles: ["Forearms"],
    equipment: "Barbell",
    difficulty: "Beginner",
    movementPattern: "Elbow Flexion",
    instructions: ["Stand holding the bar with an underhand, shoulder-width grip, arms extended.", "Keeping your elbows pinned to your sides, curl the bar up toward your shoulders.", "Squeeze at the top without letting the elbows drift forward.", "Lower under control back to full extension."],
    formTips: ["Keep your elbows stationary at your sides throughout the movement.", "Avoid swinging your torso to help lift the weight.", "Control the lowering phase \u2014 don't just drop the bar."],
    commonMistakes: ["Swinging the hips/torso to cheat the weight up.", "Letting the elbows travel forward as the set gets hard.", "Only performing the top half of the range of motion."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Hip Thrust": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Hip Extension",
    instructions: ["Sit on the ground with your upper back against a bench, a padded barbell over your hips.", "Plant your feet flat, roughly shin-vertical when at the top of the movement.", "Drive through your heels, extending your hips until your torso is in line with your thighs.", "Squeeze your glutes hard at the top, then lower under control."],
    formTips: ["Keep your chin tucked slightly \u2014 don't hyperextend your neck at the top.", "Drive through your heels, not your toes.", "Pause and squeeze at the top of every rep."],
    commonMistakes: ["Overextending the lower back at the top instead of stopping at hip extension.", "Feet placed too far forward or back for a good shin angle.", "Rushing through reps without a top-position squeeze."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Power Clean": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Traps", "Quadriceps", "Core"],
    equipment: "Barbell",
    difficulty: "Advanced",
    movementPattern: "Olympic",
    instructions: ["Start with the bar over mid-foot, shins close, in a deadlift-like starting position.", "Pull the bar from the floor keeping it close, extending hips and knees as it passes the knees.", "Explosively extend through the hips, shrug, and pull yourself under the bar.", "Catch the bar on your front shoulders in a quarter-squat position, then stand tall."],
    formTips: ["This is a technical lift \u2014 start with light weight and drill the pull sequence.", "Keep the bar close to your body throughout the pull.", "The power comes from hip extension, not arm pulling."],
    commonMistakes: ["Pulling early with the arms instead of the hips and legs.", "Letting the bar drift away from the body.", "Catching the bar too low, in a full squat, before mastering the technique."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Hang Power Clean": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Traps", "Core"],
    equipment: "Barbell",
    difficulty: "Advanced",
    movementPattern: "Olympic",
    instructions: ["Start standing with the bar at mid-thigh, knees softly bent.", "Hinge slightly, keeping the bar close, then explosively extend the hips.", "Shrug and pull yourself under the bar as it rises.", "Catch on the front shoulders in a quarter-squat and stand tall."],
    formTips: ["Because there's no floor pull, focus entirely on the hip-hinge-and-extend timing.", "Keep the bar traveling close to your thighs.", "Let the legs re-bend slightly to receive the bar in the catch."],
    commonMistakes: ["Starting the pull with the arms instead of the hips.", "Hinging too low, turning it into a mini deadlift.", "Reaching for the bar instead of pulling yourself under it."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Clean and Jerk": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Glutes", "Shoulders", "Quadriceps", "Core"],
    equipment: "Barbell",
    difficulty: "Advanced",
    movementPattern: "Olympic",
    instructions: ["Perform a clean, catching the bar on your front shoulders in a quarter or full squat, then stand.", "Reset with the bar racked on your shoulders, feet hip-width.", "Dip slightly and drive explosively upward, punching the bar overhead.", "Split or squat under the bar to catch it locked out overhead, then recover to standing."],
    formTips: ["Master the clean and the jerk separately before combining them.", "Keep the dip for the jerk short and vertical.", "Fully lock the elbows overhead before standing tall."],
    commonMistakes: ["Pressing the jerk out with the arms rather than driving with the legs.", "Catching the jerk with arms not fully locked.", "Standing up from the clean catch too slowly, losing momentum for the jerk."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Snatch": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Glutes", "Shoulders", "Hamstrings", "Core"],
    equipment: "Barbell",
    difficulty: "Advanced",
    movementPattern: "Olympic",
    instructions: ["Start with a wide, snatch-grip, bar over mid-foot.", "Pull the bar close to the body, extending hips and knees together as it passes the knees.", "Explosively extend and pull yourself under the bar into an overhead squat catch.", "Stand up to full lockout with the bar directly overhead."],
    formTips: ["This is the most technical barbell lift \u2014 build it up progressively from lighter positions (hang, blocks) first.", "Keep the bar path close and vertical.", "The wide grip means mobility matters \u2014 don't force a catch you can't control."],
    commonMistakes: ["Pressing the bar out overhead instead of catching it locked.", "Catching too far forward or behind the body.", "Rushing the technique progression before it's grooved."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Trap-Bar Deadlift": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Quadriceps", "Hamstrings", "Core"],
    equipment: "Barbell",
    difficulty: "Beginner",
    movementPattern: "Hip Hinge",
    instructions: ["Step inside the trap bar, feet hip-width, and grip the handles.", "Set your hips and back as you would for a squat-deadlift hybrid \u2014 chest up, back flat.", "Drive through the floor, extending hips and knees together.", "Lock out standing tall, then lower under control."],
    formTips: ["The trap bar's neutral grip and centered load make this the most beginner-friendly deadlift variant.", "Keep the weight balanced through your whole foot.", "Stand up and sit down through the hips and knees together, not knees-first."],
    commonMistakes: ["Squatting it up with an overly upright torso and no hip hinge.", "Letting the hips shoot up first, turning it into a stiff-leg pull.", "Rounding the back to reach the handles."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Good Morning": {
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back"],
    equipment: "Barbell",
    difficulty: "Advanced",
    movementPattern: "Hip Hinge",
    instructions: ["Rest a barbell across your upper back as in a back squat, feet shoulder-width.", "Keeping a soft bend in the knees and a flat back, hinge forward at the hips.", "Lower until you feel a strong hamstring stretch, roughly torso parallel to the floor.", "Drive your hips forward to return to standing."],
    formTips: ["Start light \u2014 this loads the lower back and hamstrings hard for the range of motion.", "Keep the bar path directly over your mid-foot throughout.", "Stop the descent before your back would round."],
    commonMistakes: ["Rounding the lower back to go deeper.", "Bending the knees too much, turning it into a squat.", "Using too much weight before the hip hinge pattern is grooved."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "DB Bench Press": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Horizontal Push",
    instructions: ["Lie back on a bench holding a dumbbell in each hand at chest level, palms forward.", "Press both dumbbells up until your arms are extended, without locking the elbows harshly.", "Lower under control until the dumbbells are level with your chest, elbows at roughly 45\u00b0.", "Press back up, keeping both sides moving evenly."],
    formTips: ["The extra range of motion versus a barbell is a benefit \u2014 use it, but stay controlled.", "Keep your shoulder blades retracted throughout.", "Bring the dumbbells together slightly at the top rather than clanking them."],
    commonMistakes: ["Letting the dumbbells drift out wide, stressing the shoulders.", "Uneven pressing between arms.", "Losing control on the descent."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "DB Row": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Biceps", "Upper Back"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Horizontal Pull",
    instructions: ["Place one knee and hand on a bench, other foot on the floor, back flat and parallel to the ground.", "Let the dumbbell hang straight down from the working shoulder.", "Row the dumbbell up toward your hip, driving the elbow back.", "Lower under control back to a full stretch."],
    formTips: ["Keep your torso still \u2014 the movement should come from the shoulder and elbow, not rotation.", "Drive the elbow back and up, not out to the side.", "Fully extend at the bottom of each rep for full range."],
    commonMistakes: ["Twisting the torso to help lift the weight.", "Using momentum instead of a controlled pull.", "Shrugging the shoulder up instead of pulling with the lat."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "DB Shoulder Press": {
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Chest"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Vertical Push",
    instructions: ["Sit or stand holding a dumbbell in each hand at shoulder height, palms forward.", "Brace your core and press both dumbbells straight overhead.", "Lock out with the dumbbells over your shoulders, not out in front.", "Lower under control back to the starting position."],
    formTips: ["Keep the dumbbells tracking straight up rather than flaring outward.", "Brace your core, especially if standing, to avoid arching your lower back.", "Control the descent \u2014 don't let the weight free-fall."],
    commonMistakes: ["Excessive lower-back arch, especially standing.", "Pressing the dumbbells too far forward instead of straight up.", "Uneven timing between arms."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Goblet Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Core"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Squat",
    instructions: ["Hold a dumbbell vertically at chest height, cupping the top end with both hands.", "Stand with feet shoulder-width, toes slightly out.", "Squat down, letting your elbows track just inside your knees.", "Drive back up through your whole foot to standing."],
    formTips: ["The front-loaded weight is a great cue for staying upright \u2014 use it.", "Let your elbows brush your knees at the bottom as a depth guide.", "Keep your heels planted throughout."],
    commonMistakes: ["Leaning too far forward as the weight gets heavy.", "Only squatting to a shallow depth.", "Letting the knees cave inward."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Walking Lunges": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Lunge",
    instructions: ["Hold a dumbbell in each hand at your sides, standing tall.", "Step forward into a lunge, lowering until both knees are at roughly 90\u00b0.", "Push off the front foot to bring the back leg through into the next lunge.", "Continue walking forward, alternating legs."],
    formTips: ["Keep your torso upright throughout \u2014 avoid leaning forward.", "Take a stride length that lets your front knee stay roughly over your ankle.", "Control the descent rather than dropping into each lunge."],
    commonMistakes: ["Taking too short a stride, causing the front knee to travel past the toes.", "Letting the back knee slam into the floor.", "Leaning the torso forward under load."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Bulgarian Split Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: "Dumbbell",
    difficulty: "Intermediate",
    movementPattern: "Lunge",
    instructions: ["Stand a couple feet in front of a bench, resting the top of your back foot on it.", "Hold a dumbbell in each hand, torso upright.", "Lower straight down until your front thigh is roughly parallel to the floor.", "Drive through the front foot to return to standing."],
    formTips: ["Most of your weight should stay on the front leg \u2014 the back foot is just for balance.", "Keep your torso fairly upright for a quad-focused version.", "Find a stance length where your front knee doesn't travel far past your toes."],
    commonMistakes: ["Placing too much weight through the back leg.", "Stance too short, driving the front knee forward excessively.", "Rushing the descent instead of controlling it."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Farmer's Carry": {
    primaryMuscle: "Forearms",
    secondaryMuscles: ["Traps", "Core", "Glutes"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Carry",
    instructions: ["Pick up a heavy dumbbell in each hand, standing tall.", "Brace your core and keep your shoulders pulled back and down.", "Walk forward with controlled, even steps, keeping the weights from swinging.", "Set the weights down under control at the end of the distance or time."],
    formTips: ["Keep your chest up and shoulders back the entire carry \u2014 don't let them roll forward as you fatigue.", "Take normal-length steps rather than shuffling.", "Grip hard through the whole carry."],
    commonMistakes: ["Letting the shoulders round forward as grip fatigues.", "Leaning to one side to compensate for uneven weights.", "Taking overly short, shuffling steps."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "DB Curl": {
    primaryMuscle: "Biceps",
    secondaryMuscles: ["Forearms"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Elbow Flexion",
    instructions: ["Stand holding a dumbbell in each hand at your sides, palms forward.", "Keeping your elbows pinned to your sides, curl both dumbbells up.", "Squeeze at the top without letting the elbows drift forward.", "Lower under control back to full extension."],
    formTips: ["Keep your elbows stationary throughout the movement.", "Avoid swinging your torso to help lift the weight.", "Control the lowering phase."],
    commonMistakes: ["Swinging the body to cheat the weight up.", "Letting the elbows travel forward.", "Only using the top half of the range of motion."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Lateral Raise": {
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Traps"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Shoulder Abduction",
    instructions: ["Stand holding a light dumbbell in each hand at your sides.", "With a slight bend in the elbows, raise both arms out to the sides.", "Lift until your arms are roughly parallel to the floor, leading with the elbows.", "Lower under control back to the start."],
    formTips: ["Use a lighter weight than you think \u2014 this movement is easy to cheat with momentum.", "Lead with your elbows, not your hands.", "Stop at shoulder height; going higher shifts the work to your traps."],
    commonMistakes: ["Using momentum/swinging to raise the weight.", "Shrugging the traps to assist the lift.", "Raising the arms above shoulder height."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "DB RDL": {
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Hip Hinge",
    instructions: ["Stand holding a dumbbell in each hand in front of your thighs.", "Push your hips back while keeping a slight bend in the knees, lowering the dumbbells down your legs.", "Lower until you feel a strong hamstring stretch, keeping your back flat.", "Drive your hips forward to return to standing."],
    formTips: ["This is a hip-hinge \u2014 knees stay only slightly bent throughout.", "Keep the dumbbells close to your legs the entire time.", "Stop the descent when your back would otherwise round."],
    commonMistakes: ["Squatting the weight down instead of hinging.", "Rounding the back to chase more range.", "Letting the dumbbells drift away from the legs."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Incline Dumbbell Press": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Anterior Deltoids", "Triceps"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Horizontal Push",
    instructions: ["Set a bench to a 30\u201345\u00b0 incline and lie back holding a dumbbell in each hand at shoulder level.", "Press both dumbbells up until arms are extended.", "Lower under control to the upper chest, elbows at roughly 45\u00b0.", "Press back up, keeping both sides moving evenly."],
    formTips: ["A moderate incline keeps this chest-focused \u2014 too steep shifts it to the shoulders.", "Keep shoulder blades retracted throughout.", "Control the descent rather than dropping the weight."],
    commonMistakes: ["Incline set too steep.", "Letting the dumbbells drift too wide.", "Uneven pressing between arms."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Leg Press": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Squat",
    instructions: ["Sit in the leg press with feet shoulder-width on the platform, mid-foot centered.", "Release the safeties and lower the platform by bending your knees toward your chest.", "Lower until your knees reach roughly 90\u00b0, without your lower back lifting off the pad.", "Press through your whole foot to extend back to the start, without locking the knees hard."],
    formTips: ["Keep your lower back flat against the pad throughout \u2014 that's your depth limit.", "Press through your whole foot, not just your toes.", "Control the descent rather than letting the weight drop."],
    commonMistakes: ["Letting the lower back round off the pad at the bottom.", "Locking the knees out hard at the top.", "Placing feet too low on the platform, overloading the knees."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Hack Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes"],
    equipment: "Machine",
    difficulty: "Intermediate",
    movementPattern: "Squat",
    instructions: ["Position yourself in the hack squat machine with shoulders under the pads, feet shoulder-width on the platform.", "Release the safety and lower yourself by bending your knees.", "Descend until your thighs are at least parallel, keeping your back flat against the pad.", "Press through your feet to return to the start."],
    formTips: ["Keep your back flat against the pad the whole way down.", "Feet slightly forward of your hips generally feels more comfortable on the knees.", "Control the eccentric \u2014 this machine makes it easy to just drop into the bottom."],
    commonMistakes: ["Letting the knees travel far past the toes without a foot-position adjustment.", "Bouncing out of the bottom position.", "Only performing partial reps."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Leg Extension": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: [],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Knee Extension",
    instructions: ["Sit in the machine with the pad resting on the front of your lower shins, knees at 90\u00b0.", "Extend your knees to lift the pad until your legs are straight.", "Squeeze your quads at the top.", "Lower under control back to the start."],
    formTips: ["Avoid using momentum \u2014 a controlled tempo hits the quads harder.", "Adjust the seat so the machine's pivot lines up with your knee joint.", "Squeeze and briefly pause at full extension."],
    commonMistakes: ["Swinging the weight up with momentum.", "Not adjusting the seat/pad for your leg length.", "Slamming the weight stack on the way down."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Leg Curl": {
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Calves"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Knee Flexion",
    instructions: ["Lie face down with the pad resting against the back of your lower legs.", "Curl your heels toward your glutes, keeping your hips pressed into the bench.", "Squeeze your hamstrings at the top.", "Lower under control back to the start."],
    formTips: ["Keep your hips down on the bench \u2014 they'll want to lift as the weight gets heavy.", "Avoid using momentum to jerk the weight up.", "Control the negative on the way down."],
    commonMistakes: ["Hips rising off the bench.", "Using momentum instead of a controlled curl.", "Only doing partial-range reps."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Lat Pulldown": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Biceps", "Upper Back"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Vertical Pull",
    instructions: ["Sit at the machine with thighs secured under the pad, gripping the bar wider than shoulder-width.", "Lean back slightly and pull the bar down to your upper chest.", "Drive your elbows down and back, squeezing your shoulder blades together.", "Let the bar rise under control back to full arm extension."],
    formTips: ["Lead with your elbows, not your hands.", "Avoid leaning back excessively \u2014 a slight lean is fine, swinging is not.", "Control the return to a full stretch at the top."],
    commonMistakes: ["Using body swing/momentum to pull the weight down.", "Pulling behind the neck, which stresses the shoulders.", "Not achieving a full stretch at the top of each rep."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Seated Cable Row": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Biceps", "Upper Back", "Traps"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Horizontal Pull",
    instructions: ["Sit at the cable row station with feet on the platform, knees slightly bent.", "Grip the handle and sit tall with a flat back.", "Row the handle to your lower ribs, driving your elbows back.", "Extend back forward under control, allowing a stretch through your lats."],
    formTips: ["Keep your torso still \u2014 row with your arms and back, not by rocking.", "Drive your elbows straight back, close to your body.", "Sit tall throughout instead of hunching."],
    commonMistakes: ["Using torso momentum to yank the weight.", "Rounding the lower back.", "Shrugging the shoulders instead of pulling with the back."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Chest Press Machine": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Horizontal Push",
    instructions: ["Adjust the seat so the handles line up with mid-chest height.", "Grip the handles and press forward until your arms are extended.", "Control the return, allowing your elbows to travel back without banging the stack.", "Repeat for reps, keeping shoulder blades pinned to the pad."],
    formTips: ["Keep your shoulder blades pressed into the pad throughout.", "Adjust seat height before you start so the handles match your chest level.", "Control both the press and the return."],
    commonMistakes: ["Letting the shoulder blades lift off the pad.", "Locking the elbows out harshly at the top.", "Using a seat height that turns this into a shoulder press."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Shoulder Press Machine": {
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Vertical Push",
    instructions: ["Adjust the seat so the handles start at shoulder height.", "Grip the handles and press straight overhead.", "Extend without locking the elbows harshly.", "Lower under control back to the start."],
    formTips: ["Set the seat height correctly before loading the weight.", "Keep your back flat against the pad throughout.", "Control the descent."],
    commonMistakes: ["Wrong seat height, changing the pressing angle.", "Arching the lower back off the pad.", "Using momentum on the way up."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Pec Deck": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Anterior Deltoids"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Horizontal Adduction",
    instructions: ["Sit with your back flat against the pad, forearms or hands on the pads/handles.", "Bring your arms together in front of your chest in a hugging motion.", "Squeeze your chest at full contraction.", "Return under control, allowing a stretch across the chest."],
    formTips: ["Keep the movement slow and controlled \u2014 this exercise is easy to cheat with momentum.", "Squeeze and briefly pause at the point of full contraction.", "Don't let the pads slam together."],
    commonMistakes: ["Using momentum instead of a squeeze.", "Arching the back off the pad.", "Going too heavy and using partial range."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Assisted Pull-up": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Biceps", "Upper Back"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Vertical Pull",
    instructions: ["Set the assistance weight \u2014 more assistance for beginners, less as you progress.", "Kneel or stand on the platform, gripping the handles wider than shoulder-width.", "Pull yourself up until your chin clears the bar.", "Lower under control back to a full arm extension."],
    formTips: ["Reduce assistance over time as a real progression toward unassisted pull-ups.", "Control the descent \u2014 don't just drop.", "Full range of motion beats a lighter assistance with partial reps."],
    commonMistakes: ["Using so much assistance that no real strength is built.", "Kipping/swinging instead of a controlled pull.", "Not achieving a full stretch at the bottom."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Cable Face Pull": {
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Traps", "Rear Deltoids"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Horizontal Pull",
    instructions: ["Set a rope attachment at roughly face height on the cable machine.", "Grip the rope with both hands, palms facing each other.", "Pull the rope toward your face, flaring your elbows out and back.", "Squeeze your shoulder blades together at the end, then return under control."],
    formTips: ["Aim the pull toward your face/forehead, not your chest.", "Externally rotate your hands as you pull for full rear-delt engagement.", "Keep the weight light \u2014 this is a technique-focused movement."],
    commonMistakes: ["Using too much weight and turning it into a lat pulldown.", "Pulling toward the chest instead of the face.", "Rushing through reps without the external rotation finish."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Triceps Pushdown": {
    primaryMuscle: "Triceps",
    secondaryMuscles: [],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Elbow Extension",
    instructions: ["Grip a bar or rope attached to a high cable, elbows pinned to your sides.", "Push the attachment down until your arms are fully extended.", "Squeeze your triceps at the bottom.", "Let the weight rise under control back to the start, elbows staying stationary."],
    formTips: ["Keep your elbows locked at your sides throughout \u2014 don't let them drift forward.", "Avoid leaning over the bar to use body weight.", "Control the return; don't let the cable snap back."],
    commonMistakes: ["Elbows drifting away from the body as the set gets hard.", "Using body lean/momentum instead of triceps.", "Only training the bottom half of the range."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Standing Calf Raise": {
    primaryMuscle: "Calves",
    secondaryMuscles: [],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Plantar Flexion",
    instructions: ["Position your shoulders under the pads with the balls of your feet on the platform, heels hanging off.", "Lower your heels down for a full stretch.", "Rise up onto your toes as high as possible.", "Lower back down under control."],
    formTips: ["Use a full range of motion \u2014 a deep stretch at the bottom and a full rise at the top.", "Pause briefly at the top to maximize contraction.", "Control the tempo instead of bouncing."],
    commonMistakes: ["Using a small, bouncy partial range instead of full stretch-to-contraction.", "Letting the knees bend, taking work off the calves.", "Rushing through reps."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Back Extension": {
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Lower Back", "Glutes", "Hamstrings"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Hip Extension",
    instructions: ["Position your hips on the pad with your feet secured, upper body hanging forward.", "Cross your arms over your chest or hold weight if adding load.", "Raise your torso up until your body forms a straight line.", "Lower back down under control to a comfortable stretch."],
    formTips: ["Avoid hyperextending past a straight line at the top.", "Move through your hips, not by arching your lower back.", "Control the descent rather than dropping."],
    commonMistakes: ["Hyperextending the lower back at the top.", "Using momentum to snap up.", "Rounding excessively at the bottom."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Push-up": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Anterior Deltoids", "Core"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Horizontal Push",
    instructions: ["Start in a plank position, hands slightly wider than shoulder-width.", "Keep your body in a straight line from head to heels.", "Lower your chest toward the floor, elbows at roughly 45\u00b0.", "Press back up to full arm extension."],
    formTips: ["Keep your core braced so your hips don't sag or pike.", "Lower until your chest nearly touches the floor for full range.", "Keep your elbows at roughly 45\u00b0, not flared to 90\u00b0."],
    commonMistakes: ["Letting the hips sag toward the floor.", "Only performing a partial range of motion.", "Flaring the elbows straight out to the sides."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Pull-up": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Biceps", "Upper Back"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    movementPattern: "Vertical Pull",
    instructions: ["Hang from a bar with an overhand grip, hands wider than shoulder-width.", "Start from a full dead hang.", "Pull yourself up until your chin clears the bar.", "Lower under control back to a full hang."],
    formTips: ["Full range of motion \u2014 from a dead hang to chin over the bar \u2014 builds real strength.", "Avoid kipping/swinging unless training that specifically.", "Keep your core engaged to limit swinging."],
    commonMistakes: ["Using momentum/kipping instead of a controlled pull.", "Only performing partial reps.", "Not fully extending the arms at the bottom."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Chin-up": {
    primaryMuscle: "Biceps",
    secondaryMuscles: ["Lats", "Forearms"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    movementPattern: "Vertical Pull",
    instructions: ["Hang from a bar with an underhand, shoulder-width grip.", "Start from a full dead hang.", "Pull yourself up until your chin clears the bar, keeping elbows close to your body.", "Lower under control back to a full hang."],
    formTips: ["The underhand grip lets biceps assist more than a pull-up \u2014 still aim for full range.", "Avoid swinging to generate momentum.", "Keep your shoulders down and back rather than shrugged up."],
    commonMistakes: ["Using momentum instead of a controlled pull.", "Partial range of motion.", "Shrugging the shoulders up toward the ears."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Dip": {
    primaryMuscle: "Triceps",
    secondaryMuscles: ["Chest", "Anterior Deltoids"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    movementPattern: "Vertical Push",
    instructions: ["Support yourself on parallel bars with arms extended.", "Lower your body by bending your elbows, leaning slightly forward for more chest emphasis.", "Descend until your shoulders are roughly level with your elbows.", "Press back up to full arm extension."],
    formTips: ["A more upright torso emphasizes triceps; leaning forward emphasizes chest.", "Control the descent rather than dropping.", "Avoid going so deep that it strains the shoulders."],
    commonMistakes: ["Descending too deep, stressing the shoulder joint.", "Using momentum/bouncing at the bottom.", "Flaring the elbows out excessively."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Plank": {
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Shoulders", "Glutes"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Isometric Core",
    instructions: ["Support yourself on your forearms and toes, elbows under your shoulders.", "Keep your body in a straight line from head to heels.", "Brace your core and squeeze your glutes.", "Hold the position for time without letting your hips sag or pike."],
    formTips: ["A straight line from head to heels is the goal \u2014 check yourself in a mirror if possible.", "Breathe normally throughout; don't hold your breath.", "Squeeze your glutes to help maintain the line."],
    commonMistakes: ["Letting the hips sag toward the floor.", "Piking the hips up too high.", "Holding your breath instead of breathing normally."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Sit-up": {
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Hip Flexors"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Trunk Flexion",
    instructions: ["Lie on your back with knees bent, feet flat, hands lightly behind your head or crossed on your chest.", "Curl your torso up off the floor, leading with your chest.", "Continue until your torso is roughly upright.", "Lower back down under control."],
    formTips: ["Curl up through the spine rather than yanking with your neck.", "Keep your feet planted or anchored for stability.", "Control the descent instead of dropping."],
    commonMistakes: ["Pulling on the neck with your hands.", "Using momentum/swinging the arms to get up.", "Only performing a small partial range."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Air Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Squat",
    instructions: ["Stand with feet shoulder-width, toes slightly turned out.", "Push your hips back and bend your knees to descend.", "Lower until your thighs are at least parallel to the floor.", "Drive through your whole foot to stand back up."],
    formTips: ["Keep your chest up and weight balanced through your whole foot.", "Track your knees in line with your toes.", "Descend under control rather than dropping."],
    commonMistakes: ["Letting the knees cave inward.", "Rising onto the toes.", "Only squatting to a shallow depth."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Burpee": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Chest", "Quadriceps", "Shoulders", "Core"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    movementPattern: "Full Body",
    instructions: ["Start standing, then drop into a squat and place your hands on the floor.", "Kick your feet back into a plank position.", "Perform a push-up (or just lower your chest), then jump your feet back to your hands.", "Explosively jump up, reaching your arms overhead."],
    formTips: ["Keep your core braced through the plank/push-up phase to protect your lower back.", "Land the jumps softly, bending your knees to absorb impact.", "Pace yourself \u2014 burpees fatigue fast under high volume."],
    commonMistakes: ["Letting the hips sag during the plank phase.", "Landing stiff-legged from the jumps.", "Rushing the form as fatigue sets in, especially the hand placement."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Mountain Climbers": {
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Hip Flexors", "Shoulders"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Core/Cardio",
    instructions: ["Start in a plank position, hands under your shoulders.", "Drive one knee toward your chest, then quickly switch legs.", "Continue alternating at a controlled or fast pace depending on the goal.", "Keep your hips low and core braced throughout."],
    formTips: ["Keep your hips level \u2014 don't let them pike up as you speed up.", "Land lightly on the balls of your feet.", "Keep your core braced the entire time."],
    commonMistakes: ["Hips rising up (piking) as speed increases.", "Letting the lower back sag.", "Losing hand placement under the shoulders."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Pistol Squat": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Core", "Hamstrings"],
    equipment: "Bodyweight",
    difficulty: "Advanced",
    movementPattern: "Squat",
    instructions: ["Stand on one leg, extending the other leg straight out in front of you.", "Lower yourself down on the standing leg, keeping the extended leg off the floor.", "Descend as deep as your mobility and strength allow, ideally to full depth.", "Drive back up through the standing leg to full extension."],
    formTips: ["Build up with assisted or partial-range versions before attempting full pistols.", "Keep your extended leg elevated and under control throughout.", "Use your arms for counterbalance as needed."],
    commonMistakes: ["Losing balance and putting the extended foot down early.", "Rounding the back to compensate for limited ankle mobility.", "Attempting full depth before building the requisite strength."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Glute Bridge": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Core"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Hip Extension",
    instructions: ["Lie on your back with knees bent, feet flat, hip-width apart.", "Brace your core and drive through your heels to lift your hips.", "Extend your hips until your body forms a straight line from shoulders to knees.", "Squeeze your glutes at the top, then lower under control."],
    formTips: ["Drive through your heels, not your toes.", "Squeeze and pause at the top of every rep.", "Avoid overextending the lower back at the top."],
    commonMistakes: ["Overextending the lower back instead of stopping at hip extension.", "Pushing through the toes rather than the heels.", "Rushing through reps without a top squeeze."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Dead Bug": {
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Hip Flexors"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Anti-Extension Core",
    instructions: ["Lie on your back with arms extended toward the ceiling, knees bent at 90\u00b0 over your hips.", "Brace your core to flatten your lower back into the floor.", "Slowly extend one arm overhead and the opposite leg out straight, keeping your back flat.", "Return to the start and repeat on the other side."],
    formTips: ["Keep your lower back pressed into the floor throughout \u2014 that's the whole point of the drill.", "Move slowly and with control, not for speed.", "Only extend as far as you can while keeping the back flat."],
    commonMistakes: ["Letting the lower back arch off the floor as the limb extends.", "Moving too fast to maintain control.", "Extending further than your core control allows."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Outdoor Running": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Hamstrings", "Calves"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Warm up with 5\u201310 minutes of easy walking or light jogging.", "Settle into a sustainable pace with a relaxed upper body and steady breathing.", "Land with your foot roughly under your hips, not far out in front.", "Cool down with a few minutes of walking to bring your heart rate down gradually."],
    formTips: ["Keep your shoulders relaxed and arms swinging naturally, not tensed up.", "Breathe rhythmically \u2014 find a pattern that matches your effort level.", "Increase weekly mileage gradually to avoid overuse injuries."],
    commonMistakes: ["Overstriding, landing with the foot far ahead of the hips.", "Ramping up mileage too quickly.", "Ignoring persistent joint pain instead of adjusting the plan."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Cat-Cow Stretch": {
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Lower Back"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Spinal Mobility",
    instructions: ["Start on hands and knees, wrists under shoulders, knees under hips.", "Inhale as you drop your belly and lift your chest and tailbone (cow).", "Exhale as you round your spine, tucking your chin and tailbone (cat).", "Continue flowing between the two positions with your breath."],
    formTips: ["Move slowly and let your breath drive the pace.", "Move through your whole spine, not just your lower back.", "Keep the movement pain-free \u2014 this should feel good, not strained."],
    commonMistakes: ["Rushing through the movement instead of syncing it with breath.", "Only moving the lower back, ignoring the upper spine.", "Forcing range of motion into discomfort."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Bear Crawl": {
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Shoulders", "Quadriceps"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    movementPattern: "Full Body",
    instructions: ["Start on hands and feet, knees hovering an inch off the floor, back flat.", "Move your opposite hand and foot forward together.", "Keep your hips low and core braced throughout.", "Continue crawling forward with controlled, even steps."],
    formTips: ["Keep your hips at a consistent, low height \u2014 don't let them rise up.", "Move opposite hand and foot together for a stable crawl pattern.", "Keep your core braced to prevent your lower back from sagging."],
    commonMistakes: ["Hips rising too high, turning it into a downward-dog walk.", "Knees touching the floor between steps.", "Rushing the pace at the expense of control."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Broad Jump": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Quadriceps", "Hamstrings", "Calves"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    movementPattern: "Plyometric",
    instructions: ["Stand with feet shoulder-width, arms back to load the jump.", "Swing your arms forward and jump as far forward as possible.", "Land softly with bent knees, absorbing the impact.", "Stabilize fully before resetting for the next jump."],
    formTips: ["Land with soft knees to absorb force \u2014 never land stiff-legged.", "Reset fully between reps if training for max distance.", "Use your arms actively to add momentum to the jump."],
    commonMistakes: ["Landing stiff-legged, which stresses the knees and lower back.", "Chaining jumps without resetting when max distance is the goal.", "Not using the arm swing to help drive the jump."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Treadmill": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Hamstrings", "Calves"],
    equipment: "Cardio Machine",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Start the belt at an easy walking pace to warm up.", "Gradually increase speed to your target pace.", "Maintain an upright posture, avoiding holding onto the handrails.", "Cool down by reducing speed gradually over the last few minutes."],
    formTips: ["Avoid gripping the handrails during running \u2014 it changes your natural gait and reduces the workout.", "Match incline settings to your goal \u2014 flat for speed work, incline for hill-simulation.", "Keep your stride natural rather than overstriding to match the belt."],
    commonMistakes: ["Holding the handrails throughout the run.", "Starting at too high a speed without warming up.", "Ignoring the belt's momentum and overstriding."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Rowing Machine": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Lats", "Hamstrings", "Quadriceps", "Core"],
    equipment: "Cardio Machine",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Strap your feet in and grip the handle with an overhand grip.", "Drive with your legs first, then lean back slightly, then pull the handle to your lower ribs.", "Reverse the sequence: arms out, lean forward, then bend your knees to slide back up.", "Repeat in a smooth, continuous rhythm."],
    formTips: ["The sequence is legs, then back, then arms on the drive \u2014 and the reverse on the recovery.", "Most of the power should come from your legs, not your arms.", "Keep the recovery phase slightly slower than the drive."],
    commonMistakes: ["Pulling with the arms before the legs finish driving.", "Rounding the lower back during the pull.", "Rushing the recovery phase, which wastes energy."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Ski Erg": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Lats", "Triceps", "Core"],
    equipment: "Cardio Machine",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Stand facing the machine, gripping the handles overhead.", "Hinge at the hips and pull the handles down and back, engaging your lats and core.", "Follow through until your arms are by your hips.", "Return to the starting position under control and repeat."],
    formTips: ["Drive the pull from your core and hips, not just your arms.", "Keep a slight bend in the knees throughout for a stable base.", "Maintain a consistent rhythm rather than rushing individual pulls."],
    commonMistakes: ["Pulling with just the arms, ignoring the hip hinge.", "Standing too upright without engaging the core.", "Losing rhythm and rushing under fatigue."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Assault Bike": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Shoulders", "Core"],
    equipment: "Cardio Machine",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Sit with a slight bend in your knees at full pedal extension.", "Push and pull the handles in sync with your pedaling for full-body effort.", "Maintain a pace appropriate to your interval or steady-state goal.", "Keep your core braced throughout, especially at higher intensities."],
    formTips: ["Use your arms actively \u2014 pushing and pulling the handles adds real work, not just leg pedaling.", "Set the seat height so your knee has a slight bend at full extension.", "Pace hard efforts deliberately; the fan resistance scales with your own effort."],
    commonMistakes: ["Only pedaling and letting the arms go along for the ride.", "Starting an interval too hard and fading badly.", "Incorrect seat height causing knee strain."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Stationary Bike": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Hamstrings", "Calves"],
    equipment: "Cardio Machine",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Adjust the seat height so your knee has a slight bend at the bottom of the pedal stroke.", "Start pedaling at an easy resistance to warm up.", "Increase resistance or cadence to match your target intensity.", "Cool down with a few minutes of easy pedaling."],
    formTips: ["Correct seat height protects your knees \u2014 too low or too high both cause problems.", "Keep your upper body relaxed rather than gripping the handlebars tensely.", "Match resistance and cadence to your actual training goal (endurance vs. power)."],
    commonMistakes: ["Seat set too low, causing excess knee flexion and strain.", "Gripping the handlebars with tense shoulders.", "Spinning with no resistance, which under-trains the muscles."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Running": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Hamstrings", "Calves"],
    equipment: "Cardio Outdoor",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Warm up with a few minutes of easy walking or jogging.", "Settle into your target pace with relaxed shoulders and a steady breathing rhythm.", "Land with your foot roughly under your hips.", "Cool down gradually rather than stopping abruptly."],
    formTips: ["Keep your cadence relatively quick and light rather than long, heavy strides.", "Breathe rhythmically, matching your pattern to your effort.", "Increase distance/intensity gradually to avoid overuse injuries."],
    commonMistakes: ["Overstriding, landing with the foot far ahead of the body.", "Increasing mileage too quickly.", "Ignoring form as fatigue sets in late in a run."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Cycling": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Hamstrings", "Calves"],
    equipment: "Cardio Outdoor",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Adjust your seat height so your knee has a slight bend at the bottom of the pedal stroke.", "Start with an easy warm-up spin.", "Maintain a smooth, circular pedal stroke rather than just stomping down.", "Cool down with easy pedaling before stopping."],
    formTips: ["A smooth, circular pedal stroke is more efficient than just pushing down hard.", "Keep your upper body relaxed, especially your grip on the handlebars.", "Match gearing to terrain to maintain a consistent, sustainable cadence."],
    commonMistakes: ["Seat height too low, straining the knees.", "Mashing the pedals instead of a smooth stroke.", "Ignoring gear changes and grinding at too low a cadence."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Swimming": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Lats", "Shoulders", "Core"],
    equipment: "Cardio Outdoor",
    difficulty: "Intermediate",
    movementPattern: "Cardio",
    instructions: ["Warm up with a few easy, relaxed laps.", "Focus on a long, streamlined body position with minimal drag.", "Coordinate your breathing with your stroke rhythm rather than holding your breath.", "Cool down with easy laps to bring your heart rate down gradually."],
    formTips: ["A long, straight body position reduces drag more than most people expect.", "Exhale underwater steadily rather than holding your breath and gasping on each breath.", "Technique work pays off more than just swimming harder with poor form."],
    commonMistakes: ["Holding the breath and gasping instead of steady exhaling underwater.", "Lifting the head too high to breathe, which sinks the hips.", "Neglecting technique work in favor of pure distance."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Walking": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Calves", "Glutes"],
    equipment: "Cardio Outdoor",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Stand tall with relaxed shoulders.", "Walk at a pace that lets you maintain a conversation, or faster for a brisk-walk goal.", "Let your arms swing naturally at your sides.", "Maintain the pace consistently for your target duration or distance."],
    formTips: ["A brisk pace with purposeful arm swing meaningfully increases the training effect.", "Keep your posture tall rather than hunching forward.", "Consistency matters more than occasional long walks \u2014 build a regular habit."],
    commonMistakes: ["Hunching forward, especially when looking at a phone.", "Walking so slowly it provides minimal cardiovascular benefit for a fitness goal.", "Ignoring proper footwear for longer walks."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Jump Rope": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Calves", "Shoulders", "Core"],
    equipment: "Cardio Outdoor",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Hold the rope handles at hip height, rope behind your heels.", "Swing the rope over your head using your wrists, not your whole arms.", "Jump just high enough to clear the rope, landing softly on the balls of your feet.", "Maintain a steady rhythm for your target duration."],
    formTips: ["Turn the rope with your wrists, not big arm circles.", "Keep jumps small and low \u2014 you only need to clear the rope.", "Land softly on the balls of your feet to reduce impact."],
    commonMistakes: ["Jumping too high, which wastes energy and increases impact.", "Turning the rope with the whole arm instead of the wrists.", "Landing flat-footed instead of on the balls of the feet."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Sled Push": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Calves", "Core"],
    equipment: "Hyrox Station",
    difficulty: "Intermediate",
    movementPattern: "Push",
    instructions: ["Load the sled to your target weight and get into a low push position, arms extended.", "Drive forward with short, powerful steps, staying low with a flat back.", "Keep your arms locked and push through your legs, not your upper body.", "Maintain the drive for the full distance without standing up early."],
    formTips: ["Stay low throughout \u2014 standing up early shifts the work away from your legs.", "Take short, punchy steps rather than long strides.", "Keep your core braced to protect your lower back in the leaned-over position."],
    commonMistakes: ["Standing too upright, turning it into an arm-pushing exercise.", "Overstriding, which reduces power transfer.", "Losing the flat-back position under fatigue."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Sled Pull": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Biceps", "Traps", "Core"],
    equipment: "Hyrox Station",
    difficulty: "Intermediate",
    movementPattern: "Pull",
    instructions: ["Attach a rope or strap to the sled and face it, feet set for a strong pulling stance.", "Pull hand-over-hand, leaning back slightly to use your body weight.", "Keep your core braced and back flat throughout the pull.", "Continue until the sled reaches the target distance."],
    formTips: ["Use your legs to help drive the lean-back on each pull, not just your arms.", "Keep a consistent rhythm rather than yanking erratically.", "Brace your core to protect your lower back."],
    commonMistakes: ["Pulling with the arms alone, ignoring the legs and body weight.", "Rounding the lower back during the pull.", "Losing rhythm and rushing under fatigue."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Sandbag Lunges": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    equipment: "Hyrox Station",
    difficulty: "Intermediate",
    movementPattern: "Lunge",
    instructions: ["Load the sandbag across your shoulders or hug it to your chest.", "Step forward into a lunge, lowering until both knees are near 90\u00b0.", "Push off the front foot to bring the back leg through into the next lunge.", "Continue for the target distance, alternating legs."],
    formTips: ["Keep your torso upright despite the awkward, shifting load of the bag.", "Take a stride length that keeps your front knee roughly over your ankle.", "Brace your core hard \u2014 the sandbag's instability demands it."],
    commonMistakes: ["Letting the torso lean forward under the awkward load.", "Taking too short a stride, driving the knee past the toes.", "Losing core tension as fatigue sets in."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Wall Balls": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Shoulders", "Core"],
    equipment: "Hyrox Station",
    difficulty: "Intermediate",
    movementPattern: "Squat/Push",
    instructions: ["Hold the ball at your chest, standing a couple feet from the wall.", "Squat down until your thighs are at least parallel to the floor.", "Drive up explosively, extending through your legs and throwing the ball to the target on the wall.", "Catch the ball as it comes down and immediately descend into the next rep."],
    formTips: ["Use your legs to generate power for the throw, not just your arms.", "Hit consistent squat depth every rep, not just when it's easy.", "Catch the ball with soft hands, absorbing it into the next squat."],
    commonMistakes: ["Squatting to a shallow depth as fatigue sets in.", "Throwing mostly with the arms instead of leg drive.", "Standing fully upright between reps instead of staying in rhythm."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Burpee Broad Jumps": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Quadriceps", "Chest", "Shoulders", "Core"],
    equipment: "Hyrox Station",
    difficulty: "Intermediate",
    movementPattern: "Full Body",
    instructions: ["Perform a burpee: squat down, kick back to a plank, chest to the floor, then feet back to hands.", "Instead of a vertical jump, explode forward into a broad jump.", "Land softly with bent knees, then immediately go into the next burpee.", "Repeat for the target distance."],
    formTips: ["Land the broad jump with soft knees to absorb the impact before the next rep.", "Keep the burpee's plank/push-up phase controlled, not sloppy.", "Find a sustainable rhythm rather than sprinting the first few and collapsing."],
    commonMistakes: ["Landing stiff-legged from the broad jump.", "Letting the hips sag during the plank phase.", "Going out too fast and fading badly."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Farmer's Carry (station)": {
    primaryMuscle: "Forearms",
    secondaryMuscles: ["Traps", "Core", "Glutes"],
    equipment: "Hyrox Station",
    difficulty: "Beginner",
    movementPattern: "Carry",
    instructions: ["Pick up a heavy kettlebell or handle in each hand, standing tall.", "Brace your core and keep your shoulders pulled back.", "Walk forward with controlled, even steps at race pace.", "Set the weights down under control at the end of the distance."],
    formTips: ["Keep your chest up throughout \u2014 don't let your shoulders round forward as grip fatigues.", "Take normal-length, quick steps rather than shuffling.", "Grip hard through the whole carry; regripping mid-carry costs time."],
    commonMistakes: ["Shoulders rounding forward as grip fatigues.", "Shuffling with overly short steps.", "Setting the weight down and re-starting instead of maintaining pace."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Rowing (station)": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Lats", "Hamstrings", "Quadriceps", "Core"],
    equipment: "Hyrox Station",
    difficulty: "Intermediate",
    movementPattern: "Cardio",
    instructions: ["Strap your feet in and grip the handle with an overhand grip.", "Drive with your legs first, then lean back slightly, then pull the handle to your lower ribs.", "Reverse the sequence on the recovery: arms out, lean forward, then bend your knees.", "Hold your target pace for the full station distance."],
    formTips: ["Legs-back-arms on the drive, and the reverse on the recovery \u2014 that sequence is the whole technique.", "Most of the power comes from your legs, not your arms.", "Pace evenly rather than starting too hard and fading."],
    commonMistakes: ["Pulling with the arms before the legs finish driving.", "Starting too fast and fading badly over the distance.", "Rounding the lower back under fatigue."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "SkiErg": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Triceps", "Core"],
    equipment: "Hyrox Station",
    difficulty: "Intermediate",
    movementPattern: "Cardio",
    instructions: ["Stand facing the machine, gripping the handles overhead.", "Hinge at the hips and pull the handles down and back, engaging your lats and core.", "Follow through until your arms are by your hips.", "Return to the start under control and repeat at your target pace."],
    formTips: ["Drive the pull from your hips and core, not just your arms.", "Keep a slight knee bend throughout for a stable base.", "Pace evenly across the full distance rather than starting too hard."],
    commonMistakes: ["Pulling with the arms alone, ignoring the hip hinge.", "Standing too upright without engaging the core.", "Starting too fast and fading badly."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Hip Flexor Stretch": {
    primaryMuscle: "Mobility",
    secondaryMuscles: ["Quadriceps"],
    equipment: "Mobility / Stretch",
    difficulty: "Beginner",
    movementPattern: "Static Stretch",
    instructions: ["Kneel on one knee with the other foot planted in front, both at roughly 90\u00b0.", "Keep your torso upright and gently push your hips forward.", "Hold the stretch, feeling it through the front of the hip of the kneeling leg.", "Switch sides after holding for your target time."],
    formTips: ["Keep your torso tall rather than leaning forward, which reduces the stretch.", "Squeeze the glute on the kneeling side for a deeper stretch.", "Move into the stretch gradually rather than forcing it."],
    commonMistakes: ["Leaning the torso forward instead of driving the hips forward.", "Arching the lower back excessively to fake more range.", "Forcing the stretch into sharp pain rather than a comfortable pull."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Couch Stretch": {
    primaryMuscle: "Mobility",
    secondaryMuscles: ["Quadriceps", "Hip Flexors"],
    equipment: "Mobility / Stretch",
    difficulty: "Intermediate",
    movementPattern: "Static Stretch",
    instructions: ["Kneel in front of a couch or bench, back foot resting up against it, shin vertical.", "Keep your torso upright and front foot planted for balance.", "Gently squeeze the glute of the back leg to deepen the hip flexor stretch.", "Hold, then switch sides."],
    formTips: ["Keep your torso as upright as possible \u2014 leaning forward reduces the stretch.", "Ease into the position gradually if it's new to you.", "A slight forward pelvic tilt increases the stretch intensity."],
    commonMistakes: ["Leaning forward instead of staying upright.", "Forcing the back knee into the corner too aggressively for your current mobility.", "Holding your breath instead of breathing through the stretch."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Thoracic Rotation": {
    primaryMuscle: "Mobility",
    secondaryMuscles: ["Lower Back"],
    equipment: "Mobility / Stretch",
    difficulty: "Beginner",
    movementPattern: "Rotational Mobility",
    instructions: ["Start on hands and knees, one hand behind your head.", "Rotate your elbow up toward the ceiling, following it with your eyes.", "Rotate back down, threading your elbow under your torso toward the opposite side.", "Continue the controlled rotation for your target reps, then switch sides."],
    formTips: ["Keep the rotation coming from your upper back, not your lower back or hips.", "Move slowly and with control rather than swinging.", "Follow the movement with your eyes to encourage full rotation."],
    commonMistakes: ["Rotating from the lower back/hips instead of the thoracic spine.", "Moving too fast to get any real mobility benefit.", "Limiting the range out of habit rather than actual restriction."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Shoulder Dislocate": {
    primaryMuscle: "Mobility",
    secondaryMuscles: ["Chest"],
    equipment: "Mobility / Stretch",
    difficulty: "Beginner",
    movementPattern: "Shoulder Mobility",
    instructions: ["Hold a light stick, band, or towel with a wide, overhand grip.", "Keeping your arms straight, raise the stick overhead and continue behind your back.", "Reverse the motion back to the front.", "Narrow your grip slightly over time as mobility improves."],
    formTips: ["Use a wide enough grip that the movement stays pain-free.", "Keep your arms as straight as comfortably possible throughout.", "Progress by narrowing the grip gradually, not by forcing a narrow grip immediately."],
    commonMistakes: ["Using too narrow a grip, causing shoulder impingement.", "Bending the elbows to fake more range.", "Forcing through pain instead of stopping at a comfortable stretch."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Hamstring Stretch": {
    primaryMuscle: "Mobility",
    secondaryMuscles: ["Lower Back"],
    equipment: "Mobility / Stretch",
    difficulty: "Beginner",
    movementPattern: "Static Stretch",
    instructions: ["Sit or stand with one leg extended in front of you, foot flexed.", "Hinge forward from your hips, keeping your back relatively flat.", "Reach toward your toes until you feel a stretch through the back of your thigh.", "Hold, then switch legs."],
    formTips: ["Hinge from the hips rather than rounding through the lower back.", "Keep the front leg's knee only slightly bent if needed, not locked.", "Ease into the stretch gradually rather than bouncing."],
    commonMistakes: ["Rounding the lower back to reach further.", "Bouncing in and out of the stretch instead of holding steady.", "Forcing the stretch into sharp pain."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Calf Stretch": {
    primaryMuscle: "Mobility",
    secondaryMuscles: ["Ankles"],
    equipment: "Mobility / Stretch",
    difficulty: "Beginner",
    movementPattern: "Static Stretch",
    instructions: ["Stand facing a wall, one foot forward and one foot back, both pointing forward.", "Keep your back leg straight and heel planted on the floor.", "Lean into the wall, feeling a stretch through your back calf.", "Hold, then switch legs."],
    formTips: ["Keep the back heel planted throughout \u2014 that's what creates the stretch.", "Keep the back leg's knee straight for the gastrocnemius; bend it slightly to target the soleus lower down.", "Ease into the stretch rather than forcing it."],
    commonMistakes: ["Letting the back heel lift off the floor.", "Only ever stretching with a straight leg, missing the soleus.", "Rushing through without holding long enough to get a real benefit."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Deep Squat Hold": {
    primaryMuscle: "Mobility",
    secondaryMuscles: ["Quadriceps", "Hip Flexors", "Ankles"],
    equipment: "Mobility / Stretch",
    difficulty: "Beginner",
    movementPattern: "Static Stretch",
    instructions: ["Stand with feet shoulder-width, toes slightly out.", "Squat down as deep as you comfortably can, aiming for hips below knees.", "Rest your elbows against the inside of your knees, gently pressing them out.", "Hold the position, breathing steadily, working to keep your heels down."],
    formTips: ["Keep your heels planted \u2014 this is often the limiting factor for most people.", "Use your elbows to gently open your knees rather than forcing your hips down.", "Breathe steadily rather than holding your breath through discomfort."],
    commonMistakes: ["Letting the heels lift off the floor.", "Forcing depth by rounding the lower back.", "Holding the breath instead of breathing through the position."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Child's Pose": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Lower Back", "Hips"],
    equipment: "Mobility / Stretch",
    difficulty: "Beginner",
    movementPattern: "Static Stretch",
    instructions: ["Kneel on the floor, big toes touching, knees spread comfortably wide.", "Sit your hips back toward your heels.", "Extend your arms forward on the floor, lowering your chest toward the ground.", "Hold, breathing deeply into your lower back and sides."],
    formTips: ["Let gravity do the work \u2014 relax into the position rather than actively pushing.", "Adjust knee width to find a comfortable stretch through the hips and back.", "Breathe deeply, especially into your lower back and ribs."],
    commonMistakes: ["Actively straining instead of relaxing into the stretch.", "Holding the breath instead of breathing deeply.", "Forcing the chest down further than is comfortable."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Kettlebell Swing": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Core", "Shoulders"],
    equipment: "Kettlebell",
    difficulty: "Intermediate",
    movementPattern: "Hip Hinge",
    instructions: ["Stand with feet shoulder-width, kettlebell on the floor slightly in front of you.", "Hinge at the hips to grip the bell, then hike it back between your legs.", "Explosively extend your hips to swing the bell up to chest height.", "Let the bell swing back down naturally into the next hip hinge."],
    formTips: ["This is a hip-hinge power movement, not a squat or a shoulder raise.", "The power comes from an explosive hip extension, not the arms lifting the bell.", "Keep your back flat throughout \u2014 a rounded back under the hike is a real injury risk."],
    commonMistakes: ["Squatting the movement instead of hinging at the hips.", "Using the arms to lift the bell instead of hip drive.", "Rounding the back during the backswing."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Turkish Get-Up": {
    primaryMuscle: "Cardio",
    secondaryMuscles: ["Shoulders", "Core", "Glutes"],
    equipment: "Kettlebell",
    difficulty: "Advanced",
    movementPattern: "Full Body",
    instructions: ["Lie on your back holding a kettlebell overhead in one hand, arm locked out.", "Roll onto your opposite elbow, then push up onto your hand.", "Sweep your leg through and rise to a half-kneeling position, then stand up.", "Reverse the entire sequence with control to return to the floor."],
    formTips: ["This is a slow, technical movement \u2014 learn it bodyweight or with a light load first.", "Keep your eyes on the kettlebell throughout the entire sequence.", "Move deliberately through each checkpoint rather than rushing."],
    commonMistakes: ["Rushing through checkpoints instead of controlling each phase.", "Losing sight of the kettlebell during the transitions.", "Using too much weight before the pattern is fully grooved."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Kettlebell Clean": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Traps", "Forearms"],
    equipment: "Kettlebell",
    difficulty: "Intermediate",
    movementPattern: "Olympic",
    instructions: ["Start with the kettlebell on the floor between your feet, similar to a swing setup.", "Hike the bell back, then explosively extend your hips to drive it upward.", "Guide the bell close to your body as it rises, catching it in the rack position at your shoulder.", "Lower back down under control, guiding the bell rather than letting it crash."],
    formTips: ["Keep the bell close to your body throughout the pull to avoid it crashing into your forearm.", "The power comes from hip extension, similar to a swing.", "Relax your grip slightly as the bell rotates into the rack to avoid banging your wrist."],
    commonMistakes: ["Letting the bell swing out away from the body, causing it to crash on the catch.", "Muscling the bell up with the arm instead of hip drive.", "Gripping too tight through the rotation, causing wrist strain."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Kettlebell Snatch": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Shoulders", "Hamstrings", "Core"],
    equipment: "Kettlebell",
    difficulty: "Advanced",
    movementPattern: "Olympic",
    instructions: ["Start with the kettlebell between your feet as in a swing setup.", "Hike the bell back, then explosively extend your hips to send it upward.", "Guide the bell overhead in one fluid motion, punching your hand through as it arrives.", "Lower back down under control through the same path."],
    formTips: ["Build this from a solid swing and clean first \u2014 the snatch adds a further overhead punch.", "Keep the bell close on the way up to avoid it looping out and crashing on your forearm.", "Let your hips do the work; the arm just guides the bell."],
    commonMistakes: ["Muscling the bell up with the shoulder instead of hip power.", "Letting the bell crash onto the forearm at the top.", "Attempting heavy loads before the technique is consistent."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Battle Rope Alternating Waves": {
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Core", "Forearms"],
    equipment: "Conditioning",
    difficulty: "Beginner",
    movementPattern: "Cardio",
    instructions: ["Stand with feet shoulder-width, holding one rope end in each hand, slight bend in the knees.", "Brace your core and alternately whip each arm up and down, creating waves through the ropes.", "Maintain a consistent rhythm and wave size for your target duration.", "Keep your knees soft throughout to absorb the movement."],
    formTips: ["Drive the movement from your shoulders and core, not just your wrists.", "Keep a slight knee bend and stay light on your feet throughout.", "Maintain even wave size on both sides rather than favoring one arm."],
    commonMistakes: ["Standing too stiff-legged instead of staying athletic.", "Only using the wrists instead of the shoulders/core.", "Letting the wave size fade badly as fatigue sets in."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Medicine Ball Slam": {
    primaryMuscle: "Lats",
    secondaryMuscles: ["Shoulders", "Core"],
    equipment: "Conditioning",
    difficulty: "Beginner",
    movementPattern: "Full Body",
    instructions: ["Stand holding a medicine ball overhead with both hands, feet shoulder-width.", "Brace your core and forcefully slam the ball down to the floor in front of you.", "Let your hips and core drive the motion, following through into a slight squat.", "Pick the ball back up, resetting your stance, and repeat."],
    formTips: ["Drive the slam with your whole body \u2014 hips, core, and shoulders together.", "Follow through into the slam rather than just dropping the ball.", "Reset your stance fully between reps for consistent power."],
    commonMistakes: ["Slamming with just the arms, ignoring hip and core drive.", "Rounding the lower back excessively on the pick-up.", "Rushing the reset between reps, losing form."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Tire Flip": {
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Quadriceps", "Core"],
    equipment: "Conditioning",
    difficulty: "Intermediate",
    movementPattern: "Hip Hinge",
    instructions: ["Squat down and grip the underside of the tire with both hands.", "Drive through your legs and hips to lift the tire, keeping your back flat.", "Push through and flip the tire away from you once it passes vertical.", "Reset your stance and repeat for the target distance or reps."],
    formTips: ["Treat the lift-off like a deadlift \u2014 flat back, drive through the legs.", "Use your whole body to push through once the tire is past the balance point.", "Reset your grip and stance fully between flips."],
    commonMistakes: ["Rounding the back during the initial lift.", "Trying to muscle the tire over with the arms alone.", "Rushing the reset and losing a stable stance."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Box Jump": {
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Calves"],
    equipment: "Conditioning",
    difficulty: "Intermediate",
    movementPattern: "Plyometric",
    instructions: ["Stand facing the box with feet shoulder-width.", "Bend your knees and swing your arms back to load the jump.", "Explosively jump onto the box, landing softly with bent knees.", "Stand fully upright on the box before stepping (not jumping) back down."],
    formTips: ["Land softly with bent knees on top of the box, absorbing the impact.", "Step down rather than jumping down, to protect your joints from repetitive high-impact landings.", "Choose a box height you can clearly clear with good form, not just barely."],
    commonMistakes: ["Jumping back down off the box instead of stepping down.", "Landing with stiff legs on top of the box.", "Choosing too high a box and compromising landing mechanics."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  },
  "Medicine Ball Chest Pass": {
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders"],
    equipment: "Conditioning",
    difficulty: "Beginner",
    movementPattern: "Horizontal Push",
    instructions: ["Stand facing a wall or partner, holding the ball at chest height.", "Brace your core and explosively push the ball straight out from your chest.", "Follow through with your arms fully extending.", "Catch the return (or retrieve the ball) and reset for the next rep."],
    formTips: ["Drive the pass with a full-body push, not just your arms.", "Keep your core braced throughout for a stable base.", "Aim for a consistent target/height on every rep."],
    commonMistakes: ["Pushing with just the arms, no core/leg involvement.", "Losing balance on the follow-through.", "Inconsistent target height, making the drill less repeatable."],
    animationWebmUrl: null, animationMp4Url: null, thumbnailUrl: null, animationAvailable: false
  }
};

// Deterministic avatar colors per muscle bucket — used since no real exercise photos exist

export const MUSCLE_AVATAR_COLOR = {
  Chest:"#FF5A1F", Lats:"#4FA8D8", Traps:"#4FA8D8", Shoulders:"#F2A93B",
  Biceps:"#3ECF8E", Triceps:"#3ECF8E", Forearms:"#3ECF8E",
  Quadriceps:"#E85D75", Hamstrings:"#E85D75", Glutes:"#E85D75", Calves:"#E85D75", Abductors:"#E85D75", Adductors:"#E85D75",
  Abdominals:"#9B7EDE", Cardio:"#4FA8D8", Mobility:"#8B8B94"
};

export const MUSCLE_GROUP_COLOR = {
  Back:"var(--steel)", Chest:"var(--accent)", Legs:"#B08BF4", Core:"var(--mint)",
  Arms:"#FFB020", Shoulders:"#4FD8C4", Cardio:"var(--accent)", Mobility:"var(--muted)"
};

export const RACE_SEGMENTS = [
  {type:"run", name:"Run 1"}, {type:"station", name:"SkiErg", detail:"1000m"},
  {type:"run", name:"Run 2"}, {type:"station", name:"Sled Push", detail:"50m"},
  {type:"run", name:"Run 3"}, {type:"station", name:"Sled Pull", detail:"50m"},
  {type:"run", name:"Run 4"}, {type:"station", name:"Burpee Broad Jumps", detail:"80m"},
  {type:"run", name:"Run 5"}, {type:"station", name:"Row", detail:"1000m"},
  {type:"run", name:"Run 6"}, {type:"station", name:"Farmers Carry", detail:"200m"},
  {type:"run", name:"Run 7"}, {type:"station", name:"Sandbag Lunges", detail:"100m"},
  {type:"run", name:"Run 8"}, {type:"station", name:"Wall Balls", detail:"100 reps"}
];

export const REST_OPTIONS = [0,60,90,120,180];

export const RPE_OPTIONS = ["–","6","6.5","7","7.5","8","8.5","9","9.5","10"];

export const SET_TYPE_CYCLE = ["working","warmup","drop","failure"];

export const SET_TYPE_META = {
  working: { badge:"", color:"var(--muted)" },
  warmup:  { badge:"W", color:"var(--steel)" },
  drop:    { badge:"D", color:"var(--accent)" },
  failure: { badge:"F", color:"#ff6b6b" }
};

export const PLATE_SIZES = [25,20,15,10,5,2.5,1.25];

export const ACTIVITY_MULTIPLIERS = [
  {key:"bmr", label:"Basal Metabolic Rate (BMR)", mult:1},
  {key:"sedentary", label:"Little or no exercise", mult:1.2},
  {key:"light", label:"Exercise 1-3 times/week", mult:1.375},
  {key:"moderate", label:"Exercise 4-5 times/week", mult:1.465},
  {key:"active", label:"Daily exercise or intense 3-4x/week", mult:1.55},
  {key:"veryactive", label:"Intense exercise 6-7 times/week", mult:1.725},
  {key:"extra", label:"Very intense daily, or physical job", mult:1.9}
];

export const CALCULATORS = [
  {key:"bmr", label:"BMR"},
  {key:"calorie", label:"Calories / TDEE (with goal)"},
  {key:"protein", label:"Protein Intake"},
  {key:"carbs", label:"Carbohydrate Intake"},
  {key:"fat", label:"Fat Intake"},
  {key:"lbm", label:"Lean Body Mass"},
  {key:"ideal", label:"Ideal Weight"},
  {key:"bodyfat", label:"Body Fat %"},
  {key:"bodytype", label:"Body Type (Shape)"},
  {key:"hr", label:"Heart Rate Zones"}
];

export const GOAL_OPTIONS = [
  {label:"Maintain weight", delta:0},
  {label:"Mild loss — 0.25 kg/week", delta:-275},
  {label:"Loss — 0.5 kg/week", delta:-550},
  {label:"Extreme loss — 1 kg/week", delta:-1100},
  {label:"Mild gain — 0.25 kg/week", delta:275},
  {label:"Gain — 0.5 kg/week", delta:550},
  {label:"Extreme gain — 1 kg/week", delta:1100}
];

export const ACTIVITY_KCAL_PER_MIN = 8; // rough estimate for mixed strength/conditioning work

export const MEALS = ["Breakfast","Morning Snack","Lunch","Evening Snack","Dinner"];
// Default share of daily calories per meal (matches typical 25/12.5/25/12.5/25 split)

export const MEAL_SHARE = {"Breakfast":0.25,"Morning Snack":0.125,"Lunch":0.25,"Evening Snack":0.125,"Dinner":0.25};

export const HYROX_EXPERIENCE_OPTIONS = [
  {key:"first-timer", label:"Never raced Hyrox"},
  {key:"some-experience", label:"Raced 1–2 times"},
  {key:"experienced", label:"Raced multiple times"}
];

export const EQUIPMENT_OPTIONS = ["Barbell","Dumbbell","Machines","Sled","Rower","Ski Erg","Kettlebell","Bodyweight Only"];

export const ICONS = {
  plan:'<path d="M6.5 6.5h11v11h-11z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3v4M16 3v4M6.5 10h11" stroke="currentColor" stroke-width="2" fill="none"/>',
  workout:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8l6 4-6 4z" fill="currentColor"/>',
  library:'<path d="M5 4h9a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 4h1a2 2 0 0 1 2 2v14h-3" fill="none" stroke="currentColor" stroke-width="2"/>',
  body:'<circle cx="12" cy="5" r="2.2" fill="currentColor"/><path d="M12 8v7M8 11h8M9 20l3-5 3 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  nutrition:'<path d="M12 21c-4 0-7-4-7-9a6 6 0 0 1 7-6 6 6 0 0 1 7 6c0 5-3 9-7 9z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6c0-2 1.5-3.5 3-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  progress:'<path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  check:'<path d="M4 12l5 5L20 6" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  x:'<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  plus:'<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  gear:'<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  home:'<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  more:'<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>',
  chevronUp:'<path d="M6 15l6-6 6 6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  chevronDown:'<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  moreVert:'<circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/>',
  link:'<path d="M9 15l6-6M8 13l-2 2a3 3 0 004 4l2-2M16 11l2-2a3 3 0 00-4-4l-2 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  swap:'<path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 20l-4-4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  book:'<path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 16.5v-12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 16.5A2.5 2.5 0 016.5 19H20" fill="none" stroke="currentColor" stroke-width="2"/>',
  trend:'<path d="M4 15l5-5 4 4 7-8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 6h5v5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
};
