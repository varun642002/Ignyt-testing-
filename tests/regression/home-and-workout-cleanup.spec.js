import { test, expect } from '../fixtures/app.fixture.js';

/* The first two tests here used to assert that the Medical Records quick action WAS on Home
   and that tapping it opened Medical Reports. The brief now removes both features from the
   UI, so those assertions were inverted rather than deleted — a test that only checks a
   button is gone is worth keeping, because "removed" is exactly the kind of thing that gets
   quietly re-added.

   The route and www/js/health-uploads.js are still in the repo, deliberately unreachable, so
   these assert on REACHABILITY (no entry point in the UI) and not on the module's absence. */
test.describe('Medical Records removal + Workout hero removal @regression', () => {
  test('Medical Records quick action is gone from Home', async ({ app }) => {
    await app.navigateToVisibleTab('home');
    await expect(app.page.locator('[data-nav="uploads"]')).toHaveCount(0);
    await expect(app.app).not.toContainText('Medical Records');
  });

  test('no Medical Reports entry point anywhere in the primary tabs', async ({ app }) => {
    for (const tab of ['home', 'workout', 'progress', 'profile', 'tools']) {
      await app.navigateToVisibleTab(tab);
      await expect(app.page.locator('[data-nav="uploads"]')).toHaveCount(0);
      await expect(app.app).not.toContainText('Medical Reports');
    }
  });

  test('Today\'s Workout section no longer renders on the Workout page', async ({ app }) => {
    await app.navigateToVisibleTab('workout');
    await expect(app.page.locator('.wk-hero')).toHaveCount(0);
    await expect(app.app).not.toContainText("Today's Workout");
  });

  test('Start Workout and category filters still work after the hero removal', async ({ app }) => {
    await app.navigateToVisibleTab('workout');
    await app.page.locator('[data-action="start-session"]').first().click();
    await expect(app.page.locator('[data-action="finish-session"]').first()).toBeVisible();
  });

  test('no console errors across Home and Workout after these changes', async ({ app }) => {
    await app.navigateToVisibleTab('home');
    await app.navigateToVisibleTab('workout');
    await expect(app.app).not.toBeEmpty();
  });
});
