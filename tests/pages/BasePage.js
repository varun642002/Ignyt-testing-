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

    /* NO ARRIVAL ASSERTION HERE YET, AND THAT IS A KNOWN HOLE -- not an oversight.

       This method ends at `expect(this.app).toBeVisible()`, and #app is visible on EVERY
       screen, so it holds whether or not the tab changed. That is why the navigation specs
       pass on mobile-safari while the workout specs, which need to actually arrive somewhere,
       fail on a button that only exists on the Workout tab.

       An assertion on the button carrying class "active" was tried and reverted: that class is
       applied only while DRAGGING across the nav (www/app.js:8695). A tap sets no per-button
       class, so the assertion failed all 25 specs on every browser including ones where
       navigation genuinely works.

       The signal that does track the current tab is the indicator: syncBottomNav sets
       `has-active` on nav.bottom-nav and writes the tab's index into the `--nav-i` custom
       property on .nav-ind. Asserting that --nav-i equals the tab's index in NAV_TABS would
       prove arrival. It needs the index, which this generic method does not have -- so it
       belongs either in a page object that knows the tab order, or behind a small helper that
       reads NAV_TABS from the page. */
  }

  async expectNoHorizontalOverflow() {
    await expect.poll(() => this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}
