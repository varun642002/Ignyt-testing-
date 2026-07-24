import { test } from '../fixtures/app.fixture.js';
import { BodyPage, ExerciseLibraryPage, HealthPage, PlanPage, SettingsPage, ToolsPage } from '../pages/RoutedPage.js';

// AI Coach was intentionally removed (app.js redirects any persisted "ai-coach" tab to Home;
// no nav entry reaches it) -- not a regression, so it isn't covered here.
const routes = [
  ['tools', ToolsPage], ['library', ExerciseLibraryPage], ['body', BodyPage], ['plan', PlanPage],
  ['health', HealthPage], ['settings', SettingsPage]
];

for (const [name, PageObject] of routes) {
  test(`${name} route renders through existing application navigation @regression`, async ({ app, page }) => {
    const routed = new PageObject(page);
    await routed.openFromApp();
    await routed.expectNoHorizontalOverflow();
  });
}
