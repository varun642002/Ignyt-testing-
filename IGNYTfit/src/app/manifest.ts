import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Emits `/manifest.webmanifest`.
 *
 * Values mirror the IGNYT app manifest (`www/manifest.json`) so an installed
 * site shortcut and the app itself present the same identity.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.shortDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: site.themeColor,
    theme_color: site.themeColor,
    categories: ["health", "fitness", "lifestyle"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
