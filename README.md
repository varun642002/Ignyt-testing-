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
│   ├── storage.js          localStorage, app state, persistence, migrations, backups
│   ├── workout.js          HYROX plan, Race Mode, PRs, achievements, session logic
│   ├── nutrition.js        Food/water logging, macros, body-metric calculators
│   ├── timer.js             Rest/session/race timers, wake lock, audio/vibration
│   ├── charts.js            Sparkline, weekly bars, muscle radar, calendar heatmap
│   ├── settings.js         Theme + the Settings tab
│   ├── utils.js              CSV parsing, date/duration formatting, unit conversion,
│   │                         debounce, icon rendering, plate-math
│   ├── constants.js        Pure static data only — exercise library, plan structure,
│   │                        icons, options lists. No logic, so it imports nothing.
│   └── ui/
│       ├── index.js         render()/renderErrorScreen(), the remaining full-tab
│       │                    screens, and attachHandlers() — wires up every DOM
│       │                    event listener after each render
│       ├── dashboard.js     Home tab: greeting, today's plan, celebration banners
│       ├── navigation.js    App shell: header, bottom nav, the More sheet
│       ├── modals.js        Add Exercise picker, plate popover, rest-timer overlay
│       ├── forms.js         Onboarding, routine builder, custom-exercise form, calculators
│       ├── tables.js        Session set-by-set breakdown, exercise history table
│       ├── charts-ui.js     Progress/Body/Nutrition tabs (charts.js primitives + UI chrome)
│       ├── toast.js         Non-blocking notification — replaces native alert()
│       └── dialogs.js       In-app confirmation — replaces native confirm()
│
└── assets/
    ├── icons/              PWA icons (192px, 512px)
    ├── images/             (empty — reserved for future use)
    └── sounds/              (empty — reserved for future use)
```

## Toast & confirm dialog

`js/ui/toast.js` and `js/ui/dialogs.js` are real, working replacements for the browser's native
`alert()`/`confirm()` — a non-blocking corner notification and an in-app confirmation dialog
respectively, styled to match the rest of the app. Every `alert()`/`confirm()` call in normal
app flow (CSV import results, notification errors, deleting a workout, resetting all data,
leaving/aborting a race) now goes through these. `confirmDialog()` is Promise-based, so call
sites read almost the same as the `confirm()` they replaced: `if (await confirmDialog(message))`.

One deliberate exception: `renderErrorScreen()` (the crash-recovery screen) still uses native
`alert()`/`confirm()`. That screen exists specifically for when the app has already broken in
some unknown way, so it intentionally avoids depending on the normal render pipeline — using
the state-driven toast/dialog system there would defeat the point of a maximally-resilient
last-resort screen.

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
