/**
 * Single source of truth for every piece of site-wide identity: URLs, contact
 * details, store links and social handles.
 *
 * Nothing else in the codebase should hard-code a URL or an email address. If
 * a value can differ between preview and production it is read from an env
 * var here and nowhere else.
 */

/**
 * Canonical origin, without a trailing slash.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in the deployment environment. On Vercel preview
 * deployments `VERCEL_URL` is used so that Open Graph images and canonical
 * links resolve to the preview host rather than production.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://ignytfit.in")
).replace(/\/$/, "");

export const site = {
  /** Always rendered exactly as "IGNYT". */
  name: "IGNYT",
  legalName: "IGNYT",
  domain: siteUrl.replace(/^https?:\/\//, ""),
  url: siteUrl,
  tagline: "Your complete fitness companion",
  description:
    "IGNYT is an offline-first Android fitness app for workout tracking, food logging, macros, fasting, hydration, supplements, weight and Health Connect — with your data stored on your device by default.",
  shortDescription:
    "Track workouts, nutrition, fasting, supplements, hydration, Health Connect and progress in one offline-first fitness app.",
  androidPackage: "com.varun.ignyt",
  locale: "en_US",
  themeColor: "#08090d",

  /**
   * Release facts, mirrored from `android/app/build.gradle`. Update here when
   * the app ships — every page reads these rather than hard-coding a number.
   */
  app: {
    version: "1.0.35",
    versionCode: 8,
    /** minSdk 26. */
    minAndroid: "8.0",
    minAndroidName: "Oreo",
    /** compileSdk / targetSdk 36. */
    targetSdk: 36,
  },

  email: {
    support: "ignytfit@gmail.com",
    privacy: "ignytfit@gmail.com",
    business: "ignytfit@gmail.com",
  },

  links: {
    play: "https://play.google.com/store/apps/details?id=com.varun.ignyt",
    github: "https://github.com/varun642002/IGNYTfit",
    githubApp: "https://github.com/varun642002/Ignyt-testing-",
    instagram: "https://instagram.com/ignytfit",
    x: "https://x.com/ignytfit",
    linkedin: "https://www.linkedin.com/company/ignytfit",
  },

  /** Shared "last updated" stamp for the legal suite. */
  legalUpdated: "2026-07-30",
} as const;

/** Absolute URL helper — every canonical/OG/JSON-LD URL goes through this. */
export function absoluteUrl(path = "/"): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Human-readable form of `site.legalUpdated`, e.g. "30 July 2026". */
export const legalUpdatedLabel = new Date(site.legalUpdated).toLocaleDateString(
  "en-GB",
  { day: "numeric", month: "long", year: "numeric" },
);
