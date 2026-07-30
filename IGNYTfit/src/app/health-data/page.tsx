import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, legalSchema } from "@/components/seo/JsonLd";
import {
  LegalPage,
  LI,
  List,
  Note,
  P,
  Strong,
  type LegalSectionSpec,
} from "@/components/legal/LegalPage";
import { createMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Health Data Policy",
  description:
    "How IGNYT uses Android Health Connect: the 17 data types it reads, the 2 it writes, how permissions work, and the guarantees around advertising, sale and on-device processing.",
  path: "/health-data",
  ogType: "article",
  keywords: [
    "IGNYT Health Connect",
    "Health Connect privacy",
    "Android health data policy",
    "health data permissions",
  ],
});

/** Mirrors the permission set declared in the Android client. */
const READ_TYPES = [
  ["Steps", "Daily step count on the dashboard and in progress charts."],
  ["Heart rate", "Resting and session heart rate alongside your training."],
  ["Weight", "Keeps your weight trend consistent with other apps and scales."],
  [
    "Active calories burned",
    "Feeds the calories-burned side of your daily energy balance.",
  ],
  ["Distance", "Cardio and daily movement distance."],
  [
    "Exercise sessions",
    "Sessions recorded by other apps or a watch, shown in your history.",
  ],
  [
    "Sleep sessions",
    "Sleep duration and quality next to recovery and training load.",
  ],
  [
    "Respiratory rate",
    "Displayed as a health metric in the Health Connect view.",
  ],
  [
    "Oxygen saturation",
    "Displayed as a health metric in the Health Connect view.",
  ],
  [
    "Blood pressure",
    "Displayed as a health metric in the Health Connect view.",
  ],
  [
    "Body temperature",
    "Displayed as a health metric in the Health Connect view.",
  ],
  ["Body fat", "Shown with weight and lean mass in body composition."],
  ["Height", "Used in body composition and target calculations."],
  ["Lean body mass", "Shown with weight and body fat in body composition."],
  [
    "Basal metabolic rate",
    "Improves the accuracy of your daily energy targets.",
  ],
  ["Hydration", "Keeps water intake consistent with other apps."],
  ["Nutrition", "Keeps nutrition entries consistent with other apps."],
] as const;

const WRITE_TYPES = [
  [
    "Exercise sessions",
    "Workouts you complete in IGNYT are written back so the rest of your health apps see them.",
  ],
  [
    "Weight",
    "Weigh-ins you log in IGNYT are written back so your weight history is consistent everywhere.",
  ],
] as const;

