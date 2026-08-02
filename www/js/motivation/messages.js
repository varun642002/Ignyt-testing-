/* =========================================================
   MOTIVATION — the words IGNYT says.

   One library, many contexts, no repeats. Every encouraging line in the app comes from here
   so the tone is consistent and so "don't say the same thing twice" is solvable in one place
   rather than per screen.

   HOW NO-REPEAT WORKS
   Each context keeps a list of recently-shown indices in localStorage and draws only from
   what is left. When a context is exhausted it starts again — which is the honest ceiling:
   with a finite library, "never repeat" eventually means "repeat in the same order", and
   shuffling on exhaustion is better than pretending otherwise.

   The daily line is seeded by the date instead, so it is stable if the app is opened five
   times in a day and different tomorrow. A user who sees a new quote every time they tap Home
   learns the quotes are noise.

   TWO RULES ABOUT CONTENT

   No unverifiable comparisons. "You're in the top 1% of users" is a claim about a population
   this app has never measured. That kind of line is flattering, checkable, and false, and one
   user who does the arithmetic stops trusting everything else here. Nothing below compares
   the user to anyone but themselves.

   No medical claims. Encouragement can say a habit is worth keeping; it cannot promise an
   outcome, diagnose anything, or tell someone what their body will do. IGNYT is not a medical
   device and the privacy policy says so.
========================================================= */

