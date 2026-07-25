# Roadmap

This roadmap contains only work explicitly identified in current source comments, placeholders, or project workflow documents. It is not a promise of delivery dates.

## Existing work that needs verification

- Complete independent browser testing of the current Playwright suites and keep results in workflow artifacts.
- Run applicable Capacitor sync/Android build verification after web changes.
- Test Health Connect, native permissions, Google sign-in, notifications, sharing, Drive backup/restore, and native lifecycle on real Android devices.

## Source-identified future increments

### Health data protection

`js/health/health-security.js` currently provides placeholder app-lock/secure-storage interfaces. Its source identifies PIN/biometric gating, Android Keystore-backed encryption, and a persisted encryption design as future work.

### Body Scan AI

`js/health/body-scan-ai.js` is an honest unavailable interface. A future implementation requires selecting a specific model/approach before adding body-composition analysis. The current app must not present a fabricated analysis result.

### Health Hub modules

The Health Hub catalog contains reuse entries for existing functionality and stub entries for unavailable modules. Implement a stub only after defining its data model, privacy/storage behavior, UI, and verification plan.

### Health report extraction

`js/health-uploads.js` explicitly does not implement automated OCR or PDF text extraction. Any addition must retain a mandatory user review step before health values are stored.

### Security and maintainability

- Audit all dynamic HTML interpolation and URLs/file previews for consistent escaping/sanitization.
- Define a formal persistent-storage schema/migration/backup registry.
- Incrementally extract `www/app.js` only with feature-level regression coverage; it currently owns high-impact state, rendering, and handlers.
- Decide and document the retirement or migration path for the root legacy application so the repository has one clear production web source.

## Non-goals

No new feature is implied by this document. Work must preserve existing data and functionality, follow `AGENTS.md`, and distinguish browser, build, and real-device verification.
