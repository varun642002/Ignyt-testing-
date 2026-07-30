import path from "node:path";
import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * The CSP is deliberately strict: this site loads no third-party scripts,
 * fonts or analytics, so everything can be locked to `'self'`.
 *
 * - `'unsafe-inline'` on `style-src` is required by React's inline `style`
 *   attributes, which the device mockups and glow effects rely on. It carries
 *   no script-execution risk.
 * - `'unsafe-inline'` on `script-src` is required for Next.js's bootstrap and
 *   flight-data inline scripts. Nonces would require a per-request (dynamic)
 *   response, forfeiting full static generation on every page.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // React's development build uses eval() for its debugging features. Never
  // in production.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // This project lives inside the IGNYT app repository during development, so
  // Turbopack's lockfile-based root inference would otherwise pick the parent
  // directory.
  turbopack: { root: path.resolve(import.meta.dirname) },

  reactStrictMode: true,
  poweredByHeader: false,
  // Trailing-slash-free canonical URLs, matching sitemap.ts and metadata.
  trailingSlash: false,

  images: {
    formats: ["image/avif", "image/webp"],
    // Everything shipped is either a vector mockup or a local PNG icon, and
    // build output is content-addressed, so a long cache life is safe.
    minimumCacheTTL: 31_536_000,
  },

  experimental: {
    // Pull only the icons actually imported out of lucide-react, rather than
    // the whole barrel file.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Immutable build output. Only in production: overriding Cache-Control
      // on `_next/static` interferes with dev-server hot reloading.
      ...(isDev
        ? []
        : [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]),
      {
        source: "/:file(logo.svg|logo-mark.svg|icon-192.png|icon-512.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
