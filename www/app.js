/* =========================================================
   CONSTANTS — pure static data: exercise library, HYROX plan structure,
   icons, set-type/RPE/rest options, calculators, nutrition defaults, and
   schema/backup key lists. No functions with logic live here on purpose,
   so this file never needs to import anything.
========================================================= */

const SCHEMA_VERSION = 1; // bump when localStorage shape changes; add a migrate() step below

/* ---------- Storage ---------- */

const ALL_DATA_KEYS = ["hx_completed","hx_active_week","hx_active_level","hx_profile","hx_nutrition","hx_bodylog","hx_custom_exercises",
  "hx_workout_log","hx_food_log","hx_routines","hx_calc","hx_settings","hx_rest_duration","hx_active_session","hx_prs","hx_onboarding_complete","hx_achievements","hx_favorite_foods","hx_water_log","hx_race_log","hx_race_active","hx_tab","hx_schema_version"];

const SET_TYPE_IMPORT_MAP = { normal:"working", warmup:"warmup", dropset:"drop", failure:"failure" };

/* "10 Jul 2026, 11:53" -> timestamp (ms), or null if unparseable */

const PHASE_LABEL = {base:"BASE — FORM FIRST", build:"BUILD — ADD LOAD", load:"LOAD — RAISE INTENSITY", peak:"PEAK — HEAVIEST WEEK", deload:"DELOAD — BACK OFF"};

const LEVELS = {
  beginner:    { label:"Beginner",    note:"Lighter volume, more technique focus, longer rest.", vol:"lower" },
  intermediate:{ label:"Intermediate",note:"Balanced strength + conditioning (your current plan).", vol:"standard" },
  advanced:    { label:"Advanced",    note:"Higher volume, heavier loads, race-pace conditioning.", vol:"higher" }
};

const LIBRARY = {
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

const PLAN_MUSCLE_MAP = {
  "Back Squat":"Quadriceps","Romanian Deadlift":"Hamstrings","Walking Lunges":"Quadriceps","Plank":"Abdominals","Pallof Press":"Abdominals",
  "Warm-up":"Cardio","Intervals":"Cardio","Cool-down":"Cardio","Bench Press":"Chest","Bent-Over Row":"Lats",
  "Overhead Press":"Shoulders","Farmer's Carry":"Forearms","Hanging Leg Raise":"Abdominals","Row / Ski / Run":"Cardio",
  "Sled Push/Pull":"Quadriceps","Wall Balls":"Quadriceps","Burpee Broad Jumps":"Cardio","Ski Erg":"Cardio",
  "Weighted Sit-Up":"Abdominals","Walk / Mobility / Light Swim":"Mobility"
};

// Fine-grained muscle categories shown in the Body Distribution table (order matches display order)

const BODY_MUSCLES = ["Abdominals","Abductors","Adductors","Biceps","Calves","Cardio","Chest","Forearms",
  "Glutes","Hamstrings","Lats","Quadriceps","Shoulders","Traps","Triceps"];

const VALID_MUSCLES = [...BODY_MUSCLES, "Cardio", "Mobility"];

// Broad grouping used only for the 6-axis radar chart

const RADAR_MUSCLES = ["Back","Chest","Legs","Core","Arms","Shoulders"];

const FINE_TO_BROAD = {
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

const EXERCISE_DETAILS = {
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

const MUSCLE_AVATAR_COLOR = {
  Chest:"#FF5A1F", Lats:"#4FA8D8", Traps:"#4FA8D8", Shoulders:"#F2A93B",
  Biceps:"#3ECF8E", Triceps:"#3ECF8E", Forearms:"#3ECF8E",
  Quadriceps:"#E85D75", Hamstrings:"#E85D75", Glutes:"#E85D75", Calves:"#E85D75", Abductors:"#E85D75", Adductors:"#E85D75",
  Abdominals:"#9B7EDE", Cardio:"#4FA8D8", Mobility:"#8B8B94"
};

const MUSCLE_GROUP_COLOR = {
  Back:"var(--steel)", Chest:"var(--accent)", Legs:"#B08BF4", Core:"var(--mint)",
  Arms:"#FFB020", Shoulders:"#4FD8C4", Cardio:"var(--accent)", Mobility:"var(--muted)"
};

const RACE_SEGMENTS = [
  {type:"run", name:"Run 1"}, {type:"station", name:"SkiErg", detail:"1000m"},
  {type:"run", name:"Run 2"}, {type:"station", name:"Sled Push", detail:"50m"},
  {type:"run", name:"Run 3"}, {type:"station", name:"Sled Pull", detail:"50m"},
  {type:"run", name:"Run 4"}, {type:"station", name:"Burpee Broad Jumps", detail:"80m"},
  {type:"run", name:"Run 5"}, {type:"station", name:"Row", detail:"1000m"},
  {type:"run", name:"Run 6"}, {type:"station", name:"Farmers Carry", detail:"200m"},
  {type:"run", name:"Run 7"}, {type:"station", name:"Sandbag Lunges", detail:"100m"},
  {type:"run", name:"Run 8"}, {type:"station", name:"Wall Balls", detail:"100 reps"}
];

const REST_OPTIONS = [0,60,90,120,180];

const RPE_OPTIONS = ["–","6","6.5","7","7.5","8","8.5","9","9.5","10"];

const SET_TYPE_CYCLE = ["working","warmup","drop","failure"];

const SET_TYPE_META = {
  working: { badge:"", color:"var(--muted)" },
  warmup:  { badge:"W", color:"var(--steel)" },
  drop:    { badge:"D", color:"var(--accent)" },
  failure: { badge:"F", color:"#ff6b6b" }
};

const PLATE_SIZES = [25,20,15,10,5,2.5,1.25];

const ACTIVITY_MULTIPLIERS = [
  {key:"bmr", label:"Basal Metabolic Rate (BMR)", mult:1},
  {key:"sedentary", label:"Little or no exercise", mult:1.2},
  {key:"light", label:"Exercise 1-3 times/week", mult:1.375},
  {key:"moderate", label:"Exercise 4-5 times/week", mult:1.465},
  {key:"active", label:"Daily exercise or intense 3-4x/week", mult:1.55},
  {key:"veryactive", label:"Intense exercise 6-7 times/week", mult:1.725},
  {key:"extra", label:"Very intense daily, or physical job", mult:1.9}
];

const CALCULATORS = [
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

const GOAL_OPTIONS = [
  {label:"Maintain weight", delta:0},
  {label:"Mild loss — 0.25 kg/week", delta:-275},
  {label:"Loss — 0.5 kg/week", delta:-550},
  {label:"Extreme loss — 1 kg/week", delta:-1100},
  {label:"Mild gain — 0.25 kg/week", delta:275},
  {label:"Gain — 0.5 kg/week", delta:550},
  {label:"Extreme gain — 1 kg/week", delta:1100}
];

const ACTIVITY_KCAL_PER_MIN = 8; // rough estimate for mixed strength/conditioning work

const MEALS = ["Breakfast","Morning Snack","Lunch","Evening Snack","Dinner"];
// Default share of daily calories per meal (matches typical 25/12.5/25/12.5/25 split)

const MEAL_SHARE = {"Breakfast":0.25,"Morning Snack":0.125,"Lunch":0.25,"Evening Snack":0.125,"Dinner":0.25};

const HYROX_EXPERIENCE_OPTIONS = [
  {key:"first-timer", label:"Never raced Hyrox"},
  {key:"some-experience", label:"Raced 1–2 times"},
  {key:"experienced", label:"Raced multiple times"}
];

const EQUIPMENT_OPTIONS = ["Barbell","Dumbbell","Machines","Sled","Rower","Ski Erg","Kettlebell","Bodyweight Only"];

const ICONS = {
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

/* =========================================================
   UTILS — small, broadly-reusable helpers with no single domain owner:
   CSV parsing, date/duration formatting, debounce, weight-unit
   conversion, icon rendering, and the plate-math calculator.
========================================================= */

function csvEscape(s){ s = String(s==null?"":s); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }

function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

/* Minimal CSV line parser: handles quoted fields containing commas/quotes.
   Deliberately simple (no external library) since this is a small exercise
   list, not a general-purpose data file. */
function parseCsvText(text){
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i], next = text[i+1];
    if(inQuotes){
      if(c==='"' && next==='"'){ field+='"'; i++; }
      else if(c==='"'){ inQuotes=false; }
      else field += c;
    } else {
      if(c==='"') inQuotes = true;
      else if(c===','){ row.push(field); field=""; }
      else if(c==='\r'){ /* skip */ }
      else if(c==='\n'){ row.push(field); rows.push(row); row=[]; field=""; }
      else field += c;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length===1 && r[0].trim()===""));
}

/* =========================================================
   CSV WORKOUT IMPORT — supports the standard Hevy-style export format
   (title, start_time, end_time, description, exercise_title, superset_id,
   exercise_notes, set_index, set_type, weight_kg, reps, distance_km,
   duration_seconds, rpe) — one row per SET. Verified against a real
   304-session / 4593-row export before writing this, per the "inspect
   before importing" rule: set_type values (normal/warmup/dropset/failure)
   map directly onto this app's own SET_TYPE_CYCLE, weight is already in kg,
   and rpe values already match this app's RPE_OPTIONS format.

   Distance/duration-based cardio sets (Treadmill etc.) are imported with
   blank weight/reps -- so they never corrupt volume or PR math -- with a
   note on the exercise flagging that distance/duration weren't preserved,
   since this app's set schema has no field for them (same honest gap as
   PRs/Race analytics elsewhere in this build).

   Additive only: existing workout history is never touched or replaced.
   Re-importing the same file is safe -- sessions already present (matched
   by title + exact start time) are skipped as duplicates, not re-added.
========================================================= */

function parseHevyDateTime(str){
  if(!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}) (\w{3}) (\d{4}),\s*(\d{1,2}):(\d{2})$/);
  if(!m) return null;
  const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const mon = MONTHS[m[2]];
  if(mon===undefined) return null;
  const d = new Date(Number(m[3]), mon, Number(m[1]), Number(m[4]), Number(m[5]));
  return isNaN(d.getTime()) ? null : d.getTime();
}

/* Sniffs the header row to decide which importer applies. */

function formatDuration(ms){
  const totalSec = Math.max(0, Math.floor(ms/1000));
  const h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60), s = totalSec%60;
  return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

function formatTime(s){ const m=Math.floor(s/60); const r=s%60; return `${m}:${r.toString().padStart(2,'0')}`; }

function avatarColorFor(muscle){ return MUSCLE_AVATAR_COLOR[muscle] || "#8B8B94"; }

function muscleGroupColor(muscle){
  return MUSCLE_GROUP_COLOR[FINE_TO_BROAD[muscle]] || (muscle==="Cardio" ? MUSCLE_GROUP_COLOR.Cardio : muscle==="Mobility" ? MUSCLE_GROUP_COLOR.Mobility : "var(--muted)");
}

/* Most-recently-logged exercise names, newest first, deduped. Used to open the
   exercise picker on "Recent" by default the way most workout-logging apps do. */

const _debounceTimers = {};

function debounce(key, fn, ms){
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(fn, ms);
}

/* =========================================================
   WEIGHT UNIT CONVERSION — display/input layer only. Every gram of storage
   (set weights, body weight, PRs, volume) stays in kg always, so history,
   PR detection, and volume math never need to know or care which unit the
   screen currently shows. Converting only at the edges (render + input
   handlers) means nothing downstream can drift out of sync.

   Deliberately NOT converted: the plate calculator (lb plates are different
   physical denominations -- 45/35/25/10/5/2.5 -- not just a unit rescale of
   kg plates, so that's a separate feature, not covered here) and the
   BMR/LBM/Ideal-Weight/Body-Fat calculators (their formulas are defined in
   kg/cm; converting those inputs/outputs safely would mean also handling
   height in inches, which is a separate "distance unit" concern).
========================================================= */

function wUnit(){ return state.settings.weightUnit==="lb" ? "lb" : "kg"; }

function kgToLb(kg){ return kg*2.2046226218; }

function lbToKg(lb){ return lb/2.2046226218; }
/* For showing a kg-stored value on screen in the user's preferred unit */

function displayW(kg, decimals=1){
  const n = Number(kg);
  if(isNaN(n) || kg==="" || kg==null) return "";
  const v = wUnit()==="lb" ? kgToLb(n) : n;
  return decimals===0 ? Math.round(v) : +v.toFixed(decimals);
}
/* For converting a value the user just typed (in their preferred unit) back to kg for storage */

function parseInputW(raw){
  const n = parseFloat(raw);
  if(isNaN(n)) return raw===""||raw==null ? "" : raw;
  return wUnit()==="lb" ? +lbToKg(n).toFixed(2) : n;
}

/* Plate calculator: greedy plates-per-side for a target barbell weight */
function calcPlates(target, barWeight){
  if(!target || target <= barWeight) return { perSide:[], remainder:0 };
  let perSideWeight = (target - barWeight)/2;
  const perSide = [];
  let rem = perSideWeight;
  PLATE_SIZES.forEach(p=>{
    const count = Math.floor(rem/p + 1e-9);
    if(count>0){ perSide.push({plate:p, count}); rem = +(rem - count*p).toFixed(3); }
  });
  return { perSide, remainder: rem };
}

function todayStr(){ return new Date().toISOString().slice(0,10); }

function svg(name, size=19){ return `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${ICONS[name]}</svg>`; }

/* =========================================================
   STORAGE — localStorage wrapper, app state, persistence, migrations,
   onboarding-status resolution, and JSON/CSV backup export & import.
   Nothing here renders HTML.
========================================================= */

const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

/* ---------- Hyrox 8-week plan data ---------- */

const state = {
  tab: LS.get("hx_tab","home"),
  activeWeek: LS.get("hx_active_week",1),
  activeLevel: LS.get("hx_active_level","intermediate"),
  activeDayIdx: 0,
  completed: LS.get("hx_completed",{}),
  // SHARED PROFILE — single source of truth for weight/height/age/gender/activity/goal
  profile: Object.assign({
    weight:101, height:180, age:25, gender:"male",
    activityMultiplier:1.465, goalDelta:-400,
    name:"", hyroxExperience:"first-timer", trainingDays:5,
    equipment:["Barbell","Dumbbell","Machines","Sled","Rower","Ski Erg","Kettlebell"]
  }, LS.get("hx_profile",{})),
  onboardingComplete: LS.get("hx_onboarding_complete", null), // resolved to true/false at boot in resolveOnboardingStatus()
  nutrition: Object.assign({proteinPct:30,carbPct:45,fatPct:25,fibreTarget:30},
    LS.get("hx_nutrition",{})),
  mealOpen: null,
  bodylog: LS.get("hx_bodylog",[]),
  customExercises: LS.get("hx_custom_exercises",[]),
  workoutLog: LS.get("hx_workout_log",[]),
  foodLog: LS.get("hx_food_log",[]),
  routines: LS.get("hx_routines",[]),
  routineBuilder: null,
  calc: LS.get("hx_calc", {
    activeCalc:"bmr", result:null,
    neck:38, waist:90, hip:95, restingHR:60,
    bust:90, bwaist:75, highHip:85, bhip:95
  }),
  settings: Object.assign({
    sounds:true, vibration:true, defaultRest:90, keepAwake:false,
    plateCalc:true, rpeTracking:true, autoStartRest:true, waterTargetMl:2500,
    workoutReminders:false, hydrationReminders:false, weeklyReports:false,
    lastWorkoutReminderDate:null, lastHydrationReminderDate:null, lastWeeklyReportAt:null,
    theme:"dark", weightUnit:"kg", exerciseCalorieBudget:false
  }, LS.get("hx_settings", {})),
  plateCalcOpen: null, // element id string when plate calc popover open
  restDuration: LS.get("hx_rest_duration",90),
  session: LS.get("hx_active_session", null),
  prs: LS.get("hx_prs", []),
  lastSessionPRs: null, // transient — set right after finishing a workout, shown as a celebration banner
  viewingSessionId: null, // when set, Workout tab shows the detailed history view for this session
  showAllSessions: false,
  editingSessionId: null, // when set, active session editor is patching an existing finished workout instead of creating a new one
  libCategory: "All",
  libSearch: "",
  showCustomForm: false,
  chartMetric: "sets",
  calendarMonthOffset: 0,
  bodyDistWeekOffset: 0,
  progressExercise: null,
  viewingExerciseDetail: null,
  showExercisePicker: false,
  exercisePickerSearch: "",
  exercisePickerEquipment: "All",
  exercisePickerMuscle: "All",
  exercisePickerShowCreate: false,
  exercisePickerContext: "session", // "session" adds to the active workout; "routine" adds to the routine builder
  routineBuilderSets: 3,
  viewingHyroxSchedule: false,
  csvImportPreview: null,
  exerciseMenuOpen: null,
  replacingExerciseIndex: null,
  exerciseDetailTab: "summary",
  raceActive: LS.get("hx_race_active", null),
  raceLog: LS.get("hx_race_log", []),
  viewingRaceMode: !!LS.get("hx_race_active", null),
  achievements: LS.get("hx_achievements", []),
  lastUnlockedAchievements: null, // transient celebration, mirrors lastSessionPRs pattern
  favoriteFoods: LS.get("hx_favorite_foods", []),
  waterLog: LS.get("hx_water_log", []),
  timer: null
};

/* ---------- Derived values from shared profile (auto-recalc everywhere) ---------- */

function persist(){
  LS.set("hx_tab", state.tab==="more" ? (LS.get("hx_tab","home")) : state.tab);
  LS.set("hx_active_week", state.activeWeek);
  LS.set("hx_active_level", state.activeLevel);
  LS.set("hx_profile", state.profile);
  LS.set("hx_onboarding_complete", state.onboardingComplete);
  LS.set("hx_completed", state.completed);
  LS.set("hx_nutrition", state.nutrition);
  LS.set("hx_bodylog", state.bodylog);
  LS.set("hx_custom_exercises", state.customExercises);
  LS.set("hx_achievements", state.achievements);
  LS.set("hx_favorite_foods", state.favoriteFoods);
  LS.set("hx_water_log", state.waterLog);
  LS.set("hx_race_log", state.raceLog);
  LS.set("hx_race_active", state.raceActive);
  LS.set("hx_workout_log", state.workoutLog);
  LS.set("hx_food_log", state.foodLog);
  LS.set("hx_routines", state.routines);
  LS.set("hx_calc", state.calc);
  LS.set("hx_settings", state.settings);
  LS.set("hx_rest_duration", state.restDuration);
  LS.set("hx_active_session", state.session);
  LS.set("hx_prs", state.prs);
  LS.set("hx_schema_version", SCHEMA_VERSION);
}

/* ---------- Migration: runs once on boot if stored schema is older than current ---------- */

function runMigrations(){
  const stored = LS.get("hx_schema_version", null);
  if(stored===null){
    // Pre-versioning install (or brand new) — just stamp current version, no data shape to migrate
    LS.set("hx_schema_version", SCHEMA_VERSION);
    return;
  }
  if(stored > SCHEMA_VERSION){
    console.warn("Ignyt: backup/data is from a newer app version ("+stored+" > "+SCHEMA_VERSION+"). Some fields may be ignored.");
    return;
  }
  // Example future migration:
  // if(stored < 2){ /* transform old shape -> new shape here */ LS.set("hx_schema_version", 2); }
  if(stored < SCHEMA_VERSION){
    LS.set("hx_schema_version", SCHEMA_VERSION);
  }
}

/* Decide once whether to show the onboarding wizard. Never interrupts a returning
   user: if hx_onboarding_complete was never set but real usage data already exists
   (this app predates the onboarding feature), it's silently marked complete. */

function resolveOnboardingStatus(){
  if(state.onboardingComplete !== null) return; // already resolved on a prior boot
  const hasExistingData = state.bodylog.length>0 || state.workoutLog.length>0 ||
    Object.keys(state.completed).length>0 || state.routines.length>0;
  state.onboardingComplete = hasExistingData ? true : false;
  LS.set("hx_onboarding_complete", state.onboardingComplete);
}

/* Applies the resolved theme (dark/light) as a data-attribute on <html> so all
   CSS var overrides cascade. "system" resolves live against the OS preference. */

function exportAllJSON(){
  const data = { app:"ignyt", version:1, schemaVersion:SCHEMA_VERSION, exportedAt:new Date().toISOString(), data:{} };
  ALL_DATA_KEYS.forEach(k=>{ const v = localStorage.getItem(k); if(v!==null) data.data[k]=v; });
  downloadFile("ignyt-backup-"+todayStr()+".json", JSON.stringify(data,null,2), "application/json");
}

function exportWorkoutsCSV(){
  const rows = [["date","workout_title","exercise","muscle","set_number","weight_kg","reps","rpe","duration_min","session_volume_kg","notes"]];
  state.workoutLog.slice().reverse().forEach(s=>{
    s.exercises.forEach(ex=>{
      ex.sets.forEach((set,si)=>{
        rows.push([s.date, sessionTitle(s), ex.name, getMuscle(ex.name), si+1, set.weight||"", set.reps||"", set.rpe||"", s.durationMin||"", s.volume?Math.round(s.volume):"", ex.notes||""]);
      });
    });
  });
  // plan completions as their own rows
  Object.entries(state.completed).forEach(([key,ts])=>{
    const [wk,day,exName] = key.split("|");
    rows.push([new Date(ts).toISOString().slice(0,10), "Plan "+wk+" "+day, exName, getMuscle(exName), "", "", "", "", "", "", "plan check-off"]);
  });
  const csv = rows.map(r=>r.map(csvEscape).join(",")).join("\n");
  downloadFile("ignyt-workouts-"+todayStr()+".csv", csv, "text/csv");
}

function exportMeasurementsCSV(){
  const rows = [["date","weight_kg","sleep_hrs","hrv_ms","waist_cm","chest_cm","arms_cm","bodyfat_pct"]];
  state.bodylog.slice().reverse().forEach(e=>{
    rows.push([e.date, e.weight||"", e.sleep||"", e.hrv||"", e.waist||"", e.chest||"", e.arms||"", e.bodyfat||""]);
  });
  const csv = rows.map(r=>r.map(csvEscape).join(",")).join("\n");
  downloadFile("ignyt-measurements-"+todayStr()+".csv", csv, "text/csv");
}

function importAllJSON(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    let parsed;
    try{
      parsed = JSON.parse(reader.result);
    }catch(e){
      alert("Could not read that file — it isn't valid JSON.");
      return;
    }
    if(!parsed || typeof parsed!=="object" || (parsed.app!=="ignyt" && parsed.app!=="hyrox-prep") || !parsed.data || typeof parsed.data!=="object"){
      alert("This doesn't look like an Ignyt backup file.");
      return;
    }
    // Validate every value is well-formed JSON before writing anything (all-or-nothing import)
    const staged = {};
    const badKeys = [];
    Object.entries(parsed.data).forEach(([k,v])=>{
      if(!ALL_DATA_KEYS.includes(k)) return; // ignore unknown/future keys rather than failing
      try{ JSON.parse(v); staged[k] = v; }
      catch(e){ badKeys.push(k); }
    });
    if(badKeys.length){
      alert("This backup file is corrupted (bad data for: "+badKeys.join(", ")+"). Nothing was changed.");
      return;
    }
    if(Object.keys(staged).length===0){
      alert("This backup file has no recognizable Ignyt data. Nothing was changed.");
      return;
    }
    if(!confirm("Import will REPLACE all current app data with this backup ("+new Date(parsed.exportedAt||Date.now()).toLocaleDateString()+"). Continue?")) return;
    // Everything validated — commit atomically
    Object.entries(staged).forEach(([k,v])=> localStorage.setItem(k, v));
    location.reload();
  };
  reader.onerror = ()=> alert("Could not read that file.");
  reader.readAsText(file);
}

/* =========================================================
   CSV EXERCISE IMPORT — additive only, never overwrites/deletes anything.
   Scoped deliberately to Custom Exercises: it's the one collection in this
   app with a simple, flat, already-understood shape ({name,cat,presc,unit,
   muscle}). Workout history, PRs, and logs have deep relational/computed
   structure (timestamps, nested sets, derived volume/PRs) that a spreadsheet
   can't safely represent, so those are intentionally NOT importable here.
========================================================= */

function detectCsvKind(header){
  const h = header.map(c=>c.trim().toLowerCase());
  if(h.includes("exercise_title") && h.includes("start_time") && h.includes("set_type")) return "workouts";
  if(h.includes("name") && h.includes("muscle")) return "exercises";
  if(h.includes("name") && h.includes("calories")) return "foods";
  return "unknown";
}

function validateFoodsCsv(text){
  let rows;
  try{ rows = parseCsvText(text); }
  catch(e){ return { error:"Could not read this file as CSV." }; }
  if(rows.length < 2) return { error:"This file has no data rows." };

  const header = rows[0].map(h=>h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const calIdx = header.indexOf("calories");
  if(nameIdx===-1 || calIdx===-1){
    return { error:"Missing required column(s): "+[nameIdx===-1?"name":null, calIdx===-1?"calories":null].filter(Boolean).join(", ")+". Found columns: "+header.join(", ") };
  }
  const proteinIdx = header.indexOf("protein");
  const carbsIdx = header.indexOf("carbs");
  const fatIdx = header.indexOf("fat");
  const fibreIdx = header.indexOf("fibre")!==-1 ? header.indexOf("fibre") : header.indexOf("fiber");

  const existingNames = new Set(state.favoriteFoods.map(f=>f.name.trim().toLowerCase()));
  const seenInFile = new Set();
  const validRows = [], invalidRows = [], duplicateRows = [];

  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r.every(c=>c.trim()==="")) continue;
    const name = (r[nameIdx]||"").trim();
    const calories = Number((r[calIdx]||"").trim());
    if(!name || !calories || isNaN(calories)){
      invalidRows.push({ row:i+1, name, reason: !name?"missing name": "missing or invalid calories" });
      continue;
    }
    const key = name.toLowerCase();
    if(existingNames.has(key) || seenInFile.has(key)){
      duplicateRows.push({ row:i+1, name });
      continue;
    }
    seenInFile.add(key);
    validRows.push({
      name, calories,
      protein: proteinIdx!==-1 ? Number(r[proteinIdx])||0 : 0,
      carbs: carbsIdx!==-1 ? Number(r[carbsIdx])||0 : 0,
      fat: fatIdx!==-1 ? Number(r[fatIdx])||0 : 0,
      fibre: fibreIdx!==-1 ? Number(r[fibreIdx])||0 : 0
    });
  }

  return {
    kind: "foods",
    totalRows: rows.length-1,
    validRows, invalidRows, duplicateRows,
    validCount: validRows.length, invalidCount: invalidRows.length, duplicateCount: duplicateRows.length
  };
}

function validateWorkoutCsv(text){
  let rows;
  try{ rows = parseCsvText(text); }
  catch(e){ return { error:"Could not read this file as CSV." }; }
  if(rows.length < 2) return { error:"This file has no data rows." };

  const header = rows[0].map(h=>h.trim().toLowerCase());
  const need = ["title","start_time","exercise_title","set_type"];
  const missing = need.filter(c=>header.indexOf(c)===-1);
  if(missing.length) return { error:"Missing required column(s): "+missing.join(", ")+". Found columns: "+header.join(", ") };

  const idx = {}; header.forEach((c,i)=> idx[c]=i);
  const col = (r,name)=> idx[name]!==undefined ? (r[idx[name]]||"").trim() : "";

  const existingSessionKeys = new Set(state.workoutLog.map(s=>s.title+"|"+s.startedAt));

  const sessionOrder = [];         // preserves file order for chronological backfill
  const sessionsByKey = new Map(); // key -> accumulator
  let invalidRows = [];

  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r.every(c=>c.trim()==="")) continue;
    const title = col(r,"title") || "Workout";
    const startTs = parseHevyDateTime(col(r,"start_time"));
    const exerciseTitle = col(r,"exercise_title");
    if(!exerciseTitle || startTs===null){
      invalidRows.push({ row:i+1, reason: !exerciseTitle ? "missing exercise_title" : "unparseable start_time" });
      continue;
    }
    const endTs = parseHevyDateTime(col(r,"end_time"));
    const key = title+"|"+startTs;
    if(!sessionsByKey.has(key)){
      sessionsByKey.set(key, {
        title, startedAt: startTs, finishedAt: endTs,
        notes: col(r,"description"), exercisesByName: new Map(), exerciseOrder: []
      });
      sessionOrder.push(key);
    }
    const sess = sessionsByKey.get(key);
    if(!sess.exercisesByName.has(exerciseTitle)){
      sess.exercisesByName.set(exerciseTitle, { name: exerciseTitle, notes: col(r,"exercise_notes"), sets: [], hasCardio:false });
      sess.exerciseOrder.push(exerciseTitle);
    }
    const ex = sess.exercisesByName.get(exerciseTitle);
    const weight = col(r,"weight_kg");
    const reps = col(r,"reps");
    const distance = col(r,"distance_km");
    const duration = col(r,"duration_seconds");
    if((distance || duration) && !weight && !reps) ex.hasCardio = true;
    ex.sets.push({
      weight: weight || "", reps: reps || "",
      rpe: col(r,"rpe") || "", done:true,
      type: SET_TYPE_IMPORT_MAP[col(r,"set_type").toLowerCase()] || "working"
    });
  }

  const validSessions = [], duplicateSessions = [];
  sessionOrder.forEach(key=>{
    const s = sessionsByKey.get(key);
    const exercises = s.exerciseOrder.map(name=>{
      const ex = s.exercisesByName.get(name);
      return {
        name: ex.name,
        notes: ex.hasCardio ? (ex.notes ? ex.notes+" " : "")+"(Imported cardio set — distance/duration not preserved, this app tracks weight/reps only.)" : ex.notes,
        restDuration: 90,
        sets: ex.sets
      };
    });
    const durationMin = s.finishedAt ? Math.max(1, Math.round((s.finishedAt-s.startedAt)/60000)) : null;
    const volume = computeSessionVolume(exercises);
    const session = {
      id: s.startedAt, // stable id derived from the real timestamp so re-import dedup works
      date: new Date(s.startedAt).toISOString().slice(0,10),
      startedAt: s.startedAt, finishedAt: s.finishedAt, durationMin, volume,
      exercises, notes: s.notes, title: s.title
    };
    if(existingSessionKeys.has(s.title+"|"+s.startedAt)) duplicateSessions.push(session);
    else validSessions.push(session);
  });

  return {
    kind: "workouts",
    totalRows: rows.length-1,
    sessionsFound: sessionOrder.length,
    validSessions, invalidRows, duplicateSessions,
    validCount: validSessions.length, invalidCount: invalidRows.length, duplicateCount: duplicateSessions.length
  };
}

