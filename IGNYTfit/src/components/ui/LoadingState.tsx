import { BoltMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/**
 * Branded loading indicator.
 *
 * Deliberately *not* wired up as a root `app/loading.tsx`. Every route on this
 * site is fully prerendered, and a root loading file wraps the whole page in a
 * Suspense boundary — which means the static HTML ships a spinner with the
 * real content parked inside a hidden `<template>`, revealed only once the
 * client runtime runs. That costs first-paint time and puts the page content
 * behind JavaScript for anything that does not execute the reveal script. For
 * a static marketing site it is a straight loss.
 *
 * Use this component instead wherever a genuine async boundary is introduced
 * later — a dynamically imported widget, or a route segment that fetches at
 * request time:
 *
 *     <Suspense fallback={<LoadingState label="Loading screenshots…" />}>
 *
 * At that point it can also be re-exported from a *segment-level*
 * `loading.tsx`, where the boundary is actually earning its keep.
 */
export function LoadingState({
  label = "Loading IGNYT…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-5",
        className,
      )}
    >
      <span className="relative grid size-16 place-items-center">
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse-ring rounded-full bg-ember/30"
        />
        <BoltMark className="relative h-9 w-9 animate-pulse text-ember" />
      </span>
      <p className="text-[14px] font-semibold text-text-dim">{label}</p>
    </div>
  );
}
