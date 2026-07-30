# Contributing

Conventions that keep this codebase consistent, and the traps worth knowing
about before you change something.

---

## Getting set up

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run format      # Prettier
npm run lint        # ESLint (Next + React Hooks rules)
npm run typecheck   # tsc --noEmit
npm run build       # must produce 30 prerendered routes
```

CI runs the same four. There is no test suite — for a static content site the
build *is* the test, since a broken import, a bad type or an unresolvable
route all fail it.

---

## Common tasks

### Add a page

1. Create `src/app/<route>/page.tsx`.
2. Export `metadata` built with `createMetadata()` from `lib/seo.ts`.
3. Add the route to the appropriate group in `lib/routes.ts`.

Step 3 wires it into navigation, the footer and the sitemap. Skip it and the
page exists but nothing links to it.

### Add a blog article

Append to `posts` in `lib/blog.ts`. The slug becomes the URL, the article is
prerendered by `generateStaticParams`, and it appears in the index, the
sitemap, the RSS feed and the "latest" list on `/resources` automatically.

Article bodies are typed blocks (`p`, `h2`, `h3`, `ul`, `ol`, `callout`,
`quote`). Adding a new block type means adding a case to `PostBody` — the
compiler will tell you.

### Add an app screen

1. Add its copy to `screens` in `lib/screens.ts` and its id to `ScreenId`.
2. Add the matching component to `SCREEN_COMPONENTS` in
   `components/device/screens.tsx`.

The union type makes step 2 mandatory: the build fails until the id has
visuals.

Screens are authored against a 280×606 grid. **Check that content fits** — a
screen taller than the grid gets clipped at the device bezel. `ScreenBody`
takes a `tight` prop for dense screens.

### Change a colour

Edit the `@theme` block in `globals.css`. Tokens mirror the Android client's
`www/css/tokens.css`; change the app first, then mirror it here, so the two
do not drift.

Any colour used for text must clear **4.5:1** against the darkest *and*
lightest surface it appears on. `--color-text-dim` was lightened twice for
exactly this reason.

---

## Conventions

**Naming.** Components are `PascalCase.tsx`, everything in `lib/` is
`camelCase.ts`. Data files are plural (`features.ts`, `screens.ts`, `posts` in
`blog.ts`).

**No hard-coded URLs, emails or version numbers** outside `lib/site.ts`.

**Server components by default.** Add `"use client"` only when you need state,
effects or event handlers. If you are adding it to render an icon, you do not
need it.

**Semantic HTML first.** Lists are `<ul>`/`<li>`, buttons are `<button>`,
links are `<a>`/`<Link>`. `RevealGroup` and `RevealItem` take an `as` prop so
animation wrappers do not break list semantics — a `<div>` between `<ul>` and
`<li>` is invalid, and screen readers stop announcing the list.

**Accessibility is not optional.** Every interactive element needs an
accessible name, one `<h1>` per page, no skipped heading levels, and the
focus-visible outline stays. Dialogs trap focus and restore it on close.

**Every animation checks `useReducedMotion()`.**

---

## Traps

These each cost real debugging time. They are documented here so they cost it
only once.

### Do not hand-write vendor prefixes in CSS

Lightning CSS collapses a standard + prefixed pair to whichever it thinks the
targets need. With the prefixed form written last, it **discards the standard
property**. That shipped a navbar with no `backdrop-filter` in Firefox — a
62%-transparent bar you could read the page through. Write the standard
property; the build handles prefixes.

### Two Tailwind utilities for the same property fight by stylesheet order

`className="gap-2"` does not override a component's built-in `gap-2.5`;
whichever appears later in the generated stylesheet wins, regardless of the
order in the attribute. Expose a prop instead — see `ScreenBody`'s `tight`.

### AnimatePresence exit children render from a props snapshot

A component being animated out no longer receives parent updates. Anything
that must change *at the moment of closing* — especially `pointer-events` on
a full-screen overlay — belongs on a plain, always-mounted parent, not on the
animated child. Otherwise a stalled exit leaves an invisible element eating
every click on the page.

### Reveals use `once: true`

If you script scrolling (screenshots, tests), scroll in small steps with a
pause. Fast programmatic jumps outrun the IntersectionObserver and leave
sections permanently hidden.

### Framer's `initial` is server-rendered

Which means no-JS visitors see `opacity: 0` forever. The `<noscript>` rule in
the root layout handles it. If you add a new animation pattern, check it still
does.

---

## Content standards

This site supports a Google Play listing and an OAuth branding review, so the
copy carries real consequences.

- **No invented numbers.** Every figure on the site traces to the app: 3,160
  is the row count of the bundled food database; 17 is the number of Health
  Connect read permissions the Android client declares; the version comes from
  `build.gradle`. If you cannot point at the source, do not publish it.
- **No fabricated testimonials, ratings or user counts.** Beyond being
  dishonest, fake reviews breach Play policy — and this site exists partly to
  pass that review.
- **No medical claims.** Blog articles are general education and carry a
  standing disclaimer. IGNYT is not a medical device and the copy must never
  imply otherwise.
- **No competitor comparisons by name.** `/` compares *approaches*, not named
  products, for accuracy and policy reasons alike.

---

## Commits and pull requests

Write commit messages that explain **why**, not what — the diff already shows
what. If you fixed a bug, say what the user-visible symptom was, so the next
person recognises it if it returns.

Keep pull requests to one concern. A PR that renames files *and* changes
behaviour is one nobody can review properly.
