# Architecture

How IGNYTfit is put together, and the reasoning behind the decisions that are
not obvious from reading the code.

---

## Shape of the thing

A statically generated Next.js App Router site. Every route is prerendered at
build time — there is no database, no API layer, no request-time rendering and
no server state. What ships is HTML, CSS, a small JS bundle, and a handful of
icons.

That constraint is deliberate. A marketing and legal site has no reason to run
code per request, and making it impossible to do so removes an entire class of
production incident.

```
Build ──► 30 prerendered routes ──► CDN
                                     │
                            (no origin to fail)
```

---

## Folder structure

```
src/
  app/                      One directory per route (App Router)
    layout.tsx              Root shell: fonts, metadata, nav, footer, JSON-LD
    page.tsx                Home
    <route>/page.tsx        Each marketing / legal page
    blog/[slug]/page.tsx    Article pages, prerendered via generateStaticParams
    blog/rss.xml/route.ts   RSS feed, force-static
    robots.ts               → /robots.txt
    sitemap.ts              → /sitemap.xml
    manifest.ts             → /manifest.webmanifest
    opengraph-image.tsx     → /opengraph-image (generated at build)
    icon.svg, icon1.png,    Favicon set, picked up by the metadata API
      apple-icon.png
    not-found.tsx           404
    error.tsx               500 (route-level boundary)
    global-error.tsx        500 for failures in the root layout itself
    offline / maintenance   Standalone states, both noindex

  components/
    brand/                  Logo lockup, bolt mark, third-party social glyphs
    device/                 Phone frame + vector reproductions of the app UI
    home/                   Home page sections
    screenshots/            Carousel, gallery, lightbox
    blog/                   Article rendering and the filterable index
    contact/                Contact form
    legal/                  Legal document shell and prose primitives
    layout/                 Navbar, footer
    seo/                    JSON-LD helpers
    ui/                     Buttons, cards, sections, counters, accordion, reveals

  lib/
    site.ts                 URLs, email, store links, app version — one source
    routes.ts               Route registry (drives nav, footer, sitemap)
    features.ts             The sixteen product features
    screens.ts              Copy for the sixteen app screens
    blog.ts                 Article content as typed blocks
    faq.ts                  FAQ content, also feeds FAQPage structured data
    seo.ts                  createMetadata(): canonical, OG, Twitter, robots
    utils.ts                cn()
```

### Two rules that keep it from rotting

1. **No hard-coded URLs, email addresses or version numbers outside
   `lib/site.ts`.** When the app shipped 1.0.35 there was exactly one line to
   change; before that constant existed, three files disagreed.
2. **Adding a page means adding it to `lib/routes.ts`.** Navigation, the
   footer and the sitemap all read from that registry, so there is no second
   list to forget.

---

## Content as data, not markup

Features, app screens, FAQ entries and blog articles all live in `lib/` as
typed arrays, and components render them. This is why:

- **Copy edits do not touch layout code.** Changing a feature description is a
  one-line change in a data file.
- **The compiler enforces completeness.** `ScreenId` is a union; adding a new
  screen id is a build error until both its copy and its visuals exist.
- **Structured data cannot drift from the page.** The FAQ rendered on
  `/contact` and the `FAQPage` JSON-LD are generated from the same array, so
  they cannot disagree — which is exactly the kind of mismatch search consoles
  flag.

Blog articles are typed content blocks rather than MDX. For a dozen articles,
MDX would add a toolchain, a parser and a class of runtime failure in exchange
for authoring convenience we do not need. A malformed article here is a build
error.

---

## The device mockups

`components/device/` reproduces the IGNYT app UI as vectors and text — not as
screenshots.

- **Sharp everywhere.** They are DOM, so they render at the device's native
  resolution rather than at whatever a PNG was exported at.
- **Kilobytes, not megabytes.** Sixteen screens cost less than one phone-sized
  screenshot would.
- **They cannot go stale.** They are built from the same colour tokens as the
  app (`www/css/tokens.css` in the app repo), so a brand change propagates
  instead of requiring sixteen re-exports.

Sizing works through one custom property. `PhoneFrame` lays the device out at a
fixed 296×622 design grid and scales the whole thing with a `transform`, driven
by `--pw`:

```tsx
<PhoneFrame className="[--pw:250px] xl:[--pw:300px]">
```

