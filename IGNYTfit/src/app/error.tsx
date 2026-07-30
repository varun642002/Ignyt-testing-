"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/**
 * Route-level error boundary — the 500 page.
 *
 * Renders inside the root layout, so the visitor keeps the header, footer and
 * a way out. The error itself is logged rather than shown: production digests
 * are opaque, and raw messages can leak implementation detail.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[680px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,107,107,0.16) 0%, rgba(0,0,0,0) 68%)",
        }}
      />

      <Container className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-bad/30 bg-bad/10">
          <TriangleAlert aria-hidden className="size-7 text-bad" />
        </span>

        <h1 className="mt-8 text-[clamp(1.8rem,4vw,2.7rem)] font-black">
          Something went wrong on our side
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-text-mute">
          This one is on us, not on you. Try again — and if it keeps happening,
          tell us and we will fix it.
        </p>

        {error.digest ? (
          <p className="mt-5 font-mono text-[12.5px] text-text-dim">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw aria-hidden className="size-4" />
            Try again
          </Button>
          <ButtonLink href="/contact" variant="secondary" size="lg">
            Report the problem
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
