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
    /* THE TAB BAR FIRST, then in-page links. A comma selector with .first() returns whatever
       comes first in DOCUMENT order, not the first branch of the selector -- so a quick-action
       card carrying data-nav (the Workout page has two: library, recommendation) could win over
       the bottom-nav button and navigate somewhere else entirely. That is how the workout specs
       ended up asserting against Home.
       data-navtab is only ever the bottom nav, so ask for it explicitly and fall back. */
    const pick = (t) => {
      const bar = this.page.locator(`[data-navtab="${t}"]`).first();
      return bar.count().then(n => n > 0 ? bar : this.page.locator(`[data-nav="${t}"]`).first());
    };
    let trigger = await pick(tab);
    if (await trigger.count() === 0 && tab !== 'tools') {
      await this.navigate('tools');
      trigger = await pick(tab);
    }
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(this.app).toBeVisible();
  }

  async expectNoHorizontalOverflow() {
    await expect.poll(() => this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}
