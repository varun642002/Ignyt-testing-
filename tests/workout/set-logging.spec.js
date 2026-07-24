import { test, expect } from '../fixtures/app.fixture.js';
import { WorkoutPage } from '../pages/WorkoutPage.js';
import { startSessionWithExercise } from '../helpers/workout-session.js';

test.describe('Workout module — set logging @workout', () => {
  test('enters KG and REPS for a set', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    await workout.enterWeight(exi, si, 60);
    await workout.enterReps(exi, si, 8);

    await expect(workout.weightInput(exi, si)).toHaveValue('60');
    await expect(workout.repsInput(exi, si)).toHaveValue('8');
  });

  test('enters RPE for a set via the RPE sheet', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    await workout.enterRpe(exi, si, '8');
    await expect(workout.rpeButton(exi, si)).toHaveText('8');
  });

  test('enters exercise notes', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi } = await startSessionWithExercise(workout, 'Bench Press');

    await workout.enterNotes(exi, 'Felt strong today, bar speed was fast.');
    await expect(workout.notesInput(exi)).toHaveValue('Felt strong today, bar speed was fast.');
  });

  test('completes a set', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    await expect(workout.checkButton(exi, si)).not.toHaveClass(/done/);
    await workout.completeSet(exi, si);
    await expect(workout.checkButton(exi, si)).toHaveClass(/done/);

    // Completed sets lock their fields (app.js: `const lock = set.done ? 'disabled' : ''`).
    await expect(workout.weightInput(exi, si)).toBeDisabled();
    await expect(workout.repsInput(exi, si)).toBeDisabled();
  });

  test('un-completing a set unlocks its fields again', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    await workout.completeSet(exi, si);
    await expect(workout.weightInput(exi, si)).toBeDisabled();
    await workout.completeSet(exi, si); // tap again to un-check
    await expect(workout.checkButton(exi, si)).not.toHaveClass(/done/);
    await expect(workout.weightInput(exi, si)).toBeEnabled();
  });

  test('adds a set', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi } = await startSessionWithExercise(workout, 'Bench Press');

    await expect(workout.setRows(exi)).toHaveCount(1);
    await workout.addSet(exi);
    await expect(workout.setRows(exi)).toHaveCount(2);
  });

  test('deletes a specific set (swipe-delete button)', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.addSet(exi);
    await expect(workout.setRows(exi)).toHaveCount(2);

    await workout.deleteSet(exi, 0);
    await expect(workout.setRows(exi)).toHaveCount(1);
  });

  test('removes the last set via the exercise menu', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.addSet(exi);
    await expect(workout.setRows(exi)).toHaveCount(2);

    await workout.removeLastSet(exi);
    await expect(workout.setRows(exi)).toHaveCount(1);
  });

  test('an exercise always keeps at least one set', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    // Only one set exists; deleting it is refused with an explanatory toast rather than
    // leaving the exercise with zero sets (app.js's data-del-set handler).
    await workout.deleteSet(exi, si);
    await expect(workout.setRows(exi)).toHaveCount(1);
    await expect(page.locator('.toast')).toContainText(/at least one set/i);
  });

  test('duplicates a set', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.enterWeight(exi, si, 60);
    await workout.enterReps(exi, si, 8);

    await workout.duplicateSet(exi, si);
    await expect(workout.setRows(exi)).toHaveCount(2);
    await expect(workout.weightInput(exi, 1)).toHaveValue('60');
    await expect(workout.repsInput(exi, 1)).toHaveValue('8');
  });
});
