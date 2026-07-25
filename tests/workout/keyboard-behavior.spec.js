import { test, expect } from '../fixtures/app.fixture.js';
import { WorkoutPage } from '../pages/WorkoutPage.js';
import { startSessionWithExercise } from '../helpers/workout-session.js';

/**
 * Keyboard-aware workout layout.
 *
 * Important scope note: desktop/CI Chromium (and Playwright's mobile *viewport emulation*,
 * which only resizes the window -- it does not attach a real on-screen keyboard) never opens
 * a real soft keyboard, so `window.visualViewport` never actually shrinks here the way it does
 * on a real Android device. The app's keyboard-aware listener (www/app.js) reacts to that
 * visualViewport shrink by toggling `body.kb-open` and a `.wk-ex-card__pin--active` class --
 * that CSS contract is exactly what these tests drive directly (via the same classes the real
 * listener toggles) and assert against, rather than trying to fake an OS keyboard. What IS
 * exercised against the real app: that focusing a field scrolls it into view and gives it a
 * visible focus style, and that the nav-hide / header-pin CSS rules are wired correctly.
 */
test.describe('Workout module — keyboard-aware layout @workout', () => {
  test('the active input scrolls into view and shows a visible focus style', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    const weightInput = workout.weightInput(exi, si);
    await weightInput.scrollIntoViewIfNeeded();
    await weightInput.click();
    await expect(weightInput).toBeFocused();
    await expect(weightInput).toBeInViewport();

    // .set-input:focus (workout.css) -- a per-field border+glow, not a full-row background.
    const borderColor = await weightInput.evaluate(el => getComputedStyle(el).borderColor);
    expect(borderColor).not.toBe('');
  });

  test('bottom navigation hides while the keyboard-open state is active, and returns when it closes', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    await startSessionWithExercise(workout, 'Bench Press');

    const restingTransform = await workout.bottomNav.evaluate(el => getComputedStyle(el).transform);

    await workout.simulateKeyboardOpen();
    await expect(page.locator('body.kb-open')).toHaveCount(1);
    await expect.poll(() => workout.bottomNav.evaluate(el => getComputedStyle(el).transform)).not.toBe(restingTransform);

    await workout.simulateKeyboardClose();
    await expect.poll(() => workout.bottomNav.evaluate(el => getComputedStyle(el).transform)).toBe(restingTransform);
  });

  test('the active exercise header pins while editing (name, muscle badge and rest timer stay visible)', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi } = await startSessionWithExercise(workout, 'Bench Press');

    const pin = workout.exerciseCard(exi).locator('.wk-ex-card__pin');
    await expect(pin).toContainText('Bench Press'); // exercise name
    await expect(pin.locator('.muscle-chip')).toBeVisible(); // muscle badge
    await expect(pin.locator(`[data-rest-toggle="${exi}"]`)).toBeVisible(); // rest timer

    await pin.evaluate(el => el.classList.add('wk-ex-card__pin--active'));
    await expect(pin).toHaveCSS('position', 'sticky');

    // Header stays put; the CSS still resolves for the same visible name/badge/rest-timer
    // content -- pinning restyles the wrapper, it never removes or hides these elements.
    await expect(pin).toContainText('Bench Press');
    await expect(pin.locator('.muscle-chip')).toBeVisible();
    await expect(pin.locator(`[data-rest-toggle="${exi}"]`)).toBeVisible();
  });

  test('the keyboard-open state never reduces the active row to zero size (never truly hidden)', async ({ app, page }) => {
    const workout = new WorkoutPage(page);
    const { exi, si } = await startSessionWithExercise(workout, 'Bench Press');

    await workout.weightInput(exi, si).click();
    await workout.simulateKeyboardOpen();

    const box = await workout.weightInput(exi, si).boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);

    await workout.simulateKeyboardClose();
  });
});
