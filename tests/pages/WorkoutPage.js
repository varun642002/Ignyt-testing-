import { expect } from '@playwright/test';
import { AppPage } from './AppPage.js';

/**
 * Page Object for the live Workout Logger screen (www/app.js's session-editing view,
 * `.wk-light.wk-light--session`) plus the idle Workout tab it's launched from
 * (www/js/pages/workout.js's `renderWorkoutList`).
 *
 * Selector strategy: every method below is built on the app's existing `data-*` action
 * attributes (data-set-field, data-add-set, data-del-set, data-rpe, data-dialog-action, ...),
 * which are already stable, unique-per-row identifiers -- no application code was changed to
 * support this suite. A few generic elements (exercise cards, session/routine rows) don't have
 * a dedicated `data-testid`; see the recommendations at the bottom of this file for the small
 * number of attributes that would make those selectors even more robust.
 */
export class WorkoutPage extends AppPage {
  async open() {
    await super.open();
    await this.navigateToVisibleTab('workout');
  }

  async expectWorkoutScreen() {
    await expect(this.app).toContainText(/workout|routine|exercise/i);
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  /** Starts a brand-new, empty live session from the idle Workout tab. */
  async startEmptySession() {
    const startBtn = this.page.locator('[data-action="start-session"]').first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await expect(this.finishButton).toBeVisible();
  }

  get finishButton() {
    return this.page.locator('[data-action="finish-session"]').first();
  }

  get confirmDialogConfirmBtn() {
    // element-qualified: the dialog backdrop also carries data-dialog-action="cancel", so the
    // cancel selector below must exclude it -- scope both to the real <button>.
    return this.page.locator('button[data-dialog-action="confirm"]');
  }

  get confirmDialogCancelBtn() {
    return this.page.locator('button[data-dialog-action="cancel"]');
  }

  /** Finishes a session that has at least one completed set -- confirms the "Finish Workout" dialog. */
  async finishWorkout() {
    await this.finishButton.click();
    await expect(this.confirmDialogConfirmBtn).toBeVisible();
    await this.confirmDialogConfirmBtn.click();
  }

  /**
   * The app's actual "cancel a fresh workout" path: an empty (zero completed sets) session
   * shows a Discard/Continue dialog on Finish instead of a plain Cancel button (there is no
   * separate literal Cancel action for a brand-new session -- only for editing a past one).
   */
  async discardEmptyWorkout() {
    await this.finishButton.click();
    await expect(this.confirmDialogConfirmBtn).toBeVisible();
    await this.confirmDialogConfirmBtn.click();
  }

  /** Backs out of the discard-confirmation dialog, keeping the live session open. */
  async keepEditingAfterDiscardPrompt() {
    await this.finishButton.click();
    await expect(this.confirmDialogCancelBtn).toBeVisible();
    await this.confirmDialogCancelBtn.click();
  }

  get sessionElapsed() {
    return this.page.locator('#session-elapsed');
  }

  get workoutCompleteCloseBtn() {
    return this.page.locator('[data-action="close-workout-complete"]');
  }

  /** finishWorkout() lands on the "Workout Complete" summary screen first; this returns to
   *  the idle Workout tab (Recent Sessions etc.) the same way a real user taps through it. */
  async closeWorkoutCompleteScreen() {
    await expect(this.workoutCompleteCloseBtn).toBeVisible();
    await this.workoutCompleteCloseBtn.click();
  }

  get recentSessionRows() {
    return this.page.locator('.wk-session-row');
  }

  async readActiveSessionFromStorage() {
    return this.page.evaluate(() => JSON.parse(localStorage.getItem('hx_active_session') || 'null'));
  }

  async readWorkoutLogFromStorage() {
    return this.page.evaluate(() => JSON.parse(localStorage.getItem('hx_workout_log') || '[]'));
  }

  // ---------------------------------------------------------------------------
  // Exercise management
  // ---------------------------------------------------------------------------

  exerciseCard(exi) {
    return this.page.locator(`.wk-ex-card[data-ex-card="${exi}"]`);
  }

  get exerciseCards() {
    return this.page.locator('.wk-ex-card');
  }

  async exerciseNames() {
    return this.page.locator('.wk-ex-card__name').allTextContents();
  }

  /** Opens the exercise picker, searches, and picks an exact-name match. */
  async addExercise(name) {
    await this.page.locator('[data-action="open-exercise-picker"]').click();
    const search = this.page.locator('#ex-picker-search');
    await expect(search).toBeVisible();
    await search.fill(name);
    const row = this.page.locator(`[data-pick-exercise="${name}"]`);
    await expect(row).toBeVisible();
    await row.click();
    await expect(this.page.locator('#ex-picker-search')).toBeHidden();
  }

  async openExerciseMenu(exi) {
    await this.exerciseCard(exi).locator('[data-toggle-ex-menu]').click();
    await expect(this.page.locator('.ex-menu')).toBeVisible();
  }

  async removeExercise(exi) {
    await this.openExerciseMenu(exi);
    await this.page.locator(`[data-del-exercise="${exi}"]`).click();
  }

  async duplicateExercise(exi) {
    await this.openExerciseMenu(exi);
    await this.page.locator(`[data-dup-exercise="${exi}"]`).click();
  }

  async moveExerciseUp(exi) {
    await this.openExerciseMenu(exi);
    await this.page.locator(`[data-move-exercise-up="${exi}"]`).click();
  }

  async moveExerciseDown(exi) {
    await this.openExerciseMenu(exi);
    await this.page.locator(`[data-move-exercise-down="${exi}"]`).click();
  }

  async toggleCollapse(exi) {
    await this.exerciseCard(exi).locator(`[data-toggle-ex-collapse="${exi}"]`).first().click();
  }

  /** The set table (and its column headers) only renders while the card is expanded. */
  setTableHeader(exi) {
    return this.exerciseCard(exi).locator('.set-table-header');
  }

  // ---------------------------------------------------------------------------
  // Set logging
  // ---------------------------------------------------------------------------

  weightInput(exi, si) {
    return this.page.locator(`[data-set-field="${exi}|${si}|weight"]`);
  }

  repsInput(exi, si) {
    return this.page.locator(`[data-set-field="${exi}|${si}|reps"]`);
  }

  rpeButton(exi, si) {
    return this.page.locator(`[data-rpe="${exi}|${si}"]`);
  }

  checkButton(exi, si) {
    return this.page.locator(`[data-set-done="${exi}|${si}"]`);
  }

  deleteSetButton(exi, si) {
    return this.page.locator(`[data-del-set="${exi}|${si}"]`);
  }

  duplicateSetButton(exi, si) {
    return this.page.locator(`[data-dup-set="${exi}|${si}"]`);
  }

  setRows(exi) {
    return this.exerciseCard(exi).locator('.set-row-wrap');
  }

  /** Set fields commit on `change`, so an explicit blur after fill is required (not every
   *  keystroke persists -- see the `[data-set-field]` "change" listener in app.js). */
  async enterWeight(exi, si, value) {
    const el = this.weightInput(exi, si);
    await el.fill(String(value));
    await el.evaluate(node => node.blur());
  }

  async enterReps(exi, si, value) {
    const el = this.repsInput(exi, si);
    await el.fill(String(value));
    await el.evaluate(node => node.blur());
  }

  async enterRpe(exi, si, value) {
    await this.rpeButton(exi, si).click();
    await expect(this.page.locator(`[data-rpe-preset="${value}"]`)).toBeVisible();
    await this.page.locator(`[data-rpe-preset="${value}"]`).click();
  }

  async completeSet(exi, si) {
    await this.checkButton(exi, si).click();
  }

  async addSet(exi) {
    await this.page.locator(`[data-add-set="${exi}"]`).click();
  }

  /** Swipe-to-delete's real button -- it sits BEHIND the row at rest (z-index:0 vs the row's
   *  z-index:1, revealed only by the swipe gesture translating the row aside), so a simulated
   *  mouse click at its coordinates would just hit the row on top of it, even with
   *  Playwright's `force` option (force skips Playwright's actionability checks, it does not
   *  change real browser hit-testing). Calling the DOM `.click()` method directly invokes the
   *  same click handler the swipe gesture would, without needing to simulate a touch drag. */
  async deleteSet(exi, si) {
    await this.deleteSetButton(exi, si).evaluate(el => el.click());
  }

  async duplicateSet(exi, si) {
    await this.duplicateSetButton(exi, si).evaluate(el => el.click());
  }

  /** The app's accessible, non-swipe way to remove a set (from the exercise's ⋮ menu) --
   *  removes the last set of the exercise. */
  async removeLastSet(exi) {
    await this.openExerciseMenu(exi);
    await this.page.locator(`[data-remove-last-set="${exi}"]`).click();
  }

  // ---------------------------------------------------------------------------
  // Exercise notes (the app has exercise-level notes, not per-set notes)
  // ---------------------------------------------------------------------------

  async openNotes(exi) {
    const collapsedBtn = this.page.locator(`[data-menu-notes="${exi}"]`);
    if (await collapsedBtn.count()) await collapsedBtn.click();
  }

  notesInput(exi) {
    return this.page.locator(`[data-notes-exercise="${exi}"]`);
  }

  async enterNotes(exi, text) {
    await this.openNotes(exi);
    const el = this.notesInput(exi);
    await expect(el).toBeVisible();
    await el.fill(text);
    await el.evaluate(node => node.blur());
  }

  // ---------------------------------------------------------------------------
  // Rest timer / workout timer
  // ---------------------------------------------------------------------------

  async setRestDuration(exi, seconds) {
    await this.page.locator(`[data-rest-toggle="${exi}"]`).click();
    await expect(this.page.locator(`[data-rest-preset="${seconds}"]`)).toBeVisible();
    await this.page.locator(`[data-rest-preset="${seconds}"]`).click();
  }

  get timerOverlay() {
    return this.page.locator('.timer-overlay');
  }

  async skipRestTimer() {
    await this.page.locator('[data-action="cancel-timer"]').click();
  }

  // ---------------------------------------------------------------------------
  // Keyboard-aware layout contract (see tests/workout/keyboard-behavior.spec.js for why this
  // is driven directly rather than through a real OS on-screen keyboard).
  // ---------------------------------------------------------------------------

  get bottomNav() {
    return this.page.locator('nav.bottom-nav');
  }

  async simulateKeyboardOpen() {
    await this.page.evaluate(() => document.body.classList.add('kb-open'));
  }

  async simulateKeyboardClose() {
    await this.page.evaluate(() => document.body.classList.remove('kb-open'));
  }
}

/**
 * ---------------------------------------------------------------------------
 * data-testid RECOMMENDATIONS (none of these exist today; every selector above uses the
 * app's existing data-* action/field attributes instead, per "do not modify application
 * code"). Worth adding if this suite grows further:
 *
 *   - data-testid="wk-ex-card"           on each exercise card (a stable selector that
 *     doesn't rely on positional index, which currently shifts on every reorder/remove).
 *   - data-testid="wk-session-row"       on each recent-session history row (currently only
 *     identified by `data-view-session="<id>"`, fine once you know the id, awkward to assert
 *     "a new row exists" generically).
 *   - data-testid="wk-timer-overlay-remaining" on the rest-timer countdown text node, so tests
 *     can read the remaining time without depending on `.timer-ring` styling classes.
 * ---------------------------------------------------------------------------
 */
