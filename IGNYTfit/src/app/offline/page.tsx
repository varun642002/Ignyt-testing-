import type { Metadata } from "next";
import { CloudOff, RefreshCw, Smartphone } from "lucide-react";
import { BoltMark } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { createMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "You are offline",
  description:
    "This page of the IGNYT website needs a connection. The IGNYT app itself works fully offline.",
  path: "/offline",
  noIndex: true,
});

/**
 * Offline fallback.
 *
 * The site is fully static, so most pages survive a flaky connection from the
 * browser's own HTTP cache. This exists for the case where a navigation to an
 * uncached route fails — and to make the point that the *app* has no such
 * limitation.
 */
export default function OfflinePage() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[640px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(62,130,247,0.16) 0%, rgba(0,0,0,0) 68%)",
        }}
      />

      <Container className="text-center">
        <BoltMark className="mx-auto h-12 w-12 text-ember" />

        <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[12px] font-semibold text-text-mute">
          <CloudOff aria-hidden className="size-3.5 text-pulse-strong" />
          No connection
        </span>

        <h1 className="mt-6 text-[clamp(1.9rem,4.4vw,2.9rem)] font-black">
          This page needs a connection
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-text-mute">
          The {site.name} website could not be reached. Pages you have already
          visited may still load from your browser&rsquo;s cache.
        </p>

        <p className="mx-auto mt-6 flex max-w-lg items-start justify-center gap-2.5 rounded-tile border border-good/30 bg-good/8 p-4 text-left text-[14.5px] leading-relaxed text-text-mute">
          <Smartphone
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-good"
          />
          <span>
            The {site.name} app is unaffected — logging, search, timers and
            charts all work with no connection at all.
          </span>
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            <RefreshCw aria-hidden className="size-4" />
            Try again
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
