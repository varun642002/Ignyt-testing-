import { test, expect } from '../fixtures/app.fixture.js';
import { WorkoutPage } from '../pages/WorkoutPage.js';
import { startSessionWithExercise } from '../helpers/workout-session.js';

test.describe('Workout module — features @workout', () => {
  test('rest timer auto-starts on completing a set and can be skipped', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    // autoStartRest defaults to true (app.js INITIAL_STATE), so a non-zero rest duration plus
    // completing a set starts the live rest-timer overlay automatically.
    await workout.setRestDuration(exi, 30);
    await workout.completeSet(exi, si);

    await expect(workout.timerOverlay).toBeVisible();
    await expect(workout.timerOverlay).toContainText(/\d+:\d{2}/);

    await workout.skipRestTimer();
    await expect(workout.timerOverlay).toBeHidden();
  });

  test('overall workout timer runs and advances', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await startSessionWithExercise(workout, 'Bench Press');

    await expect(workout.sessionElapsed).toBeVisible();
    await expect(workout.sessionElapsed).toHaveText(/^\d+:\d{2}$/);

    const first = await workout.sessionElapsed.textContent();
    // Ticks once per second (app.js's ensureElapsedTimerRunning); poll rather than a fixed
    // sleep so the assertion isn't tied to exact timing.
    await expect.poll(async () => workout.sessionElapsed.textContent()).not.toBe(first);
  });

  test('auto-saves the in-progress session to storage as it changes', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.enterWeight(exi, si, 60);
    await workout.enterReps(exi, si, 8);

    const saved = await workout.readActiveSessionFromStorage();
    expect(saved).toBeTruthy();
    expect(saved.exercises[exi].name).toBe('Bench Press');
    expect(saved.exercises[exi].sets[si].reps).toBe('8');
  });

  test('resumes an in-progress session after the app is relaunched', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.enterWeight(exi, si, 60);
    await workout.enterReps(exi, si, 8);

    const saved = await workout.readActiveSessionFromStorage();
    expect(saved).toBeTruthy();

    // The app fixture's own init script clears storage on every navigation (a clean-profile
    // guarantee for other tests). Registering a second init script re-seeds the saved session
    // right after that wipe, on every subsequent navigation -- Playwright runs init scripts in
    // registration order, so this always runs after the fixture's, before app.js boots.
    await page.addInitScript(session => {
      localStorage.setItem('hx_active_session', JSON.stringify(session));
    }, saved);

    await page.reload();
    await workout.expectBooted();
    await workout.navigateToVisibleTab('workout');

    // Still mid-session (the Finish button is only present while state.session is set) rather
    // than back at the idle Workout list.
    await expect(workout.finishButton).toBeVisible();
    await expect(workout.weightInput(exi, si)).toHaveValue('60');
    await expect(workout.repsInput(exi, si)).toHaveValue('8');
  });

  test('finishes a workout with completed work and records it to history', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.enterWeight(exi, si, 60);
    await workout.enterReps(exi, si, 8);
    await workout.completeSet(exi, si);

    const beforeCount = (await workout.readWorkoutLogFromStorage()).length;

    await workout.finishWorkout();
    await workout.closeWorkoutCompleteScreen();

    await expect(workout.finishButton).toHaveCount(0); // back at the idle list, no live session
    const log = await workout.readWorkoutLogFromStorage();
    expect(log.length).toBe(beforeCount + 1);
    expect(log[0].exercises[0].name).toBe('Bench Press');
  });

  test('workout history shows the finished session in Recent Sessions', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.enterWeight(exi, si, 60);
    await workout.enterReps(exi, si, 8);
    await workout.completeSet(exi, si);
    await workout.finishWorkout();
    await workout.closeWorkoutCompleteScreen();

    // The session row shows exercise count/duration/PRs and a muscle-group chip, not the
    // individual exercise name (app.js's sessionTitle()/sessionMuscles() -- Bench Press is a
    // Chest exercise).
    await expect(app.app).toContainText('Recent Sessions');
    await expect(workout.recentSessionRows.first()).toContainText('1 exercise');
    await expect(workout.recentSessionRows.first()).toContainText('Chest');
  });

  test('cancels (discards) a fresh workout with no completed sets', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await workout.navigateToVisibleTab('workout');
    await workout.startEmptySession();

    const beforeCount = (await workout.readWorkoutLogFromStorage()).length;

    await workout.discardEmptyWorkout();

    await expect(workout.finishButton).toHaveCount(0); // live session gone
    const saved = await workout.readActiveSessionFromStorage();
    expect(saved).toBeNull();
    const log = await workout.readWorkoutLogFromStorage();
    expect(log.length).toBe(beforeCount); // discarded, never written to history
  });

  test('"Continue Workout" backs out of the discard prompt and keeps the session open', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await workout.navigateToVisibleTab('workout');
    await workout.startEmptySession();

    await workout.keepEditingAfterDiscardPrompt();

    await expect(workout.finishButton).toBeVisible(); // still live
    const saved = await workout.readActiveSessionFromStorage();
    expect(saved).toBeTruthy();
  });
});
