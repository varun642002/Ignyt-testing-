/* =========================================================
   IGNYT — NOTIFICATION MESSAGE LIBRARY

   The lines that arrive on a lock screen, which is a harder brief than it sounds. A message in
   the app is read by someone who chose to open it. A notification interrupts. It has to earn
   the interruption in about eight words, and it has to do that every day for a year without
   becoming wallpaper.

   THE RULES THESE WERE WRITTEN UNDER
     No guilt. Not "you haven't trained today", not "don't break your streak", not a fire emoji
     next to a number the user is about to lose. Guilt works once and then people turn
     notifications off, and an app with notifications off cannot help anybody.

     No fake urgency. Nothing here says "now" or "last chance". The user's day is theirs.

     No hollow cheer. "You've got this!!" is filler. A line should say something — name a
     specific small action, or acknowledge something true about mornings and evenings.

     Second person, present tense, short. Long lines truncate on a lock screen and the half
     that survives is rarely the half that mattered.

   ROTATION IS THE OTHER HALF OF THE JOB. A library of 365 lines repeats immediately if you
   pick at random — the birthday problem says a repeat inside twenty draws is likely. pick()
   below keeps a recent-history ring and excludes it, which is what actually delivers "never
   repeats frequently".
========================================================= */
window.IgnytNotifyMessages = (function () {
  "use strict";

  /* ---- morning ------------------------------------------------------------------------
     Arrives between 6 and 8am to someone who may not be properly awake. Calm and concrete
     beats loud. Roughly grouped so the tone varies across a week rather than hammering one
     note; the groups are not exposed, they exist so the writing did not drift.            */

  var MORNING = [
    /* the day as a fresh page */
    "Morning. Today is untouched — that is the best thing about it.",
    "A new day, and nothing in it has gone wrong yet.",
    "Yesterday is filed. Today is blank.",
    "Every morning is a clean slate you did nothing to earn. Use it.",
    "The day is yours before anyone else asks for it.",
    "First light, first choice. Make it a small good one.",
    "Nothing about today is decided yet.",
    "You woke up. That is already the hardest part done for some people.",
    "A fresh page. No need to fill all of it.",
    "Today does not need to be remarkable. It needs to happen.",
    "Morning. The plan is still the plan.",
    "New day. Same you, one day stronger.",
    "You get today either way. Might as well use some of it.",
    "The morning is quiet. Borrow some of that.",
    "Today is one of the days that adds up.",
    "Nothing has to be perfect before you start.",
    "The day has not made any demands yet. Get in first.",
    "Morning. Small things, done anyway.",
    "This is the part of the day nobody else has claimed.",
    "A blank day is a gift you get every twenty-four hours.",

    /* showing up */
    "Showing up is the whole trick. The rest is detail.",
    "You do not have to feel like it. You just have to start.",
    "Motivation is nice. Turning up works better.",
    "The session you do tired still counts.",
    "Half-hearted and done beats perfect and skipped.",
    "Start badly if you have to. Just start.",
    "Nobody feels ready. They go anyway.",
    "The hardest rep is the one that gets you out the door.",
    "Twenty minutes of something beats an hour of nothing.",
    "You are allowed a bad session. You are not required to skip it.",
    "Turn up. Adjust later.",
    "The plan does not care how you feel about it.",
    "Do the easy version if that is what today allows.",
    "Consistency is mostly just refusing to make it a decision.",
    "Today's job is to be someone who trains. Not someone who trains well.",
    "You have done this before when you did not want to.",
    "Begin, and let the mood catch up.",
    "The first five minutes are the tax. Pay it.",
    "Effort is negotiable. Attendance is not.",
    "Something today. Anything.",

    /* the long game */
    "This is a long game. Today is one move.",
    "Progress is boring up close and obvious from far away.",
    "You will not notice today. You will notice the year.",
    "Nothing you do today shows up tomorrow. It shows up in March.",
    "Small, repeated, unglamorous. That is the whole method.",
    "The results come from the ordinary days, not the good ones.",
    "You are building something slow on purpose.",
    "A year of this looks like a different person.",
    "Compounding is quiet until suddenly it is not.",
    "Nobody gets strong in a week. Everybody gets strong in a year.",
    "The work is invisible right up until it is not.",
    "This is the unremarkable middle. It is where it happens.",
    "Trust the boring part.",
    "Ten more sessions changes something. Today is one of them.",
    "You are further along than you were. Keep going.",
    "The graph goes up over months, not mornings.",
    "Slow is a strategy, not a failure.",
    "The people who get there are the ones who did not stop.",
    "Give it time it has not had yet.",
    "You are early in this. That is fine.",

    /* body and energy */
    "Get some water in before the coffee. Your body has been fasting all night.",
    "Move something before you sit down for the day.",
    "Sunlight early makes sleep easier tonight.",
    "Stand up. Stretch. Two minutes.",
    "Your body has been still for eight hours. Ask it to do something.",
    "Breakfast is a decision. Make it early so it is not made for you.",
    "Protein first thing makes the rest of the day simpler.",
    "A short walk this morning is worth more than an intention this evening.",
    "Hydrate before you caffeinate. Your head will thank you.",
    "Open a window. Move a little. That is the whole ritual.",
    "Legs under you first, plans after.",
    "The stiffness in the morning goes away when you move. It does not go away when you don't.",
    "Ten deep breaths before the phone.",
    "Feed the day properly and it goes better.",
    "You will feel more awake after moving than after scrolling.",
    "Your joints want a warm-up more than your muscles do.",
    "Start hydrated and half the afternoon looks after itself.",
    "Give your body something to do before you give it caffeine.",
    "Two minutes of movement changes the next two hours.",
    "Morning light, then everything else.",

    /* honest and low-key */
    "Some mornings are just mornings. Get through it.",
    "Not every day has to be a push.",
    "If today is a maintenance day, maintain.",
    "Low energy is information, not a verdict.",
    "You are allowed to do less and still be doing this.",
    "A quiet day still belongs in the total.",
    "Rest is not the opposite of progress.",
    "Today can be small. Small still counts.",
    "Do what today actually allows.",
    "Not every session is meant to be hard.",
    "Tired is a reason to adjust, not to abandon.",
    "The easy version is still the version.",
    "You do not owe anyone a personal best.",
    "Steady is underrated.",
    "If it is a slow one, make it a slow one on purpose.",
    "Half is not nothing. Half is half.",
    "You can start again at any point in the day.",
    "One good decision is enough for a morning.",
    "Doing less today so you can do more Thursday is a plan, not a failure.",
    "Be reasonable with yourself this morning.",

    /* momentum and streaks, without threat */
    "You have been showing up. That is worth protecting.",
    "The habit is doing the work now. Let it.",
    "You have made this normal. That took a while.",
    "Momentum is on your side this morning.",
    "This is easier than it was in week one. That is the point.",
    "The routine holds you up on the days you cannot hold yourself up.",
    "You have built something that runs without a decision.",
    "Keep the chain going, but not at any cost.",
    "You have done harder mornings than this one.",
    "The pattern is set. Today just follows it.",
    "You are in the rhythm. Stay in it.",
    "One more ordinary day on the pile.",
    "The habit is the achievement. The session is just today's instance of it.",
    "You do not have to rebuild this every morning. It is already built.",
    "Where you are now used to be the goal.",
    "Remember when this felt like a lot?",
    "The version of you from six months ago would be pleased.",
    "You have proved you can do this. Today is just more of it.",
    "This is who you are now.",
    "Stack another one on.",

    /* food and fuelling */
    "Eat something with protein in it before noon.",
    "A planned lunch beats a decided-at-1pm lunch.",
    "You do not have to eat perfectly. Eat deliberately.",
    "Log the first meal and the rest tends to follow.",
    "Fuel the training you are planning to do.",
    "Under-eating in the morning is paid for at 4pm.",
    "Decide breakfast now, not when you are already hungry.",
    "Good food early makes bad food later less appealing.",
    "You cannot out-train a day you forgot to eat.",
    "Something with protein, something with colour. That will do.",
    "Feed the work.",
    "The meal you plan is the meal you eat.",
    "Breakfast does not need to be interesting. It needs to happen.",
    "Eat like someone who trains later.",
    "A boring reliable breakfast is a competitive advantage.",

    /* mindset, specific rather than vague */
    "You are not behind. There is no schedule.",
    "Compare this week to your last week, not to anyone else's.",
    "Nobody is watching closely enough for it to matter.",
    "The standard is your own, and you set it.",
    "Do it for how it feels on Thursday, not for how it looks.",
    "Strong is a thing you become slowly and then permanently.",
    "The point is not the number. The point is being the sort of person who does this.",
    "You are training for the next thirty years, not the next thirty days.",
    "Fitness you can maintain beats fitness you can achieve.",
    "The best programme is the one you actually follow.",
    "This is for you. Not for a photo.",
    "Discipline is just remembering what you want.",
    "You have already decided. This is just doing it.",
    "Health is the thing you notice only when it is gone. Keep it.",
    "You are doing something most people talk about.",
    "It does not need to be optimal. It needs to be done.",
    "Perfect is a way of not starting.",
    "The gap between knowing and doing is where the whole thing lives.",
    "Choose the version of today you will be glad about tonight.",
    "Long-term thinking, applied this morning.",

    /* practical nudges */
    "Pack your bag now. Evening-you will appreciate it.",
    "Decide when you are training before the day decides for you.",
    "Put the session in the calendar like it is a meeting.",
    "Lay the kit out. Removes one decision later.",
    "Book the time. The day fills up otherwise.",
    "Know what today's session is before you get there.",
    "Fill the bottle now.",
    "Set the alarm for the session, not just the morning.",
    "Plan the first exercise. The rest follows.",
    "The friction you remove now is the session you do later.",
    "Charge the headphones. Small thing, real difference.",
    "Write down what you are lifting today.",
    "Make it easy to say yes to later.",
    "Put the shoes by the door.",
    "Decide now, act later. Deciding later rarely works.",

    /* weather, seasons, ordinary life */
    "Cold morning. Warm up properly.",
    "Dark outside is not a reason. It is just dark.",
    "Rain is not an obstacle indoors.",
    "Busy week? Shorter sessions still count.",
    "Travelling? Bodyweight works anywhere.",
    "Bad night's sleep? Train lighter, but train.",
    "Weekend. Different rhythm, same intent.",
    "Monday. Nothing special about it, but here we are.",
    "Midweek. This is where consistency is actually tested.",
    "Friday. Finish the week the way you started it.",
    "The weather does not care about your plan. Neither does the plan.",
    "It is early. That is the advantage.",
    "Whatever today looks like, some of it can be yours.",
    "Work will take what you give it. Take yours first.",
    "Life is busy. That is the normal condition, not an exception.",

    /* strength and progress specifics */
    "Add a rep before you add a plate.",
    "Leave one in the tank today. Tomorrow needs you too.",
    "Technique first, load second. Always.",
    "The warm-up sets are not optional.",
    "Full range beats heavy and short.",
    "Slow the eccentric. Same weight, more work.",
    "Rest properly between sets. It is part of the set.",
    "Write the numbers down. Memory lies.",
    "Beat last week by one rep. That is enough.",
    "The last set is where the session is decided.",
    "Do the accessory work. It is why the main lift moves.",
    "Log it or it did not happen.",
    "Track the boring lifts. They are the ones that carry the rest.",
    "A small increase, repeated, is how this works.",
    "Progress the thing you can measure.",

    /* recovery-aware */
    "Sore is fine. Sharp is not. Know the difference.",
    "Recovery is where the adaptation happens. Not in the gym.",
    "Sleep is the supplement that actually works.",
    "If you are run down, today is a walk.",
    "Deload weeks are training too.",
    "Listen to the body before it makes you listen.",
    "Rest days are scheduled for a reason.",
    "You cannot train hard if you never train easy.",
    "Stiffness in the morning is normal. Pain is a message.",
    "Take the rest day you planned, not the one you are forced into.",

    /* short and plain */
    "Good morning. Go and do the thing.",
    "Right. Let's go.",
    "One session. That is all today asks.",
    "Morning. Get moving.",
    "Start.",
    "Today counts.",
    "Go.",
    "Make a start on it.",
    "Get after it, gently.",
    "Simple day: move, eat, sleep.",
    "You know what to do.",
    "Same as yesterday. That is the plan.",
    "Do the work.",
    "Onwards.",
    "Another one.",
    "Let's have a good one.",
    "In you go.",
    "First things first.",
    "Get it done early.",
    "Nothing complicated today.",

    /* encouragement without flattery */
    "You are more consistent than you give yourself credit for.",
    "The fact that you are still doing this matters.",
    "Most people stopped by now. You did not.",
    "You have got through worse weeks than this one.",
    "You are doing the unglamorous part well.",
    "Nobody sees this bit. It is the bit that counts.",
    "Quiet effort, repeated. That is real.",
    "You are not starting over. You are continuing.",
    "The work you did last month is still in you.",
    "You have earned the right to feel capable.",
    "This is going better than it feels.",
    "You are not as far off as you think.",
    "Give yourself the credit you would give a friend.",
    "You are building the thing, one ordinary day at a time.",
    "Still here. Still going. That is the headline.",

    /* curiosity and enjoyment */
    "Try something you are bad at today.",
    "Pick one thing to do properly rather than five things quickly.",
    "Enjoy the part where it starts to feel easy.",
    "Notice what has got easier since you started.",
    "Do a lift you actually like today.",
    "Put good music on and let that do some of the work.",
    "Train outside if the weather allows it.",
    "Make it something you look forward to, not something you survive.",
    "Take the scenic route.",
    "Some days should just be fun. Let today be one.",
    "Move because you can.",
    "There is a version of this that you enjoy. Find it.",
    "Do it for the hour where nothing else needs your attention.",
    "Training is one of the few things entirely under your control. Enjoy that.",
    "This is your hour. Spend it well.",

    /* goal-directed */
    "Keep the goal in sight, but train for today.",
    "The target has not moved. Neither have you.",
    "Every session is a small deposit.",
    "You are closer than you were a month ago.",
    "The goal is made of days like this one.",
    "Direction matters more than speed.",
    "Stay pointed the right way.",
    "You will not get there today. You will get closer.",
    "Nothing dramatic required. Just another step.",
    "The finish line moves. The habit does not.",

    /* self-kindness */
    "Be as patient with yourself as you would be with anyone else.",
    "You are allowed to find this hard.",
    "A missed day is a missed day. Not a verdict.",
    "Start where you are, with what you have.",
    "You do not need to earn breakfast.",
    "Your worth is not a body-weight number.",
    "Some seasons are for maintaining. That is fine.",
    "Do not let one bad week rewrite a good year.",
    "You are not behind anyone.",
    "Kindness to yourself is not the opposite of discipline.",
    "The plan is meant to serve you, not the other way round.",
    "If today needs to be gentle, be gentle.",
    "Nobody is keeping score but you. Consider scoring generously.",
    "You get to define what a good day looks like.",
    "Do the next right thing. Only that.",

    /* variety of openings so it never reads as one voice */
    "Right then. Morning.",
    "Here we go again, and that is the good news.",
    "Another chance at it.",
    "Wherever you are, that is the starting point.",
    "Coffee, water, move. In whatever order works.",
    "The day is long. Take a piece of it early.",
    "You do not have to be at your best to make progress.",
    "One more day of doing the simple things properly.",
    "This is the routine working.",
    "You have the time. It is a question of order.",
    "Get the important thing done before the urgent things arrive.",
    "Early effort makes the evening easier.",
    "Whatever else happens today, you can do this bit.",
    "Take the win that is available.",
    "Make today easy to be proud of.",
    "Do it now and spend the rest of the day having done it.",
    "The best time was earlier. The second best time is now.",
    "Beginnings are cheap. Do the middle well.",
    "There is no perfect week. There are just weeks.",
    "Keep it simple and keep it going.",
    "You know the drill.",
    "Morning. Let's keep the run going.",
    "Another entry in the log.",
    "Add to the pile.",
    "Take it steady and take it seriously.",
    "Do the version of this that fits today.",
    "Good habits are just decisions you stopped re-making.",
    "The alarm went off and you are up. Good.",
    "Whatever the week has been, today is separate.",
    "This is the easy part: deciding. Do that now.",
    "Little and often wins.",
    "You have got a whole day. Use a slice of it.",
    "Nothing fancy. Just the work.",
    "It is only hard until it is habit.",
    "Turn the plan into a session.",
    "Show your future self some consideration.",
    "The work does not do itself, but it is not that big either.",
    "Consistency beats intensity, every single time.",
    "Do today's, not tomorrow's.",
    "One thing at a time, starting now.",
    "This is a good day to be unremarkable and consistent.",
    "Get the first thing done.",
    "Start small enough that you cannot argue with it.",
    "You will be glad you did. You usually are.",
    "It never feels like the right morning. Go anyway.",
    "Make it happen before the day gets opinions.",
    "The simplest plan you will follow beats the best one you won't.",
    "Today's session is already easier than the one you did in week one.",
    "Keep the promise you made to yourself.",
    "Do it because you said you would.",
    /* Added to reach a full year of distinct lines. Same rules: specific, warm, no guilt. */
    "The morning you least want it is usually the one that helps most.",
    "Do the boring thing well and the interesting things follow.",
    "You are one session closer than you were yesterday.",
    "Take fifteen minutes for yourself before the day takes them.",
    "A small effort now beats a big intention later.",
    "Today is a good day for an ordinary session.",
    "Move first, think second. It works better in that order.",
    "The stiffness fades about four minutes in. Get to minute four.",
    "You have never once regretted training. Worth remembering.",
    "Whatever you manage today is more than none.",
    "The plan is written. You only have to follow it.",
    "Strength is patient. So are you, apparently.",
    "Another quiet deposit into a long account.",
    "Give the first hour to something that pays you back.",
    "You do not need a reason today. You have a habit.",
    "Do it at half intensity if that is what is available.",
    "The body responds to what you repeat, not what you intend.",
    "Nobody is coming to make you. That is the whole point.",
    "Make it easy. Make it short. Make it happen.",
    "Progress lives in the sessions you almost skipped.",
    "A steady week beats a heroic day.",
    "You are allowed to enjoy this.",
    "Get the blood moving before the emails arrive.",
    "Start with the thing you would otherwise avoid.",
    "Today is a rep in a much longer set.",
    "Do not overthink the warm-up. Just begin it.",
    "The gap between thinking and doing is about ninety seconds. Cross it.",
    "Trust the process you already built.",
    "Your future self is watching this decision.",
    "Keep it simple: show up, do the work, go home.",
    "Whatever happened yesterday, this morning is unrelated.",
    "There is no perfect starting point. This one will do.",
    "Little wins, stacked daily. That is the entire strategy.",
    "Be the person who did it anyway.",
    "One honest session is worth three planned ones."
  ];

  /* ---- bedtime -------------------------------------------------------------------------
     Sent between 10:30 and 11pm, and the tone is completely different. Nothing here asks for
     effort — the day's work is done either way. These are permission to stop, never a
     reprimand for being awake, because someone reading this at 11pm may well have had a hard
     day and the last thing they need is an app disapproving.                              */

  var BEDTIME = [
    "That is the day done. Let it be done.",
    "Sleep is where the training actually turns into progress.",
    "Nothing left to solve tonight. Rest.",
    "Your muscles rebuild while you sleep, not while you scroll.",
    "The day is over. You are allowed to stop.",
    "Whatever is left can be tomorrow's.",
    "Recovery starts now, and it is the easy part.",
    "Put it down. Pick it up in the morning.",
    "Good night. Tomorrow is already looking after itself.",
    "Sleep is the most effective thing you will do today.",
    "You have done enough for one day.",
    "Rest is part of the plan, not a break from it.",
    "The adaptation happens tonight.",
    "Screens down. Lights low. That is the whole routine.",
    "Nothing important happens after eleven.",
    "Tomorrow's session is built in tonight's sleep.",
    "Let the day end.",
    "Seven hours is a training input.",
    "Close it down. It will keep.",
    "Sleep now and tomorrow will be noticeably easier.",
    "You cannot recover from a day you did not finish.",
    "Whatever kind of day it was, it is over now.",
    "Give your body the eight hours it has been earning.",
    "The gym does not build you. Sleep does.",
    "Rest well. That is the instruction.",
    "This is the part of training people skip. Do not skip it.",
    "Wind down. There is no more to do.",
    "You will think better about all of it in the morning.",
    "Sleep is not lost time. It is the work.",
    "Enough for today.",
    "Turn it off. Genuinely.",
    "Tomorrow starts better if tonight ends earlier.",
    "The best recovery tool is free and available now.",
    "Nothing on that screen is worth the hour.",
    "Let tomorrow be fresh.",
    "You have been going all day. Stop going.",
    "Good night. Nothing needed from you now.",
    "Rest is not idleness.",
    "Your nervous system wants this more than your muscles do.",
    "Deep sleep is where the hormones do the work.",
    "Set the alarm and let go of the rest.",
    "Sleep first, everything else after.",
    "The day gets to end. That is the deal.",
    "You do not need to earn rest.",
    "Whatever did not get done, that is normal.",
    "Tomorrow you again. Rest this one.",
    "Sleep is the cheapest performance gain there is.",
    "Down tools.",
    "You have done the day. Let it be finished.",
    "The scroll will still be there. Sleep will not.",
    "Off to bed. Kindly.",
    "Recovery is a skill. Practise it now.",
    "Late nights are borrowed from tomorrow's session.",
    "Nothing decided at midnight is decided well.",
    "Let it go until morning.",
    "Rest properly and everything else is easier.",
    "The lifting is done. This is the other half.",
    "Sleep long enough to feel like yourself tomorrow.",
    "A good night is a good training decision.",
    "Time to stop.",
    "Tomorrow's energy is being made right now.",
    "Do not trade sleep for anything on a screen.",
    "You have been useful today. Now be still.",
    "Quiet the day down.",
    "Sleep is the only thing that fixes tired.",
    "Give tomorrow a fair start.",
    "Whatever is unfinished will wait patiently.",
    "This is the easiest good decision of the day.",
    "Rest hard.",
    "Let the body do its repairs.",
    "Long day. Long sleep.",
    "Nothing more is required of you today.",
    "Put the phone down and mean it.",
    "The day is complete enough.",
    "Recovery is not optional and it is not laziness.",
    "Sleep is where strength is actually stored.",
    "Tomorrow will want you rested.",
    "You are done. Well done.",
    "That will do for today.",
    "Head down. Lights off.",
    "Tired is the signal, not the enemy.",
    "It has been a day. Let it be over.",
    "Bank the sleep.",
    "Progress continues while you are unconscious. Enjoy that.",
    "You have earned the pillow.",
    "Nothing left to prove tonight.",
    "Sleep is training you get to do lying down.",
    "The muscles you worked are waiting for this.",
    "One more thing before bed: go to bed.",
    "The best thing you can do now is nothing.",
    "Rest is the plan for the next eight hours.",
    "Tomorrow's mood is decided in the next hour.",
    "Close the day properly.",
    "You have run out of useful hours. That is fine.",
    "Let it be tomorrow's problem.",
    "Enough. Genuinely, enough.",
    "Sleep. Everything is better after it.",
    "The day was what it was. Rest anyway.",
    "Kind to yourself now: go to bed.",
    "Turn the lights down and let it wind out.",
    "You do not have to end the day feeling accomplished. Just end it.",
    "Rest is what makes the next one possible.",
    "Nothing urgent. Nothing pending. Sleep.",
    "It is late enough. Stop here.",
    "Tomorrow you will be glad you slept.",
    "The work is done. Let the body catch up.",
    "Sleep is not a reward. It is a requirement.",
    "Good night. Take the full eight if you can.",
    "Even a hard day ends.",
    "Let the day close over.",
    "Rest now so you can go again.",
    "Nothing more today.",
    "The value of this hour is in not using it.",
    "Sleep well. Train well. In that order.",
    "The best athletes are the best sleepers.",
    "You have given today what you had.",
    "Stop reading. Start sleeping.",
    "Time to be horizontal.",
    "Whatever tomorrow needs, sleep is the preparation.",
    "This is the recovery session. Attend it.",
    "You are off duty.",
    "Every hour before midnight is worth two after.",
    "Slow the day down and let it stop.",
    "The list will keep.",
    "Nothing important is happening on that screen.",
    "Sleep repairs what training breaks.",
    "You did the day. Now undo the tiredness.",
    "Wind it down gently.",
    "One less hour awake is one more hour recovering.",
    "The day has had its share of you.",
    "Rest is the other half of getting stronger.",
    "Tomorrow needs a rested version of you.",
    "Nothing needs deciding tonight.",
    "Sleep, then reassess.",
    "It will look different in daylight. It usually does.",
    "Let the tiredness win this one.",
    "Good night. See you in the morning.",
    "Down for the day.",
    "Enough done. Enough thought about.",
    "Give it up until morning.",
    "The day closes here.",
    "Sleep is where the plan actually works.",
    "You have permission to stop now.",
    "Last thing tonight: rest.",
    "Nothing more to add today.",
    "Put the day away.",
    "Tired body, quiet mind, dark room.",
    "Let it all wait.",
    "Tomorrow is a fresh set.",
    "The recovery clock starts when the lights go off.",
    "Rest properly or repeat today tired.",
    "Sleep is the only legal performance enhancer.",
    "Take the rest. You will use it.",
    "Enough screen. Enough day.",
    "Sleep is not time off. It is time working.",
    "You have been awake long enough.",
    "Stop the day here.",
    "Tomorrow will ask for energy. Make some.",
    "Good night, and thank you for today.",
    "That is a wrap on today.",
    "Nothing is improved by staying up.",
    "Let go of it now.",
    "The best hour of recovery is the one before midnight.",
    "Close your eyes on it.",
    "Sleep long. Wake ready.",
    "It is done. All of it. Rest.",
    "Rest is the quietest kind of progress.",
    "Whatever today was, tomorrow is separate.",
    "Time to stop being useful.",
    "The day is finished with you.",
    "Sleep is where tomorrow gets built.",
    "Nothing here needs you now.",
    "Take the eight hours.",
    "Down you go.",
    "You have done what today allowed.",
    "Rest is the reward and the requirement.",
    "Let the room go dark.",
    "That is the day. Sleep on it.",
    "Nothing left. Rest.",
    "You are allowed to be tired.",
    "Being tired is not a failure of will.",
    "Sleep is not something to get around to.",
    "Give tomorrow a chance by ending tonight.",
    "The most productive thing left today is sleep.",
    "Stop. Genuinely, stop.",
    "Enough of today.",
    "Rest deeply. Tomorrow needs it.",
    "Sleep is the setting where progress saves.",
    "The day has been long enough.",
    "You have earned a full night.",
    "Nothing more useful than a dark room now.",
    "Let the day be over.",
    "Wind down. Nothing pending.",
    "Sleep first. Think tomorrow.",
    "The only remaining task is rest.",
    "Close the loop on today.",
    "Take the rest that makes the next session good.",
    "That is enough for one day.",
    "Sleep. Simple as that.",
    "You have done today. Let tomorrow be tomorrow.",
    "Time to stop thinking about it.",
    "The day is spent. So are you. Rest.",
    "One good night changes the whole week.",
    "Good night. Rest properly.",
    "Nothing more today, and that is fine.",
    "Let the body finish the job.",
    "Sleep is the last rep of the day.",
    "Take it easy from here.",
    "The day is done and so are you.",
    "Rest now. Go again tomorrow.",
    "Sleep well."
  ];

  /* ---- rotation --------------------------------------------------------------------------
     Random selection is not enough. With 365 items and a random pick each day, the birthday
     problem gives a better-than-even chance of a repeat inside about twenty-two days — which
     users notice and read as the app being lazy. A recent-history ring excluding roughly a
     third of the library makes a repeat inside four months impossible rather than unlikely. */

  function historyKey(kind) { return "hx_notify_seen_" + kind; }

  function recent(kind, size) {
    try {
      var raw = JSON.parse(localStorage.getItem(historyKey(kind)) || "[]");
      return Array.isArray(raw) ? raw.slice(-size) : [];
    } catch (e) { return []; }
  }

  function remember(kind, index, size) {
    try {
      var list = recent(kind, size * 2).concat([index]);
      localStorage.setItem(historyKey(kind), JSON.stringify(list.slice(-size)));
    } catch (e) { }
  }

  function pick(kind) {
    var pool = kind === "bedtime" ? BEDTIME : MORNING;
    if (!pool.length) return "";
    /* A third of the library, so the exclusion is meaningful but can never empty the pool. */
    var window_ = Math.floor(pool.length / 3);
    var seen = recent(kind, window_);
    var available = [];
    for (var i = 0; i < pool.length; i++) if (seen.indexOf(i) === -1) available.push(i);
    if (!available.length) available = pool.map(function (_, i) { return i; });
    var idx = available[Math.floor(Math.random() * available.length)];
    remember(kind, idx, window_);
    return pool[idx];
  }

  /**
   * Adds the user's name, and nothing else.
   *
   * Deliberately restrained. Stuffing a streak count and a goal into every line produces
   * "Morning Varun! Day 12! 3kg to go!" — which reads as a marketing push, not a coach, and
   * ages badly by about day four. The name is warmth; the numbers belong in the app where
   * there is room to give them context.
   *
   * Only used when the message does not already open with an address, so nothing becomes
   * "Varun, Good morning. Go and do the thing."
   */
  function personalise(text, name) {
    if (!text) return "";
    var n = String(name || "").trim().split(/\s+/)[0];
    /* Two characters minimum. A single letter is an initial, not a name, and "A, today is
       untouched" reads as a broken mail merge. */
    if (!n || n.length < 2 || n.length > 14 || /[^A-Za-z'\-]/.test(n)) return text;
    /* Roughly one in three. Every single time is worse than never — it stops reading as
       personal and starts reading as a mail merge. */
    if (Math.random() > 0.34) return text;
    if (/^(good |morning|right|here we go|another|hey)/i.test(text)) return text;
    return n + ", " + text.charAt(0).toLowerCase() + text.slice(1);
  }

  return Object.freeze({
    MORNING: MORNING, BEDTIME: BEDTIME,
    pick: pick, personalise: personalise,
    counts: function () { return { morning: MORNING.length, bedtime: BEDTIME.length }; }
  });
})();
