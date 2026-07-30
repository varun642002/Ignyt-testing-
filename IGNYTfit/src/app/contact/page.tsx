import type { Metadata } from "next";
import {
  Briefcase,
  Bug,
  HelpCircle,
  Lightbulb,
  LifeBuoy,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
} from "@/components/brand/SocialIcons";
import { ContactForm } from "@/components/contact/ContactForm";
import { breadcrumbSchema, faqSchema, JsonLd } from "@/components/seo/JsonLd";
import { Accordion } from "@/components/ui/Accordion";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { allFaqs, faqGroups } from "@/lib/faq";
import { createMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Contact",
  description:
    "Get in touch with the IGNYT team — support, technical issues, bug reports, feature requests, privacy requests and business enquiries — plus answers to the questions we are asked most.",
  path: "/contact",
  keywords: [
    "IGNYT support",
    "contact IGNYT",
    "IGNYT bug report",
    "fitness app support",
  ],
});

interface Channel {
  title: string;
  body: string;
  Icon: LucideIcon;
  subject: string;
  accent: string;
}

const CHANNELS: Channel[] = [
  {
    title: "Support",
    body: "Something is not working the way the app says it should. Include your device model and Android version.",
    Icon: LifeBuoy,
    subject: "Support request",
    accent: "text-ember",
  },
  {
    title: "General questions",
    body: "How a feature works, whether something is possible, or what is planned next.",
    Icon: HelpCircle,
    subject: "General question",
    accent: "text-pulse-strong",
  },
  {
    title: "Technical issues",
    body: "Sync trouble, Health Connect permissions, notifications not firing, or import and export problems.",
    Icon: Wrench,
    subject: "Technical issue",
    accent: "text-cyan",
  },
  {
    title: "Bug reports",
    body: "A crash, a wrong number, or a screen that will not load. Steps to reproduce it help enormously.",
    Icon: Bug,
    subject: "Bug report",
    accent: "text-bad",
  },
  {
    title: "Feature requests",
    body: "Tell us what is missing from your training week. Requests genuinely shape the roadmap.",
    Icon: Lightbulb,
    subject: "Feature request",
    accent: "text-warn",
  },
  {
    title: "Business enquiries",
    body: "Partnerships, coaching tools, press, or anything commercial.",
    Icon: Briefcase,
    subject: "Business enquiry",
    accent: "text-good",
  },
];

const COMMUNITY = [
  {
    label: "GitHub",
    handle: "Source, issues and releases",
    href: site.links.github,
    Icon: GithubIcon,
  },
  {
    label: "Instagram",
    handle: "@ignytfit",
    href: site.links.instagram,
    Icon: InstagramIcon,
  },
  { label: "X", handle: "@ignytfit", href: site.links.x, Icon: XIcon },
  {
    label: "LinkedIn",
    handle: "IGNYT",
    href: site.links.linkedin,
    Icon: LinkedinIcon,
  },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: "Contact", path: "/contact" }])}
      />
      <JsonLd data={faqSchema(allFaqs)} />

      <PageHero
        eyebrow="Contact"
        title={
          <>
            Talk to the people who{" "}
            <span className="text-gradient">build IGNYT</span>
          </>
        }
        lead="No ticket queue and no chatbot. Messages go to a real inbox, and we answer every one — usually within two working days."
      />

      {/* Channels */}
      <Section id="channels">
        <SectionHeading
          id="channels"
          eyebrow="How can we help"
          title="Pick the closest fit"
          lead="It all reaches the same inbox — choosing a category just means we can prioritise properly."
        />

        <RevealGroup
          as="ul"
          className="mt-14 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CHANNELS.map((channel) => (
            <RevealItem as="li" key={channel.title} className="h-full">
              <Card interactive className="h-full p-6">
                <channel.Icon
                  aria-hidden
                  className={`size-6 ${channel.accent}`}
                  strokeWidth={2.1}
                />
                <h3 className="mt-5 text-[17px] font-bold">{channel.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-text-mute">
                  {channel.body}
                </p>
                <a
                  href={`mailto:${site.email.support}?subject=${encodeURIComponent(
                    `[IGNYT] ${channel.subject}`,
                  )}`}
                  className="mt-4 inline-flex text-[13.5px] font-semibold text-ember hover:underline"
                >
                  Email about {channel.title.toLowerCase()}
                  <span className="sr-only"> — opens your mail client</span>
                </a>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Form */}
      <Section id="form" className="bg-ink-soft/60">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
          <div>
            <SectionHeading
              id="form"
              align="left"
              eyebrow="Send a message"
              title="Write to us"
              lead="Required fields are marked. Nothing you send here is used for marketing."
              className="max-w-xl"
            />
            <Reveal className="mt-10">
              <ContactForm />
            </Reveal>
          </div>

          <Reveal direction="left" className="lg:pt-10">
            <Card className="glass h-full p-7">
              <h3 className="text-[17px] font-bold">Before you write</h3>
              <ul className="mt-5 flex flex-col gap-4 text-[14px] leading-relaxed text-text-mute">
                <li>
                  <span className="font-semibold text-text">
                    Reporting a bug?
                  </span>{" "}
                  Device model, Android version, and what you were doing when it
                  happened.
                </li>
                <li>
                  <span className="font-semibold text-text">
                    Data or deletion request?
                  </span>{" "}
                  Write from the Google account address you use with IGNYT so we
                  can verify it is you.
                </li>
                <li>
                  <span className="font-semibold text-text">
                    Health Connect issue?
                  </span>{" "}
                  Check the FAQ below first — nine times out of ten it is a
                  permission that was never granted.
                </li>
                <li>
                  <span className="font-semibold text-text">
                    Never send credentials.
                  </span>{" "}
                  We will never ask for your password or a recovery code.
                </li>
              </ul>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq">
        <SectionHeading
          id="faq"
          eyebrow="FAQ"
          title="Answers to what we are asked most"
          lead="Grouped by topic. If your question is not here, the form above reaches a person."
        />

        <div className="mx-auto mt-14 max-w-3xl">
          {faqGroups.map((group) => (
            <div key={group.id} id={group.id} className="scroll-mt-28 pb-10">
              <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-ember">
                {group.label}
              </h3>
              <Accordion items={group.items} />
            </div>
          ))}
        </div>
      </Section>

      {/* Community */}
      <Section id="community" className="bg-ink-soft/60">
        <SectionHeading
          id="community"
          eyebrow="Community"
          title="Find us elsewhere"
        />

        <RevealGroup
          as="ul"
          className="mx-auto mt-14 grid max-w-4xl list-none gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {COMMUNITY.map((item) => (
            <RevealItem as="li" key={item.label} className="h-full">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col items-center gap-3 rounded-card border border-line bg-surface/60 p-7 text-center transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-ember/45"
              >
                <span className="grid size-12 place-items-center rounded-tile border border-line bg-surface-2 text-text-mute transition-colors group-hover:text-ember">
                  <item.Icon className="size-5" />
                </span>
                <span className="text-[16px] font-bold text-text">
                  {item.label}
                </span>
                <span className="text-[13px] text-text-dim">{item.handle}</span>
              </a>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>
    </>
  );
}
