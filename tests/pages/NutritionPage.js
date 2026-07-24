import { expect } from '@playwright/test';
import { AppPage } from './AppPage.js';

export class NutritionPage extends AppPage {
  async open() {
    await super.open();
    await this.navigateToVisibleTab('nutrition');
  }

  async expectNutritionScreen() {
    await expect(this.app).toContainText(/nutrition|calories|food|water/i);
  }
}
