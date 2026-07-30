import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The site's single horizontal rhythm: 1200px of content with mobile-first
 * gutters. Every section uses it, so nothing drifts out of alignment.
 */
export function Container({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}
    >
      {children}
    </Tag>
  );
}
