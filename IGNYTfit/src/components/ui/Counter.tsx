"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` the first time it scrolls into view.
 *
 * Hand-rolled on IntersectionObserver and one `requestAnimationFrame` loop
 * rather than an animation library. The library version pulled framer-motion
 * into the initial bundle of the home page purely to tween five integers,
 * which cost far more main-thread time during hydration than the effect is
 * worth.
 *
 * The final value is server-rendered inside the visually-hidden span, so the
 * number is in the HTML for search engines and for anyone who never runs the
 * script — the animated span is decorative.
 */
export function Counter({
  value,
  duration = 1600,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  /** Milliseconds. */
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // `null` means "not counting" — the final value is shown. The tween only
  // ever writes a number here, so no state is set synchronously in the effect
  // body and there is no cascading render on mount.
  const [display, setDisplay] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect reduced motion, and skip the mechanism entirely where
    // IntersectionObserver is unavailable — the final value is already
    // rendered in both cases.
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // Same ease-out curve as the CSS reveals, so the counter and the
          // card it sits in feel like one motion.
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(t < 1 ? Math.round(eased * value) : null);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const final = `${prefix}${value.toLocaleString("en-US")}${suffix}`;
  const shown =
    display === null
      ? final
      : `${prefix}${display.toLocaleString("en-US")}${suffix}`;

  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
