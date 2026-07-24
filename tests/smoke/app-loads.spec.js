import { test, expect } from '../fixtures/app.fixture.js';

test('real IGNYT web application boots @smoke', async ({ app }) => {
  await expect(app.page).toHaveTitle(/IGNYT/i);
  await expect(app.app).not.toBeEmpty();
});
