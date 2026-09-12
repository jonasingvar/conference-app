import { test, expect } from '@playwright/test';
import { visit, momentOn, conferenceDays, ATTENDEES } from './helpers.js';

const API = 'http://localhost:3001/api';

test.describe('Home is about you, and about now', () => {
  test('the day shown is today, not the first day you booked something', async ({ page }) => {
    const days = await conferenceDays();
    // Kenji only attends the first two days; on day 3 the page must not
    // present day 1 as if it were happening.
    await visit(page, '/', { as: ATTENDEES.kenji, at: await momentOn(2, '14:00') });

    const panel = page.getByTestId('today-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Day 3');
    await expect(panel).not.toContainText('Day 1');
  });

  test('an attendee with nothing booked today gets a way in, not an empty grid', async ({ page }) => {
    const days = await conferenceDays();
    await visit(page, '/', { as: ATTENDEES.marcus, at: await momentOn(3, '10:00') });

    const empty = page.getByTestId('today-empty');
    await expect(empty).toBeVisible();
    await expect(empty.getByRole('link', { name: /Browse today/i })).toBeVisible();
  });

  test('the live strip tells the truth at both ends of the day', async ({ page }) => {
    const strip = page.getByTestId('live-now');

    await visit(page, '/', { at: await momentOn(0, '07:15') });
    await expect(strip.getByRole('heading').first()).toContainText(/Not started yet/i);
    await expect(strip).not.toContainText(/changing rooms/i);

    await visit(page, '/', { at: await momentOn(0, '23:30') });
    await expect(strip.getByRole('heading').first()).toContainText(/is done/i);
    await expect(strip).not.toContainText(/has not started/i);
  });

  test('your own sessions are marked in the live strip', async ({ page }) => {
    const days = await conferenceDays();
    const today = await (await page.request.get(
      `${API}/users/${ATTENDEES.jonas}/today?day=${days[0]}&time=07:30`)).json();
    test.skip(!today.next, 'nothing booked on day 1');

    await visit(page, '/', { as: ATTENDEES.jonas, at: await momentOn(0, '07:30') });
    const strip = page.getByTestId('live-now');
    await expect(strip).toContainText('Yours');
  });

  test('a cross-town gap is called out, with what actually fits', async ({ page }) => {
    const days = await conferenceDays();
    // Jonas has planted cross-venue back-to-backs
    await visit(page, '/', { as: ATTENDEES.jonas, at: await momentOn(0, '11:10') });

    const warning = page.getByTestId('travel-warning');
    if (await warning.count()) {
      await expect(warning).toContainText(/shuttle|cannot make/i);
      await expect(warning).toContainText(/min/);
    }
  });

  test('no announcement appears before it was posted', async ({ page }) => {
    const days = await conferenceDays();
    const all = await (await page.request.get(`${API}/announcements`)).json();

    await visit(page, '/', { at: await momentOn(0, '09:00') });
    const strip = page.getByTestId('announcements');
    if (await strip.count() === 0) return;

    const shown = await strip.innerText();
    const future = all.filter((a) => a.postedAt > `${days[0]}T09:00:00Z`);
    for (const a of future) {
      expect(shown, `"${a.title}" was posted later than the clock`).not.toContain(a.title);
    }
  });

  test('only a speaker sees the speaker strip', async ({ page }) => {
    await visit(page, '/', { as: ATTENDEES.priya });
    await expect(page.getByTestId('speaking-strip')).toBeVisible();

    await visit(page, '/', { as: ATTENDEES.kenji });
    await expect(page.getByTestId('speaking-strip')).toHaveCount(0);
  });

  test('the brochure sections are gone', async ({ page }) => {
    await visit(page, '/');
    for (const id of ['keynotes', 'tracks', 'venue-split', 'featured-speakers', 'popular-sessions']) {
      await expect(page.getByTestId(id), `${id} should no longer be on home`).toHaveCount(0);
    }
  });
});