function validateExerciseCsv(text){
  let rows;
  try{ rows = parseCsvText(text); }
  catch(e){ return { error: "Could not read this file as CSV." }; }

  if(rows.length < 2) return { error: "This file has no data rows (needs a header row plus at least one exercise)." };

  const header = rows[0].map(h=>h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const muscleIdx = header.indexOf("muscle");
  if(nameIdx===-1 || muscleIdx===-1){
    return { error: "Missing required column(s): "+[nameIdx===-1?"name":null, muscleIdx===-1?"muscle":null].filter(Boolean).join(", ")+". Found columns: "+(header.join(", ")||"(none)") };
  }
  const catIdx = header.indexOf("cat");
  const prescIdx = header.indexOf("presc");
  const unitIdx = header.indexOf("unit");

  const existingNames = new Set(allLibraryExercises().map(e=>e.name.trim().toLowerCase()));
  const seenInFile = new Set();
  const validRows = [], invalidRows = [], duplicateRows = [];

  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r.every(c=>c.trim()==="")) continue; // skip fully blank lines
    const name = (r[nameIdx]||"").trim();
    const muscle = (r[muscleIdx]||"").trim();
    const cat = catIdx!==-1 ? (r[catIdx]||"").trim() : "";
    const presc = prescIdx!==-1 ? (r[prescIdx]||"").trim() : "";
    const unit = unitIdx!==-1 ? (r[unitIdx]||"").trim() : "";

    if(!name || !muscle || !VALID_MUSCLES.includes(muscle)){
      invalidRows.push({ row:i+1, name, muscle, reason: !name?"missing name": !muscle?"missing muscle": "unrecognized muscle '"+muscle+"'" });
      continue;
    }
    const key = name.toLowerCase();
    if(existingNames.has(key) || seenInFile.has(key)){
      duplicateRows.push({ row:i+1, name });
      continue;
    }
    seenInFile.add(key);
    validRows.push({ name, muscle, cat: cat || "Custom", presc: presc || "3x10", unit: unit || "reps" });
  }

  return {
    kind: "exercises",
    totalRows: rows.length-1,
    validRows, invalidRows, duplicateRows,
    validCount: validRows.length, invalidCount: invalidRows.length, duplicateCount: duplicateRows.length
  };
}

function importCsv(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    let rows;
    try{ rows = parseCsvText(reader.result); }
    catch(e){ alert("Couldn't read this file as CSV."); return; }
    if(!rows.length){ alert("This file appears to be empty."); return; }
    const kind = detectCsvKind(rows[0]);
    if(kind==="unknown"){
      alert("Couldn't recognize this CSV's columns. Expected an exercise list (name, muscle, …), a Hevy-style workout export (title, start_time, exercise_title, set_type, …), or a foods list (name, calories, …).");
      return;
    }
    const result = kind==="workouts" ? validateWorkoutCsv(reader.result)
      : kind==="foods" ? validateFoodsCsv(reader.result)
      : validateExerciseCsv(reader.result);
    if(result.error){
      alert("Couldn't import this file: "+result.error);
      return;
    }
    state.csvImportPreview = result; // show summary; nothing written until user confirms
    render();
  };
  reader.onerror = ()=> alert("Could not read that file.");
  reader.readAsText(file);
}

/* =========================================================
   TIMER — rest timer, active-session elapsed timer, race-mode timer,
   wake lock, and the audio/vibration feedback helpers.
========================================================= */

let raceTimerHandle = null;

function ensureRaceTimerRunning(){
  if(raceTimerHandle) return;
  raceTimerHandle = setInterval(()=>{
    if(!state.raceActive){ clearInterval(raceTimerHandle); raceTimerHandle = null; return; }
    const totalEl = document.getElementById("race-total-elapsed");
    if(totalEl) totalEl.textContent = formatDuration(Date.now()-state.raceActive.startedAt);
    const segEl = document.getElementById("race-segment-elapsed");
    if(segEl) segEl.textContent = formatDuration(Date.now()-state.raceActive.segmentStartedAt);
  }, 1000);
}

function stopRaceTimer(){
  if(raceTimerHandle){ clearInterval(raceTimerHandle); raceTimerHandle = null; }
}

let elapsedTimerHandle = null;

function ensureElapsedTimerRunning(){
  if(elapsedTimerHandle) return;
  elapsedTimerHandle = setInterval(()=>{
    if(!state.session){ clearInterval(elapsedTimerHandle); elapsedTimerHandle = null; return; }
    const el = document.getElementById("session-elapsed");
    if(el) el.textContent = formatDuration(Date.now()-state.session.startedAt);
  }, 1000);
}

function stopElapsedTimer(){
  if(elapsedTimerHandle){ clearInterval(elapsedTimerHandle); elapsedTimerHandle = null; }
}

function startTimer(seconds){
  if(state.timer && state.timer.handle) clearInterval(state.timer.handle);
  state.timer = {remaining:seconds, total:seconds, handle:null};
  render();
  const handle = setInterval(()=>{
    if(!state.timer){ clearInterval(handle); return; } // safety net: never crash on a stray tick after external cleanup
    state.timer.remaining--;
    if(state.timer.remaining<=0){
      clearInterval(state.timer.handle);
      playBeep(); vibrate();
      state.timer = null;
      render();
      return;
    }
    if(state.timer.remaining<=3){ vibrate(80); }
    const ring = document.querySelector(".timer-ring");
    if(ring) ring.textContent = formatTime(state.timer.remaining);
  },1000);
  state.timer.handle = handle;
}

function playBeep(){
  if(!state.settings.sounds) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    for(let i=0;i<3;i++){
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type="sine"; o.frequency.value=880;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i*0.28;
      g.gain.setValueAtTime(0.15,t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.22);
      o.start(t); o.stop(t+0.25);
    }
  }catch{}
}

function vibrate(ms=200){ if(!state.settings.vibration) return; try{ navigator.vibrate && navigator.vibrate(ms); }catch{} }

/* Wake lock — keeps screen on during an active session when enabled */

let wakeLockHandle = null;

async function applyWakeLock(){
  try{
    const shouldHold = state.settings.keepAwake && !!state.session;
    if(shouldHold && !wakeLockHandle && "wakeLock" in navigator){
      wakeLockHandle = await navigator.wakeLock.request("screen");
      wakeLockHandle.addEventListener("release", ()=>{ wakeLockHandle = null; });
    } else if(!shouldHold && wakeLockHandle){
      await wakeLockHandle.release();
      wakeLockHandle = null;
    }
  }catch{ wakeLockHandle = null; }
}
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") applyWakeLock(); });

/* =========================================================
   LIBRARY TAB
========================================================= */
/* =========================================================
   EXERCISE DETAIL SCREEN — muscles, form, and a lazy-loaded looping
   demonstration video with graceful fallback when none exists.
========================================================= */

/* =========================================================
   CHARTS — reusable chart-rendering primitives (sparkline, weekly bars,
   muscle-distribution radar, calendar heatmap).
========================================================= */

