import { expect } from '@playwright/test';
import { AppPage } from './AppPage.js';

export class ProgressPage extends AppPage {
  async open() {
    await super.open();
    await this.navigateToVisibleTab('progress');
  }

  async expectProgressScreen() {
    await expect(this.app).toContainText(/progress|habit|analytics|achievement/i);
  }
}
