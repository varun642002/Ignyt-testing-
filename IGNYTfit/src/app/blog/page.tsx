import type { Metadata } from "next";
import { Rss } from "lucide-react";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { DownloadCta } from "@/components/home/DownloadCta";
import { breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { sortedPosts } from "@/lib/blog";
import { createMetadata } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Blog",
  description:
    "Practical, evidence-informed writing on training, nutrition, body composition, fasting, hydration and recovery from the team behind IGNYT.",
  path: "/blog",
  keywords: [
    "fitness blog",
    "nutrition articles",
    "training advice",
    "protein intake guide",
    "progressive overload",
  ],
});

/** `Blog` schema listing every published article. */
const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": absoluteUrl("/blog#blog"),
  name: `${site.name} Blog`,
  url: absoluteUrl("/blog"),
  description:
    "Practical, evidence-informed writing on training, nutrition and body composition.",
  publisher: { "@id": absoluteUrl("/#organization") },
  blogPost: sortedPosts.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    url: absoluteUrl(`/blog/${post.slug}`),
  })),
};

export default function BlogPage() {
  return (
    <>
      <JsonLd data={blogSchema} />
      <JsonLd data={breadcrumbSchema([{ name: "Blog", path: "/blog" }])} />

      <PageHero
        eyebrow="Blog"
        title={
          <>
            Training and nutrition,{" "}
            <span className="text-gradient">without the mythology</span>
          </>
        }
        lead="Short, practical articles on the things people actually get stuck on — protein targets, progression, scale weight, fasting windows. No supplements to sell, no miracle protocols."
      />

      <Container className="py-16 sm:py-20">
        <BlogIndex posts={sortedPosts} />

        <p className="mt-14 flex justify-center">
          <a
            href="/blog/rss.xml"
            className="inline-flex items-center gap-2 rounded-btn border border-line bg-surface/70 px-5 py-3 text-[14px] font-semibold text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
          >
            <Rss aria-hidden className="size-4" />
            Subscribe via RSS
          </a>
        </p>
      </Container>

      <DownloadCta />
    </>
  );
}
