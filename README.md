# IGNYT 🔥

A modern fitness and workout tracking application built to help users plan workouts, monitor progress, and stay consistent with their fitness goals.

---

## Features

- 💪 Workout planner
- 📅 Training schedules
- 📊 Progress tracking
- 📈 Weekly analytics
- 🍎 Nutrition & food database
- 📥 CSV import support
- 🏋️ 1000+ exercise library
- 🎯 Hyrox training plans
- 📱 Android application (Capacitor)
- 🌐 Offline support

---

## Technology Stack

- HTML5
- CSS3
- JavaScript (ES6)
- Capacitor
- Android Studio
- Gradle

---

## Project Structure

```
IGNYT/
│
├── android/
├── assets/
├── css/
├── js/
├── images/
├── data/
├── index.html
└── README.md
```

---

## Installation

Clone the repository

```bash
git clone https://github.com/varun642002/Ignyt-testing-.git
```

Open the project

```bash
cd Ignyt-testing-
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm start
```

---

## Android Build

Build Android APK

```bash
npx cap sync
```

```bash
cd android
```

```bash
gradlew assembleDebug
```

Build Google Play Bundle

```bash
gradlew bundleRelease
```

---

## Screenshots

(Add screenshots here)

| Home | Workout | Progress |
|------|----------|-----------|
| Image | Image | Image |

---

## Current Version

Version: **1.0**

Status: **Production Ready**

Google Play Bundle: ✅

---

## Roadmap

- AI Workout Recommendations
- AI Nutrition Coach
- Wearable Device Integration
- Exercise Form Detection
- Cloud Backup
- Social Challenges
- Personal Records
- Custom Workout Builder

---

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## License

MIT License

---

## Developer

**Varun S**

MBA Business Analytics

GitHub

https://github.com/varun642002

LinkedIn

(Add your LinkedIn profile)

---

## Support

If you encounter issues or have feature requests, please open a GitHub Issue.
# IGNYT

IGNYT is an offline-first fitness application for workouts, nutrition, body tracking, progress, HYROX planning, goals, health records, and Android Health Connect integration.

The production web bundle is [`www/`](www/). Capacitor packages that directory as the Android application (`com.varun.ignyt`). Root-level HTML/CSS/JS files are a legacy parallel implementation and are not the configured Capacitor web directory.

## What is implemented

- Workout routines, exercise library, active workout sessions, set tracking, timers, workout history, PRs, achievements, and HYROX planning/race mode.
- Food logging, macros, water logging, nutrition targets, favourites, and CSV export/import where exposed by the UI.
- Body measurements, weight history, calculators, body-progress photographs, habit tracking, goals, analytics, and calendar/progress views.
- Medical-report uploads, blood-work entry/import/review, Health Hub navigation, and offline storage.
- PWA install/offline support, Android Capacitor host, Health Connect integration, Google/Firebase account support, cloud sync, Drive backup/restore, native notifications, and sharing where the required Android/native configuration is available.

See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries and runtime flow. Features marked unavailable in the UI (for example Body Scan AI) are not implemented.

## Quick start

```bash
npm ci
npx playwright install
npm test -- --list
```

To run the production web bundle locally, serve `www/` with any static HTTP server; do not open it with `file://`.

```bash
python -m http.server 8080 --directory www
```

Open `http://127.0.0.1:8080`.

For all installation, Android, and verification details, see [INSTALLATION.md](INSTALLATION.md) and [TESTING.md](TESTING.md).

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Installation](INSTALLATION.md)
- [Testing](TESTING.md)
- [Contributing](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)
- [Project analysis](PROJECT_ANALYSIS.md)
- [Refactor report](REFACTOR_REPORT.md)

## Important verification boundary

Browser tests can verify web rendering, navigation, local storage behavior, and browser fallbacks. They cannot verify real Android permissions, Health Connect synchronization, native plugin behavior, physical-device Google sign-in, native notifications, or real health records. A successful Android build is build verification only.
