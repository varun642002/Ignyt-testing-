"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Droplets,
  Flame,
  Footprints,
  HeartPulse,
  Scale,
  Beef,
  CircleCheckBig,
  type LucideIcon,
} from "lucide-react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PlayStoreButton } from "@/components/ui/PlayStoreButton";
import { cn } from "@/lib/utils";

interface FloatingCard {
  label: string;
  value: string;
  Icon: LucideIcon;
  accent: "ember" | "pulse" | "cyan" | "good";
  /** Position relative to the phone wrapper. */
  position: string;
  /** Which breakpoint the card appears at — the hero stays legible on small screens. */
  visibility: string;
  delay: number;
  drift: number;
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
    delay: 0.1,
    drift: -10,
  },
  {
    label: "Steps",
    value: "8,412",
    Icon: Footprints,
    accent: "pulse",
    position: "-right-4 top-[5%] sm:-right-12",
    visibility: "flex",
    delay: 0.25,
    drift: 12,
  },
  {
    label: "Workout completed",
    value: "Push · 47 min",
    Icon: CircleCheckBig,
    accent: "good",
    position: "-left-10 top-[38%] sm:-left-20",
    visibility: "hidden sm:flex",
    delay: 0.4,
    drift: 9,
  },
  {
    label: "Water",
    value: "2.1 / 3.0 L",
    Icon: Droplets,
    accent: "cyan",
    position: "-right-8 top-[34%] sm:-right-16",
    visibility: "hidden sm:flex",
    delay: 0.5,
    drift: -11,
  },
  {
    label: "Protein",
    value: "142 / 175 g",
    Icon: Beef,
    accent: "ember",
    position: "-left-8 bottom-[24%] sm:-left-16",
    visibility: "hidden lg:flex",
    delay: 0.6,
    drift: 10,
  },
  {
    label: "Weight",
    value: "74.6 kg",
    Icon: Scale,
    accent: "good",
    position: "-right-6 bottom-[28%] sm:-right-14",
    visibility: "hidden lg:flex",
    delay: 0.7,
    drift: -9,
  },
  {
    label: "Notifications",
    value: "6 reminders",
    Icon: BellRing,
    accent: "pulse",
    position: "left-2 bottom-[6%] sm:-left-6",
    visibility: "hidden xl:flex",
    delay: 0.8,
    drift: 8,
  },
  {
    label: "Health Connect",
    value: "17 data types",
    Icon: HeartPulse,
    accent: "pulse",
    position: "right-0 bottom-[10%] sm:-right-8",
    visibility: "hidden xl:flex",
    delay: 0.9,
    drift: -12,
  },
];

const ACCENTS = {
  ember: "text-ember bg-ember/12 border-ember/25",
  pulse: "text-pulse-strong bg-pulse/12 border-pulse/25",
  cyan: "text-cyan bg-cyan/12 border-cyan/25",
  good: "text-good bg-good/12 border-good/25",
} as const;

function FloatingStat({ card }: { card: FloatingCard }) {
  const reduceMotion = useReducedMotion();
  const { Icon } = card;

  return (
    <motion.div
      className={cn("absolute z-20", card.position, card.visibility)}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 14 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : {
              opacity: 1,
              scale: 1,
              y: [0, card.drift, 0],
            }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              opacity: { duration: 0.5, delay: card.delay },
              scale: {
                duration: 0.6,
                delay: card.delay,
                ease: [0.34, 1.56, 0.64, 1],
              },
              y: {
                duration: 5 + card.delay * 2,
                delay: card.delay,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }
      }
      aria-hidden
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
    </motion.div>
  );
}

export function Hero() {
  const reduceMotion = useReducedMotion();

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
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[12px] font-semibold text-text-mute">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-ember" />
                <span className="relative inline-flex size-1.5 rounded-full bg-ember" />
              </span>
              Offline-first · Android · Health Connect
            </span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            className="mt-6 text-[clamp(2.5rem,6.6vw,4.35rem)] font-black leading-[1.04]"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            Transform your fitness journey with{" "}
            <span className="text-gradient">IGNYT</span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-xl text-[16.5px] leading-relaxed text-text-mute sm:text-[18px] lg:mx-0"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          >
            Track workouts, nutrition, fasting, supplements, hydration, Health
            Connect and progress — all in one powerful fitness companion.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.21, ease: [0.16, 1, 0.3, 1] }}
          >
            <PlayStoreButton className="w-full sm:w-auto" />
            <ButtonLink
              href="/features"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Explore Features
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </motion.div>

          <motion.ul
            className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-text-dim lg:justify-start"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {[
              "No ads, ever",
              "No third-party trackers",
              "Your data stays on your device",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CircleCheckBig aria-hidden className="size-3.5 text-good" />
                {item}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          className="relative mx-auto flex w-full max-w-md justify-center"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 26 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>
      </Container>
    </section>
  );
}
