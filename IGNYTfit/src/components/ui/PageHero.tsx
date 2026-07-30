import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/**
 * The hero used by every page except the home page.
 *
 * One component means the eyebrow, heading scale, lead width and ambient glow
 * are identical across /features, /screenshots, /about, /contact, /download
 * and the legal suite — consistency that is otherwise very easy to lose.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  className,
  tone = "ember",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Buttons or badges rendered under the lead. */
  children?: ReactNode;
  className?: string;
  tone?: "ember" | "pulse";
}) {
  const glow =
    tone === "ember" ? "rgba(255,90,31,0.20)" : "rgba(62,130,247,0.22)";

  return (
    <section
      aria-labelledby="page-hero-heading"
      className={cn(
        "relative overflow-hidden border-b border-line/60 py-20 sm:py-28",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-[-30%] size-[820px] -translate-x-1/2 rounded-full blur-[110px]"
          style={{
            background: `radial-gradient(circle, ${glow} 0%, rgba(0,0,0,0) 68%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
            backgroundSize: "68px 68px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 30%, #000 20%, transparent 72%)",
          }}
        />
      </div>

      <Container className="text-center">
        <Reveal className="mx-auto max-w-3xl">
          {eyebrow ? (
            <p className="mb-5 inline-flex items-center rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ember">
              {eyebrow}
            </p>
          ) : null}

          <h1
            id="page-hero-heading"
            className="text-[clamp(2.3rem,5.6vw,3.85rem)] font-black leading-[1.06]"
          >
            {title}
          </h1>

          {lead ? (
            <p className="mx-auto mt-6 max-w-2xl text-[16.5px] leading-relaxed text-text-mute sm:text-[18px]">
              {lead}
            </p>
          ) : null}

          {children ? (
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {children}
            </div>
          ) : null}
        </Reveal>
      </Container>
    </section>
  );
}