function renderBodyDistribution(weekOffset){
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

function radarChart(current, previous){
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

function weeklyBarChart(buckets, metric){
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

function renderCalendarMonth(monthOffset){
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

function sparklineChart(points, opts={}){
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

/* =========================================================
   WORKOUT — HYROX plan structure, Race Mode logic, PR detection,
   achievements, set/session helpers, and workout-history/progress
   computations. The exercise/plan DATA itself lives in constants.js;
   this is the logic that operates on it.
========================================================= */

function phaseFor(w){ if(w<=2)return"base"; if(w<=4)return"build"; if(w<=6)return"load"; if(w===7)return"peak"; return"deload"; }

function buildWeek(w, level){
  level = level || "intermediate";
  const p = phaseFor(w);
  const T = {
    base:{squat:"4x6 @ RPE 6-7",rdl:"3x8 @ moderate",lunge:"3x12/leg, light DB",bench:"4x6 @ RPE 6-7",row:"4x8 @ moderate",ohp:"3x8 @ moderate",carry:"4x40m, moderate load",intervals:"6x400m hard, 90s rest",z2:"35 min steady, conversational",sled:"3 rounds, light-mod, focus technique",wallball:"3x15 @ 6-9kg",burpee:"3x8 broad jump burpees",ski:"3x200m",pallof:"3x10/side, light band",hanging:"3x8-10 knee raises",situp:"3x10 bodyweight"},
    build:{squat:"4x5 @ +5-10%, RPE 7",rdl:"3x8 @ +5% load",lunge:"3x12/leg, moderate DB",bench:"4x5 @ +5% load",row:"4x8 @ +5% load",ohp:"3x8 @ +5% load",carry:"4x40m, heavier load",intervals:"7x400m hard, 75s rest",z2:"40 min steady, conversational",sled:"4 rounds, moderate load",wallball:"4x15 @ 6-9kg",burpee:"3x10 broad jump burpees",ski:"4x250m",pallof:"3x12/side, moderate band",hanging:"3x10 leg raises",situp:"3x12 weighted, light plate"},
    load:{squat:"5x5 @ +5%, RPE 7-8",rdl:"4x6 @ +5-10% load",lunge:"4x12/leg, heavier DB",bench:"5x5 @ +5% load",row:"4x10 @ +5% load",ohp:"4x6 @ +5% load",carry:"4x50m, heavier load",intervals:"8x400m hard, 75s rest",z2:"45 min steady, conversational",sled:"4 rounds, race-approaching load",wallball:"4x15-20 @ 9kg",burpee:"4x10 broad jump burpees",ski:"4x300m",pallof:"3x12/side, heavier band",hanging:"3x12 straight leg raises",situp:"3x12-15 weighted"},
    peak:{squat:"5x5 @ +5%, RPE 8",rdl:"4x6 @ +5% load",lunge:"4x12/leg, heaviest DB",bench:"5x5 @ +5% load",row:"4x10 @ +5% load",ohp:"4x6 @ +5% load",carry:"5x50m, heaviest load",intervals:"6x800m hard, 2min rest",z2:"45-50 min steady",sled:"5 rounds, near race load",wallball:"5x15-20 @ 9kg",burpee:"4x10-12 broad jump burpees",ski:"5x300m",pallof:"3x12/side, heaviest band",hanging:"3x12-15 straight leg raises",situp:"4x15 weighted"},
    deload:{squat:"3x5 @ light, RPE 5",rdl:"3x6 @ light",lunge:"2x12/leg, light",bench:"3x5 @ light",row:"3x8 @ light",ohp:"3x6 @ light",carry:"3x40m, moderate",intervals:"4x400m moderate, full recovery",z2:"25 min easy",sled:"2 rounds, light, technique refresh",wallball:"3x12 @ 6kg",burpee:"2x8",ski:"3x200m easy",pallof:"2x10/side, light",hanging:"2x8 knee raises",situp:"2x10 bodyweight"}
  }[p];

  // Level scaling: beginner strips one set / eases conditioning; advanced adds a set / extends conditioning
  function scale(presc, kind){
    if(level==="intermediate") return presc;
    const m = /^(\d+)x/.exec(presc);
    if(level==="beginner"){
      if(m){ const sets=Math.max(2, Number(m[1])-1); presc = presc.replace(/^\d+x/, sets+"x"); }
      presc = presc.replace(/(\d+)x(\d+)m/, (s,r,d)=> r+"x"+d+"m"); // carries stay
      if(kind==="cond") presc += ", longer rest";
      return presc;
    }
    if(level==="advanced"){
      if(m){ const sets=Number(m[1])+1; presc = presc.replace(/^\d+x/, sets+"x"); }
      if(kind==="cond") presc += ", minimal rest";
      return presc;
    }
    return presc;
  }

  return {
    week:w, phase:p, phaseLabel:PHASE_LABEL[p], level,
    days:[
      {day:"Day 1",session:"Lower Body Strength",exercises:[
        {name:"Back Squat",presc:scale(T.squat)},{name:"Romanian Deadlift",presc:scale(T.rdl)},
        {name:"Walking Lunges",presc:scale(T.lunge)},{name:"Plank",presc:"3x45s"},
        {name:"Pallof Press",presc:scale(T.pallof),note:"Core finisher — anti-rotation, resists sled drift"}]},
      {day:"Day 2",session:"Run Intervals",exercises:[
        {name:"Warm-up",presc:"10 min easy jog"},{name:"Intervals",presc:scale(T.intervals,"cond")},
        {name:"Cool-down",presc:"10 min easy jog"}]},
      {day:"Day 3",session:"Upper Body + Carries",exercises:[
        {name:"Bench Press",presc:scale(T.bench)},{name:"Bent-Over Row",presc:scale(T.row)},
        {name:"Overhead Press",presc:scale(T.ohp)},{name:"Farmer's Carry",presc:scale(T.carry)},
        {name:"Hanging Leg Raise",presc:scale(T.hanging),note:"Core finisher — swap for dead bug if grip is fried"}]},
      {day:"Day 4",session:"Zone 2 Steady State",exercises:[
        {name:"Row / Ski / Run",presc:scale(T.z2),note:"Stay conversational — don't drift into threshold"}]},
      {day:"Day 5",session:"Hyrox Station Circuit",exercises:[
        {name:"Sled Push/Pull",presc:scale(T.sled,"cond")},{name:"Wall Balls",presc:scale(T.wallball,"cond")},
        {name:"Burpee Broad Jumps",presc:scale(T.burpee,"cond")},{name:"Ski Erg",presc:scale(T.ski,"cond")},
        {name:"Weighted Sit-Up",presc:scale(T.situp),note:"Core finisher — race-specific, done under fatigue"}]},
      {day:"Day 6",session:"Optional — Easy Movement",exercises:[
        {name:"Walk / Mobility / Light Swim",presc:"20-30 min, low intensity",note:"Skip if fatigue score is high"}]}
    ]
  };
}
// WEEKS is rebuilt for the active level whenever it changes

// Starts empty rather than reading LS.get(...) directly here: this module and storage.js
// import from each other (a legitimate cycle -- storage.js's CSV validators need workout
// helpers), and evaluating LS.get() at this module's top level can run before storage.js's
// own top-level code has finished, in the specific case where storage.js is what pulled this
// module in. app.js's bootstrap calls rebuildWeeks() (which reads state.activeLevel, already
// safe since that's set in storage.js's own module body) right after all modules are loaded
// and before the first render, so WEEKS is always populated before anything reads it.

let WEEKS = [];

function rebuildWeeks(){ WEEKS = Array.from({length:8},(_,i)=>buildWeek(i+1, state.activeLevel)); }

/* ---------- Exercise library ---------- */

function recentExerciseNames(limit=10){
  const seen = new Set();
  const out = [];
  for(const session of state.workoutLog){
    for(const ex of session.exercises){
      if(!seen.has(ex.name)){ seen.add(ex.name); out.push(ex.name); }
      if(out.length>=limit) return out;
    }
  }
  return out;
}

function allLibraryExercises(){
  const custom = LS.get("hx_custom_exercises", []);
  const list = [];
  Object.entries(LIBRARY).forEach(([cat, items])=> items.forEach(([name,presc,unit,muscle])=> list.push({name,cat,presc,unit,muscle,custom:false})));
  custom.forEach(ex=> list.push({...ex, custom:true}));
  return list;
}

function getMuscle(name){
  for(const items of Object.values(LIBRARY)){
    const hit = items.find(i=>i[0]===name);
    if(hit) return hit[3];
  }
  const custom = LS.get("hx_custom_exercises", []);
  const c = custom.find(i=>i.name===name);
  if(c) return c.muscle || "Other";
  if(PLAN_MUSCLE_MAP[name]) return PLAN_MUSCLE_MAP[name];
  return "Other";
}

function parseSets(presc){
  const m = /^(\d+)\s*x/i.exec(presc||"");
  return m ? Number(m[1]) : 3;
}

function getPlanPresc(weekNum, dayName, exName){
  const w = WEEKS[weekNum-1];
  if(!w) return "";
  const d = w.days.find(dd=>dd.day===dayName);
  if(!d) return "";
  const ex = d.exercises.find(e=>e.name===exName);
  return ex ? ex.presc : "";
}

/* ---------- Icons (inline SVG, no deps) ---------- */

function weekProgress(w){
  let total=0, done=0;
  w.days.forEach(d=>d.exercises.forEach(ex=>{ total++; if(state.completed[`${w.week}|${d.day}|${ex.name}`]) done++; }));
  return total? Math.round(done/total*100):0;
}

/* =========================================================
   HOME TAB — dashboard
========================================================= */

function overallPlanProgress(){
  let total=0, done=0;
  WEEKS.forEach(w=> w.days.forEach(d=> d.exercises.forEach(ex=>{
    total++; if(state.completed[`${w.week}|${d.day}|${ex.name}`]) done++;
  })));
  return total? Math.round(done/total*100):0;
}

function todaysPlannedDay(){
  // Best-effort mapping: today's weekday index -> plan day index (Mon=Day1...Sat=Day6, Sun=rest)
  const dow = new Date().getDay(); // 0=Sun..6=Sat
  const idx = dow===0 ? null : dow-1; // Mon(1)->0 ... Sat(6)->5
  const week = WEEKS[state.activeWeek-1];
  if(idx===null || idx>=week.days.length) return null;
  return week.days[idx];
}

function bestRaceTime(){
  if(!state.raceLog.length) return null;
  return Math.min(...state.raceLog.map(r=>r.totalMs));
}

function estimatedOneRM(weight, reps){
  // Epley formula — standard estimate, most reliable under ~12 reps
  return weight * (1 + reps/30);
}

function computeHistoricalBests(){
  const bests = {}; // { [exerciseName]: { weight, oneRM, repsAtWeight:{ "60":8 } } }
  let maxVolume = 0;
  state.workoutLog.forEach(session=>{
    if(session.volume && session.volume > maxVolume) maxVolume = session.volume;
    (session.exercises||[]).forEach(ex=>{
      if(!bests[ex.name]) bests[ex.name] = { weight:0, oneRM:0, repsAtWeight:{} };
      (ex.sets||[]).forEach(s=>{
        if(!isCountingSet(s)) return;
        const w = parseFloat(s.weight), r = parseFloat(s.reps);
        if(isNaN(w) || isNaN(r) || r<=0) return;
        if(w > bests[ex.name].weight) bests[ex.name].weight = w;
        const orm = estimatedOneRM(w,r);
        if(orm > bests[ex.name].oneRM) bests[ex.name].oneRM = orm;
        const wKey = String(w);
        if(!bests[ex.name].repsAtWeight[wKey] || r > bests[ex.name].repsAtWeight[wKey]) bests[ex.name].repsAtWeight[wKey] = r;
      });
    });
  });
  return { bests, maxVolume };
}

function makePR(exerciseName, type, value, previousValue, workoutId, achievedAt, weightContext){
  const improvementPct = (previousValue>0) ? Math.round((value-previousValue)/previousValue*1000)/10 : null;
  return {
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    exerciseName, type, value, previousValue, improvementPct, workoutId, achievedAt,
    weightContext: weightContext!=null ? weightContext : null
  };
}

/* Runs once per finished session, against bests computed from PRIOR history only
   (the session being detected hasn't been pushed to workoutLog yet), so re-finishing
   or re-rendering never produces duplicate PRs. */

function detectPRs(session, workoutId, finishedAt, sessionVolume){
  const { bests, maxVolume } = computeHistoricalBests();
  const newPRs = [];

  (session.exercises||[]).forEach(ex=>{
    const validSets = (ex.sets||[]).filter(s=>{
      if(!isCountingSet(s)) return false;
      const w = parseFloat(s.weight), r = parseFloat(s.reps);
      return !isNaN(w) && !isNaN(r) && r>0;
    });
    if(!validSets.length) return;

    // Best set of THIS session for this exercise: highest weight, tie-break by higher reps
    let bestSet = validSets[0];
    validSets.forEach(s=>{
      const w = parseFloat(s.weight), bw = parseFloat(bestSet.weight);
      if(w>bw || (w===bw && parseFloat(s.reps)>parseFloat(bestSet.reps))) bestSet = s;
    });
    const w = parseFloat(bestSet.weight), r = parseFloat(bestSet.reps);
    const orm = estimatedOneRM(w, r);
    const prior = bests[ex.name] || { weight:0, oneRM:0, repsAtWeight:{} };

    if(w > prior.weight){
      newPRs.push(makePR(ex.name, "weight", w, prior.weight, workoutId, finishedAt));
    }
    if(orm > prior.oneRM){
      newPRs.push(makePR(ex.name, "1rm", Math.round(orm*10)/10, Math.round(prior.oneRM*10)/10, workoutId, finishedAt));
    }
    const priorRepsAtThisWeight = prior.repsAtWeight[String(w)] || 0;
    if(r > priorRepsAtThisWeight){
      newPRs.push(makePR(ex.name, "reps", r, priorRepsAtThisWeight, workoutId, finishedAt, w));
    }
  });

  if(sessionVolume > maxVolume && sessionVolume > 0){
    newPRs.push(makePR(null, "volume", Math.round(sessionVolume), Math.round(maxVolume), workoutId, finishedAt));
  }
  return newPRs;
}

function prTypeLabel(pr){
  if(pr.type==="weight") return "Heaviest Weight";
  if(pr.type==="1rm") return "Est. 1RM";
  if(pr.type==="reps") return "Most Reps @ "+displayW(pr.weightContext)+wUnit();
  if(pr.type==="volume") return "Session Volume";
  return pr.type;
}

function prValueLabel(pr){
  if(pr.type==="reps") return pr.value+" reps";
  if(pr.type==="volume") return displayW(pr.value,0).toLocaleString()+" "+wUnit();
  return displayW(pr.value)+" "+wUnit();
}

/* =========================================================
   EXERCISE PICKER — full-screen searchable "Add Exercise" flow
========================================================= */

function nextSetType(t){
  const i = SET_TYPE_CYCLE.indexOf(t||"working");
  return SET_TYPE_CYCLE[(i+1) % SET_TYPE_CYCLE.length];
}
/* Volume/PR-eligible sets exclude warm-ups (standard practice — warmups don't represent
   a working effort). Backward-compatible: sets logged before this feature have no `type`
   field and are treated as "working". */

function isCountingSet(set){ return (set.type||"working") !== "warmup"; }

function computeSessionVolume(exercises){
  let v = 0;
  (exercises||[]).forEach(ex=> (ex.sets||[]).forEach(s=>{
    if(!isCountingSet(s)) return;
    const w = parseFloat(s.weight), r = parseFloat(s.reps);
    if(!isNaN(w) && !isNaN(r)) v += w*r;
  }));
  return v;
}

function getPreviousSet(exerciseName, setIndex){
  for(const sess of state.workoutLog){
    const ex = sess.exercises.find(e=>e.name===exerciseName);
    if(ex && ex.sets.length){
      const set = ex.sets[setIndex] || ex.sets[ex.sets.length-1];
      if(set && (set.weight||set.reps)) return set;
    }
  }
  return null;
}

function sessionMuscles(exercises){
  const set = new Set();
  exercises.forEach(ex=> set.add(getMuscle(ex.name)));
  return Array.from(set);
}

function sessionTitle(s){
  return (s && s.title && s.title.trim()) ? s.title.trim() : "Workout";
}

/* Shared debounce for expensive re-render-on-keystroke handlers (search inputs).
   Keyed by name so multiple independent debounced actions don't clobber each other. */

function exerciseHistoryEntries(name){
  return state.workoutLog
    .filter(s=> s.exercises.some(e=>e.name===name))
    .map(s=>{
      const ex = s.exercises.find(e=>e.name===name);
      const prsThisSession = state.prs.filter(p=> p.workoutId===s.id && p.exerciseName===name);
      return { date:s.date, title: sessionTitle(s), sets: ex.sets, notes: ex.notes, prs: prsThisSession };
    });
}

function exercisePRs(name){
  return state.prs.filter(p=>p.exerciseName===name).sort((a,b)=>b.achievedAt-a.achievedAt);
}

function activityDates(){
  // Set of "YYYY-MM-DD" strings with any logged activity (plan completions or freestyle sessions)
  const dates = new Set();
  Object.values(state.completed).forEach(ts=> dates.add(new Date(ts).toISOString().slice(0,10)));
  state.workoutLog.forEach(s=> dates.add(s.date));
  return dates;
}

function computeStreak(){
  const dates = activityDates();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0,0,0,0);
  // if today has no activity yet, start counting from yesterday (still an active streak)
  if(!dates.has(cursor.toISOString().slice(0,10))) cursor.setDate(cursor.getDate()-1);
  while(dates.has(cursor.toISOString().slice(0,10))){
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

function computeMuscleDistribution(daysBack, offsetDays){
  // offsetDays=0 => most recent `daysBack` days. offsetDays=daysBack => the period before that.
  const now = Date.now();
  const end = now - offsetDays*86400000;
  const start = end - daysBack*86400000;
  const counts = {}; RADAR_MUSCLES.forEach(m=> counts[m]=0);

  Object.entries(state.completed).forEach(([key, ts])=>{
    if(ts < start || ts > end) return;
    const [wk,,exName] = key.split("|");
    const broad = FINE_TO_BROAD[getMuscle(exName)];
    if(broad){
      const presc = getPlanPresc(Number(wk), key.split("|")[1], exName);
      counts[broad] += parseSets(presc);
    }
  });
  state.workoutLog.forEach(s=>{
    const t = new Date(s.date).getTime();
    if(t < start || t > end) return;
    s.exercises.forEach(ex=>{
      const broad = FINE_TO_BROAD[getMuscle(ex.name)];
      if(broad) counts[broad] += ex.sets.length;
    });
  });
  return counts;
}

// Fine-grained per-muscle set counts within [startTs, endTs), for the Body Distribution table

function computeMuscleDistributionFine(startTs, endTs){
  const counts = {}; BODY_MUSCLES.forEach(m=> counts[m]=0);
  Object.entries(state.completed).forEach(([key, ts])=>{
    if(ts < startTs || ts >= endTs) return;
    const [wk,day,exName] = key.split("|");
    const muscle = getMuscle(exName);
    if(counts.hasOwnProperty(muscle)){
      const presc = getPlanPresc(Number(wk), day, exName);
      counts[muscle] += parseSets(presc);
    }
  });
  state.workoutLog.forEach(s=>{
    const t = new Date(s.date).getTime();
    if(t < startTs || t >= endTs) return;
    s.exercises.forEach(ex=>{
      const muscle = getMuscle(ex.name);
      if(counts.hasOwnProperty(muscle)) counts[muscle] += ex.sets.length;
    });
  });
  return counts;
}

/* Monday-start week boundaries for a given offset (0 = current week, 1 = last week, ...) */

function weekRange(weekOffset){
  const now = new Date();
  const day = (now.getDay()+6)%7; // Mon=0
  const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate()-day-7*weekOffset);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+7);
  return { start: monday, end: sunday };
}

function thisWeekStats(){
  const now = Date.now();
  const cutoff = now - 7*86400000;
  const sessionsThisWeek = state.workoutLog.filter(s=> new Date(s.date).getTime() >= cutoff);
  const trainingMinutes = sessionsThisWeek.reduce((a,s)=>a+(s.durationMin||0), 0);
  const weeklyVolume = sessionsThisWeek.reduce((a,s)=>a+(s.volume||0), 0);
  const caloriesBurned = Math.round(trainingMinutes * ACTIVITY_KCAL_PER_MIN);

  const hyroxDaySet = new Set();
  Object.entries(state.completed).forEach(([key,ts])=>{
    if(ts>=cutoff){ const [wk,day] = key.split("|"); hyroxDaySet.add(wk+"|"+day); }
  });

  return {
    workoutsCompleted: sessionsThisWeek.length,
    workoutsGoal: state.profile.trainingDays || null, // real user setting from onboarding, or null if never set
    trainingMinutes,
    weeklyVolume: Math.round(weeklyVolume),
    caloriesBurned,
    currentStreak: computeStreak(),
    hyroxSessions: hyroxDaySet.size
  };
}

function computeWeeklyActivity(weeks=8){
  const buckets = Array.from({length:weeks},(_,i)=>({duration:0, volume:0, sets:0}));
  const now = Date.now();
  state.workoutLog.forEach(s=>{
    const t = new Date(s.date).getTime();
    const idx = Math.floor((now - t) / (7*86400000));
    if(idx>=0 && idx<weeks){
      const b = buckets[weeks-1-idx];
      b.duration += s.durationMin || 0;
      b.volume += s.volume || 0;
      b.sets += s.exercises.reduce((a,ex)=>a+ex.sets.length,0);
    }
  });
  Object.values(state.completed).forEach((ts,i)=>{
    const idx = Math.floor((now - ts) / (7*86400000));
    if(idx>=0 && idx<weeks){
      buckets[weeks-1-idx].sets += 1; // rough count; plan sets already reflected via radar, this is activity volume proxy
    }
  });
  return buckets;
}

/* --- SVG radar chart --- */

function totalLifetimeVolume(){ return state.workoutLog.reduce((a,s)=>a+(s.volume||0),0); }

function totalWorkingSets(){ return state.workoutLog.reduce((a,s)=>a+s.exercises.reduce((x,e)=>x+e.sets.filter(isCountingSet).length,0),0); }

const ACHIEVEMENT_DEFS = [
  { id:"first_workout", name:"First Workout", desc:"Complete your first freestyle workout.", check:()=> state.workoutLog.length>=1 },
  { id:"workouts_5", name:"5 Workouts", desc:"Log 5 freestyle workouts.", check:()=> state.workoutLog.length>=5 },
  { id:"workouts_10", name:"10 Workouts", desc:"Log 10 freestyle workouts.", check:()=> state.workoutLog.length>=10 },
  { id:"workouts_25", name:"25 Workouts", desc:"Log 25 freestyle workouts.", check:()=> state.workoutLog.length>=25 },
  { id:"workouts_50", name:"50 Workouts", desc:"Log 50 freestyle workouts.", check:()=> state.workoutLog.length>=50 },
  { id:"workouts_100", name:"100 Workouts", desc:"Log 100 freestyle workouts.", check:()=> state.workoutLog.length>=100 },
  { id:"workouts_250", name:"250 Workouts", desc:"Log 250 freestyle workouts.", check:()=> state.workoutLog.length>=250 },
  { id:"workouts_500", name:"500 Workouts", desc:"Log 500 freestyle workouts.", check:()=> state.workoutLog.length>=500 },
  { id:"first_pr", name:"First Personal Record", desc:"Set your first PR.", check:()=> state.prs.length>=1 },
  { id:"first_100kg", name:"First 100kg Lift", desc:"Hit 100kg or more on any lift.", check:()=> state.prs.some(p=>p.type==="weight" && p.value>=100) },
  { id:"sets_100", name:"100 Working Sets", desc:"Log 100 working sets total.", check:()=> totalWorkingSets()>=100 },
  { id:"volume_1m", name:"1,000,000kg Lifetime Volume", desc:"Move a million kg over your lifetime.", check:()=> totalLifetimeVolume()>=1000000 },
  { id:"hyrox_week1", name:"Complete HYROX Week 1", desc:"Finish every session in Week 1 of the program.", check:()=> weekProgress(WEEKS[0])===100 },
  { id:"hyrox_full_program", name:"Complete 8-Week HYROX Program", desc:"Finish the entire 8-week structured program.", check:()=> overallPlanProgress()===100 },
  { id:"streak_3", name:"3-Day Streak", desc:"Train 3 days in a row.", check:()=> computeStreak()>=3 },
  { id:"streak_7", name:"7-Day Streak", desc:"Train 7 days in a row.", check:()=> computeStreak()>=7 },
  { id:"streak_14", name:"14-Day Streak", desc:"Train 14 days in a row.", check:()=> computeStreak()>=14 },
  { id:"streak_30", name:"30-Day Streak", desc:"Train 30 days in a row.", check:()=> computeStreak()>=30 },
  { id:"streak_60", name:"60-Day Streak", desc:"Train 60 days in a row.", check:()=> computeStreak()>=60 },
  { id:"streak_100", name:"100-Day Streak", desc:"Train 100 days in a row.", check:()=> computeStreak()>=100 }
];

/* Call after any action that could unlock an achievement (finish workout,
   check off a plan exercise). Idempotent -- never re-awards or duplicates
   an achievement already in state.achievements. Returns newly unlocked ones
   so callers can show a celebration if desired. */

function checkAchievements(){
  const unlockedIds = new Set(state.achievements.map(a=>a.id));
  const newlyUnlocked = [];
  ACHIEVEMENT_DEFS.forEach(def=>{
    if(unlockedIds.has(def.id)) return;
    if(def.check()){
      const a = { id:def.id, name:def.name, desc:def.desc, achievedAt: Date.now() };
      state.achievements.push(a);
      newlyUnlocked.push(a);
    }
  });
  return newlyUnlocked;
}

function computeLongestStreak(){
  const dates = Array.from(activityDates()).sort();
  if(dates.length===0) return 0;
  let longest = 1, cur = 1;
  for(let i=1;i<dates.length;i++){
    const prev = new Date(dates[i-1]);
    const currD = new Date(dates[i]);
    const diffDays = Math.round((currD-prev)/86400000);
    if(diffDays===1){ cur++; longest = Math.max(longest,cur); }
    else if(diffDays>1){ cur = 1; }
  }
  return longest;
}

function totalTrainingTimeMin(){
  return state.workoutLog.reduce((a,s)=>a+(s.durationMin||0), 0);
}

function workoutsPerWeekAvg(){
  if(state.workoutLog.length===0) return 0;
  const dates = state.workoutLog.map(s=>new Date(s.date)).sort((a,b)=>a-b);
  const spanDays = Math.max(1, Math.round((dates[dates.length-1]-dates[0])/86400000)+1);
  return +(state.workoutLog.length / (spanDays/7)).toFixed(1);
}

function exercisesWithHistory(){
  const names = new Set();
  state.workoutLog.forEach(s=> s.exercises.forEach(ex=>{
    if(ex.sets.some(st=>{ const w=parseFloat(st.weight), r=parseFloat(st.reps); return !isNaN(w)&&!isNaN(r)&&r>0; })) names.add(ex.name);
  }));
  return Array.from(names).sort();
}

/* Chronological best-set-per-session series for one exercise: weight + estimated 1RM over time */

function exerciseProgressTrend(name, limit=20){
  const sessions = state.workoutLog.slice().reverse(); // oldest first
  const out = [];
  sessions.forEach(s=>{
    const ex = s.exercises.find(e=>e.name===name);
    if(!ex) return;
    const validSets = ex.sets.filter(st=>{
      const w=parseFloat(st.weight), r=parseFloat(st.reps);
      return !isNaN(w) && !isNaN(r) && r>0 && isCountingSet(st);
    });
    if(!validSets.length) return;
    let best = validSets[0];
    validSets.forEach(st=>{
      const w=parseFloat(st.weight), bw=parseFloat(best.weight);
      if(w>bw || (w===bw && parseFloat(st.reps)>parseFloat(best.reps))) best = st;
    });
    const w = parseFloat(best.weight), r = parseFloat(best.reps);
    out.push({date:s.date, weight:w, oneRM: Math.round(estimatedOneRM(w,r)*10)/10});
  });
  return out.slice(-limit);
}

function monthlyComparison(){
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;
  function statsFor(monthKey){
    const sessions = state.workoutLog.filter(s=>s.date.startsWith(monthKey));
    return {
      sessions: sessions.length,
      volume: Math.round(sessions.reduce((a,s)=>a+(s.volume||0),0)),
      minutes: sessions.reduce((a,s)=>a+(s.durationMin||0),0)
    };
  }
  return { thisMonth: statsFor(thisMonthKey), lastMonth: statsFor(lastMonthKey) };
}

/* =========================================================
   NUTRITION — food/water logging, macro & calorie targets, and the
   body-metric calculators (BMR, LBM, ideal weight, body fat, HR zones).
========================================================= */

function profileMaintenance(){
  const p = state.profile;
  return Math.round(calcBMR(p.age, p.gender, p.height, p.weight) * p.activityMultiplier);
}

function profileCalorieTarget(){
  return Math.round(profileMaintenance() + state.profile.goalDelta);
}

function calcBMR(age, gender, heightCm, weightKg){
  // Mifflin-St Jeor
  const base = 10*weightKg + 6.25*heightCm - 5*age;
  return gender==="male" ? base+5 : base-161;
}

function calcLBM(gender, heightCm, weightKg){
  const boer = gender==="male"
    ? 0.407*weightKg + 0.267*heightCm - 19.2
    : 0.252*weightKg + 0.473*heightCm - 48.3;
  const hume = gender==="male"
    ? 0.3281*weightKg + 0.33929*heightCm - 29.5336
    : 0.29569*weightKg + 0.41813*heightCm - 43.2933;
  return { boer, hume };
}

function calcIdealWeight(gender, heightCm){
  const inchesOver5ft = Math.max(0, (heightCm/2.54) - 60);
  const table = gender==="male"
    ? { Robinson:52+1.9*inchesOver5ft, Miller:56.2+1.41*inchesOver5ft, Devine:50+2.3*inchesOver5ft, Hamwi:48+2.7*inchesOver5ft }
    : { Robinson:49+1.7*inchesOver5ft, Miller:53.1+1.36*inchesOver5ft, Devine:45.5+2.3*inchesOver5ft, Hamwi:45.5+2.2*inchesOver5ft };
  return table;
}

function calcBodyFatNavy(gender, heightCm, neckCm, waistCm, hipCm){
  if(gender==="male"){
    return 495/(1.0324 - 0.19077*Math.log10(waistCm-neckCm) + 0.15456*Math.log10(heightCm)) - 450;
  }
  return 495/(1.29579 - 0.35004*Math.log10(waistCm+(hipCm||0)-neckCm) + 0.22100*Math.log10(heightCm)) - 450;
}

function calcHeartRateZones(age, restingHR){
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

function calcMacros(tdee){
  // Standard splits used by calculator.net-style tools
  return {
    carbs:   { lo: tdee*0.40/4, hi: tdee*0.65/4 },   // 40-65% of kcal, 4 kcal/g
    protein: { lo: tdee*0.10/4, hi: tdee*0.35/4 },   // 10-35% of kcal
    fat:     { lo: tdee*0.20/9, hi: tdee*0.35/9 },   // 20-35% of kcal, 9 kcal/g
    satFatMax: tdee*0.10/9                            // <10% kcal from saturated fat
  };
}

function calcBodyType(bust, waist, highHip, hip){
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

function foodsForDate(dateStr){ return state.foodLog.filter(f=>f.date===dateStr); }

/* Recently-logged distinct foods (most recent instance of each name), for
   one-tap re-logging instead of retyping calories/macros every time. */

function recentFoodEntries(limit=6){
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

function waterForDate(dateStr){ return state.waterLog.filter(w=>w.date===dateStr).reduce((a,w)=>a+(w.ml||0),0); }

function todayWater(){ return waterForDate(todayStr()); }

function todayEaten(){
  return foodsForDate(todayStr()).reduce((a,f)=>a+Number(f.calories||0),0);
}

function todayActivityKcal(){
  return state.workoutLog
    .filter(s=>s.date===todayStr())
    .reduce((a,s)=>a + (s.durationMin||0)*ACTIVITY_KCAL_PER_MIN, 0);
}

function todayBurned(){
  return Math.round(profileMaintenance() + todayActivityKcal());
}

function todayMacros(){
  const t = {protein:0, carbs:0, fat:0, fibre:0};
  foodsForDate(todayStr()).forEach(f=>{
    t.protein += Number(f.protein||0);
    t.carbs += Number(f.carbs||0);
    t.fat += Number(f.fat||0);
    t.fibre += Number(f.fibre||0);
  });
  return t;
}

function macroTargets(){
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

function last7DaysCalories(){
  const out = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const kcal = foodsForDate(ds).reduce((a,f)=>a+Number(f.calories||0),0);
    out.push({label: d.toLocaleDateString('default',{weekday:'short'}), date: ds, kcal});
  }
  return out;
}

function bodyWeightTrend(limit=20){
  return state.bodylog.slice().reverse() // bodylog is stored newest-first; reverse to chronological
    .filter(e=>e.weight)
    .map(e=>({date:e.date, value:Number(e.weight)}))
    .slice(-limit);
}

/* All exercise names that have at least one completed weighted set in history — for the exercise picker */

function calorieProteinTrend(days=30){
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

/* =========================================================
   SETTINGS — theme application and the Settings tab (toggles, water
   target, weight unit, notifications, CSV import, danger zone).
========================================================= */

function applyTheme(){
  const pref = state.settings.theme || "dark";
  const resolved = pref==="system"
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : pref;
  document.documentElement.setAttribute("data-theme", resolved);
}

function settingToggle(key, label, desc){
  const on = !!state.settings[key];
  return `<div style="padding:14px 0;border-bottom:1px solid var(--border);">
    <div class="row-between">
      <span style="font-weight:700;font-size:15px;">${label}</span>
      <button data-setting-toggle="${key}" style="width:46px;height:26px;border-radius:13px;border:none;cursor:pointer;position:relative;background:${on?'var(--steel)':'var(--surface-alt)'};transition:background .15s;">
        <span style="position:absolute;top:3px;${on?'right:3px':'left:3px'};width:20px;height:20px;border-radius:50%;background:${on?'#fff':'#6a6a74'};"></span>
      </button>
    </div>
    ${desc?`<div style="font-size:12px;color:var(--muted);margin-top:4px;max-width:85%;">${desc}</div>`:""}
  </div>`;
}

/* =========================================================
   ONBOARDING — shown once, only for genuinely new installs
========================================================= */

function renderSettingsTab(){
  const s = state.settings;
  return `
    <div class="eyebrow-label" style="margin-top:4px;">Export Data</div>
    <div class="info-box" style="padding:14px;">
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Export your entire workout and measurement history. The JSON backup can be imported back; CSVs are for spreadsheets.</div>
      <button class="btn btn-accent btn-block" data-action="export-json" style="margin-bottom:8px;">Full Backup (JSON)</button>
      <button class="btn btn-steel btn-block" data-action="export-workouts-csv" style="margin-bottom:8px;">Export Workouts (CSV)</button>
      <button class="btn btn-steel btn-block" data-action="export-measurements-csv">Export Measurements (CSV)</button>
    </div>

    <div class="eyebrow-label">Import Data</div>
    <div class="info-box" style="padding:14px;">
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Restore from a Full Backup (JSON) file. This replaces all current data in the app.</div>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none;">
      <button class="btn btn-ghost btn-block" data-action="import-json">Choose Backup File…</button>
    </div>

    <div class="eyebrow-label">Import CSV</div>
    <div class="info-box" style="padding:14px;">
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">
        Import from a spreadsheet. Three formats are auto-detected:<br>
        <b style="color:var(--text);">Exercises</b> — columns <b style="color:var(--text);">name</b>, <b style="color:var(--text);">muscle</b> (optional: cat, presc, unit). Adds to Custom Exercises only.<br>
        <b style="color:var(--text);">Workout History</b> — a Hevy-style export (title, start_time, exercise_title, set_type, weight_kg, reps, …). Adds full past workouts and backfills PRs.<br>
        <b style="color:var(--text);">Foods</b> — columns <b style="color:var(--text);">name</b>, <b style="color:var(--text);">calories</b> (optional: protein, carbs, fat, fibre). Adds to Favorite Foods for quick-add — never creates fake dated food-log entries.<br>
        Either way, this only adds — it never overwrites or deletes anything, and re-importing the same file skips what's already there.
      </div>
      <input type="file" id="import-csv" accept=".csv,text/csv" style="display:none;">
      <button class="btn btn-ghost btn-block" data-action="import-csv">Choose CSV File…</button>
      ${state.csvImportPreview ? renderCsvImportPreview() : ""}
    </div>

    <div class="eyebrow-label">Workout Settings</div>
    <div class="info-box" style="padding:0 14px;">
      ${settingToggle("sounds","Sounds","Beep when the rest timer finishes.")}
      ${settingToggle("vibration","Vibration","Vibrate when the rest timer finishes.")}
      ${settingToggle("autoStartRest","Auto-Start Rest Timer","Checking off a set automatically starts that exercise's rest timer.")}
      ${settingToggle("keepAwake","Keep Awake During Workout","Prevents your phone screen from sleeping while a session is in progress.")}
      ${settingToggle("plateCalc","Plate Calculator","Shows a plates button next to weight inputs for barbell exercises.")}
      ${settingToggle("rpeTracking","RPE Tracking","Show the RPE column in the workout logger.")}
      ${settingToggle("exerciseCalorieBudget","Exercise Calorie Budget","Add today’s real Health Connect active calories to your Food Log calorie budget.")}
      <div style="padding:14px 0;">
        <div class="row-between">
          <span style="font-weight:700;font-size:15px;">Default Rest Timer</span>
          <select class="select-input" id="default-rest-select" style="width:auto;margin:0;padding:6px 10px;">
            ${[0,30,60,90,120,150,180,240].map(v=>`<option value="${v}" ${s.defaultRest===v?'selected':''}>${v===0?'Off':v+'s'}</option>`).join("")}
          </select>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">New exercises added to a session start with this rest duration.</div>
      </div>
      <div style="padding:14px 0;">
        <div class="row-between">
          <span style="font-weight:700;font-size:15px;">Weight Unit</span>
          <div style="display:flex;gap:6px;">
            <button class="cat-chip ${s.weightUnit==='kg'?'active':''}" data-weight-unit="kg">kg</button>
            <button class="cat-chip ${s.weightUnit==='lb'?'active':''}" data-weight-unit="lb">lb</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">Applies to workout logging, body weight, and PRs. Calculators and the plate calculator stay in kg.</div>
      </div>
      <div style="padding:14px 0;">
        <div class="row-between">
          <span style="font-weight:700;font-size:15px;">Daily Water Target</span>
          <select class="select-input" id="water-target-select" style="width:auto;margin:0;padding:6px 10px;">
            ${[1500,2000,2500,3000,3500,4000].map(v=>`<option value="${v}" ${s.waterTargetMl===v?'selected':''}>${(v/1000).toFixed(1)}L</option>`).join("")}
          </select>
        </div>
      </div>
    </div>

    <div class="eyebrow-label">Appearance</div>
    <div class="info-box" style="padding:14px;">
      <div style="display:flex;gap:6px;">
        ${[{key:"dark",label:"Dark"},{key:"light",label:"Light"},{key:"system",label:"System"}].map(t=>`
          <button class="cat-chip ${s.theme===t.key?'active':''}" data-theme-select="${t.key}" style="flex:1;text-align:center;">${t.label}</button>
        `).join("")}
      </div>
    </div>

    <div class="eyebrow-label">Notifications</div>
    <div class="info-box" style="padding:0 14px;">
      <div style="font-size:12px;color:var(--muted);padding:14px 0 4px;">
        Reminders only fire while Ignyt is open in a browser tab or the installed app — mobile browsers don't allow true background notifications without a push server, so this isn't a set-and-forget alarm.
      </div>
      ${settingToggle("workoutReminders","Workout Reminders","Nudge you in the evening if you haven't logged a workout yet today.")}
      ${settingToggle("hydrationReminders","Hydration Reminders","Nudge you mid-afternoon if you're well behind your water target.")}
      ${settingToggle("weeklyReports","Weekly Reports","Show a summary of the week's training when you open the app.")}
      <div style="padding:14px 0;">
        <button class="btn btn-ghost btn-block" data-action="test-notification">Send Test Notification</button>
        ${typeof Notification!=='undefined' && Notification.permission==='denied' ? `<div style="font-size:11px;color:var(--accent);margin-top:6px;">Notifications are blocked for this site in your browser settings — re-enable them there to use reminders.</div>` : ''}
      </div>
    </div>

    <div class="eyebrow-label">Danger Zone</div>
    <div class="info-box" style="padding:14px;">
      <button class="btn btn-ghost btn-block" data-action="reset-all" style="color:#ff6b6b;">Reset All App Data</button>
    </div>
  `;
}

/* =========================================================
   EVENT HANDLERS
========================================================= */

/* =========================================================
   TOAST — a real, minimal non-blocking notification, replacing the
   native alert() calls that used to interrupt the whole page. State-
   backed (like the PR/achievement celebration banners elsewhere in
   this app) so it survives the normal render() cycle rather than
   needing separate DOM lifecycle management, and auto-dismisses.
   render is passed in by ui/index.js at call time to avoid a hard
   circular import at module-evaluation time.
========================================================= */
let _toastTimer = null;

function showToast(message, type='info', renderFn){
  const id = Date.now();
  state.toast = { id, message, type };
  if(renderFn) renderFn();
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{
    if(state.toast && state.toast.id===id){
      state.toast = null;
      if(renderFn) renderFn();
    }
  }, 3200);
}

function dismissToast(renderFn){
  clearTimeout(_toastTimer);
  state.toast = null;
  if(renderFn) renderFn();
}

function renderToast(){
  if(!state.toast) return "";
  const t = state.toast;
  const color = t.type==='error' ? 'var(--accent)' : t.type==='success' ? 'var(--mint)' : 'var(--steel)';
  return `<div class="toast" style="border-left:3px solid ${color};" data-action="dismiss-toast">${t.message}</div>`;
}

/* =========================================================
   DIALOGS — a real, in-app confirmation dialog replacing the native
   confirm() calls used for destructive actions (delete workout, reset
   all data, abort race, etc.). Promise-based so call sites read almost
   the same as the confirm() they replace: `if(await confirmDialog(msg))`.
   State-backed and rendered as part of the normal render() output,
   positioned as a sibling overlay (not nested inside anything a click
   needs to bubble through) so the backdrop-click-to-cancel pattern
   works the same way the exercise-menu backdrop already does elsewhere.
========================================================= */
let _resolver = null;

function confirmDialog(message, renderFn){
  return new Promise(resolve=>{
    _resolver = resolve;
    state.confirmDialog = { message };
    if(renderFn) renderFn();
  });
}

function resolveConfirmDialog(result, renderFn){
  state.confirmDialog = null;
  const r = _resolver;
  _resolver = null;
  if(renderFn) renderFn();
  if(r) r(result);
}

function renderConfirmDialog(){
  if(!state.confirmDialog) return "";
  return `
    <div class="dialog-backdrop" data-dialog-action="cancel"></div>
    <div class="dialog-box">
      <div class="dialog-message">${state.confirmDialog.message}</div>
      <div class="dialog-actions">
        <button class="btn btn-ghost" data-dialog-action="cancel">Cancel</button>
        <button class="btn btn-accent" data-dialog-action="confirm">Confirm</button>
      </div>
    </div>
  `;
}

/* =========================================================
   DASHBOARD — the Home tab: greeting, today's HYROX day, quick stats,
   PR/achievement celebration banners, and the contextual reminder logic.
========================================================= */

function renderHomeTab(){
  maybeShowReminders();
  const week = WEEKS[state.activeWeek-1];
  const plannedDay = todaysPlannedDay();
  const planPct = overallPlanProgress();
  const streak = computeStreak();
  const targets = macroTargets();
  const eaten = Math.round(todayEaten());
  const proteinToday = Math.round(todayMacros().protein);
  const latestWeight = state.bodylog[0];
  const dateStr = new Date().toLocaleDateString('default',{weekday:'long', month:'long', day:'numeric'});

  let dayDone = 0, dayTotal = 0;
  if(plannedDay){
    dayTotal = plannedDay.exercises.length;
    dayDone = plannedDay.exercises.filter(ex=> state.completed[`${week.week}|${plannedDay.day}|${ex.name}`]).length;
  }

  return `
    <div style="margin-bottom:4px;">
      <div style="font-size:13px;color:var(--muted);font-weight:600;">${greeting()}${state.profile.name?', '+state.profile.name:''}</div>
      <div style="font-size:18px;font-weight:800;">${dateStr}</div>
    </div>
    ${state.lastUnlockedAchievements && state.lastUnlockedAchievements.length ? renderAchievementCelebration() : ""}
    ${state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ""}

    <div class="info-box" style="padding:16px;margin-top:12px;">
      <div class="row-between" style="margin-bottom:8px;">
        <span class="eyebrow-label" style="margin:0;">Week ${week.week} of 8 — ${LEVELS[state.activeLevel].label}</span>
        <span class="mono" style="font-size:12px;color:var(--accent);font-weight:800;">${planPct}%</span>
      </div>
      <div class="progress-track" style="height:8px;margin-bottom:12px;"><div class="progress-fill" style="width:${planPct}%;"></div></div>
      ${plannedDay ? `
        <div class="row-between">
          <div>
            <div style="font-weight:800;font-size:16px;">${plannedDay.session}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">${plannedDay.exercises.length} exercises${dayDone>0?` · ${dayDone}/${dayTotal} done`:''}</div>
          </div>
          <span class="phase-pill">${week.phaseLabel.split(' — ')[0]}</span>
        </div>
        <button class="btn btn-accent btn-block" data-home-day="${week.days.indexOf(plannedDay)}" style="margin-top:12px;">${dayDone>0 && dayDone<dayTotal ? 'Continue Workout' : dayDone===dayTotal ? 'View Completed Day' : "Start Today's Workout"}</button>
      ` : `
        <div style="font-weight:800;font-size:16px;">Rest Day</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">No session scheduled — recovery, mobility, or an easy walk.</div>
      `}
    </div>

    <div class="grid2" style="margin-top:12px;">
      <div class="stat-card"><div class="stat-label">Streak</div><div class="stat-value" style="color:var(--accent);">🔥 ${streak}<span class="stat-unit">days</span></div></div>
      <div class="stat-card"><div class="stat-label">Weight</div><div class="stat-value" style="color:var(--steel);">${displayW(latestWeight?latestWeight.weight:state.profile.weight)}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Calories Today</div><div class="stat-value" style="color:var(--text);">${eaten}<span class="stat-unit">/ ${targets.kcal}</span></div></div>
      <div class="stat-card"><div class="stat-label">Protein Today</div><div class="stat-value" style="color:var(--text);">${proteinToday}<span class="stat-unit">/ ${Math.round(targets.protein)}g</span></div></div>
      ${state.prs.length ? `<div class="stat-card" style="grid-column:1/-1;"><div class="stat-label">Latest PR</div><div class="stat-value" style="color:var(--accent);font-size:16px;">🏆 ${state.prs[0].exerciseName||'Session Volume'} — ${prValueLabel(state.prs[0])}<span class="stat-unit" style="display:block;margin-top:2px;">${prTypeLabel(state.prs[0])}</span></div></div>` : ''}
    </div>

    <div class="eyebrow-label">This Week</div>
    <div class="day-tabs" style="margin-bottom:16px;">
      ${week.days.map((d,i)=>{
        const pct = d.exercises.length ? Math.round(d.exercises.filter(ex=>state.completed[`${week.week}|${d.day}|${ex.name}`]).length/d.exercises.length*100) : 0;
        return `<button class="day-tab ${pct===100?'active':''}" data-home-day="${i}" style="opacity:${pct===100?1:.85};">
          <div class="dtop">${d.day.toUpperCase()}</div><div class="dbot">${pct===100?'✓ Done':pct>0?pct+'%':d.session.split(' ')[0]}</div>
        </button>`;
      }).join("")}
    </div>

    <div class="eyebrow-label">Quick Actions</div>
    <div class="grid2" style="margin-bottom:8px;">
      <button class="btn btn-steel" data-nav="workout" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('workout',16)} Start Workout</button>
      <button class="btn btn-steel" data-nav="body" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('body',16)} Log Weight</button>
      <button class="btn btn-steel" data-nav="nutrition" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('nutrition',16)} Log Food</button>
      <button class="btn btn-steel" data-nav="progress" style="display:flex;align-items:center;justify-content:center;gap:8px;">${svg('progress',16)} View Progress</button>
    </div>

    ${renderHomeHealthFeed()}
  `;
}

function greeting(){
  const h = new Date().getHours();
  if(h<5) return "Still up?";
  if(h<12) return "Good morning";
  if(h<17) return "Good afternoon";
  if(h<21) return "Good evening";
  return "Winding down?";
}

/* Contextual, in-session reminders only -- fires while the app is open, since
   mobile browsers don't allow true background notifications for PWAs without
   a push server. Dedup'd via stored dates so each fires at most once per
   day (workout/hydration) or once per 7 days (weekly report). */

function maybeShowReminders(){
  if(typeof Notification==='undefined' || Notification.permission!=='granted') return;
  const today = todayStr();
  const now = new Date();
  let changed = false;

  if(state.settings.workoutReminders && state.settings.lastWorkoutReminderDate!==today){
    const hasWorkoutToday = state.workoutLog.some(s=>s.date===today);
    if(!hasWorkoutToday && now.getHours()>=18){
      new Notification("Ignyt", { body:"No workout logged yet today — still time to get one in.", icon:"icon-192.png" });
      state.settings.lastWorkoutReminderDate = today;
      changed = true;
    }
  }
  if(state.settings.hydrationReminders && state.settings.lastHydrationReminderDate!==today){
    const waterMl = todayWater();
    const target = state.settings.waterTargetMl || 2500;
    if(now.getHours()>=15 && waterMl < target*0.5){
      new Notification("Ignyt", { body:"You're at "+waterMl+"ml of your "+target+"ml water target today.", icon:"icon-192.png" });
      state.settings.lastHydrationReminderDate = today;
      changed = true;
    }
  }
  if(state.settings.weeklyReports){
    const last = state.settings.lastWeeklyReportAt || 0;
    if(Date.now() - last >= 7*86400000){
      const w = thisWeekStats();
      new Notification("Ignyt Weekly Report", { body: w.workoutsCompleted+" workouts · "+displayW(w.weeklyVolume,0).toLocaleString()+wUnit()+" volume · "+w.currentStreak+"-day streak", icon:"icon-192.png" });
      state.settings.lastWeeklyReportAt = Date.now();
      changed = true;
    }
  }
  if(changed) persist();
}

/* =========================================================
   NAVIGATION — the app shell: header, bottom nav, the More sheet, and
   renderApp() which dispatches to the right tab's render function.
========================================================= */

function renderApp(){
  const root = document.getElementById("app");
  const MORE_TABS = ["library","body","nutrition","settings","health"];
  const isMoreActive = MORE_TABS.includes(state.tab) || state.tab==="more";
  root.innerHTML = `
    <header class="app-header" style="display:flex;align-items:flex-end;justify-content:space-between;">
      <div>
        <div class="eyebrow-row"><div class="eyebrow-dash"></div><span class="eyebrow">Full Training System</span></div>
        <h1 class="title">IGNYT</h1>
      </div>
      <button data-nav="settings" aria-label="Settings" style="background:${state.tab==='settings'?'var(--surface-alt)':'none'};border:none;color:${state.tab==='settings'?'var(--accent)':'var(--muted)'};padding:8px;border-radius:10px;cursor:pointer;">${svg('gear',22)}</button>
    </header>
    <main id="main"></main>
    ${renderTimerOverlay()}
    ${renderToast()}
    ${renderConfirmDialog()}
    ${state.tab==="more" ? renderMoreSheet() : ""}
    <nav class="bottom-nav">
      ${navBtn("home","Home")}
      ${navBtn("plan","Plan")}
      ${navBtn("workout","Workout")}
      ${navBtn("progress","Progress")}
      <button class="nav-btn ${isMoreActive?'active':''}" data-nav="more">${svg('more')}<span>More</span></button>
    </nav>
  `;
  const main = document.getElementById("main");
  if(state.tab==="home") main.innerHTML = renderHomeTab();
  if(state.tab==="plan") main.innerHTML = renderPlanTab();
  if(state.tab==="workout") main.innerHTML = renderWorkoutTab();
  if(state.tab==="library") main.innerHTML = renderLibraryTab();
  if(state.tab==="body") main.innerHTML = renderBodyTab();
  if(state.tab==="nutrition") main.innerHTML = renderNutritionTab();
  if(state.tab==="progress") main.innerHTML = renderProgressTab();
  if(state.tab==="settings") main.innerHTML = renderSettingsTab();
  if(state.tab==="health") main.innerHTML = renderHealthDashboard();
  if(state.tab==="more") main.innerHTML = ""; // sheet covers it
  attachHandlers();
  persist();
}

/* Fallback UI so a runtime error never leaves a blank screen. Self-contained —
   doesn't rely on attachHandlers() or any state that may itself be broken. */

function renderMoreSheet(){
  const items = [
    {id:"library", label:"Library", desc:"Exercises & equipment", color:"var(--steel)", icon:"library"},
    {id:"body", label:"Body", desc:"Weight & measurements", color:"var(--accent)", icon:"body"},
    {id:"nutrition", label:"Fuel", desc:"Meals, calories, macros", color:"var(--mint)", icon:"nutrition"},
    {id:"settings", label:"Settings", desc:"Backups & preferences", color:"var(--muted)", icon:"gear"},
    {id:"health", label:"Health Connect", desc:"Steps, heart rate, calories, weight, workouts", color:"var(--mint)", icon:"progress"}
  ];
  return `<div class="more-sheet-backdrop" data-close-more>
    <div class="more-sheet">
      <div class="more-sheet-handle"></div>
      <div class="eyebrow-label" style="margin-top:0;margin-bottom:14px;">More</div>
      <div class="more-sheet-grid">
        ${items.map(it=>`<button class="more-sheet-card" data-nav="${it.id}">
          <span class="more-sheet-icon-badge" style="background:${it.color}22;color:${it.color};">${svg(it.icon,22)}</span>
          <div style="font-weight:800;font-size:15px;margin-top:10px;">${it.label}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${it.desc}</div>
        </button>`).join("")}
      </div>
    </div>
  </div>`;
}

/** Format a Health Connect metric value for display. Returns the literal string
 *  "No data available" only when the field itself is missing/null (native read failed
 *  or no permission) -- a genuine 0 from Health Connect is shown as "0", never swapped
 *  for a fake placeholder. */
function hcFmt(value, unit, decimals) {
  if (value === null || value === undefined) return "No data available";
  const num = decimals != null ? Number(value).toFixed(decimals) : value;
  return `${num}${unit ? " " + unit : ""}`;
}

/* =========================================================
   LIGHTWEIGHT SVG MINI-CHARTS -- no charting library, just small reusable
   string-generating functions. Every one of these only draws what real
   data it's given; none of them fabricate points to fill a shape.
========================================================= */

function svgLineChart(values, width, height) {
  if (!values || values.length < 2) return `<svg width="${width}" height="${height}"></svg>`;
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => `${(i*stepX).toFixed(1)},${(height - ((v-min)/range)*height*0.85 - height*0.05).toFixed(1)}`).join(" ");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function svgBarChart(values, width, height) {
  if (!values || values.length === 0) return `<svg width="${width}" height="${height}"></svg>`;
  const max = Math.max(...values, 1);
  const gap = 3;
  const barW = (width - gap * (values.length - 1)) / values.length;
  const bars = values.map((v, i) => {
    const h = Math.max(2, (v / max) * height * 0.9);
    return `<rect x="${(i*(barW+gap)).toFixed(1)}" y="${(height-h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="var(--steel)"/>`;
  }).join("");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
}

function svgSleepStages(stages, width, height) {
  if (!stages || !stages.length) return `<svg width="${width}" height="${height}"></svg>`;
  const total = stages.reduce((s, x) => s + x.minutes, 0) || 1;
  const colorFor = { awake: "var(--muted)", light: "var(--steel)", deep: "var(--accent)", rem: "var(--mint)", other: "var(--border)" };
  let x = 0;
  const rects = stages.filter(s => s.minutes > 0).map(s => {
    const w = (s.minutes / total) * width;
    const rect = `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="${colorFor[s.stage]||'var(--border)'}"/>`;
    x += w;
    return rect;
  }).join("");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="border-radius:4px;overflow:hidden;">${rects}</svg>`;
}

function hcTimeAgo(isoString) {
  if (!isoString) return "";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs/24)} day${Math.round(hrs/24)===1?'':'s'} ago`;
}

/** One large metric card matching the reference layout: name, source/time-range label,
 *  value, "time ago" label, mini chart, tap affordance. Any card with no real value shows
 *  "No data" and skips the chart entirely, rather than drawing an empty/fake one. */
function hcCard(opts) {
  const { label, rangeLabel, value, unit, timeLabel, chartHtml, hasData, source } = opts;
  const sourceLabel = source || "Health Connect"; // real metadata when available, honest fallback otherwise -- never hardcoded to one provider
  return `
    <button class="hc-home-card" data-nav="health" style="width:100%;text-align:left;background:var(--surface);border:none;border-radius:16px;padding:16px;margin-bottom:12px;cursor:pointer;display:block;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <span style="font-size:15px;font-weight:800;">${label}</span>
        <span style="color:var(--muted);font-size:16px;line-height:1;">\u203a</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${rangeLabel}${rangeLabel && sourceLabel ? ' &middot; ' : ''}${sourceLabel}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:10px;">
        <div style="flex:1;min-width:0;">
          ${hasData ? `
            <div style="font-size:26px;font-weight:900;">${value}<span style="font-size:13px;font-weight:600;color:var(--muted);margin-left:4px;">${unit||''}</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">${timeLabel}</div>
          ` : `<div style="font-size:14px;color:var(--muted);">No data</div>`}
        </div>
        ${hasData && chartHtml ? `<div style="flex-shrink:0;">${chartHtml}</div>` : ''}
      </div>
    </button>`;
}

/** The scrollable Health Connect card feed on Home. Reads from the fast local cache first
 *  (hx_hc_dashboard_cache) so Home never blocks on a native call, then whatever's in
 *  HealthConnectIntegration's in-memory _syncData if that's more recent (e.g. user just hit
 *  Sync elsewhere). Never calls into Health Connect itself, never requests permissions --
 *  purely a display of whatever's already been synced. */
function renderHomeHealthFeed() {
  if (!window.HealthConnect || !HealthConnect.isNativeAndroid()) return ""; // web version: omit entirely, not a broken card

  const integ = window.HealthConnectIntegration;
  const hcState = integ ? integ.loadState() : { connected: false };
  if (!hcState.connected) return ""; // not connected yet -- the More > Health Connect entry point covers that flow, Home stays uncluttered

  let cache = null;
  try { cache = JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null"); } catch (e) { /* ignore */ }
  const liveData = integ ? integ.getSyncData() : null;
  const d = liveData || cache;
  if (!d) return `<div class="eyebrow-label">Health Connect</div><div class="info-box" style="padding:14px;font-size:13px;color:var(--muted);">Tap Sync in Health Connect to see your data here.</div>`;

  const cards = [];

  cards.push(hcCard({
    label: "Steps", rangeLabel: "Today", hasData: d.steps && d.steps.steps != null,
    value: d.steps && d.steps.steps != null ? Number(d.steps.steps).toLocaleString() : null,
    timeLabel: "Today",
    chartHtml: d.steps7Days ? svgBarChart(d.steps7Days.map(p=>p.value), 90, 44) : null
  }));

  cards.push(hcCard({
    label: "Heart Rate", rangeLabel: "Last 9 hours", hasData: d.heartRate && d.heartRate.latestBpm != null,
    value: d.heartRate ? Math.round(d.heartRate.latestBpm) : null, unit: "bpm",
    timeLabel: hcTimeAgo(d.heartRate && d.heartRate.latestTime), source: d.heartRate && d.heartRate.source,
    chartHtml: d.heartRateSeries && d.heartRateSeries.length > 1 ? svgLineChart(d.heartRateSeries.map(p=>p.bpm), 90, 44) : null
  }));

  if (d.sleep && d.sleep.totalMinutes != null) {
    const hrs = Math.floor(d.sleep.totalMinutes / 60), mins = d.sleep.totalMinutes % 60;
    cards.push(hcCard({
      label: "Sleep", rangeLabel: "Last night", hasData: true,
      value: `${hrs}h ${mins}m`, timeLabel: hcTimeAgo(d.sleep.endTime),
      chartHtml: svgSleepStages(d.sleep.stages, 90, 20)
    }));
  } else {
    cards.push(hcCard({ label: "Sleep", rangeLabel: "Last night", hasData: false }));
  }

  cards.push(hcCard({
    label: "Weight", rangeLabel: "Latest", hasData: d.weight && d.weight.weightKg != null,
    value: d.weight && d.weight.weightKg != null ? displayW(d.weight.weightKg) : null, unit: wUnit(),
    timeLabel: hcTimeAgo(d.weight && d.weight.time), source: d.weight && d.weight.source,
    chartHtml: d.weightHistory && d.weightHistory.length > 1 ? svgLineChart(d.weightHistory.map(p=>p.kg), 90, 44) : null
  }));

  cards.push(hcCard({
    label: "Energy Expended", rangeLabel: "Today", hasData: d.activeCalories && d.activeCalories.kcal != null,
    value: d.activeCalories && d.activeCalories.kcal != null ? Math.round(d.activeCalories.kcal).toLocaleString() : null, unit: "kcal",
    timeLabel: "Today"
  }));

  cards.push(hcCard({
    label: "Distance", rangeLabel: "Today", hasData: d.distance && d.distance.km != null,
    value: d.distance && d.distance.km != null ? d.distance.km.toFixed(2) : null, unit: "km",
    timeLabel: "Today"
  }));

  cards.push(hcCard({
    label: "Workouts", rangeLabel: "Today", hasData: d.workouts && d.workouts.count != null,
    value: d.workouts ? d.workouts.count : null, timeLabel: "Today"
  }));

  // ADDED -- the 10 newly requested metrics. Each independently checks its own field for
  // presence; one missing/failed metric never hides or breaks any other card.
  cards.push(hcCard({
    label: "Respiratory Rate", rangeLabel: "Latest", hasData: d.respiratoryRate && d.respiratoryRate.rpm != null,
    value: d.respiratoryRate && d.respiratoryRate.rpm != null ? Math.round(d.respiratoryRate.rpm) : null, unit: "rpm",
    timeLabel: hcTimeAgo(d.respiratoryRate && d.respiratoryRate.time), source: d.respiratoryRate && d.respiratoryRate.source
  }));

  cards.push(hcCard({
    label: "Blood Oxygen", rangeLabel: "Latest", hasData: d.oxygenSaturation && d.oxygenSaturation.percentage != null,
    value: d.oxygenSaturation && d.oxygenSaturation.percentage != null ? Math.round(d.oxygenSaturation.percentage) : null, unit: "%",
    timeLabel: hcTimeAgo(d.oxygenSaturation && d.oxygenSaturation.time), source: d.oxygenSaturation && d.oxygenSaturation.source
  }));

  cards.push(hcCard({
    label: "Blood Pressure", rangeLabel: "Latest", hasData: d.bloodPressure && d.bloodPressure.systolic != null,
    value: d.bloodPressure && d.bloodPressure.systolic != null ? `${Math.round(d.bloodPressure.systolic)}/${Math.round(d.bloodPressure.diastolic)}` : null, unit: "mmHg",
    timeLabel: hcTimeAgo(d.bloodPressure && d.bloodPressure.time), source: d.bloodPressure && d.bloodPressure.source
  }));

  cards.push(hcCard({
    label: "Body Temperature", rangeLabel: "Latest", hasData: d.bodyTemperature && d.bodyTemperature.celsius != null,
    value: d.bodyTemperature && d.bodyTemperature.celsius != null ? d.bodyTemperature.celsius.toFixed(1) : null, unit: "°C",
    timeLabel: hcTimeAgo(d.bodyTemperature && d.bodyTemperature.time), source: d.bodyTemperature && d.bodyTemperature.source
  }));

  cards.push(hcCard({
    label: "Body Fat", rangeLabel: "Latest", hasData: d.bodyFat && d.bodyFat.percentage != null,
    value: d.bodyFat && d.bodyFat.percentage != null ? d.bodyFat.percentage.toFixed(1) : null, unit: "%",
    timeLabel: hcTimeAgo(d.bodyFat && d.bodyFat.time), source: d.bodyFat && d.bodyFat.source
  }));

  cards.push(hcCard({
    label: "Height", rangeLabel: "Latest", hasData: d.height && d.height.meters != null,
    value: d.height && d.height.meters != null ? Math.round(d.height.meters * 100) : null, unit: "cm",
    timeLabel: hcTimeAgo(d.height && d.height.time), source: d.height && d.height.source
  }));

  cards.push(hcCard({
    label: "Lean Body Mass", rangeLabel: "Latest", hasData: d.leanBodyMass && d.leanBodyMass.kg != null,
    value: d.leanBodyMass && d.leanBodyMass.kg != null ? displayW(d.leanBodyMass.kg) : null, unit: wUnit(),
    timeLabel: hcTimeAgo(d.leanBodyMass && d.leanBodyMass.time), source: d.leanBodyMass && d.leanBodyMass.source
  }));

  cards.push(hcCard({
    label: "Basal Metabolic Rate", rangeLabel: "Latest", hasData: d.basalMetabolicRate && d.basalMetabolicRate.kcalPerDay != null,
    value: d.basalMetabolicRate && d.basalMetabolicRate.kcalPerDay != null ? Math.round(d.basalMetabolicRate.kcalPerDay).toLocaleString() : null, unit: "kcal/day",
    timeLabel: hcTimeAgo(d.basalMetabolicRate && d.basalMetabolicRate.time), source: d.basalMetabolicRate && d.basalMetabolicRate.source
  }));

  cards.push(hcCard({
    label: "Hydration", rangeLabel: "Today", hasData: d.hydration && d.hydration.liters != null,
    value: d.hydration && d.hydration.liters != null ? d.hydration.liters.toFixed(2) : null, unit: "L",
    timeLabel: "Today"
  }));

  cards.push(hcCard({
    label: "Nutrition", rangeLabel: "Today", hasData: d.nutrition && d.nutrition.kcal != null,
    value: d.nutrition && d.nutrition.kcal != null ? Math.round(d.nutrition.kcal).toLocaleString() : null, unit: "kcal",
    timeLabel: d.nutrition ? `${Math.round(d.nutrition.proteinG||0)}g protein &middot; ${Math.round(d.nutrition.carbsG||0)}g carbs &middot; ${Math.round(d.nutrition.fatG||0)}g fat` : "Today"
  }));

  return `<div class="eyebrow-label">Health Connect</div>${cards.join("")}`;
}

function hcInsightTile(label, value, unit, period) {
  const text = value == null ? "No data" : `${value}${unit ? ` <span class="stat-unit">${unit}</span>` : ""}`;
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value" style="font-size:${value == null ? '13px' : '20px'};color:${value == null ? 'var(--muted)' : 'var(--text)'};">${text}</div><div style="font-size:10px;color:var(--muted);margin-top:2px;font-weight:700;text-transform:uppercase;">${period}</div></div>`;
}

function renderHealthInsightMetrics(d, period) {
  const sleep = d.sleep && d.sleep.totalMinutes != null ? `${Math.floor(d.sleep.totalMinutes / 60)}h ${d.sleep.totalMinutes % 60}m` : null;
  const n = d.nutrition;
  const metrics = [
    ["Steps", d.steps?.steps != null ? Number(d.steps.steps).toLocaleString() : null, ""],
    ["Heart Rate", d.heartRate?.latestBpm != null ? Math.round(d.heartRate.latestBpm) : null, "bpm"],
    ["Sleep", sleep, ""],
    ["Active Calories", d.activeCalories?.kcal != null ? Math.round(d.activeCalories.kcal) : null, "kcal"],
    ["Distance", d.distance?.km != null ? d.distance.km.toFixed(2) : null, "km"],
    ["Weight", d.weight?.weightKg != null ? displayW(d.weight.weightKg) : null, wUnit()],
    ["Exercise", d.workouts?.count != null ? d.workouts.count : null, "sessions"],
    ["Respiratory Rate", d.respiratoryRate?.rpm != null ? Math.round(d.respiratoryRate.rpm) : null, "rpm"],
    ["Oxygen Saturation", d.oxygenSaturation?.percentage != null ? Math.round(d.oxygenSaturation.percentage) : null, "%"],
    ["Blood Pressure", d.bloodPressure?.systolic != null ? `${Math.round(d.bloodPressure.systolic)}/${Math.round(d.bloodPressure.diastolic)}` : null, "mmHg"],
    ["Body Temperature", d.bodyTemperature?.celsius != null ? d.bodyTemperature.celsius.toFixed(1) : null, "°C"],
    ["Body Fat", d.bodyFat?.percentage != null ? d.bodyFat.percentage.toFixed(1) : null, "%"],
    ["Height", d.height?.meters != null ? Math.round(d.height.meters * 100) : null, "cm"],
    ["Lean Body Mass", d.leanBodyMass?.kg != null ? displayW(d.leanBodyMass.kg) : null, wUnit()],
    ["BMR", d.basalMetabolicRate?.kcalPerDay != null ? Math.round(d.basalMetabolicRate.kcalPerDay) : null, "kcal/day"],
    ["Hydration", d.hydration?.liters != null ? d.hydration.liters.toFixed(2) : null, "L"],
    ["Nutrition", n?.kcal != null ? Math.round(n.kcal) : null, "kcal"]
  ];
  return `<div class="grid2" style="margin-bottom:16px;">${metrics.map(([label, value, unit]) => hcInsightTile(label, value, unit, period)).join("")}</div>`;
}

function renderHealthDashboard() {
  const isNative = window.HealthConnect && HealthConnect.isNativeAndroid();
  const integ = window.HealthConnectIntegration;
  const hcState = integ ? integ.loadState() : { connected: false, lastSyncAt: null };
  const syncData = integ ? integ.getSyncData() : null;
  const busy = integ ? integ.isBusy() : false;
  const errorMsg = integ ? integ.getError() : null;

  const backBtn = `<button class="btn btn-ghost" data-action="close-health-dashboard" style="padding:6px 12px;font-size:12px;margin-bottom:12px;">\u2190 Back</button>`;

  if (!isNative) {
    return `
      ${backBtn}
      <div class="row-between" style="margin-bottom:16px;">
        <span style="font-size:20px;font-weight:900;">Health Connect</span>
      </div>
      <div class="info-box" style="padding:16px;">
        <div style="font-size:13px;color:var(--muted);">Health Connect is not available on this device.</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px;">This feature only works in the IGNYT Android app.</div>
      </div>`;
  }

  const statusDot = hcState.connected
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--mint);margin-right:6px;"></span>Connected`
    : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--muted);margin-right:6px;"></span>Not Connected`;

  if (!hcState.connected) {
    return `
      ${backBtn}
      <div class="row-between" style="margin-bottom:16px;">
        <span style="font-size:20px;font-weight:900;">Health Connect</span>
        <span style="font-size:12px;font-weight:700;color:var(--muted);display:flex;align-items:center;">${statusDot}</span>
      </div>
      <div class="info-box" style="padding:16px;">
        ${errorMsg ? `<div style="font-size:13px;color:var(--accent);margin-bottom:10px;">${errorMsg}</div>` : `<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Sync your fitness and health data with IGNYT.</div>`}
        <button class="btn btn-accent btn-block" data-action="health-connect" ${busy ? "disabled" : ""}>${busy ? "Connecting\u2026" : "Connect Health Connect"}</button>
      </div>`;
  }

  const lastSync = hcState.lastSyncAt
    ? new Date(hcState.lastSyncAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";

  let cachedData = null;
  try { cachedData = JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null"); } catch (e) {}
  const d = syncData || cachedData || {};
  const range = state.healthInsightsRange || "Day";
  const tiles = [
    ["Steps", d.steps ? hcFmt(d.steps.steps) : hcFmt(null), "Today"],
    ["Distance", d.distance ? hcFmt(d.distance.km, "km", 1) : hcFmt(null), "Today"],
    ["Active Calories", d.activeCalories ? hcFmt(Math.round(d.activeCalories.kcal), "kcal") : hcFmt(null), "Today"],
    ["Heart Rate", d.heartRate && d.heartRate.latestBpm != null ? hcFmt(Math.round(d.heartRate.latestBpm), "bpm") : hcFmt(null), "Latest"],
    ["Weight", d.weight && d.weight.weightKg != null ? hcFmt(displayW(d.weight.weightKg), wUnit()) : hcFmt(null), "Latest"],
    ["Workouts", d.workouts ? hcFmt(d.workouts.count) : hcFmt(null), "Today"]
  ];

  return `
    ${backBtn}
    <div class="row-between" style="margin-bottom:16px;">
      <span style="font-size:20px;font-weight:900;">Health Connect</span>
      <span style="font-size:12px;font-weight:700;color:var(--mint);display:flex;align-items:center;">${statusDot}</span>
    </div>

    <div class="eyebrow-label">Today's Health</div>
    <div class="grid2" style="margin-bottom:16px;">
      ${tiles.map(([label, value, sub]) => `
        <div class="stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value" style="font-size:${value === "No data available" ? "13px" : "20px"};color:${value === "No data available" ? "var(--muted)" : "var(--text)"};">${value}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;font-weight:700;text-transform:uppercase;">${sub}</div>
        </div>
      `).join("")}
    </div>

    <div class="eyebrow-label">Insights</div>
    <div style="display:flex;gap:6px;margin:0 0 10px;">
      ${["Day", "Week", "Month", "Year"].map(value => `<button class="cat-chip ${range === value ? 'active' : ''}" data-health-range="${value}">${value}</button>`).join("")}
    </div>
    ${renderHealthInsightMetrics(d, range)}

    ${errorMsg ? `<div class="info-box" style="padding:12px;margin-bottom:12px;font-size:12px;color:var(--accent);">${errorMsg}</div>` : ""}

    <div class="info-box" style="padding:14px;">
      <div class="row-between" style="margin-bottom:12px;">
        <span style="font-size:12px;color:var(--muted);">Last synced</span>
        <span style="font-size:12px;font-weight:700;">${lastSync}</span>
      </div>
      <button class="btn btn-accent btn-block" data-action="health-sync" ${busy ? "disabled" : ""} style="margin-bottom:8px;">${busy ? "Syncing\u2026" : "Sync Now"}</button>
      <button class="btn btn-ghost btn-block" data-action="health-disconnect" ${busy ? "disabled" : ""} style="font-size:12px;color:var(--muted);">Disconnect</button>
    </div>`;
}

function navBtn(id,label){
  return `<button class="nav-btn ${state.tab===id?'active':''}" data-nav="${id}">${svg(id)}<span>${label}</span></button>`;
}

/* =========================================================
   PLAN TAB
========================================================= */

/* =========================================================
   MODALS — full-screen and overlay UI: the Add Exercise picker, the
   plate-calculator popover, and the rest-timer overlay.
========================================================= */

function renderExercisePicker(){
  if(state.exercisePickerShowCreate){
    return `
      <div class="row-between" style="margin-bottom:14px;">
        <button class="ex-picker-textbtn" data-action="close-exercise-picker">Cancel</button>
        <span style="font-weight:800;font-size:16px;">New Exercise</span>
        <button class="ex-picker-textbtn" data-action="save-custom-from-picker" style="color:var(--accent);">Create</button>
      </div>
      ${customExerciseForm(true)}
    `;
  }

  const search = state.exercisePickerSearch.trim().toLowerCase();
  const equip = state.exercisePickerEquipment;
  const muscleFilter = state.exercisePickerMuscle;
  let items = allLibraryExercises();
  if(equip!=="All") items = items.filter(i=>i.cat===equip);
  if(muscleFilter!=="All") items = items.filter(i=>i.muscle===muscleFilter);
  if(search) items = items.filter(i=>i.name.toLowerCase().includes(search));

  const isFiltering = !!search || equip!=="All" || muscleFilter!=="All";
  const recentNames = isFiltering ? [] : recentExerciseNames(8);
  const recentItems = recentNames.map(n=> items.find(i=>i.name===n)).filter(Boolean);

  const equipOptions = ["All", ...Object.keys(LIBRARY)];
  const muscleOptions = ["All", ...BODY_MUSCLES, "Cardio", "Mobility"];

  return `
    <div class="row-between" style="margin-bottom:14px;">
      <button class="ex-picker-textbtn" data-action="close-exercise-picker">Cancel</button>
      <span style="font-weight:800;font-size:16px;">${state.exercisePickerContext==="routine"?"Add to Routine":state.exercisePickerContext==="replace"?"Replace Exercise":"Add Exercise"}</span>
      <button class="ex-picker-textbtn" data-action="show-create-in-picker" style="color:var(--accent);">Create</button>
    </div>

    <div class="search-bar" style="margin-bottom:10px;">
      <input type="text" id="ex-picker-search" placeholder="Search exercise" value="${state.exercisePickerSearch}">
    </div>

    <div class="grid2" style="margin-bottom:${state.exercisePickerContext==='routine'?'10px':'14px'};">
      <select class="select-input" id="ex-picker-equip" style="margin:0;">
        ${equipOptions.map(o=>`<option value="${o}" ${equip===o?'selected':''}>${o==="All"?"All Equipment":o}</option>`).join("")}
      </select>
      <select class="select-input" id="ex-picker-muscle" style="margin:0;">
        ${muscleOptions.map(o=>`<option value="${o}" ${muscleFilter===o?'selected':''}>${o==="All"?"All Muscles":o}</option>`).join("")}
      </select>
    </div>
    ${state.exercisePickerContext==="routine" ? `
      <div class="row-between" style="margin-bottom:14px;background:var(--surface-alt);border-radius:8px;padding:8px 12px;">
        <span style="font-size:12px;color:var(--muted);">Sets for the exercise you pick</span>
        <input type="number" id="ex-picker-routine-sets" value="${state.routineBuilderSets}" min="1" style="width:44px;background:var(--surface);border-radius:6px;padding:6px;text-align:center;color:var(--accent);font-family:'SF Mono',monospace;font-weight:700;border:none;">
      </div>
    ` : ""}

    ${!isFiltering && recentItems.length ? `
      <div class="eyebrow-label" style="margin-top:4px;">Recent Exercises</div>
      ${recentItems.map(exercisePickerRow).join("")}
      <div class="eyebrow-label">All Exercises</div>
    ` : ""}

    ${items.length===0 ? `<div class="empty-note">No exercises match.</div>` : items.map(exercisePickerRow).join("")}
  `;
}

/* =========================================================
   WORKOUT TAB — freestyle logger, set-table style
========================================================= */

function exercisePickerRow(ex){
  const initial = ex.name.trim().charAt(0).toUpperCase();
  const color = avatarColorFor(ex.muscle);
  const equipSuffix = ex.cat && !["Custom"].includes(ex.cat) ? ` (${ex.cat})` : "";
  return `<div class="ex-picker-row" data-pick-exercise="${ex.name}">
    <div class="ex-picker-avatar" style="background:${color}22;color:${color};">${initial}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ex.name}${equipSuffix}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:1px;">${ex.muscle}</div>
    </div>
    <button class="ex-picker-info" data-view-exercise-from-picker="${ex.name}" title="View exercise guide" aria-label="View exercise guide">${svg('progress',16)}</button>
  </div>`;
}

function renderPlatePopover(exi){
  const target = Number(state.plateTarget||0);
  const bar = Number(state.plateBar||20);
  const res = calcPlates(target, bar);
  return `<div class="info-box" style="padding:12px;margin-bottom:10px;">
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <div style="flex:1;"><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Target (kg)</label>
        <input type="number" id="plate-target" value="${target||''}" placeholder="100" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-family:'SF Mono',monospace;font-weight:700;color:var(--accent);"></div>
      <div style="width:90px;"><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Bar (kg)</label>
        <select class="select-input" id="plate-bar" style="margin:4px 0 0;padding:8px;">
          ${[20,15,10,7.5].map(b=>`<option value="${b}" ${bar===b?'selected':''}>${b}</option>`).join("")}
        </select></div>
    </div>
    <button class="btn btn-steel btn-block" data-action="run-plate-calc">Calculate Plates</button>
    ${target>0 ? (res.perSide.length ?
      `<div style="margin-top:10px;text-align:center;">
        <div class="stat-label">Per Side</div>
        <div class="mono" style="font-weight:900;font-size:16px;color:var(--text);margin-top:4px;">${res.perSide.map(p=>`${p.count}×${p.plate}kg`).join("  +  ")}</div>
        ${res.remainder>0.01?`<div style="font-size:11px;color:var(--accent);margin-top:4px;">${res.remainder.toFixed(2)}kg/side can't be made with standard plates</div>`:""}
      </div>`
      : `<div style="font-size:12px;color:var(--muted);margin-top:8px;text-align:center;">Target must be heavier than the bar.</div>`) : ""}
  </div>`;
}

/* =========================================================
   TIMER OVERLAY
========================================================= */

function renderTimerOverlay(){
  if(!state.timer) return "";
  return `<div class="timer-overlay">
    <div class="timer-label">Rest</div>
    <div class="timer-ring mono">${formatTime(state.timer.remaining)}</div>
    <button class="btn btn-ghost" data-action="cancel-timer">Skip Rest</button>
  </div>`;
}

/* =========================================================
   FORMS — input-heavy screens: onboarding, the routine builder, the
   custom-exercise form, and the body-metric calculators.
========================================================= */

function customExerciseForm(hideButton){
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

function calcInputRow(id, label, val, unit){
  return `<div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">${label}</label>
    <div style="display:flex;align-items:center;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;">
      <input type="number" id="${id}" value="${val}" style="flex:1;background:none;color:var(--text);font-family:'SF Mono',monospace;font-weight:700;font-size:13px;">
      ${unit?`<span style="font-size:11px;color:var(--muted);">${unit}</span>`:""}
    </div></div>`;
}

function genderToggle(id, current){
  return `<div>
    <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Gender</label>
    <div style="display:flex;gap:6px;margin-top:4px;">
      <button class="cat-chip ${current==='male'?'active':''}" data-gender-toggle="${id}|male" style="flex:1;text-align:center;">Male</button>
      <button class="cat-chip ${current==='female'?'active':''}" data-gender-toggle="${id}|female" style="flex:1;text-align:center;">Female</button>
    </div></div>`;
}

function renderRoutineBuilder(){
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

function renderOnboarding(){
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

function renderCalculators(){
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

/* =========================================================
   TABLES — tabular data displays: a single session's full set-by-set
   breakdown, and an exercise's chronological history table.
========================================================= */

function renderSessionDetail(s){
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

function renderExerciseDetailHistory(history){
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

/* =========================================================
   CHARTS-UI — the screens that arrange chart.js's primitives into full
   tabs with labels, filters, and surrounding UI chrome: Progress, Body,
   and Nutrition (macro bars included, since they're chart-shaped too).
========================================================= */

function renderProgressTab(){
  let total=0, done=0;
  const perWeek = WEEKS.map(w=>{
    let wt=0, wd=0;
    w.days.forEach(d=>d.exercises.forEach(ex=>{ wt++; total++; if(state.completed[`${w.week}|${d.day}|${ex.name}`]){wd++; done++;} }));
    return {week:w.week, pct: wt?Math.round(wd/wt*100):0, phase:w.phase};
  });
  const overall = total? Math.round(done/total*100):0;
  const phaseColor = {base:'var(--steel)',build:'var(--steel)',load:'var(--accent)',peak:'var(--accent)',deload:'var(--mint)'};
  const sessions = state.workoutLog.length;
  const streak = computeStreak();
  const metric = state.chartMetric || "sets";
  const buckets = computeWeeklyActivity(8);
  const currentMuscles = computeMuscleDistribution(30,0);
  const prevMuscles = computeMuscleDistribution(30,30);
  const totalVolume = state.workoutLog.reduce((a,s)=>a+(s.volume||0),0);
  const totalSets = state.workoutLog.reduce((a,s)=>a+s.exercises.reduce((x,e)=>x+e.sets.length,0),0);
  const longestStreak = computeLongestStreak();
  const trainingHours = Math.floor(totalTrainingTimeMin()/60);
  const trainingMinsRem = totalTrainingTimeMin()%60;
  const freqAvg = workoutsPerWeekAvg();

  return `
    <div class="eyebrow-label" style="margin-top:4px;">Overview</div>
    <div class="grid2" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-label">Current Streak</div><div class="stat-value" style="color:var(--accent);">🔥 ${streak}<span class="stat-unit">days</span></div></div>
      <div class="stat-card"><div class="stat-label">Longest Streak</div><div class="stat-value" style="color:var(--steel);">${longestStreak}<span class="stat-unit">days</span></div></div>
      <div class="stat-card"><div class="stat-label">Freestyle Sessions</div><div class="stat-value">${sessions}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Frequency</div><div class="stat-value">${freqAvg}<span class="stat-unit">/wk</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Volume</div><div class="stat-value">${displayW(totalVolume,0).toLocaleString()}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Training Time</div><div class="stat-value">${trainingHours}<span class="stat-unit">h ${trainingMinsRem}m</span></div></div>
      <div class="stat-card"><div class="stat-label">Total Sets Logged</div><div class="stat-value">${totalSets}</div></div>
    </div>

    <div class="eyebrow-label">Personal Records</div>
    ${state.prs.length===0 ? `<div class="empty-note" style="margin-bottom:16px;">No PRs yet — finish a freestyle workout to start tracking heaviest weight, estimated 1RM, rep records, and session volume.</div>` : `
    <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
      ${state.prs.slice(0,10).map(pr=>`<div class="history-row" style="background:none;padding:10px 0;margin:0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:700;">${pr.exerciseName||'Session Volume'}</div>
          <div style="font-size:11px;color:var(--muted);">${prTypeLabel(pr)} · ${new Date(pr.achievedAt).toLocaleDateString('default',{month:'short',day:'numeric'})}</div>
        </div>
        <span class="mono" style="font-size:13px;color:var(--accent);font-weight:800;">${prValueLabel(pr)}</span>
      </div>`).join("")}
      ${state.prs.length>10?`<div style="font-size:11px;color:var(--muted);padding:8px 0;text-align:center;">+ ${state.prs.length-10} more in your export</div>`:""}
    </div>`}

    <div class="row-between">
      <span class="eyebrow-label" style="margin:18px 0 8px;">Achievements</span>
      <span class="mono" style="font-size:11px;color:var(--muted);">${state.achievements.length} / ${ACHIEVEMENT_DEFS.length}</span>
    </div>
    ${state.achievements.length===0 ? `<div class="empty-note" style="margin-bottom:16px;">No achievements unlocked yet — your first workout is the first one.</div>` : `
    <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
      ${state.achievements.slice().sort((a,b)=>b.achievedAt-a.achievedAt).slice(0,10).map(a=>`<div class="history-row" style="background:none;padding:10px 0;margin:0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;font-weight:700;">🎖️ ${a.name}</div>
          <div style="font-size:11px;color:var(--muted);">${a.desc}</div>
        </div>
        <span class="mono" style="font-size:11px;color:var(--muted);">${new Date(a.achievedAt).toLocaleDateString('default',{month:'short',day:'numeric'})}</span>
      </div>`).join("")}
      ${state.achievements.length>10?`<div style="font-size:11px;color:var(--muted);padding:8px 0;text-align:center;">+ ${state.achievements.length-10} more</div>`:""}
    </div>`}

    <div class="eyebrow-label">This Week — Actual Values</div>
    <div class="info-box" style="padding:14px;">
      ${(()=>{
        const w = thisWeekStats();
        const th = Math.floor(w.trainingMinutes/60), tm = w.trainingMinutes%60;
        const row = (label, valueHtml) => `<div class="row-between" style="padding:8px 0;border-top:1px solid var(--border);">
          <span style="font-size:13px;font-weight:700;">${label}</span>
          <span class="mono" style="font-size:13px;font-weight:800;color:var(--text);">${valueHtml}</span>
        </div>`;
        return `
          ${row("Workouts", w.workoutsGoal ? `${w.workoutsCompleted} / ${w.workoutsGoal} completed` : `${w.workoutsCompleted} completed`)}
          ${row("Training Time", `${th}h ${tm}m`)}
          ${row("Weekly Volume", `${displayW(w.weeklyVolume,0).toLocaleString()} ${wUnit()}`)}
          ${row("Calories Burned (est.)", `${w.caloriesBurned.toLocaleString()} kcal`)}
          ${row("Current Streak", `${w.currentStreak} day${w.currentStreak!==1?'s':''}`)}
          ${row("HYROX Sessions", `${w.hyroxSessions} completed`)}
        `;
      })()}
      ${!state.profile.trainingDays ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Set a weekly training-days target in Body → Your Profile to see a goal here.</div>` : ''}
    </div>

    <div class="eyebrow-label">Weekly Activity — Last 8 Weeks</div>
    <div class="info-box" style="padding:14px;">
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        ${["sets","duration","volume"].map(m=>`<button class="cat-chip ${metric===m?'active':''}" data-metric="${m}">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`).join("")}
      </div>
      ${weeklyBarChart(buckets, metric)}
    </div>

    <div class="eyebrow-label">Muscle Distribution — Last 30 Days</div>
    <div class="info-box" style="display:flex; flex-direction:column; align-items:center; padding:16px;">
      ${radarChart(currentMuscles, prevMuscles)}
      <div style="display:flex; gap:16px; margin-top:6px;">
        <span style="font-size:11px;color:var(--muted);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent);margin-right:5px;"></span>Current</span>
        <span style="font-size:11px;color:var(--muted);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--muted);margin-right:5px;"></span>Previous 30d</span>
      </div>
    </div>

    <div class="eyebrow-label">Body Weight Trend</div>
    <div class="info-box" style="padding:14px;">
      ${sparklineChart(bodyWeightTrend(20).map(p=>({date:p.date, value:displayW(p.value)})), {color:"var(--steel)", unit:wUnit()})}
    </div>

    <div class="eyebrow-label">Exercise Progress</div>
    <div class="info-box" style="padding:14px;">
      ${exercisesWithHistory().length===0 ? `<div class="empty-note">Log the same exercise across a few workouts to see its strength trend here.</div>` : `
        <select class="select-input" id="progress-exercise-select" style="margin-bottom:12px;">
          ${exercisesWithHistory().map(n=>`<option value="${n}" ${state.progressExercise===n?'selected':''}>${n}</option>`).join("")}
        </select>
        ${(() => {
          const exName = state.progressExercise && exercisesWithHistory().includes(state.progressExercise) ? state.progressExercise : exercisesWithHistory()[0];
          const trend = exerciseProgressTrend(exName, 20);
          const weightPoints = trend.map(t=>({date:t.date, value:displayW(t.weight)}));
          const ormPoints = trend.map(t=>({date:t.date, value:displayW(t.oneRM)}));
          return `
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Top Set Weight</div>
            ${sparklineChart(weightPoints, {color:"var(--accent)", unit:wUnit()})}
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Estimated 1RM</div>
            ${sparklineChart(ormPoints, {color:"var(--mint)", unit:wUnit()})}
          `;
        })()}
      `}
    </div>

    <div class="eyebrow-label">This Month vs Last Month</div>
    <div class="info-box" style="padding:14px;">
      ${(() => {
        const mc = monthlyComparison();
        const row = (label, a, b, unit) => {
          const delta = a-b;
          const pct = b>0 ? Math.round(delta/b*100) : (a>0?100:0);
          return `<div class="row-between" style="padding:8px 0;border-top:1px solid var(--border);">
            <span style="font-size:13px;font-weight:700;">${label}</span>
            <span style="display:flex;gap:10px;align-items:center;">
              <span class="mono" style="font-size:13px;">${a}${unit}</span>
              <span class="mono" style="font-size:11px;color:${delta>=0?'var(--mint)':'var(--accent)'};font-weight:800;">${delta>=0?'+':''}${pct}%</span>
            </span>
          </div>`;
        };
        return `
          <div class="row-between" style="margin-bottom:4px;">
            <span style="font-size:11px;color:var(--muted);font-weight:700;">THIS MONTH</span>
            <span style="font-size:11px;color:var(--muted);font-weight:700;">VS LAST MONTH</span>
          </div>
          ${row("Sessions", mc.thisMonth.sessions, mc.lastMonth.sessions, "")}
          ${row("Volume", displayW(mc.thisMonth.volume,0).toLocaleString(), displayW(mc.lastMonth.volume,0), wUnit())}
          ${row("Training Time", mc.thisMonth.minutes, mc.lastMonth.minutes, "m")}
        `;
      })()}
    </div>

    <div class="eyebrow-label">Calories & Protein — Last 30 Days</div>
    <div class="info-box" style="padding:14px;">
      ${(() => {
        const ct = calorieProteinTrend(30).filter(d=>d.kcal>0 || d.protein>0);
        if(ct.length<2) return `<div class="empty-note">Log food across a few more days to see calorie and protein trends here.</div>`;
        return `
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Calories</div>
          ${sparklineChart(ct.map(d=>({date:d.date,value:Math.round(d.kcal)})), {color:"var(--accent)", unit:"kcal"})}
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Protein</div>
          ${sparklineChart(ct.map(d=>({date:d.date,value:Math.round(d.protein)})), {color:"var(--steel)", unit:"g"})}
        `;
      })()}
    </div>

    <div class="eyebrow-label">Body Distribution</div>
    <div class="info-box" style="padding:14px;">
      ${renderBodyDistribution(state.bodyDistWeekOffset||0)}
    </div>

    <div class="eyebrow-label">Calendar</div>
    <div class="info-box" style="padding:14px;">
      ${renderCalendarMonth(state.calendarMonthOffset||0)}
    </div>

    <div class="eyebrow-label">Phase 1 Completion</div>
    <div class="info-box" style="text-align:center;padding:20px;margin-bottom:16px;">
      <div class="mono" style="font-weight:900;font-size:36px;color:var(--accent);">${overall}%</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">${done} of ${total} plan sessions logged</div>
    </div>
    <div class="eyebrow-label">By Week</div>
    ${perWeek.map(w=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div class="mono" style="width:50px;font-size:11px;font-weight:700;color:var(--muted);">WK ${w.week}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${w.pct}%;background:${phaseColor[w.phase]};"></div></div>
      <div class="mono" style="width:36px;text-align:right;font-size:11px;">${w.pct}%</div>
    </div>`).join("")}
  `;
}

/* =========================================================
   SETTINGS TAB — export/import + workout settings
========================================================= */

function renderBodyTab(){
  const entries = state.bodylog;
  const first = entries[entries.length-1];
  const latest = entries[0];
  const delta = (first && latest) ? (Number(latest.weight)-Number(first.weight)) : null;
  const fieldSm = (id,label,ph,color) => `<div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">${label}</label>
    <input type="number" id="${id}" placeholder="${ph}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:${color};"></div>`;

  const p = state.profile;
  const maint = profileMaintenance();
  const target = profileCalorieTarget();

  // Body composition: prefer latest logged body fat %, else estimate via Navy from latest measurements
  let bfPct = null;
  const latestBF = entries.find(e=>e.bodyfat);
  const latestWaist = entries.find(e=>e.waist);
  if(latestBF) bfPct = Number(latestBF.bodyfat);
  else if(latestWaist && state.calc.neck){
    bfPct = calcBodyFatNavy(p.gender, p.height, state.calc.neck, Number(latestWaist.waist), state.calc.hip);
  }
  const lbmBoer = calcLBM(p.gender, p.height, p.weight).boer;
  let fatMass = null, leanMass = null, muscleMass = null;
  if(bfPct!=null && bfPct>0){
    fatMass = p.weight * bfPct/100;
    leanMass = p.weight - fatMass;
    muscleMass = leanMass * 0.535; // skeletal muscle ≈ 53.5% of lean mass (Lee et al. estimate)
  }

  return `
    <div class="eyebrow-label" style="margin-top:4px;">Your Profile</div>
    <div class="info-box" style="padding:14px;">
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Name</label>
      <input type="text" id="p-name" value="${p.name||''}" placeholder="Optional" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin:4px 0 12px;font-size:13px;color:var(--text);">
      <div class="grid2">
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Weight (${wUnit()})</label>
          <div style="padding:8px;margin-top:4px;font-size:13px;color:var(--accent);font-weight:700;">${displayW(p.weight)} <span style="font-size:10px;color:var(--muted);font-weight:400;">(from log)</span></div></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Height (cm)</label>
          <input type="number" id="p-height" value="${p.height}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:var(--text);"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Age</label>
          <input type="number" id="p-age" value="${p.age}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:var(--text);"></div>
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Gender</label>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="cat-chip ${p.gender==='male'?'active':''}" data-profile-gender="male" style="flex:1;text-align:center;">Male</button>
            <button class="cat-chip ${p.gender==='female'?'active':''}" data-profile-gender="female" style="flex:1;text-align:center;">Female</button>
          </div></div>
      </div>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Activity Level</label>
      <select class="select-input" id="p-activity">
        ${ACTIVITY_MULTIPLIERS.map(a=>`<option value="${a.mult}" ${p.activityMultiplier===a.mult?'selected':''}>${a.label}</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:6px 0 4px;">Goal</label>
      <select class="select-input" id="p-goal">
        ${GOAL_OPTIONS.map(g=>`<option value="${g.delta}" ${p.goalDelta===g.delta?'selected':''}>${g.label}</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:6px 0 4px;">Hyrox Experience</label>
      <select class="select-input" id="p-hyrox-exp">
        ${HYROX_EXPERIENCE_OPTIONS.map(o=>`<option value="${o.key}" ${p.hyroxExperience===o.key?'selected':''}>${o.label}</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:6px 0 4px;">Training Days / Week</label>
      <select class="select-input" id="p-training-days" style="margin-bottom:0;">
        ${[2,3,4,5,6,7].map(n=>`<option value="${n}" ${p.trainingDays===n?'selected':''}>${n} days/week</option>`).join("")}
      </select>
      <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);display:block;margin:10px 0 4px;">Available Equipment</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${EQUIPMENT_OPTIONS.map(eq=>`<button class="cat-chip ${p.equipment.includes(eq)?'active':''}" data-profile-equipment="${eq}">${eq}</button>`).join("")}
      </div>
    </div>

    <div class="grid2" style="margin-top:10px;margin-bottom:6px;">
      <div class="stat-card"><div class="stat-label">Maintenance</div><div class="stat-value" style="color:var(--steel);">${maint}<span class="stat-unit">kcal</span></div></div>
      <div class="stat-card"><div class="stat-label">Daily Calorie Goal</div><div class="stat-value" style="color:var(--accent);">${target}<span class="stat-unit">kcal</span></div></div>
    </div>
    <div class="info-box" style="font-size:12px;">These numbers, plus your protein/carb/fat targets in the Fuel tab, recalculate automatically whenever you change your weight or goal here.</div>

    <div class="eyebrow-label">Body Composition</div>
    <div class="info-box" style="padding:14px;">
      ${bfPct!=null ? `<div class="grid2">
        <div class="stat-card"><div class="stat-label">Body Fat</div><div class="stat-value" style="color:var(--accent);">${bfPct.toFixed(1)}<span class="stat-unit">%</span></div></div>
        <div class="stat-card"><div class="stat-label">Fat Mass</div><div class="stat-value" style="color:var(--text);">${displayW(fatMass)}<span class="stat-unit">${wUnit()}</span></div></div>
        <div class="stat-card"><div class="stat-label">Lean Body Mass</div><div class="stat-value" style="color:var(--steel);">${displayW(leanMass)}<span class="stat-unit">${wUnit()}</span></div></div>
        <div class="stat-card"><div class="stat-label">Est. Muscle Mass</div><div class="stat-value" style="color:var(--mint);">${displayW(muscleMass)}<span class="stat-unit">${wUnit()}</span></div></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:8px;">Fat/lean/muscle computed from your body-fat %${latestBF?' (from your latest log)':' (estimated from waist + neck via US Navy method)'}. Muscle mass is a lean-mass-based estimate, not a scan.</div>`
      : `<div style="font-size:13px;color:var(--muted);">Log a <b style="color:var(--text);">Body Fat %</b> below — or a waist measurement (with neck set in the Body Fat calculator) — to see fat mass, lean mass, and estimated muscle mass here.</div>
      <div class="stat-card" style="margin-top:10px;"><div class="stat-label">Lean Body Mass (Boer estimate)</div><div class="stat-value" style="color:var(--steel);">${displayW(lbmBoer)}<span class="stat-unit">${wUnit()}</span></div></div>`}
    </div>

    <div class="eyebrow-label">Log Entry</div>
    <div class="info-box" style="padding:14px;">
      <div class="grid2">
        <div><label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);">Date</label>
          <input type="date" id="b-date" value="${new Date().toISOString().slice(0,10)}" style="display:block;width:100%;background:var(--surface-alt);border-radius:8px;padding:8px;margin-top:4px;font-size:13px;color:var(--text);"></div>
        ${fieldSm("b-weight",`Weight (${wUnit()})`,wUnit()==='lb'?'220':'101.0',"var(--accent)")}
        ${fieldSm("b-sleep","Sleep (hrs)","7.5","var(--steel)")}
        ${fieldSm("b-hrv","HRV (ms)","91","var(--steel)")}
        ${fieldSm("b-waist","Waist (cm)","","var(--text)")}
        ${fieldSm("b-chest","Chest (cm)","","var(--text)")}
        ${fieldSm("b-arms","Arms (cm)","","var(--text)")}
        ${fieldSm("b-bodyfat","Body Fat (%)","","var(--text)")}
      </div>
      <div style="font-size:11px;color:var(--muted);margin:8px 0;">Logging a weight here updates your profile weight and recalculates calories & macros everywhere.</div>
      <button class="btn btn-accent btn-block" data-action="log-body">Log Entry</button>
    </div>

    ${delta!==null?`<div class="field" style="margin-top:12px;"><label>Total weight change</label>
      <span class="mono" style="font-weight:900;color:${delta<=0?'var(--mint)':'var(--accent)'};">${delta>0?'+':''}${displayW(delta)} ${wUnit()}</span></div>`:''}

    <div class="eyebrow-label">History</div>
    ${entries.length===0?`<div class="empty-note">No entries yet.</div>`:
      entries.map(e=>`<div class="history-row">
        <span class="mono" style="font-size:11px;color:var(--muted);">${e.date}</span>
        <span class="mono" style="font-size:12px;color:var(--accent);">${displayW(e.weight)}${wUnit()}</span>
        <span class="mono" style="font-size:12px;color:var(--steel);">${e.sleep||'–'}h</span>
        <span class="mono" style="font-size:12px;color:var(--steel);">${e.hrv||'–'}ms</span>
        <button class="del" data-del-body="${e.id}" aria-label="Delete body log entry">${svg('x',12)}</button>
      </div>`).join("")}

    <div class="eyebrow-label">Calculators</div>
    <div class="info-box" style="padding:14px;">
      ${renderCalculators()}
    </div>
  `;
}

/* =========================================================
   NUTRITION TAB — meals, macro budgets, insights
========================================================= */

function renderNutritionTab(){
  const n = state.nutrition;
  const targets = macroTargets();
  const weeklyLoss = (Math.abs(state.profile.goalDelta)*7)/7700;

  const eaten = todayEaten();
  const hcData = window.HealthConnectIntegration ? window.HealthConnectIntegration.getSyncData() : null;
  let cachedHcData = null;
  try { cachedHcData = JSON.parse(localStorage.getItem("hx_hc_dashboard_cache") || "null"); } catch (e) {}
  const activeCalories = (hcData || cachedHcData)?.activeCalories?.kcal;
  let hcConnected = false;
  try { hcConnected = !!JSON.parse(localStorage.getItem("hx_hc_state") || "{}").connected; } catch (e) {}
  const useExerciseBudget = !!state.settings.exerciseCalorieBudget;
  const calorieBudget = targets.kcal + (useExerciseBudget && activeCalories != null ? Math.round(activeCalories) : 0);
  const remainingCalories = calorieBudget - Math.round(eaten);
  const burned = todayBurned();
  const netDeficit = burned - eaten;
  const activityKcal = Math.round(todayActivityKcal());
  const macros = todayMacros();
  const macroPctTotal = (n.proteinPct||0)+(n.carbPct||0)+(n.fatPct||0);
  const todaysFood = foodsForDate(todayStr());
  const week = last7DaysCalories();
  const weekTotal = week.reduce((a,d)=>a+d.kcal,0);
  const weekAvg = Math.round(weekTotal/7);
  const maxKcal = Math.max(targets.kcal, ...week.map(d=>d.kcal), 1);

  return `
    <div class="eyebrow-label" style="margin-top:4px;">Today</div>
    <div class="grid2" style="margin-bottom:8px;">
      <div class="stat-card"><div class="stat-label">Eaten</div><div class="stat-value" style="color:var(--text);">${Math.round(eaten)}<span class="stat-unit">/ ${calorieBudget} kcal</span></div></div>
      <div class="stat-card"><div class="stat-label">Burned (est.)</div><div class="stat-value" style="color:var(--steel);">${burned}<span class="stat-unit">kcal</span></div></div>
    </div>
    <div class="info-box" style="padding:12px 14px;margin-bottom:16px;">
      <div class="row-between"><span style="font-size:13px;font-weight:700;">Calories Remaining</span><span class="mono" style="font-weight:900;color:${remainingCalories >= 0 ? 'var(--mint)' : 'var(--accent)'};">${remainingCalories} kcal</span></div>
      ${useExerciseBudget ? `<div style="font-size:11px;color:var(--muted);margin-top:5px;">${activeCalories == null ? `Health Connect active calories: ${hcConnected ? 'No data' : 'Permission required'}` : `Includes ${Math.round(activeCalories)} kcal from Health Connect today.`}</div>` : ''}
    </div>
    <div class="info-box" style="text-align:center;padding:14px;margin-bottom:16px;background:${netDeficit>=0?'rgba(62,207,142,.08)':'rgba(255,90,31,.08)'};">
      <div class="stat-label">${netDeficit>=0?'Deficit Created':'Surplus (over target)'}</div>
      <div class="mono" style="font-weight:900;font-size:26px;color:${netDeficit>=0?'var(--mint)':'var(--accent)'};margin-top:2px;">${netDeficit>=0?'':'+'}${Math.abs(netDeficit)}<span style="font-size:13px;font-weight:700;color:var(--muted);margin-left:4px;">kcal</span></div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;">Burned = ${profileMaintenance()} maintenance + ~${activityKcal} workout est.</div>
    </div>

    <div class="eyebrow-label">Macronutrients Today</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${macroBar("Protein", macros.protein, targets.protein, "var(--accent)", "g")}
      ${macroBar("Carbs", macros.carbs, targets.carbs, "var(--steel)", "g")}
      ${macroBar("Fat", macros.fat, targets.fat, "#FFB020", "g")}
      ${macroBar("Fibre", macros.fibre, targets.fibre, "var(--mint)", "g")}
    </div>

    <div class="eyebrow-label">Water</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${(()=>{
        const waterMl = todayWater();
        const waterTarget = state.settings.waterTargetMl || 2500;
        return macroBar("Water", waterMl, waterTarget, "var(--steel)", "ml");
      })()}
      <div style="display:flex;gap:6px;margin-top:4px;">
        ${[250,500,750].map(ml=>`<button class="cat-chip" data-add-water="${ml}" style="flex:1;text-align:center;">+${ml}ml</button>`).join("")}
        <button class="cat-chip" data-action="undo-water" style="flex:1;text-align:center;color:var(--muted);">Undo</button>
      </div>
    </div>

    <div class="eyebrow-label">Meals</div>
    ${MEALS.map(meal=>{
      const mealFoods = todaysFood.filter(f=>(f.meal||"Lunch")===meal);
      const mealKcal = mealFoods.reduce((a,f)=>a+Number(f.calories||0),0);
      const budget = Math.round(targets.kcal * MEAL_SHARE[meal]);
      const isOpen = state.mealOpen===meal;
      return `<div class="info-box" style="padding:12px 14px;margin-bottom:8px;">
        <div class="row-between" data-meal-toggle="${meal}" style="cursor:pointer;">
          <span style="font-weight:800;font-size:15px;">${meal}</span>
          <span class="mono" style="font-size:12px;color:${mealKcal>budget?'var(--accent)':'var(--muted)'};">${mealKcal} of ${budget} Cal <span style="color:var(--accent);font-weight:900;margin-left:6px;">${isOpen?'−':'+'}</span></span>
        </div>
        ${mealFoods.map(f=>`<div class="history-row" style="margin-top:8px;">
          <div><div style="font-size:13px;font-weight:600;">${f.name}</div>
          ${(f.protein||f.carbs||f.fat)?`<div class="mono" style="font-size:10px;color:var(--muted);">P${f.protein||0} C${f.carbs||0} F${f.fat||0}</div>`:""}</div>
          <span class="mono" style="font-size:12px;color:var(--accent);">${f.calories} kcal</span>
          <button class="del" data-del-food="${f.id}" aria-label="Delete food entry">${svg('x',12)}</button>
        </div>`).join("")}
        ${isOpen?`<div style="margin-top:10px;">
          ${recentFoodEntries(6).length ? `
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:5px;">Recent</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
              ${recentFoodEntries(6).map(f=>`<button class="cat-chip" data-quick-add-food="${meal}" data-food-name="${f.name.replace(/"/g,'&quot;')}" data-food-cal="${f.calories||0}" data-food-protein="${f.protein||0}" data-food-carbs="${f.carbs||0}" data-food-fat="${f.fat||0}" data-food-fibre="${f.fibre||0}">${f.name} · ${f.calories||0}kcal</button>`).join("")}
            </div>` : ""}
          ${state.favoriteFoods.length ? `
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:5px;">★ Favorites</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
              ${state.favoriteFoods.map(f=>`<button class="cat-chip active" data-quick-add-food="${meal}" data-food-name="${f.name.replace(/"/g,'&quot;')}" data-food-cal="${f.calories||0}" data-food-protein="${f.protein||0}" data-food-carbs="${f.carbs||0}" data-food-fat="${f.fat||0}" data-food-fibre="${f.fibre||0}">${f.name} · ${f.calories||0}kcal</button>`).join("")}
            </div>` : ""}
          <input type="text" id="food-name" placeholder="Food name" style="width:100%;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:13px;color:var(--text);margin-bottom:6px;">
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <input type="number" id="food-cal" placeholder="kcal*" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--accent);text-align:center;">
            <input type="number" id="food-protein" placeholder="P g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
            <input type="number" id="food-carbs" placeholder="C g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
            <input type="number" id="food-fat" placeholder="F g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
            <input type="number" id="food-fibre" placeholder="Fb g" style="flex:1;background:var(--surface-alt);border-radius:8px;padding:9px;font-size:12px;color:var(--text);text-align:center;">
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-accent" style="flex:1;" data-log-meal-food="${meal}">Add to ${meal}</button>
            <button class="btn btn-ghost" style="width:44px;flex-shrink:0;" data-action="save-as-favorite" title="Save as favorite">★</button>
          </div>
        </div>`:""}
      </div>`;
    }).join("")}

    <div class="eyebrow-label">Last 7 Days</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      <div class="grid2" style="margin-bottom:12px;">
        <div><div class="stat-label">Weekly Total</div><div class="mono" style="font-weight:900;font-size:18px;">${weekTotal.toLocaleString()} <span style="font-size:11px;color:var(--muted);">Cal</span></div></div>
        <div><div class="stat-label">Average / Day</div><div class="mono" style="font-weight:900;font-size:18px;">${weekAvg.toLocaleString()} <span style="font-size:11px;color:var(--muted);">Cal</span></div></div>
      </div>
      <div style="position:relative;height:110px;display:flex;align-items:flex-end;gap:6px;">
        <div style="position:absolute;left:0;right:0;top:${100-Math.min(100,targets.kcal/maxKcal*100)}%;border-top:1.5px dashed var(--accent);opacity:.6;"></div>
        ${week.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end;">
          ${d.kcal>0?`<span class="mono" style="font-size:9px;color:var(--muted);">${d.kcal}</span>`:""}
          <div style="width:70%;border-radius:4px 4px 0 0;background:${d.kcal>targets.kcal?'var(--accent)':'#FFB020'};height:${Math.max(2,Math.round(d.kcal/maxKcal*80))}px;"></div>
          <span style="font-size:9px;color:var(--muted);font-weight:700;">${d.label}</span>
        </div>`).join("")}
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:6px;">Dashed line = your ${targets.kcal} kcal daily target.</div>
    </div>

    <div class="eyebrow-label">Calorie & Macro Budget</div>
    <div class="info-box" style="padding:12px 14px;margin-bottom:8px;font-size:12px;color:var(--muted);">
      Your calorie target updates automatically from your weight, stats, and goal (set in the <b style="color:var(--steel);">Body</b> tab). Maintenance right now: <b class="mono" style="color:var(--text);">${profileMaintenance()} kcal</b>.
    </div>
    <div class="field"><label>Protein %</label><div><input type="number" id="n-proteinpct" value="${n.proteinPct}"><span class="unit">%</span></div></div>
    <div class="field"><label>Carb %</label><div><input type="number" id="n-carbpct" value="${n.carbPct}"><span class="unit">%</span></div></div>
    <div class="field"><label>Fat %</label><div><input type="number" id="n-fatpct" value="${n.fatPct}"><span class="unit">%</span></div></div>
    <div class="field"><label>Fibre target</label><div><input type="number" id="n-fibre" value="${n.fibreTarget}"><span class="unit">g</span></div></div>
    <div class="info-box" style="padding:10px 14px;margin-bottom:8px;${macroPctTotal!==100?'background:rgba(255,90,31,.1);':''}">
      <div class="row-between"><span style="font-size:13px;font-weight:700;">Macro Total</span>
      <span class="mono" style="font-weight:900;color:${macroPctTotal===100?'var(--mint)':'var(--accent)'};">${macroPctTotal}%</span></div>
      ${macroPctTotal!==100?`<div style="font-size:11px;color:var(--accent);margin-top:2px;">Should add up to 100%</div>`:""}
    </div>

    <div class="grid2">
      <div class="stat-card"><div class="stat-label">Calorie Target</div><div class="stat-value" style="color:var(--accent);">${targets.kcal}<span class="stat-unit">kcal</span></div></div>
      <div class="stat-card"><div class="stat-label">Weekly Loss (est.)</div><div class="stat-value" style="color:var(--mint);">${displayW(weeklyLoss,2)}<span class="stat-unit">${wUnit()}</span></div></div>
      <div class="stat-card"><div class="stat-label">Protein Target</div><div class="stat-value" style="color:var(--steel);">${Math.round(targets.protein)}<span class="stat-unit">g</span></div></div>
      <div class="stat-card"><div class="stat-label">Carb Target</div><div class="stat-value" style="color:var(--steel);">${Math.round(targets.carbs)}<span class="stat-unit">g</span></div></div>
      <div class="stat-card"><div class="stat-label">Fat Target</div><div class="stat-value" style="color:var(--steel);">${Math.round(targets.fat)}<span class="stat-unit">g</span></div></div>
      <div class="stat-card"><div class="stat-label">Fibre Target</div><div class="stat-value" style="color:var(--mint);">${targets.fibre}<span class="stat-unit">g</span></div></div>
    </div>
    <div class="info-box" style="margin-top:14px;">Recalculate maintenance every 2–3 weeks against your actual weight trend. Don't drop below ~1800–2000 kcal given training volume — recovery beats speed here.</div>
  `;
}

/* =========================================================
   PROGRESS TAB — stats, radar, weekly activity, calendar/streak
========================================================= */

/* --- data helpers --- */

function macroBar(label, val, target, color, unit){
  const pct = target>0 ? Math.min(100, Math.round(val/target*100)) : 0;
  return `<div style="margin-bottom:10px;">
    <div class="row-between" style="margin-bottom:4px;">
      <span style="font-size:13px;font-weight:700;">${label}</span>
      <span class="mono" style="font-size:12px;color:var(--muted);">${val.toFixed(0)} / ${target.toFixed(0)} ${unit} <span style="color:${color};font-weight:800;margin-left:4px;">${pct}%</span></span>
    </div>
    <div class="progress-track" style="height:7px;"><div class="progress-fill" style="width:${pct}%;background:${color};"></div></div>
  </div>`;
}

/* =========================================================
   UI INDEX — the render loop, error screen, remaining full-tab screens
   (Plan, Workout, Library, HYROX Schedule, Race Mode, Exercise Detail),
   the PR/achievement celebration banners' markup, the CSV import preview,
   and attachHandlers() which wires up every DOM event listener after
   each render. Re-exports nothing extra -- app.js imports render() and
   renderErrorScreen() directly from here.
========================================================= */

function render(){
  try{
    applyTheme();
    if(!state.onboardingComplete){
      renderOnboarding();
      return;
    }
    renderApp();
    if(state.session) ensureElapsedTimerRunning();
    else stopElapsedTimer();
    if(state.raceActive) ensureRaceTimerRunning();
    else stopRaceTimer();
  }catch(err){
    console.error("Ignyt render error:", err);
    renderErrorScreen(err);
  }
}

function renderErrorScreen(err){
  const root = document.getElementById("app");
  let msg = "Something went wrong displaying this screen.";
  try{ msg = (err && err.message) ? err.message : msg; }catch{}
  root.innerHTML = `
    <div style="padding:24px 20px;max-width:480px;margin:0 auto;">
      <div style="font-size:38px;margin-bottom:8px;">⚠️</div>
      <h1 style="font-size:20px;font-weight:900;margin-bottom:6px;">Ignyt hit a snag</h1>
      <p style="font-size:13px;color:var(--muted,#9a9aa4);margin-bottom:18px;">
        A screen failed to load. Your saved data is safe — it lives in this browser's storage, untouched.
      </p>
      <div style="background:#1c1c22;border-radius:10px;padding:10px 12px;font-family:monospace;font-size:11px;color:#ff8a5c;margin-bottom:20px;word-break:break-word;">${msg.replace(/</g,"&lt;")}</div>
      <button id="err-reload" style="width:100%;padding:13px;border:none;border-radius:10px;background:#FF5A1F;color:#fff;font-weight:800;font-size:14px;margin-bottom:10px;">Reload App</button>
      <button id="err-home" style="width:100%;padding:13px;border:none;border-radius:10px;background:#2a2a32;color:#fff;font-weight:700;font-size:14px;margin-bottom:10px;">Go to Home</button>
      <button id="err-backup" style="width:100%;padding:13px;border:none;border-radius:10px;background:#2a2a32;color:#fff;font-weight:700;font-size:14px;margin-bottom:10px;">Download Backup Now</button>
      <button id="err-reset" style="width:100%;padding:13px;border:1px solid #ff6b6b;border-radius:10px;background:none;color:#ff6b6b;font-weight:700;font-size:13px;">Reset All App Data</button>
    </div>
  `;
  document.getElementById("err-reload").addEventListener("click", ()=> location.reload());
  document.getElementById("err-home").addEventListener("click", ()=>{
    try{ state.tab = "home"; render(); }
    catch{ location.reload(); }
  });
  document.getElementById("err-backup").addEventListener("click", ()=>{
    try{ exportAllJSON(); }
    catch{ alert("Backup failed too — try Reload first."); }
  });
  document.getElementById("err-reset").addEventListener("click", ()=>{
    if(confirm("This permanently deletes ALL app data. Are you sure?") && confirm("Last check — this cannot be undone. Delete everything?")){
      ALL_DATA_KEYS.forEach(k=>localStorage.removeItem(k));
      location.reload();
    }
  });
}

function renderPlanTab(){
  if(state.showExercisePicker && state.exercisePickerContext==="routine") return renderExercisePicker();
  if(state.viewingHyroxSchedule) return renderHyroxSchedule();
  if(state.viewingRaceMode) return renderRaceMode();
  return `
    <div class="row-between" style="margin:4px 0 8px;">
      <span class="eyebrow-label" style="margin:0;">My Routines</span>
      <button class="btn btn-ghost" data-action="toggle-routine-builder" style="padding:6px 12px;font-size:12px;">${state.routineBuilder? 'Cancel' : svg('plus',13)+' New Routine'}</button>
    </div>
    ${state.routineBuilder ? renderRoutineBuilder() : ""}
    ${state.routines.length===0 && !state.routineBuilder ? `<div class="empty-note">No routines saved yet — build one to start logging faster.</div>` :
      state.routines.map(r=>`<div class="routine-card">
        <div class="row-between">
          <span style="font-weight:800;font-size:15px;">${r.name}</span>
          <button class="del" data-del-routine="${r.id}" aria-label="Delete routine">${svg('x',14)}</button>
        </div>
        <div style="font-size:12px;color:var(--muted);margin:4px 0 12px;">${r.exercises.length} exercise${r.exercises.length!==1?'s':''}</div>
        <button class="btn btn-steel btn-block" data-start-routine="${r.id}">Start Workout</button>
      </div>`).join("")}

    <div class="eyebrow-label" style="margin-top:24px;">HYROX Training Schedule</div>
    <div class="info-box" style="padding:18px;">
      <div style="font-weight:900;font-size:17px;margin-bottom:4px;">HYROX Training Schedule</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">8-Week Structured HYROX Program</div>
      <div style="margin-bottom:14px;">
        ${Object.values(LEVELS).map(lv=>`<span class="muscle-chip">${lv.label}</span>`).join("")}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">Week ${state.activeWeek} of 8 · ${weekProgress(WEEKS[state.activeWeek-1])}% this week · ${LEVELS[state.activeLevel].label} level</div>
      <button class="btn btn-accent btn-block" data-action="open-hyrox-schedule">Open Schedule</button>
    </div>

    <div class="eyebrow-label">HYROX Race Simulation</div>
    <div class="info-box" style="padding:18px;">
      <div style="font-weight:900;font-size:17px;margin-bottom:4px;">Race Simulation</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">Live stopwatch through the full 8-run/8-station race format.</div>
      ${bestRaceTime()!=null ? `<div style="font-size:11px;color:var(--muted);margin-bottom:14px;">Personal best: <span class="mono" style="color:var(--accent);font-weight:800;">${formatDuration(bestRaceTime())}</span></div>` : ''}
      <button class="btn btn-steel btn-block" data-action="open-race-mode">Open Race Mode</button>
    </div>
  `;
}

/* =========================================================
   HYROX RACE MODE — a live stopwatch/splits tracker for the official
   8-run/8-station structure. This is a genuinely new, self-contained
   feature: unlike PR/exercise-history distance tracking (which would need
   retrofitting the whole logger with new fields), a race is just a live
   timer with manually-advanced splits, so it doesn't depend on any data
   that doesn't already exist.
========================================================= */

function renderRaceMode(){
  if(!state.raceActive) return renderRaceStart();
  const r = state.raceActive;
  const idx = r.currentIndex;
  const seg = RACE_SEGMENTS[idx];
  const isLast = idx===RACE_SEGMENTS.length-1;
  return `
    <button class="btn btn-ghost" data-action="close-race-mode" style="padding:6px 12px;font-size:12px;margin-bottom:10px;">← Back to Plan</button>
    <div style="text-align:center;margin:8px 0 20px;">
      <div class="eyebrow-label" style="margin:0;">Total Time</div>
      <div class="mono" id="race-total-elapsed" style="font-size:44px;font-weight:900;color:var(--accent);">${formatDuration(Date.now()-r.startedAt)}</div>
    </div>
    <div class="info-box" style="padding:20px;text-align:center;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;">${seg.type==="run"?"Running":"Station"} · ${idx+1} of ${RACE_SEGMENTS.length}</div>
      <div style="font-size:24px;font-weight:900;margin:6px 0;">${seg.name}${seg.detail?` <span style="color:var(--muted);font-weight:600;font-size:16px;">(${seg.detail})</span>`:''}</div>
      <div class="mono" id="race-segment-elapsed" style="font-size:32px;font-weight:800;color:var(--steel);margin:10px 0;">${formatDuration(Date.now()-r.segmentStartedAt)}</div>
      <button class="btn btn-accent btn-block" data-action="race-next-segment" style="margin-top:8px;">${isLast?'Finish Race':'Complete — Next Segment'}</button>
    </div>
    ${r.segments.length ? `
      <div class="eyebrow-label">Splits So Far</div>
      <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
        ${r.segments.map((s,i)=>`<div class="row-between" style="padding:8px 0;${i>0?'border-top:1px solid var(--border);':''}">
          <span style="font-size:13px;">${s.name}${s.detail?` (${s.detail})`:''}</span>
          <span class="mono" style="font-size:13px;font-weight:700;">${formatDuration(s.durationMs)}</span>
        </div>`).join("")}
      </div>` : ""}
    <button class="btn btn-ghost btn-block" data-action="abort-race" style="color:#ff6b6b;">Abort Race</button>
  `;
}

function renderRaceStart(){
  const best = bestRaceTime();
  const recentRaces = state.raceLog.slice(0,5);
  return `
    <button class="btn btn-ghost" data-action="close-race-mode" style="padding:6px 12px;font-size:12px;margin-bottom:10px;">← Back to Plan</button>
    <div style="text-align:center;margin:20px 0;">
      <div style="font-size:22px;font-weight:900;">HYROX Race Simulation</div>
      <div style="font-size:13px;color:var(--muted);margin-top:4px;">8 × 1km Run alternating with 8 stations, official order.</div>
    </div>
    ${best!=null ? `<div class="info-box" style="text-align:center;padding:16px;margin-bottom:16px;">
      <div class="stat-label">Personal Best</div>
      <div class="mono" style="font-weight:900;font-size:28px;color:var(--accent);">${formatDuration(best)}</div>
    </div>` : ''}
    <button class="btn btn-accent btn-block" data-action="start-race" style="margin-bottom:20px;">Start Race</button>

    <div class="eyebrow-label">Race Order</div>
    <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
      ${RACE_SEGMENTS.map((s,i)=>`<div class="row-between" style="padding:6px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <span style="font-size:12px;color:${s.type==='run'?'var(--steel)':'var(--text)'};">${i+1}. ${s.name}</span>
        <span style="font-size:11px;color:var(--muted);">${s.detail||''}</span>
      </div>`).join("")}
    </div>

    ${recentRaces.length ? `
      <div class="eyebrow-label">Race History</div>
      <div class="info-box" style="padding:4px 14px;">
        ${recentRaces.map(race=>`<div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:13px;font-weight:700;">${new Date(race.date).toLocaleDateString('default',{month:'short',day:'numeric',year:'numeric'})}</div>
            ${race.totalMs===best?`<div style="font-size:10px;color:var(--mint);font-weight:700;">PERSONAL BEST</div>`:''}
          </div>
          <span class="mono" style="font-size:14px;font-weight:800;color:var(--accent);">${formatDuration(race.totalMs)}</span>
        </div>`).join("")}
      </div>
    ` : `<div class="empty-note">No races completed yet.</div>`}
  `;
}

function renderHyroxSchedule(){
  const week = WEEKS[state.activeWeek-1];
  const day = week.days[state.activeDayIdx];
  return `
    <button class="btn btn-ghost" data-action="close-hyrox-schedule" style="padding:6px 12px;font-size:12px;margin-bottom:8px;">← Back to Plan</button>
    <div class="row-between" style="margin-bottom:8px;">
      <span class="eyebrow-label" style="margin:0;">Race Prep — Phase 1</span>
      <span class="phase-pill">${week.phaseLabel}</span>
    </div>
    <div class="level-rail" style="display:flex;gap:6px;margin-bottom:12px;">
      ${Object.entries(LEVELS).map(([key,lv])=>`
        <button class="level-chip ${state.activeLevel===key?'active':''}" data-level="${key}"
          style="flex:1;padding:9px 6px;border-radius:10px;border:1.5px solid ${state.activeLevel===key?'var(--accent)':'var(--border)'};background:${state.activeLevel===key?'rgba(255,90,31,.12)':'var(--surface)'};color:${state.activeLevel===key?'var(--accent)':'var(--muted)'};font-weight:800;font-size:12px;cursor:pointer;">
          ${lv.label}
        </button>`).join("")}
    </div>
    <div class="info-box" style="font-size:11px;color:var(--muted);margin-bottom:12px;padding:8px 12px;">${LEVELS[state.activeLevel].note}</div>
    <div class="week-rail">
      ${WEEKS.map(w=>{
        const pct = weekProgress(w);
        const active = w.week===state.activeWeek;
        return `<button class="week-chip ${active?'active':''}" data-week="${w.week}">
          ${w.week}<span class="week-bar"><span class="week-bar-fill" style="width:${pct}%; ${pct===100?'background:var(--mint);':''}"></span></span>
        </button>`;
      }).join("")}
    </div>
    <div class="day-tabs">
      ${week.days.map((d,i)=>`<button class="day-tab ${i===state.activeDayIdx?'active':''}" data-day="${i}">
        <div class="dtop">${d.day.toUpperCase()}</div><div class="dbot">${d.session}</div></button>`).join("")}
    </div>
    <div>
      ${day.exercises.map(ex=>{
        const key = `${week.week}|${day.day}|${ex.name}`;
        const done = !!state.completed[key];
        return `<div class="ex-card">
          <div class="ex-stripe ${done?'done':'pending'}"></div>
          <div class="ex-body" data-toggle="${key}">
            <div class="ex-check ${done?'done':''}">${done?svg('check',13):''}</div>
            <div style="flex:1;min-width:0;">
              <div class="ex-name ${done?'done':''}">${ex.name}</div>
              <div class="ex-presc ${done?'done':''}">${ex.presc}</div>
              ${ex.note?`<div class="ex-note">${ex.note}</div>`:''}
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

/* =========================================================
   PERSONAL RECORDS — detected automatically when a workout finishes
   Supported types (data-model honest): weight, est. 1RM, reps-at-weight,
   session volume. Running/pace/distance PRs need dedicated distance/time
   fields the logger doesn't currently capture, so they're not faked here.
========================================================= */

function renderPRCelebration(){
  const prs = state.lastSessionPRs;
  return `<div class="info-box" style="padding:16px;margin-bottom:14px;background:rgba(255,90,31,.1);border:1px solid rgba(255,90,31,.35);">
    <div class="row-between" style="margin-bottom:10px;">
      <span style="font-weight:900;font-size:15px;color:var(--accent);">🏆 New Personal Record${prs.length>1?'s':''}!</span>
      <button class="del" data-action="dismiss-prs" aria-label="Dismiss">${svg('x',15)}</button>
    </div>
    ${prs.map(pr=>`<div class="row-between" style="padding:6px 0;border-top:1px solid rgba(255,90,31,.15);">
      <span style="font-size:13px;font-weight:700;">${pr.exerciseName||'Session Volume'} <span style="color:var(--muted);font-weight:400;">— ${prTypeLabel(pr)}</span></span>
      <span class="mono" style="font-size:13px;color:var(--accent);font-weight:800;">${prValueLabel(pr)}${pr.improvementPct!=null?` <span style="color:var(--mint);font-size:11px;">+${pr.improvementPct}%</span>`:''}</span>
    </div>`).join("")}
  </div>`;
}

function renderAchievementCelebration(){
  const list = state.lastUnlockedAchievements;
  return `<div class="info-box" style="padding:16px;margin-bottom:14px;background:rgba(62,207,142,.1);border:1px solid rgba(62,207,142,.35);">
    <div class="row-between" style="margin-bottom:10px;">
      <span style="font-weight:900;font-size:15px;color:var(--mint);">🎖️ Achievement Unlocked${list.length>1?'s':''}!</span>
      <button class="del" data-action="dismiss-achievements" aria-label="Dismiss">${svg('x',15)}</button>
    </div>
    ${list.map(a=>`<div style="padding:6px 0;border-top:1px solid rgba(62,207,142,.15);">
      <div style="font-size:13px;font-weight:700;">${a.name}</div>
      <div style="font-size:11px;color:var(--muted);">${a.desc}</div>
    </div>`).join("")}
  </div>`;
}

function renderWorkoutTab(){
  if(state.session && state.showExercisePicker) return renderExercisePicker();
  if(!state.session){
    if(state.viewingSessionId){
      const s = state.workoutLog.find(x=>x.id===state.viewingSessionId);
      if(s) return renderSessionDetail(s);
      state.viewingSessionId = null; // stale id (e.g. deleted) — fall through to list
    }
    const showAll = state.showAllSessions;
    const recent = showAll ? state.workoutLog : state.workoutLog.slice(0,5);
    return `
      ${state.lastSessionPRs && state.lastSessionPRs.length ? renderPRCelebration() : ""}
      <button class="btn btn-accent btn-block" data-action="start-session" style="margin-top:4px;">${svg('plus',16)} Start Empty Workout</button>
      <div style="font-size:11px;color:var(--muted);margin:8px 0 0;text-align:center;">Looking for your routines? They've moved to the <b style="color:var(--text);">Plan</b> tab.</div>

      <div class="row-between" style="margin-top:20px;">
        <span class="eyebrow-label" style="margin:0;">Recent Sessions</span>
        ${state.workoutLog.length>5 ? `<button class="btn btn-ghost" data-action="toggle-show-all-sessions" style="padding:4px 10px;font-size:11px;">${showAll?'Show Less':'Show All ('+state.workoutLog.length+')'}</button>` : ""}
      </div>
      ${recent.length===0?`<div class="empty-note">No sessions logged yet.</div>`:
        recent.map(s=>{
          const muscles = sessionMuscles(s.exercises);
          const prCount = state.prs.filter(p=>p.workoutId===s.id).length;
          return `<div class="history-row" style="align-items:flex-start;cursor:pointer;" data-view-session="${s.id}">
          <div>
            <div style="font-weight:800;font-size:14px;">${sessionTitle(s)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:1px;">${s.exercises.length} exercise${s.exercises.length!==1?'s':''}${s.durationMin?` · ${s.durationMin} min`:''}${prCount?` · 🏆 ${prCount} PR${prCount>1?'s':''}`:''}</div>
            <div class="mono" style="font-size:11px;color:var(--muted);margin-top:2px;">${s.date}${s.volume?` · ${displayW(s.volume,0)}${wUnit()} vol`:''}</div>
            <div style="margin-top:5px;">${muscles.map(m=>`<span class="muscle-chip">${m}</span>`).join("")}</div>
          </div>
          <button class="del" data-del-session="${s.id}" aria-label="Delete workout">${svg('x',14)}</button>
        </div>`;}).join("")}
    `;
  }
  const s = state.session;
  const muscles = sessionMuscles(s.exercises);
  const isEditing = !!state.editingSessionId;
  const liveVolume = Math.round(computeSessionVolume(s.exercises));
  return `
    <div class="row-between" style="margin-bottom:4px;">
      <div style="flex:1;min-width:0;">
        <div class="eyebrow-label" style="margin:0 0 2px;">${isEditing ? 'Editing Workout' : 'In Progress'}</div>
        <div class="mono" style="font-size:12px;color:var(--muted);">
          ${isEditing ? s.date : `Started ${new Date(s.startedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · <span id="session-elapsed">${formatDuration(Date.now()-s.startedAt)}</span>`}
          ${liveVolume>0?` · ${displayW(liveVolume,0).toLocaleString()}${wUnit()} vol`:''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        ${isEditing?`<button class="btn btn-ghost" style="padding:10px 14px;" data-action="cancel-edit-session">Cancel</button>`:''}
        <button class="btn btn-accent" style="padding:10px 18px;" data-action="finish-session">${isEditing?'Save':'Finish'}</button>
      </div>
    </div>
    <input type="text" id="session-title" placeholder="Workout title (e.g. Push Day)" value="${(s.title||'').replace(/"/g,'&quot;')}"
      style="width:100%;background:none;border:none;border-bottom:2px solid var(--border);padding:8px 2px;font-size:20px;font-weight:900;color:var(--text);margin:10px 0 8px;font-family:inherit;">
    ${muscles.length? `<div style="margin:2px 0 4px;">${muscles.map(m=>`<span class="muscle-chip active">${m}</span>`).join("")}</div>`:""}
    <textarea id="session-notes" placeholder="Workout notes (how it felt, conditions, anything worth remembering)…"
      style="width:100%;background:var(--surface-alt);border-radius:8px;padding:9px 10px;font-size:12px;color:var(--text);margin:6px 0 14px;resize:vertical;min-height:36px;border:none;font-family:inherit;">${s.notes||''}</textarea>

    <div class="eyebrow-label">Add Exercise</div>
    <button class="btn btn-ghost btn-block" data-action="open-exercise-picker" style="margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:8px;">${svg('plus',16)} Add Exercise</button>

    ${s.exercises.length===0?`<div class="empty-note">No exercises added yet.</div>`:
      s.exercises.map((ex,exi)=>{
        const muscle = getMuscle(ex.name);
        const restLabel = ex.restDuration ? `${ex.restDuration}s` : "OFF";
        const showRPE = state.settings.rpeTracking;
        const isBarbell = (LIBRARY["Barbell"]||[]).some(i=>i[0]===ex.name);
        const showPlates = state.settings.plateCalc && isBarbell;
        const gridCols = showRPE ? "30px 1fr 52px 52px 44px 32px" : "30px 1fr 62px 62px 32px";
        const menuOpen = state.exerciseMenuOpen===exi;
        return `
        <div class="ex-log-card">
          ${ex.supersetWithNext ? `<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px;color:var(--accent);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">${svg('link',12)} Superset with next exercise</div>` : ''}
          <div class="row-between" style="margin-bottom:4px;position:relative;">
            <div>
              <div style="font-weight:800;color:var(--steel);font-size:15px;">${ex.name}</div>
              <span class="muscle-chip">${muscle}</span>
            </div>
            <button class="del" data-toggle-ex-menu="${exi}" aria-label="Exercise options">${svg('moreVert',17)}</button>
            ${menuOpen ? `
              <div class="ex-menu-backdrop" data-close-ex-menu></div>
              <div class="ex-menu">
                <button class="ex-menu-item" data-move-exercise-up="${exi}" ${exi===0?'disabled':''}>${svg('chevronUp',15)} Move Up</button>
                <button class="ex-menu-item" data-move-exercise-down="${exi}" ${exi===s.exercises.length-1?'disabled':''}>${svg('chevronDown',15)} Move Down</button>
                <button class="ex-menu-item" data-replace-exercise="${exi}">${svg('swap',15)} Replace Exercise</button>
                ${exi<s.exercises.length-1 ? `<button class="ex-menu-item" data-toggle-superset="${exi}">${svg('link',15)} ${ex.supersetWithNext?'Remove Superset':'Add to Superset'}</button>` : ''}
                <button class="ex-menu-item" data-view-history="${encodeURIComponent(ex.name)}">${svg('progress',15)} View History</button>
                <button class="ex-menu-item" data-view-instructions="${encodeURIComponent(ex.name)}">${svg('book',15)} View Instructions</button>
                <button class="ex-menu-item" data-del-exercise="${exi}" style="color:#ff6b6b;">${svg('x',15)} Remove Exercise</button>
              </div>
            ` : ''}
          </div>
          <input type="text" class="notes-inline" placeholder="Add notes here…" value="${ex.notes||''}" data-notes-exercise="${exi}">
          <div class="row-between">
            <button class="rest-toggle" data-rest-toggle="${exi}">${svg('workout',13)} Rest Timer: ${restLabel}</button>
            ${showPlates?`<button class="rest-toggle" data-plate-calc="${exi}" style="color:var(--accent);">Plates</button>`:""}
          </div>
          ${state.plateCalcOpen===String(exi) ? renderPlatePopover(exi) : ""}

          <div class="set-table-header" style="grid-template-columns:${gridCols};">
            <span>SET</span><span>PREVIOUS</span><span>${wUnit().toUpperCase()}</span><span>REPS</span>${showRPE?"<span>RPE</span>":""}<span></span>
          </div>
          ${ex.sets.map((set,si)=>{
            const prev = getPreviousSet(ex.name, si);
            const prevLabel = prev ? `${prev.weight?displayW(prev.weight):'–'}${wUnit()} × ${prev.reps||'–'}` : "–";
            const typeMeta = SET_TYPE_META[set.type||"working"];
            const isEmpty = !set.weight && !set.reps;
            const canDelete = ex.sets.length>1;
            return `<div class="set-row ${set.done?'done':''}" style="grid-template-columns:${gridCols};">
              <button class="mono set-num" data-cycle-set-type="${exi}|${si}" style="color:${typeMeta.color};background:none;border:none;cursor:pointer;font-weight:800;" title="Tap to mark warm-up / drop / failure set">${typeMeta.badge}${si+1}</button>
              <span class="mono set-prev">${prevLabel}</span>
              <input type="number" class="mono set-input" value="${displayW(set.weight)}" data-set-field="${exi}|${si}|weight" placeholder="–">
              <input type="text" class="mono set-input" value="${set.reps}" data-set-field="${exi}|${si}|reps" placeholder="–">
              ${showRPE?`<button class="rpe-btn" data-rpe="${exi}|${si}">${set.rpe||'RPE'}</button>`:""}
              ${isEmpty && canDelete
                ? `<button class="set-check" data-del-set="${exi}|${si}" title="Delete unused set" style="color:#ff6b6b;">${svg('x',13)}</button>`
                : `<button class="set-check ${set.done?'done':''}" data-set-done="${exi}|${si}" aria-label="${set.done?'Mark set incomplete':'Mark set complete'}">${set.done?svg('check',13):''}</button>`}
            </div>`;
          }).join("")}
          <button class="add-set-btn" data-add-set="${exi}">${svg('plus',14)} Add Set</button>
        </div>
      `;}).join("")}
  `;
}

/* Safe display title for any workout, old or new. Old workoutLog entries
   (logged before this feature) simply have no `title` field -- falls back
   to "Workout" rather than showing blank or undefined. */

function renderExerciseAnimation(detail){
  if(!detail || !detail.animationAvailable || (!detail.animationWebmUrl && !detail.animationMp4Url)){
    return `<div class="ex-anim-fallback">
      ${detail && detail.thumbnailUrl ? `<img src="${detail.thumbnailUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : svg('workout',28)}
      <div style="font-size:12px;color:var(--muted);margin-top:8px;">No demonstration video yet</div>
    </div>`;
  }
  // Lazy: only the <video> tag with preload="none" is emitted; nothing downloads until
  // the browser actually needs it (and only once this detail screen is on-DOM at all).
  return `<div class="ex-anim-wrap">
    <video id="ex-anim-video" class="ex-anim-video" loop muted playsinline preload="none"
      ${detail.thumbnailUrl?`poster="${detail.thumbnailUrl}"`:''}>
      ${detail.animationWebmUrl?`<source src="${detail.animationWebmUrl}" type="video/webm">`:''}
      ${detail.animationMp4Url?`<source src="${detail.animationMp4Url}" type="video/mp4">`:''}
    </video>
  </div>`;
}

/* Every session that contains this exercise, newest first, with that session's
   PR status for this exercise (if any) attached for a quick indicator. */

function renderExerciseDetail(name){
  const detail = EXERCISE_DETAILS[name];
  const all = allLibraryExercises();
  const libEntry = all.find(e=>e.name===name);
  const muscle = detail ? detail.primaryMuscle : (libEntry ? libEntry.muscle : getMuscle(name));
  const tab = state.exerciseDetailTab || "summary";
  const history = exerciseHistoryEntries(name);
  const prs = exercisePRs(name);

  return `
    <div class="row-between" style="margin-bottom:4px;">
      <button class="btn btn-ghost" data-action="close-exercise-detail" style="padding:6px 12px;font-size:12px;">← Back</button>
    </div>
    <div style="font-size:20px;font-weight:900;margin:10px 0 6px;">${name}</div>
    <span class="muscle-chip active">${muscle}</span>

    <div style="display:flex;gap:6px;margin:14px 0;">
      ${[["summary","Summary"],["history","History"],["howto","How To"]].map(([key,label])=>`
        <button class="cat-chip ${tab===key?'active':''}" data-ex-detail-tab="${key}" style="flex:1;text-align:center;">${label}</button>
      `).join("")}
    </div>

    ${tab==="summary" ? renderExerciseDetailSummary(name, detail, libEntry, prs) : ""}
    ${tab==="history" ? renderExerciseDetailHistory(history) : ""}
    ${tab==="howto" ? renderExerciseDetailHowTo(name, detail, libEntry) : ""}

    <button class="btn btn-accent btn-block" data-action="add-detail-to-workout" data-exercise-name="${name}" style="margin-top:16px;">${svg('plus',16)} Add to Workout</button>
  `;
}

function renderExerciseDetailSummary(name, detail, libEntry, prs){
  const trend = exerciseProgressTrend(name, 20);
  const hasHistory = trend.length>=2;
  return `
    ${detail ? `<div class="grid2" style="margin-top:2px;margin-bottom:8px;">
      <div class="stat-card"><div class="stat-label">Equipment</div><div class="stat-value" style="font-size:15px;">${detail.equipment}</div></div>
      <div class="stat-card"><div class="stat-label">Difficulty</div><div class="stat-value" style="font-size:15px;">${detail.difficulty}</div></div>
      <div class="stat-card"><div class="stat-label">Movement Pattern</div><div class="stat-value" style="font-size:15px;">${detail.movementPattern}</div></div>
      <div class="stat-card"><div class="stat-label">Secondary Muscles</div><div class="stat-value" style="font-size:12px;line-height:1.4;">${detail.secondaryMuscles.join(", ")||'–'}</div></div>
    </div>` : ""}

    <div class="eyebrow-label" style="margin-top:14px;">Performance</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${!hasHistory ? `<div class="empty-note">Log this exercise across a couple of workouts to see a trend here.</div>` : `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px;">Top Set Weight</div>
        ${sparklineChart(trend.map(t=>({date:t.date, value:displayW(t.weight)})), {color:"var(--accent)", unit:wUnit()})}
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;">Estimated 1RM</div>
        ${sparklineChart(trend.map(t=>({date:t.date, value:displayW(t.oneRM)})), {color:"var(--mint)", unit:wUnit()})}
      `}
    </div>

    <div class="eyebrow-label">Personal Records</div>
    ${prs.length===0 ? `<div class="empty-note" style="margin-bottom:16px;">No PRs logged for this exercise yet.</div>` : `
      <div class="info-box" style="padding:4px 14px;margin-bottom:16px;">
        ${prs.map(pr=>`<div class="row-between" style="padding:9px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:13px;font-weight:700;">${prTypeLabel(pr)}</span>
          <span style="display:flex;align-items:center;gap:8px;">
            <span class="mono" style="font-size:11px;color:var(--muted);">${new Date(pr.achievedAt).toLocaleDateString('default',{month:'short',day:'numeric',year:'numeric'})}</span>
            <span class="mono" style="font-size:13px;color:var(--accent);font-weight:800;">${prValueLabel(pr)}</span>
          </span>
        </div>`).join("")}
      </div>
    `}
    <div class="info-box" style="font-size:11px;color:var(--muted);margin-bottom:16px;">
      Cardio and HYROX-specific records (pace, distance, station/split times) aren't tracked yet — the logger only captures weight and reps, no distance or duration fields.
    </div>
  `;
}

function renderExerciseDetailHowTo(name, detail, libEntry){
  if(!detail){
    return `<div class="info-box" style="padding:14px;margin:16px 0;">
      <div style="font-size:13px;color:var(--muted);">Instructions not available for this exercise.${libEntry?` Suggested: <span style="color:var(--text);font-weight:700;">${libEntry.presc}</span>`:''}</div>
    </div>`;
  }
  return `
    ${renderExerciseAnimation(detail)}

    <div class="eyebrow-label" style="margin-top:16px;">Step-by-Step</div>
    <div class="info-box" style="padding:14px;">
      ${detail.instructions.map((s,i)=>`<div style="display:flex;gap:10px;padding:6px 0;${i>0?'border-top:1px solid var(--border);':''}">
        <span class="mono" style="color:var(--accent);font-weight:900;font-size:13px;flex-shrink:0;">${i+1}</span>
        <span style="font-size:13px;line-height:1.5;">${s}</span>
      </div>`).join("")}
    </div>

    <div class="eyebrow-label">Form Tips</div>
    <div class="info-box" style="padding:14px;">
      ${detail.formTips.map(t=>`<div style="display:flex;gap:8px;padding:4px 0;font-size:13px;"><span style="color:var(--mint);">✓</span> ${t}</div>`).join("")}
    </div>

    <div class="eyebrow-label">Common Mistakes</div>
    <div class="info-box" style="padding:14px;margin-bottom:16px;">
      ${detail.commonMistakes.map(t=>`<div style="display:flex;gap:8px;padding:4px 0;font-size:13px;"><span style="color:var(--accent);">✕</span> ${t}</div>`).join("")}
    </div>
  `;
}

function renderLibraryTab(){
  if(state.viewingExerciseDetail) return renderExerciseDetail(state.viewingExerciseDetail);

  const cats = ["All", ...Object.keys(LIBRARY), ...(state.customExercises.length?["Custom"]:[])];
  let items = allLibraryExercises();
  if(state.libCategory!=="All") items = items.filter(i=> i.cat===state.libCategory || (state.libCategory==="Custom" && i.custom));
  if(state.libSearch) items = items.filter(i=> i.name.toLowerCase().includes(state.libSearch.toLowerCase()));

  return `
    <div class="search-bar">
      <input type="text" id="lib-search" placeholder="Search any exercise…" value="${state.libSearch}">
    </div>
    <div style="margin-bottom:8px;">
      ${cats.map(c=>`<button class="cat-chip ${state.libCategory===c?'active':''}" data-cat="${c}">${c}</button>`).join("")}
    </div>
    <button class="btn btn-accent btn-block" data-action="show-add-custom" style="margin-bottom:16px;">${svg('plus',16)} Add Custom Exercise</button>
    <div id="custom-form-slot">${state.showCustomForm ? customExerciseForm() : ""}</div>
    ${items.map(ex=>`<div class="lib-item" data-view-exercise="${ex.name}" style="cursor:pointer;">
      <div><div class="lib-item-name">${ex.name}${ex.custom?' <span style="color:var(--accent);font-size:10px;">CUSTOM</span>':''}${EXERCISE_DETAILS[ex.name]?' <span style="color:var(--mint);font-size:10px;">GUIDE</span>':''}</div>
      <div class="lib-item-cat">${ex.cat} · ${ex.presc}</div></div>
    </div>`).join("")}
    ${items.length===0?`<div class="empty-note">No exercises match.</div>`:""}
  `;
}

function renderCsvImportPreview(){
  const r = state.csvImportPreview;
  if(r.kind==="workouts"){
    return `
      <div class="info-box" style="padding:12px 14px;margin-top:12px;background:var(--surface-alt);">
        <div style="font-weight:800;font-size:14px;margin-bottom:8px;">Import Preview — Workout History</div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;">Total rows found</span><span class="mono" style="font-weight:700;">${r.totalRows}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;">Sessions found</span><span class="mono" style="font-weight:700;">${r.sessionsFound}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--mint);">Valid sessions</span><span class="mono" style="font-weight:700;color:var(--mint);">${r.validCount}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--accent);">Invalid rows</span><span class="mono" style="font-weight:700;color:var(--accent);">${r.invalidCount}</span></div>
        <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--muted);">Duplicate (already imported)</span><span class="mono" style="font-weight:700;color:var(--muted);">${r.duplicateCount}</span></div>
        ${r.invalidRows.length ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Invalid rows: ${r.invalidRows.slice(0,5).map(x=>`row ${x.row} (${x.reason})`).join(", ")}${r.invalidRows.length>5?` +${r.invalidRows.length-5} more`:''}</div>` : ""}
        ${r.validCount>0 ? `
          <div style="font-size:11px;color:var(--muted);margin:10px 0 2px;">This will backfill Personal Records chronologically from your imported history, same as if you'd logged them in the app all along.</div>
          <button class="btn btn-accent btn-block" data-action="confirm-csv-import" style="margin-top:8px;">Import ${r.validCount} Session${r.validCount!==1?'s':''}</button>
        ` : `<div style="font-size:12px;color:var(--muted);margin-top:10px;">Nothing new to import — every session in this file is already in your history.</div>`}
        <button class="btn btn-ghost btn-block" data-action="cancel-csv-import" style="margin-top:8px;">Cancel</button>
      </div>
    `;
  }
  return `
    <div class="info-box" style="padding:12px 14px;margin-top:12px;background:var(--surface-alt);">
      <div style="font-weight:800;font-size:14px;margin-bottom:8px;">Import Preview — ${r.kind==="foods"?"Foods":"Exercises"}</div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;">Total rows found</span><span class="mono" style="font-weight:700;">${r.totalRows}</span></div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--mint);">Valid</span><span class="mono" style="font-weight:700;color:var(--mint);">${r.validCount}</span></div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--accent);">Invalid</span><span class="mono" style="font-weight:700;color:var(--accent);">${r.invalidCount}</span></div>
      <div class="row-between" style="padding:3px 0;"><span style="font-size:13px;color:var(--muted);">Duplicate (already exist)</span><span class="mono" style="font-weight:700;color:var(--muted);">${r.duplicateCount}</span></div>
      ${r.invalidRows.length ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Invalid rows: ${r.invalidRows.slice(0,5).map(x=>`row ${x.row} (${x.reason})`).join(", ")}${r.invalidRows.length>5?` +${r.invalidRows.length-5} more`:''}</div>` : ""}
      ${r.validCount>0 ? `
        ${r.kind==="foods" ? `<div style="font-size:11px;color:var(--muted);margin:8px 0 2px;">Imported as Favorite Foods for quick-add — this doesn't create any dated food-log entries.</div>` : ''}
        <button class="btn btn-accent btn-block" data-action="confirm-csv-import" style="margin-top:8px;">Import ${r.validCount} ${r.kind==="foods"?"Food":"Exercise"}${r.validCount!==1?'s':''}</button>
      ` : `<div style="font-size:12px;color:var(--muted);margin-top:10px;">Nothing valid to import.</div>`}
      <button class="btn btn-ghost btn-block" data-action="cancel-csv-import" style="margin-top:8px;">Cancel</button>
    </div>
  `;
}

function attachHandlers(){
  document.querySelectorAll("[data-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.tab = el.dataset.nav;
      render();
      if (["home", "health", "nutrition"].includes(state.tab)) window.dispatchEvent(new Event("ignyt:health-connect-navigation"));
    });
  });
  document.querySelectorAll("[data-close-more]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      if(e.target !== el) return; // ignore bubbled clicks from the sheet/cards inside
      state.tab = "home";
      render();
    });
  });
  document.querySelectorAll("[data-home-day]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.activeDayIdx = Number(el.dataset.homeDay);
      state.tab = "plan";
      state.viewingHyroxSchedule = true;
      render();
    });
  });

  // Settings
  document.querySelectorAll("[data-setting-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const key = el.dataset.settingToggle;
      state.settings[key] = !state.settings[key];
      if(key==="keepAwake") applyWakeLock();
      const NOTIFICATION_KEYS = ["workoutReminders","hydrationReminders","weeklyReports"];
      if(NOTIFICATION_KEYS.includes(key) && state.settings[key] && typeof Notification!=='undefined' && Notification.permission==='default'){
        // Contextual request: only fires the moment the user actually turns a reminder on, never at launch
        Notification.requestPermission();
      }
      render();
    });
  });
  const restSelect = document.getElementById("default-rest-select");
  if(restSelect) restSelect.addEventListener("change", ()=>{
    state.settings.defaultRest = Number(restSelect.value);
    persist();
  });
  const waterTargetSelect = document.getElementById("water-target-select");
  if(waterTargetSelect) waterTargetSelect.addEventListener("change", ()=>{
    state.settings.waterTargetMl = Number(waterTargetSelect.value);
    persist();
  });
  document.querySelectorAll("[data-theme-select]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.settings.theme = el.dataset.themeSelect;
      render();
    });
  });
  document.querySelectorAll("[data-weight-unit]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.settings.weightUnit = el.dataset.weightUnit;
      render();
    });
  });
  const testNotifBtn = document.querySelector('[data-action="test-notification"]');
  if(testNotifBtn) testNotifBtn.addEventListener("click", ()=>{
    if(typeof Notification==='undefined'){
      showToast("This browser doesn't support notifications.", "error", render);
      return;
    }
    if(Notification.permission==='granted'){
      new Notification("Ignyt", { body:"Notifications are working. Reminders will look like this.", icon:"icon-192.png" });
    } else if(Notification.permission==='denied'){
      showToast("Notifications are blocked for this site — enable them in your browser settings first.", "error", render);
    } else {
      Notification.requestPermission().then(perm=>{
        if(perm==='granted') new Notification("Ignyt", { body:"Notifications are working. Reminders will look like this.", icon:"icon-192.png" });
      });
    }
  });
  const expJsonBtn = document.querySelector('[data-action="export-json"]');
  if(expJsonBtn) expJsonBtn.addEventListener("click", exportAllJSON);
  const expWkBtn = document.querySelector('[data-action="export-workouts-csv"]');
  if(expWkBtn) expWkBtn.addEventListener("click", exportWorkoutsCSV);
  const expMeasBtn = document.querySelector('[data-action="export-measurements-csv"]');
  if(expMeasBtn) expMeasBtn.addEventListener("click", exportMeasurementsCSV);
  const impBtn = document.querySelector('[data-action="import-json"]');
  const impFile = document.getElementById("import-file");
  if(impBtn && impFile){
    impBtn.addEventListener("click", ()=> impFile.click());
    impFile.addEventListener("change", ()=>{ if(impFile.files.length) importAllJSON(impFile.files[0]); });
  }
  const impCsvBtn = document.querySelector('[data-action="import-csv"]');
  const impCsvFile = document.getElementById("import-csv");
  if(impCsvBtn && impCsvFile){
    impCsvBtn.addEventListener("click", ()=> impCsvFile.click());
    impCsvFile.addEventListener("change", ()=>{ if(impCsvFile.files.length) importCsv(impCsvFile.files[0]); });
  }
  const confirmCsvBtn = document.querySelector('[data-action="confirm-csv-import"]');
  if(confirmCsvBtn) confirmCsvBtn.addEventListener("click", ()=>{
    const r = state.csvImportPreview;
    if(!r) return;
    if(r.kind==="workouts"){
      if(!r.validSessions.length) return;
      // Chronological backfill: process oldest-first, and for each session only let PR
      // detection "see" sessions that genuinely happened before it (existing history up
      // to that point, plus already-backfilled imports) -- not any newer sessions already
      // in the log -- so PRs land on the correct date instead of being silently skipped
      // because a later real session already held the record.
      const chronological = r.validSessions.slice().sort((a,b)=> a.startedAt-b.startedAt);
      const existingSnapshot = state.workoutLog.slice();
      const backfilled = [];
      let prCount = 0;
      chronological.forEach(session=>{
        state.workoutLog = existingSnapshot.filter(e=>e.startedAt <= session.startedAt).concat(backfilled);
        const newPRs = detectPRs(
          { exercises: session.exercises },
          session.id,
          session.finishedAt || session.startedAt,
          session.volume
        );
        if(newPRs.length){ state.prs = newPRs.concat(state.prs); prCount += newPRs.length; }
        backfilled.push(session);
      });
      state.workoutLog = existingSnapshot.concat(backfilled).sort((a,b)=> b.startedAt-a.startedAt);
      const newlyUnlocked = checkAchievements();
      const sessionCount = r.validCount;
      state.csvImportPreview = null;
      persist();
      render();
      showToast("Imported "+sessionCount+" session"+(sessionCount!==1?"s":"")+", backfilled "+prCount+" PR"+(prCount!==1?"s":"")+(newlyUnlocked.length?", unlocked "+newlyUnlocked.length+" achievement"+(newlyUnlocked.length!==1?"s":""):"")+".", "success", render);
      return;
    }
    if(!r.validRows || !r.validRows.length) return;
    if(r.kind==="foods"){
      state.favoriteFoods = state.favoriteFoods.concat(r.validRows);
      const foodCount = r.validCount;
      state.csvImportPreview = null;
      persist();
      render();
      showToast("Imported "+foodCount+" food"+(foodCount!==1?"s":"")+" as favorites.", "success", render);
      return;
    }
    state.customExercises = state.customExercises.concat(r.validRows);
    const count = r.validCount;
    state.csvImportPreview = null;
    persist();
    render();
    showToast("Imported "+count+" exercise"+(count!==1?"s":"")+".", "success", render);
  });
  const cancelCsvBtn = document.querySelector('[data-action="cancel-csv-import"]');
  if(cancelCsvBtn) cancelCsvBtn.addEventListener("click", ()=>{
    state.csvImportPreview = null;
    render();
  });
  const resetBtn = document.querySelector('[data-action="reset-all"]');
  if(resetBtn) resetBtn.addEventListener("click", async ()=>{
    if(await confirmDialog("This permanently deletes ALL app data (workouts, logs, routines, settings). Are you sure?", render)){
      if(await confirmDialog("Last check — this cannot be undone. Delete everything?", render)){
        ALL_DATA_KEYS.forEach(k=>localStorage.removeItem(k));
        location.reload();
      }
    }
  });

  // Plan tab
  const openScheduleBtn = document.querySelector('[data-action="open-hyrox-schedule"]');
  if(openScheduleBtn) openScheduleBtn.addEventListener("click", ()=>{
    state.viewingHyroxSchedule = true;
    render();
  });
  const closeScheduleBtn = document.querySelector('[data-action="close-hyrox-schedule"]');
  if(closeScheduleBtn) closeScheduleBtn.addEventListener("click", ()=>{
    state.viewingHyroxSchedule = false;
    render();
  });
  const openRaceBtn = document.querySelector('[data-action="open-race-mode"]');
  if(openRaceBtn) openRaceBtn.addEventListener("click", ()=>{
    state.viewingRaceMode = true;
    render();
  });
  const closeRaceBtn = document.querySelector('[data-action="close-race-mode"]');
  if(closeRaceBtn) closeRaceBtn.addEventListener("click", async ()=>{
    if(state.raceActive && !(await confirmDialog("Leave race mode? Your in-progress race will be discarded.", render))) return;
    state.raceActive = null;
    state.viewingRaceMode = false;
    stopRaceTimer();
    render();
  });
  const startRaceBtn = document.querySelector('[data-action="start-race"]');
  if(startRaceBtn) startRaceBtn.addEventListener("click", ()=>{
    const now = Date.now();
    state.raceActive = { startedAt: now, segmentStartedAt: now, currentIndex: 0, segments: [] };
    ensureRaceTimerRunning();
    render();
  });
  const raceNextBtn = document.querySelector('[data-action="race-next-segment"]');
  if(raceNextBtn) raceNextBtn.addEventListener("click", ()=>{
    const r = state.raceActive;
    if(!r) return;
    const seg = RACE_SEGMENTS[r.currentIndex];
    const now = Date.now();
    r.segments.push({ name:seg.name, detail:seg.detail||"", type:seg.type, durationMs: now - r.segmentStartedAt });
    if(r.currentIndex >= RACE_SEGMENTS.length-1){
      // Race complete -- auto-save to history, same "commit on finish" pattern as regular workouts
      const totalMs = now - r.startedAt;
      state.raceLog.unshift({ id: now, date: new Date().toISOString().slice(0,10), totalMs, segments: r.segments });
      state.raceActive = null;
      state.viewingRaceMode = false; // return to Plan home rather than parking on the race sub-screen
      stopRaceTimer();
      const newlyUnlocked = checkAchievements();
      if(newlyUnlocked.length) state.lastUnlockedAchievements = newlyUnlocked;
    } else {
      r.currentIndex++;
      r.segmentStartedAt = now;
    }
    render();
  });
  const abortRaceBtn = document.querySelector('[data-action="abort-race"]');
  if(abortRaceBtn) abortRaceBtn.addEventListener("click", async ()=>{
    if(!(await confirmDialog("Abort this race? Progress so far will not be saved.", render))) return;
    state.raceActive = null;
    stopRaceTimer();
    render();
  });
  document.querySelectorAll("[data-level]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.activeLevel = el.dataset.level;
      rebuildWeeks();
      render();
    });
  });
  document.querySelectorAll("[data-week]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.activeWeek = Number(el.dataset.week); state.activeDayIdx = 0; render(); });
  });
  document.querySelectorAll("[data-day]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.activeDayIdx = Number(el.dataset.day); render(); });
  });
  document.querySelectorAll("[data-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const key = el.dataset.toggle;
      if(state.completed[key]) delete state.completed[key];
      else state.completed[key] = Date.now();
      const newlyUnlocked = checkAchievements();
      if(newlyUnlocked.length) state.lastUnlockedAchievements = newlyUnlocked;
      render();
    });
  });

  // Workout tab
  const startBtn = document.querySelector('[data-action="start-session"]');
  if(startBtn) startBtn.addEventListener("click", ()=>{
    state.session = { startedAt: Date.now(), exercises: [], notes:"", title:"" };
    state.editingSessionId = null;
    applyWakeLock();
    render();
  });

  // Routines
  const toggleBuilderBtn = document.querySelector('[data-action="toggle-routine-builder"]');
  if(toggleBuilderBtn) toggleBuilderBtn.addEventListener("click", ()=>{
    state.routineBuilder = state.routineBuilder ? null : { name:"", exercises:[] };
    render();
  });
  const openPickerForRoutineBtn = document.querySelector('[data-action="open-exercise-picker-for-routine"]');
  if(openPickerForRoutineBtn) openPickerForRoutineBtn.addEventListener("click", ()=>{
    const nameEl = document.getElementById("routine-name");
    if(nameEl) state.routineBuilder.name = nameEl.value;
    const setsEl = document.getElementById("routine-ex-sets");
    if(setsEl) state.routineBuilderSets = Math.max(1, Number(setsEl.value)||3);
    state.showExercisePicker = true;
    state.exercisePickerContext = "routine";
    state.exercisePickerSearch = "";
    state.exercisePickerEquipment = "All";
    state.exercisePickerMuscle = "All";
    state.exercisePickerShowCreate = false;
    render();
  });
  const routineSetsEl = document.getElementById("routine-ex-sets");
  if(routineSetsEl) routineSetsEl.addEventListener("change", ()=>{
    state.routineBuilderSets = Math.max(1, Number(routineSetsEl.value)||3);
    persist();
  });
  const pickerRoutineSetsEl = document.getElementById("ex-picker-routine-sets");
  if(pickerRoutineSetsEl) pickerRoutineSetsEl.addEventListener("change", ()=>{
    state.routineBuilderSets = Math.max(1, Number(pickerRoutineSetsEl.value)||3);
    persist();
  });
  document.querySelectorAll("[data-remove-builder-ex]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const nameEl = document.getElementById("routine-name");
      if(nameEl) state.routineBuilder.name = nameEl.value;
      state.routineBuilder.exercises.splice(Number(el.dataset.removeBuilderEx),1);
      render();
    });
  });
  const saveRoutineBtn = document.querySelector('[data-action="save-routine"]');
  if(saveRoutineBtn) saveRoutineBtn.addEventListener("click", ()=>{
    const nameEl = document.getElementById("routine-name");
    const name = nameEl ? nameEl.value.trim() : "";
    if(!name || !state.routineBuilder.exercises.length) return;
    state.routines.unshift({ id: Date.now(), name, exercises: state.routineBuilder.exercises });
    state.routineBuilder = null;
    render();
  });
  document.querySelectorAll("[data-del-routine]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.routines = state.routines.filter(r=>r.id !== Number(el.dataset.delRoutine));
      render();
    });
  });
  document.querySelectorAll("[data-start-routine]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const routine = state.routines.find(r=>r.id === Number(el.dataset.startRoutine));
      if(!routine) return;
      state.session = {
        startedAt: Date.now(),
        notes: "",
        title: routine.name,
        exercises: routine.exercises.map(e=>({
          name: e.name, notes:"", restDuration:state.settings.defaultRest,
          sets: Array.from({length:e.sets}, ()=>({weight:"",reps:"",rpe:"",done:false,type:"working"}))
        }))
      };
      state.editingSessionId = null;
      state.tab = "workout";
      applyWakeLock();
      render();
    });
  });
  const finishBtn = document.querySelector('[data-action="finish-session"]');
  if(finishBtn) finishBtn.addEventListener("click", ()=>{
    if(state.session.exercises.length){
      const volume = computeSessionVolume(state.session.exercises);

      if(state.editingSessionId){
        // Patch the existing history entry in place — no new PR detection (this is a correction,
        // not a new performance) and no duplicate log entry.
        const idx = state.workoutLog.findIndex(s=>s.id===state.editingSessionId);
        if(idx!==-1){
          state.workoutLog[idx] = Object.assign({}, state.workoutLog[idx], {
            exercises: state.session.exercises,
            notes: state.session.notes || "",
            title: state.session.title || "",
            volume
          });
        }
        state.editingSessionId = null;
      } else {
        const finishedAt = Date.now();
        const durationMin = Math.max(1, Math.round((finishedAt - state.session.startedAt)/60000));
        const workoutId = Date.now();
        const newPRs = detectPRs(state.session, workoutId, finishedAt, volume);
        state.workoutLog.unshift({
          id: workoutId,
          date: new Date().toISOString().slice(0,10),
          startedAt: state.session.startedAt,
          finishedAt, durationMin, volume,
          exercises: state.session.exercises,
          notes: state.session.notes || "",
          title: state.session.title || ""
        });
        if(newPRs.length){
          state.prs = newPRs.concat(state.prs);
          state.lastSessionPRs = newPRs;
        }
      }
      const newlyUnlocked = checkAchievements();
      if(newlyUnlocked.length) state.lastUnlockedAchievements = newlyUnlocked;
    }
    state.session = null;
    applyWakeLock();
    render();
  });
  const cancelEditBtn = document.querySelector('[data-action="cancel-edit-session"]');
  if(cancelEditBtn) cancelEditBtn.addEventListener("click", ()=>{
    state.session = null;
    state.editingSessionId = null;
    applyWakeLock();
    render();
  });
  const editWorkoutBtn = document.querySelector('[data-action="edit-workout"]');
  if(editWorkoutBtn) editWorkoutBtn.addEventListener("click", ()=>{
    const s = state.workoutLog.find(x=>x.id===Number(editWorkoutBtn.dataset.sessionId));
    if(!s) return;
    // Deep-clone so edits don't mutate history until Save is pressed
    state.session = {
      startedAt: s.startedAt || Date.now(),
      date: s.date,
      notes: s.notes || "",
      title: s.title || "",
      exercises: JSON.parse(JSON.stringify(s.exercises))
    };
    state.editingSessionId = s.id;
    state.viewingSessionId = null;
    applyWakeLock();
    render();
  });
  const dismissPRsBtn = document.querySelector('[data-action="dismiss-prs"]');
  if(dismissPRsBtn) dismissPRsBtn.addEventListener("click", ()=>{
    state.lastSessionPRs = null;
    render();
  });
  const dismissAchBtn = document.querySelector('[data-action="dismiss-achievements"]');
  if(dismissAchBtn) dismissAchBtn.addEventListener("click", ()=>{
    state.lastUnlockedAchievements = null;
    render();
  });
  document.querySelectorAll("[data-view-session]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      state.viewingSessionId = Number(el.dataset.viewSession);
      render();
    });
  });
  const closeDetailBtn = document.querySelector('[data-action="close-session-detail"]');
  if(closeDetailBtn) closeDetailBtn.addEventListener("click", ()=>{
    state.viewingSessionId = null;
    render();
  });
  const showAllBtn = document.querySelector('[data-action="toggle-show-all-sessions"]');
  if(showAllBtn) showAllBtn.addEventListener("click", ()=>{
    state.showAllSessions = !state.showAllSessions;
    render();
  });
  const repeatBtn = document.querySelector('[data-action="repeat-workout"]');
  if(repeatBtn) repeatBtn.addEventListener("click", ()=>{
    const s = state.workoutLog.find(x=>x.id===Number(repeatBtn.dataset.sessionId));
    if(!s) return;
    state.session = {
      startedAt: Date.now(),
      notes: "",
      title: s.title || "",
      exercises: s.exercises.map(e=>({
        name: e.name, notes:"", restDuration: e.restDuration || state.settings.defaultRest,
        sets: e.sets.map(()=>({weight:"",reps:"",rpe:"",done:false,type:"working"}))
      }))
    };
    state.viewingSessionId = null;
    state.editingSessionId = null;
    applyWakeLock();
    render();
  });
  const saveAsRoutineBtn = document.querySelector('[data-action="save-session-as-routine"]');
  if(saveAsRoutineBtn) saveAsRoutineBtn.addEventListener("click", ()=>{
    const s = state.workoutLog.find(x=>x.id===Number(saveAsRoutineBtn.dataset.sessionId));
    if(!s) return;
    state.routineBuilder = {
      name: "",
      exercises: s.exercises.map(e=>({ name: e.name, sets: e.sets.length || 1 }))
    };
    state.viewingSessionId = null;
    render();
  });
  const delConfirmedBtn = document.querySelector('[data-action="delete-session-confirmed"]');
  if(delConfirmedBtn) delConfirmedBtn.addEventListener("click", async ()=>{
    if(!(await confirmDialog("Delete this workout permanently? This can't be undone.", render))) return;
    const id = Number(delConfirmedBtn.dataset.sessionId);
    state.workoutLog = state.workoutLog.filter(s=>s.id !== id);
    state.viewingSessionId = null;
    render();
  });
  document.querySelectorAll("[data-del-session]").forEach(el=>{
    el.addEventListener("click", async (e)=>{
      e.stopPropagation(); // don't also trigger the row's data-view-session click
      if(!(await confirmDialog("Delete this workout permanently? This can't be undone.", render))) return;
      state.workoutLog = state.workoutLog.filter(s=>s.id !== Number(el.dataset.delSession));
      render();
    });
  });
  const addExBtn = document.querySelector('[data-action="add-exercise"]');
  if(addExBtn) addExBtn.addEventListener("click", ()=>{
    const picker = document.getElementById("ex-picker");
    if(picker && picker.value){
      state.session.exercises.push({ name: picker.value, notes:"", restDuration:state.settings.defaultRest,
        sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
      render();
    }
  });
  document.querySelectorAll("[data-toggle-ex-menu]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      e.stopPropagation();
      const i = Number(el.dataset.toggleExMenu);
      state.exerciseMenuOpen = state.exerciseMenuOpen===i ? null : i;
      render();
    });
  });
  document.querySelectorAll("[data-close-ex-menu]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-toggle-superset]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const i = Number(el.dataset.toggleSuperset);
      const ex = state.session.exercises[i];
      ex.supersetWithNext = !ex.supersetWithNext;
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-replace-exercise]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.replacingExerciseIndex = Number(el.dataset.replaceExercise);
      state.exerciseMenuOpen = null;
      state.showExercisePicker = true;
      state.exercisePickerContext = "replace";
      state.exercisePickerSearch = "";
      state.exercisePickerEquipment = "All";
      state.exercisePickerMuscle = "All";
      state.exercisePickerShowCreate = false;
      render();
    });
  });
  document.querySelectorAll("[data-view-history]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.viewingExerciseDetail = decodeURIComponent(el.dataset.viewHistory);
      state.exerciseDetailTab = "history";
      state.exerciseMenuOpen = null;
      state.tab = "library";
      render();
    });
  });
  document.querySelectorAll("[data-view-instructions]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.viewingExerciseDetail = decodeURIComponent(el.dataset.viewInstructions);
      state.exerciseDetailTab = "howto";
      state.exerciseMenuOpen = null;
      state.tab = "library";
      render();
    });
  });
  document.querySelectorAll("[data-del-exercise]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.session.exercises.splice(Number(el.dataset.delExercise),1);
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-move-exercise-up]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const i = Number(el.dataset.moveExerciseUp);
      if(i<=0) return;
      const ex = state.session.exercises;
      [ex[i-1], ex[i]] = [ex[i], ex[i-1]];
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-move-exercise-down]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const i = Number(el.dataset.moveExerciseDown);
      const ex = state.session.exercises;
      if(i>=ex.length-1) return;
      [ex[i], ex[i+1]] = [ex[i+1], ex[i]];
      state.exerciseMenuOpen = null;
      render();
    });
  });
  document.querySelectorAll("[data-cycle-set-type]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.cycleSetType.split("|");
      const set = state.session.exercises[Number(exi)].sets[Number(si)];
      set.type = nextSetType(set.type);
      render();
    });
  });
  const sessionTitleEl = document.getElementById("session-title");
  if(sessionTitleEl) sessionTitleEl.addEventListener("change", ()=>{
    state.session.title = sessionTitleEl.value;
    persist();
  });
  const sessionNotesEl = document.getElementById("session-notes");
  if(sessionNotesEl) sessionNotesEl.addEventListener("change", ()=>{
    state.session.notes = sessionNotesEl.value;
    persist();
  });
  document.querySelectorAll("[data-notes-exercise]").forEach(el=>{
    el.addEventListener("change", ()=>{
      state.session.exercises[Number(el.dataset.notesExercise)].notes = el.value;
      persist();
    });
  });
  document.querySelectorAll("[data-rest-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const ex = state.session.exercises[Number(el.dataset.restToggle)];
      const idx = REST_OPTIONS.indexOf(ex.restDuration || 0);
      ex.restDuration = REST_OPTIONS[(idx+1) % REST_OPTIONS.length];
      render();
    });
  });
  document.querySelectorAll("[data-plate-calc]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const exi = el.dataset.plateCalc;
      state.plateCalcOpen = state.plateCalcOpen===exi ? null : exi;
      render();
    });
  });
  const runPlateBtn = document.querySelector('[data-action="run-plate-calc"]');
  if(runPlateBtn) runPlateBtn.addEventListener("click", ()=>{
    state.plateTarget = document.getElementById("plate-target").value;
    state.plateBar = document.getElementById("plate-bar").value;
    render();
  });
  document.querySelectorAll("[data-add-set]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const ex = state.session.exercises[Number(el.dataset.addSet)];
      const last = ex.sets[ex.sets.length-1];
      ex.sets.push({ weight: last?last.weight:"", reps: last?last.reps:"", rpe:"", done:false, type:"working" });
      render();
    });
  });
  document.querySelectorAll("[data-del-set]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.delSet.split("|").map(Number);
      const ex = state.session.exercises[exi];
      if(!ex || ex.sets.length<=1) return; // never delete the exercise's last remaining set
      ex.sets.splice(si,1); // remaining sets renumber automatically -- their "Set N" label is just their array index+1
      render();
    });
  });
  document.querySelectorAll("[data-set-field]").forEach(el=>{
    el.addEventListener("change", ()=>{
      const [exi,si,field] = el.dataset.setField.split("|");
      state.session.exercises[Number(exi)].sets[Number(si)][field] = field==="weight" ? parseInputW(el.value) : el.value;
      persist();
    });
  });
  document.querySelectorAll("[data-rpe]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.rpe.split("|").map(Number);
      const set = state.session.exercises[exi].sets[si];
      const idx = RPE_OPTIONS.indexOf(set.rpe || "–");
      set.rpe = RPE_OPTIONS[(idx+1) % RPE_OPTIONS.length];
      if(set.rpe === "–") set.rpe = "";
      render();
    });
  });
  document.querySelectorAll("[data-set-done]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [exi,si] = el.dataset.setDone.split("|").map(Number);
      const ex = state.session.exercises[exi];
      const set = ex.sets[si];
      set.done = !set.done;
      render();
      if(set.done && ex.restDuration>0 && state.settings.autoStartRest && !ex.supersetWithNext) startTimer(ex.restDuration);
    });
  });

  // Timer overlay
  const cancelTimer = document.querySelector('[data-action="cancel-timer"]');
  if(cancelTimer) cancelTimer.addEventListener("click", ()=>{
    if(state.timer && state.timer.handle) clearInterval(state.timer.handle);
    state.timer = null;
    render();
  });

  // Library tab
  const libSearch = document.getElementById("lib-search");
  if(libSearch) libSearch.addEventListener("input", (e)=>{
    state.libSearch = e.target.value;
    debounce("lib-search", ()=>{
      render();
      setTimeout(()=>{ const s=document.getElementById("lib-search"); if(s){ s.focus(); s.setSelectionRange(s.value.length,s.value.length); } },0);
    }, 150);
  });
  document.querySelectorAll("[data-cat]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.libCategory = el.dataset.cat; render(); });
  });
  document.querySelectorAll("[data-view-exercise]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.viewingExerciseDetail = el.dataset.viewExercise;
      state.exerciseDetailTab = "summary";
      render();
    });
  });
  document.querySelectorAll("[data-ex-detail-tab]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.exerciseDetailTab = el.dataset.exDetailTab;
      render();
    });
  });
  const closeExDetailBtn = document.querySelector('[data-action="close-exercise-detail"]');
  if(closeExDetailBtn) closeExDetailBtn.addEventListener("click", ()=>{
    state.viewingExerciseDetail = null;
    render();
  });
  const addDetailBtn = document.querySelector('[data-action="add-detail-to-workout"]');
  if(addDetailBtn) addDetailBtn.addEventListener("click", ()=>{
    const name = addDetailBtn.dataset.exerciseName;
    if(!state.session){
      state.session = { startedAt: Date.now(), exercises: [], notes:"", title:"" };
      state.editingSessionId = null;
      applyWakeLock();
    }
    state.session.exercises.push({ name, notes:"", restDuration:state.settings.defaultRest,
      sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
    state.viewingExerciseDetail = null;
    state.tab = "workout";
    render();
  });
  // Lazy video: only starts loading/playing once the detail screen with a real
  // animation is actually on-DOM, and pauses/releases if the tab is left.
  const exVideo = document.getElementById("ex-anim-video");
  if(exVideo){
    exVideo.play().catch(()=>{}); // preload="none" means this triggers the actual fetch, not before
    if(!window.__exAnimVisibilityHandlerAttached){
      window.__exAnimVisibilityHandlerAttached = true;
      document.addEventListener("visibilitychange", ()=>{
        const v = document.getElementById("ex-anim-video");
        if(!v) return;
        if(document.visibilityState==="hidden") v.pause(); else v.play().catch(()=>{});
      });
    }
  }
  const showCustomBtn = document.querySelector('[data-action="show-add-custom"]');
  if(showCustomBtn) showCustomBtn.addEventListener("click", ()=>{
    state.showCustomForm = !state.showCustomForm;
    render();
  });
  const saveCustomBtn = document.querySelector('[data-action="save-custom"]');
  if(saveCustomBtn) saveCustomBtn.addEventListener("click", ()=>{
    const name = document.getElementById("custom-name").value.trim();
    const cat = document.getElementById("custom-cat").value;
    const muscle = document.getElementById("custom-muscle").value;
    const presc = document.getElementById("custom-presc").value.trim() || "—";
    if(!name) return;
    state.customExercises.push({ name, cat, presc, unit:"reps", muscle });
    state.showCustomForm = false;
    render();
  });

  // Exercise picker (full-screen Add Exercise flow)
  const openPickerBtn = document.querySelector('[data-action="open-exercise-picker"]');
  if(openPickerBtn) openPickerBtn.addEventListener("click", ()=>{
    state.showExercisePicker = true;
    state.exercisePickerContext = "session";
    state.exercisePickerSearch = "";
    state.exercisePickerEquipment = "All";
    state.exercisePickerMuscle = "All";
    state.exercisePickerShowCreate = false;
    render();
  });
  const closePickerBtn = document.querySelector('[data-action="close-exercise-picker"]');
  if(closePickerBtn) closePickerBtn.addEventListener("click", ()=>{
    if(state.exercisePickerShowCreate){ state.exercisePickerShowCreate = false; render(); return; }
    state.showExercisePicker = false;
    state.replacingExerciseIndex = null;
    render();
  });
  const pickerSearchEl = document.getElementById("ex-picker-search");
  if(pickerSearchEl) pickerSearchEl.addEventListener("input", ()=>{
    state.exercisePickerSearch = pickerSearchEl.value;
    debounce("ex-picker-search", ()=>{
      render();
      setTimeout(()=>{ const s=document.getElementById("ex-picker-search"); if(s){ s.focus(); s.setSelectionRange(s.value.length,s.value.length); } },0);
    }, 150);
  });
  const pickerEquipEl = document.getElementById("ex-picker-equip");
  if(pickerEquipEl) pickerEquipEl.addEventListener("change", ()=>{
    state.exercisePickerEquipment = pickerEquipEl.value;
    render();
  });
  const pickerMuscleEl = document.getElementById("ex-picker-muscle");
  if(pickerMuscleEl) pickerMuscleEl.addEventListener("change", ()=>{
    state.exercisePickerMuscle = pickerMuscleEl.value;
    render();
  });
  document.querySelectorAll("[data-pick-exercise]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      if(e.target.closest("[data-view-exercise-from-picker]")) return; // let the info button handle its own click
      const name = el.dataset.pickExercise;
      if(state.exercisePickerContext==="routine"){
        state.routineBuilder.exercises.push({ name, sets: state.routineBuilderSets });
      } else if(state.exercisePickerContext==="replace"){
        const idx = state.replacingExerciseIndex;
        if(idx!=null && state.session.exercises[idx]){
          // New exercise, so old sets (tied to the old movement's weights/reps) don't carry over --
          // start it fresh, same as adding a brand new exercise, but keep its position in the list.
          state.session.exercises[idx] = { name, notes:"", restDuration:state.settings.defaultRest,
            sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] };
        }
        state.replacingExerciseIndex = null;
      } else {
        state.session.exercises.push({ name, notes:"", restDuration:state.settings.defaultRest,
          sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
      }
      state.showExercisePicker = false;
      render();
    });
  });
  document.querySelectorAll("[data-view-exercise-from-picker]").forEach(el=>{
    el.addEventListener("click", (e)=>{
      e.stopPropagation();
      state.viewingExerciseDetail = el.dataset.viewExerciseFromPicker;
      state.exerciseDetailTab = "summary";
      state.showExercisePicker = false;
      state.tab = "library";
      render();
    });
  });
  const showCreateBtn = document.querySelector('[data-action="show-create-in-picker"]');
  if(showCreateBtn) showCreateBtn.addEventListener("click", ()=>{
    state.exercisePickerShowCreate = true;
    render();
  });
  const saveCustomFromPickerBtn = document.querySelector('[data-action="save-custom-from-picker"]');
  if(saveCustomFromPickerBtn) saveCustomFromPickerBtn.addEventListener("click", ()=>{
    const name = document.getElementById("custom-name").value.trim();
    const cat = document.getElementById("custom-cat").value;
    const muscle = document.getElementById("custom-muscle").value;
    const presc = document.getElementById("custom-presc").value.trim() || "—";
    if(!name) return;
    state.customExercises.push({ name, cat, presc, unit:"reps", muscle });
    if(state.exercisePickerContext==="routine"){
      state.routineBuilder.exercises.push({ name, sets: state.routineBuilderSets });
    } else if(state.exercisePickerContext==="replace"){
      const idx = state.replacingExerciseIndex;
      if(idx!=null && state.session.exercises[idx]){
        state.session.exercises[idx] = { name, notes:"", restDuration:state.settings.defaultRest,
          sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] };
      }
      state.replacingExerciseIndex = null;
    } else {
      state.session.exercises.push({ name, notes:"", restDuration:state.settings.defaultRest,
        sets: [{ weight:"", reps:"", rpe:"", done:false, type:"working" }] });
    }
    state.exercisePickerShowCreate = false;
    state.showExercisePicker = false;
    render();
  });

  // Body tab — profile (single source of truth)
  const pn = document.getElementById("p-name");
  const ph = document.getElementById("p-height");
  const pa = document.getElementById("p-age");
  if(pn) pn.addEventListener("change", ()=>{ state.profile.name = pn.value; render(); });
  if(ph) ph.addEventListener("change", ()=>{ state.profile.height = Number(ph.value)||state.profile.height; render(); });
  if(pa) pa.addEventListener("change", ()=>{ state.profile.age = Number(pa.value)||state.profile.age; render(); });
  document.querySelectorAll("[data-profile-gender]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.profile.gender = el.dataset.profileGender; render(); });
  });
  const pact = document.getElementById("p-activity");
  if(pact) pact.addEventListener("change", ()=>{ state.profile.activityMultiplier = Number(pact.value); render(); });
  const pgoal = document.getElementById("p-goal");
  if(pgoal) pgoal.addEventListener("change", ()=>{ state.profile.goalDelta = Number(pgoal.value); render(); });
  const phyroxExp = document.getElementById("p-hyrox-exp");
  if(phyroxExp) phyroxExp.addEventListener("change", ()=>{ state.profile.hyroxExperience = phyroxExp.value; render(); });
  const ptDays = document.getElementById("p-training-days");
  if(ptDays) ptDays.addEventListener("change", ()=>{ state.profile.trainingDays = Number(ptDays.value); render(); });
  document.querySelectorAll("[data-profile-equipment]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const eq = el.dataset.profileEquipment;
      if(state.profile.equipment.includes(eq)) state.profile.equipment = state.profile.equipment.filter(e=>e!==eq);
      else state.profile.equipment = state.profile.equipment.concat([eq]);
      render();
    });
  });

  const logBodyBtn = document.querySelector('[data-action="log-body"]');
  if(logBodyBtn) logBodyBtn.addEventListener("click", ()=>{
    const rawWeight = document.getElementById("b-weight").value;
    if(!rawWeight) return;
    const weight = parseInputW(rawWeight); // convert from displayed unit to canonical kg for storage
    const bf = document.getElementById("b-bodyfat").value;
    state.bodylog.unshift({
      id: Date.now(),
      date: document.getElementById("b-date").value,
      weight,
      sleep: document.getElementById("b-sleep").value,
      hrv: document.getElementById("b-hrv").value,
      waist: document.getElementById("b-waist").value,
      chest: document.getElementById("b-chest").value,
      arms: document.getElementById("b-arms").value,
      bodyfat: bf
    });
    // Weight logged here becomes the single source of truth -> recalcs calories/macros everywhere
    state.profile.weight = Number(weight) || state.profile.weight;
    render();
  });
  document.querySelectorAll("[data-del-body]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.bodylog = state.bodylog.filter(e=>e.id !== Number(el.dataset.delBody));
      if(state.bodylog.length) state.profile.weight = Number(state.bodylog[0].weight) || state.profile.weight;
      render();
    });
  });

  // Calculators
  const calcPicker = document.getElementById("calc-picker");
  if(calcPicker) calcPicker.addEventListener("change", ()=>{
    state.calc.activeCalc = calcPicker.value;
    state.calc.result = null;
    render();
  });
  document.querySelectorAll("[data-gender-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const [, val] = el.dataset.genderToggle.split("|");
      state.calc.gender = val;
      render();
    });
  });
  const runCalcBtn = document.querySelector('[data-action="run-calculator"]');
  if(runCalcBtn) runCalcBtn.addEventListener("click", ()=>{
    const c = state.calc;
    const readNum = (id, fallback)=>{ const el=document.getElementById(id); return el ? (Number(el.value)||fallback) : fallback; };
    c.age = readNum("calc-age", c.age);
    c.height = readNum("calc-height", c.height);
    c.weight = readNum("calc-weight", c.weight);
    c.neck = readNum("calc-neck", c.neck);
    c.waist = readNum("calc-waist", c.waist);
    c.hip = readNum("calc-hip", c.hip);
    c.restingHR = readNum("calc-resting", 0);
    c.bust = readNum("calc-bust", c.bust);
    c.bwaist = readNum("calc-bwaist", c.bwaist);
    c.highHip = readNum("calc-highhip", c.highHip);
    c.bhip = readNum("calc-bhip", c.bhip);
    const activityEl = document.getElementById("calc-activity");
    if(activityEl) c.activityMultiplier = Number(activityEl.value);
    const goalEl = document.getElementById("calc-goal");
    if(goalEl) c.goalDelta = Number(goalEl.value);

    if(c.activeCalc==="bmr"){
      const bmr = calcBMR(c.age, c.gender, c.height, c.weight);
      c.result = { type:"bmr", bmr };
    } else if(c.activeCalc==="calorie"){
      const bmr = calcBMR(c.age, c.gender, c.height, c.weight);
      c.result = { type:"calorie", tdee: bmr*c.activityMultiplier, goalDelta: c.goalDelta };
    } else if(c.activeCalc==="protein"){
      const tdee = calcBMR(c.age, c.gender, c.height, c.weight)*c.activityMultiplier;
      const m = calcMacros(tdee);
      c.result = { type:"protein", rda: c.weight*0.8, pctLo: m.protein.lo, pctHi: m.protein.hi,
        trainLo: c.weight*1.6, trainHi: c.weight*2.2 };
    } else if(c.activeCalc==="carbs"){
      const tdee = calcBMR(c.age, c.gender, c.height, c.weight)*c.activityMultiplier;
      const m = calcMacros(tdee);
      c.result = { type:"carbs", tdee, lo: m.carbs.lo, hi: m.carbs.hi };
    } else if(c.activeCalc==="fat"){
      const tdee = calcBMR(c.age, c.gender, c.height, c.weight)*c.activityMultiplier;
      const m = calcMacros(tdee);
      c.result = { type:"fat", tdee, lo: m.fat.lo, hi: m.fat.hi, satMax: m.satFatMax };
    } else if(c.activeCalc==="bodytype"){
      c.result = { type:"bodytype", ...calcBodyType(c.bust, c.bwaist, c.highHip, c.bhip) };
    } else if(c.activeCalc==="lbm"){
      c.result = { type:"lbm", ...calcLBM(c.gender, c.height, c.weight) };
    } else if(c.activeCalc==="ideal"){
      c.result = { type:"ideal", ...calcIdealWeight(c.gender, c.height) };
    } else if(c.activeCalc==="bodyfat"){
      c.result = { type:"bodyfat", bf: calcBodyFatNavy(c.gender, c.height, c.neck, c.waist, c.hip) };
    } else if(c.activeCalc==="hr"){
      c.result = { type:"hr", ...calcHeartRateZones(c.age, c.restingHR) };
    }
    render();
  });
  const applyProfileBtn = document.querySelector('[data-action="apply-calc-profile"]');
  if(applyProfileBtn) applyProfileBtn.addEventListener("click", ()=>{
    const c = state.calc;
    state.profile.age = c.age; state.profile.gender = c.gender;
    state.profile.height = c.height;
    if(c.activityMultiplier) state.profile.activityMultiplier = c.activityMultiplier;
    if(c.goalDelta!=null) state.profile.goalDelta = c.goalDelta;
    render();
  });

  // Progress tab
  document.querySelectorAll("[data-metric]").forEach(el=>{
    el.addEventListener("click", ()=>{ state.chartMetric = el.dataset.metric; render(); });
  });
  const progExSelect = document.getElementById("progress-exercise-select");
  if(progExSelect) progExSelect.addEventListener("change", ()=>{
    state.progressExercise = progExSelect.value;
    render();
  });
  document.querySelectorAll("[data-cal-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const delta = Number(el.dataset.calNav);
      const next = (state.calendarMonthOffset||0) + delta;
      if(next<=0) state.calendarMonthOffset = next;
      render();
    });
  });
  document.querySelectorAll("[data-bodydist-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const delta = Number(el.dataset.bodydistNav);
      const next = (state.bodyDistWeekOffset||0) + delta;
      if(next>=0) state.bodyDistWeekOffset = next;
      render();
    });
  });

  // Nutrition tab — meals & food log
  document.querySelectorAll("[data-meal-toggle]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const meal = el.dataset.mealToggle;
      state.mealOpen = state.mealOpen===meal ? null : meal;
      render();
    });
  });
  document.querySelectorAll("[data-log-meal-food]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const meal = el.dataset.logMealFood;
      const name = document.getElementById("food-name").value.trim();
      const cal = Number(document.getElementById("food-cal").value);
      if(!name || !cal) return;
      state.foodLog.unshift({ id: Date.now(), date: todayStr(), name, calories: cal, meal,
        protein: Number(document.getElementById("food-protein").value)||0,
        carbs: Number(document.getElementById("food-carbs").value)||0,
        fat: Number(document.getElementById("food-fat").value)||0,
        fibre: Number(document.getElementById("food-fibre").value)||0
      });
      render();
    });
  });
  document.querySelectorAll("[data-quick-add-food]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const meal = el.dataset.quickAddFood;
      state.foodLog.unshift({
        id: Date.now(), date: todayStr(), meal,
        name: el.dataset.foodName,
        calories: Number(el.dataset.foodCal)||0,
        protein: Number(el.dataset.foodProtein)||0,
        carbs: Number(el.dataset.foodCarbs)||0,
        fat: Number(el.dataset.foodFat)||0,
        fibre: Number(el.dataset.foodFibre)||0
      });
      render();
    });
  });
  const saveFavBtn = document.querySelector('[data-action="save-as-favorite"]');
  if(saveFavBtn) saveFavBtn.addEventListener("click", ()=>{
    const name = document.getElementById("food-name").value.trim();
    const cal = Number(document.getElementById("food-cal").value);
    if(!name || !cal) return;
    const fav = {
      name, calories: cal,
      protein: Number(document.getElementById("food-protein").value)||0,
      carbs: Number(document.getElementById("food-carbs").value)||0,
      fat: Number(document.getElementById("food-fat").value)||0,
      fibre: Number(document.getElementById("food-fibre").value)||0
    };
    if(!state.favoriteFoods.some(f=>f.name.toLowerCase()===name.toLowerCase())){
      state.favoriteFoods.push(fav);
    }
    render();
  });
  document.querySelectorAll("[data-add-water]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.waterLog.unshift({ id: Date.now(), date: todayStr(), ml: Number(el.dataset.addWater) });
      render();
    });
  });
  const undoWaterBtn = document.querySelector('[data-action="undo-water"]');
  if(undoWaterBtn) undoWaterBtn.addEventListener("click", ()=>{
    const idx = state.waterLog.findIndex(w=>w.date===todayStr());
    if(idx!==-1) state.waterLog.splice(idx,1);
    render();
  });
  document.querySelectorAll("[data-del-food]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.foodLog = state.foodLog.filter(f=>f.id !== Number(el.dataset.delFood));
      render();
    });
  });

  // Nutrition tab
  ["n-proteinpct","n-carbpct","n-fatpct","n-fibre"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener("change", ()=>{
      const g = (i)=>{ const e=document.getElementById(i); return e?Number(e.value):0; };
      state.nutrition.proteinPct = g("n-proteinpct");
      state.nutrition.carbPct = g("n-carbpct");
      state.nutrition.fatPct = g("n-fatpct");
      state.nutrition.fibreTarget = g("n-fibre");
      render();
    });
  });

  // Health Connect dashboard
  const closeHealthBtn = document.querySelector('[data-action="close-health-dashboard"]');
  if(closeHealthBtn) closeHealthBtn.addEventListener("click", ()=>{
    state.tab = "more";
    render();
  });
  const healthConnectBtn = document.querySelector('[data-action="health-connect"]');
  if(healthConnectBtn) healthConnectBtn.addEventListener("click", ()=>{
    if(window.HealthConnectIntegration) window.HealthConnectIntegration.connect();
  });
  const healthSyncBtn = document.querySelector('[data-action="health-sync"]');
  if(healthSyncBtn) healthSyncBtn.addEventListener("click", ()=>{
    if(window.HealthConnectIntegration) window.HealthConnectIntegration.sync();
  });
  const healthDisconnectBtn = document.querySelector('[data-action="health-disconnect"]');
  if(healthDisconnectBtn) healthDisconnectBtn.addEventListener("click", ()=>{
    if(window.HealthConnectIntegration) window.HealthConnectIntegration.disconnect();
  });
  document.querySelectorAll("[data-health-range]").forEach(el=>el.addEventListener("click", ()=>{
    state.healthInsightsRange = el.dataset.healthRange;
    render();
    if(window.HealthConnectIntegration) window.HealthConnectIntegration.sync();
  }));

  // Toast / confirm dialog
  const toastEl = document.querySelector('[data-action="dismiss-toast"]');
  if(toastEl) toastEl.addEventListener("click", ()=> dismissToast(render));
  document.querySelectorAll("[data-dialog-action]").forEach(el=>{
    el.addEventListener("click", ()=> resolveConfirmDialog(el.dataset.dialogAction==="confirm", render));
  });
}

