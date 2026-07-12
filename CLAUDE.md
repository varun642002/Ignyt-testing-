\# IGNYT Autonomous Development Instructions



You are working on the IGNYT Android fitness application.



\## Project identity



Project directory:

C:\\Users\\varun\\Downloads\\Ignyt-testing-



Git remote:

origin



GitHub repository:

varun642002/Ignyt-testing-



Android package:

com.varun.ignyt



Current confirmed configuration:

\- Capacitor 8.4.1

\- Health Connect dependency exactly 1.1.0

\- minSdk 26

\- compileSdk 36

\- targetSdk 36

\- Android Gradle Plugin 8.13.0

\- Gradle 8.14.3

\- Java JVM target 21

\- Kotlin JVM target 21



\## Mandatory workflow for every feature request



Before modifying anything:



1\. Read this CLAUDE.md file.

2\. Run git status.

3\. Inspect the current project files relevant to the request.

4\. Inspect existing implementations before changing them.

5\. Never assume a function, file, localStorage key, route, or API exists without checking.

6\. Never modify main directly for feature development.



\## Git branch requirements



For every new feature request:



1\. Start from the current working main branch.

2\. Create a descriptive feature branch, for example:



&#x20;  feature/automatic-health-sync

&#x20;  feature/food-log-health-calories

&#x20;  feature/health-insights



3\. Never push feature changes directly to main.

4\. Never force push.

5\. Never automatically merge into main.

6\. Never delete remote branches.

7\. Never rewrite Git history.



\## Implementation requirements



Implement the complete requested feature using the real existing project architecture.



Preserve all unrelated working functionality.



Do not:

\- Rewrite the application unnecessarily.

\- Replace index.html blindly.

\- Replace sw.js blindly.

\- Delete existing localStorage data.

\- Rename existing storage keys without a migration.

\- Introduce fake health data.

\- Introduce fake charts.

\- Break Health Connect.

\- Break Steps.

\- Break Food Log.

\- Break workout export.

\- Break weight export.

\- Cause a blank screen.



\## Health Connect safety



Keep exactly:



androidx.health.connect:connect-client:1.1.0



Do not upgrade it.



Preserve:

\- Existing Steps implementation unless a verified bug requires a change.

\- Existing permissions.

\- Partial permission handling.

\- Real Health Connect data only.



Do not change without explicit authorization:

\- minSdk 26

\- compileSdk 36

\- targetSdk 36

\- AGP 8.13.0

\- Gradle 8.14.3

\- Java target 21

\- Kotlin target 21

\- Package com.varun.ignyt



\## Mandatory build process



After implementing a feature:



1\. Run:



&#x20;  npx cap sync android



2\. Then build:



&#x20;  cd android

&#x20;  .\\gradlew.bat clean assembleDebug



3\. If the build fails:

&#x20;  - Read the complete actual error.

&#x20;  - Identify the root cause.

&#x20;  - Fix only the relevant code.

&#x20;  - Run the build again.

&#x20;  - Continue until BUILD SUCCESSFUL or a genuine blocker requires user input.



4\. Do not claim success unless the actual build returns BUILD SUCCESSFUL.



\## Git commit and push automation



Only after BUILD SUCCESSFUL:



1\. Return to project root.

2\. Run git status.

3\. Review git diff.

4\. Stage only appropriate source/configuration files.

5\. Never stage:

&#x20;  - node\_modules/

&#x20;  - .gradle/

&#x20;  - android/.gradle/

&#x20;  - android/build/

&#x20;  - android/app/build/

&#x20;  - APK files

&#x20;  - AAB files

&#x20;  - secrets

&#x20;  - credentials

&#x20;  - .env files



6\. Commit with a descriptive commit message.

7\. Push the current feature branch to origin.

8\. Never push directly to main.

9\. Never force push.

10\. Never automatically merge the feature branch into main.



\## Progress recovery



Maintain a file named:



CLAUDE\_PROGRESS.md



Update it after every major stage with:



\- Current feature request

\- Current branch

\- Completed work

\- Pending work

\- Files changed

\- Build attempts

\- Current build result

\- Errors encountered

\- Fixes applied

\- Commit status

\- Push status

\- Exact next action



Before stopping for any reason, including a usage limit, update CLAUDE\_PROGRESS.md.



When resuming:



1\. Read CLAUDE.md.

2\. Read CLAUDE\_PROGRESS.md.

3\. Run git status.

4\. Run git diff.

5\. Inspect current branch.

6\. Continue from the exact unfinished task.

7\. Do not repeat completed work unnecessarily.



\## Final completion requirements



A feature is complete only when:



1\. Implementation is complete.

2\. Existing functionality is preserved.

3\. npx cap sync android succeeds.

4\. Android build returns BUILD SUCCESSFUL.

5\. Appropriate changes are committed.

6\. The feature branch is pushed to GitHub.



After completion, report:



\- Feature implemented

\- Feature branch name

\- Commit hash

\- Push result

\- Build result

\- Changed files

\- APK path

\- Known limitations

\- Testing steps for the user



Protect the current working IGNYT app above all else.

