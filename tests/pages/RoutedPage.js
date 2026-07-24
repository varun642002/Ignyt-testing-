import { expect } from '@playwright/test';
import { AppPage } from './AppPage.js';

export class RoutedPage extends AppPage {
  constructor(page, route, content) {
    super(page);
    this.route = route;
    this.content = content;
  }

  async openFromApp() {
    await this.navigateToVisibleTab(this.route);
    await expect(this.app).toContainText(this.content);
  }
}

export class ExerciseLibraryPage extends RoutedPage { constructor(page) { super(page, 'library', /library|exercise/i); } }
export class BodyPage extends RoutedPage { constructor(page) { super(page, 'body', /weight|body|calculator/i); } }
export class HealthPage extends RoutedPage { constructor(page) { super(page, 'health', /health|connect/i); } }
export class SettingsPage extends RoutedPage { constructor(page) { super(page, 'settings', /settings|appearance|backup/i); } }
export class ToolsPage extends RoutedPage { constructor(page) { super(page, 'tools', /tools|training|health/i); } }
export class PlanPage extends RoutedPage { constructor(page) { super(page, 'plan', /plan|hyrox|training/i); } }
export class AiCoachPage extends RoutedPage { constructor(page) { super(page, 'ai-coach', /coach|goal/i); } }
