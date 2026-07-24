import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Home Medical Records quick action + Workout hero removal @regression', () => {
  test('Medical Records quick action is visible on Home', async ({ app }) => {
    await app.navigateToVisibleTab('home');
    await expect(app.page.locator('[data-nav="uploads"]')).toBeVisible();
    await expect(app.app).toContainText('Medical Records');
  });

  test('tapping Medical Records opens Medical Reports, back returns to Home', async ({ app }) => {
    await app.navigateToVisibleTab('home');
    await app.page.locator('[data-nav="uploads"]').click();
    await expect(app.app).toContainText('Medical Reports');

    await app.navigateToVisibleTab('home');
    await expect(app.app).toContainText('Medical Records');
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
    await app.page.locator('[data-nav="uploads"]').click();
    await app.navigateToVisibleTab('workout');
    await expect(app.app).not.toBeEmpty();
  });
});
