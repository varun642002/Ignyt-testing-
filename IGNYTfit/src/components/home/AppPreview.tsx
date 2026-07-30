import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { featuredScreens, screens } from "@/lib/screens";

/**
 * Home-page app preview.
 *
 * A **server component** with no interactivity. This used to render the same
 * draggable, auto-advancing carousel as `/screenshots`, which made it by far
 * the heaviest thing on the home page: it pulled framer-motion into the
 * critical path and its hydration was the single largest contributor to total
 * blocking time on a throttled mobile profile.
 *
 * The home page does not need a carousel. It needs to show that the app looks
 * good and send people to the page that does have one — which is exactly what
 * static devices and a list of links do, for zero JavaScript.
 */

/**
 * Three devices, captioned.
 *
 * This was one device. Each mockup costs roughly 25KB once its markup and its
 * duplicate in the RSC flight payload are counted, so the count is not free —
 * but Google's OAuth verification asks a reviewer to understand the app from
 * the home page without navigating, and a single screen does not carry
 * "workout tracking, nutrition and progress" on its own.
 *
 * Three is the compromise: enough to show the product's range, still static
 * server-rendered markup, and still no framer-motion in the critical path. The
 * carousel stays on /screenshots where it belongs.
 */
const SHOWCASE_SCREENS = ["workout", "food-log", "progress"] as const;

export function AppPreview() {
  const showcase = SHOWCASE_SCREENS.map(
    (id) => screens.find((screen) => screen.id === id)!,
  );

  return (
    <Section id="app-preview">
      <SectionHeading
        id="app-preview"
        eyebrow="Screenshots"
        title={
          <>
            See <span className="text-gradient">IGNYT</span> in Action
          </>
        }
        lead="The screens you will actually use every day — training, food logging, and the analytics that tell you whether it worked."
      />

      <Reveal className="mt-16">
        <ul className="flex list-none flex-wrap items-start justify-center gap-x-10 gap-y-12">
          {showcase.map((screen) => (
            <li
              key={screen.id}
              className="flex max-w-[300px] flex-col items-center"
            >
              <PhoneFrame
                className="[--pw:216px] sm:[--pw:236px] xl:[--pw:252px]"
                label={screen.description}
              >
                <AppScreen id={screen.id} />
              </PhoneFrame>
              <h3 className="mt-7 text-[15.5px] font-bold text-text">
                {screen.title}
              </h3>
              <p className="mt-2 text-center text-[13.5px] leading-relaxed text-text-mute">
                {screen.description}
              </p>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="mt-14">
        <ul className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {featuredScreens.map((screen) => (
            <li key={screen.id}>
              <Link
                href={`/screenshots#${screen.id}`}
                className="inline-flex rounded-full border border-line bg-surface/60 px-4 py-2 text-[13.5px] font-semibold text-text-mute transition-colors hover:border-ember/45 hover:text-ember"
              >
                {screen.title}
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      <div className="mt-12 flex justify-center">
        <ButtonLink href="/screenshots" variant="secondary">
          Explore all sixteen screens
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    </Section>
  );
}
