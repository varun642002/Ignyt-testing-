import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { featuredScreens } from "@/lib/screens";

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
 * three static devices and a list of links do, for zero JavaScript.
 */

/**
 * One device, not three.
 *
 * Each mockup costs roughly 25KB once its markup and its duplicate in the RSC
 * flight payload are counted, and on a simulated slow connection the home
 * page's total document size is what governs first paint. The hero already
 * carries a device; a second one here makes the point, and the screen list
 * below does the rest of the work for a fraction of the bytes.
 */
const SHOWCASE_SCREEN = "workout" as const;

export function AppPreview() {
  return (
    <Section id="app-preview">
      <SectionHeading
        id="app-preview"
        eyebrow="App preview"
        title="Look around the app"
        lead="The screens you will actually use every day — training, the dashboard that ties it together, and the analytics that tell you whether it worked."
      />

      <Reveal className="mt-16">
        <div className="flex justify-center">
          <PhoneFrame
            className="[--pw:250px] sm:[--pw:272px] xl:[--pw:296px]"
            label="The IGNYT workout screen, showing a live rest timer and set-by-set logging"
          >
            <AppScreen id={SHOWCASE_SCREEN} />
          </PhoneFrame>
        </div>
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
