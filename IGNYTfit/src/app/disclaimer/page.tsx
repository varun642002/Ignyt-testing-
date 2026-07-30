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
  title: "Disclaimer",
  description:
    "Medical, fitness, nutrition and supplement disclaimers for IGNYT, plus the limits of our liability. IGNYT is not a medical device and does not provide medical advice.",
  path: "/disclaimer",
  ogType: "article",
  keywords: [
    "IGNYT disclaimer",
    "fitness app medical disclaimer",
    "nutrition disclaimer",
    "supplement disclaimer",
  ],
});

const sections: LegalSectionSpec[] = [
  {
    id: "general",
    heading: "General disclaimer",
    body: (
      <>
        <Note tone="warn">
          <Strong>IGNYT is a tracking tool, not a healthcare provider.</Strong>{" "}
          Everything the app displays — targets, estimates, charts and
          suggestions — is informational. It is not a substitute for
          professional medical, nutritional or fitness advice, diagnosis or
          treatment.
        </Note>
        <P>
          Always seek the advice of a qualified physician or other suitably
          qualified professional with any question about a medical condition,
          your diet, or an exercise programme. Never disregard professional
          advice, or delay seeking it, because of something you read in IGNYT or
          on this website.
        </P>
        <P>
          <Strong>
            If you think you are having a medical emergency, call your local
            emergency number immediately.
          </Strong>
        </P>
      </>
    ),
  },
  {
    id: "medical",
    heading: "Medical disclaimer",
    body: (
      <>
        <List>
          <LI>
            IGNYT is <Strong>not a medical device</Strong>. It is not intended
            to diagnose, treat, cure, mitigate or prevent any disease or
            condition.
          </LI>
          <LI>
            Health values shown in the app — steps, heart rate, sleep, blood
            oxygen, blood pressure, body composition and similar — are read from
            Android Health Connect and originate from your own devices and apps.
            Their accuracy is determined by those devices, not by IGNYT.
          </LI>
          <LI>
            Blood work, medical report and health record features are storage
            and organisation tools. IGNYT does not interpret results and does
            not provide clinical guidance.
          </LI>
          <LI>
            Consult a doctor before starting any programme if you are pregnant
            or breastfeeding, are under 18, have a chronic condition, take
            prescription medication, or have a history of cardiovascular,
            metabolic or musculoskeletal problems.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "fitness",
    heading: "Fitness and exercise disclaimer",
    body: (
      <>
        <P>
          Physical exercise carries inherent risk, including the risk of serious
          injury. By using IGNYT you accept that risk and take full
          responsibility for your training decisions.
        </P>
        <List>
          <LI>
            Routines, exercises, technique notes and rest timers in IGNYT are
            general information. They are not a personalised programme
            prescribed for your body, injury history or experience level.
          </LI>
          <LI>
            Estimated one-rep-max figures and volume calculations are derived
            from standard formulae applied to the numbers you enter. Treat them
            as rough guides, never as a target to chase at the expense of form.
          </LI>
          <LI>
            Stop immediately and seek medical attention if you experience chest
            pain, dizziness, shortness of breath, faintness, or pain that is not
            ordinary training discomfort.
          </LI>
          <LI>
            If you are new to training, work with a qualified coach before
            loading heavy compound movements.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "nutrition",
    heading: "Nutrition disclaimer",
    body: (
      <>
        <List>
          <LI>
            Calorie, macronutrient and micronutrient targets are calculated from
            standard equations using the profile data you supply. Individual
            requirements vary with genetics, medical conditions, medication,
            training load and much else.
          </LI>
          <LI>
            The bundled food database is compiled from public and published
            nutrition sources and is curated for quality, but values are typical
            figures rather than laboratory measurements of the specific item you
            ate. Packaged product values may change without notice.
          </LI>
          <LI>
            Barcode results, user-created foods and imported entries are only as
            accurate as their source.
          </LI>
          <LI>
            Fasting is not appropriate for everyone. Do not fast if you are
            pregnant or breastfeeding, are under 18, have a history of
            disordered eating, are diabetic, or take medication that requires
            food — without medical supervision.
          </LI>
          <LI>
            If you have or suspect an eating disorder, calorie tracking may be
            harmful. Please speak to a healthcare professional before using
            these features.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "supplements",
    heading: "Supplement disclaimer",
    body: (
      <>
        <List>
          <LI>
            The supplement tracker is a <Strong>logging tool only</Strong>. It
            records what you have chosen to take. It does not recommend
            supplements, doses or timings, and listing a supplement is not an
            endorsement of it.
          </LI>
          <LI>
            Supplements are not regulated as strictly as medicines in many
            jurisdictions. Quality, purity and actual dose can vary between
            products and batches.
          </LI>
          <LI>
            Supplements can interact with prescription medication and with each
            other, and some are contraindicated in pregnancy or with particular
            conditions. Consult a doctor or pharmacist before starting anything
            new.
          </LI>
          <LI>
            If you compete in a tested sport, verify every product against your
            governing body&rsquo;s prohibited list. IGNYT does not screen for
            banned substances.
          </LI>
        </List>
      </>
    ),
  },
  {
    id: "data-accuracy",
    heading: "Data accuracy",
    body: (
      <P>
        IGNYT presents the data you enter and the data your devices report. It
        does not verify either. Synchronisation gaps, revoked permissions,
        device sensor error and manual entry mistakes can all produce figures
        that do not reflect reality. Review anything that looks wrong before
        acting on it.
      </P>
    ),
  },
  {
    id: "external-links",
    heading: "External links",
    body: (
      <P>
        This website and the app may link to third-party sites and services. We
        do not control them, do not endorse their content, and are not
        responsible for their availability, accuracy or practices.
      </P>
    ),
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    body: (
      <>
        <P>
          To the fullest extent permitted by law, IGNYT and its developer accept
          no liability for any loss, injury, illness or damage — direct or
          indirect — arising from your use of the app or this website, including
          decisions about training, diet, fasting, hydration or supplementation
          made in reliance on information it displays.
        </P>
        <P>
          Nothing here excludes or limits liability that cannot lawfully be
          excluded, including for death or personal injury caused by negligence,
          or for fraud. Full terms are in the{" "}
          <Link
            href="/terms"
            className="font-semibold text-ember hover:underline"
          >
            Terms &amp; Conditions
          </Link>
          .
        </P>
      </>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <P>
        Questions about this disclaimer:{" "}
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

export default function DisclaimerPage() {
  return (
    <>
      <JsonLd data={legalSchema("Disclaimer", "/disclaimer")} />
      <LegalPage
        title="Disclaimer"
        summary="IGNYT tracks what you tell it and what your devices report. It is not a medical device, it does not give medical advice, and the decisions you make from it remain yours."
        sections={sections}
        currentPath="/disclaimer"
      />
    </>
  );
}
