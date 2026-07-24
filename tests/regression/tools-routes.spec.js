import { test } from '../fixtures/app.fixture.js';
import { AiCoachPage, BodyPage, ExerciseLibraryPage, HealthPage, PlanPage, SettingsPage, ToolsPage } from '../pages/RoutedPage.js';

const routes = [
  ['tools', ToolsPage], ['library', ExerciseLibraryPage], ['body', BodyPage], ['plan', PlanPage],
  ['health', HealthPage], ['settings', SettingsPage], ['ai coach', AiCoachPage]
];

for (const [name, PageObject] of routes) {
  test(`${name} route renders through existing application navigation @regression`, async ({ app, page }) => {
    const routed = new PageObject(page);
    await routed.openFromApp();
    await routed.expectNoHorizontalOverflow();
  });
}
