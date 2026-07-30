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
  title: "Privacy Policy",
  description:
    "How IGNYT collects, uses, stores and protects your information: account and profile data, workouts, nutrition, body measurements, Health Connect, payments, analytics, your rights and account deletion.",
  path: "/privacy",
  ogType: "article",
  keywords: [
    "IGNYT privacy policy",
    "fitness app privacy",
    "health data privacy",
    "Health Connect privacy",
  ],
});

/** Google's own documentation, cited where the policy relies on it. */
const HEALTH_CONNECT_POLICY =
  "https://support.google.com/googleplay/android-developer/answer/16558241";
const HEALTH_CONNECT_PERMISSIONS =
  "https://support.google.com/android/answer/13770320";

function Ref({ href }: { href: string }) {
  return (
    <>
      {" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-semibold text-pulse-strong hover:underline"
      >
        (Google Help)
      </a>
    </>
  );
}

const sections: LegalSectionSpec[] = [
  {
    id: "about-ignyt",
    heading: "About IGNYT",
    body: (
      <>
        <P>
          Welcome to IGNYT (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or
          &ldquo;us&rdquo;). Your privacy is important to us. This Privacy
          Policy explains how IGNYT collects, uses, stores, protects and
          processes your information when you use the IGNYT mobile application
          and related services. By using IGNYT, you agree to the practices
          described in this Privacy Policy.
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
          <LI>Track supplements</LI>
          <LI>View fitness progress</LI>
          <LI>Connect with Google Health Connect</LI>
          <LI>Synchronise health information (with permission)</LI>
          <LI>Access premium fitness features</LI>
        </List>
        <Note tone="warn">
          IGNYT is intended for personal fitness tracking only and is{" "}
          <Strong>not a medical device</Strong>.
        </Note>
      </>
    ),
  },
  {
    id: "information-we-collect",
    heading: "Information we collect",
    body: (
      <>
        <P>
          Depending on the features you use, IGNYT may collect the following
          information.
        </P>

        <P>
          <Strong>Account information.</Strong> When you create an account, we
          may collect:
        </P>
        <List>
          <LI>Name</LI>
          <LI>Email address</LI>
          <LI>Phone number (if using phone authentication)</LI>
          <LI>Profile photo (Google Sign-In only)</LI>
          <LI>Firebase User ID</LI>
        </List>

        <P>
          <Strong>Profile information.</Strong> You may choose to provide age,
          gender, height, weight, fitness goals and activity level. Providing
          this information is optional unless required for specific features.
        </P>

        <P>
          <Strong>Workout information.</Strong> IGNYT allows you to store
          exercises, sets, repetitions, weight lifted, workout duration, rest
          time, workout history and notes.
        </P>

        <P>
          <Strong>Nutrition information.</Strong> You may log meals, calories,
          protein, carbohydrates, fat, fibre, water intake, vitamins and
          supplements.
        </P>

        <P>
          <Strong>Body measurements.</Strong> You may record weight, body fat,
          BMI, waist, chest, arms, hips, legs and progress photos (if enabled).
        </P>
      </>
    ),
  },
  {
    id: "health-connect-data",
    heading: "Health Connect data",
    body: (
      <>
        <P>
          IGNYT may request permission to read and/or write selected health and
          fitness data through Google Health Connect. Depending on the
          permissions you grant, IGNYT may access:
        </P>
        <List>
          <LI>Weight</LI>
          <LI>Calories burned</LI>
          <LI>Exercise sessions</LI>
          <LI>Steps</LI>
          <LI>Distance</LI>
          <LI>Active energy</LI>
          <LI>Hydration</LI>
          <LI>Sleep (if supported)</LI>
          <LI>Heart rate (if supported)</LI>
        </List>
        <P>
          IGNYT only accesses the specific data types that are required for the
          features you choose to use. Health Connect permissions are granted and
          managed entirely by you.
          <Ref href={HEALTH_CONNECT_POLICY} />
        </P>
      </>
    ),
  },
  {
    id: "how-we-use-your-information",
    heading: "How we use your information",
    body: (
      <>
        <P>Your information is used to:</P>
        <List>
          <LI>Create your account</LI>
          <LI>Authenticate your identity</LI>
          <LI>Save workouts</LI>
          <LI>Display fitness statistics</LI>
          <LI>Track progress</LI>
          <LI>Calculate nutrition</LI>
          <LI>Display charts</LI>
          <LI>Sync Health Connect data</LI>
          <LI>Restore backups</LI>
          <LI>Improve app performance</LI>
          <LI>Provide customer support</LI>
          <LI>Process subscriptions</LI>
        </List>
        <Note tone="ember">
          <Strong>We do not sell your personal information.</Strong>
        </Note>
      </>
    ),
  },
  {
    id: "health-data",
    heading: "Health data",
    body: (
      <>
        <P>Health and fitness information is considered sensitive.</P>
        <P>
          IGNYT uses Health Connect data only to provide the health and fitness
          features requested by you. We do not use your health information for:
        </P>
        <List>
          <LI>Advertising</LI>
          <LI>Marketing</LI>
          <LI>User profiling</LI>
          <LI>Selling to third parties</LI>
        </List>
        <P>
          Health data is processed only for the fitness features available
          inside the application.
          <Ref href={HEALTH_CONNECT_POLICY} />
        </P>
      </>
    ),
  },
  {
    id: "google-sign-in",
    heading: "Google Sign-In",
    body: (
      <>
        <P>If you sign in with Google, we may receive:</P>
        <List>
          <LI>Name</LI>
          <LI>Email address</LI>
          <LI>Profile picture</LI>
        </List>
        <P>
          <Strong>We do not receive your Google password.</Strong>{" "}
          Authentication is handled securely by Google and Firebase.
        </P>
      </>
    ),
  },
  {
    id: "firebase-authentication",
    heading: "Firebase Authentication",
    body: (
      <>
        <P>
          IGNYT uses Firebase Authentication for secure login. Supported methods
          include:
        </P>
        <List>
          <LI>Google Sign-In</LI>
          <LI>Email &amp; password</LI>
          <LI>Phone number authentication</LI>
        </List>
        <P>Firebase securely manages authentication credentials.</P>
      </>
    ),
  },
  {
    id: "payments",
    heading: "Payments",
    body: (
      <>
        <P>
          Premium subscriptions are processed through Google Play Billing. IGNYT
          does not receive or store:
        </P>
        <List>
          <LI>Credit card numbers</LI>
          <LI>Debit card numbers</LI>
          <LI>UPI credentials</LI>
          <LI>Banking information</LI>
        </List>
        <P>Payment processing is handled by Google Play.</P>
      </>
    ),
  },
  {
    id: "analytics",
    heading: "Analytics",
    body: (
      <>
        <P>
          To improve IGNYT, we may collect anonymous technical information such
          as:
        </P>
        <List>
          <LI>App version</LI>
          <LI>Android version</LI>
          <LI>Device model</LI>
          <LI>Crash reports</LI>
          <LI>Performance metrics</LI>
        </List>
        <P>
          This information does not include your workout history or personal
          health data unless required for troubleshooting, and only where
          permitted.
        </P>
      </>
    ),
  },
  {
    id: "data-storage",
    heading: "Data storage",
    body: (
      <>
        <P>Your data may be stored:</P>
        <List>
          <LI>On your device</LI>
          <LI>In secure Firebase services (where applicable)</LI>
        </List>
        <P>
          We implement reasonable technical and organisational measures to
          protect your information.
        </P>
      </>
    ),
  },
  {
    id: "data-sharing",
    heading: "Data sharing",
    body: (
      <>
        <P>IGNYT does not sell or rent your personal information.</P>
        <P>Information may only be shared:</P>
        <List>
          <LI>With Google Firebase for authentication and app functionality</LI>
          <LI>With Google Play for subscription processing</LI>
          <LI>When required by law</LI>
          <LI>To protect legal rights or prevent fraud</LI>
        </List>
      </>
    ),
  },
  {
    id: "data-security",
    heading: "Data security",
    body: (
      <>
        <P>We use industry-standard security practices including:</P>
        <List>
          <LI>HTTPS encryption</LI>
          <LI>Secure authentication</LI>
          <LI>Firebase security</LI>
          <LI>Access controls</LI>
          <LI>Secure cloud infrastructure</LI>
        </List>
        <P>
          While we strive to protect your information, no system can guarantee
          absolute security.
        </P>
      </>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights",
    body: (
      <>
        <P>You may:</P>
        <List>
          <LI>Update your profile</LI>
          <LI>Change your password</LI>
          <LI>Delete workouts</LI>
          <LI>Delete nutrition logs</LI>
          <LI>Delete body measurements</LI>
          <LI>Disconnect Health Connect</LI>
          <LI>Revoke Google permissions</LI>
          <LI>Request account deletion</LI>
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
        <P>When an account is deleted:</P>
        <List>
          <LI>
            Personal profile information is removed or anonymised, subject to
            applicable legal or operational requirements.
          </LI>
          <LI>
            Stored fitness data associated with the account is deleted according
            to our retention practices.
          </LI>
          <LI>
            Health Connect permissions can be revoked from your device settings,
            and Health Connect data remains under your control.
            <Ref href={HEALTH_CONNECT_PERMISSIONS} />
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
    id: "childrens-privacy",
    heading: "Children’s privacy",
    body: (
      <P>
        IGNYT is not intended for children under the age required by applicable
        law in their jurisdiction. We do not knowingly collect personal
        information from children.
      </P>
    ),
  },
  {
    id: "third-party-services",
    heading: "Third-party services",
    body: (
      <>
        <P>IGNYT may use services including:</P>
        <List>
          <LI>Firebase Authentication</LI>
          <LI>Google Play Billing</LI>
          <LI>Google Health Connect</LI>
          <LI>Google Sign-In</LI>
        </List>
        <P>
          Each third-party service has its own privacy policy. See{" "}
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
    id: "international-users",
    heading: "International users",
    body: (
      <P>
        If you use IGNYT outside India, your information may be processed in
        countries where our service providers operate, subject to applicable
        legal safeguards.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <P>
        We may update this Privacy Policy periodically. The updated version will
        display a new &ldquo;Last updated&rdquo; date. Continued use of IGNYT
        after changes means you accept the revised policy.
      </P>
    ),
  },
  {
    id: "contact-us",
    heading: "Contact us",
    body: (
      <>
        <P>
          If you have questions regarding this Privacy Policy, please contact:
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
    id: "summary",
    heading: "Summary",
    body: (
      <>
        <P>By using IGNYT you understand that:</P>
        <List>
          <LI>Your data is used to provide fitness tracking features.</LI>
          <LI>
            Health Connect data is accessed only with your permission and only
            for supported fitness functionality.
          </LI>
          <LI>We do not sell your personal or health information.</LI>
          <LI>
            You can revoke permissions and request account deletion at any time.
            <Ref href={HEALTH_CONNECT_POLICY} />
          </LI>
        </List>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={legalSchema("Privacy Policy", "/privacy")} />
      <LegalPage
        title="Privacy Policy"
        summary="How IGNYT collects, uses, stores, protects and processes your information when you use the IGNYT mobile application and related services. By using IGNYT, you agree to the practices described here."
        sections={sections}
        currentPath="/privacy"
      />
    </>
  );
}
