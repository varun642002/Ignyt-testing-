import { Check, Minus } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

/**
 * IGNYT against the usual arrangement: several single-purpose apps.
 *
 * Deliberately compares *approaches*, not named products. Publishing a
 * feature matrix against competitors invites claims we cannot keep accurate
 * as those products change, and Play's policy on disparaging other apps is
 * not worth testing for a marketing flourish.
 */
interface Row {
  capability: string;
  ignyt: string;
  stack: string;
  /** Whether the typical stack manages this at all. */
  stackHas: boolean;
}

const ROWS: Row[] = [
  {
    capability: "Training and nutrition share one data model",
    ignyt: "One set of numbers",
    stack: "Separate apps, reconciled by hand",
    stackHas: false,
  },
  {
    capability: "Protein target derived from your bodyweight",
    ignyt: "Per kilogram, on the dashboard",
    stack: "Usually a flat daily gram figure",
    stackHas: false,
  },
  {
    capability: "Works with no connection",
    ignyt: "Every core feature, offline",
    stack: "Most need a round trip to search",
    stackHas: false,
  },
  {
    capability: "Micronutrients beyond the three macros",
    ignyt: "Fibre, iron, calcium, vitamin C, sodium",
    stack: "Typically premium-tier only",
    stackHas: false,
  },
  {
    capability: "Health Connect as a first-class source",
    ignyt: "17 data types, on-device",
    stack: "Varies per app, often none",
    stackHas: false,
  },
  {
    capability: "Fasting, hydration and supplements",
    ignyt: "Built in",
    stack: "Three more apps",
    stackHas: false,
  },
  {
    capability: "Full data export whenever you want it",
    ignyt: "JSON or CSV, no tier required",
    stack: "Often paywalled or absent",
    stackHas: false,
  },
  {
    capability: "Advertising and third-party trackers",
    ignyt: "None",
    stack: "Common in free tiers",
    stackHas: true,
  },
];

export function Comparison() {
  return (
    <Section id="comparison">
      <SectionHeading
        id="comparison"
        eyebrow="Comparison"
        title="One app, or five that disagree with each other"
        lead="Nothing here is a swipe at a particular product. It is the difference between one integrated data model and a stack of single-purpose tools that cannot see each other."
      />

      <Reveal className="mt-14">
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <caption className="sr-only">
              IGNYT compared with a typical stack of separate fitness apps
            </caption>
            <thead>
              <tr className="bg-surface-2">
                <th
                  scope="col"
                  className="border-b border-line px-5 py-4 text-[12px] font-bold uppercase tracking-[0.12em] text-text-dim"
                >
                  Capability
                </th>
                <th
                  scope="col"
                  className="border-b border-line px-5 py-4 text-[12px] font-bold uppercase tracking-[0.12em] text-ember"
                >
                  IGNYT
                </th>
                <th
                  scope="col"
                  className="border-b border-line px-5 py-4 text-[12px] font-bold uppercase tracking-[0.12em] text-text-dim"
                >
                  A stack of separate apps
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.capability} className="align-top">
                  <th
                    scope="row"
                    className="border-b border-line-soft px-5 py-4 text-[14.5px] font-semibold text-text"
                  >
                    {row.capability}
                  </th>
                  <td className="border-b border-line-soft px-5 py-4">
                    <span className="flex items-start gap-2 text-[14px] text-text-mute">
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-good"
                        strokeWidth={2.6}
                      />
                      {row.ignyt}
                    </span>
                  </td>
                  <td className="border-b border-line-soft px-5 py-4">
                    <span
                      className={cn(
                        "flex items-start gap-2 text-[14px]",
                        row.stackHas ? "text-text-mute" : "text-text-dim",
                      )}
                    >
                      <Minus
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-text-dim"
                        strokeWidth={2.6}
                      />
                      {row.stack}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </Section>
  );
}
