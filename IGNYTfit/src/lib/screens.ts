/**
 * Copy for every app screen shown on the site.
 *
 * Kept separate from the visuals (`components/device/screens.tsx`) so that
 * headings, descriptions and alt text can be edited — or translated — without
 * touching layout code, and so server components can read screen metadata for
 * SEO without pulling the mockup markup into the bundle.
 */

export type ScreenId =
  | "dashboard"
  | "workout"
  | "exercise"
  | "food-log"
  | "food-search"
  | "nutrition"
  | "diet-plan"
  | "fasting"
  | "water"
  | "supplements"
  | "health-connect"
  | "weight"
  | "progress"
  | "notifications"
  | "profile"
  | "settings";

export interface ScreenMeta {
  id: ScreenId;
  /** Section heading and carousel label. */
  title: string;
  /** One-line summary — also used as the mockup's accessible description. */
  description: string;
  /** Three concrete outcomes, shown as a checklist beside the mockup. */
  benefits: [string, string, string];
  accent: "ember" | "pulse" | "cyan" | "good";
}

export const screens: ScreenMeta[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "Every number that matters for today on one screen — calories and macros, steps from Health Connect, hydration, weight trend and the workout you are part-way through.",
    benefits: [
      "See calories, macros, steps, water and weight without opening five tabs",
      "Resume an in-progress workout straight from the home screen",
      "Weekly training volume charted the moment you finish a session",
    ],
    accent: "ember",
  },
  {
    id: "workout",
    title: "Workout tracking",
    description:
      "Log sets, reps and load as you lift, with an automatic rest timer between sets and live session volume so you know whether you are actually progressing.",
    benefits: [
      "Tick sets off as you go — weight and reps carry over from last session",
      "Rest timer starts itself and counts down on the lock screen",
      "Personal records flagged the instant you beat them",
    ],
    accent: "ember",
  },
  {
    id: "exercise",
    title: "Exercise details",
    description:
      "Each movement carries its own technique notes, muscles worked and estimated one-rep-max history, so form cues and long-term strength live in the same place.",
    benefits: [
      "Step-by-step technique cues for every exercise in the library",
      "Estimated 1RM charted across every session you have logged",
      "Primary and secondary muscles labelled at a glance",
    ],
    accent: "pulse",
  },
  {
    id: "food-log",
    title: "Food log",
    description:
      "Log meals in seconds and watch remaining calories update live, with the day broken down by meal so it is obvious where the calories actually went.",
    benefits: [
      "Calories in, calories burned and calories remaining on one ring",
      "Meals grouped by breakfast, lunch, dinner and snacks",
      "Repeat yesterday, a favourite or a whole saved meal in one tap",
    ],
    accent: "good",
  },
  {
    id: "food-search",
    title: "Food search",
    description:
      "A 3,160-item food database that lives on your device, so search is instant and works with the aeroplane mode on.",
    benefits: [
      "3,160 foods available completely offline",
      "Filter by recent, favourites and your own custom foods",
      "Barcode scanning for packaged products",
    ],
    accent: "good",
  },
  {
    id: "nutrition",
    title: "Nutrition analysis",
    description:
      "Beyond calories: protein per kilogram of bodyweight, macro split and the micronutrients most people quietly miss.",
    benefits: [
      "Protein tracked per kilo of bodyweight, not just in grams",
      "Fibre, iron, calcium, vitamin C and sodium against your targets",
      "Seven-day averages that smooth out one unusual day",
    ],
    accent: "pulse",
  },
  {
    id: "diet-plan",
    title: "Diet plans",
    description:
      "Build a repeatable daily plan with meals, timings and targets, then track how closely you actually stuck to it.",
    benefits: [
      "Plan meals and timings for the whole week",
      "Adherence scored against the plan, not guessed",
      "Swap a meal without rebuilding the entire day",
    ],
    accent: "ember",
  },
  {
    id: "fasting",
    title: "Fasting",
    description:
      "Run 16:8 or any custom protocol with a live countdown, current metabolic stage and a history of every fast you have completed.",
    benefits: [
      "Live fasting countdown with start and end times",
      "Current stage explained as the fast progresses",
      "Streaks and duration history for the last weeks",
    ],
    accent: "pulse",
  },
  {
    id: "water",
    title: "Water tracker",
    description:
      "One-tap hydration logging with quick-add sizes, a visual fill gauge and reminders spaced across your waking hours.",
    benefits: [
      "Quick-add 250, 500 or 750 ml without typing",
      "Daily goal shown as a fill level you can read at a glance",
      "Configurable reminders between the hours you choose",
    ],
    accent: "cyan",
  },
  {
    id: "supplements",
    title: "Supplement tracker",
    description:
      "Your whole stack with doses and timings, daily tick-off, adherence over the last 30 days and a running count of how much you have left.",
    benefits: [
      "Track doses and timings for the full stack",
      "30-day adherence so you know if you actually take them",
      "Inventory warnings before you run out mid-week",
    ],
    accent: "good",
  },
  {
    id: "health-connect",
    title: "Health Connect",
    description:
      "IGNYT reads 17 data types through Android Health Connect — steps, heart rate, sleep, body composition and more — entirely on-device.",
    benefits: [
      "17 Health Connect data types, each permission granted individually",
      "Works with partial permissions: deny one, the rest still sync",
      "Exchange happens on-device through Android; no IGNYT server sees it",
    ],
    accent: "pulse",
  },
  {
    id: "weight",
    title: "Weight tracker",
    description:
      "Weight, body fat, lean mass and tape measurements charted over 90 days, so day-to-day noise stops looking like progress or failure.",
    benefits: [
      "Smoothed 90-day trend instead of a jagged daily line",
      "Body fat and lean mass tracked alongside scale weight",
      "Chest, waist, arm and thigh measurements with deltas",
    ],
    accent: "good",
  },
  {
    id: "progress",
    title: "Progress charts",
    description:
      "Twelve weeks of training volume, streaks, workout counts and every personal record, so you can see whether the programme is working.",
    benefits: [
      "Weekly volume trend across a full training block",
      "Streaks and session counts that reward consistency",
      "Personal records listed with how much you added",
    ],
    accent: "ember",
  },
  {
    id: "notifications",
    title: "Smart notifications",
    description:
      "Reminders for water, workouts, meals, supplements, weigh-ins and fasting windows — all scheduled locally on your device.",
    benefits: [
      "Independent schedules for each habit, toggled individually",
      "Quiet hours respected so nothing fires overnight",
      "Scheduled on-device; no notification content leaves the phone",
    ],
    accent: "ember",
  },
  {
    id: "profile",
    title: "Profile",
    description:
      "Your body stats, goals and daily targets in one place, plus the achievements you have unlocked along the way.",
    benefits: [
      "Calorie, protein, water, step and training targets in one screen",
      "Height, weight and age used to keep targets honest",
      "Achievements that track long-run consistency",
    ],
    accent: "pulse",
  },
  {
    id: "settings",
    title: "Settings",
    description:
      "Sync, backup, units, theme and a genuine export — your data leaves the app as JSON or CSV whenever you want it.",
    benefits: [
      "Full export to JSON or per-type CSV at any time",
      "Cloud sync and Drive backup are opt-in, never assumed",
      "One-tap reset that really does erase local data",
    ],
    accent: "good",
  },
];

/** Screens shown in the home page preview carousel, in order. */
export const featuredScreenIds: ScreenId[] = [
  "dashboard",
  "workout",
  "food-log",
  "progress",
  "health-connect",
  "diet-plan",
  "settings",
];

export const featuredScreens = featuredScreenIds.map((id) =>
  screens.find((screen) => screen.id === id)!,
);

export function getScreen(id: ScreenId): ScreenMeta {
  const screen = screens.find((item) => item.id === id);
  if (!screen) throw new Error(`Unknown screen id: ${id}`);
  return screen;
}
