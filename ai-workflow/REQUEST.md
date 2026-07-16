# Original Feature Request

**Task ID:** IGNYT-MASTER-REDESIGN-001
**Planner:** User-supplied master prompt (`C:\Users\varun\Downloads\REQUEST.md`), adopted verbatim as the active request per its own instruction to "update and follow [ai-workflow files] according to the repository's established rules."
**Supersedes / pauses:** `IGNYT-EXERCISE-IMAGES-001` (see `PLAN.json` history below) — that plan was approved but not yet implemented (only the `ai-workflow/` scaffolding itself had been created). It is paused, not discarded, and can resume after this task.
**Primary visual reference:** `ai-workflow/references/ignyt-master-ui-reference.jpeg` (10-panel light-theme screenshot set: AI Coach empty state, Progress, Nutrition Overview, Workout list, Home, Workout Analytics, Nutrition Meals, Start Workout, AI Coach chat).

## User Request

Full verbatim master prompt received from the user — see conversation history. Summary: redesign and restructure the existing IGNYT fitness application into one coherent premium light/dark design system (light-theme primary reference: cool blue-gray background, white elevated cards, bright blue primary accent) applied across every existing screen, plus a set of explicit functional restructuring requirements:

- Global design system (centralized tokens, light theme primary + adapted dark theme, blue primary accent).
- Home: simplify "Today's Progress" to Steps + Total Calories Burned only (remove Protein/nutrition metrics from that specific card).
- Workout: routines move onto the Workout page itself (not hidden in Plan); main page shows only the 2 most recent sessions + "Show All" for full history; Start Workout screen redesign.
- Default rest timer for new exercise configs changes to 0s; existing custom rest durations preserved.
- Profile consolidation: personal info, body & fitness info, log weight, weight history, body-progress photos, Personal Records, Achievements all reachable from Profile.
- Remove Body Fat % from the Log Weight UI (historical data preserved).
- Body-progress photo storage (date, optional note, category, view, delete) using appropriate device storage (not base64 in localStorage).
- Progress page restructuring + Habit Tracker (create/edit/delete habits, mark complete, streaks, history) added to Progress; redundant Nutrition Progress content removed from Progress (core Nutrition page untouched).
- Nutrition: Overview/Meals/Insights structure, preserve all existing calorie/macro/water functionality.
- AI Coach: visual consistency with the rest of the app; no fabricated AI responses without a real backend.
- Calculator consolidation into one clear location; avoid duplication.
- Full mobile responsiveness (320-430px), no overflow/clipping/collision.
- Zero data loss; safe migrations only; no fabricated data anywhere.

## Non-Negotiable Requirements (carried over from the master prompt and AGENTS.md)

- Preserve every existing IGNYT feature; do not remove, hide, disable, rename, or make inaccessible.
- Preserve all existing user data (workout history, routines, plans, HYROX schedules, nutrition/food log, progress/insights, AI Coach, profile, settings, Firebase auth/cloud sync, Health Connect, localStorage, service worker/offline behavior).
- Do not fabricate health, workout, nutrition, or progress data.
- Do not fabricate AI responses without a real backend.
- Any storage schema change requires a safe, backward-compatible migration; never clear user storage to solve a migration problem.
- Reference image governs *visual* decisions; explicit written functional requirements in the master prompt govern *functional/data* decisions when the two conflict (see PLAN.json "resolved conflicts" for the two cases found).
