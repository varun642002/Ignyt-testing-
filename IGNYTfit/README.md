# IGNYTfit — the official IGNYT website

The public marketing and legal site for **IGNYT**, the offline-first Android
fitness app (`com.varun.ignyt`).

This repository contains **only the website**. The mobile application lives in
its own repository and no app source is vendored here.

---

## Stack

| Concern   | Choice                                                          |
| --------- | --------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack) — satisfies the "15+" target |
| Language  | TypeScript, `strict: true`                                       |
| Styling   | Tailwind CSS v4, dark-only design system                         |
| Animation | Framer Motion, gated on `prefers-reduced-motion`                 |
| Icons     | lucide-react, plus inline SVG for brand marks                    |
| Rendering | 100% static — every route is prerendered at build time           |
| Hosting   | Vercel (any static-capable host works)                           |

No analytics, no cookies, no third-party scripts, no runtime font requests.

---

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Home — hero, stats, features, how it works, app preview, comparison, CTA |
| `/features` | All sixteen capabilities, plus the principles behind them |
| `/screenshots` | Carousel and full gallery of all sixteen app screens |
| `/download` | Platforms, highlights, setup, system requirements, FAQ |
| `/blog` | Article index with category filtering |
| `/blog/[slug]` | Articles (4 published), prerendered |
| `/blog/rss.xml` | RSS 2.0 feed |
| `/resources` | Guides, reference, latest articles, support |
| `/about` | Mission, vision, problems solved, values, stack, roadmap |
| `/contact` | Support channels, contact form, FAQ, community links |
| `/privacy` | Privacy Policy |
| `/terms` | Terms & Conditions |
| `/health-data` | Health Data Policy (Health Connect compliance) |
| `/data-deletion` | Data Deletion Policy (the URL Google Play requires) |
| `/cookies` | Cookie Policy |
| `/disclaimer` | Medical, fitness, nutrition and supplement disclaimers |
| `/offline` | Offline fallback (`noindex`) |
| `/maintenance` | Maintenance page (`noindex`) |
| 404 / 500 | `not-found.tsx`, `error.tsx`, `global-error.tsx` |

Generated automatically: `/sitemap.xml`, `/robots.txt`,
`/manifest.webmanifest`, `/opengraph-image`, `/icon.svg`, `/apple-icon.png`.

---

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

| Script              | Does                                             |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Dev server with hot reload                       |
| `npm run build`     | Production build                                 |
| `npm start`         | Serve the production build                       |
| `npm run lint`      | ESLint                                           |
| `npm run typecheck` | `tsc --noEmit`                                   |
| `npm run icons`     | Regenerate PNG icons from `public/logo-mark.svg` |

---

## Documentation

| Document | Covers |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it is built, folder structure, the device mockups, animation, styling, SEO, security |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GitHub, Vercel, custom domain, Google submissions, rollback |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Conventions, common tasks, and the traps worth knowing |

---

## Project structure

```
src/
  app/                    Routes, metadata, robots/sitemap/manifest, error pages
  components/
    brand/                Logo lockup, bolt mark, third-party social glyphs
    device/               Phone frame + vector reproductions of every app screen
    home/                 Home page sections
    screenshots/          Carousel, gallery and lightbox
    contact/              Contact form
    legal/                Shared legal document layout and prose primitives
    layout/               Navbar, footer
    seo/                  JSON-LD structured data
    ui/                   Buttons, cards, sections, counters, accordion, reveals
  lib/
    site.ts               Single source of truth for URLs, email and links
    routes.ts             Route registry — drives nav, footer and sitemap
    features.ts           The sixteen features
    screens.ts            Copy and metadata for the sixteen app screens
    faq.ts                FAQ content, also used for FAQPage structured data
    seo.ts                createMetadata() — canonical, OG, Twitter, robots
```

Two rules keep it maintainable:

1. **No hard-coded URLs or email addresses** outside `lib/site.ts`.
2. **Adding a page** means adding it to `lib/routes.ts` — navigation, footer
   and sitemap update themselves.

### The app mockups

The device screens in `components/device/screens.tsx` are **vector
reproductions of the real app UI**, not raster screenshots. They are built
from the same design tokens the Android client uses (`www/css/tokens.css` in
the app repo), which means they stay sharp on every display, weigh kilobytes
instead of megabytes, and never need re-exporting when the product's colours
change.

To add a screen: add its copy to `lib/screens.ts` and its markup to
`SCREEN_COMPONENTS` in `components/device/screens.tsx`. Nothing else changes.

