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
  title: "Terms & Conditions",
  description:
    "The terms governing your use of the IGNYT Android application and this website: licence, acceptable use, accounts, disclaimers, liability and termination.",
  path: "/terms",
  ogType: "article",
  keywords: ["IGNYT terms", "terms and conditions", "fitness app terms of use"],
});

const sections: LegalSectionSpec[] = [
  {
    id: "acceptance",
    heading: "Acceptance of these terms",
    body: (
      <>
        <P>
          These Terms &amp; Conditions govern your use of the IGNYT Android
          application (package <Strong>{site.androidPackage}</Strong>) and this
          website. By installing, accessing or using either, you agree to them.
          If you do not agree, do not use IGNYT.
        </P>
        <P>
          These terms should be read together with the{" "}
          <Link
            href="/privacy"
            className="font-semibold text-ember hover:underline"
          >
            Privacy Policy
          </Link>
          ,{" "}
          <Link
            href="/health-data"
            className="font-semibold text-ember hover:underline"
          >
            Health Data Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/disclaimer"
            className="font-semibold text-ember hover:underline"
          >
            Disclaimer
          </Link>
          , each of which forms part of this agreement.
        </P>
      </>
    ),
  },
  {
    id: "eligibility",
    heading: "Eligibility",
    body: (
      <P>
        You must be at least 13 years old to use IGNYT. If you are under the age
        of majority where you live, you may use IGNYT only with the consent and
        supervision of a parent or guardian who accepts these terms on your
        behalf.
      </P>
    ),
  },
  {
    id: "licence",
    heading: "Licence to use IGNYT",
    body: (
      <>
        <P>
          Subject to these terms, you are granted a personal, non-exclusive,
          non-transferable, revocable licence to install and use IGNYT on
          devices you own or control, for your own non-commercial use.
        </P>
        <P>You may not:</P>
        <List>
          <LI>
            copy, sell, sublicense, rent or otherwise distribute the app or any
            part of it;
          </LI>
          <LI>
            reverse engineer, decompile or disassemble the app, except to the
            extent that applicable law expressly permits it;
          </LI>
          <LI>
            remove or obscure any proprietary notice, branding or attribution;
          </LI>
          <LI>
            use the app to build a competing product, or to scrape or extract
            its bundled datasets for redistribution;
          </LI>
          <LI>
            circumvent, disable or interfere with any security or access control
            feature.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "Accounts",
    body: (
      <>
        <P>
          An account is optional. IGNYT is fully usable without one; signing in
          with Google exists only to enable cloud backup and multi-device sync.
        </P>
        <List>
          <LI>
            You are responsible for maintaining the security of the Google
            account you sign in with.
          </LI>
          <LI>
            You are responsible for the accuracy of the information you enter,
            including bodyweight, height and goals — these drive the targets the
            app calculates.
          </LI>
          <LI>
            We may suspend or terminate access to cloud features for accounts
            used in breach of these terms.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "your-content",
    heading: "Your data and content",
    body: (
      <>
        <P>
          <Strong>You own your data.</Strong> Workouts, meals, measurements,
          photographs and notes you enter remain yours. We claim no ownership
          over them.
        </P>
        <P>
          Where you enable Cloud Sync, you grant us the limited technical
          permission required to store, transmit and restore that data on your
          behalf — nothing more. We do not use your content for advertising, for
          training models, or for any purpose other than delivering the feature
          you enabled.
        </P>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <P>You agree not to use IGNYT to:</P>
        <List>
          <LI>break any applicable law or regulation;</LI>
          <LI>
            upload unlawful, infringing or malicious content through any feature
            that accepts input;
          </LI>
          <LI>
            attempt to gain unauthorised access to another user&rsquo;s data or
            to our infrastructure;
          </LI>
          <LI>
            interfere with, overload or disrupt the service or the networks it
            relies on.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "health-disclaimer",
    heading: "Health and fitness disclaimer",
    body: (
      <>
        <Note tone="warn">
          <Strong>IGNYT is not a medical device.</Strong> It does not diagnose,
          treat, cure or prevent any disease, and nothing it displays is medical
          advice. Always consult a qualified healthcare professional before
          starting a training programme, changing your diet, beginning a fast or
          taking a supplement.
        </Note>
        <P>
          Calorie targets, macro targets, one-rep-max estimates and similar
          figures are calculated from standard formulae and the information you
          supply. They are estimates, and they may be wrong for you. You are
          responsible for the training and dietary decisions you make. The full
          text is in the{" "}
          <Link
            href="/disclaimer"
            className="font-semibold text-ember hover:underline"
          >
            Disclaimer
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "availability",
    heading: "Availability and changes",
    body: (
      <>
        <P>
          IGNYT&rsquo;s core features work offline and do not depend on our
          infrastructure. Optional cloud features may be unavailable from time
          to time due to maintenance, third-party outages or factors outside our
          control, and are provided without any uptime guarantee.
        </P>
        <P>
          We may add, change or remove features, and may update these terms.
          Material changes to these terms will be reflected in the &ldquo;last
          updated&rdquo; date, and continued use after that date constitutes
          acceptance.
        </P>
      </>
    ),
  },
  {
    id: "intellectual-property",
    heading: "Intellectual property",
    body: (
      <P>
        The IGNYT name, logo, application, website, design and bundled datasets
        are protected by intellectual property law and remain the property of
        their owner. Nothing in these terms transfers any such right to you
        beyond the limited licence described above.
      </P>
    ),
  },
  {
    id: "third-party-services",
    heading: "Third-party services",
    body: (
      <P>
        IGNYT integrates with Google Play, Google Sign-In, Firebase, Google
        Drive and Android Health Connect. Your use of those services is governed
        by their own terms. We are not responsible for third-party services, and
        their availability is outside our control.
      </P>
    ),
  },
  {
    id: "warranty",
    heading: "No warranty",
    body: (
      <P>
        To the fullest extent permitted by law, IGNYT is provided &ldquo;as
        is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
        kind, whether express or implied, including implied warranties of
        merchantability, fitness for a particular purpose, accuracy and
        non-infringement. We do not warrant that the app will be uninterrupted,
        error-free, or that any calculated figure is accurate for your body.
      </P>
    ),
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    body: (
      <>
        <P>
          To the fullest extent permitted by law, we are not liable for any
          indirect, incidental, special, consequential or punitive damages, or
          for any loss of data, profits, revenue or goodwill, arising out of or
          in connection with your use of IGNYT — including injury, illness or
          adverse health outcomes resulting from training, dietary,
          supplementation or fasting decisions you make.
        </P>
        <P>
          Nothing in these terms excludes or limits liability that cannot
          lawfully be excluded or limited, including liability for death or
          personal injury caused by negligence, or for fraud.
        </P>
      </>
    ),
  },
  {
    id: "termination",
    heading: "Termination",
    body: (
      <P>
        You may stop using IGNYT at any time by uninstalling it. Deleting your
        account and cloud data is described in the{" "}
        <Link
          href="/data-deletion"
          className="font-semibold text-ember hover:underline"
        >
          Data Deletion Policy
        </Link>
        . We may suspend or terminate access to optional cloud features if these
        terms are breached. Provisions on intellectual property, disclaimers and
        liability survive termination.
      </P>
    ),
  },
  {
    id: "governing-law",
    heading: "Governing law",
    body: (
      <P>
        These terms are governed by the laws of India, without regard to
        conflict-of-law rules, and the courts of India shall have jurisdiction —
        except where mandatory consumer protection law in your country of
        residence grants you the right to bring proceedings locally.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <P>
        Questions about these terms:{" "}
        <a
          href={`mailto:${site.email.support}`}
          className="font-semibold text-ember hover:underline"
        >
          {site.email.support}
        </a>
        .
      </P>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={legalSchema("Terms & Conditions", "/terms")} />
      <LegalPage
        title="Terms & Conditions"
        summary="The agreement between you and IGNYT covering how the app may be used, what it does and does not promise, and where responsibility sits."
        sections={sections}
        currentPath="/terms"
      />
    </>
  );
}
