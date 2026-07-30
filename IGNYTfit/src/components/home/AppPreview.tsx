"use client";

import { PhoneCarousel } from "@/components/screenshots/PhoneCarousel";
import { Section, SectionHeading } from "@/components/ui/Section";
import { featuredScreens } from "@/lib/screens";

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
