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

/** Product pages — what IGNYT is and what it does. */
export const productRoutes: RouteMeta[] = [
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
  {
    path: "/download",
    label: "Download",
    priority: 0.9,
    changeFrequency: "monthly",
  },
];

/** Editorial and support pages. */
export const learnRoutes: RouteMeta[] = [
  { path: "/blog", label: "Blog", priority: 0.8, changeFrequency: "weekly" },
  {
    path: "/resources",
    label: "Resources",
    priority: 0.7,
    changeFrequency: "monthly",
  },
];

/** Who we are and how to reach us. */
export const companyRoutes: RouteMeta[] = [
  { path: "/about", label: "About", priority: 0.8, changeFrequency: "monthly" },
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
 * Header navigation.
 *
 * Deliberately not every route: a header carrying ten links stops being
 * navigation and becomes a list. Download is promoted to the right-hand call
 * to action, and the legal suite lives in the footer where people look for it.
 */
export const navRoutes: RouteMeta[] = [
  productRoutes[0], // Home
  productRoutes[1], // Features
  productRoutes[2], // Screenshots
  learnRoutes[0], // Blog
  learnRoutes[1], // Resources
  companyRoutes[0], // About
  companyRoutes[1], // Contact
];

/** Every indexable route, for the sitemap. */
export const allRoutes: RouteMeta[] = [
  ...productRoutes,
  ...learnRoutes,
  ...companyRoutes,
  ...legalRoutes,
];

/** Footer link groups. */
export const footerGroups: Array<{ heading: string; routes: RouteMeta[] }> = [
  { heading: "Product", routes: productRoutes },
  { heading: "Learn", routes: [...learnRoutes, ...companyRoutes] },
  { heading: "Legal", routes: legalRoutes },
];
