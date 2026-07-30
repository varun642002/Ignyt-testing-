import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered entrance animations, implemented entirely in CSS.
 *
 * These are **server components**. There is no `"use client"`, no
 * IntersectionObserver and no animation library — the motion comes from a
 * scroll-driven CSS animation defined in `globals.css`, which the compositor
 * runs without touching the main thread.
 *
 * The previous Framer Motion implementation cost real money on two fronts: it
 * pulled the library into the initial bundle of every page that revealed
 * anything, and it server-rendered each wrapper as `opacity: 0`, so content
 * only appeared once the client hydrated. On a throttled mobile profile that
 * was over a second of largest-contentful-paint delay, and with scripting
 * disabled the content never appeared at all.
 *
 * Browsers without `animation-timeline` (and anyone who has asked for reduced
 * motion) simply see the content — the hidden start state lives inside the
 * `@supports` block, so "unsupported" degrades to "visible" rather than to
 * "blank".
 */

type Direction = "up" | "left" | "right" | "none";

const DIRECTION_CLASS: Record<Direction, string> = {
  up: "",
  left: "reveal-left",
  right: "reveal-right",
  none: "",
};

/** Element types the wrappers can render as, so list semantics stay valid. */
type RevealTag = "div" | "ul" | "li" | "ol";

export function Reveal({
  children,
  direction = "up",
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  direction?: Direction;
  className?: string;
  as?: RevealTag;
}) {
  return (
    <Tag className={cn("reveal", DIRECTION_CLASS[direction], className)}>
      {children}
    </Tag>
  );
}

/**
 * Parent for staggered lists. Purely a layout element now — the stagger is
 * produced by each child's own scroll range, not by a shared orchestrator.
 */
export function RevealGroup({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
}) {
  return <Tag className={className}>{children}</Tag>;
}

/**
 * A staggered child. `index` offsets the scroll range so items resolve in
 * sequence; it is capped so a long grid does not leave the last card waiting
 * far past the point it entered the viewport.
 */
export function RevealItem({
  children,
  className,
  index = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  as?: RevealTag;
}) {
  return (
    <Tag
      className={cn("reveal-item", className)}
      style={{ "--i": Math.min(index, 6) } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
