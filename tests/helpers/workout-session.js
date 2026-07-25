import { expect } from '@playwright/test';

/** Common setup shared by the workout-module specs: land on the Workout tab, start a fresh
 *  empty session, and add one deterministic strength exercise (weight+reps+RPE fields, no
 *  cardio/hold/carry branching) so every test starts from the same known shape. */
export async function startSessionWithExercise(workout, name = 'Bench Press') {
  await workout.navigateToVisibleTab('workout');
  await workout.startEmptySession();
  await workout.addExercise(name);
  await expect(workout.exerciseCard(0)).toBeVisible();
  await expect(workout.exerciseCard(0)).toContainText(name);
  return { exi: 0, si: 0, name };
}
