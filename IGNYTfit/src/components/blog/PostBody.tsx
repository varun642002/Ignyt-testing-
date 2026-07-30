import { Quote } from "lucide-react";
import type { Block } from "@/lib/blog";

/**
 * Renders an article's typed content blocks.
 *
 * Typography lives here rather than in a `prose` plugin so the blog matches
 * the rest of the design system exactly, and so every block type is a case the
 * compiler forces us to handle.
 */
export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="max-w-[68ch]">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={index}
                className="mt-12 text-[clamp(1.4rem,2.6vw,1.85rem)] font-black leading-tight first:mt-0"
              >
                {block.text}
              </h2>
            );

          case "h3":
            return (
              <h3 key={index} className="mt-9 text-[19px] font-bold">
                {block.text}
              </h3>
            );

          case "p":
            return (
              <p
                key={index}
                className="mt-5 text-[16.5px] leading-[1.75] text-text-mute"
              >
                {block.text}
              </p>
            );

          case "ul":
            return (
              <ul
                key={index}
                className="mt-5 flex list-disc flex-col gap-3 pl-5 text-[16px] leading-[1.7] text-text-mute marker:text-ember"
              >
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol
                key={index}
                className="mt-5 flex list-decimal flex-col gap-3 pl-5 text-[16px] leading-[1.7] text-text-mute marker:font-bold marker:text-ember"
              >
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            );

          case "callout":
            return (
              <aside
                key={index}
                className="mt-8 rounded-card border border-ember/30 bg-ember/8 p-5"
              >
                <p className="text-[15px] font-bold text-ember">
                  {block.title}
                </p>
                <p className="mt-2 text-[15.5px] leading-relaxed text-text-mute">
                  {block.text}
                </p>
              </aside>
            );

          case "quote":
            return (
              <blockquote
                key={index}
                className="mt-8 flex gap-4 border-l-2 border-pulse/60 pl-5"
              >
                <Quote
                  aria-hidden
                  className="mt-1 size-5 shrink-0 text-pulse-strong"
                />
                <p className="text-[17px] font-medium italic leading-relaxed text-text">
                  {block.text}
                </p>
              </blockquote>
            );
        }
      })}
    </div>
  );
}
