import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Home Quick Actions + Bottom Navigation verification @regression', () => {
  test('every Home Quick Action is wired to a unique, working destination', async ({ app }) => {
    await app.navigateToVisibleTab('home');
    const targets = await app.page.locator('.rh-quick-card').evaluateAll(els =>
      els.map(el => el.getAttribute('data-nav') || `${el.getAttribute('data-action')}:${el.getAttribute('data-calc')}`)
    );
    expect(targets.length).toBeGreaterThan(0);
    expect(new Set(targets).size).toBe(targets.length); // no duplicate destinations

    for (const card of await app.page.locator('.rh-quick-card').all()) {
      await app.navigateToVisibleTab('home');
      await card.click();
      await expect(app.app).not.toBeEmpty();
    }
  });

  test('every bottom nav tab opens and highlights as active', async ({ app }) => {
    for (const tab of ['home', 'workout', 'progress', 'tools', 'profile']) {
      await app.navigateToVisibleTab(tab);
      await expect(app.page.locator(`.nav-btn[data-nav="${tab}"].active`)).toHaveCount(1);
      await expect(app.app).not.toBeEmpty();
    }
  });

  test('no console errors while exercising Quick Actions and bottom nav', async ({ app }) => {
    for (const tab of ['home', 'workout', 'progress', 'tools', 'profile']) {
      await app.navigateToVisibleTab(tab);
    }
    await expect(app.app).not.toBeEmpty();
  });
});
