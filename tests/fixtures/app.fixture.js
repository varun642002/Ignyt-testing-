import { test as base, expect } from '@playwright/test';
import { AppPage } from '../pages/AppPage.js';

/* WebKit does not implement the `interactive-widget` viewport key and logs a parse notice
   for it at console.error level. The key is deliberate -- it is what keeps the Android
   keyboard from covering the workout set-row inputs -- and unsupported viewport keys are
   specified to be ignored, so this notice is benign and WebKit-only. Filtered by exact text
   so every other console error still fails the suite. */
export const IGNORED_CONSOLE_NOISE = [
  'Viewport argument key "interactive-widget" not recognized and ignored.'
];
export const isRealConsoleError = (text) => !IGNORED_CONSOLE_NOISE.includes(text);

export const test = base.extend({
  app: async ({ page }, use, testInfo) => {
    const diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] };
    page.on('console', message => { if (message.type() === 'error' && isRealConsoleError(message.text())) diagnostics.consoleErrors.push(message.text()); });
    page.on('pageerror', error => diagnostics.pageErrors.push(error.message));
    page.on('requestfailed', request => diagnostics.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('hx_onboarding_complete', 'true');
      /* AN AUTHENTICATED SESSION. Without this the app clears onboarding and then stops at the
         sign-in gate, so every test that navigates was asserting against a screen with no nav
         bar -- which is why the navigation specs failed while smoke passed.

         isSignedIn() is `!!IgnytAuth.getAccount()`, and getAccount() is a straight read of
         localStorage['hx_auth_account'] (www/auth.js:86). Seeding that key IS being signed in
         as far as every screen is concerned.

         Seeded rather than driven through the real sign-in form on purpose: the browser build
         has no native auth bridge, so a UI sign-in would need a live Firebase round trip and
         real credentials in the test run. That belongs in a dedicated auth spec against a test
         account, not in the fixture every other spec depends on.

         NOTE FOR THE AUTH SPEC WHEN IT IS WRITTEN: this proves nothing about sign-in itself.
         skipSignIn() was deliberately removed from the app because Play review could not tell
         whether an account was required, and this fixture is a test-only shortcut past that
         gate -- it must never become the way the product behaves. */
      localStorage.setItem('hx_auth_account', JSON.stringify({
        uid: 'e2e-test-user',
        displayName: 'E2E Test User',
        email: 'e2e@ignyt.test',
        photoUrl: '',
        provider: 'password',
        emailVerified: true,
        signedInAt: Date.now()
      }));
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
