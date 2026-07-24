import { test, expect } from '../fixtures/app.fixture.js';

test.describe('primary navigation @smoke @regression', () => {
  for (const tab of ['home', 'workout', 'nutrition', 'progress', 'tools']) {
    test(`opens the ${tab} route through the real UI`, async ({ app }) => {
      await app.navigateToVisibleTab(tab);
      await expect(app.app).not.toBeEmpty();
    });
  }
});
