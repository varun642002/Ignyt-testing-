import { test, expect } from '../fixtures/app.fixture.js';

/* Reported from an iPhone: "RECENT SESSIONS" rendered as "ECENT SESSIONS", and three selects on
   Personal Info truncated mid-word (`Daily exercise o|`, `Centimeters (cn`, `12 Hour (AM/PM`).
   That is the page being wider than the viewport, which is measurable rather than a matter of
   opinion -- so it belongs in a test instead of in someone's eye.

   BasePage already had expectNoHorizontalOverflow(); it simply was not pointed at these screens. */
const SCREENS = ['home', 'workout', 'nutrition', 'progress', 'tools'];

for (const tab of SCREENS) {
  test(`${tab} does not scroll sideways @a11y @regression`, async ({ app, page }) => {
    await app.navigateToVisibleTab(tab);
    await app.expectNoHorizontalOverflow();
  });
}

test('no element extends past the viewport on the workout tab @a11y @regression', async ({ app, page }) => {
  await app.navigateToVisibleTab('workout');
  /* Names the offender rather than just failing: a bare scrollWidth assertion tells you the page
     is too wide, not which element did it. */
  const offenders = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll('body *'))
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.right > vw + 1 || r.left < -1))
      .slice(0, 8)
      .map(({ el, r }) => `${el.tagName}.${String(el.className).slice(0, 30)} left=${Math.round(r.left)} right=${Math.round(r.right)} vw=${vw}`);
  });
  expect(offenders, `elements outside the viewport:\n${offenders.join('\n')}`).toEqual([]);
});
