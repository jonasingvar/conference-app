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

/**
 * Day 1 is whatever date the database was seeded on, so tests must ask rather
 * than hard-code. Cached per worker.
 */
let cachedDays = null;
export async function conferenceDays() {
  if (!cachedDays) {
    const res = await fetch('http://localhost:3001/api/bootstrap');
    cachedDays = (await res.json()).days.map((d) => d.date);
  }
  return cachedDays;
}

/** `await momentOn(0, '10:30')` → a clock value inside day 1's 10:15 slot. */
export async function momentOn(dayIndex, time) {
  const days = await conferenceDays();
  return `${days[dayIndex]}T${time}`;
}

export const MID_SESSION_TIME = '10:30';   // inside the 10:15 slot
export const BETWEEN_SLOTS_TIME = '11:10'; // the gap before 11:30

/** Open a route as a given attendee, optionally with the clock pinned. */
export async function visit(page, path = '/', { as = ATTENDEES.jonas, at = null } = {}) {
  await page.addInitScript(({ id, clockAt }) => {
    window.localStorage.setItem('orbit:currentUserId', String(id));
    if (clockAt) window.localStorage.setItem('orbit:clockAt', clockAt);
    else window.localStorage.removeItem('orbit:clockAt');
  }, { id: as, clockAt: at });
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
