import {
  BellRing,
  ChartNoAxesColumn,
  CloudUpload,
  Droplets,
  Dumbbell,
  Flame,
  HeartPulse,
  Leaf,
  Moon,
  NotebookPen,
  Pill,
  Scale,
  Timer,
  TrendingUp,
  UtensilsCrossed,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

export type FeatureAccent = "ember" | "pulse" | "cyan" | "good";

export interface Feature {
  title: string;
  /** One sentence. Kept short enough to read in a card at a glance. */
  description: string;
  icon: LucideIcon;
  accent: FeatureAccent;
  /** Anchor id on /features, also used by the home grid's deep links. */
  id: string;
}

/**
 * The sixteen capabilities the product ships today.
 *
 * Ordered by how a new user meets them: train, eat, drink, supplement,
 * measure, then the platform features that support all of it.
 */
export const features: Feature[] = [
  {
    id: "workout-tracking",
    title: "Workout tracking",
    description:
      "Log sets, reps and load live, with an automatic rest timer and personal records detected as you lift.",
    icon: Dumbbell,
    accent: "ember",
  },
  {
    id: "food-logging",
    title: "Food logging",
    description:
      "Log meals by breakfast, lunch, dinner and snacks, with favourites and repeat-yesterday for the meals you eat weekly.",
    icon: UtensilsCrossed,
    accent: "good",
  },
  {
    id: "calorie-counter",
    title: "Calorie counter",
    description:
      "Calories in, calories burned and calories remaining, recalculated the moment anything changes.",
    icon: Flame,
    accent: "ember",
  },
  {
    id: "macro-tracking",
    title: "Macro tracking",
    description:
      "Protein, carbohydrate and fat tracked against targets derived from your bodyweight and goal.",
    icon: ChartNoAxesColumn,
    accent: "pulse",
  },
  {
    id: "micronutrients",
    title: "Micronutrients",
    description:
      "Fibre, iron, calcium, vitamin C and sodium, so the gaps calorie apps ignore stop being invisible.",
    icon: Leaf,
    accent: "good",
  },
  {
    id: "diet-plans",
    title: "Diet plans",
    description:
      "Build a repeatable weekly plan with meals and timings, then score how closely you actually followed it.",
    icon: NotebookPen,
    accent: "ember",
  },
  {
    id: "fasting",
    title: "Fasting",
    description:
      "16:8 or any custom window, with a live countdown, current stage and a history of every completed fast.",
    icon: Timer,
    accent: "pulse",
  },
  {
    id: "water-tracker",
    title: "Water tracker",
    description:
      "One-tap hydration logging with quick-add sizes and reminders spaced across your waking hours.",
    icon: Droplets,
    accent: "cyan",
  },
  {
    id: "supplement-tracker",
    title: "Supplement tracker",
    description:
      "Your full stack with doses, timings, 30-day adherence and a warning before you run out.",
    icon: Pill,
    accent: "good",
  },
  {
    id: "weight-tracking",
    title: "Weight tracking",
    description:
      "Scale weight, body fat, lean mass and tape measurements, smoothed into a trend you can actually read.",
    icon: Scale,
    accent: "good",
  },
  {
    id: "progress-charts",
    title: "Progress charts",
    description:
      "Training volume, streaks, session counts and every personal record across a full training block.",
    icon: TrendingUp,
    accent: "ember",
  },
  {
    id: "health-connect",
    title: "Health Connect",
    description:
      "Reads 17 Android Health Connect data types — steps, heart rate, sleep, body composition — entirely on-device.",
    icon: HeartPulse,
    accent: "pulse",
  },
  {
    id: "notifications",
    title: "Smart reminders",
    description:
      "Independent local schedules for water, training, meals, supplements, weigh-ins and fasting windows.",
    icon: BellRing,
    accent: "ember",
  },
  {
    id: "cloud-backup",
    title: "Cloud backup",
    description:
      "Optional, off by default. Sign in and your data follows you to a new device; stay signed out and it never leaves.",
    icon: CloudUpload,
    accent: "pulse",
  },
  {
    id: "dark-theme",
    title: "Dark theme",
    description:
      "Built dark first, tuned for legibility in a badly lit gym at seven in the morning.",
    icon: Moon,
    accent: "pulse",
  },
  {
    id: "offline-support",
    title: "Offline support",
    description:
      "Every core feature — logging, search, timers, charts — works with no connection at all.",
    icon: WifiOff,
    accent: "good",
  },
];

/** Tailwind classes per accent, so cards and icons stay consistent. */
export const ACCENT_CLASSES: Record<
  FeatureAccent,
  { text: string; bg: string; border: string; glow: string }
> = {
  ember: {
    text: "text-ember",
    bg: "bg-ember/12",
    border: "border-ember/30",
    glow: "rgba(255,90,31,0.30)",
  },
  pulse: {
    text: "text-pulse-strong",
    bg: "bg-pulse/12",
    border: "border-pulse/30",
    glow: "rgba(62,130,247,0.28)",
  },
  cyan: {
    text: "text-cyan",
    bg: "bg-cyan/12",
    border: "border-cyan/30",
    glow: "rgba(85,216,255,0.24)",
  },
  good: {
    text: "text-good",
    bg: "bg-good/12",
    border: "border-good/30",
    glow: "rgba(69,210,148,0.26)",
  },
};
