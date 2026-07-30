import type { MetadataRoute } from "next";
import { allRoutes } from "@/lib/routes";
import { absoluteUrl, site } from "@/lib/site";

/**
 * Emits `/sitemap.xml` from the shared route registry, so a new page is
 * indexed the moment it is added to `lib/routes.ts`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(site.legalUpdated);

  return allRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
