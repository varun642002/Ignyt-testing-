import type { Metadata } from "next";
import Link from "next/link";
import {
  Apple,
  BadgeCheck,
  BellRing,
  Blocks,
  Cpu,
  Dumbbell,
  Gauge,
  HardDrive,
  HeartPulse,
  Lock,
  Monitor,
  NotebookPen,
  Pill,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Droplets,
  UtensilsCrossed,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { AppScreen } from "@/components/device/screens";
import { PhoneFrame } from "@/components/device/PhoneFrame";
import { appSchema, breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { PlayStoreButton } from "@/components/ui/PlayStoreButton";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { createMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Download",
  description: `Download IGNYT free on Google Play. Workouts, nutrition, fasting, hydration, supplements and progress in one offline-first app. Requires Android ${site.app.minAndroid} or later.`,
  path: "/download",
  keywords: [
    "download IGNYT",
    "IGNYT Android app",
    "free fitness app download",
    "Google Play fitness app",
    "offline fitness app download",
  ],
});

/* ------------------------------------------------------------ highlights */

interface Highlight {
  title: string;
  body: string;
  Icon: LucideIcon;
  accent: string;
}

const HIGHLIGHTS: Highlight[] = [
  {
    title: "Workout tracking",
    body: "Log sets as you lift, with an automatic rest timer and records detected for you.",
    Icon: Dumbbell,
    accent: "text-ember",
  },
  {
    title: "Nutrition",
    body: "3,160 foods offline, with macros and the micronutrients most apps skip.",
    Icon: UtensilsCrossed,
    accent: "text-good",
  },
  {
    title: "Health Connect",
    body: "17 Android Health Connect data types, read on-device with your permission.",
    Icon: HeartPulse,
    accent: "text-pulse-strong",
  },
  {
    title: "Water tracker",
    body: "One-tap hydration logging with quick-add sizes and spaced reminders.",
    Icon: Droplets,
    accent: "text-cyan",
  },
  {
    title: "Supplement tracker",
    body: "Doses, timings, 30-day adherence and a warning before you run out.",
    Icon: Pill,
    accent: "text-good",
  },
  {
    title: "Diet plans",
    body: "Build a repeatable weekly plan, then score how closely you followed it.",
    Icon: NotebookPen,
    accent: "text-ember",
  },
  {
    title: "Progress",
    body: "Weekly volume, smoothed weight trend, streaks and every personal record.",
    Icon: TrendingUp,
    accent: "text-ember",
  },
  {
    title: "Notifications",
    body: "Independent local schedules for water, training, meals and weigh-ins.",
    Icon: BellRing,
    accent: "text-warn",
  },
];

/* ------------------------------------------------------------ why bother */

const REASONS: Highlight[] = [
  {
    title: "Easy to use",
    body: "One tap to log a set, three to log a meal. Nothing important is more than two screens from the dashboard.",
    Icon: Sparkles,
    accent: "text-ember",
  },
  {
    title: "Fast",
    body: "Search hits an on-device database, so results are instant and never wait on a network round trip.",
    Icon: Gauge,
    accent: "text-pulse-strong",
  },
  {
    title: "Offline ready",
    body: "Logging, search, timers and charts all work with no connection at all. A signal is a bonus.",
    Icon: WifiOff,
    accent: "text-good",
  },
  {
    title: "Secure",
    body: "Local data sits in app-sandboxed storage; cloud data is scoped to your account by Firestore rules.",
    Icon: ShieldCheck,
    accent: "text-good",
  },
  {
    title: "Private",
    body: "No advertising SDKs, no third-party analytics, no data brokers. Every network feature is opt-in.",
    Icon: Lock,
    accent: "text-pulse-strong",
  },
  {
    title: "Built dark",
    body: "Designed dark-first and tuned for legibility in a badly lit gym at seven in the morning.",
    Icon: Monitor,
    accent: "text-cyan",
  },
];

/* ----------------------------------------------------------- setup steps */

const STEPS = [
  {
    title: "Install from Google Play",
    body: "Open the Play listing and install. No trial, no paywall, and no subscription prompt on first launch.",
  },
  {
    title: "Set your profile and targets",
    body: "Height, weight, age and goal. IGNYT turns those into daily calorie, protein, hydration and training targets you can edit at any time.",
  },
  {
    title: "Connect Health Connect (optional)",
    body: "Grant only the data types you want. Denying one metric never blocks the rest.",
  },
  {
    title: "Log your first workout",
    body: "Pick a routine or build one, then tick sets off as you lift. The rest timer starts itself.",
  },
];

/* ------------------------------------------------------------------ FAQ */

const INSTALL_FAQ = [
  {
    question: "How do I install IGNYT?",
    answer:
      "Open the Google Play listing on your Android phone and tap Install. Play handles the download and setup; nothing needs to be sideloaded and no APK file is involved.",
  },
  {
    question: "Google Play says the app is not compatible with my device.",
    answer: `IGNYT requires Android ${site.app.minAndroid} or later. If your phone runs an older release, Play hides the install button. There is no supported way to run IGNYT below that version.`,
  },
  {
    question: "Do I need a Google account to use the app?",
    answer:
      "You need one to install from Google Play, but not to use IGNYT. Signing in inside the app is only required for cloud backup and multi-device sync — skip it and everything stays on your device.",
  },
];

const UPDATE_FAQ = [
  {
    question: "How do I update to the latest version?",
    answer:
      "Play updates IGNYT automatically if auto-update is on. To update by hand, open the Play listing and tap Update, or use Play's My apps & games screen.",
  },
  {
    question: "Will updating lose my data?",
    answer:
      "No. Updates keep your local database intact. If you want a copy before updating anyway, Settings → Export Data produces a full JSON backup at any time.",
  },
  {
    question: "Where can I see what changed in this release?",
    answer:
      "The What's new section of the Google Play listing carries the notes for the current release — that is the authoritative source, and it updates the moment a build ships.",
  },
];

const TROUBLESHOOT_FAQ = [
  {
    question: "Reminders are not firing.",
    answer:
      "Android battery optimisation is almost always the cause. Allow notifications for IGNYT in Android Settings, then exclude IGNYT from battery optimisation so background schedules are not deferred.",
  },
  {
    question: "Health Connect is showing no data.",
    answer:
      "Check three things: Health Connect is installed and set up, IGNYT has been granted the specific data types under Health Connect → App permissions → IGNYT, and another app is actually writing that data. Health Connect has nothing to hand over if nothing recorded it.",
  },
  {
    question: "Sync seems stuck.",
    answer:
      "Confirm you are signed in and Cloud Sync is enabled, then trigger a manual sync from Settings. Sync needs a connection and resumes on its own once you are back online.",
  },
  {
    question: "How do I move to a new phone?",
    answer:
      "Either enable Cloud Sync on both devices, or export a full JSON backup from the old phone and import it on the new one.",
  },
];

/* ------------------------------------------------------------- the page */

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
            Download <span className="text-gradient">IGNYT</span> today
          </>
        }
        lead="Transform your workouts, nutrition, fasting, hydration, supplements and progress tracking with one powerful app."
      >
        <PlayStoreButton />
        <ButtonLink href="/screenshots" variant="secondary" size="lg">
          See it first
        </ButtonLink>
      </PageHero>

      {/* Platforms */}
      <Section id="platforms">
        <SectionHeading
          id="platforms"
          eyebrow="Platforms"
          title="Available now on Android"
          lead="iOS and a web dashboard are on the roadmap. They are not built yet, and we would rather say so than take an email address for a launch we cannot date."
        />

        <RevealGroup
          as="ul"
          className="mx-auto mt-12 grid max-w-4xl list-none gap-4 md:grid-cols-3"
        >
          <RevealItem as="li" className="h-full">
            <Card className="ring-gradient flex h-full flex-col items-center p-7 text-center">
              <Smartphone
                aria-hidden
                className="size-7 text-ember"
                strokeWidth={2}
              />
              <h3 className="mt-4 text-[17px] font-bold">Android</h3>
              <Badge tone="good" className="mt-3">
                Available
              </Badge>
              <p className="mt-3 text-[14px] leading-relaxed text-text-mute">
                Free on Google Play. Android {site.app.minAndroid} and later.
              </p>
              <PlayStoreButton size="md" className="mt-5" />
            </Card>
          </RevealItem>

          <RevealItem as="li" className="h-full">
            <Card className="flex h-full flex-col items-center p-7 text-center opacity-80">
              <Apple
                aria-hidden
                className="size-7 text-text-mute"
                strokeWidth={2}
              />
              <h3 className="mt-4 text-[17px] font-bold">iOS</h3>
              <Badge tone="neutral" className="mt-3">
                Coming soon
              </Badge>
              <p className="mt-3 text-[14px] leading-relaxed text-text-mute">
                An iPhone client with the same local-first guarantees, reading
                from Apple Health the way the Android build reads Health
                Connect.
              </p>
              <span className="mt-5 inline-flex h-12 items-center rounded-btn border border-line bg-surface px-4 text-[13.5px] font-semibold text-text-dim">
                Not yet available
              </span>
            </Card>
          </RevealItem>

          <RevealItem as="li" className="h-full">
            <Card className="flex h-full flex-col items-center p-7 text-center opacity-80">
              <Monitor
                aria-hidden
                className="size-7 text-text-mute"
                strokeWidth={2}
              />
              <h3 className="mt-4 text-[17px] font-bold">Desktop dashboard</h3>
              <Badge tone="neutral" className="mt-3">
                Coming soon
              </Badge>
              <p className="mt-3 text-[14px] leading-relaxed text-text-mute">
                A read-and-plan surface on a bigger screen, for programme design
                and long-range analysis.
              </p>
              <span className="mt-5 inline-flex h-12 items-center rounded-btn border border-line bg-surface px-4 text-[13.5px] font-semibold text-text-dim">
                Not yet available
              </span>
            </Card>
          </RevealItem>
        </RevealGroup>
      </Section>

      {/* Highlights */}
      <Section id="highlights" className="bg-ink-soft/60">
        <SectionHeading
          id="highlights"
          eyebrow="App highlights"
          title="What you get on day one"
        />

        <RevealGroup
          as="ul"
          className="mt-12 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.05}
        >
          {HIGHLIGHTS.map((item) => (
            <RevealItem as="li" key={item.title} className="h-full">
              <Card interactive className="h-full p-6">
                <item.Icon
                  aria-hidden
                  className={`size-6 ${item.accent}`}
                  strokeWidth={2.1}
                />
                <h3 className="mt-4 text-[16.5px] font-bold">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-mute">
                  {item.body}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Why download */}
      <Section id="why-download">
        <SectionHeading
          id="why-download"
          eyebrow="Why download"
          title="Six reasons it stays on your phone"
        />

        <RevealGroup
          as="ul"
          className="mt-12 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {REASONS.map((item) => (
            <RevealItem as="li" key={item.title} className="h-full">
              <Card interactive className="h-full p-7">
                <span className="grid size-11 place-items-center rounded-tile border border-line bg-surface-2">
                  <item.Icon
                    aria-hidden
                    className={`size-5 ${item.accent}`}
                    strokeWidth={2.1}
                  />
                </span>
                <h3 className="mt-5 text-[17px] font-bold">{item.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-text-mute">
                  {item.body}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Setup */}
      <Section id="get-started" className="bg-ink-soft/60">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_auto]">
          <div>
            <SectionHeading
              id="get-started"
              align="left"
              eyebrow="Installation guide"
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

      {/* Requirements */}
      <Section id="requirements">
        <SectionHeading
          id="requirements"
          eyebrow="System requirements"
          title="What you need to run it"
        />

        <Reveal className="mt-12">
          <Card className="overflow-hidden p-0">
            <dl className="divide-y divide-line">
              {[
                {
                  Icon: Smartphone,
                  term: "Android version",
                  value: `Android ${site.app.minAndroid} (${site.app.minAndroidName}) or later`,
                  detail: `Built against API ${site.app.targetSdk}, with a minimum of API 26 — so it runs on phones going back to 2017.`,
                },
                {
                  Icon: HardDrive,
                  term: "Storage",
                  value: "Space for the app plus your own logs",
                  detail:
                    "The food database ships inside the app. Your logs grow slowly; progress photographs are the only thing that uses meaningful space.",
                },
                {
                  Icon: Cpu,
                  term: "Connection",
                  value: "Not required",
                  detail:
                    "Every core feature — logging, search, timers, charts — works fully offline. A connection is only used for optional cloud backup.",
                },
                {
                  Icon: HeartPulse,
                  term: "Permissions",
                  value: "Notifications and Health Connect, both optional",
                  detail:
                    "Notifications power reminders. Health Connect is granted per data type and can be revoked in Android at any time. Neither is required to use the app.",
                },
                {
                  Icon: BadgeCheck,
                  term: "Latest version",
                  value: `${site.app.version} (build ${site.app.versionCode})`,
                  detail:
                    "Release notes for the current build live in the What's new section of the Google Play listing.",
                },
                {
                  Icon: Blocks,
                  term: "Package name",
                  value: site.androidPackage,
                  detail:
                    "Check this against the Play listing before installing — it is how you confirm you have the genuine app.",
                },
              ].map((row) => (
                <div
                  key={row.term}
                  className="grid gap-2 p-6 sm:grid-cols-[220px_1fr] sm:gap-6"
                >
                  <dt className="flex items-center gap-2.5 text-[14px] font-bold text-text">
                    <row.Icon
                      aria-hidden
                      className="size-4 shrink-0 text-ember"
                      strokeWidth={2.2}
                    />
                    {row.term}
                  </dt>
                  <dd>
                    <p className="font-mono text-[14px] font-semibold text-text">
                      {row.value}
                    </p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-text-mute">
                      {row.detail}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </Reveal>

        <Reveal className="mt-6">
          <p className="text-center text-[13.5px] text-text-dim">
            Data safety and permission details are set out in the{" "}
            <Link
              href="/privacy"
              className="text-text-mute underline underline-offset-4 hover:text-ember"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/health-data"
              className="text-text-mute underline underline-offset-4 hover:text-ember"
            >
              Health Data Policy
            </Link>
            .
          </p>
        </Reveal>
      </Section>

      {/* FAQ */}
      <Section id="download-faq" className="bg-ink-soft/60">
        <SectionHeading
          id="download-faq"
          eyebrow="FAQ"
          title="Installing, updating and fixing"
        />

        <div className="mx-auto mt-12 max-w-3xl">
          {[
            { heading: "Installation", items: INSTALL_FAQ },
            { heading: "Updating", items: UPDATE_FAQ },
            { heading: "Troubleshooting", items: TROUBLESHOOT_FAQ },
          ].map((group) => (
            <div key={group.heading} className="pb-10">
              <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-ember">
                {group.heading}
              </h3>
              <Accordion items={group.items} />
            </div>
          ))}
        </div>

        <Container className="text-center">
          <ButtonLink href="/contact" variant="secondary">
            Still stuck? Contact support
          </ButtonLink>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section id="download-now">
        <Reveal>
          <div className="ring-gradient relative overflow-hidden rounded-[32px] border border-line bg-[linear-gradient(150deg,#12151d_0%,#0b0d13_45%,#170e0a_100%)] px-6 py-16 text-center sm:px-14 sm:py-20">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full blur-[90px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,90,31,0.28), transparent 68%)",
              }}
            />
            <h2 className="relative text-[clamp(1.9rem,4.6vw,3rem)] font-black leading-[1.08]">
              Download now
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-text-mute">
              Free, offline-first, and yours to walk away from at any time.
            </p>
            <div className="relative mt-9 flex justify-center">
              <PlayStoreButton />
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
