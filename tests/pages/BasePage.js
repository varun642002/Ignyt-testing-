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
    /* BOTH ATTRIBUTES, and that is the fix rather than a widening.
       The bottom-nav buttons carry data-navtab (see navBtn() in www/app.js); data-nav is used
       by in-page navigation such as the red-flags screen's back button. These specs only ever
       looked for data-nav, so they never found a bottom-nav tab and failed on
       expect(trigger).toBeVisible() -- which read as an auth problem and was not one.
       Matching either keeps the Tools fallback below working for tabs reached that way. */
    const sel = `[data-nav="${tab}"], [data-navtab="${tab}"]`;
    let trigger = this.page.locator(sel).first();
    if (await trigger.count() === 0 && tab !== 'tools') {
      await this.navigate('tools');
      trigger = this.page.locator(sel).first();
    }
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(this.app).toBeVisible();
  }

  async expectNoHorizontalOverflow() {
    await expect.poll(() => this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}
