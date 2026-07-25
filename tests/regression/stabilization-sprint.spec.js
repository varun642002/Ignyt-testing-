import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Production stabilization sprint — regression @regression', () => {
  test('Start Workout button starts a live session', async ({ app }) => {
    await app.navigateToVisibleTab('workout');
    const startBtn = app.page.locator('[data-action="start-session"]').first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await expect(app.page.locator('[data-action="finish-session"]').first()).toBeVisible();
  });

  test('workout category/Favorites filter chips respond', async ({ app }) => {
    await app.navigateToVisibleTab('workout');
    const push = app.page.locator('[data-workout-filter="Push"]');
    await expect(push).toBeVisible();
    await push.click();
    await expect(push).toHaveClass(/active/);

    const favorites = app.page.locator('[data-workout-filter="Favorites"]').first();
    await favorites.click();
    await expect(app.page.locator('[data-workout-filter="Favorites"].active')).toHaveCount(1);
  });

  test('Health Hub is not reachable from Tools navigation', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await expect(app.page.locator('[data-nav="healthhub"]')).toHaveCount(0);
    await expect(app.app).not.toContainText('Health Hub');
  });

  test('new user body weight defaults to 0', async ({ app }) => {
    const weight = await app.page.evaluate(() => state.profile.weight);
    expect(weight).toBe(0);
  });

  test('Privacy Policy opens as an in-app overlay and closes without leaving the app', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    await app.page.locator('[data-action="open-legal-privacy"]').click();
    await expect(app.page.locator('iframe[src="legal/privacy-policy.html"]')).toBeVisible();
    // Still the same SPA document -- a real <a target="_blank"> navigation would have replaced it.
    expect(app.page.url()).toContain('127.0.0.1');

    // The "Back" button, not the .dialog-backdrop -- the backdrop's own click target is
    // almost entirely covered by the near-fullscreen dialog-box/iframe on top of it.
    await app.page.locator('button[data-action="close-legal-viewer"]').click();
    await expect(app.page.locator('iframe[src="legal/privacy-policy.html"]')).toHaveCount(0);
    await expect(app.app).toContainText('Privacy Policy');
  });

  test('Medical Disclaimer opens as an in-app overlay and closes without leaving the app', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    await app.page.locator('[data-action="open-legal-disclaimer"]').click();
    await expect(app.page.locator('iframe[src="legal/medical-disclaimer.html"]')).toBeVisible();

    // The "Back" button, not the .dialog-backdrop -- the backdrop's own click target is
    // almost entirely covered by the near-fullscreen dialog-box/iframe on top of it.
    await app.page.locator('button[data-action="close-legal-viewer"]').click();
    await expect(app.page.locator('iframe[src="legal/medical-disclaimer.html"]')).toHaveCount(0);
  });

  test('handleHardwareBack() closes the topmost overlay instead of doing nothing', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    await app.page.locator('[data-action="open-legal-privacy"]').click();
    await expect(app.page.locator('iframe[src="legal/privacy-policy.html"]')).toBeVisible();

    const closed = await app.page.evaluate(() => handleHardwareBack());
    expect(closed).toBe(true);
    await expect(app.page.locator('iframe[src="legal/privacy-policy.html"]')).toHaveCount(0);

    const nothingToClose = await app.page.evaluate(() => handleHardwareBack());
    expect(nothingToClose).toBe(false);
  });

  test('handleHardwareBack() closes the Body Progress fullscreen image viewer', async ({ app }) => {
    await app.page.evaluate(() => {
      state.viewingBodyPhotoId = 12345;
      render();
    });
    const closed = await app.page.evaluate(() => handleHardwareBack());
    expect(closed).toBe(true);
    const afterId = await app.page.evaluate(() => state.viewingBodyPhotoId);
    expect(afterId).toBeNull();
  });

  test('no console errors during the flows above', async ({ app }) => {
    await app.navigateToVisibleTab('workout');
    await app.page.locator('[data-action="start-session"]').first().click();
    await app.navigateToVisibleTab('progress');
    await app.navigateToVisibleTab('tools');
    await app.navigateToVisibleTab('profile');
    await expect(app.app).not.toBeEmpty();
  });
});
