import { test, expect } from '../fixtures/app.fixture.js';

/** Verifies user-controllable free-text fields (routine names, custom exercise names, session/
 *  exercise notes) are HTML-escaped at render time, not injected raw into innerHTML. Found
 *  during the v1.1 security audit: several of these interpolated the raw string directly. */
test.describe('XSS escaping of user-controlled text @regression', () => {
  const PAYLOAD = '<img src=x onerror=alert(1)>"\'';

  test('a routine name containing HTML is escaped, not executed, on the Workout list', async ({ app, page }) => {
    await app.navigateToVisibleTab('workout');
    await page.locator('[data-action="toggle-routine-builder"]').click();
    await page.locator('#routine-name').fill(PAYLOAD);
    await page.locator('[data-action="open-exercise-picker-for-routine"]').click();
    await page.locator('#ex-picker-search').fill('Bench Press');
    await page.locator('[data-pick-exercise="Bench Press"]').click();
    await page.locator('[data-action="save-routine"]').click();

    const card = page.locator('.wk-routine-card__name', { hasText: 'img' });
    await expect(card).toBeVisible();
    // The literal escaped text should be visible (proving it rendered as text, not markup)...
    await expect(card).toContainText('<img src=x onerror=alert(1)>');
    // ...and no actual <img> element should exist anywhere on the page from this input.
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });

  test('exercise notes containing HTML are escaped in the finished-session detail view', async ({ app, page }) => {
    await app.navigateToVisibleTab('workout');
    await page.locator('[data-action="start-session"]').first().click();
    await page.locator('[data-action="open-exercise-picker"]').click();
    await page.locator('#ex-picker-search').fill('Bench Press');
    await page.locator('[data-pick-exercise="Bench Press"]').click();

    await page.locator('[data-set-field="0|0|weight"]').fill('60');
    await page.locator('[data-set-field="0|0|reps"]').fill('8');
    await page.locator('[data-set-done="0|0"]').click();

    await page.locator('.notes-inline-collapsed[data-menu-notes="0"]').click();
    await page.locator('[data-notes-exercise="0"]').fill(PAYLOAD);
    await page.locator('[data-notes-exercise="0"]').blur();

    await page.locator('[data-action="finish-session"]').first().click();
    await page.locator('button[data-dialog-action="confirm"]').click();
    await page.locator('[data-action="close-workout-complete"]').click();

    await page.locator('.wk-session-row').first().click();
    await expect(page.locator('.ex-log-card')).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });
});