That means responsive device sizing with no JavaScript measurement, and
identical proportions at every breakpoint.

**The clipper is load-bearing.** The scaled element is laid out at full size
and only *painted* smaller, so below `--pw: 296px` its layout box spills past
the container and drags the document's scroll width with it. The
`overflow-hidden` wrapper removes nothing visible and prevents horizontal
scroll on mobile.

---

## Animation

Framer Motion, with two rules.

**Everything is gated on `prefers-reduced-motion`,** in CSS (a global
`@media` block) and in JavaScript (`useReducedMotion()` in each animated
component). Reduced motion is not a degraded experience here — components
render their final state directly.

**Reveals must survive having no JavaScript.** Framer server-renders each
reveal wrapper's `initial` state as an inline `opacity: 0` and clears it from
the client. Without JS that never happens, so a `<noscript>` rule in the root
layout forces those elements visible. This was a real defect, found by
screenshotting the site rather than by reading it.

### Two Framer behaviours worth knowing before editing

- **An exiting `AnimatePresence` child renders from a snapshot of its last
  props.** Neither a `style` prop nor a parent re-render reaches it. The
  lightbox keeps `pointerEvents` on a *plain, always-mounted parent* for this
  reason: if an exit animation ever stalls, a transparent full-screen overlay
  must not silently swallow every click on the page.
- **Reveals use `once: true`.** Fast programmatic scrolling can outrun the
  IntersectionObserver and leave a section hidden. Real scrolling is fine; if
  you are automating screenshots, scroll in small steps.

---

## Styling

Tailwind v4 with a `@theme` block in `globals.css`. Colour tokens mirror the
Android client so the site and the product read as one brand.

**Do not hand-write vendor prefixes.** Lightning CSS, which Tailwind v4 runs,
collapses a standard + prefixed pair down to whichever form it believes the
build targets need — and with the prefixed declaration written last it will
discard the standard one. That shipped a navbar with no `backdrop-filter` in
Firefox. Declare the standard property; the build adds prefixes.

Two utilities carry non-obvious cost:

- `.cv-auto` (`content-visibility: auto`) lets the browser skip layout and
  paint for off-screen gallery sections. It is why `/screenshots` renders
  sixteen device mockups without stalling.
- `overflow-x: clip` on `html` is a safety net for the decorative bloom
  layers, which are deliberately wider than the viewport. `clip` rather than
  `hidden` so it does not become a scroll container and break `sticky`.

---

## Server and client boundary

Almost everything is a server component. Client components are the ones that
genuinely need state or events:

| Component | Why it is a client component |
| --- | --- |
| `Navbar` | Scroll state, mobile sheet, focus and scroll-lock management |
| `Reveal*` | IntersectionObserver |
| `Counter` | Animation frame loop |
| `Accordion` | Open/closed state |
| `PhoneCarousel` | Index state, keyboard, drag, autoplay |
| `Lightbox` | Dialog state, focus trap, keyboard |
| `ContactForm` | Form state and validation |
| `BlogIndex` | Category filtering |

The device screens are deliberately **hook-free**, so they can be rendered
from a server component *and* imported into the client carousels without
dragging extra runtime into the bundle.

---

## SEO

`lib/seo.ts` exposes one `createMetadata()` helper that every page calls. It
produces the canonical URL, Open Graph, Twitter card and robots directives
from a single input, which is why no page is missing a canonical tag — there
is no path through the code that produces metadata without one.

Structured data lives in `components/seo/JsonLd.tsx`:

| Schema | Where |
| --- | --- |
| `Organization` + `WebSite` | Root layout (every page) |
| `SoftwareApplication` | Home, Features, Download |
| `BreadcrumbList` | Every sub-page |
| `FAQPage` | Contact |
| `Blog` / `BlogPosting` | Blog index and articles |
| `WebPage` | Legal suite |

---

## Security

A strict CSP set in `next.config.ts`, with no third-party origins allowed at
all — the site loads no analytics, no tag manager, no CDN scripts and no
runtime fonts, so everything can be locked to `'self'`.

`'unsafe-inline'` is required on `script-src` for the Next.js bootstrap and
flight data. Using a nonce instead would force every response to be
dynamically rendered, trading full static generation for a marginal gain
against a site with no user input and no third-party script surface.
`'unsafe-eval'` is added in development only, where React needs it.
