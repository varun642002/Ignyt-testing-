# Original Feature Request

**Task ID:** IGNYT-UX-IMPROVEMENTS-002
**Supersedes active request:** the master redesign (IGNYT-MASTER-REDESIGN-001) is implementation-complete through Phase 7; this is a follow-up UX/bug-fix batch.

## User Request (verbatim summary)

1. Remove the long "Your Profile" form from the Profile/Log-Weight page; replace with two premium sections: Log Weight + Calculator.
2. Log Weight card: current weight, last updated, Add Weight button, weight trend graph, last-7-days summary, highest, lowest, View Weight History. NO body fat %, height, gender, age, goal, activity, equipment, hyrox (those move to Settings/Profile).
3. Calculator section below Log Weight: cards for BMI, BMR, TDEE, Daily Calories, Macro + "View All Calculators" opening the dedicated calculator page; master-UI card style.
4. My Routines: larger, semi-bold, better spacing/padding, prevent truncation, wrap to a second line, responsive.
5. Workout search keyboard bug: keyboard dismisses+reopens on every keystroke. Find and fix the ROOT CAUSE (no hacks). Keyboard must stay open, input never loses focus, results update without closing keyboard, no flicker/focus jumps.
6. Search performance: instant filtering, debounce only if necessary, no unnecessary renders, preserve focus.
7. UI consistency: new sections follow the global design system (cards, blue accent, rounded, shadows, spacing, typography, responsive, light+dark).
8. Preserve everything: workout history, routines, Health Connect, nutrition, AI Coach, progress, achievements, PRs, body photos, weight history, calculator formulas.
9. Validate + report: files modified, root cause of keyboard bug, solution, test results, remaining issues.
