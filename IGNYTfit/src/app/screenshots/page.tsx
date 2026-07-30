import type { Metadata } from "next";
import { DownloadCta } from "@/components/home/DownloadCta";
import { ScreenshotGallery } from "@/components/screenshots/ScreenshotGallery";
import { breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { PlayStoreButton } from "@/components/ui/PlayStoreButton";
import { createMetadata } from "@/lib/seo";
import { screens } from "@/lib/screens";

export const metadata: Metadata = createMetadata({
  title: "Screenshots",
  description:
    "See every major IGNYT screen: dashboard, workout tracking, exercise details, food log, food search, nutrition analysis, diet plans, fasting, water, supplements, Health Connect, weight, progress, reminders, profile and settings.",
  path: "/screenshots",
  keywords: [
    "IGNYT screenshots",
    "fitness app screenshots",
    "workout tracker screenshots",
    "food log app screens",
  ],
});

export default function ScreenshotsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: "Screenshots", path: "/screenshots" }])}
      />

      <PageHero
        eyebrow="Screenshots"
        title={
          <>
            Sixteen screens.{" "}
            <span className="text-gradient">One fitness system.</span>
          </>
        }
        lead={`A guided tour of all ${screens.length} screens — from the first set you log to the analytics that tell you whether the last twelve weeks actually worked.`}
      >
        <PlayStoreButton />
        <ButtonLink href="/features" variant="secondary" size="lg">
          Read the feature list
        </ButtonLink>
      </PageHero>

      <ScreenshotGallery />
      <DownloadCta />
    </>
  );
}
