import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { JsonLd, organizationSchema } from "@/components/seo/JsonLd";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { site, siteUrl } from "@/lib/site";
import "./globals.css";

/**
 * One font, self-hosted by `next/font` at build time — no runtime request to
 * Google, no layout shift, and one less origin to allow in the CSP.
 *
 * Geist Mono was dropped: `next/font` preloads every declared face, so it
 * put 30KB on the critical path to style a package name and an error digest.
 * Those now use the system monospace stack, which costs nothing to fetch.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: site.seoTitle,
    // Every page supplies a bare title; the brand is appended here once.
    template: `%s · ${site.name}`,
  },
  description: site.seoDescription,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  category: "health",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: site.ogTitle,
    description: site.seoDescription,
    locale: site.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: site.ogTitle,
    description: site.seoDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink text-text">
        {/*
          Scroll-reveal safety net.

          Framer Motion server-renders each reveal wrapper's `initial` state as
          an inline `opacity:0`, and only clears it once the client runtime
          observes the element entering the viewport. Without JavaScript that
          never happens, so every section below the fold would stay invisible
          forever — the copy is in the DOM, but nobody can read it.

          This restores it for that case only. When scripting is available the
          rule is inert and the animations run normally.
        */}
        <noscript>
          <style>{`
            [style*="opacity:0"],
            [style*="opacity: 0"] {
              opacity: 1 !important;
              transform: none !important;
            }
          `}</style>
        </noscript>

        {/* First tab stop on every page. */}
        <a
          href="#main"
          className="sr-only left-4 top-4 z-[100] rounded-xl bg-ember px-4 py-2 text-[14px] font-bold text-[#150500] focus:not-sr-only focus:fixed"
        >
          Skip to main content
        </a>

        <JsonLd data={organizationSchema} />
        <Navbar />

        {/* Clears the fixed 68px header. */}
        <main id="main" className="flex-1 pt-[68px]">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
