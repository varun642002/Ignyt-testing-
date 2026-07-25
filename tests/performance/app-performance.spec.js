import { test, expect } from '../fixtures/app.fixture.js';

test('initial real-app render completes within the local browser budget @performance', async ({ app }) => {
  const elapsed = await app.page.evaluate(() => performance.now());
  expect(elapsed).toBeLessThan(10_000);
  await app.navigateToVisibleTab('workout');
  await expect(app.app).not.toBeEmpty();
});