---

## Environment variables

All optional — the site builds with none of them set. See `.env.example`.

| Variable                       | Purpose                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`         | Canonical origin for canonical tags, OG, JSON-LD, sitemap, robots |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | Optional JSON endpoint for the contact form                       |
| `NEXT_TELEMETRY_DISABLED`      | Set to `1` to disable Next.js build telemetry                     |

Without `NEXT_PUBLIC_CONTACT_ENDPOINT` the contact form composes a pre-filled
email in the visitor's mail client, so it is useful from day one.

---

## Deployment

### 1. Push to GitHub

From this directory:

```bash
git init -b main
git add .
git commit -m "Initial commit: official IGNYT website"
gh repo create IGNYTfit --public --source=. --remote=origin --push
```

Without the GitHub CLI, create an empty `IGNYTfit` repository in the GitHub UI
(no README, no `.gitignore`) and then:

```bash
git remote add origin https://github.com/<your-username>/IGNYTfit.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to <https://vercel.com/new> and import the `IGNYTfit` repository.
2. Vercel detects Next.js — leave every build setting at its default
   (Build `npm run build`, Output `.next`, Install `npm install`).
3. Under **Environment Variables**, add `NEXT_PUBLIC_SITE_URL` with your
   production origin, for **Production** only. Leave it unset for Preview so
   preview builds use their own `VERCEL_URL`.
4. Deploy.

Or from the command line:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SITE_URL production
vercel --prod
```

Every push to `main` deploys to production; every pull request gets its own
preview URL. Preview deployments serve `robots.txt` with `Disallow: /`, so
they never compete with the canonical domain in search.

### 3. Custom domain

1. In Vercel: **Project → Settings → Domains → Add**, and enter your domain.
2. At your DNS provider, add the records Vercel shows — typically an `A`
   record for the apex domain and a `CNAME` for `www`. Use exactly the values
   the Vercel dashboard displays; they change from time to time.
3. Pick one canonical host and let Vercel redirect the other. It configures
   that automatically once both are added.
4. Update `NEXT_PUBLIC_SITE_URL` to the canonical origin and redeploy, so
   canonical tags, the sitemap and JSON-LD all agree.
5. HTTPS is provisioned automatically.

### 4. After the first production deploy

- Submit `https://<your-domain>/sitemap.xml` in Google Search Console.
- Check the Open Graph card with Facebook's sharing debugger and X's card
  validator.
- Test the structured data at <https://search.google.com/test/rich-results>.

---

## Google compliance

**OAuth branding verification.** The consent screen's homepage and privacy
policy URLs must be on the same verified domain, reachable without login, and
must present the app name and logo. This site provides:

- a public homepage at `/` showing the IGNYT name and logo;
- a public privacy policy at `/privacy` that names the app and explains
  precisely what Google account data is used and why;
- `Organization` JSON-LD carrying the logo, with the favicon and manifest
  icons generated from the same source SVG.

**Google Play.** Play requires a privacy policy URL and, for apps with
accounts, a data deletion URL:

- Privacy policy → `/privacy`
- Account and data deletion → `/data-deletion`
- Health Connect declaration support → `/health-data`

The Health Data Policy documents every data type read and written, states that
health data is never used for advertising and never sold, and explains
revocation — the points Play's Health Connect policy review looks for.

---

## Accessibility and performance

- Semantic landmarks, a skip link, and one visible focus style everywhere.
- All interactive controls are real `<button>`/`<a>` elements with accessible
  names; the carousel and lightbox support full keyboard navigation, and the
  lightbox traps focus and restores it on close.
- Every animation is gated on `prefers-reduced-motion`, in CSS and in
  JavaScript.
- Body text is ~8:1 against the background; both brand colours clear 5:1.
- Fonts are self-hosted with `display: swap`, so there is no web-font layout
  shift.
- Off-screen gallery sections use `content-visibility: auto`.
- Every route is static, so TTFB is CDN-edge latency.

Run Lighthouse against a **production** build (`npm run build && npm start`) —
the dev server's unminified bundles and HMR overhead make dev-mode scores
meaningless.

## Security headers

Set in `next.config.ts` and applied to every response: a strict
`Content-Security-Policy` (no third-party origins), `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
`Strict-Transport-Security` with preload, and `poweredByHeader: false`.

---

## Licence

© IGNYT. All rights reserved. The IGNYT name, logo and brand assets are not
covered by any open-source licence.
