"use client";

import {
  animate,
  useInView,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` the first time it scrolls into view.
 *
 * The rendered node is `<span aria-hidden>` wrapped by a visually-hidden span
 * carrying the final value, so a screen reader announces "3,160" once instead
 * of narrating every intermediate frame.
 */
export function Counter({
  value,
  duration = 1.6,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  // With reduced motion the final value is derived, not stored — so there is
  // no state to synchronise and no cascading render when the media query
  // resolves after the first paint.
  const display = reduceMotion ? value : animated;

  useEffect(() => {
    if (!inView || reduceMotion) return;

    const controls: AnimationPlaybackControls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setAnimated(Math.round(latest)),
    });

    return () => controls.stop();
  }, [inView, reduceMotion, value, duration]);

  const formatted = `${prefix}${display.toLocaleString("en-US")}${suffix}`;
  const final = `${prefix}${value.toLocaleString("en-US")}${suffix}`;

  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{formatted}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
