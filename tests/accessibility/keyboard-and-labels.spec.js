import { test, expect } from '../fixtures/app.fixture.js';

test('interactive controls have accessible names and keyboard focus is visible @accessibility', async ({ app }) => {
  const controls = app.app.locator('button, input, select, textarea');
  await expect(controls.first()).toBeVisible();
  const missingNames = await controls.evaluateAll(elements => elements.filter(element => {
    const label = element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.trim();
    return ['button', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase()) && !label && !element.getAttribute('id');
  }).length);
  expect(missingNames).toBe(0);
  await app.page.keyboard.press('Tab');
  await expect.poll(() => app.page.evaluate(() => document.activeElement !== document.body)).toBe(true);
});
