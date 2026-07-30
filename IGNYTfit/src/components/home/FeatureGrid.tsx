import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ACCENT_CLASSES, features, type Feature } from "@/lib/features";
import { cn } from "@/lib/utils";

/**
 * A single capability card.
 *
 * Exported because `/features` renders the same card in a wider layout — one
 * definition, two placements, no duplicated markup.
 */
export function FeatureCard({
  feature,
  href,
}: {
  feature: Feature;
  /** Optional deep link; the whole card becomes the hit area when set. */
  href?: string;
}) {
  const accent = ACCENT_CLASSES[feature.accent];
  const { icon: Icon } = feature;

  const body = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle, ${accent.glow}, transparent 70%)`,
        }}
      />
      <span
        className={cn(
          "relative grid size-11 place-items-center rounded-tile border transition-transform duration-300 group-hover:scale-110",
          accent.bg,
          accent.border,
          accent.text,
        )}
      >
        <Icon aria-hidden className="size-[21px]" strokeWidth={2.1} />
      </span>
      <h3 className="relative mt-5 text-[16.5px] font-bold text-text">
        {feature.title}
      </h3>
      <p className="relative mt-2 text-[14px] leading-relaxed text-text-mute">
        {feature.description}
      </p>
    </>
  );

  return (
    <Card interactive className="h-full scroll-mt-28 p-6">
      <span id={feature.id} className="absolute -top-28" aria-hidden />
      {href ? (
        <Link href={href} className="block focus-visible:outline-none">
          {body}
          {/* Stretches the link over the whole card without nesting
              interactive elements. */}
          <span className="absolute inset-0" aria-hidden />
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

export function FeatureGrid() {
  return (
    <Section id="features">
      <SectionHeading
        id="features"
        eyebrow="Why choose IGNYT"
        title={
          <>
            One app instead of{" "}
            <span className="text-gradient-cool">six half-finished ones</span>
          </>
        }
        lead="Most people end up with a workout app, a calorie app, a fasting timer and a spreadsheet — none of which talk to each other. IGNYT keeps all sixteen of these in one place, on one screen, with one set of numbers."
      />

      <RevealGroup
        as="ul"
        className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {features.map((feature, revealIndex) => (
          <RevealItem
            index={revealIndex}
            as="li"
            key={feature.id}
            className="h-full"
          >
            <FeatureCard feature={feature} />
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="mt-12 flex justify-center">
        <ButtonLink href="/features" variant="secondary">
          See every feature in detail
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    </Section>
  );
}
