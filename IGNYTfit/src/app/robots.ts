import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/site";

/**
 * Emits `/robots.txt`.
 *
 * Non-production deployments (Vercel previews) are disallowed wholesale so
 * preview URLs never compete with the canonical domain in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === undefined;

  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing here is user data; these are simply not pages worth indexing.
        disallow: ["/maintenance", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
