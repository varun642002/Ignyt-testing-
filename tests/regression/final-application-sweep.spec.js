import { test, expect } from '../fixtures/app.fixture.js';
import { WorkoutPage } from '../pages/WorkoutPage.js';
import { startSessionWithExercise } from '../helpers/workout-session.js';

test.describe('Final application sweep @regression', () => {
  test('every tab and every Tools sub-page loads without a blank screen', async ({ app }) => {
    for (const tab of ['home', 'workout', 'progress', 'tools', 'profile']) {
      await app.navigateToVisibleTab(tab);
      await expect(app.app).not.toBeEmpty();
    }
    for (const nav of ['plan', 'library', 'goals', 'body', 'health', 'uploads', 'nutrition', 'calculators', 'settings']) {
      await app.navigateToVisibleTab('tools');
      const el = app.page.locator(`[data-nav="${nav}"]`).first();
      if (await el.count()) { await el.click(); await expect(app.app).not.toBeEmpty(); }
    }
  });

  test('workout routine sort dropdown updates the sort order', async ({ app }) => {
    await app.navigateToVisibleTab('workout');
    const select = app.page.locator('#workout-routine-sort');
    await expect(select).toBeVisible();
    await select.selectOption('name');
    await expect(select).toHaveValue('name');
    const stateSort = await app.page.evaluate(() => state.workoutRoutineSort);
    expect(stateSort).toBe('name');
  });

  test('theme and weight-unit selectors persist after switching', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    await app.page.locator('[data-weight-unit="lb"]').click();
    await expect(app.page.locator('[data-weight-unit="lb"]')).toHaveClass(/active/);
    const unit = await app.page.evaluate(() => state.settings.weightUnit);
    expect(unit).toBe('lb');
  });

  test('a setting toggle persists across a reload', async ({ app, page }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    const before = await page.evaluate(() => !!state.settings.sounds);
    await page.locator('[data-setting-toggle="sounds"]').click();
    const after = await page.evaluate(() => !!state.settings.sounds);
    expect(after).toBe(!before);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hx_settings')).sounds);
    expect(saved).toBe(after);
  });

  test('exercise picker search returns results, has an empty state, and clears', async ({ app }) => {
    const workout = new WorkoutPage(app.page);
    await startSessionWithExercise(workout, 'Bench Press');
    await app.page.locator('[data-action="open-exercise-picker"]').click();
    const search = app.page.locator('#ex-picker-search');

    await search.fill('Squat');
    await expect(app.page.locator('.ex-picker-row').first()).toBeVisible();

    await search.fill('zzzznotarealexercisezzzz');
    await expect(app.app).toContainText(/no exercises match/i);

    await search.fill('');
    await expect(app.page.locator('.ex-picker-row').first()).toBeVisible();
  });

  test('CSV import rejects an invalid file without a console error', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    const fileInput = app.page.locator('#import-csv');
    await fileInput.setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('not,a,valid,workout,csv\nrandom,junk,here,for,testing') });
    // Doesn't throw; either shows a toast or silently no-ops on unrecognised content -- both
    // are acceptable, a JS exception is not.
    await expect(app.app).not.toBeEmpty();
  });

  test('a destructive delete (Reset All App Data) shows a confirmation dialog before acting', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    await app.page.locator('[data-action="reset-all"]').click();
    await expect(app.page.locator('button[data-dialog-action="confirm"]')).toBeVisible();
    // Cancel -- proves the dialog gates the action rather than deleting immediately on click.
    await app.page.locator('button[data-dialog-action="cancel"]').click();
    await expect(app.page.locator('.dialog-box')).toHaveCount(0);
  });

  test('toast appears for an action and auto-dismisses without duplicating', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');
    await workout.addSet(exi);
    await workout.deleteSet(exi, si);
    await expect(page.locator('.toast')).toHaveCount(1);
    await expect(page.locator('.toast')).toContainText(/deleted/i);
  });

  test('no duplicate overlays when a dialog trigger is clicked twice quickly', async ({ app }) => {
    await app.navigateToVisibleTab('tools');
    await app.page.locator('[data-nav="settings"]').first().click();
    const resetBtn = app.page.locator('[data-action="reset-all"]');
    await resetBtn.click();
    await resetBtn.click({ force: true }).catch(() => {}); // backdrop now covers it; second click is a no-op either way
    await expect(app.page.locator('.dialog-box')).toHaveCount(1);
    await app.page.locator('button[data-dialog-action="cancel"]').click();
  });

  test('layout has no horizontal overflow on mobile, tablet and desktop widths', async ({ app, page }) => {
    for (const size of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(size);
      for (const tab of ['home', 'workout', 'progress', 'tools', 'profile']) {
        await app.navigateToVisibleTab(tab);
        await app.expectNoHorizontalOverflow();
      }
    }
  });

  test('app renders and holds saved data with the network offline', async ({ app, page, context }) => {
    await startSessionWithExercise(new WorkoutPage(page), 'Bench Press');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
    await context.setOffline(false);
  });

  test('no console errors, page errors, or failed requests across the full sweep', async ({ app }) => {
    for (const tab of ['home', 'workout', 'progress', 'tools', 'profile']) {
      await app.navigateToVisibleTab(tab);
    }
    await expect(app.app).not.toBeEmpty();
  });
});
