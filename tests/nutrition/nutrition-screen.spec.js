import { test } from '../fixtures/app.fixture.js';
import { NutritionPage } from '../pages/NutritionPage.js';

test('nutrition screen renders on a clean real-app profile @regression', async ({ app, page }) => {
  const nutrition = new NutritionPage(page);
  await nutrition.navigateToVisibleTab('nutrition');
  await nutrition.expectNutritionScreen();
  await nutrition.expectNoHorizontalOverflow();
});
