# Original Feature Request

**Task ID:** IGNYT-PLAYWRIGHT-ENTERPRISE-001
**Status:** PLANNED — implementation requires the approved plan below.

## Requested outcome

Create a production-quality, enterprise-grade Playwright automation framework for the existing IGNYT fitness application. The framework must test the real vanilla HTML/CSS/JavaScript application; it must not create a demo, redesign the UI, add placeholder pages, or invent unsupported product behaviour.

The requested framework includes Page Object Model classes, fixtures, helpers, utilities, deterministic test data, smoke/navigation/feature/regression/accessibility/performance/visual suites, cross-browser and mobile projects, CI, and HTML/JSON/JUnit reports with screenshots, video, and traces.

## Confirmed repository facts at planning time

- Canonical Capacitor web directory is `www/` (see `capacitor.config.json`); browser tests must serve `www/index.html`.
- `www/index.html` loads `www/app.js` plus the page, health, cloud, auth, and storage modules. UI navigation is state-driven via `data-nav`; the application does not currently expose `data-testid` selectors.
- The app is offline-first and persists real user data in `localStorage`; body photos, health uploads, and health data also use IndexedDB.
- Native Capacitor, Health Connect, Google sign-in/auth, native share/notifications, and cloud backup paths exist, but real native behaviour cannot be verified by a browser suite.
- Existing uncommitted Playwright-related files are a minimal scaffold, not an approved or complete framework. They and all unrelated work must be preserved and carefully evolved rather than discarded.

## Non-negotiable constraints

1. Preserve every existing application feature and user data. Tests must use isolated browser contexts/storage and must never run the application’s reset/delete-all-data controls against a user profile.
2. Test only capabilities evidenced in the code. Unsupported requested examples (for example barcode scanning) must be marked `not implemented / not applicable`, not mocked as product functionality.
3. Use stable, accessible selectors first. Add narrowly-scoped `data-testid` attributes only where an existing semantic selector cannot be stable; do not use brittle XPath or text-only selectors when a semantic locator is available.
4. Do not claim browser tests validate Health Connect sync, Android permissions/lifecycle, native bridges, physical-device authentication, native notifications, or actual health records.
5. No commit, push, Android sync, or Android build is authorized by this request. Those require their respective approved workflow steps.

## Acceptance criteria

The completed implementation must meet every acceptance criterion in `PLAN.json`, pass independent browser validation, and accurately distinguish browser verification from real-device-only verification.
