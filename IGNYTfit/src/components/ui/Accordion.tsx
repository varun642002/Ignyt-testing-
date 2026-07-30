"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * Single accordion row.
 *
 * Built from a real `<button aria-expanded aria-controls>` pair rather than
 * `<details>`, because the open/close height transition needs to be driven by
 * Framer Motion. Keyboard behaviour (Enter/Space, tab order) comes free from
 * the native button.
 */
function AccordionRow({
  item,
  isOpen,
  onToggle,
}: {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-tile border transition-colors duration-300",
        isOpen
          ? "border-ember/40 bg-surface-2/70"
          : "border-line bg-surface/60 hover:border-line/80 hover:bg-surface-2/50",
      )}
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`${id}-panel`}
          id={`${id}-trigger`}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        >
          <span className="text-[15px] font-semibold text-text">
            {item.question}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-text-mute transition-transform duration-300",
              isOpen && "rotate-180 text-ember",
            )}
          />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="panel"
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-trigger`}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="px-5 pb-5 text-[14.5px] leading-relaxed text-text-mute">
              {item.answer}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Accordion list. Only one row is open at a time, which keeps long FAQ
 * sections from turning into an unscannable wall of text.
 */
export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item, index) => (
        <AccordionRow
          key={item.question}
          item={item}
          isOpen={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  );
}
