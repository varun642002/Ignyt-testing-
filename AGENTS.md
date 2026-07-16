# IGNYT Fitness Application Rules of Engagement (AGENTS.md)

This document contains the permanent project-governance rules for all AI agents working on the IGNYT fitness application. Every agent must read, understand, and strictly follow these rules for every task.

---

## 1. PROJECT SOURCE OF TRUTH

- The actual current IGNYT codebase is the source of truth.
- Inspect actual code before making changes.
- Never assume a feature, file, API, integration, or data structure exists without verifying it.
- Never fabricate implementation or test results.

---

## 2. FEATURE PROTECTION

Never remove, disable, hide, reset, rename, corrupt, or make inaccessible any existing IGNYT feature.

Preserve all functionality actually present in the repository, including where applicable:
- Home
- Workout
- Nutrition
- Food Log
- Progress
- Insights
- AI Coach
- Health Connect
- All currently supported Health Connect metrics
- Firebase Authentication
- Firestore/cloud sync
- Google Sign-In
- Workout plans
- HYROX schedules
- Routines
- Active workouts
- Workout history
- Exercise database
- Exercise images
- Progress tracking
- Profile
- Settings
- Calculators
- Body tracking
- localStorage persistence
- Service worker and offline functionality
- Capacitor Android integration
- Kotlin native code
- JavaScript/native bridges
- Responsive and narrow-device fixes
- Every other feature actually present in the codebase

---

## 3. DATA SAFETY

Never:
- Delete existing user data without explicit approval.
- Reset workout history.
- Reset Food Log entries.
- Reset profile information.
- Reset settings.
- Reset Health Connect preferences.
- Rename persistent storage keys without backward-compatible migration.
- Corrupt existing local or cloud data.
- Fabricate health data.
- Fabricate workout data.
- Fabricate nutrition data.
- Fabricate progress data.

---

## 4. MULTI-AGENT RESPONSIBILITIES

### ChatGPT (Planner & Final Reviewer)
- Acts as the Planner and Final Reviewer.
- Understands the user's original feature request.
- Creates the contents for `ai-workflow/REQUEST.md`.
- Creates the structured `ai-workflow/PLAN.json`.
- Defines implementation steps.
- Defines acceptance criteria.
- Identifies regression risks.
- Defines browser testing requirements.
- Defines Android build requirements.
- Identifies real-device testing requirements.
- Performs final review after implementation, independent testing, and Android build verification.
- Must not perform implementation during planning unless explicitly authorized.
- Must not claim that code, browser behavior, Android builds, Health Connect, Firebase, or real-device functionality was verified unless actual evidence is provided.

### Claude Code (Coder & Bug Fixer)
- Acts as the Coder and bug fixer.
- Reads `AGENTS.md`.
- Reads approved `ai-workflow/REQUEST.md`.
- Reads approved `ai-workflow/PLAN.json`.
- Inspects the actual codebase before modifying files.
- Implements only the approved task.
- Performs at most ONE initial verification pass after implementation.
- Reads independently verified failures from `TEST_RESULTS.json`.
- Fixes verified failures using the smallest safe change.
- Updates `IMPLEMENTATION_REPORT.json`.
- Must not invent a task when no valid approved task exists.
- Must not self-approve the final implementation.
- Must not make the final approval decision.
- Must not fabricate test results.

### Playwright MCP (Independent Browser Tester)
- Independently tests browser-testable acceptance criteria.
- Tests relevant navigation and user interactions.
- Checks relevant console errors.
- Checks relevant network failures.
- Checks responsive behavior where applicable.
- Checks narrow-device overflow where applicable.
- Records actual results in `TEST_RESULTS.json`.
- Must not fabricate results.

Playwright testing must never be represented as verification of:
- Real Health Connect synchronization.
- Android runtime permissions.
- Native Kotlin behavior on a physical device.
- Physical-device Google Sign-In.
- Native notifications.
- Actual health records.

### Capacitor + Gradle (Android Build Verification)
After applicable browser tests pass, run:
```text
npx cap sync android
```
Then:
```text
cd android
.\gradlew.bat clean assembleDebug
```
- A successful build means only `BUILD VERIFIED`.
- It does not mean `REAL-DEVICE VERIFIED`.

