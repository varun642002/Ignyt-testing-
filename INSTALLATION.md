# Installation

## Prerequisites

- Node.js compatible with the installed Capacitor/Playwright dependencies.
- npm.
- A static HTTP server for local web use.
- For Android: Android SDK, Java 21, and a configured Android development environment.

## Install JavaScript dependencies

```bash
npm ci
```

Install browser binaries before running browser tests:

```bash
npx playwright install
```

## Run the web application

The production application is `www/`. Serve that directory over HTTP:

```bash
python -m http.server 8080 --directory www
```

Then visit `http://127.0.0.1:8080`. Do not use `file://`, because service workers and browser APIs require an HTTP(S) origin.

## Run Android build verification

```bash
npx cap sync android
cd android
./gradlew clean assembleDebug
```

On Windows PowerShell, use `./gradlew.bat clean assembleDebug` from `android/`.

The generated debug APK, when the build succeeds, is under `android/app/build/outputs/apk/debug/`. A successful build does not prove real-device integrations.

## Firebase and Google configuration

The project can run without configured native account services; affected UI should report an unavailable/not-configured result. To enable Firebase-backed Android authentication/sync, use the project’s approved Firebase configuration process and protect credentials. Do not commit secrets or environment files.
