import { expect } from '@playwright/test';

export class BasePage {
  constructor(page) {
    this.page = page;
    this.app = page.locator('#app');
  }

  async open() {
    await this.page.goto('/');
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.app).toBeVisible({ timeout: 15_000 });
  }

  async navigate(tab) {
    let trigger = this.page.locator(`[data-nav="${tab}"]`).first();
    if (await trigger.count() === 0 && tab !== 'tools') {
      await this.navigate('tools');
      trigger = this.page.locator(`[data-nav="${tab}"]`).first();
    }
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(this.app).toBeVisible();
  }

  async expectNoHorizontalOverflow() {
    await expect.poll(() => this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}
