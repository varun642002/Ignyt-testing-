import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class AppPage extends BasePage {
  async expectBooted() {
    await expect(this.app).not.toBeEmpty({ timeout: 15_000 });
  }

  async navigateToVisibleTab(tab) {
    await this.navigate(tab);
    await this.expectBooted();
  }
}
