import { ArrowRight, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PlayStoreButton } from "@/components/ui/PlayStoreButton";
import { Reveal } from "@/components/ui/Reveal";

const ASSURANCES = [
  { Icon: Smartphone, label: "Android 8.0 and later" },
  { Icon: WifiOff, label: "Works fully offline" },
  { Icon: ShieldCheck, label: "No ads, never sold" },
];

/**
 * Closing call to action. Reused verbatim at the foot of the home, features
 * and screenshots pages.
 */
export function DownloadCta() {
  return (
    <section
      id="download"
      aria-labelledby="download-cta-heading"
      className="scroll-mt-24 py-20 sm:py-28"
    >
      <Container>
        <Reveal>
          <div className="ring-gradient relative overflow-hidden rounded-[32px] border border-line bg-[linear-gradient(150deg,#12151d_0%,#0b0d13_45%,#170e0a_100%)] px-6 py-16 text-center sm:px-14 sm:py-20">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full blur-[90px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,90,31,0.28), transparent 68%)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -right-24 size-[440px] rounded-full blur-[90px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(62,130,247,0.24), transparent 68%)",
              }}
            />

            <h2
              id="download-cta-heading"
              className="relative text-[clamp(1.9rem,4.6vw,3.1rem)] font-black leading-[1.08]"
            >
              Download <span className="text-gradient">IGNYT</span>
            </h2>

            <p className="relative mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-text-mute">
              Download IGNYT and take control of your fitness journey with
              intelligent workout tracking, nutrition management, and progress
              analytics.
            </p>

            {/* The listing is not public yet, so the store link is labelled for
                what it currently is. Shipping a Play button that leads to a 404
                is worse than saying "coming soon" — and an OAuth reviewer
                clicking through to a dead listing reads as an incomplete app. */}
            <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PlayStoreButton />
              <ButtonLink href="/download" variant="secondary" size="lg">
                Installation guide
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>

            <p className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-warn/30 bg-warn/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-warn">
              <span aria-hidden className="size-1.5 rounded-full bg-warn" />
              Coming soon to Google Play
            </p>

            <ul className="relative mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              {ASSURANCES.map(({ Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-[13.5px] text-text-dim"
                >
                  <Icon aria-hidden className="size-4 text-good" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
