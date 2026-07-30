import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * FAQ accordion built on native `<details>` / `<summary>`.
 *
 * A **server component** with no JavaScript at all. The previous version was
 * a client component holding open/closed state, and pages like `/contact`
 * mounted ten of them — enough hydration work to be visible in total blocking
 * time on a throttled mobile profile.
 *
 * Native disclosure gives us keyboard handling, correct ARIA semantics and
 * find-in-page support for free, and the answers stay in the DOM whether or
 * not the row is open — so they are always available to search engines.
 *
 * `name` makes the group exclusive (opening one closes the others) in browsers
 * that support it; elsewhere rows simply open independently, which is a
 * perfectly reasonable accordion.
 */
export function Accordion({
  items,
  className,
  /** Groups rows so only one opens at a time. Must be unique per accordion. */
  name,
}: {
  items: AccordionItem[];
  className?: string;
  name?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <details
          key={item.question}
          name={name}
          className={cn(
            "group overflow-hidden rounded-tile border border-line bg-surface/60",
            "transition-colors duration-300 hover:border-line/80 hover:bg-surface-2/50",
            "open:border-ember/40 open:bg-surface-2/70",
          )}
        >
          <summary
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 px-5 py-4",
              // Hide the default disclosure triangle across engines.
              "list-none [&::-webkit-details-marker]:hidden",
            )}
          >
            <span className="text-[15px] font-semibold text-text">
              {item.question}
            </span>
            <ChevronDown
              aria-hidden
              className="size-5 shrink-0 text-text-mute transition-transform duration-300 group-open:rotate-180 group-open:text-ember"
            />
          </summary>

          <p className="px-5 pb-5 text-[14.5px] leading-relaxed text-text-mute">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
