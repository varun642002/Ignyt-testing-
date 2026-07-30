import { absoluteUrl, site } from "@/lib/site";

/**
 * Renders a JSON-LD block.
 *
 * `JSON.stringify` output is escaped for `</script>` before it reaches the
 * DOM, which is the one XSS vector this pattern has. All input here is
 * build-time constant, but the escape is kept so the component stays safe if
 * it is ever handed dynamic data.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const publisher = {
  "@type": "Organization",
  "@id": absoluteUrl("/#organization"),
  name: site.name,
  url: site.url,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/icon-512.png"),
    width: 512,
    height: 512,
  },
  email: site.email.support,
  sameAs: [
    site.links.github,
    site.links.instagram,
    site.links.x,
    site.links.linkedin,
  ],
};

/**
 * Organization + WebSite graph. Rendered once, in the root layout, so every
 * page inherits publisher identity — this is what Google's OAuth branding
 * review and rich-result tooling look for.
 */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    publisher,
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: site.url,
      name: site.name,
      description: site.description,
      publisher: { "@id": absoluteUrl("/#organization") },
      inLanguage: "en",
    },
  ],
};

/** SoftwareApplication schema for the Android app itself. */
export const appSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": absoluteUrl("/#app"),
  name: site.name,
  applicationCategory: "HealthApplication",
  applicationSubCategory: "Fitness",
  operatingSystem: `Android ${site.app.minAndroid} and later`,
  url: site.url,
  downloadUrl: site.links.play,
  installUrl: site.links.play,
  softwareVersion: site.app.version,
  image: absoluteUrl("/icon-512.png"),
  description: site.description,
  publisher: { "@id": absoluteUrl("/#organization") },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Workout tracking",
    "Food logging and calorie counting",
    "Macro and micronutrient tracking",
    "Diet plans",
    "Intermittent fasting timer",
    "Water tracker",
    "Supplement tracker",
    "Weight and body measurements",
    "Progress analytics",
    "Android Health Connect integration",
    "Smart reminders",
    "Cloud backup",
    "Offline support",
  ],
};

/** Breadcrumb trail for a sub-page. Home is always the first crumb. */
export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map(
      (item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      }),
    ),
  };
}

/** FAQPage schema — used by the contact page's FAQ section. */
export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Schema for the legal suite, which Google treats as policy documents. */
export function legalSchema(name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${name} · ${site.name}`,
    url: absoluteUrl(path),
    dateModified: site.legalUpdated,
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
  };
}
