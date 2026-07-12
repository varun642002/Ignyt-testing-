# Ignyt

A full training system for strength, cardio, mobility, nutrition, and HYROX race prep — built as an installable PWA (and packageable as an Android APK via Capacitor). No build step: plain HTML, CSS, and ES modules, deployable directly to GitHub Pages.

## Structure

```
IGNYT-training/
├── index.html
├── manifest.json
├── sw.js                  Service worker (cache-first assets, network-first app shell)
│
├── css/
│   ├── styles.css         CSS variables (dark + light theme), resets, app shell
│   ├── components.css     Every named UI component (cards, buttons, set tables, menus…)
│   ├── utilities.css      Small generic reusable classes
│   └── responsive.css     Media queries (currently just prefers-reduced-motion —
│                           the app is a single mobile-first layout with no viewport
│                           breakpoints yet)
│
├── js/
│   ├── app.js              Entry point — boot sequence, global error handling
│   ├── ui.js                Every screen's render function + event-listener wiring
│   ├── storage.js          localStorage, app state, persistence, migrations, backups
│   ├── workout.js          HYROX plan, Race Mode, PRs, achievements, session logic
│   ├── nutrition.js        Food/water logging, macros, body-metric calculators
│   ├── timer.js             Rest/session/race timers, wake lock, audio/vibration
│   ├── charts.js            Sparkline, weekly bars, muscle radar, calendar heatmap
│   ├── settings.js         Theme + the Settings tab
│   ├── utils.js              CSV parsing, date/duration formatting, unit conversion,
│   │                         debounce, icon rendering, plate-math
│   └── constants.js        Pure static data only — exercise library, plan structure,
│                            icons, options lists. No logic, so it imports nothing.
│
└── assets/
    ├── icons/              PWA icons (192px, 512px)
    ├── images/             (empty — reserved for future use)
    └── sounds/              (empty — reserved for future use)
```

## Module dependency notes

- `constants.js` is pure data and imports nothing — everything else may depend on it.
- Several modules import from each other in both directions (e.g. `ui.js` ↔ `workout.js`,
  `settings.js` ↔ `ui.js`). This is safe in ES modules as long as neither side calls into
  the other at module-evaluation time — only from inside functions, which is the case
  throughout this codebase. Module bindings are live, so this works correctly.
- `sw.js` lives at the root deliberately: a service worker's control scope is limited to
  its own directory unless the server sends a `Service-Worker-Allowed` header, which
  GitHub Pages has no way to set. Keeping it at root keeps the whole site covered.

## Running locally

Any static file server works (ES modules require `http://`/`https://`, not `file://`):

```
npx serve .
```

## Deploying

Push to a GitHub Pages branch/root as-is — no build step required.
