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
  title: "Data Deletion Policy",
  description:
    "How to delete your IGNYT data: erase everything on your device, delete your account and cloud backup, revoke Health Connect access, or request deletion by email.",
  path: "/data-deletion",
  ogType: "article",
  keywords: [
    "IGNYT delete account",
    "delete fitness app data",
    "account deletion request",
    "data deletion policy",
  ],
});

const sections: LegalSectionSpec[] = [
  {
    id: "overview",
    heading: "Overview",
    body: (
      <>
        <P>
          This page explains exactly how to delete data IGNYT holds, whether it
          is on your device or in optional cloud storage. It is the account and
          data deletion page required by Google Play.
        </P>
        <Note tone="ember">
          <Strong>Most IGNYT data never leaves your phone.</Strong> Unless you
          signed in and enabled Cloud Sync or Drive backup, deleting the app
          data on your device deletes everything there is.
        </Note>
      </>
    ),
  },
  {
    id: "delete-on-device",
    heading: "Delete everything on your device",
    body: (
      <>
        <P>Two ways, both immediate and irreversible:</P>
        <List ordered>
          <LI>
            <Strong>In the app.</Strong> Settings → Danger Zone → Reset All App
            Data. This erases all local data — workouts, nutrition logs, body
            measurements, progress photographs, goals, settings and reminder
            schedules — from that device.
          </LI>
          <LI>
            <Strong>Through Android.</Strong> Settings → Apps → IGNYT → Storage
            → Clear storage, or simply uninstall the app.
          </LI>
        </List>
        <Note tone="warn">
          Export first if you want a copy. Settings → Export Data produces a
          full JSON backup or CSV files per data type. Once deleted, local data
          cannot be recovered by us — we never had a copy.
        </Note>
      </>
    ),
  },
  {
    id: "delete-account",
    heading: "Delete your account and cloud data",
    body: (
      <>
        <P>
          If you signed in with Google and enabled Cloud Sync, a copy of your
          synced data exists in Cloud Firestore under your account. To delete
          it:
        </P>
        <List ordered>
          <LI>
            <Strong>In the app.</Strong> Settings → Account → Delete Account.
            This removes your cloud record and signs you out.
          </LI>
          <LI>
            <Strong>By email.</Strong> Send a request to{" "}
            <a
              href={`mailto:${site.email.privacy}?subject=Account%20and%20data%20deletion%20request`}
              className="font-semibold text-ember hover:underline"
            >
              {site.email.privacy}
            </a>{" "}
            from the Google account address you use with IGNYT, with the subject
            &ldquo;Account and data deletion request&rdquo;. We use the sending
            address to verify the request.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "what-is-deleted",
    heading: "What is deleted, and what is kept",
    body: (
      <>
        <P>
          <Strong>Deleted:</Strong>
        </P>
        <List>
          <LI>your account record and profile;</LI>
          <LI>
            all synced data — goals, settings, workouts, routines, nutrition and
            hydration logs, body measurements, personal records and
            achievements;
          </LI>
          <LI>the association between your Google account and IGNYT.</LI>
        </List>
        <P>
          <Strong>Not deleted by us, because we never hold it:</Strong>
        </P>
        <List>
          <LI>
            data on your device — you delete that yourself, as described above;
          </LI>
          <LI>
            Health Connect data — that belongs to Health Connect and to the apps
            that wrote it, not to IGNYT;
          </LI>
          <LI>
            backup files in your own Google Drive — delete those from Drive;
          </LI>
          <LI>
            your Google account itself, which is managed at{" "}
            <a
              href="https://myaccount.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ember hover:underline"
            >
              myaccount.google.com
            </a>
            .
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "timeline",
    heading: "How long deletion takes",
    body: (
      <>
        <List>
          <LI>
            <Strong>In-app deletion:</Strong> immediate.
          </LI>
          <LI>
            <Strong>Email requests:</Strong> acknowledged within 7 days and
            completed within 30 days of verification.
          </LI>
          <LI>
            <Strong>Backups:</Strong> residual copies in routine infrastructure
            backups are overwritten on their normal rotation, within 90 days of
            deletion. They are not accessible in the app or used for any
            purpose.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "health-connect",
    heading: "Revoking Health Connect access",
    body: (
      <>
        <P>
          Health Connect permissions are managed by Android, not by IGNYT.
          Revoke them at any time:
        </P>
        <List ordered>
          <LI>
            Open the Health Connect app, or Android Settings → Health Connect.
          </LI>
          <LI>Select App permissions → IGNYT.</LI>
          <LI>
            Turn off individual data types, or choose Remove all permissions.
          </LI>
        </List>
        <P>
          Revoking access stops IGNYT reading new data immediately. Details are
          in the{" "}
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
    id: "retention",
    heading: "Retention",
    body: (
      <P>
        We keep synced data only for as long as your account exists and Cloud
        Sync is enabled. There is no separate retention period, no archival copy
        for analytics, and no re-identification of deleted records. Support
        correspondence is kept only as long as needed to resolve the matter.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <P>
        Deletion requests and questions:{" "}
        <a
          href={`mailto:${site.email.privacy}?subject=Account%20and%20data%20deletion%20request`}
          className="font-semibold text-ember hover:underline"
        >
          {site.email.privacy}
        </a>
        . Please send from the account address you use with IGNYT.
      </P>
    ),
  },
];

export default function DataDeletionPage() {
  return (
    <>
      <JsonLd data={legalSchema("Data Deletion Policy", "/data-deletion")} />
      <LegalPage
        title="Data Deletion Policy"
        summary="How to erase your IGNYT data — on your device, in the cloud, or both. No retention tricks, no dark patterns, and an email route if the in-app option is not available to you."
        sections={sections}
        currentPath="/data-deletion"
      />
    </>
  );
}
