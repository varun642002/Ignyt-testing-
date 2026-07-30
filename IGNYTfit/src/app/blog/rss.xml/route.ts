import { sortedPosts } from "@/lib/blog";
import { absoluteUrl, site } from "@/lib/site";

/** Escapes the five XML predefined entities. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Route Handlers default to on-demand rendering in Next 16. This one reads
 * only build-time constants, so it is prerendered with the rest of the site
 * and served from the CDN rather than invoking a function per request.
 */
export const dynamic = "force-static";

/** RSS 2.0 feed for the blog. */
export function GET(): Response {
  const items = sortedPosts
    .map(
      (post) => `    <item>
      <title>${xml(post.title)}</title>
      <link>${absoluteUrl(`/blog/${post.slug}`)}</link>
      <guid isPermaLink="true">${absoluteUrl(`/blog/${post.slug}`)}</guid>
      <description>${xml(post.description)}</description>
      <category>${xml(post.category)}</category>
      <pubDate>${new Date(post.published).toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${site.name} Blog`)}</title>
    <link>${absoluteUrl("/blog")}</link>
    <description>${xml("Practical, evidence-informed writing on training, nutrition and body composition.")}</description>
    <language>en</language>
    <atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
