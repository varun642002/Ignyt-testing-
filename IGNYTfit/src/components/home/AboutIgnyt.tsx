import { Award, GraduationCap, Sparkles, Users } from "lucide-react";
import { BoltBadge } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";

/**
 * Who the product is for, on the home page.
 *
 * `/about` covers this at length. It is repeated here deliberately: a Google
 * OAuth reviewer is asked to understand the application without navigating
 * away, and "who uses this" is one of the questions that verification asks.
 */
const AUDIENCE = [
  {
    label: "Fitness enthusiasts",
    detail: "Already training, and want the numbers in one place.",
    Icon: Sparkles,
  },
  {
    label: "Beginners",
    detail: "Starting out, and want structure without a spreadsheet.",
    Icon: GraduationCap,
  },
  {
    label: "Athletes",
    detail: "Training to a plan, and tracking load and macros against it.",
    Icon: Award,
  },
  {
    label: "Anyone building habits",
    detail: "Here for the daily streak more than the deadlift.",
    Icon: Users,
  },
];

export function AboutIgnyt() {
  return (
    <Section id="about">
      <SectionHeading
        id="about"
        eyebrow="About"
        title={
          <>
            About <span className="text-gradient">IGNYT</span>
          </>
        }
        lead="IGNYT is a modern fitness and wellness platform built to help users achieve their health goals through intelligent workout tracking, nutrition management, progress monitoring, and Health Connect integration."
      />

      <p className="mx-auto mt-6 max-w-2xl text-center text-[16px] leading-relaxed text-text-mute">
        IGNYT is designed for fitness enthusiasts, beginners, athletes, and
        anyone who wants to build healthier habits.
      </p>

      {/* The full badge — ring, bolt and banded wordmark — at the one size on
          the page where it can be read rather than recognised. */}
      <div className="mt-12 flex justify-center">
        <BoltBadge
          title="IGNYT"
          className="size-40 text-white sm:size-48"
        />
      </div>

      <RevealGroup
        as="ul"
        className="mt-12 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {AUDIENCE.map(({ label, detail, Icon }, revealIndex) => (
          <RevealItem index={revealIndex} as="li" key={label} className="h-full">
            <Card className="h-full p-6">
              <span className="grid size-11 place-items-center rounded-tile border border-pulse/25 bg-pulse/12 text-pulse-strong">
                <Icon aria-hidden className="size-[21px]" strokeWidth={2.1} />
              </span>
              <h3 className="mt-5 text-[15.5px] font-bold text-text">
                {label}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-mute">
                {detail}
              </p>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}
