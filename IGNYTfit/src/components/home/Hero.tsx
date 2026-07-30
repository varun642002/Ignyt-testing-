import {
  ArrowRight,
  Beef,
  BellRing,
  CircleCheckBig,
  Droplets,
  Flame,
  Footprints,
  HeartPulse,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

/**
 * Home hero.
 *
 * A **server component**. It previously used Framer Motion for the entrance
 * and the floating cards, which meant the most important content on the site
 * shipped as `opacity: 0` and the animation library landed in the critical
 * path. The float is a CSS keyframe now and the text renders immediately, so
 * nothing above the fold waits on JavaScript.
 */

interface FloatingCard {
  label: string;
  value: string;
  Icon: LucideIcon;
  accent: "ember" | "pulse" | "cyan" | "good";
  /** Position relative to the phone wrapper. */
  position: string;
  /** Breakpoint the card appears at — the hero stays legible on small screens. */
  visibility: string;
  /** CSS animation class and delay, staggered so they do not bob in unison. */
  float: string;
  delay: string;
}

/**
 * Eight signals from the app, orbiting the device.
 *
 * Each card is placed explicitly rather than generated from a ring formula:
 * the phone is not a circle, and hand-placing them is what keeps the
 * composition balanced at every breakpoint.
 */
const CARDS: FloatingCard[] = [
  {
    label: "Calories",
    value: "1,842 kcal",
    Icon: Flame,
    accent: "ember",
    position: "-left-6 top-[12%] sm:-left-10",
    visibility: "flex",
    float: "animate-float-slow",
    delay: "0ms",
  },
  {
    label: "Steps",
    value: "8,412",
    Icon: Footprints,
    accent: "pulse",
    position: "-right-4 top-[5%] sm:-right-12",
    visibility: "flex",
    float: "animate-float-mid",
    delay: "-1200ms",
  },
  {
    label: "Workout completed",
    value: "Push · 47 min",
    Icon: CircleCheckBig,
    accent: "good",
    position: "-left-10 top-[38%] sm:-left-20",
    visibility: "hidden sm:flex",
    float: "animate-float-fast",
    delay: "-600ms",
  },
  {
    label: "Water",
    value: "2.1 / 3.0 L",
    Icon: Droplets,
    accent: "cyan",
    position: "-right-8 top-[34%] sm:-right-16",
    visibility: "hidden sm:flex",
    float: "animate-float-slow",
    delay: "-2400ms",
  },
  {
    label: "Protein",
    value: "142 / 175 g",
    Icon: Beef,
    accent: "ember",
    position: "-left-8 bottom-[24%] sm:-left-16",
    visibility: "hidden lg:flex",
    float: "animate-float-mid",
    delay: "-1800ms",
  },
  {
    label: "Weight",
    value: "74.6 kg",
    Icon: Scale,
    accent: "good",
    position: "-right-6 bottom-[28%] sm:-right-14",
    visibility: "hidden lg:flex",
    float: "animate-float-fast",
    delay: "-3000ms",
  },
  {
    label: "Notifications",
    value: "6 reminders",
    Icon: BellRing,
    accent: "pulse",
    position: "left-2 bottom-[6%] sm:-left-6",
    visibility: "hidden xl:flex",
    float: "animate-float-slow",
    delay: "-900ms",
  },
  {
    label: "Health Connect",
    value: "17 data types",
    Icon: HeartPulse,
    accent: "pulse",
    position: "right-0 bottom-[10%] sm:-right-8",
    visibility: "hidden xl:flex",
    float: "animate-float-mid",
    delay: "-2100ms",
  },
];

const ACCENTS = {
  ember: "text-ember bg-ember/12 border-ember/25",
  pulse: "text-pulse-strong bg-pulse/12 border-pulse/25",
  cyan: "text-cyan bg-cyan/12 border-cyan/25",
  good: "text-good bg-good/12 border-good/25",
} as const;

function FloatingStat({ card }: { card: FloatingCard }) {
  const { Icon } = card;

  return (
    <div
      aria-hidden
      className={cn(
        "absolute z-20",
        card.position,
        card.visibility,
        card.float,
      )}
      style={{ animationDelay: card.delay }}
    >
      <div className="glass flex items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-[0_18px_44px_-22px_rgba(0,0,0,0.9)]">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-xl border",
            ACCENTS[card.accent],
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim">
            {card.label}
          </span>
          <span className="text-[13px] font-bold text-text">{card.value}</span>
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pb-20 pt-14 sm:pb-28 sm:pt-20 lg:min-h-[calc(100svh-68px)] lg:pb-24 lg:pt-8"
    >
      {/* Ambient background: ember bloom top-left, pulse bloom bottom-right,
          and a faint grid to give the dark field some structure. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -left-40 -top-40 size-[720px] rounded-full opacity-70 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,90,31,0.22) 0%, rgba(255,90,31,0) 68%)",
          }}
        />
        <div
          className="absolute -bottom-56 -right-40 size-[760px] rounded-full opacity-70 blur-[110px]"
          style={{
            background:
              "radial-gradient(circle, rgba(62,130,247,0.24) 0%, rgba(62,130,247,0) 68%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
            backgroundSize: "68px 68px",
            maskImage:
              "radial-gradient(ellipse 90% 60% at 50% 20%, #000 30%, transparent 75%)",
          }}
        />
      </div>

      <Container className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[12px] font-semibold text-text-mute">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-ember" />
              <span className="relative inline-flex size-1.5 rounded-full bg-ember" />
            </span>
            Offline-first · Android · Health Connect
          </span>

          {/* Headline and lead are never animated — they are the largest
              contentful paint, and hiding them behind an entrance meant LCP
              waited on hydration.

              The brand name is the h1 on its own, with the positioning line
              directly beneath it. This is the first thing an OAuth reviewer
              reads, and it has to answer "what is this product called and what
              does it do" before anything else loads or moves. */}
          <h1
            id="hero-heading"
            className="mt-6 text-[clamp(3rem,8vw,5.25rem)] font-black leading-[1.02] tracking-[0.02em]"
          >
            <span className="text-gradient">IGNYT</span>
          </h1>

          <p className="mt-3 text-[clamp(1.15rem,2.6vw,1.6rem)] font-bold leading-tight text-text">
            Your Complete Fitness &amp; Nutrition Tracker
          </p>

          <p className="mx-auto mt-5 max-w-xl text-[16.5px] leading-relaxed text-text-mute sm:text-[18px] lg:mx-0">
            Track workouts, calories, nutrition, macros, fasting, hydration,
            body weight, progress, and Google Health Connect data in one
            powerful fitness app.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <ButtonLink href="/download" size="lg" className="w-full sm:w-auto">
              Download App
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
            <ButtonLink
              href="#features"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Learn More
            </ButtonLink>
          </div>

          {/* Capability badges, not virtue claims. A reviewer scanning the fold
              should come away with the feature list, so these name what the app
              does rather than what it refuses to do. */}
          <ul className="mt-9 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {[
              "Workout Tracking",
              "Nutrition Tracking",
              "Health Connect",
              "Progress Analytics",
              "Premium Features",
            ].map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[12.5px] font-semibold text-text-mute"
              >
                <CircleCheckBig aria-hidden className="size-3.5 text-good" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto flex w-full max-w-md justify-center">
          <div className="relative">
            <PhoneFrame
              className="[--pw:236px] sm:[--pw:280px] xl:[--pw:304px]"
              label="The IGNYT dashboard, showing calories and macros, steps from Health Connect, hydration, weight and the day's workout"
            >
              <AppScreen id="dashboard" />
            </PhoneFrame>

            {CARDS.map((card) => (
              <FloatingStat key={card.label} card={card} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
