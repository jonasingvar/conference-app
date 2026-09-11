import { expect } from '@playwright/test';

/**
 * Shared helpers for verification tests.
 *
 * The app has no auth: whichever attendee is selected in the header is the
 * active user, and that choice lives in localStorage under `orbit:currentUserId`.
 */

export const ATTENDEES = {
  jonas: 1,      // VIP, big plan, has cross-town clashes
  amara: 2,      // Speaker — presenting 3 sessions
  kenji: 3,      // Standard, small plan
  sofia: 4,      // VIP, biggest plan
  marcus: 5,     // Standard, smallest plan
  priya: 6,      // Speaker — presenting 2 sessions
};

/** Open a route as a given attendee. Always use this instead of page.goto(). */
export async function visit(page, path = '/', { as = ATTENDEES.jonas } = {}) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('orbit:currentUserId', String(id));
  }, as);
  await page.goto(path);
  await expect(page.getByRole('banner')).toBeVisible();
}

/** Fail the test if the page logged a console error or threw. */
export function failOnPageErrors(page, errors = []) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Wait for a list to finish loading (skeletons gone, count rendered). */
export async function waitForResults(page, testId = 'result-count') {
  await expect(page.getByTestId(testId)).not.toHaveText(/Loading/, { timeout: 10_000 });
}
