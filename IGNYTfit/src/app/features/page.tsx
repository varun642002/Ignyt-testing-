import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, WifiOff, Zap } from "lucide-react";
import { DownloadCta } from "@/components/home/DownloadCta";
import { FeatureCard } from "@/components/home/FeatureGrid";
import { PhoneCarousel } from "@/components/screenshots/PhoneCarousel";
import { appSchema, breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PlayStoreButton } from "@/components/ui/PlayStoreButton";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { features } from "@/lib/features";
import { featuredScreens } from "@/lib/screens";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Features",
  description:
    "Everything IGNYT does: workout tracking, food logging, calorie and macro tracking, micronutrients, diet plans, fasting, water, supplements, weight, progress charts, Health Connect, reminders, cloud backup and full offline support.",
  path: "/features",
  keywords: [
    "IGNYT features",
    "workout tracking app features",
    "macro tracking app",
    "micronutrient tracker",
    "fasting tracker Android",
  ],
});

/** The three commitments that shape how every feature is built. */
const PRINCIPLES = [
  {
    Icon: WifiOff,
    title: "Offline first, not offline capable",
    body: "The database, the timers, the charts and the search index all live on the device. A connection is a bonus, never a requirement — nothing degrades when you lose signal in a basement gym.",
  },
  {
    Icon: ShieldCheck,
    title: "Private by default",
    body: "No advertising SDKs, no third-party analytics, no behavioural tracking. Cloud sync and Health Connect are both opt-in and independently revocable, and your data exports in full whenever you ask.",
  },
  {
    Icon: Zap,
    title: "Fast enough to use mid-set",
    body: "Logging a set is one tap. Search returns instantly because it never leaves the phone. If a feature would slow the log-a-set path down, it goes somewhere else.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={appSchema} />
      <JsonLd
        data={breadcrumbSchema([{ name: "Features", path: "/features" }])}
      />

      <PageHero
        eyebrow="Features"
        title={
          <>
            Sixteen things IGNYT does,{" "}
            <span className="text-gradient">properly</span>
          </>
        }
        lead="No feature here is a checkbox. Each one is built to survive a real training week — including the days with no signal, no time and no motivation."
      >
        <PlayStoreButton />
        <ButtonLink href="/screenshots" variant="secondary" size="lg">
          See the screens
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </PageHero>

      <Section id="all-features">
        <SectionHeading
          id="all-features"
          eyebrow="The full list"
          title="Everything in one app"
          lead="Training, nutrition, hydration, supplementation and body composition, sharing one set of numbers instead of five apps that disagree with each other."
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
          stagger={0.04}
        >
          {features.map((feature) => (
            <RevealItem as="li" key={feature.id} className="h-full">
              <FeatureCard feature={feature} />
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section id="principles" className="bg-ink-soft/60">
        <SectionHeading
          id="principles"
          eyebrow="How it is built"
          title="Three rules the whole app follows"
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 lg:grid-cols-3"
        >
          {PRINCIPLES.map((principle) => (
            <RevealItem as="li" key={principle.title} className="h-full">
              <Card className="h-full p-7">
                <principle.Icon
                  aria-hidden
                  className="size-6 text-ember"
                  strokeWidth={2.1}
                />
                <h3 className="mt-5 text-[18px] font-bold">
                  {principle.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-text-mute">
                  {principle.body}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section id="features-preview">
        <SectionHeading
          id="features-preview"
          eyebrow="In context"
          title="What that looks like on screen"
          lead="The same features, in the app itself."
        />
        <div className="mt-14">
          <PhoneCarousel screens={featuredScreens} />
        </div>
      </Section>

      <DownloadCta />
    </>
  );
}
