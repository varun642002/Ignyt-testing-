import { test, expect } from '../fixtures/app.fixture.js';

test('home application shell matches the reviewed baseline @visual', async ({ app }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Visual baselines are reviewed in Chromium only.');
  test.skip(!process.env.VISUAL_BASELINES, 'Set VISUAL_BASELINES=1 and use --update-snapshots to create/review the first baseline.');
  await expect(app.app).toHaveScreenshot('home-shell.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
});
