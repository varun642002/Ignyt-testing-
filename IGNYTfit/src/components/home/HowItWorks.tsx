import {
  Dumbbell,
  LineChart,
  Target,
  Trophy,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";

interface Step {
  title: string;
  description: string;
  Icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    title: "Create your account",
    description:
      "Or don't. IGNYT works fully offline without an account — signing in with Google is only needed if you want cloud backup across devices.",
    Icon: UserPlus,
  },
  {
    title: "Set your goals",
    description:
      "Height, weight, activity level and objective. IGNYT turns those into daily calorie, protein, hydration and training targets you can edit at any time.",
    Icon: Target,
  },
  {
    title: "Track workouts and nutrition",
    description:
      "Log sets as you lift and meals as you eat. Health Connect fills in steps, heart rate and sleep so you are not typing what your phone already knows.",
    Icon: Dumbbell,
  },
  {
    title: "Monitor progress",
    description:
      "Weekly volume, smoothed weight trend, macro history and personal records — enough signal to tell whether the plan is working, not just whether you showed up.",
    Icon: LineChart,
  },
  {
    title: "Achieve your goals",
    description:
      "Adjust targets as your body changes, keep the streak alive, and export everything whenever you want it. The data is yours.",
    Icon: Trophy,
  },
];

/**
 * Five-step onboarding timeline.
 *
 * The connector is a single absolutely-positioned gradient rule behind the
 * markers rather than a border on each row, so the line never breaks between
 * items of different heights.
 */
export function HowItWorks() {
  return (
    <Section id="how-it-works" className="bg-ink-soft/60">
      <SectionHeading
        id="how-it-works"
        eyebrow="How it works"
        title="From install to first personal record"
        lead="Five steps, none of which involve a paywall, an onboarding survey you cannot skip, or an email you did not ask for."
      />

      <div className="relative mx-auto mt-16 max-w-3xl">
        {/* Vertical connector */}
        <span
          aria-hidden
          className="absolute left-[27px] top-4 bottom-4 w-px bg-[linear-gradient(180deg,transparent,rgba(255,90,31,0.55)_12%,rgba(62,130,247,0.5)_88%,transparent)] sm:left-[31px]"
        />

        <RevealGroup as="ol" className="relative flex list-none flex-col gap-8">
          {STEPS.map((step, index) => (
            <RevealItem
              as="li"
              key={step.title}
              className="flex gap-5 sm:gap-6"
            >
              <div className="relative shrink-0">
                <span className="relative z-10 grid size-14 place-items-center rounded-2xl border border-ember/30 bg-ink shadow-[0_0_0_6px_rgba(8,9,13,1)] sm:size-16">
                  <step.Icon
                    aria-hidden
                    className="size-6 text-ember"
                    strokeWidth={2.1}
                  />
                </span>
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1.5 z-20 grid size-6 place-items-center rounded-full bg-ember text-[11px] font-black text-[#150500]"
                >
                  {index + 1}
                </span>
              </div>

              <div className="pt-1.5">
                <h3 className="text-[18px] font-bold text-text sm:text-[19px]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-text-mute">
                  {step.description}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}