window.IgnytMessages = (function () {
  "use strict";

  var SEEN_KEY = "hx_msg_seen";

  var LIBRARY = {

    /* ---- the morning card ------------------------------------------------------------
       Shown once a day, before noon. Separate from `daily` because a line that works at any
       hour ("Rest tonight") reads oddly at 6am, and the brief asks for a morning moment
       specifically. Seeded by date like the daily line, so it is stable all morning. */
    morning: [
      "Today is another opportunity to become stronger.",
      "Small actions today create big changes tomorrow.",
      "Discipline builds the life you want.",
      "Success begins with showing up.",
      "A fresh day, and nothing in it is decided yet.",
      "Start with water. The rest follows.",
      "Do the important thing before the day fills up.",
      "Morning is the least negotiable hour you have.",
      "Whatever yesterday was, today is separate.",
      "Set one intention for today and keep it.",
      "The first decision of the day sets the tone.",
      "You do not need a perfect day. Just a decent one.",
      "Move early and the day feels different.",
      "One session, one good meal. That is a strong day.",
      "The day is yours before anyone else asks for it.",
      "Begin gently. Begin anyway.",
      "Today is a good day to be consistent.",
      "Make today one you would be happy to repeat.",
      "A short walk before the day starts is never wasted.",
      "Today counts, exactly as much as any other.",
      "Get the hard thing done while you are fresh.",
      "You woke up. That is the first rep.",
      "Give today a shape before it takes one.",
      "Protein at breakfast makes the whole day easier.",
      "Today does not need to be extraordinary to be worth it.",
      "Choose one thing to do well today.",
      "The morning is quiet. Use it.",
      "New day, same habits, that is the point.",
      "Do the session before the excuses wake up.",
      "This is the day you get. Make it a good one."
    ],

    /* ---- returning to the app ----------------------------------------------------------
       Short, and deliberately about continuing rather than praising. Shown on open, not on
       every render -- a greeting that fires every time you tap Home stops reading as a
       greeting. */
    welcomeBack: [
      "Welcome back. Let's continue your journey.",
      "Ready to crush today's goals?",
      "Your future self is waiting. Let's get stronger today.",
      "Good to see you. Let's get to work.",
      "Back again. That is the whole secret.",
      "Right where you left off. Let's go.",
      "Another day, another chance to build.",
      "Let's make today count.",
      "You came back. That is what matters.",
      "Picking up where you left off.",
      "Let's add something to the log today.",
      "Here for another one. Good.",
      "Let's keep the run going.",
      "Nice to have you back. What are we doing today?",
      "Another session, another step.",
      "Let's put something good in today's column.",
      "You are here. Everything after this is easier.",
      "Back for more. Let's earn it.",
      "Time to build on what you already started.",
      "Let's do the work."
    ],

    /* ---- the daily card -------------------------------------------------------------- */
    daily: [
      "Today is another chance to get stronger than yesterday.",
      "Progress is built one session at a time.",
      "Don't wait for motivation. Build the habit.",
      "You're competing with yesterday's version of you. Nobody else.",
      "Small habits, repeated, become big results.",
      "Every good meal is an investment in the version of you that's coming.",
      "The work you do today, you'll feel next month.",
      "Discipline is choosing what you want most over what you want now.",
      "You don't have to be fast. You have to keep going.",
      "The hardest part of any session is putting your shoes on.",
      "Consistency isn't glamorous. It's just what works.",
      "A short workout beats the perfect one you skipped.",
      "You've already done the hard part: you showed up.",
      "Strength is built in the sets nobody watches.",
      "Rest is part of the plan, not a break from it.",
      "You're allowed to start again as many times as you need.",
      "Nothing changes overnight. Everything changes over months.",
      "Your body adapts to what you ask of it. Keep asking.",
      "Track it and it gets real. Real things are easier to change.",
      "Some days you push. Some days you maintain. Both count.",
      "The goal isn't to be perfect. It's to be consistent enough.",
      "Momentum is easier to keep than to build. Keep it.",
      "You're not behind. You're on your own timeline.",
      "One session won't transform you. A hundred will.",
      "Show up on the days you don't feel like it. Those are the ones that count.",
      "You can't undo last week. You can decide about today.",
      "Sleep, food, training. In that order of neglect-at-your-peril.",
      "Trust the boring work. It compounds.",
      "The version of you in six months is watching what you do now.",
      "Effort you can repeat beats effort you can't.",
      "Progress isn't linear. Keep the average moving.",
      "You logged it. That's more than most intentions ever get.",
      "Being tired is not the same as being finished.",
      "The plan only works if you're still doing it in March.",
      "Fitness is a long conversation with your body. Keep talking.",
      "Strong is a direction, not a destination.",
      "Every rep is a vote for who you're becoming.",
      "You don't need a perfect week. You need a decent one, repeatedly.",
      "Start where you are. Use what you have.",
      "The best program is the one you'll actually finish.",
      "Conditioning is what makes the rest of your life easier.",
      "A slow run is still a run.",
      "Breath control is trainable. Train it.",
      "The first kilometre lies. Keep going.",
      "Easy pace, done often, builds the engine.",
      "Walking is underrated and always available.",
      "Your heart is a muscle. Give it work.",
      "Steady effort beats heroic sprints you cannot repeat.",
      "Finish slightly better than you started.",
      "Cardio is not punishment. It is capacity.",
      "The last two minutes are where it counts.",
      "Some days the win is just moving for twenty minutes.",
      "Stairs count. Hills count. It all counts.",
      "Pace yourself into the session, not out of it.",
      "You will never regret the walk.",
      "Sweat is not the metric. Consistency is.",
      "Move today so tomorrow is easier.",
      "Keep the effort honest and the pace will come.",
      "Endurance is built at speeds that feel too slow.",
      "Three ordinary weeks beat one heroic one.",
      "What you do most days matters more than what you do on your best day.",
      "Repetition is the whole secret. There isn't a second one.",
      "Boring, repeated, becomes remarkable.",
      "The routine is the result.",
      "Frequency beats intensity over a year.",
      "You are not behind. You are mid-process.",
      "Steady is a strategy, not a compromise.",
      "The people who get there are the ones who kept going.",
      "Average effort, applied constantly, wins.",
      "One session is an event. Fifty is a change.",
      "Keep the streak alive in whatever form today allows.",
      "Doing it again is the skill.",
      "Reliability is a kind of strength.",
      "A habit is just a decision you stopped renegotiating.",
      "Sustainable beats spectacular.",
      "Show up enough times and the results stop being optional.",
      "Discipline builds the life you dream of.",
      "Motivation gets you started. Structure keeps you here.",
      "Feelings are weather. The plan is climate.",
      "You will not always want to. Go anyway.",
      "Decide once, so you do not have to decide daily.",
      "The commitment is the easy part. The Tuesday is the hard part.",
      "Do it when it is inconvenient. That is when it counts.",
      "Willpower runs out. Habits do not.",
      "Make the decision the night before.",
      "Waiting to feel like it is how years pass.",
      "Discipline is just self-respect with a schedule.",
      "You keep promises to other people. Keep this one too.",
      "Nobody is coming to make you do this. That is the whole point.",
      "The standard you keep on the dull days is your real standard.",
      "Choose the thing you will be glad you chose.",
      "Consistency is a decision, not a mood.",
      "Do it tired. Do it unimpressed. Do it anyway.",
      "The habit protects you on the days motivation does not show.",
      "Water first. Everything works better hydrated.",
      "A glass now is worth two at midnight.",
      "Most tired afternoons are a hydration problem.",
      "Seven hours changes tomorrow more than any supplement.",
      "Go to bed. That is the whole tip.",
      "Sleep is when the training gets filed away.",
      "Dehydrated training feels harder than it is.",
      "Fill the bottle before you need it.",
      "Your evening decides your morning.",
      "The last hour before bed is worth protecting.",
      "Hydration is the easiest win available today.",
      "One more glass. That is the whole ask.",
      "Rested, you will lift more than motivated and tired.",
      "Screens down, lights low, tomorrow thanks you.",
      "Water, then coffee. In that order.",
      "A steady bedtime is an underrated piece of training.",
      "You do not need more discipline. You need more sleep.",
      "Recovery starts when the lights go off.",
      "Drink before you are thirsty.",
      "The simplest habits are the ones worth keeping.",
      "You are becoming someone who trains. That is the real result.",
      "Act like the person you are building. The rest follows.",
      "This is not a phase. This is a standard.",
      "You are not trying to be fit. You are being someone who trains.",
      "Identity comes from evidence. Today adds some.",
      "Every session is a vote for who you are becoming.",
      "You are the kind of person who came back. Remember that.",
      "The habit is changing you whether or not the mirror agrees yet.",
      "This is what people who take care of themselves do.",
      "You are not starting over. You are continuing.",
      "Being consistent is the achievement. The physique is a side effect.",
      "You decide who you are by what you repeat.",
      "The person you are becoming would do today's session.",
      "You already are an athlete. You are just early.",
      "Own the routine and the results are downstream.",
      "This is the part of the story where you kept going.",
      "You are not behind anyone. You are on your own timeline.",
      "The strongest thing about you is that you keep returning.",
      "You are building a person, not just a body.",
      "Protein first. The rest gets easier.",
      "You cannot train your way out of not eating enough.",
      "Log it and it becomes real. Real things are easier to change.",
      "One good meal does not fix a week. One bad meal does not ruin one.",
      "Eat like you like yourself.",
      "Food is fuel and it is also just food. Both are fine.",
      "The meal you planned beats the meal you decided at 8pm.",
      "Enough protein makes recovery possible.",
      "You do not need a perfect diet. You need a repeatable one.",
      "Vegetables are boring advice because they work.",
      "Aim for good enough, most of the time.",
      "Consistency at the table matters as much as in the gym.",
      "A logged day is an honest day.",
      "The goal is nourishment, not restriction.",
      "Eat enough to train. Train enough to earn it.",
      "Nothing is off limits. Some things are just less often.",
      "Prepare one meal ahead and tomorrow gets easier.",
      "Hunger is not a moral failing. It is information.",
      "Feed the training and the training gives back.",
      "You are planting, not harvesting. Both are the job.",
      "Results are slow, then obvious.",
      "Give it twelve weeks before you judge it.",
      "The body keeps a longer ledger than the mirror.",
      "You will not notice it happening. You will notice it happened.",
      "Trust the boring middle.",
      "Six months from now you will be glad you did not stop.",
      "Quick results leave quickly. Slow ones stay.",
      "The timeline is longer than you want and shorter than you fear.",
      "Nobody sees the months. Everybody sees the result.",
      "Keep going through the part where nothing seems to change.",
      "Adaptation takes weeks. Give it weeks.",
      "The plateau is where the work is banked.",
      "You are further along than the last four days suggest.",
      "Progress rarely arrives on schedule. It still arrives.",
      "Do not confuse a slow week with a wasted one.",
      "Time passes either way. Spend it on this.",
      "The long way is the only way that lasts.",
      "Recovery is where the training becomes strength.",
      "A rest day taken on purpose is training.",
      "You grow between the sessions, not during them.",
      "Sleep is the cheapest performance improvement there is.",
      "Backing off today can protect the next four weeks.",
      "Tired is information, not weakness.",
      "A deload is not a step back.",
      "Doing less on purpose is different from doing less by accident.",
      "Hard training only works if the resting works too.",
      "Take the rest day before your body takes it for you.",
      "The session you skip to recover is not a session lost.",
      "Rest well and today's work actually lands.",
      "Recovery is the other half of the programme.",
      "An early night is a training decision.",
      "You cannot out-train a week of bad sleep.",
      "Easy days make hard days possible.",
      "Sometimes the strongest choice is to stop.",
      "Rest is not the reward for training. It is part of it.",
      "A gap is not a failure. It is a gap.",
      "Restarting is a skill. You are practising it.",
      "The comeback counts as much as the streak.",
      "Missing one is normal. Missing two is a pattern. Come back today.",
      "You did not lose it. You paused it.",
      "Begin from where you are, not where you left off.",
      "The break is over the moment you decide it is.",
      "No penance session required. Just the next one.",
      "Every athlete has had this week.",
      "Pick it up gently. Gently still counts.",
      "You are not starting from zero. You are starting from experience.",
      "The habit remembers you.",
      "Come back lighter than you left. Build from there.",
      "One missed week does not undo three good ones.",
      "The only session that matters now is the next one.",
      "Nothing to make up for. Just something to continue.",
      "Return without the guilt. It was never useful.",
      "Time off is part of most long training histories.",
      "Today is a fine day to begin again.",
      "Turning up on a bad day counts double.",
      "You do not have to feel ready. You have to begin.",
      "Starting badly still beats not starting.",
      "The first five minutes decide the session. Give it five.",
      "Nobody regrets the workout they did.",
      "Half a session is infinitely more than none.",
      "Show up for the version of you that asked for this.",
      "The door is the hard part. The rest is just movement.",
      "You can decide how hard once you are there. Get there first.",
      "Today's session does not need to be impressive. It needs to happen.",
      "Begin before you feel like it and the feeling usually follows.",
      "A workout you talked yourself into still counts.",
      "There is no perfect moment. There is only this one.",
      "Lace up. Everything after that is easier.",
      "You are one decision away from a better day.",
      "The plan only works while you are on it.",
      "Ten minutes is not nothing. Ten minutes is a start.",
      "One extra rep, fifty times, is a different body.",
      "Add one glass of water. That is a real improvement.",
      "The smallest version of the habit still keeps it alive.",
      "A single good choice makes the next one easier.",
      "Tiny is fine. Tiny is repeatable.",
      "You do not need a new plan. You need one more session.",
      "Two percent better is still better.",
      "Do the easy version rather than none of it.",
      "Little and often outlasts big and rare.",
      "Every logged meal is a small act of attention.",
      "A short walk is not a failed workout.",
      "The minimum counts. That is the point of a minimum.",
      "Halve the session before you cancel it.",
      "One good set is worth more than a perfect plan.",
      "Momentum starts smaller than people expect.",
      "Do the next small thing. Then the one after.",
      "You are allowed to make this easy.",
      "Add a little weight or a little control. Either is progress.",
      "The last two reps are where the change lives.",
      "Form first. Load follows.",
      "A heavier bar is a slower decision, not a rushed one.",
      "Leave one in the tank and come back stronger.",
      "Technique practised light becomes technique under load.",
      "Progressive overload is patience with a barbell.",
      "The warm-up sets are not wasted work.",
      "Control the weight down. That is half the rep.",
      "You cannot rush tendons. Build slowly.",
      "Strength is a skill. Skills need repetition.",
      "Beat last week by one rep. That is enough.",
      "The bar does not care how you feel. Neither should you today.",
      "Small jumps, kept up, are what move a lift.",
      "Grip, brace, breathe. Then move.",
      "A strong set is one you could repeat.",
      "Log the set and the trend does the arguing for you.",
      "The weight is heavy for everyone. That is why it works.",
      "Low energy is a reason to go easier, not to go home.",
      "Some days maintenance is the win.",
      "Do the version of today that today allows.",
      "Not every session has to be a good one.",
      "Bad days are part of the average. Keep the average.",
      "You are allowed to phone one in.",
      "Ten minutes on a bad day is worth an hour on a good one.",
      "Nothing is ruined. It is just a slow day.",
      "Do it badly rather than not at all.",
      "The session that keeps the habit alive is the important one.",
      "Off days do not erase on days.",
      "Lower the bar and step over it.",
      "You do not owe anyone a personal best today.",
      "Give it what you have, not what you planned.",
      "Even a rough session leaves you better than the sofa.",
      "One flat week is normal. Keep the shoes by the door.",
      "The goal today is simply not to stop.",
      "Move a little. That is all today asks.",
      "You showed up tired. That is the impressive version.",
      "You are capable of more than today's plan asks.",
      "You have never regretted finishing.",
      "You know how to do this. You have done it before.",
      "Back yourself. The evidence is in your log.",
      "You are the kind of person who finishes.",
      "You have done harder weeks than this one.",
      "Every session adds to the case that you can.",
      "Confidence comes after the reps, not before.",
      "You have already proved you can start. Prove you can continue.",
      "You are more consistent than you give yourself credit for.",
      "You have handled worse and kept going.",
      "Doubt is normal. Do it anyway.",
      "You do not need to feel strong to be strong.",
      "Your history says you show up.",
      "The nerves before a heavy set mean you are trying.",
      "You are allowed to be proud of an ordinary session.",
      "You are better at this than you were a month ago.",
      "You built this habit. It did not build itself.",
      "Give yourself credit for the days nobody saw.",
      "You have earned some confidence. Use it.",
      "Hard is not the same as wrong.",
      "It is supposed to feel like work.",
      "The difficulty is the mechanism, not the obstacle.",
      "You can do hard things badly and still benefit.",
      "Effort is the only input you fully control.",
      "Nothing worth having came from the comfortable option.",
      "The set you wanted to quit is the one that counted.",
      "Discomfort is temporary. Capability is not.",
      "You are stronger than the first thirty seconds suggest.",
      "Push where it is safe to push. Back off where it is not.",
      "The work does not get easier. You get better at it.",
      "Give it what today actually has.",
      "Effort scales. Give eighty percent and it still works.",
      "Struggling well is a skill.",
      "The hard part is where the adaptation is.",
      "You do not need to enjoy every minute of it.",
      "Finish what you started, even at half intensity.",
      "Sweat now, or wish you had later.",
      "One more honest set.",
      "You have done harder things than this.",
      "Find the part you enjoy and do more of that.",
      "Training should cost you effort, not joy.",
      "The best exercise is the one you look forward to.",
      "Put on the music you actually like.",
      "This is allowed to be fun.",
      "Play a little. It still counts as training.",
      "Do the lift you enjoy today. Enthusiasm is a resource.",
      "If you dread it every time, change it.",
      "Train outside when you can. It changes the whole session.",
      "Bring a friend. Everything is easier with one.",
      "Chase the feeling afterwards, not just the numbers.",
      "Variety keeps a habit alive.",
      "You are allowed to like this.",
      "A session you enjoy is a session you repeat.",
      "Make it something you get to do, not have to do.",
      "The gym is not a punishment hall.",
      "Try something new today. Curiosity is good training.",
      "Enjoyment is not a distraction from progress. It protects it.",
      "Do it for the hour it gives you, not just the result.",
      "Have a good session, whatever that means today.",
      "One more good decision before the day closes.",
      "Finish the day the way you would like to start tomorrow.",
      "Log today while you still remember it.",
      "Close the day with something you are glad you did.",
      "Tomorrow starts tonight. Get some sleep.",
      "A late session still counts as a session.",
      "Set out tomorrow's kit before you sit down.",
      "The day is not over until you decide it is.",
      "Evening is a fine time to train. Any time is.",
      "Fill in the log and let the day be finished.",
      "Check off today. It was a real day.",
      "There is still time for a short one.",
      "Whatever today was, it is nearly banked.",
      "Sleep is the last rep of the day.",
      "End the day with the water you meant to drink.",
      "You have done enough today. Rest properly.",
      "Tomorrow's session begins with tonight's bedtime.",
      "Take the win, however small, and stop.",
      "The day counted. Now let it end.",
      "Rest tonight. Build tomorrow.",
      "Make it easy and you will do it more.",
      "Same time, same place. That is most of the battle.",
      "Put the bag by the door tonight.",
      "Remove one obstacle and the habit gets cheaper.",
      "Attach it to something you already do.",
      "Plan the session before the day plans you.",
      "Book it like a meeting you cannot move.",
      "The first minute is the habit. The rest is detail.",
      "If it needs willpower every time, redesign it.",
      "Choose the gym you will actually go to.",
      "Prepare tomorrow tonight.",
      "Shrink the habit until it survives a bad week.",
      "Make starting frictionless and finishing takes care of itself.",
      "Decide when, not whether.",
      "A habit you enjoy is a habit you keep.",
      "Two hard things at once is one too many.",
      "Build the routine around your life, not against it.",
      "The best programme is the one you will follow.",
      "Anchor it to a time and stop rethinking it.",
      "Set it up so future you cannot talk their way out.",
      "You are further along than you feel.",
      "The mirror is the slowest way to measure this.",
      "Strength changes before shape does.",
      "You will notice the stairs before you notice the scale.",
      "Progress hides in things you stopped finding hard.",
      "Clothes tell the truth before the scale does.",
      "Yesterday's warm-up was last month's working set.",
      "The change is happening in places you cannot see yet.",
      "Sleep, mood and energy move first.",
      "Weight fluctuates daily. Fitness does not.",
      "You are stronger than you were, whatever the scale says.",
      "Progress is not linear and never has been.",
      "Look at three months, not three days.",
      "The number is one measurement, not the verdict.",
      "You are doing the work. The result is a lagging indicator.",
      "Fitness arrives quietly and all at once.",
      "Compare this month's logs, not this morning's reflection.",
      "It is working even on the days it does not look like it.",
      "The scale cannot see the muscle you built.",
      "Trust the process you can measure over the one you can see.",
      "Training clears the head as much as it builds the body.",
      "Move first, think second. It usually works.",
      "You rarely finish a session in a worse mood.",
      "The hour is yours. Nothing else needs you in it.",
      "Stress goes down when the weight goes up.",
      "You cannot think your way out of a bad mood as fast as you can walk out of one.",
      "Give yourself an hour with no notifications.",
      "The gym is a good place to leave things.",
      "Movement is a reliable way to change how today feels.",
      "You will feel better afterwards. You always do.",
      "Do it for the calm, not just the strength.",
      "A walk solves more than it should.",
      "Some sessions are for the head, not the body.",
      "Put the phone down and pick something heavy up.",
      "Training is one hour where the only job is simple.",
      "The reps give your mind somewhere to be.",
      "Go and be tired in a useful way.",
      "You do not have to bring your whole day into the gym.",
      "Effort now, clarity later.",
      "Do something physical and let the rest settle.",
      "Two in a row is a streak. Three is a habit.",
      "Do not break the chain today.",
      "You are rolling. Keep rolling.",
      "The hardest session was the first one. This is not that.",
      "Stack another day on the pile.",
      "You have built something. Do not put it down.",
      "Keep the rhythm even when the volume drops.",
      "Consecutive days compound faster than perfect ones.",
      "One more day keeps everything moving.",
      "Interrupting momentum costs more than today's session.",
      "You are in the groove. Stay in it.",
      "Add today to the run.",
      "Streaks are built one ordinary Tuesday at a time.",
      "The wheel is turning. Give it another push.",
      "Do not negotiate with a streak.",
      "Keep it simple: same time, same place, again.",
      "Consistency has its own gravity. Use it.",
      "Do today what you did yesterday.",
      "Do not let a good run end on a maybe.",
      "Fall in love with the process and the results follow.",
      "Control the inputs. The outputs take care of themselves.",
      "The goal gives direction. The routine does the work.",
      "Focus on this session, not the whole plan.",
      "You cannot control the outcome. You can control today.",
      "Do the work in front of you.",
      "The plan is a hypothesis. Today is the experiment.",
      "Judge the week by what you did, not by what changed.",
      "The scoreboard follows the practice.",
      "Detach from the result and the work gets easier.",
      "One session at a time is not a cliche. It is the method.",
      "Aim at the habit and the goal comes along.",
      "The process is the part you actually live in.",
      "Show up for the routine, not the reward.",
      "Outcome goals motivate. Process goals deliver.",
      "Today's job is small and clear. Do that.",
      "Make the next hour good and let the year sort itself out.",
      "You do not need the whole staircase. Just the step.",
      "Trust the method you chose and give it time.",
      "Do the reps. The rest is commentary.",
      "The only useful comparison is with your own last month.",
      "Someone else's highlight is not your baseline.",
      "Run your own race. You are the only one in it.",
      "Their week six is not your week one.",
      "You do not know their history. You know yours.",
      "Beat your own numbers. Ignore everyone else's.",
      "The person to catch is the one you were in March.",
      "Comparison steals the progress you already made.",
      "There is no leaderboard here. Only your log.",
      "Your progress does not need an audience.",
      "You are not late. There is no schedule.",
      "The only ranking that matters is against yesterday.",
      "Different bodies, different timelines, same principles.",
      "Watch your own trend and let everyone else watch theirs.",
      "Your first attempt is allowed to look like a first attempt.",
      "Nobody's beginning looked like anybody's middle.",
      "Progress is personal. So is the pace.",
      "You are competing with a version of you that no longer exists.",
      "The standard is yours to set.",
      "Measure yourself against your own effort, not their result.",
      "You have time for this. You have time for what you choose.",
      "Thirty minutes is two percent of your day.",
      "The time passes whether you train or not.",
      "Busy is a reason to make it shorter, not to skip it.",
      "You will never find time. You make it.",
      "This is the least busy you will ever be. Start now.",
      "A year from now you will wish you had started today.",
      "Protect the hour. Everything else expands to fill the day.",
      "Twenty minutes done beats sixty planned.",
      "Early is easier than later. Later never comes.",
      "Fit it in badly rather than not at all.",
      "Your calendar shows your priorities. Put this in it.",
      "The session does not need to be long to be worth doing.",
      "Trade thirty minutes of scrolling for thirty of moving.",
      "There is always a shorter version.",
      "Do it first and the day cannot take it from you.",
      "You are not too busy. You are unscheduled.",
      "Give it the time you would give a friend who asked.",
      "The best time was earlier. The next best is now.",
      "Make it small enough to survive a busy week.",
      "What gets logged gets noticed.",
      "The numbers are not judgment. They are feedback.",
      "You cannot steer what you do not measure.",
      "A logged week tells you more than a remembered month.",
      "Write it down and stop relying on memory.",
      "Data beats vibes when deciding what to change.",
      "The log is a record of showing up.",
      "Look at the trend, not the day.",
      "Your history is proof, not pressure.",
      "One entry a day builds a picture worth having.",
      "The log does not lie and does not nag.",
      "Numbers give you something to beat.",
      "Track the boring stuff. It is where the answers are.",
      "Today's entry is tomorrow's evidence.",
      "You will want this record in six months.",
      "Measure enough to be honest, not so much it is a chore.",
      "The trend line is the truth. The daily number is noise.",
      "A gap in the log is just a gap. Fill in today.",
      "Progress you can see is progress you keep chasing."
    ],

    /* ---- after finishing a workout ----------------------------------------------------- */
    workoutDone: [
      "Excellent work. Consistency builds champions.",
      "Another workout complete. You're becoming stronger every day.",
      "One more step toward your goal. Keep it going.",
      "That is banked. Nothing can take it back.",
      "Session done. That is the whole job today.",
      "Well done. That one counted.",
      "Logged and finished. Good work.",
      "You turned up and you finished. Both are wins.",
      "Another one on the pile.",
      "That is how it gets built. One at a time.",
      "Strong finish. Go and recover properly.",
      "Done is better than perfect, and that was done.",
      "You are one session further along than this morning.",
      "That is the version of today you will be glad about.",
      "Work complete. Rest earned.",
      "Nice session. The log looks better already.",
      "You did the thing. That is the standard.",
      "Another deposit into the long game.",
      "Finished. Now eat and sleep like it mattered.",
      "That is a good day, whatever else happens.",
      "Chalk it up. That one is yours.",
      "Session in the bank. Well played.",
      "You showed up and did the work. Simple as that.",
      "One more brick in the wall.",
      "That is exactly how progress is made."
    ],

    /* ---- coming back after a gap -------------------------------------------------------
       Never scolding. Someone opening the app after a break has already done the hard part. */
    comeback: [
      "Welcome back. Nobody trains every week of their life — what matters is that you're here.",
      "Good to see you. Start light today; the strength comes back quicker than you'd think.",
      "Back in. Don't try to make up for lost sessions in one go — just get one done.",
      "Everyone misses stretches. The comeback is the only part that matters.",
      "A gap isn't a failure. It's a gap. Today closes it.",
      "You're here. That's the whole first step.",
      "Restarting is a skill, and you're using it.",
      "No need to earn your way back. Just train."
    ],

    /* ---- food logging ------------------------------------------------------------------ */
    foodLogged: [
      "Logged. Staying accountable is most of the battle.",
      "Good. What gets tracked gets understood.",
      "In the log. You can't adjust what you don't measure.",
      "Noted. Consistency here matters more than any single meal.",
      "That's it — keep the picture complete.",
      "Logged. Honest tracking beats perfect eating."
    ],

    proteinHit: [
      "Protein target reached. Your muscles have what they need to repair.",
      "Protein goal done. That's the nutrient that turns training into progress.",
      "Target hit. Recovery is properly fuelled today.",
      "Protein's covered. That's the one worth getting right."
    ],

    waterGoal: [
      "Water goal reached. One of the simplest things you can get right.",
      "Fully hydrated. Everything from training to focus works better for it.",
      "That's the water done. Easy win, real effect.",
      "Hydration sorted for today."
    ],

    calorieOnTarget: [
      "You landed on target today. That's harder than it sounds.",
      "Right where you planned to be.",
      "On target. Days like this are what move the average.",
      "Calories on plan. Repeat that and the rest follows."
    ],

    /* ---- one-off setbacks --------------------------------------------------------------
       The user asked for a line after "junk food". It is written without judgement on
       purpose: an app that comments on the moral quality of a meal is one people stop
       logging honestly, and dishonest logs are worse than indulgent ones. */
    offPlan: [
      "One meal doesn't decide anything. The next one is a fresh choice.",
      "That's a day, not a pattern. Carry on tomorrow.",
      "Nothing to undo. Just keep logging honestly — that's what makes this work.",
      "Averages matter, individual meals don't. Keep going."
    ],

    /* ---- steps ------------------------------------------------------------------------- */
    steps: [
      "Good movement today.",
      "Those steps add up more than people expect.",
      "Walking is the most underrated thing in fitness. Nice work.",
      "That's real activity, and it all counts toward the week."
    ],

    /* ---- weight trending toward the goal ----------------------------------------------
       Never about appearance, never a health promise — just the number and the effort. */
    weightProgress: [
      "That's real progress, and it came from repeated small decisions.",
      "The trend is going where you wanted it to.",
      "Steady change like this is the kind that stays.",
      "That's the plan working. Keep doing what you've been doing.",
      "Moving in the right direction, one week at a time."
    ],

    /* ---- goal progress ----------------------------------------------------------------- */
    goalProgress: [
      "You're further along than you were. Keep the pace.",
      "That's meaningful ground covered.",
      "Still moving. That's the whole job.",
      "Progress you can see on a chart is progress you can trust."
    ],

    /* ---- streaks ----------------------------------------------------------------------- */
    streak: [
      "Consistency beats intensity. Keep it alive.",
      "That's a habit forming, not just a run of good days.",
      "Streaks are just decisions stacked up. Nice stack.",
      "This is the part that separates a phase from a lifestyle.",
      "Keep it going — but don't let one missed day end it in your head."
    ],

    /* ---- notifications ---------------------------------------------------------------- */
    notifyWorkout: [
      "Your session is waiting. Even a short one counts.",
      "Time to train. Twenty minutes is a full workout.",
      "Ready when you are.",
      "Today's session — shall we?",
      "Nothing fancy needed. Just get it started."
    ],
    notifyStreak: [
      "Your streak is still alive. One session keeps it.",
      "Don't let today be the gap.",
      "Still going. Keep it that way."
    ]
  };

  /* ---- selection ------------------------------------------------------------------- */

  function readSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function writeSeen(map) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(map)); } catch (e) { /* non-fatal */ }
  }

  /**
   * A line from `context` that has not been shown recently.
   *
   * Exhausting a context resets it rather than returning nothing — with a finite library the
   * alternative is silence, and silence is worse than a line seen a month ago.
   */
  function next(context) {
    var pool = LIBRARY[context];
    if (!pool || !pool.length) return "";
    var seen = readSeen();
    var used = seen[context] || [];
    if (used.length >= pool.length) used = [];
    var available = [];
    for (var i = 0; i < pool.length; i++) if (used.indexOf(i) === -1) available.push(i);
    var pick = available[Math.floor(Math.random() * available.length)];
    used.push(pick);
    seen[context] = used;
    writeSeen(seen);
    return pool[pick];
  }

  /**
   * The line for a given day. Seeded by the date, so it is the same all day and different
   * tomorrow — a quote that changes on every repaint reads as decoration, not as a message.
   */
  function forDay(context, date) {
    var pool = LIBRARY[context];
    if (!pool || !pool.length) return "";
    var d = date || new Date();
    var key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    // A cheap deterministic scramble, so consecutive days are not adjacent entries.
    var h = key * 2654435761 % 4294967296;
    return pool[Math.floor(h % pool.length)];
  }

  function count(context) { return (LIBRARY[context] || []).length; }
  function total() {
    var n = 0;
    for (var k in LIBRARY) if (LIBRARY.hasOwnProperty(k)) n += LIBRARY[k].length;
    return n;
  }

  return {
    LIBRARY: LIBRARY,
    next: next,
    forDay: forDay,
    count: count,
    total: total,
    contexts: function () { return Object.keys(LIBRARY); }
  };
})();
