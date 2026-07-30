"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui/Card";
import { formatPostDate, usedCategories, type Post } from "@/lib/blog";
import { cn } from "@/lib/utils";

/**
 * Article list with client-side category filtering.
 *
 * The full post list is rendered on the server and passed in, so the page is
 * fully indexable and readable before hydration — filtering only ever hides
 * what is already there, it never fetches.
 */
export function BlogIndex({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<string>("All");
  const reduceMotion = useReducedMotion();

  const visible = useMemo(
    () =>
      active === "All" ? posts : posts.filter((p) => p.category === active),
    [active, posts],
  );

  const filters = ["All", ...usedCategories];

  return (
    <>
      <div
        role="group"
        aria-label="Filter articles by category"
        className="no-scrollbar mask-fade-x -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            aria-pressed={active === filter}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors duration-200",
              active === filter
                ? "border-ember/45 bg-ember/12 text-ember"
                : "border-line bg-surface/60 text-text-mute hover:border-line/80 hover:text-text",
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} article{visible.length === 1 ? "" : "s"} shown
      </p>

      <ul className="mt-12 grid list-none gap-5 md:grid-cols-2">
        {visible.map((post, index) => (
          <motion.li
            key={post.slug}
            layout={reduceMotion ? false : true}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: Math.min(index * 0.05, 0.3),
              ease: [0.16, 1, 0.3, 1],
            }}
            className="h-full"
          >
            <Card interactive className="h-full p-7">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="ember">{post.category}</Badge>
                <span className="flex items-center gap-1.5 text-[12.5px] text-text-dim">
                  <Clock aria-hidden className="size-3.5" />
                  {post.readingMinutes} min read
                </span>
              </div>

              <h2 className="mt-4 text-[20px] font-bold leading-snug">
                <Link href={`/blog/${post.slug}`} className="hover:text-ember">
                  {post.title}
                  <span className="absolute inset-0" aria-hidden />
                </Link>
              </h2>

              <p className="mt-3 text-[14.5px] leading-relaxed text-text-mute">
                {post.description}
              </p>

              <div className="mt-6 flex items-center justify-between">
                <time
                  dateTime={post.published}
                  className="text-[13px] text-text-dim"
                >
                  {formatPostDate(post.published)}
                </time>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ember">
                  Read
                  <ArrowRight aria-hidden className="size-3.5" />
                </span>
              </div>
            </Card>
          </motion.li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="mt-12 text-center text-[15px] text-text-mute">
          Nothing published in that category yet.
        </p>
      ) : null}
    </>
  );
}
