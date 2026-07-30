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
    "The terms governing your access to and use of the IGNYT mobile application, website and related services: eligibility, accounts, acceptable use, health disclaimer, subscriptions, liability and governing law.",
  path: "/terms",
  ogType: "article",
  keywords: [
    "IGNYT terms",
    "terms and conditions",
    "fitness app terms of use",
    "IGNYT subscription terms",
  ],
});

const sections: LegalSectionSpec[] = [
  {
    id: "about-ignyt",
    heading: "About IGNYT",
    body: (
      <>
        <P>
          Welcome to IGNYT. These Terms and Conditions (&ldquo;Terms&rdquo;)
          govern your access to and use of the IGNYT mobile application, website
          and related services. By downloading, accessing or using IGNYT, you
          agree to be bound by these Terms. If you do not agree with these
          Terms, please do not use the application.
        </P>
        <P>
          IGNYT is a fitness and wellness application designed to help users:
        </P>
        <List>
          <LI>Track workouts</LI>
          <LI>Log nutrition and calories</LI>
          <LI>Monitor body weight</LI>
          <LI>Record hydration</LI>
          <LI>Track fasting</LI>
          <LI>Monitor supplements</LI>
          <LI>View fitness progress</LI>
          <LI>Connect with Google Health Connect</LI>
          <LI>Access premium fitness features</LI>
        </List>
        <Note tone="warn">
          IGNYT is intended solely for personal fitness and wellness purposes
          and is <Strong>not a medical device</Strong>.
        </Note>
      </>
    ),
  },
  {
    id: "eligibility",
    heading: "Eligibility",
    body: (
      <P>
        You must be at least the minimum age required by the laws of your
        country to use IGNYT. If you are under the applicable age, you may use
        the application only with the consent and supervision of a parent or
        legal guardian.
      </P>
    ),
  },
  {
    id: "user-accounts",
    heading: "User accounts",
    body: (
      <>
        <P>
          To access certain features, you may need to create an account. You
          agree to:
        </P>
        <List>
          <LI>Provide accurate and complete information.</LI>
          <LI>Keep your login credentials secure.</LI>
          <LI>Be responsible for all activity under your account.</LI>
          <LI>
            Notify us immediately if you believe your account has been accessed
            without authorisation.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <P>You agree not to:</P>
        <List>
          <LI>Use IGNYT for any unlawful purpose.</LI>
          <LI>Attempt to gain unauthorised access to our systems.</LI>
          <LI>
            Reverse engineer, decompile or modify the application except where
            permitted by law.
          </LI>
          <LI>Upload malicious software or harmful content.</LI>
          <LI>Interfere with the operation or security of the application.</LI>
        </List>
      </>
    ),
  },
  {
    id: "health-disclaimer",
    heading: "Health disclaimer",
    body: (
      <>
        <P>
          IGNYT is intended to assist with personal fitness tracking and
          wellness. The information provided by IGNYT:
        </P>
        <List>
          <LI>Is for informational purposes only.</LI>
          <LI>Does not constitute medical advice.</LI>
          <LI>
            Does not replace consultation with a qualified healthcare
            professional.
          </LI>
          <LI>
            Should not be relied upon for diagnosing, treating, curing or
            preventing any medical condition.
          </LI>
        </List>
        <Note tone="warn">
          Always consult a qualified healthcare provider before beginning any
          exercise, diet or wellness programme. Further detail is in the{" "}
          <Link
            href="/disclaimer"
            className="font-semibold text-ember hover:underline"
          >
            Disclaimer
          </Link>
          .
        </Note>
      </>
    ),
  },
  {
    id: "health-connect-integration",
    heading: "Health Connect integration",
    body: (
      <>
        <P>IGNYT may integrate with Google Health Connect.</P>
        <P>
          Health data is accessed only with your explicit permission. You may
          revoke Health Connect permissions at any time through your device
          settings. IGNYT only accesses the health data necessary to provide the
          features you choose to use.
        </P>
        <P>
          The data types involved are listed in the{" "}
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
    id: "premium-features-and-payments",
    heading: "Premium features and payments",
    body: (
      <>
        <P>
          IGNYT may offer premium subscriptions through Google Play Billing. By
          purchasing a subscription:
        </P>
        <List>
          <LI>
            You authorise Google Play to charge your selected payment method.
          </LI>
          <LI>Subscription billing and renewals are managed by Google Play.</LI>
          <LI>Prices may change in accordance with Google Play policies.</LI>
          <LI>
            Refund requests are handled according to Google Play&rsquo;s refund
            policies.
          </LI>
        </List>
        <P>
          <Strong>
            IGNYT does not store your payment card or banking information.
          </Strong>
        </P>
      </>
    ),
  },
  {
    id: "intellectual-property",
    heading: "Intellectual property",
    body: (
      <>
        <P>All content within IGNYT, including but not limited to:</P>
        <List>
          <LI>Logos</LI>
          <LI>Branding</LI>
          <LI>Design</LI>
          <LI>Icons</LI>
          <LI>Graphics</LI>
          <LI>Source code</LI>
          <LI>Databases</LI>
          <LI>Text</LI>
          <LI>Images</LI>
          <LI>Features</LI>
        </List>
        <P>
          is owned by IGNYT or its licensors and is protected by applicable
          intellectual property laws. You may not reproduce, distribute, modify
          or create derivative works without prior written permission.
        </P>
      </>
    ),
  },
  {
    id: "user-content",
    heading: "User content",
    body: (
      <P>
        You retain ownership of the information you enter into IGNYT, including
        workout logs, nutrition entries and personal fitness data. You grant
        IGNYT a limited licence to process this information solely for providing
        the application&rsquo;s services.
      </P>
    ),
  },
  {
    id: "privacy",
    heading: "Privacy",
    body: (
      <P>
        Your use of IGNYT is also governed by our{" "}
        <Link
          href="/privacy"
          className="font-semibold text-ember hover:underline"
        >
          Privacy Policy
        </Link>
        . Please review it to understand how your information is collected, used
        and protected.
      </P>
    ),
  },
  {
    id: "service-availability",
    heading: "Service availability",
    body: (
      <>
        <P>
          We strive to keep IGNYT available at all times; however, we do not
          guarantee uninterrupted or error-free operation. We may temporarily
          suspend access for:
        </P>
        <List>
          <LI>Maintenance</LI>
          <LI>Security updates</LI>
          <LI>Technical improvements</LI>
          <LI>Emergency fixes</LI>
        </List>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    heading: "Limitation of liability",
    body: (
      <P>
        To the fullest extent permitted by applicable law, IGNYT and its
        developers shall not be liable for any indirect, incidental, special,
        consequential or punitive damages arising from your use of the
        application. Your use of IGNYT is at your own risk.
      </P>
    ),
  },
  {
    id: "disclaimer-of-warranties",
    heading: "Disclaimer of warranties",
    body: (
      <>
        <P>
          IGNYT is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis. We make no warranties regarding:
        </P>
        <List>
          <LI>Accuracy of fitness calculations</LI>
          <LI>Continuous availability</LI>
          <LI>Compatibility with all devices</LI>
          <LI>Error-free operation</LI>
          <LI>Fitness results</LI>
        </List>
      </>
    ),
  },
  {
    id: "suspension-or-termination",
    heading: "Account suspension or termination",
    body: (
      <>
        <P>We reserve the right to suspend or terminate accounts that:</P>
        <List>
          <LI>Violate these Terms.</LI>
          <LI>Engage in fraudulent activity.</LI>
          <LI>Misuse the application.</LI>
          <LI>Attempt to compromise the security or integrity of IGNYT.</LI>
        </List>
      </>
    ),
  },
  {
    id: "account-deletion",
    heading: "Account deletion",
    body: (
      <>
        <P>You may delete your account at any time.</P>
        <P>Upon account deletion:</P>
        <List>
          <LI>
            Personal account information will be deleted or anonymised in
            accordance with our data retention practices.
          </LI>
          <LI>
            Any remaining obligations required by law may continue to apply.
          </LI>
        </List>
        <P>
          Step-by-step instructions are in the{" "}
          <Link
            href="/data-deletion"
            className="font-semibold text-ember hover:underline"
          >
            Data Deletion Policy
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "third-party-services",
    heading: "Third-party services",
    body: (
      <>
        <P>IGNYT relies on third-party services including:</P>
        <List>
          <LI>Firebase Authentication</LI>
          <LI>Google Sign-In</LI>
          <LI>Google Play Billing</LI>
          <LI>Google Health Connect</LI>
        </List>
        <P>
          Your use of these services is also subject to their respective terms
          and policies.
        </P>
      </>
    ),
  },
  {
    id: "updates-to-the-application",
    heading: "Updates to the application",
    body: (
      <>
        <P>We may update IGNYT periodically to:</P>
        <List>
          <LI>Add features</LI>
          <LI>Improve security</LI>
          <LI>Fix bugs</LI>
          <LI>Enhance performance</LI>
          <LI>Comply with legal requirements</LI>
        </List>
        <P>
          Some updates may be required for continued use of the application.
        </P>
      </>
    ),
  },
  {
    id: "changes-to-these-terms",
    heading: "Changes to these Terms",
    body: (
      <P>
        We may modify these Terms from time to time. The updated version will be
        published on this page with a revised &ldquo;Last updated&rdquo; date.
        Continued use of IGNYT after changes become effective constitutes your
        acceptance of the updated Terms.
      </P>
    ),
  },
  {
    id: "governing-law",
    heading: "Governing law",
    body: (
      <P>
        These Terms shall be governed by and interpreted in accordance with the
        laws of India, without regard to its conflict of law principles. Any
        disputes arising from these Terms shall be subject to the exclusive
        jurisdiction of the competent courts in India.
      </P>
    ),
  },
  {
    id: "contact-us",
    heading: "Contact us",
    body: (
      <>
        <P>
          If you have any questions regarding these Terms and Conditions, please
          contact us:
        </P>
        <P>
          <Strong>IGNYT Support</Strong>
          <br />
          Email:{" "}
          <a
            href={`mailto:${site.email.support}`}
            className="font-semibold text-ember hover:underline"
          >
            {site.email.support}
          </a>
          <br />
          Website:{" "}
          <a
            href={site.url}
            className="font-semibold text-ember hover:underline"
          >
            {site.url}
          </a>
        </P>
      </>
    ),
  },
  {
    id: "acceptance",
    heading: "Acceptance",
    body: (
      <Note tone="ember">
        By downloading, installing or using IGNYT, you acknowledge that you have
        read, understood and agree to be bound by these Terms and Conditions.
      </Note>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={legalSchema("Terms & Conditions", "/terms")} />
      <LegalPage
        title="Terms & Conditions"
        summary="These Terms govern your access to and use of the IGNYT mobile application, website and related services. By downloading, accessing or using IGNYT, you agree to be bound by them."
        sections={sections}
        currentPath="/terms"
      />
    </>
  );
}
