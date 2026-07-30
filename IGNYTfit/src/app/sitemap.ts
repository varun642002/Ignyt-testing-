import type { MetadataRoute } from "next";
import { sortedPosts } from "@/lib/blog";
import { allRoutes } from "@/lib/routes";
import { absoluteUrl, site } from "@/lib/site";

/**
 * Emits `/sitemap.xml` from the shared route registry plus every published
 * article, so a new page or post is indexed the moment it is added — there is
 * no separate list to remember.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(site.legalUpdated);

  const pages = allRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const articles = sortedPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.published),
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  return [...pages, ...articles];
}
