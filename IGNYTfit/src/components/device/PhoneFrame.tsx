import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Design width/height of the simulated device, in CSS pixels. Every screen in
 * `components/device/screens.tsx` is authored against this grid and then
 * scaled as a whole, which keeps proportions identical at every size instead
 * of relying on 18 separate responsive layouts.
 */
export const FRAME_W = 296;
export const FRAME_H = 622;

/**
 * Premium device mockup.
 *
 * Sizing is driven by the `--pw` custom property (the outer width in pixels),
 * so callers can scale the phone responsively with plain utility classes and
 * no JavaScript measurement:
 *
 *     <PhoneFrame className="[--pw:250px] md:[--pw:320px]">…</PhoneFrame>
 */
export function PhoneFrame({
  children,
  className,
  /** Renders the ambient brand glow behind the device. */
  glow = true,
  /** Screen-reader description of what the mockup depicts. */
  label,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  label?: string;
}) {
  return (
    <div
      className={cn("relative [--pw:280px]", className)}
      style={{
        width: "var(--pw)",
        height: `calc(var(--pw) * ${FRAME_H} / ${FRAME_W})`,
      }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {glow ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-x-16 -top-10 bottom-0 rounded-full opacity-70 blur-2xl"
            style={{
              background:
                "radial-gradient(60% 45% at 50% 30%, rgba(255,90,31,0.30), rgba(0,0,0,0) 70%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-x-14 top-1/3 -bottom-10 rounded-full opacity-70 blur-2xl"
            style={{
              background:
                "radial-gradient(60% 45% at 50% 70%, rgba(62,130,247,0.28), rgba(0,0,0,0) 70%)",
            }}
          />
        </>
      ) : null}

      {/* Scaled device.
          `transform-origin: top left` keeps the scaled box aligned with the
          layout box that reserves space for it.

          The clipper matters: the inner element is laid out at the full
          296×622 design size and only *painted* smaller, so at any `--pw`
          below 296 its layout box spills past the container and drags the
          document's scroll width with it. `overflow-hidden` at the container
          bounds removes nothing visible — the scaled paint fits exactly. */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(calc(var(--pw) / ${FRAME_W}))`,
          }}
        >
          <div
            className={cn(
              "relative h-full w-full rounded-[44px] p-2",
              "bg-[linear-gradient(150deg,#3a3f4b_0%,#14161d_28%,#0c0e13_60%,#2a2f3a_100%)]",
              "shadow-[0_50px_110px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)]",
            )}
          >
            {/* Side buttons */}
            <span
              aria-hidden
              className="absolute -left-[3px] top-[132px] h-11 w-[3px] rounded-l bg-[#2b303b]"
            />
            <span
              aria-hidden
              className="absolute -left-[3px] top-[188px] h-11 w-[3px] rounded-l bg-[#2b303b]"
            />
            <span
              aria-hidden
              className="absolute -right-[3px] top-[160px] h-16 w-[3px] rounded-r bg-[#2b303b]"
            />

            <div className="relative h-full w-full overflow-hidden rounded-[37px] bg-ink">
              {children}

              {/* Punch-hole camera */}
              <span
                aria-hidden
                className="absolute left-1/2 top-2.5 size-[9px] -translate-x-1/2 rounded-full bg-[#05060a] ring-1 ring-white/10"
              />
              {/* Screen gloss */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[37px] bg-[linear-gradient(115deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0)_38%)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
