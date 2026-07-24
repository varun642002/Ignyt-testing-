import { test } from '../fixtures/app.fixture.js';
import { WorkoutPage } from '../pages/WorkoutPage.js';

test('workout screen renders on a clean real-app profile @regression', async ({ app, page }) => {
  const workout = new WorkoutPage(page);
  await workout.navigateToVisibleTab('workout');
  await workout.expectWorkoutScreen();
  await workout.expectNoHorizontalOverflow();
});
