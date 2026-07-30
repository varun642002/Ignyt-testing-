"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import type { ScreenMeta } from "@/lib/screens";
import { cn } from "@/lib/utils";

const ACCENT_TEXT = {
  ember: "text-ember",
  pulse: "text-pulse-strong",
  cyan: "text-cyan",
  good: "text-good",
} as const;

/**
 * Interactive device carousel.
 *
 * Interaction surface, all on one component so both the home page and the
 * screenshots page behave identically:
 *   • click the chips, the arrows, or the dots
 *   • ← / → while focus is anywhere inside the carousel
 *   • swipe horizontally on touch
 *   • auto-advance, which pauses on hover, on focus, when the tab is hidden,
 *     and permanently once the visitor interacts or asks for reduced motion
 */
export function PhoneCarousel({
  screens,
  autoPlayMs = 5200,
  onExpand,
  className,
  /** Renders the copy column beside the device. */
  showDetails = true,
}: {
  screens: ScreenMeta[];
  autoPlayMs?: number;
  onExpand?: (index: number) => void;
  className?: string;
  showDetails?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  const active = screens[index];

  const go = useCallback(
    (next: number, dir: number) => {
      setDirection(dir);
      setIndex(((next % screens.length) + screens.length) % screens.length);
    },
    [screens.length],
  );

  const next = useCallback(() => go(index + 1, 1), [go, index]);
  const previous = useCallback(() => go(index - 1, -1), [go, index]);

  // Auto-advance. `document.hidden` is checked on every tick rather than via a
  // visibilitychange listener so a backgrounded tab never queues up jumps.
  useEffect(() => {
    if (!playing || hovered || reduceMotion) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        setDirection(1);
        setIndex((current) => (current + 1) % screens.length);
      }
    }, autoPlayMs);

    return () => window.clearInterval(timer);
  }, [playing, hovered, reduceMotion, autoPlayMs, screens.length]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPlaying(false);
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPlaying(false);
      previous();
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold) {
      setPlaying(false);
      next();
    } else if (info.offset.x > threshold) {
      setPlaying(false);
      previous();
    }
  };

  const variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 70 : -70,
      scale: 0.94,
      rotateY: dir > 0 ? -12 : 12,
    }),
    center: { opacity: 1, x: 0, scale: 1, rotateY: 0 },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -70 : 70,
      scale: 0.94,
      rotateY: dir > 0 ? 12 : -12,
    }),
  };

  return (
    <div
      ref={regionRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="IGNYT app screens"
      className={cn("relative", className)}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!regionRef.current?.contains(event.relatedTarget as Node)) {
          setHovered(false);
        }
      }}
    >
      {/* Screen chips */}
      <div
        role="tablist"
        aria-label="Choose a screen"
        className="no-scrollbar mask-fade-x -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {screens.map((screen, screenIndex) => (
          <button
            key={screen.id}
            type="button"
            role="tab"
            id={`screen-tab-${screen.id}`}
            aria-selected={screenIndex === index}
            aria-controls={`screen-panel-${screen.id}`}
            tabIndex={screenIndex === index ? 0 : -1}
            onClick={() => {
              setPlaying(false);
              go(screenIndex, screenIndex > index ? 1 : -1);
            }}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors duration-200",
              screenIndex === index
                ? "border-ember/45 bg-ember/12 text-ember"
                : "border-line bg-surface/60 text-text-mute hover:border-line/80 hover:text-text",
            )}
          >
            {screen.title}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "mt-10 grid items-center gap-10",
          showDetails ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "",
        )}
      >
        {/* Device */}
        <div className="relative mx-auto flex w-full justify-center [perspective:1400px]">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={active.id}
              custom={direction}
              variants={reduceMotion ? undefined : variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              drag={reduceMotion ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing"
              id={`screen-panel-${active.id}`}
              role="tabpanel"
              aria-labelledby={`screen-tab-${active.id}`}
            >
              <PhoneFrame
                className="[--pw:250px] sm:[--pw:284px] xl:[--pw:300px]"
                label={`${active.title} screen: ${active.description}`}
              >
                <AppScreen id={active.id} />
              </PhoneFrame>
            </motion.div>
          </AnimatePresence>

          {onExpand ? (
            <button
              type="button"
              onClick={() => onExpand(index)}
              className="glass absolute -bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-ember/50 hover:text-ember"
            >
              <Expand aria-hidden className="size-3.5" />
              View larger
            </button>
          ) : null}
        </div>

        {/* Copy */}
        {showDetails ? (
          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <p
                  className={cn(
                    "text-[12px] font-bold uppercase tracking-[0.18em]",
                    ACCENT_TEXT[active.accent],
                  )}
                >
                  {String(index + 1).padStart(2, "0")} — {active.title}
                </p>
                <h3 className="mt-3 text-[clamp(1.5rem,3vw,2.1rem)] font-black leading-tight">
                  {active.title}
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-text-mute">
                  {active.description}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {active.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-[7px] size-1.5 shrink-0 rounded-full",
                          active.accent === "ember" && "bg-ember",
                          active.accent === "pulse" && "bg-pulse",
                          active.accent === "cyan" && "bg-cyan",
                          active.accent === "good" && "bg-good",
                        )}
                      />
                      <span className="text-[14.5px] leading-relaxed text-text-mute">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div className="mt-10 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            previous();
          }}
          aria-label="Previous screen"
          className="grid size-11 place-items-center rounded-full border border-line bg-surface/70 text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>

        {/* The dot is 6px because that is what reads well; the *button* is
            24px square because that is the WCAG 2.2 minimum touch target.
            Keeping the two separate lets the control stay visually small
            without being a 6px tap target on a phone. */}
        <div className="flex items-center" role="presentation">
          {screens.map((screen, screenIndex) => (
            <button
              key={screen.id}
              type="button"
              onClick={() => {
                setPlaying(false);
                go(screenIndex, screenIndex > index ? 1 : -1);
              }}
              aria-label={`Go to ${screen.title}`}
              aria-current={screenIndex === index ? "true" : undefined}
              className="group grid h-6 min-w-6 place-items-center px-1"
            >
              <span
                aria-hidden
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  screenIndex === index
                    ? "w-7 bg-ember"
                    : "w-1.5 bg-surface-3 group-hover:bg-text-dim",
                )}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            next();
          }}
          aria-label="Next screen"
          className="grid size-11 place-items-center rounded-full border border-line bg-surface/70 text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>

        {!reduceMotion ? (
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause auto-advance" : "Resume auto-advance"}
            className="ml-1 grid size-11 place-items-center rounded-full border border-line bg-surface/70 text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
          >
            {playing ? (
              <Pause aria-hidden className="size-4" />
            ) : (
              <Play aria-hidden className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
