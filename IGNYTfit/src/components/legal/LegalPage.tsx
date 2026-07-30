import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, Mail } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { legalRoutes } from "@/lib/routes";
import { legalUpdatedLabel, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface LegalSectionSpec {
  /** Anchor id — also the table-of-contents target. */
  id: string;
  heading: string;
  body: ReactNode;
}

/* ------------------------------------------------------- prose primitives */

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[15px] leading-[1.75] text-text-mute">{children}</p>
  );
}

export function List({
  children,
  ordered = false,
}: {
  children: ReactNode;
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "mt-4 flex flex-col gap-2.5 pl-5 text-[15px] leading-[1.7] text-text-mute",
        ordered ? "list-decimal" : "list-disc",
      )}
    >
      {children}
    </Tag>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return <li className="marker:text-ember">{children}</li>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-text">{children}</strong>;
}

/** Callout for the points a reader must not miss. */
export function Note({
  children,
  tone = "pulse",
}: {
  children: ReactNode;
  tone?: "pulse" | "ember" | "warn";
}) {
  const tones = {
    pulse: "border-pulse/30 bg-pulse/8",
    ember: "border-ember/30 bg-ember/8",
    warn: "border-warn/30 bg-warn/8",
  };
  return (
    <div
      className={cn(
        "mt-5 rounded-tile border p-4 text-[14.5px] leading-relaxed text-text-mute",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

/** Definition-style table used for "what we collect and why". */
export function DataTable({
  caption,
  rows,
}: {
  caption: string;
  rows: Array<[string, string, string]>;
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-tile border border-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-surface-2">
            {["Data", "Why it is handled", "Where it lives"].map((header) => (
              <th
                key={header}
                scope="col"
                className="border-b border-line px-4 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-text-dim"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([data, why, where]) => (
            <tr key={data} className="align-top">
              <th
                scope="row"
                className="border-b border-line-soft px-4 py-3 font-semibold text-text"
              >
                {data}
              </th>
              <td className="border-b border-line-soft px-4 py-3 text-text-mute">
                {why}
              </td>
              <td className="border-b border-line-soft px-4 py-3 text-text-mute">
                {where}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------- the layout */

/**
 * Shared shell for the six legal documents.
 *
 * Every page supplies a title, a one-line summary and an array of sections;
 * the heading hierarchy, anchors, table of contents, "last updated" stamp and
 * cross-links are generated here so the suite cannot drift out of step.
 */
export function LegalPage({
  title,
  summary,
  sections,
  currentPath,
}: {
  title: string;
  summary: string;
  sections: LegalSectionSpec[];
  currentPath: string;
}) {
  return (
    <>
      <section
        aria-labelledby="legal-title"
        className="relative overflow-hidden border-b border-line/60 py-16 sm:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-40%] -z-10 size-[640px] -translate-x-1/2 rounded-full blur-[110px]"
          style={{
            background:
              "radial-gradient(circle, rgba(62,130,247,0.16) 0%, rgba(0,0,0,0) 68%)",
          }}
        />
        <Container>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ember">
            Legal
          </p>
          <h1
            id="legal-title"
            className="mt-4 text-[clamp(2rem,4.6vw,3.2rem)] font-black leading-[1.08]"
          >
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-text-mute">
            {summary}
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[13px] text-text-dim">
            <CalendarClock aria-hidden className="size-4" />
            Last updated{" "}
            <time dateTime={site.legalUpdated}>{legalUpdatedLabel}</time>
          </p>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          {/* Table of contents */}
          <nav
            aria-labelledby="legal-toc-heading"
            className="lg:sticky lg:top-[92px] lg:self-start"
          >
            <h2
              id="legal-toc-heading"
              className="text-[12px] font-bold uppercase tracking-[0.16em] text-text-dim"
            >
              On this page
            </h2>
            <ol className="mt-4 flex flex-col gap-1.5">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2.5 rounded-lg py-1 text-[13.5px] leading-snug text-text-mute transition-colors hover:text-ember"
                  >
                    <span className="tabular-nums text-text-dim">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Document body */}
          <article className="max-w-3xl">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="scroll-mt-28 border-b border-line/60 py-8 first:pt-0 last:border-b-0"
              >
                <h2
                  id={`${section.id}-heading`}
                  className="flex items-baseline gap-3 text-[20px] font-bold text-text sm:text-[22px]"
                >
                  <span className="text-[14px] font-black tabular-nums text-ember">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </h2>
                {section.body}
              </section>
            ))}

            <div className="mt-10 rounded-card border border-line bg-surface/60 p-6">
              <h2 className="text-[17px] font-bold">Questions about this?</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-text-mute">
                Email us and we will answer. For requests about your own data,
                include the Google account address you use with IGNYT.
              </p>
              <a
                href={`mailto:${site.email.privacy}`}
                className="mt-4 inline-flex items-center gap-2 text-[14.5px] font-semibold text-ember hover:underline"
              >
                <Mail aria-hidden className="size-4" />
                {site.email.privacy}
              </a>
            </div>

            <nav aria-label="Other legal documents" className="mt-10">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-text-dim">
                Related documents
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {legalRoutes
                  .filter((route) => route.path !== currentPath)
                  .map((route) => (
                    <li key={route.path}>
                      <Link
                        href={route.path}
                        className="inline-flex rounded-full border border-line bg-surface/70 px-4 py-2 text-[13.5px] font-semibold text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
                      >
                        {route.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          </article>
        </div>
      </Container>
    </>
  );
}
