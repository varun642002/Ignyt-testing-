# Testing

## Browser automation

Playwright configuration is in `playwright.config.js`. It serves the real `www/` bundle with a local static server and defines Chromium, Firefox, WebKit, mobile Chrome-like, and mobile Safari-like projects.

```bash
npm test
npm run test:smoke
npm run test:regression
npm run test:accessibility
npm run test:visual
npm run test:ui
npm run test:report
```

The suite includes smoke, navigation, route rendering, accessibility, performance, and opt-in visual tests. Test fixtures isolate localStorage/sessionStorage and should never invoke product reset controls against real user data.

Visual comparisons require reviewed baselines. Set `VISUAL_BASELINES=1` and use Playwright’s `--update-snapshots` process to create or intentionally update them; do not accept snapshots blindly.

Reports are configured as HTML, JSON, and JUnit outputs. Failure screenshots, videos, and traces are retained under ignored report/result directories.

## Static checks

Use JavaScript syntax checks for changed browser scripts where useful:

```bash
node --check www/app.js
node --check www/sw.js
```

## Android build verification

After applicable web tests pass:

```bash
npx cap sync android
cd android
./gradlew clean assembleDebug
```

CI has Android build and Playwright workflow files under `.github/workflows/`.

## What requires a real device

Playwright and a debug build do not verify:

- Real Health Connect data and permissions.
- Android lifecycle or Kotlin/Capacitor bridges.
- Physical-device Google sign-in/Firebase state.
- Native notifications, sharing, and Drive authorization/restore.
- Actual user health records.

Record browser, build, and device results separately. See `AGENTS.md` for the project’s workflow and truthful-test-reporting rules.
