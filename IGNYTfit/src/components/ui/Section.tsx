import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/**
 * Vertical rhythm for a page section. `id` doubles as the anchor target and
 * as the `aria-labelledby` hook for the heading, so every section is a
 * properly labelled landmark for screen readers.
 */
export function Section({
  id,
  className,
  containerClassName,
  children,
  as = "section",
}: {
  id?: string;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
  as?: "section" | "div";
}) {
  const Tag = as;
  return (
    <Tag
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={cn("relative py-20 sm:py-28", className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </Tag>
  );
}

/**
 * Eyebrow + title + optional lead paragraph, in the one arrangement used
 * across the whole site.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = "center",
  className,
  as: Tag = "h2",
}: {
  /** Must match the parent `Section`'s id so `aria-labelledby` resolves. */
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "center" | "left";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Reveal
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "mb-4 inline-flex items-center rounded-full border border-line bg-surface/70 px-3.5 py-1.5",
            "text-[11px] font-bold uppercase tracking-[0.18em] text-ember",
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <Tag
        id={id ? `${id}-heading` : undefined}
        className={cn(
          "font-black leading-[1.08]",
          Tag === "h1"
            ? "text-[clamp(2.35rem,6.4vw,4.2rem)]"
            : "text-[clamp(1.85rem,4.4vw,3rem)]",
        )}
      >
        {title}
      </Tag>

      {lead ? (
        <p
          className={cn(
            "mt-5 text-[15.5px] leading-relaxed text-text-mute sm:text-lg",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}
