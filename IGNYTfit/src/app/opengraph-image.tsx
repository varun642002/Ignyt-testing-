import { ImageResponse } from "next/og";
import { BOLT_PATH, BOLT_VIEWBOX } from "@/components/brand/Logo";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Open Graph / Twitter card image, generated at build time.
 *
 * Inherited by every route (Next.js applies the root `opengraph-image` unless
 * a segment overrides it), which keeps one social preview for the whole site
 * instead of a static asset that drifts from the brand.
 *
 * Note: `next/og` uses Satori, which supports only a flex-based subset of CSS
 * — no `gap` shorthand on some versions, no grid, and every element that has
 * more than one child needs an explicit `display: flex`.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 76,
        background:
          "linear-gradient(135deg, #08090d 0%, #10131a 55%, #1a1116 100%)",
        color: "#f7f4ef",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Ember bloom behind the mark */}
      <div
        style={{
          position: "absolute",
          top: -160,
          right: -120,
          width: 620,
          height: 620,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(255,90,31,0.38) 0%, rgba(255,90,31,0) 68%)",
          display: "flex",
        }}
      />
      {/* Pulse bloom, bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: -220,
          left: -140,
          width: 640,
          height: 640,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(62,130,247,0.28) 0%, rgba(62,130,247,0) 68%)",
          display: "flex",
        }}
      />

      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 26,
            background: "linear-gradient(135deg, #ff6a2b 0%, #c9350a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 26,
          }}
        >
          <svg width="58" height="58" viewBox={BOLT_VIEWBOX} fill="#ffffff">
            <path d={BOLT_PATH} />
          </svg>
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: 12,
            display: "flex",
          }}
        >
          IGNYT
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -2,
            maxWidth: 940,
            display: "flex",
          }}
        >
          Transform your fitness journey
        </div>
        <div
          style={{
            fontSize: 31,
            color: "#aaa9b0",
            marginTop: 26,
            maxWidth: 900,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          Workouts, nutrition, fasting, supplements, hydration, Health Connect
          and progress — in one offline-first app.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            padding: "14px 26px",
            borderRadius: 999,
            background: "#ff5a1f",
            color: "#0b0402",
            fontSize: 27,
            fontWeight: 800,
            marginRight: 22,
          }}
        >
          Get it on Google Play
        </div>
        <div style={{ fontSize: 27, color: "#aaa9b0", display: "flex" }}>
          {site.domain}
        </div>
      </div>
    </div>,
    size,
  );
}
