"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import type { ScreenMeta } from "@/lib/screens";

/**
 * Full-screen preview of a single app screen.
 *
 * Accessibility contract:
 *   • rendered as a labelled `role="dialog" aria-modal="true"`
 *   • focus moves to the close button on open and returns to the trigger on
 *     close (the caller keeps the trigger ref)
 *   • Tab is trapped inside the dialog; Escape closes it
 *   • ← / → move between screens
 *   • the page behind is scroll-locked and hidden from assistive tech
 */
export function Lightbox({
  screens,
  index,
  onClose,
  onNavigate,
}: {
  screens: ScreenMeta[];
  /** `null` closes the dialog. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = index !== null;
  const active = isOpen ? screens[index] : null;

  const next = useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % screens.length);
  }, [index, onNavigate, screens.length]);

  const previous = useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + screens.length) % screens.length);
  }, [index, onNavigate, screens.length]);

  // Scroll lock.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Move focus in on open.
  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  // Keyboard: Escape, arrows, and a Tab trap.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, next, previous, onClose]);

  return (
    /* The viewport-covering container is a plain element that is always
       mounted, and AnimatePresence lives *inside* it.

       This ordering is deliberate. An exiting AnimatePresence child is
       rendered from a snapshot of its last props, so neither a `style` prop
       nor an `exit` variant can be relied on to switch hit-testing off at the
       moment the dialog closes — and if an exit animation ever stalls (a
       throttled tab, a dropped frame), a full-screen transparent element would
       silently swallow every click on the page. Keeping `pointerEvents` on a
       React-controlled parent makes that failure mode impossible. */
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
      aria-hidden={isOpen ? undefined : true}
    >
      <AnimatePresence>
        {isOpen && active ? (
          <motion.div
            key="lightbox"
            className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            {/* Backdrop — click to dismiss. Keyboard users have Escape. */}
            <div
              className="absolute inset-0 bg-ink/88 backdrop-blur-md"
              onClick={onClose}
              aria-hidden
            />

            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${active.title} — enlarged preview`}
              className="relative flex w-full max-w-5xl flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-14"
              initial={
                reduceMotion ? false : { opacity: 0, scale: 0.94, y: 18 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 10 }
              }
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="glass absolute -top-1 right-0 z-10 grid size-11 place-items-center rounded-full text-text transition-colors hover:border-ember/50 hover:text-ember lg:-right-4 lg:-top-4"
              >
                <X aria-hidden className="size-5" />
              </button>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.id}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="shrink-0"
                >
                  <PhoneFrame
                    className="[--pw:230px] sm:[--pw:280px] lg:[--pw:330px]"
                    label={`${active.title}: ${active.description}`}
                  >
                    <AppScreen id={active.id} />
                  </PhoneFrame>
                </motion.div>
              </AnimatePresence>

              <div className="max-w-md text-center lg:text-left">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-ember">
                  Screen {index + 1} of {screens.length}
                </p>
                <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.1rem)] font-black">
                  {active.title}
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-text-mute">
                  {active.description}
                </p>
                <ul className="mt-6 flex flex-col gap-3 text-left">
                  {active.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ember"
                      />
                      <span className="text-[14px] leading-relaxed text-text-mute">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex items-center justify-center gap-3 lg:justify-start">
                  <button
                    type="button"
                    onClick={previous}
                    aria-label="Previous screen"
                    className="grid size-11 place-items-center rounded-full border border-line bg-surface/70 text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
                  >
                    <ChevronLeft aria-hidden className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next screen"
                    className="grid size-11 place-items-center rounded-full border border-line bg-surface/70 text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
                  >
                    <ChevronRight aria-hidden className="size-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
