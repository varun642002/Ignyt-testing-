import type { Metadata } from "next";
import { ArrowLeft, Compass } from "lucide-react";
import { BoltMark } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { primaryRoutes } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Page not found",
  description: "The page you were looking for does not exist on ignytfit.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[680px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,90,31,0.18) 0%, rgba(0,0,0,0) 68%)",
        }}
      />

      <Container className="text-center">
        <BoltMark className="mx-auto h-14 w-14 text-ember" />

        {/* Watermark numeral. It is real, visible text, so it has to meet the
            3:1 large-text contrast floor rather than fading into the
            background the way a purely decorative shape could. */}
        <p className="mt-8 text-[clamp(4.5rem,14vw,9rem)] font-black leading-none tracking-tight text-[#666770]">
          404
        </p>
        <h1 className="mt-2 text-[clamp(1.7rem,4vw,2.6rem)] font-black">
          This page never made it past warm-up
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-text-mute">
          The link is broken or the page has moved. Here is the way back.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            <ArrowLeft aria-hidden className="size-4" />
            Back to home
          </ButtonLink>
          <ButtonLink href="/features" variant="secondary" size="lg">
            <Compass aria-hidden className="size-4" />
            Browse features
          </ButtonLink>
        </div>

        <nav aria-label="All pages" className="mt-12">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {primaryRoutes.map((route) => (
              <li key={route.path}>
                <ButtonLink href={route.path} variant="glass" size="sm">
                  {route.label}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}