/* =========================================================
   APP — entry point. Boots the app: runs migrations, resolves onboarding
   status, builds the initial HYROX week structure, wires up the global
   safety nets (uncaught errors, unhandled rejections, accidental-exit
   protection), does the first render, and registers the service worker.
   Every other module is imported (directly or transitively) from here.
========================================================= */

/* =========================================================
   BOOTSTRAP
========================================================= */
runMigrations();
resolveOnboardingStatus();
rebuildWeeks();

// Global safety net: catches errors thrown outside render() (e.g. inside an
// event handler before it calls render again). Never worse than the blank
// screen the browser default would leave, so only intervene if #app is empty.
window.addEventListener("error", (e)=>{
  console.error("Ignyt uncaught error:", e.error||e.message);
  const root = document.getElementById("app");
  if(root && root.innerHTML.trim()==="") renderErrorScreen(e.error||new Error(e.message||"Unknown error"));
});
window.addEventListener("unhandledrejection", (e)=>{
  console.error("Ignyt unhandled promise rejection:", e.reason);
});

// Accidental-exit protection. Note: an active session is already persisted to
// localStorage on every render, so closing/reloading never actually loses data —
// this is just an extra confirmation prompt to avoid an accidental navigation
// interrupting a workout in progress.
window.addEventListener("beforeunload", (e)=>{
  const hasData = state.session && state.session.exercises.some(ex=>
    ex.sets.some(s=> s.weight || s.reps)
  );
  if(hasData){
    e.preventDefault();
    e.returnValue = "";
  }
});

try{
  render();
}catch(err){
  console.error("Ignyt failed to boot:", err);
  renderErrorScreen(err);
}

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}
