import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The surface every panel on the site is built from.
 *
 * `interactive` adds the lift-and-glow hover treatment. Keep it off for
 * non-clickable content so hover affordances stay honest.
 */
export function Card({
  children,
  className,
  interactive = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "div" | "li" | "article";
}) {
  return (
    <Tag
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-surface/70",
        "backdrop-blur-[2px]",
        interactive &&
          cn(
            "group transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "hover:-translate-y-1.5 hover:border-ember/45",
            "hover:shadow-[0_24px_60px_-28px_rgba(255,90,31,0.55)]",
          ),
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Badge({
  children,
  className,
  tone = "ember",
}: {
  children: ReactNode;
  className?: string;
  tone?: "ember" | "pulse" | "good" | "neutral";
}) {
  const tones = {
    ember: "border-ember/35 bg-ember/12 text-ember",
    pulse: "border-pulse/35 bg-pulse/12 text-pulse-strong",
    good: "border-good/35 bg-good/12 text-good",
    neutral: "border-line bg-surface-2 text-text-mute",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
        "text-[11px] font-bold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
