# Contributing to IGNYT

## Before changing code

1. Read `AGENTS.md`, [ARCHITECTURE.md](ARCHITECTURE.md), and relevant workflow artifacts in `ai-workflow/`.
2. Check `git status` and current branch. Preserve unrelated uncommitted work.
3. Confirm whether the change belongs in the canonical `www/` bundle, Android host, or test framework. Do not assume the root legacy source ships.

## Development principles

- Preserve all existing features and user data.
- Make the smallest safe change for the approved scope.
- Do not rename persistent `hx_*` keys without a backward-compatible migration.
- Do not fabricate workout, nutrition, progress, or health records.
- Avoid UI redesigns in maintenance/refactor changes.
- Use source-evidenced behavior only. If a feature is explicitly unavailable, keep that status honest.

## JavaScript conventions

- The production scripts are ordered global scripts. Add shared runtime scripts to `www/index.html` before consumers.
- Add offline-required scripts/assets to `www/sw.js` and update cache versioning through the project’s approved release process.
- Prefer reusable helpers over copied `localStorage`, escaping, or formatting logic.
- Keep `app.js` changes focused; it is a high-impact global renderer.
- Escape user-controlled values before inserting them into HTML strings.

## Testing and review

- Run the smallest relevant browser tests, then broader tests proportionate to risk.
- Record actual outcomes; do not claim real-device validation from browser tests or a Gradle build.
- For Android-impacting web changes, run Capacitor sync and build only when that workflow step is applicable.
- Review `git diff` and `git diff --check` before handoff.

## Git rules

- Use feature branches; never push directly to `main`, force-push, or rewrite history.
- Do not commit `node_modules`, build outputs, APKs, credentials, or `.env` files.
- Do not commit or push unless explicitly authorized.
