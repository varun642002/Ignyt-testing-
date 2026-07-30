import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, legalSchema } from "@/components/seo/JsonLd";
import {
  DataTable,
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
  title: "Privacy Policy",
  description:
    "How IGNYT handles your data: local-first storage, optional Google sign-in and cloud sync, Android Health Connect, what we never do, and how to export or delete everything.",
  path: "/privacy",
  ogType: "article",
  keywords: [
    "IGNYT privacy policy",
    "fitness app privacy",
    "health data privacy",
  ],
});

const sections: LegalSectionSpec[] = [
  {
    id: "overview",
    heading: "Overview",
    body: (
      <>
        <P>
          IGNYT (&ldquo;the app&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;) is
          a fitness and health tracking application for Android, published under
          the package name <Strong>{site.androidPackage}</Strong>. This policy
          explains what data the app handles, where that data lives, who else
          can see it, and what control you have over it.
        </P>
        <P>
          It covers the IGNYT app and this website. It does not cover
          third-party services you separately choose to connect — Google
          Sign-In, Google Drive and Android Health Connect each have their own
          privacy policies.
        </P>
        <Note tone="ember">
          <Strong>The short version.</Strong> By default, everything you log
          stays on your phone. Nothing is uploaded, no advertising or analytics
          SDK is present, and every feature that involves the network is off
          until you turn it on.
        </Note>
      </>
    ),
  },
  {
    id: "information-collected",
    heading: "Information collected",
    body: (
      <>
        <P>
          The table below lists every category of data IGNYT handles, why it is
          handled, and where it is stored.
        </P>
        <DataTable
          caption="Categories of data handled by IGNYT"
          rows={[
            [
              "Profile and goals",
              "Age, height, weight, activity level and objective are used to calculate your calorie, protein, hydration and training targets.",
              "On your device. Uploaded only if Cloud Sync is enabled.",
            ],
            [
              "Workout data",
              "Routines, sessions, exercises, sets, reps, load, rest timers, personal records and achievements.",
              "On your device. Uploaded only if Cloud Sync is enabled.",
            ],
            [
              "Nutrition data",
              "Food entries, meals, calories, macros, micronutrients, diet plans, fasting windows and hydration logs.",
              "On your device. Uploaded only if Cloud Sync is enabled.",
            ],
            [
              "Weight and body data",
              "Weight history, body fat, lean mass, tape measurements and progress photographs.",
              "On your device. Progress photographs are never uploaded.",
            ],
            [
              "Health Connect data",
              "Steps, heart rate, sleep, exercise, body composition, hydration and nutrition read from Android Health Connect, with your permission.",
              "Exchanged on-device through Android. No IGNYT server receives it.",
            ],
            [
              "Account identity",
              "If — and only if — you sign in with Google: your name, email address and profile photograph, used to identify your account.",
              "Google Sign-In and, where enabled, Firebase.",
            ],
            [
              "Notifications",
              "Reminder schedules for water, workouts, meals, supplements, weigh-ins and fasting windows.",
              "On your device. Notifications are scheduled locally.",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "authentication",
    heading: "Authentication, email and phone number",
    body: (
      <>
        <P>
          <Strong>Authentication is optional.</Strong> IGNYT is fully usable
          without an account. Signing in exists for one reason: to make cloud
          backup and multi-device sync possible.
        </P>
        <List>
          <LI>
            <Strong>Google Sign-In.</Strong> If you sign in, we receive the
            name, email address and profile photograph associated with your
            Google account. These are used to identify your account inside the
            app and to scope your cloud data to you. We do not receive your
            Google password.
          </LI>
          <LI>
            <Strong>Email address.</Strong> Used as your account identifier and,
            if you contact support, to reply to you. It is not added to a
            mailing list and is not shared with anyone.
          </LI>
          <LI>
            <Strong>Phone number.</Strong> IGNYT does not request, collect or
            store a phone number. There is no SMS or phone-based sign-in.
          </LI>
        </List>
        <P>
          Signing out at any time stops all synchronisation. Data already on
          your device remains on your device.
        </P>
      </>
    ),
  },
  {
    id: "health-connect",
    heading: "Health Connect data",
    body: (
      <>
        <P>
          If you connect Android Health Connect, IGNYT requests read access to
          17 data types and write access to 2. Each permission is granted
          individually by you, in Android&rsquo;s own permission interface, and
          can be revoked there at any time.
        </P>
        <P>
          This exchange happens entirely on the device, through the Android
          operating system. IGNYT does not operate a server that receives Health
          Connect data, and Health Connect data is never used for advertising
          and never sold.
        </P>
        <P>
          The full list of data types, permitted uses and revocation steps is
          set out in the{" "}
          <Link
            href="/health-data"
            className="font-semibold text-ember hover:underline"
          >
            Health Data Policy
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "analytics-cookies",
    heading: "Analytics, advertising and cookies",
    body: (
      <>
        <P>IGNYT contains no advertising and no behavioural tracking.</P>
        <List>
          <LI>No advertising SDKs and no ad identifiers.</LI>
          <LI>No third-party analytics or behavioural tracking SDKs.</LI>
          <LI>
            No sale, rental or sharing of your data with data brokers — under
            any circumstances.
          </LI>
          <LI>
            No cookies on this website. See the{" "}
            <Link
              href="/cookies"
              className="font-semibold text-ember hover:underline"
            >
              Cookie Policy
            </Link>{" "}
            for detail.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "storage-and-backup",
    heading: "Data storage and cloud backup",
    body: (
      <>
        <P>
          <Strong>Local storage is the default.</Strong> Your logs live in
          app-sandboxed storage on your device, which other applications cannot
          read.
        </P>
        <P>
          <Strong>Cloud Sync is opt-in and requires sign-in.</Strong> When
          enabled, your profile, settings, goals, workouts, routines, nutrition
          and hydration logs, body measurements, personal records and
          achievements are written to a private Cloud Firestore database keyed
          to your account. Security rules restrict every document to the single
          account that owns it.
        </P>
        <P>
          <Strong>Drive backup is opt-in.</Strong> Where enabled, a backup file
          is written to your own Google Drive. It is stored under your Google
          account, not ours.
        </P>
        <Note>
          Progress photographs are never uploaded by IGNYT. They remain in local
          device storage regardless of your sync settings.
        </Note>
      </>
    ),
  },
  {
    id: "third-parties",
    heading: "Third-party services",
    body: (
      <>
        <P>
          Where you opt in, IGNYT uses the following Google services. Your use
          of each is also governed by that service&rsquo;s own terms and privacy
          policy.
        </P>
        <List>
          <LI>
            <Strong>Google Play.</Strong> Distributes the app and handles
            installation and updates.
          </LI>
          <LI>
            <Strong>Google Sign-In.</Strong> Authenticates you, if you choose to
            sign in.
          </LI>
          <LI>
            <Strong>Firebase (Cloud Firestore).</Strong> Stores your synced data
            when Cloud Sync is enabled.
          </LI>
          <LI>
            <Strong>Google Drive.</Strong> Stores your backup file when Drive
            backup is enabled.
          </LI>
          <LI>
            <Strong>Android Health Connect.</Strong> Provides on-device access
            to health data you have permitted.
          </LI>
        </List>
        <P>
          We request the minimum access each feature needs, and every one of
          these connections is off by default. See{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ember hover:underline"
          >
            Google&rsquo;s Privacy Policy
          </a>
          .
        </P>
      </>
    ),
  },
  {
    id: "security",
    heading: "Security",
    body: (
      <>
        <List>
          <LI>
            Local data is held in app-sandboxed storage, isolated by Android
            from other applications.
          </LI>
          <LI>
            Cloud data is protected by your Google account&rsquo;s own access
            controls and by Firestore security rules that scope every document
            to a single user.
          </LI>
          <LI>All network traffic uses encrypted transport (HTTPS/TLS).</LI>
          <LI>
            This website is served over HTTPS with a strict Content Security
            Policy and no third-party scripts.
          </LI>
        </List>
        <P>
          No system is perfectly secure. If you believe you have found a
          vulnerability, please email{" "}
          <a
            href={`mailto:${site.email.privacy}`}
            className="font-semibold text-ember hover:underline"
          >
            {site.email.privacy}
          </a>{" "}
          rather than disclosing it publicly.
        </P>
      </>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights and controls",
    body: (
      <>
        <List>
          <LI>
            <Strong>Export.</Strong> Settings → Export Data produces a full JSON
            backup, or CSV files per data type, at any time.
          </LI>
          <LI>
            <Strong>Delete.</Strong> Settings → Danger Zone → Reset All App Data
            permanently erases local data on that device immediately. Account
            and cloud deletion are covered in the{" "}
            <Link
              href="/data-deletion"
              className="font-semibold text-ember hover:underline"
            >
              Data Deletion Policy
            </Link>
            .
          </LI>
          <LI>
            <Strong>Disconnect.</Strong> Sign out, or disconnect Health Connect
            or Cloud Sync independently, at any time in Settings. Disconnecting
            does not delete data already on your device.
          </LI>
          <LI>
            <Strong>Access and correction.</Strong> All of your data is visible
            and editable inside the app. You may also request a copy by email.
          </LI>
        </List>
        <P>
          Depending on where you live, you may have additional statutory rights
          — including access, rectification, erasure, restriction and
          portability. Email us and we will honour them.
        </P>
      </>
    ),
  },
  {
    id: "children",
    heading: "Children’s privacy",
    body: (
      <P>
        IGNYT is not directed at children under 13, and we do not knowingly
        collect data from them. If you believe a child has provided us with
        data, contact us and we will delete it.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <P>
        If this policy changes materially, the &ldquo;last updated&rdquo; date
        above will change and, where required, you will be notified in the app.
        Continued use after a change means you accept the revised policy.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <P>
        Questions about this policy, or about your data, go to{" "}
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

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={legalSchema("Privacy Policy", "/privacy")} />
      <LegalPage
        title="Privacy Policy"
        summary="IGNYT is local-first. Your training and nutrition data stays on your device unless you explicitly enable a feature that moves it — and you can export or erase all of it at any time."
        sections={sections}
        currentPath="/privacy"
      />
    </>
  );
}