const sections: LegalSectionSpec[] = [
  {
    id: "scope",
    heading: "Scope",
    body: (
      <>
        <P>
          This policy covers IGNYT&rsquo;s use of Android Health Connect and of
          health-related data generally. It supplements the{" "}
          <Link
            href="/privacy"
            className="font-semibold text-ember hover:underline"
          >
            Privacy Policy
          </Link>
          , which governs everything else.
        </P>
        <Note tone="ember">
          <Strong>Health Connect is entirely optional.</Strong> IGNYT is fully
          functional without it. If you never connect it, no health data is
          exchanged at all.
        </Note>
      </>
    ),
  },
  {
    id: "core-guarantees",
    heading: "Core guarantees",
    body: (
      <>
        <List>
          <LI>
            <Strong>On-device only.</Strong> Health Connect data is exchanged
            between IGNYT and Health Connect through the Android operating
            system, on your device. No IGNYT server receives it.
          </LI>
          <LI>
            <Strong>Never used for advertising.</Strong> Health Connect data is
            not used for advertising, marketing, remarketing, or to build any
            profile for those purposes.
          </LI>
          <LI>
            <Strong>Never sold or shared.</Strong> It is not sold, rented or
            shared with data brokers, insurers, employers or any third party.
          </LI>
          <LI>
            <Strong>No transfer to other apps.</Strong> IGNYT does not pass
            Health Connect data on to any other application or SDK.
          </LI>
          <LI>
            <Strong>Only for the feature you enabled.</Strong> Each data type is
            used only to display and calculate the things described below.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "read-permissions",
    heading: "Data types IGNYT reads (17)",
    body: (
      <>
        <P>
          Each of the following is a separate Android permission that you grant
          individually. IGNYT never requests write access to data it only needs
          to read.
        </P>
        <div className="mt-5 overflow-x-auto rounded-tile border border-line">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
            <caption className="sr-only">
              Health Connect data types IGNYT reads and what each is used for
            </caption>
            <thead>
              <tr className="bg-surface-2">
                <th
                  scope="col"
                  className="border-b border-line px-4 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-text-dim"
                >
                  Data type
                </th>
                <th
                  scope="col"
                  className="border-b border-line px-4 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-text-dim"
                >
                  What it is used for
                </th>
              </tr>
            </thead>
            <tbody>
              {READ_TYPES.map(([type, use]) => (
                <tr key={type} className="align-top">
                  <th
                    scope="row"
                    className="border-b border-line-soft px-4 py-3 font-semibold text-text"
                  >
                    {type}
                  </th>
                  <td className="border-b border-line-soft px-4 py-3 text-text-mute">
                    {use}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "write-permissions",
    heading: "Data types IGNYT writes (2)",
    body: (
      <>
        <P>
          IGNYT writes back only what you created inside IGNYT, so the rest of
          your health apps stay in step. It never writes data it read from
          somewhere else.
        </P>
        <List>
          {WRITE_TYPES.map(([type, use]) => (
            <LI key={type}>
              <Strong>{type}.</Strong> {use}
            </LI>
          ))}
        </List>
      </>
    ),
  },
  {
    id: "partial-permissions",
    heading: "Partial permissions",
    body: (
      <P>
        Health Connect lets you grant some data types and refuse others, and
        IGNYT is built for that. Each query is isolated, so denying one optional
        metric — blood pressure, say — never suppresses the ones you did allow,
        such as steps or active calories. Screens simply omit what they cannot
        read.
      </P>
    ),
  },
  {
    id: "revoking",
    heading: "Reviewing and revoking access",
    body: (
      <>
        <List ordered>
          <LI>
            Open the Health Connect app, or Android Settings → Health Connect.
          </LI>
          <LI>Select App permissions → IGNYT.</LI>
          <LI>
            Turn individual data types on or off, or choose Remove all
            permissions.
          </LI>
        </List>
        <P>
          Revocation takes effect immediately. IGNYT stops reading the revoked
          types at once; anything already shown in the app is simply no longer
          refreshed.
        </P>
        <P>
          Health Connect also keeps its own access log, so you can audit which
          apps read what and when — independently of anything IGNYT tells you.
        </P>
      </>
    ),
  },
  {
    id: "other-health-data",
    heading: "Health data you enter yourself",
    body: (
      <>
        <P>
          Blood work results, medical reports, progress photographs and body
          measurements you enter manually are treated as your most sensitive
          data:
        </P>
        <List>
          <LI>they are stored in app-sandboxed storage on your device;</LI>
          <LI>progress photographs are never uploaded, under any setting;</LI>
          <LI>
            IGNYT does not interpret medical results and provides no clinical
            guidance — see the{" "}
            <Link
              href="/disclaimer"
              className="font-semibold text-ember hover:underline"
            >
              Disclaimer
            </Link>
            .
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "deletion",
    heading: "Deleting health data",
    body: (
      <P>
        Health Connect data belongs to Health Connect, so delete it there.
        Health data you entered into IGNYT is deleted with the rest of your app
        data — see the{" "}
        <Link
          href="/data-deletion"
          className="font-semibold text-ember hover:underline"
        >
          Data Deletion Policy
        </Link>
        .
      </P>
    ),
  },
  {
    id: "compliance",
    heading: "Compliance",
    body: (
      <P>
        IGNYT&rsquo;s use of Health Connect is designed to meet Google
        Play&rsquo;s Health Connect permissions policy and the Health Apps
        requirements of the Play Developer Programme Policy, including the
        prohibitions on advertising use, on sale of health data, and on
        requesting permissions beyond what a feature genuinely needs.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <P>
        Questions about how IGNYT handles health data:{" "}
        <a
          href={`mailto:${site.email.privacy}`}
          className="font-semibold text-ember hover:underline"
        >
          {site.email.privacy}
        </a>
        .
      </P>
    ),
  },
];

export default function HealthDataPage() {
  return (
    <>
      <JsonLd data={legalSchema("Health Data Policy", "/health-data")} />
      <LegalPage
        title="Health Data Policy"
        summary="Health data is the most sensitive thing IGNYT touches. This is exactly what it reads, what it writes, where that happens, and what it will never be used for."
        sections={sections}
        currentPath="/health-data"
      />
    </>
  );
}