### Real Android Device (Native Verification)
A physical Android device is required where applicable for:
- Actual Health Connect synchronization.
- Android runtime permissions.
- Native lifecycle behavior.
- Native Kotlin bridge behavior.
- Physical-device Google Sign-In.
- Native notifications.
- Actual health records.

---

## 5. STANDARD WORKFLOW

The sequential steps for every change are:
1. **Request**: User gives a feature request.
2. **Plan**: ChatGPT plans and creates `REQUEST.md` and `PLAN.json`.
3. **Implement**: Claude Code implements the approved plan.
4. **Initial Verification**: Claude performs one initial verification pass and updates `IMPLEMENTATION_REPORT.json`.
5. **Independent Testing**: Playwright MCP performs browser-level checks and writes to `TEST_RESULTS.json`.
6. **Fix**: If FAIL, Claude fixes the verified failures.
7. **Retest**: Playwright retests the affected functionality.
8. **Loop**: Repeat fix/retest loop for a maximum of 5 evidence-based fix iterations.
9. **Android Sync & Build**: `npx cap sync android`, then gradlew compilation, where applicable.
10. **Final Review**: ChatGPT reviews and determines final status: `APPROVED` / `REJECTED` / `REQUIRES_REAL_DEVICE_TESTING` / `BLOCKED`.
11. **Commit/Push**: Commit and push the branch only when explicitly authorized.

---

## 6. WORKFLOW FILES

All workflow artifacts reside in:
```text
ai-workflow/
- REQUEST.md
- PLAN.json
- IMPLEMENTATION_REPORT.json
- TEST_RESULTS.json
- FINAL_REVIEW.json
- WORKFLOW.md
```
Agents must not invent a task when no valid approved task exists.

---

## 7. TESTING TRUTHFULNESS

Clearly distinguish:
- `IMPLEMENTED`
- `STATICALLY VERIFIED`
- `INITIAL VERIFICATION COMPLETED`
- `BROWSER VERIFIED`
- `BUILD VERIFIED`
- `REQUIRES REAL-DEVICE TESTING`

Never claim something was tested unless it was actually tested. A successful Android build does not prove:
- Real Health Connect synchronization
- Android runtime permissions
- Native lifecycle behavior
- Native bridge behavior on a physical device
- Physical-device Google Sign-In
- Native notifications
- Real health records

---

## 8. FIX LOOP

When independent testing reports failures:
- Read exact failure evidence.
- Inspect console/network errors where available.
- Inspect screenshots where available.
- Identify the strongest evidenced root cause.
- Implement the smallest appropriate fix.
- Return to independent testing.

Do not make increasingly speculative changes.
- Maximum automatic fix iterations: 5.
- After 5 unsuccessful evidence-based iterations, stop, mark the task `BLOCKED`, and report the unresolved evidence.

---

## 9. GIT SAFETY

Before modifying files:
- Run `git status`.
- Confirm current branch.
- Inspect existing uncommitted changes.
- Protect unrelated work.

Never:
- Push directly to `main`.
- Automatically merge into `main`.
- Force push.
- Rewrite Git history.
- Delete remote branches.
- Commit secrets, API keys, credentials, `node_modules/`, Android build outputs, or APK files.

Always:
- Use feature branches for implementation work.
- Do not commit or push unless explicitly authorized by the workflow.

---

## 10. SCOPE DISCIPLINE

- Make the smallest safe change that fully satisfies the approved request.
- Do not perform unrelated redesigns.
- Do not perform unnecessary rewrites.
- Do not replace working functionality without a verified reason.
- Do not remove apparently unused code without checking runtime references.
- Preserve backward compatibility where practical.

---

## 11. HEALTH CONNECT

- Preserve the currently implemented Health Connect dependency version (`1.1.0`) unless an approved task explicitly requires changing it.
- Do not fabricate health records.
- Missing permission for one metric must not unnecessarily break other available metrics.
- Real Health Connect behavior requires real-device verification.

---

## 12. FINAL REVIEW

ChatGPT performs final review by comparing:
- Original `REQUEST.md`
- `PLAN.json`
- Actual `git diff`
- `IMPLEMENTATION_REPORT.json`
- `TEST_RESULTS.json`
- Android build result when applicable

Final status must be exactly one of:
- `APPROVED`
- `REJECTED`
- `REQUIRES_REAL_DEVICE_TESTING`
- `BLOCKED`
