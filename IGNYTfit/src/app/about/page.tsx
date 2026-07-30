import type { Metadata } from "next";
import {
  Accessibility,
  Brain,
  Cloud,
  Compass,
  Database,
  FileHeart,
  Gauge,
  HeartPulse,
  Building2,
  Layers,
  Lock,
  Rocket,
  Ruler,
  ShieldCheck,
  Sparkles,
  Target,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { DownloadCta } from "@/components/home/DownloadCta";
import { breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { Badge, Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "About",
  description:
    "Why IGNYT exists: the mission, the vision, the problems it solves, the values it is built on, the technology behind it, and what is planned next.",
  path: "/about",
  keywords: [
    "about IGNYT",
    "IGNYT mission",
    "fitness app roadmap",
    "privacy first fitness app",
  ],
});

const PROBLEMS = [
  {
    problem: "Your data is scattered across five apps",
    solution:
      "Workouts in one app, calories in another, fasting in a third, weight in a spreadsheet. None of them share a number, so none of them can tell you anything useful. IGNYT keeps one data model for all of it.",
  },
  {
    problem: "Everything useful is behind a subscription",
    solution:
      "Macro targets, charts and exports are routinely paywalled. In IGNYT they are simply features — there is no premium tier holding your own data hostage.",
  },
  {
    problem: "Fitness apps assume you are always online",
    solution:
      "Gyms have terrible signal. IGNYT keeps the food database, timers, charts and search on the device, so a dead connection changes nothing.",
  },
  {
    problem: "Health data is quietly monetised",
    solution:
      "Bodyweight, sleep and heart rate are unusually sensitive. IGNYT ships no advertising SDKs and no third-party analytics, and every sync is opt-in.",
  },
  {
    problem: "Nutrition tracking stops at calories",
    solution:
      "Most apps count three macros and stop. IGNYT tracks protein per kilogram of bodyweight plus the micronutrients — fibre, iron, calcium — that actually change how you feel.",
  },
  {
    problem: "Leaving an app means losing your history",
    solution:
      "Export is a first-class feature: full JSON backup, or CSV per data type, on demand. If you outgrow IGNYT, your training history comes with you.",
  },
];

interface Value {
  title: string;
  body: string;
  Icon: LucideIcon;
}

const VALUES: Value[] = [
  {
    title: "Health first",
    body: "Every number in the app is there to support a decision about training or eating. Nothing is included to drive engagement, and nothing nags you for opening the app less often.",
    Icon: HeartPulse,
  },
  {
    title: "Privacy first",
    body: "Local storage is the default, not a setting. Cloud sync, Google sign-in and Health Connect are each independently optional and independently revocable.",
    Icon: Lock,
  },
  {
    title: "Simple experience",
    body: "One tap to log a set. Three to log a meal. If a new feature would slow down the paths people use every day, it goes somewhere else in the app.",
    Icon: Sparkles,
  },
  {
    title: "Continuous improvement",
    body: "IGNYT ships in small, frequent releases driven by real training use — a food database cleanup, a rest-timer fix, a chart that was hard to read.",
    Icon: Compass,
  },
  {
    title: "Innovation with restraint",
    body: "New platform capabilities like Health Connect get adopted when they make the app genuinely better, not because they are new.",
    Icon: Rocket,
  },
];

const STACK = [
  {
    name: "Next.js",
    role: "This website",
    body: "The site you are reading: statically generated, dark-first, with no third-party scripts.",
    Icon: Layers,
  },
  {
    name: "Capacitor + Android",
    role: "The app shell",
    body: "A web core packaged as a native Android application, with Kotlin plugins for the parts that must be native.",
    Icon: Building2,
  },
  {
    name: "Firebase",
    role: "Optional cloud sync",
    body: "Firestore, with security rules that restrict every document to the account that owns it. Off unless you sign in.",
    Icon: Cloud,
  },
  {
    name: "Health Connect",
    role: "On-device health data",
    body: "Android's own health data layer, read through 17 individually granted permissions and never proxied through a server.",
    Icon: HeartPulse,
  },
  {
    name: "On-device database",
    role: "Local-first storage",
    body: "Your logs, the 3,160-item food database and every chart live in app-sandboxed storage on the phone.",
    Icon: Database,
  },
  {
    name: "Offline-first architecture",
    role: "How it all fits",
    body: "The device is the source of truth. The cloud, when enabled, is a copy — not the other way round.",
    Icon: Gauge,
  },
];

const ROADMAP = [
  {
    title: "AI coach",
    body: "Programme suggestions grounded in your own logged volume, recovery and adherence — not a generic template.",
    Icon: Brain,
  },
  {
    title: "AI nutrition",
    body: "Faster logging from natural descriptions of a meal, with the same database and the same macros behind it.",
    Icon: Sparkles,
  },
  {
    title: "Wearables",
    body: "Deeper integration with watches and straps for live heart rate during a session.",
    Icon: Watch,
  },
  {
    title: "Apple Health",
    body: "An iOS client with the same local-first guarantees, reading from Apple Health the way the Android build reads Health Connect.",
    Icon: Accessibility,
  },
  {
    title: "Web dashboard",
    body: "A read-and-plan surface on a bigger screen for programme design and long-range analysis.",
    Icon: Ruler,
  },
  {
    title: "Medical records",
    body: "Blood work and medical report tracking, held to the same on-device standard as the rest of your health data.",
    Icon: FileHeart,
  },
  {
    title: "Enterprise features",
    body: "Coach and team tooling: shared programmes, athlete rosters and progress reviews.",
    Icon: Target,
  },
];

const COMMITMENTS = [
  {
    title: "Privacy",
    body: "No advertising SDKs, no third-party analytics, no data brokers. Every network feature is opt-in and can be switched off without losing your history.",
    Icon: Lock,
  },
  {
    title: "Security",
    body: "Local data sits in app-sandboxed storage. Cloud data is protected by your Google account and by Firestore rules that scope every document to a single user.",
    Icon: ShieldCheck,
  },
  {
    title: "Accuracy",
    body: "The food database is curated and de-duplicated rather than crowd-sourced without review, and health values are read from Health Connect rather than estimated.",
    Icon: Target,
  },
  {
    title: "Reliability",
    body: "Offline-first means the app cannot be taken down by a server outage. Your data is on your phone, and it exports in full whenever you ask.",
    Icon: Gauge,
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "About", path: "/about" }])} />

      <PageHero
        eyebrow="About IGNYT"
        title={
          <>
            Built for people who actually{" "}
            <span className="text-gradient">train</span>
          </>
        }
        lead="IGNYT started as one person's training log and grew into a complete fitness system — because the alternative was six apps, three subscriptions and a spreadsheet that nobody kept up to date."
      />

      {/* Mission & vision */}
      <Section id="mission">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Card className="ring-gradient h-full p-8 sm:p-10">
              <Badge tone="ember">Our mission</Badge>
              <h2
                id="mission-heading"
                className="mt-5 text-[clamp(1.5rem,3vw,2.1rem)] font-black leading-tight"
              >
                Make consistent training and honest nutrition tracking easy
                enough that people keep doing it.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-text-mute">
                Most fitness journeys do not fail on knowledge — they fail on
                friction. IGNYT exists to remove the friction: one app, one set
                of numbers, no paywall in the middle of a workout, and no
                requirement to be online at the moment you need it most.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="h-full p-8 sm:p-10">
              <Badge tone="pulse">Our vision</Badge>
              <h2 className="mt-5 text-[clamp(1.5rem,3vw,2.1rem)] font-black leading-tight">
                A complete health picture that belongs to the person it
                describes.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-text-mute">
                Training, nutrition, sleep, hydration, body composition and
                blood work all describe the same body. They belong in one place
                — and that place should be the device in your pocket, under your
                control, exportable at any moment.
              </p>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* Why we built it */}
      <Section id="why" className="bg-ink-soft/60">
        <SectionHeading
          id="why"
          eyebrow="Why we built IGNYT"
          title="Six apps, none of which talked to each other"
          lead="IGNYT began because tracking a single training block meant a workout logger, a calorie counter, a fasting timer, a water reminder, a supplement checklist and a weight spreadsheet — and reconciling them by hand every Sunday."
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 md:grid-cols-2"
        >
          {PROBLEMS.map((item) => (
            <RevealItem as="li" key={item.problem} className="h-full">
              <Card className="h-full p-6">
                <h3 className="flex items-start gap-3 text-[16.5px] font-bold text-text">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-bad"
                  />
                  {item.problem}
                </h3>
                <p className="mt-3 pl-[18px] text-[14.5px] leading-relaxed text-text-mute">
                  {item.solution}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Values */}
      <Section id="values">
        <SectionHeading
          id="values"
          eyebrow="Core values"
          title="Five rules that decide what gets built"
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {VALUES.map((value) => (
            <RevealItem as="li" key={value.title} className="h-full">
              <Card interactive className="h-full p-7">
                <span className="grid size-11 place-items-center rounded-tile border border-ember/30 bg-ember/12 text-ember">
                  <value.Icon
                    aria-hidden
                    className="size-5"
                    strokeWidth={2.1}
                  />
                </span>
                <h3 className="mt-5 text-[17px] font-bold">{value.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-text-mute">
                  {value.body}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Technology */}
      <Section id="technology" className="bg-ink-soft/60">
        <SectionHeading
          id="technology"
          eyebrow="Technology stack"
          title="Modern architecture, deliberately boring where it counts"
          lead="The interesting engineering is in staying offline-first. Everything else is chosen to be predictable."
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {STACK.map((item) => (
            <RevealItem as="li" key={item.name} className="h-full">
              <Card className="h-full p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-tile border border-pulse/30 bg-pulse/12 text-pulse-strong">
                    <item.Icon
                      aria-hidden
                      className="size-[18px]"
                      strokeWidth={2.1}
                    />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-dim">
                      {item.role}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[14px] leading-relaxed text-text-mute">
                  {item.body}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Roadmap */}
      <Section id="roadmap">
        <SectionHeading
          id="roadmap"
          eyebrow="Future roadmap"
          title="What comes next"
          lead="Planned direction, not shipping dates. Nothing here is in the app yet — when it lands, it lands in a release note first."
        />

        <div className="relative mx-auto mt-16 max-w-3xl">
          <span
            aria-hidden
            className="absolute bottom-4 left-[23px] top-4 w-px bg-[linear-gradient(180deg,transparent,rgba(62,130,247,0.5)_10%,rgba(255,90,31,0.5)_90%,transparent)]"
          />

          <RevealGroup as="ol" className="flex list-none flex-col gap-7">
            {ROADMAP.map((item) => (
              <RevealItem as="li" key={item.title} className="flex gap-5">
                <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-2xl border border-pulse/30 bg-ink shadow-[0_0_0_6px_rgba(8,9,13,1)]">
                  <item.Icon
                    aria-hidden
                    className="size-[19px] text-pulse-strong"
                    strokeWidth={2.1}
                  />
                </span>
                <div className="pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[17.5px] font-bold">{item.title}</h3>
                    <Badge tone="neutral">Planned</Badge>
                  </div>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-text-mute">
                    {item.body}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </Section>

      {/* Commitment */}
      <Section id="commitment" className="bg-ink-soft/60">
        <SectionHeading
          id="commitment"
          eyebrow="Our commitment"
          title="Four promises we hold ourselves to"
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {COMMITMENTS.map((item) => (
            <RevealItem as="li" key={item.title} className="h-full">
              <Card interactive className="h-full p-6">
                <item.Icon
                  aria-hidden
                  className="size-6 text-good"
                  strokeWidth={2.1}
                />
                <h3 className="mt-5 text-[17px] font-bold">{item.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-text-mute">
                  {item.body}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>

        <Container className="mt-14 text-center">
          <Reveal>
            <p className="mx-auto max-w-2xl text-[16px] leading-relaxed text-text-mute">
              Join thousands of people building healthier lifestyles with IGNYT
              — one logged set, one honest meal and one consistent week at a
              time.
            </p>
          </Reveal>
        </Container>
      </Section>

      <DownloadCta />
    </>
  );
}
