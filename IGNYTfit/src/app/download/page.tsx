import type { Metadata } from "next";
import {
  BadgeCheck,
  Blocks,
  Download,
  HeartPulse,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import { appSchema, breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { PlayStoreButton } from "@/components/ui/PlayStoreButton";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { createMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Download",
  description:
    "Download IGNYT for Android from Google Play. Free, offline-first, no ads and no third-party trackers. Requires Android 8.0 or later; Health Connect is optional.",
  path: "/download",
  keywords: [
    "download IGNYT",
    "IGNYT Android app",
    "free fitness app download",
    "Google Play fitness app",
  ],
});

const REQUIREMENTS = [
  {
    Icon: Smartphone,
    title: "Android 8.0 (Oreo) or later",
    body: "Built against API 36 with a minimum of API 26, so it runs on phones going back to 2017.",
  },
  {
    Icon: HeartPulse,
    title: "Health Connect (optional)",
    body: "Install Google's Health Connect app if you want steps, heart rate, sleep and body composition to flow in automatically. IGNYT works fully without it.",
  },
  {
    Icon: WifiOff,
    title: "No connection required",
    body: "The food database ships inside the app. After install, no network is needed for logging, search, timers or charts.",
  },
  {
    Icon: ShieldCheck,
    title: "No account required",
    body: "Signing in with Google is only needed for cloud backup. Skip it and everything stays on the device.",
  },
];

const STEPS = [
  {
    title: "Install from Google Play",
    body: "Open the Play listing and install. There is no trial, no paywall and no subscription prompt on first launch.",
  },
  {
    title: "Set your profile and targets",
    body: "Height, weight, age and goal. IGNYT turns those into daily calorie, protein, hydration and training targets you can edit at any time.",
  },
  {
    title: "Connect Health Connect (optional)",
    body: "Grant only the data types you want. IGNYT handles partial permissions — denying one metric never blocks the rest.",
  },
  {
    title: "Log your first workout",
    body: "Pick a routine or build one, then log sets as you lift. The rest timer starts itself between sets.",
  },
];

export default function DownloadPage() {
  return (
    <>
      <JsonLd data={appSchema} />
      <JsonLd
        data={breadcrumbSchema([{ name: "Download", path: "/download" }])}
      />

      <PageHero
        eyebrow="Download"
        title={
          <>
            Get <span className="text-gradient">IGNYT</span> on your phone
          </>
        }
        lead="Free on Google Play. No ads, no third-party trackers, no subscription — and your data stays on the device unless you explicitly turn on cloud backup."
      >
        <PlayStoreButton />
        <ButtonLink href="/screenshots" variant="secondary" size="lg">
          See it first
        </ButtonLink>
      </PageHero>

      <Section id="get-started">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_auto]">
          <div>
            <SectionHeading
              id="get-started"
              align="left"
              eyebrow="Four steps"
              title="From install to first logged set"
              className="max-w-xl"
            />

            <RevealGroup
              as="ol"
              className="mt-10 flex list-none flex-col gap-6"
            >
              {STEPS.map((step, index) => (
                <RevealItem as="li" key={step.title} className="flex gap-5">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-ember/30 bg-ember/10 text-[15px] font-black text-ember"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-bold">{step.title}</h3>
                    <p className="mt-1.5 max-w-lg text-[14.5px] leading-relaxed text-text-mute">
                      {step.body}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            <div className="mt-10">
              <PlayStoreButton />
            </div>
          </div>

          <Reveal direction="left" className="mx-auto">
            <PhoneFrame
              className="[--pw:250px] xl:[--pw:290px]"
              label="The IGNYT dashboard as it appears after setup"
            >
              <AppScreen id="dashboard" />
            </PhoneFrame>
          </Reveal>
        </div>
      </Section>

      <Section id="requirements" className="bg-ink-soft/60">
        <SectionHeading
          id="requirements"
          eyebrow="Requirements"
          title="What you need"
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 sm:grid-cols-2"
        >
          {REQUIREMENTS.map((requirement) => (
            <RevealItem as="li" key={requirement.title} className="h-full">
              <Card className="h-full p-6">
                <requirement.Icon
                  aria-hidden
                  className="size-5 text-pulse-strong"
                  strokeWidth={2.1}
                />
                <h3 className="mt-4 text-[16.5px] font-bold">
                  {requirement.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-mute">
                  {requirement.body}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section id="app-details">
        <Container>
          <Reveal>
            <Card className="ring-gradient p-8 sm:p-10">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    Icon: Blocks,
                    label: "Package",
                    value: site.androidPackage,
                  },
                  { Icon: BadgeCheck, label: "Version", value: "1.0.30" },
                  { Icon: Download, label: "Price", value: "Free" },
                  {
                    Icon: ShieldCheck,
                    label: "In-app purchases",
                    value: "None",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <item.Icon
                      aria-hidden
                      className="size-5 text-ember"
                      strokeWidth={2.1}
                    />
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-text-dim">
                      {item.label}
                    </p>
                    <p className="mt-1 break-words font-mono text-[14px] font-semibold text-text">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
