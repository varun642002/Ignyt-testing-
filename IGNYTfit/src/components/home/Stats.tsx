import {
  BellRing,
  HeartPulse,
  LayoutGrid,
  UtensilsCrossed,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Counter } from "@/components/ui/Counter";
import { Container } from "@/components/ui/Container";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  detail: string;
  Icon: LucideIcon;
  accent: string;
}

/**
 * Every figure here is a fact about the shipping app, not a marketing
 * estimate: the food count is the row count of the bundled database, the
 * Health Connect figure is the number of read permissions the Android client
 * declares, and the module count is the length of the feature list.
 */
const STATS: Stat[] = [
  {
    value: 3160,
    label: "Nutrition database",
    detail: "Foods available fully offline",
    Icon: UtensilsCrossed,
    accent: "text-good",
  },
  {
    value: 17,
    label: "Health metrics",
    detail: "Health Connect data types read",
    Icon: HeartPulse,
    accent: "text-pulse-strong",
  },
  {
    value: 16,
    label: "Tracking modules",
    detail: "Training, food and body, in one app",
    Icon: LayoutGrid,
    accent: "text-ember",
  },
  {
    value: 6,
    label: "Smart reminders",
    detail: "Independent local schedules",
    Icon: BellRing,
    accent: "text-warn",
  },
  {
    value: 100,
    suffix: "%",
    label: "Progress analytics",
    detail: "Charts that work with no connection",
    Icon: WifiOff,
    accent: "text-cyan",
  },
];

export function Stats() {
  return (
    <section
      aria-labelledby="stats-heading"
      className="relative py-16 sm:py-20"
    >
      <Container>
        <h2 id="stats-heading" className="sr-only">
          IGNYT by the numbers
        </h2>

        <RevealGroup className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {STATS.map((stat, revealIndex) => (
            <RevealItem
              index={revealIndex}
              key={stat.label}
              className="[&:nth-child(5)]:col-span-2 lg:[&:nth-child(5)]:col-span-1"
            >
              <div
                className={cn(
                  "group relative h-full overflow-hidden rounded-card border border-line bg-surface/60 p-5",
                  "transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-ember/40",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.16),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <stat.Icon
                  aria-hidden
                  className={cn("size-5", stat.accent)}
                  strokeWidth={2.2}
                />
                <p className="mt-4 text-[clamp(1.75rem,3.6vw,2.35rem)] font-black leading-none tracking-tight">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-[14px] font-bold text-text">
                  {stat.label}
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-text-dim">
                  {stat.detail}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}
