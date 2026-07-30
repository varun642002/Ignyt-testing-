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
  title: "Cookie Policy",
  description:
    "IGNYT's website sets no cookies and runs no third-party analytics. This policy explains what that means, what the app stores on your device instead, and how to clear it.",
  path: "/cookies",
  ogType: "article",
  keywords: ["IGNYT cookie policy", "no cookies website", "cookie free site"],
});

const sections: LegalSectionSpec[] = [
  {
    id: "summary",
    heading: "Summary",
    body: (
      <>
        <Note tone="ember">
          <Strong>This website sets no cookies.</Strong> There is no analytics
          cookie, no advertising cookie, no consent banner, and no third-party
          script that could set one. Nothing about your visit is stored in your
          browser by us.
        </Note>
        <P>
          Because we set no cookies at all, there is nothing for you to accept
          or reject — which is why you will not see a cookie banner on{" "}
          {site.domain}.
        </P>
      </>
    ),
  },
  {
    id: "what-cookies-are",
    heading: "What cookies are",
    body: (
      <P>
        A cookie is a small text file a website asks your browser to store, and
        which the browser sends back on later visits. Cookies are commonly used
        to keep you signed in, remember preferences, or — most often — to track
        behaviour across sites for advertising. Related technologies include
        local storage, session storage and tracking pixels.
      </P>
    ),
  },
  {
    id: "what-we-use",
    heading: "What this website uses",
    body: (
      <>
        <List>
          <LI>
            <Strong>Cookies:</Strong> none, of any kind — strictly necessary,
            functional, analytics or advertising.
          </LI>
          <LI>
            <Strong>Local or session storage:</Strong> none. The site is
            statically generated and stateless.
          </LI>
          <LI>
            <Strong>Third-party scripts:</Strong> none. No analytics provider,
            no tag manager, no advertising network, no social embeds, no chat
            widget.
          </LI>
          <LI>
            <Strong>Third-party fonts:</Strong> none loaded at runtime. Fonts
            are compiled into the site and served from our own origin, so no
            request ever reaches a font provider.
          </LI>
          <LI>
            <Strong>Tracking pixels or fingerprinting:</Strong> none.
          </LI>
        </List>
        <P>
          Our hosting provider processes standard server request logs (such as
          IP address and user agent) for security and abuse prevention, as any
          web server must. Those logs are not used to profile you and are not
          combined with app data.
        </P>
      </>
    ),
  },
  {
    id: "in-the-app",
    heading: "What the app stores on your device",
    body: (
      <>
        <P>
          The IGNYT Android app does not use cookies. It uses ordinary
          app-sandboxed device storage — the mechanism every Android app uses —
          to hold the data that makes it work offline:
        </P>
        <List>
          <LI>your workouts, meals, measurements and other logged data;</LI>
          <LI>the bundled food database and exercise library;</LI>
          <LI>your settings, targets, theme and unit preferences;</LI>
          <LI>reminder schedules, so notifications fire without a server.</LI>
        </List>
        <P>
          None of this is shared with third parties, and none of it is used for
          tracking. It is covered in full by the{" "}
          <Link
            href="/privacy"
            className="font-semibold text-ember hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "third-party-cookies",
    heading: "Third-party cookies",
    body: (
      <P>
        If you follow a link from this site to Google Play, Google Sign-In or
        any other external service, that service may set its own cookies once
        you are on its pages. We have no control over those and they are
        governed by that provider&rsquo;s own cookie and privacy policies.
      </P>
    ),
  },
  {
    id: "clearing-data",
    heading: "Clearing stored data",
    body: (
      <>
        <List>
          <LI>
            <Strong>This website:</Strong> nothing to clear — we store nothing.
          </LI>
          <LI>
            <Strong>The app:</Strong> Settings → Danger Zone → Reset All App
            Data erases local data immediately. Uninstalling removes it as well.
          </LI>
          <LI>
            <Strong>Cloud data:</Strong> see the{" "}
            <Link
              href="/data-deletion"
              className="font-semibold text-ember hover:underline"
            >
              Data Deletion Policy
            </Link>
            .
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <P>
        If we ever introduce a cookie — for example a strictly necessary cookie
        to support a new feature — this policy will be updated first, the
        &ldquo;last updated&rdquo; date will change, and where the law requires
        it we will ask for your consent before setting anything.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <P>
        Questions about this policy:{" "}
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

export default function CookiesPage() {
  return (
    <>
      <JsonLd data={legalSchema("Cookie Policy", "/cookies")} />
      <LegalPage
        title="Cookie Policy"
        summary="The shortest policy on this site: we do not set cookies, we run no analytics, and we load nothing from third-party servers."
        sections={sections}
        currentPath="/cookies"
      />
    </>
  );
}
