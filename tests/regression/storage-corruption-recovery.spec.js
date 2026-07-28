import { test, expect } from '@playwright/test';
import { isRealConsoleError } from '../fixtures/app.fixture.js';

/** Independent of the app fixture (which seeds a clean profile) -- these tests need full
 *  control over what's in localStorage before the app boots, including deliberately broken
 *  values, so they set up their own init script per case. */
test.describe('Storage corruption recovery @regression', () => {
  const seedAndBoot = async (page, seed) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error' && isRealConsoleError(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(seed);
    await page.goto('/');
    await expect(page.locator('#app')).toBeVisible({ timeout: 15000 });
    return errors;
  };

  test('a workout record missing its exercises array does not crash Home', async ({ page }) => {
    const errors = await seedAndBoot(page, () => {
      localStorage.clear();
      localStorage.setItem('hx_onboarding_complete', JSON.stringify(true));
      localStorage.setItem('hx_workout_log', JSON.stringify([{ id: 1, date: '2025-01-01' }])); // no `exercises`
    });
    await expect(page.locator('#app')).not.toBeEmpty();
    await expect(page.locator('#app')).not.toContainText('Ignyt hit a snag');
    expect(errors).toEqual([]);
  });

  test('non-array hx_workout_log (wrong type) does not crash the app', async ({ page }) => {
    const errors = await seedAndBoot(page, () => {
      localStorage.clear();
      localStorage.setItem('hx_onboarding_complete', JSON.stringify(true));
      localStorage.setItem('hx_workout_log', JSON.stringify({ not: 'an array' }));
    });
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('hx_profile as a raw string (wrong type) does not crash the app', async ({ page }) => {
    const errors = await seedAndBoot(page, () => {
      localStorage.clear();
      localStorage.setItem('hx_onboarding_complete', JSON.stringify(true));
      localStorage.setItem('hx_profile', '"just a string"');
    });
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('every hx_* key corrupted (not valid JSON) still boots', async ({ page }) => {
    const errors = await seedAndBoot(page, () => {
      localStorage.clear();
      ['hx_tab', 'hx_active_week', 'hx_active_level', 'hx_profile', 'hx_completed', 'hx_nutrition',
        'hx_bodylog', 'hx_workout_log', 'hx_food_log', 'hx_routines', 'hx_settings', 'hx_prs', 'hx_active_session']
        .forEach(k => localStorage.setItem(k, '{{{not json'));
      localStorage.setItem('hx_onboarding_complete', JSON.stringify(true));
    });
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('an app kill mid-write (session set but never finished) recovers on next launch', async ({ page, context }) => {
    // Simulates "closed the app while a workout was in progress": a live session sits in
    // hx_active_session with no matching finished-workout entry in hx_workout_log yet.
    const errors = await seedAndBoot(page, () => {
      localStorage.clear();
      localStorage.setItem('hx_onboarding_complete', JSON.stringify(true));
      localStorage.setItem('hx_active_session', JSON.stringify({
        startedAt: Date.now() - 60000, exercises: [{ name: 'Bench Press', notes: '', restDuration: 60,
          sets: [{ weight: 60, reps: 8, rpe: '', done: true, type: 'working' }] }], notes: '', title: ''
      }));
    });
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(errors).toEqual([]);
    // The interrupted session itself is intact, not silently dropped.
    const restored = await page.evaluate(() => state.session && state.session.exercises[0].name);
    expect(restored).toBe('Bench Press');
  });
});
