import type { Metadata } from "next";
import { AppPreview } from "@/components/home/AppPreview";
import { Comparison } from "@/components/home/Comparison";
import { DownloadCta } from "@/components/home/DownloadCta";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LovedFor } from "@/components/home/LovedFor";
import { Stats } from "@/components/home/Stats";
import { appSchema, JsonLd } from "@/components/seo/JsonLd";
import { createMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
  keywords: ["fitness tracker", "gym log app", "nutrition tracker Android"],
  absoluteTitle: true,
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={appSchema} />
      <Hero />
      <Stats />
      <FeatureGrid />
      <HowItWorks />
      <AppPreview />
      <Comparison />
      <LovedFor />
      <DownloadCta />
    </>
  );
}
