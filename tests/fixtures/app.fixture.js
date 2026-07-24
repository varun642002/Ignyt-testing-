import { test as base, expect } from '@playwright/test';
import { AppPage } from '../pages/AppPage.js';

export const test = base.extend({
  app: async ({ page }, use, testInfo) => {
    const diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] };
    page.on('console', message => { if (message.type() === 'error') diagnostics.consoleErrors.push(message.text()); });
    page.on('pageerror', error => diagnostics.pageErrors.push(error.message));
    page.on('requestfailed', request => diagnostics.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('hx_onboarding_complete', 'true');
      sessionStorage.setItem('ignyt_boot_splash_shown_v1', '1');
    });
    const app = new AppPage(page);
    await app.open();
    await app.expectBooted();
    await use(app);
    await testInfo.attach('browser-diagnostics.json', { body: JSON.stringify(diagnostics, null, 2), contentType: 'application/json' });
  }
});

export { expect };
