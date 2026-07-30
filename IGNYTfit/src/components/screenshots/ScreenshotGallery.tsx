"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Expand } from "lucide-react";
import { useRef, useState } from "react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import { Lightbox } from "@/components/screenshots/Lightbox";
import { PhoneCarousel } from "@/components/screenshots/PhoneCarousel";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/Section";
import { screens, type ScreenMeta } from "@/lib/screens";
import { cn } from "@/lib/utils";

const ACCENT = {
  ember: { text: "text-ember", dot: "bg-ember", glow: "rgba(255,90,31,0.24)" },
  pulse: {
    text: "text-pulse-strong",
    dot: "bg-pulse",
    glow: "rgba(62,130,247,0.22)",
  },
  cyan: { text: "text-cyan", dot: "bg-cyan", glow: "rgba(85,216,255,0.20)" },
  good: { text: "text-good", dot: "bg-good", glow: "rgba(69,210,148,0.20)" },
} as const;

/**
 * One screen presented full-width: device on one side, copy on the other,
 * alternating sides down the page.
 */
function GallerySection({
  screen,
  index,
  onExpand,
}: {
  screen: ScreenMeta;
  index: number;
  onExpand: (index: number, trigger: HTMLButtonElement | null) => void;
}) {
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const accent = ACCENT[screen.accent];
  const flipped = index % 2 === 1;

  return (
    <section
      id={screen.id}
      aria-labelledby={`${screen.id}-heading`}
      /* `content-visibility` lets the browser skip layout and paint for the
         sections still below the fold — the closest thing to lazy loading
         that vector mockups can have. */
      className="cv-auto scroll-mt-28 py-14 sm:py-16"
    >
      <div
        className={cn(
          "grid items-center gap-10 lg:gap-16",
          "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]",
        )}
      >
        <motion.div
          className={cn(
            "relative mx-auto flex justify-center",
            flipped && "lg:order-2",
          )}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.93, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
            style={{
              background: `radial-gradient(50% 40% at 50% 45%, ${accent.glow}, transparent 70%)`,
            }}
          />
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.035 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <PhoneFrame
              className="[--pw:236px] sm:[--pw:268px] xl:[--pw:290px]"
              label={`${screen.title}: ${screen.description}`}
            >
              <AppScreen id={screen.id} />
            </PhoneFrame>
          </motion.div>
        </motion.div>

        <motion.div
          className={flipped ? "lg:order-1" : undefined}
          initial={reduceMotion ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className={cn(
              "text-[12px] font-bold uppercase tracking-[0.2em]",
              accent.text,
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </p>
          <h2
            id={`${screen.id}-heading`}
            className="mt-3 text-[clamp(1.65rem,3.4vw,2.4rem)] font-black leading-tight"
          >
            {screen.title}
          </h2>
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-text-mute">
            {screen.description}
          </p>

          <ul className="mt-7 flex flex-col gap-3.5">
            {screen.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-[7px] size-1.5 shrink-0 rounded-full",
                    accent.dot,
                  )}
                />
                <span className="text-[14.5px] leading-relaxed text-text-mute">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => onExpand(index, triggerRef.current)}
            className="mt-8 inline-flex items-center gap-2 rounded-btn border border-line bg-surface/70 px-5 py-3 text-[14px] font-semibold text-text transition-colors hover:border-ember/50 hover:text-ember"
          >
            <Expand aria-hidden className="size-4" />
            View {screen.title} full size
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * The whole screenshots experience: auto-sliding carousel at the top, a
 * detailed section per screen below it, and one shared lightbox.
 *
 * Lightbox state lives here (rather than in each section) so that arrow-key
 * navigation inside the dialog can move across the full set.
 */
export function ScreenshotGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const open = (index: number, trigger: HTMLElement | null = null) => {
    lastTrigger.current = trigger;
    setLightboxIndex(index);
  };

  const close = () => {
    setLightboxIndex(null);
    // Return focus to whatever opened the dialog.
    lastTrigger.current?.focus();
  };

  return (
    <>
      <section aria-labelledby="carousel-heading" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            id="carousel"
            eyebrow="Interactive preview"
            title="Every screen, one at a time"
            lead="Auto-advancing, or take control — click a screen name, drag the device, or use the arrow keys."
          />
          <div className="mt-12">
            <PhoneCarousel
              screens={screens}
              autoPlayMs={4600}
              onExpand={(index) => open(index)}
            />
          </div>
        </Container>
      </section>

      <Container as="div">
        <div className="divide-y divide-line/70">
          {screens.map((screen, index) => (
            <GallerySection
              key={screen.id}
              screen={screen}
              index={index}
              onExpand={open}
            />
          ))}
        </div>
      </Container>

      <Lightbox
        screens={screens}
        index={lightboxIndex}
        onClose={close}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
