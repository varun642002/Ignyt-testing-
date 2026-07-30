import dynamic from "next/dynamic";
import { Section, SectionHeading } from "@/components/ui/Section";
import { featuredScreens } from "@/lib/screens";

/**
 * The carousel is the heaviest interactive component on the home page — drag
 * handling, autoplay, an AnimatePresence transition and seven device screens —
 * and it sits well below the fold.
 *
 * Loading it through `next/dynamic` puts it in its own chunk instead of the
 * initial bundle, so it no longer competes with the hero for main-thread time
 * during hydration. It is still server-rendered, so the markup is in the HTML
 * for crawlers and for anyone who never runs the JavaScript.
 */
const PhoneCarousel = dynamic(() =>
  import("@/components/screenshots/PhoneCarousel").then(
    (mod) => mod.PhoneCarousel,
  ),
);

/**
 * Home-page app preview.
 *
 * Wraps the shared carousel rather than reimplementing it, so the home page
 * and `/screenshots` cannot drift apart in behaviour.
 */
export function AppPreview() {
  return (
    <Section id="app-preview">
      <SectionHeading
        id="app-preview"
        eyebrow="App preview"
        title="Look around the app"
        lead="Seven of the screens you will actually use every day. Swipe, use the arrow keys, or pick a screen — it advances on its own until you take over."
      />

      <div className="mt-14">
        <PhoneCarousel screens={featuredScreens} />
      </div>
    </Section>
  );
}
