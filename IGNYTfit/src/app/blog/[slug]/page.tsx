import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, TriangleAlert } from "lucide-react";
import { PostBody } from "@/components/blog/PostBody";
import { DownloadCta } from "@/components/home/DownloadCta";
import { breadcrumbSchema, JsonLd } from "@/components/seo/JsonLd";
import { Badge, Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { formatPostDate, getPost, posts, sortedPosts } from "@/lib/blog";
import { createMetadata } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

/** Prerenders every article at build time. */
export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

// Next 16: route params arrive as a Promise and must be awaited.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return createMetadata({
      title: "Article not found",
      description: "This article does not exist.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  const meta = createMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogType: "article",
    keywords: post.keywords,
  });

  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: post.published,
      authors: [site.name],
      section: post.category,
      tags: post.keywords,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = sortedPosts
    .filter((item) => item.slug !== post.slug)
    .slice(0, 2);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.published,
    articleSection: post.category,
    keywords: post.keywords.join(", "),
    url: absoluteUrl(`/blog/${post.slug}`),
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />

      <article>
        <header className="relative overflow-hidden border-b border-line/60 py-16 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-40%] -z-10 size-[680px] -translate-x-1/2 rounded-full blur-[110px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255,90,31,0.18) 0%, rgba(0,0,0,0) 68%)",
            }}
          />
          <Container>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-text-mute transition-colors hover:text-ember"
            >
              <ArrowLeft aria-hidden className="size-4" />
              All articles
            </Link>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Badge tone="ember">{post.category}</Badge>
              <span className="flex items-center gap-1.5 text-[13px] text-text-dim">
                <Clock aria-hidden className="size-3.5" />
                {post.readingMinutes} min read
              </span>
              <time
                dateTime={post.published}
                className="text-[13px] text-text-dim"
              >
                {formatPostDate(post.published)}
              </time>
            </div>

            <h1 className="mt-5 max-w-4xl text-[clamp(2rem,4.6vw,3.2rem)] font-black leading-[1.08]">
              {post.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-text-mute">
              {post.description}
            </p>
          </Container>
        </header>

        <Container className="py-14 sm:py-16">
          <PostBody blocks={post.body} />

          <aside className="mt-14 max-w-[68ch] rounded-card border border-warn/30 bg-warn/8 p-5">
            <p className="flex items-center gap-2 text-[14px] font-bold text-warn">
              <TriangleAlert aria-hidden className="size-4" />
              General information, not medical advice
            </p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-text-mute">
              This article is educational and is not a substitute for
              professional medical, nutritional or fitness advice. Consult a
              qualified professional before changing how you train or eat. See
              our{" "}
              <Link
                href="/disclaimer"
                className="font-semibold text-ember hover:underline"
              >
                full disclaimer
              </Link>
              .
            </p>
          </aside>
        </Container>

        {related.length > 0 ? (
          <Container className="pb-16">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-text-dim">
              Keep reading
            </h2>
            <ul className="mt-5 grid list-none gap-4 md:grid-cols-2">
              {related.map((item) => (
                <li key={item.slug} className="h-full">
                  <Card interactive className="h-full p-6">
                    <Badge tone="neutral">{item.category}</Badge>
                    <h3 className="mt-3 text-[17px] font-bold leading-snug">
                      <Link
                        href={`/blog/${item.slug}`}
                        className="hover:text-ember"
                      >
                        {item.title}
                        <span className="absolute inset-0" aria-hidden />
                      </Link>
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-text-mute">
                      {item.description}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        ) : null}
      </article>

      <DownloadCta />
    </>
  );
}
