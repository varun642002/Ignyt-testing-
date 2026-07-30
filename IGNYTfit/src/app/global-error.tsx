"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown by the root layout itself.
 *
 * It replaces the entire document, so it must render its own `<html>` and
 * `<body>` and cannot rely on the design system, fonts or global stylesheet —
 * all styling here is inline on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090d",
          color: "#f7f4ef",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: 480 }}>
          <svg
            viewBox="0 0 512 512"
            width="52"
            height="52"
            fill="#ff5a1f"
            aria-hidden
          >
            <path d="M344 92 L198 216 L252 216 L168 420 L314 296 L258 296 Z" />
          </svg>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              margin: "24px 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            IGNYT could not load
          </h1>
          <p
            style={{
              color: "#aaa9b0",
              fontSize: 15,
              lineHeight: 1.6,
              margin: "14px 0 0",
            }}
          >
            An unexpected error stopped the page from rendering. Reloading
            usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: "14px 24px",
              borderRadius: 18,
              border: "none",
              background: "#ff5a1f",
              color: "#150500",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload the page
          </button>
        </main>
      </body>
    </html>
  );
}
