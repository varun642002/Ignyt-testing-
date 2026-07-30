import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Download,
  FileJson,
  HeartPulse,
  LifeBuoy,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { DownloadCta } from "@/components/home/DownloadCta";
import { breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { sortedPosts } from "@/lib/blog";
import { createMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Resources",
  description:
    "Everything you need to get the most out of IGNYT: setup guides, how the calculations work, data export and portability, Health Connect help, and the policies that govern your data.",
  path: "/resources",
  keywords: [
    "IGNYT guides",
    "IGNYT help",
    "fitness app setup guide",
    "Health Connect setup",
    "export fitness data",
  ],
});

interface Resource {
  title: string;
  body: string;
  href: string;
  cta: string;
  Icon: LucideIcon;
}

const GUIDES: Resource[] = [
  {
    title: "Installation and setup",
    body: "Install from Google Play, set your profile and targets, and log your first workout — four steps, with the optional bits marked optional.",
    href: "/download#get-started",
    cta: "Read the setup guide",
    Icon: Download,
  },
  {
    title: "Connecting Health Connect",
    body: "Which of the 17 data types IGNYT reads, how partial permissions behave, and how to revoke access at any time.",
    href: "/health-data",
    cta: "Health Connect reference",
    Icon: HeartPulse,
  },
  {
    title: "Exporting your data",
    body: "Full JSON backup or CSV per data type, on demand. What each export contains and how to move to a new device.",
    href: "/data-deletion#delete-on-device",
    cta: "Export and portability",
    Icon: FileJson,
  },
  {
    title: "Troubleshooting",
    body: "Reminders not firing, Health Connect showing nothing, sync stuck — the fixes for the problems people actually hit.",
    href: "/contact#faq",
    cta: "Open the FAQ",
    Icon: LifeBuoy,
  },
];

const REFERENCE: Resource[] = [
  {
    title: "How targets are calculated",
    body: "Calorie and macro targets come from standard equations applied to your height, weight, age and activity level — and every one of them is editable.",
    href: "/features#macro-tracking",
    cta: "See the feature detail",
    Icon: Calculator,
  },
  {
    title: "The food database",
    body: "3,160 curated entries with per-100 g values, bundled with the app so search works offline. Custom foods and barcodes fill the gaps.",
    href: "/features#food-logging",
    cta: "How food logging works",
    Icon: BookOpen,
  },
  {
    title: "Privacy and data handling",
    body: "What is stored on your device, what is uploaded only if you opt in, and what is never collected at all.",
    href: "/privacy",
    cta: "Read the privacy policy",
    Icon: ShieldCheck,
  },
  {
    title: "All policies",
    body: "Privacy, terms, health data, data deletion, cookies and the medical, fitness, nutrition and supplement disclaimers.",
    href: "/terms",
    cta: "Browse the legal suite",
    Icon: ScrollText,
  },
];

function ResourceGrid({ items }: { items: Resource[] }) {
  return (
    <RevealGroup as="ul" className="mt-12 grid list-none gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <RevealItem as="li" key={item.title} className="h-full">
          <Card interactive className="h-full p-7">
            <span className="grid size-11 place-items-center rounded-tile border border-ember/30 bg-ember/12 text-ember">
              <item.Icon aria-hidden className="size-5" strokeWidth={2.1} />
            </span>
            <h3 className="mt-5 text-[17.5px] font-bold">{item.title}</h3>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-text-mute">
              {item.body}
            </p>
            <Link
              href={item.href}
              className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ember hover:underline"
            >
              {item.cta}
              <ArrowRight aria-hidden className="size-3.5" />
              <span className="absolute inset-0" aria-hidden />
            </Link>
          </Card>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

export default function ResourcesPage() {
  const latest = sortedPosts.slice(0, 3);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: "Resources", path: "/resources" }])}
      />

      <PageHero
        eyebrow="Resources"
        title={
          <>
            Everything you need to{" "}
            <span className="text-gradient">get set up and stay set up</span>
          </>
        }
        lead="Setup guides, how the numbers are calculated, how to get your data out, and the policies that govern all of it — in one place."
      >
        <ButtonLink href="/download" size="lg">
          Install IGNYT
        </ButtonLink>
        <ButtonLink href="/blog" variant="secondary" size="lg">
          Read the blog
        </ButtonLink>
      </PageHero>

      <Section id="guides">
        <SectionHeading
          id="guides"
          eyebrow="Guides"
          title="Getting started and getting unstuck"
        />
        <ResourceGrid items={GUIDES} />
      </Section>

      <Section id="reference" className="bg-ink-soft/60">
        <SectionHeading
          id="reference"
          eyebrow="Reference"
          title="How IGNYT works under the hood"
        />
        <ResourceGrid items={REFERENCE} />
      </Section>

      <Section id="reading">
        <SectionHeading
          id="reading"
          eyebrow="Reading"
          title="Latest from the blog"
          lead="Practical writing on training and nutrition — no supplements to sell."
        />

        <RevealGroup
          as="ul"
          className="mt-12 grid list-none gap-4 md:grid-cols-3"
        >
          {latest.map((post) => (
            <RevealItem as="li" key={post.slug} className="h-full">
              <Card interactive className="h-full p-6">
                <Badge tone="pulse">{post.category}</Badge>
                <h3 className="mt-4 text-[17px] font-bold leading-snug">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-ember"
                  >
                    {post.title}
                    <span className="absolute inset-0" aria-hidden />
                  </Link>
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-text-mute">
                  {post.description}
                </p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>

        <div className="mt-12 flex justify-center">
          <ButtonLink href="/blog" variant="secondary">
            All articles
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </Section>

      <Section id="support" className="bg-ink-soft/60">
        <SectionHeading
          id="support"
          eyebrow="Still stuck"
          title="Talk to a person"
          lead={`Messages reach a real inbox at ${site.email.support}, and we answer every one.`}
        />
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/contact" size="lg">
            Contact support
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </Section>

      <DownloadCta />
    </>
  );
}
