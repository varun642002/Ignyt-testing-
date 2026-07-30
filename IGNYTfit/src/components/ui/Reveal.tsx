"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 34, y: 0 },
  right: { x: -34, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Scroll-triggered entrance animation.
 *
 * Animates once (`viewport.once`) so scrolling back up does not re-trigger,
 * and collapses to a plain fade-free render when the visitor has asked for
 * reduced motion. `will-change` is intentionally omitted — Framer Motion sets
 * it for the duration of the animation and clears it afterwards, which avoids
 * pinning dozens of layers for the life of the page.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.65,
  className,
  amount = 0.25,
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  /** Fraction of the element that must be visible before it animates. */
  amount?: number;
}) {
  const reduceMotion = useReducedMotion();
  const offset = OFFSET[direction];

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Element types the reveal wrappers can render as. Constrained to the tags
 * actually needed so that semantic lists (`ul`/`li`) stay valid HTML — a
 * `<div>` between `<ul>` and `<li>` would not.
 */
type RevealTag = "div" | "ul" | "li" | "ol";

/**
 * Parent for staggered lists. Pair with `RevealItem` for children — one
 * IntersectionObserver for the whole group instead of one per card.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
  delay = 0,
  amount = 0.15,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  amount?: number;
  as?: RevealTag;
}) {
  const reduceMotion = useReducedMotion();
  const Tag = as;
  const MotionTag = motion[as];

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </MotionTag>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
}) {
  const reduceMotion = useReducedMotion();
  const Tag = as;
  const MotionTag = motion[as];

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag className={className} variants={itemVariants}>
      {children}
    </MotionTag>
  );
}
