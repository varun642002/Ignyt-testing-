import { test } from '../fixtures/app.fixture.js';
import { ProgressPage } from '../pages/ProgressPage.js';

test('progress screen renders on a clean real-app profile @regression', async ({ app, page }) => {
  const progress = new ProgressPage(page);
  await progress.navigateToVisibleTab('progress');
  await progress.expectProgressScreen();
  await progress.expectNoHorizontalOverflow();
});
