import { test, expect } from '../fixtures/app.fixture.js';
import { WorkoutPage } from '../pages/WorkoutPage.js';
import { startSessionWithExercise } from '../helpers/workout-session.js';

test.describe('Workout module — exercise management @workout', () => {
  test('adds an exercise to the live session', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await startSessionWithExercise(workout, 'Bench Press');

    await expect(workout.exerciseCards).toHaveCount(1);
    await expect(workout.exerciseCard(0)).toContainText('Bench Press');
    // A freshly-added exercise starts with exactly one set (app.js's `sets: [newSet(name)]`).
    await expect(workout.setRows(0)).toHaveCount(1);
  });

  test('removes an exercise', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await startSessionWithExercise(workout, 'Bench Press');
    await workout.addExercise('Deadlift');
    await expect(workout.exerciseCards).toHaveCount(2);

    await workout.removeExercise(1); // remove the second card ("Deadlift")
    await expect(workout.exerciseCards).toHaveCount(1);
    await expect(workout.exerciseCard(0)).toContainText('Bench Press');
  });

  test('duplicates an exercise', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await startSessionWithExercise(workout, 'Bench Press');

    await workout.duplicateExercise(0);
    await expect(workout.exerciseCards).toHaveCount(2);
    const names = await workout.exerciseNames();
    expect(names.filter(n => n.includes('Bench Press'))).toHaveLength(2);
  });

  test('reorders exercises (move down / move up)', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await startSessionWithExercise(workout, 'Bench Press');
    await workout.addExercise('Deadlift');
    await expect(workout.exerciseCards).toHaveCount(2);

    let names = await workout.exerciseNames();
    expect(names[0]).toContain('Bench Press');
    expect(names[1]).toContain('Deadlift');

    await workout.moveExerciseDown(0);
    names = await workout.exerciseNames();
    expect(names[0]).toContain('Deadlift');
    expect(names[1]).toContain('Bench Press');

    await workout.moveExerciseUp(1);
    names = await workout.exerciseNames();
    expect(names[0]).toContain('Bench Press');
    expect(names[1]).toContain('Deadlift');
  });

  test('collapses and expands an exercise card', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await startSessionWithExercise(workout, 'Bench Press');

    await expect(workout.setTableHeader(0)).toBeVisible();
    await workout.toggleCollapse(0);
    await expect(workout.setTableHeader(0)).toBeHidden();
    // The set-input for the exercise's only set is inside the now-collapsed body.
    await expect(workout.weightInput(0, 0)).toBeHidden();

    await workout.toggleCollapse(0);
    await expect(workout.setTableHeader(0)).toBeVisible();
    await expect(workout.weightInput(0, 0)).toBeVisible();
  });
});
