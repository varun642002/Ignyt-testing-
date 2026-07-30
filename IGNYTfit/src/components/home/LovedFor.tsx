import {
  Boxes,
  Gauge,
  HeartPulse,
  Repeat,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";

interface Reason {
  title: string;
  body: string;
  Icon: LucideIcon;
  accent: string;
}

/**
 * Reasons the product is worth using, written as claims about the software
 * rather than as invented testimonials — there is no user base to quote yet,
 * and fabricated reviews would fail both Play policy and basic honesty.
 */
const REASONS: Reason[] = [
  {
    title: "A complete fitness ecosystem",
    body: "Training, food, hydration, supplements, fasting and body composition share one data model — so your protein target knows about your bodyweight, and your calorie budget knows about your workout.",
    Icon: Boxes,
    accent: "text-ember",
  },
  {
    title: "Simple and intuitive",
    body: "Logging a set takes one tap. Logging a meal takes three. Nothing important is more than two screens from the dashboard.",
    Icon: Sparkles,
    accent: "text-pulse-strong",
  },
  {
    title: "Designed for consistency",
    body: "Streaks, adherence scores and reminders that fire when they are useful — built around the fact that showing up beats optimising.",
    Icon: Repeat,
    accent: "text-good",
  },
  {
    title: "Accurate nutrition tracking",
    body: "A curated 3,160-item database with per-100 g values, custom foods, barcode scanning and micronutrients most calorie apps quietly skip.",
    Icon: Target,
    accent: "text-good",
  },
  {
    title: "Beautiful analytics",
    body: "Smoothed weight trends, weekly volume, macro history and estimated one-rep-max curves — charts that answer a question rather than decorate a screen.",
    Icon: Gauge,
    accent: "text-cyan",
  },
  {
    title: "Health Connect integration",
    body: "Seventeen data types read straight from Android Health Connect, on-device, with partial permissions handled gracefully instead of an all-or-nothing prompt.",
    Icon: HeartPulse,
    accent: "text-pulse-strong",
  },
];

export function LovedFor() {
  return (
    <Section id="why-people-love-ignyt" className="bg-ink-soft/60">
      <SectionHeading
        id="why-people-love-ignyt"
        eyebrow="Why people love IGNYT"
        title="Built by someone who got tired of six apps"
        lead="IGNYT started as a personal training log. Everything in it exists because it was needed, not because a competitor had it."
      />

      <RevealGroup
        as="ul"
        className="mt-14 grid list-none gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {REASONS.map((reason, revealIndex) => (
          <RevealItem
            index={revealIndex}
            as="li"
            key={reason.title}
            className="h-full"
          >
            <Card interactive className="h-full p-6">
              <reason.Icon
                aria-hidden
                className={`size-6 ${reason.accent}`}
                strokeWidth={2.1}
              />
              <h3 className="mt-5 text-[17px] font-bold text-text">
                {reason.title}
              </h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-text-mute">
                {reason.body}
              </p>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}
