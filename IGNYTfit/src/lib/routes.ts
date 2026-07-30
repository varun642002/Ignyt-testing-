/**
 * The site's route registry.
 *
 * Navigation, the footer and `sitemap.ts` all read from here, so adding a page
 * in one place wires it into every surface — there is no second list to keep
 * in sync.
 */

export interface RouteMeta {
  path: string;
  label: string;
  /** Sitemap priority, 0–1. */
  priority: number;
  changeFrequency: "yearly" | "monthly" | "weekly";
}

/** Primary marketing pages — these appear in the header navigation. */
export const primaryRoutes: RouteMeta[] = [
  { path: "/", label: "Home", priority: 1, changeFrequency: "weekly" },
  {
    path: "/features",
    label: "Features",
    priority: 0.9,
    changeFrequency: "monthly",
  },
  {
    path: "/screenshots",
    label: "Screenshots",
    priority: 0.9,
    changeFrequency: "monthly",
  },
  { path: "/about", label: "About", priority: 0.8, changeFrequency: "monthly" },
  {
    path: "/download",
    label: "Download",
    priority: 0.9,
    changeFrequency: "monthly",
  },
  {
    path: "/contact",
    label: "Contact",
    priority: 0.7,
    changeFrequency: "monthly",
  },
];

/** The legal suite — linked from the footer and from each other. */
export const legalRoutes: RouteMeta[] = [
  {
    path: "/privacy",
    label: "Privacy Policy",
    priority: 0.6,
    changeFrequency: "yearly",
  },
  {
    path: "/terms",
    label: "Terms & Conditions",
    priority: 0.6,
    changeFrequency: "yearly",
  },
  {
    path: "/health-data",
    label: "Health Data Policy",
    priority: 0.6,
    changeFrequency: "yearly",
  },
  {
    path: "/data-deletion",
    label: "Data Deletion",
    priority: 0.6,
    changeFrequency: "yearly",
  },
  {
    path: "/cookies",
    label: "Cookie Policy",
    priority: 0.5,
    changeFrequency: "yearly",
  },
  {
    path: "/disclaimer",
    label: "Disclaimer",
    priority: 0.5,
    changeFrequency: "yearly",
  },
];

/**
 * Header navigation. The spec calls for Home / Features / Screenshots / About
 * / Privacy / Contact in the centre, with Download promoted to the right-hand
 * call to action — so Download is excluded here and Privacy is pulled in.
 */
export const navRoutes = [
  ...primaryRoutes.filter((route) => route.path !== "/download"),
  legalRoutes[0],
].sort(
  (a, b) =>
    [
      "/",
      "/features",
      "/screenshots",
      "/about",
      "/privacy",
      "/contact",
    ].indexOf(a.path) -
    [
      "/",
      "/features",
      "/screenshots",
      "/about",
      "/privacy",
      "/contact",
    ].indexOf(b.path),
);

export const allRoutes: RouteMeta[] = [...primaryRoutes, ...legalRoutes];
