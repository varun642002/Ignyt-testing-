import type { Metadata } from "next";
import { absoluteUrl, site } from "@/lib/site";

/**
 * Keywords shared by every page. Page-specific terms are appended, never
 * replaced, so the brand terms are always present.
 */
const baseKeywords = [
  "IGNYT",
  "IGNYT app",
  "IGNYT fitness",
  "fitness app",
  "workout tracker",
  "food log app",
  "calorie counter",
  "macro tracker",
  "intermittent fasting app",
  "water tracker",
  "supplement tracker",
  "weight tracker",
  "Health Connect app",
  "offline fitness app",
  "Android fitness app",
];

export interface PageSeo {
  /** Page title without the brand suffix — the template adds "· IGNYT". */
  title: string;
  description: string;
  /** Route path, e.g. "/features". Used for the canonical URL. */
  path: string;
  keywords?: string[];
  /** Set for legal pages, which should be indexed but rank below marketing pages. */
  ogType?: "website" | "article";
  /** Opt a route out of indexing (e.g. the maintenance page). */
  noIndex?: boolean;
  /**
   * Use the title verbatim instead of appending "· IGNYT". Only the home
   * page needs this — its title already carries the brand.
   */
  absoluteTitle?: boolean;
  /**
   * Override the Open Graph and Twitter title. Social cards have far less room
   * than a search result, so a page may want a shorter headline there than the
   * one in <title>. Defaults to the page title.
   */
  socialTitle?: string;
}

/**
 * Builds a complete, consistent metadata object for a route: canonical URL,
 * Open Graph, Twitter card and robots directives.
 *
 * The OG image itself is produced by `src/app/opengraph-image.tsx` and is
 * inherited by every route, so it is not repeated per page.
 */
export function createMetadata({
  title,
  description,
  path,
  keywords = [],
  ogType = "website",
  noIndex = false,
  absoluteTitle = false,
  socialTitle: socialTitleOverride,
}: PageSeo): Metadata {
  const url = absoluteUrl(path);
  const socialTitle =
    socialTitleOverride ??
    (absoluteTitle ? title : `${title} · ${site.name}`);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: [...baseKeywords, ...keywords],
    alternates: { canonical: url },
    openGraph: {
      type: ogType,
      url,
      siteName: site.name,
      title: socialTitle,
      description,
      locale: site.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}
