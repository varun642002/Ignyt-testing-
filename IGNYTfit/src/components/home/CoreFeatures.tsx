import {
  Apple,
  Crown,
  Dumbbell,
  HeartPulse,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

/**
 * The five capability groups, stated plainly.
 *
 * This sits above the sixteen-card `FeatureGrid`, which is a catalogue: good
 * for someone comparing apps, too granular for someone who has ten seconds and
 * needs to know what the product category is. A Google OAuth reviewer is the
 * second reader, and so is most first-time traffic — hence the named groups,
 * each spelling out exactly what it covers rather than gesturing at it.
 */
interface CoreFeature {
  id: string;
  title: string;
  Icon: LucideIcon;
  accent: "ember" | "pulse" | "cyan" | "good" | "warn";
  /** One sentence of context, for the groups where the list is not self-evident. */
  blurb?: string;
  points: string[];
}

const ACCENTS = {
  ember: "text-ember bg-ember/12 border-ember/25",
  pulse: "text-pulse-strong bg-pulse/12 border-pulse/25",
  cyan: "text-cyan bg-cyan/12 border-cyan/25",
  good: "text-good bg-good/12 border-good/25",
  warn: "text-warn bg-warn/12 border-warn/25",
} as const;

const CORE_FEATURES: CoreFeature[] = [
  {
    id: "workout-tracking",
    title: "Workout Tracking",
    Icon: Dumbbell,
    accent: "ember",
    points: [
      "Track exercises",
      "Sets",
      "Reps",
      "Weight",
      "Workout history",
    ],
  },
  {
    id: "nutrition-tracking",
    title: "Nutrition Tracking",
    Icon: Apple,
    accent: "good",
    points: ["Calories", "Protein", "Carbs", "Fat", "Water", "Daily goals"],
  },
  {
    id: "health-connect",
    title: "Health Connect Integration",
    Icon: HeartPulse,
    accent: "pulse",
    blurb:
      "Securely connect Google Health Connect to synchronise supported health and fitness data with your permission. IGNYT reads only the data types the features you use require, and you can revoke access at any time from your device settings.",
    points: [
      "Steps and distance",
      "Calories burned",
      "Exercise sessions",
      "Weight and hydration",
      "Permission-based, revocable",
    ],
  },
  {
    id: "progress-analytics",
    title: "Progress Analytics",
    Icon: TrendingUp,
    accent: "cyan",
    blurb:
      "See whether the work is actually moving the numbers, over weeks rather than days.",
    points: [
      "Weight tracking",
      "Charts",
      "Weekly progress",
      "Body measurements",
      "Fitness trends",
    ],
  },
  {
    id: "premium-features",
    title: "Premium Features",
    Icon: Crown,
    accent: "warn",
    blurb:
      "Optional. Every tracking feature above is available without paying.",
    points: [
      "Advanced analytics",
      "Unlimited tracking",
      "Cloud backup",
      "Future premium tools",
    ],
  },
];

function CoreFeatureCard({ feature }: { feature: CoreFeature }) {
  const { Icon } = feature;

  return (
    <Card className="h-full scroll-mt-28 p-6">
      <span id={feature.id} className="absolute -top-28" aria-hidden />
      <span
        className={cn(
          "grid size-11 place-items-center rounded-tile border",
          ACCENTS[feature.accent],
        )}
      >
        <Icon aria-hidden className="size-[21px]" strokeWidth={2.1} />
      </span>

      <h3 className="mt-5 text-[16.5px] font-bold text-text">
        {feature.title}
      </h3>

      {feature.blurb ? (
        <p className="mt-2 text-[14px] leading-relaxed text-text-mute">
          {feature.blurb}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-1.5">
        {feature.points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-[14px] leading-relaxed text-text-mute"
          >
            <span
              aria-hidden
              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ember"
            />
            {point}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CoreFeatures() {
  return (
    <Section id="features">
      <SectionHeading
        id="features"
        eyebrow="What IGNYT does"
        title={
          <>
            Everything you track,{" "}
            <span className="text-gradient">in one app</span>
          </>
        }
        lead="IGNYT is a fitness and nutrition tracker for Android. These are the five things it does, and what each one covers."
      />

      <RevealGroup
        as="ul"
        className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {CORE_FEATURES.map((feature, revealIndex) => (
          <RevealItem
            index={revealIndex}
            as="li"
            key={feature.id}
            className="h-full"
          >
            <CoreFeatureCard feature={feature} />
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}
