import { test, expect } from '@playwright/test';
import { API, visit, momentOn, laneFor, bookableFor, conferenceDays, ATTENDEES } from './helpers.js';


test.describe('My Agenda', () => {
  test('adding a session from the schedule puts it on the agenda', async ({ page, request }, testInfo) => {
    const lane = await laneFor('agenda.add', testInfo);
    const target = (await bookableFor(request, lane.user, lane.day)).find((s) => s.seatsLeft > 3);
    expect(target, 'nothing this attendee can add').toBeTruthy();

    await visit(page, `/schedule?day=${lane.day}&view=list`, { as: lane.user, at: await momentOn(0, '07:00') });
    await expect(page.getByTestId('result-count')).not.toHaveText(/Loading/);

    const card = page.locator('article').filter({ has: page.getByRole('heading', { name: target.title, exact: true }) });
    const seat = card.getByRole('button', { name: /agenda|waitlist/i });
    await expect(seat).toHaveAttribute('aria-pressed', 'false');
    await seat.click();
    await expect(seat).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/my-agenda');
    await expect(page.getByText(target.title, { exact: false }).first()).toBeVisible();

    // release only what this test booked — the rest of the day is seeded
    await request.delete(`${API}/users/${lane.user}/reservations/${target.id}`);
  });

  test('the hours tile totals the hours shown on each day', async ({ page }) => {
    await visit(page, '/my-agenda', { as: ATTENDEES.sofia });

    const perDay = await page.getByText(/^\d+h of content$/).allTextContents();
    expect(perDay.length, 'needs a plan spanning several days to be worth summing').toBeGreaterThan(1);
    const sum = perDay.reduce((n, text) => n + Number(text.match(/^(\d+)h/)[1]), 0);

    await expect(page.getByTestId('stat-hours-booked')).toHaveText(String(sum));
  });

  test('each attendee sees their own plan', async ({ page }) => {
    await visit(page, '/my-agenda', { as: ATTENDEES.sofia });
    await expect(page.getByRole('heading', { name: /Sofia’s agenda/ })).toBeVisible();

    await visit(page, '/my-agenda', { as: ATTENDEES.kenji });
    await expect(page.getByRole('heading', { name: /Kenji’s agenda/ })).toBeVisible();
  });

  test('the switcher counts what is on an agenda, not what was "saved"', async ({ page }) => {
    await visit(page, '/my-agenda', { as: ATTENDEES.sofia });
    await page.getByRole('button', { name: /Switch attendee/ }).click();

    const option = page.getByRole('option', { name: /Sofia/ });
    await expect(option).toContainText(/[1-9]\d* on agenda/);
    await expect(option).not.toContainText(/saved/i);
  });

  test('switching attendee in the header changes the plan', async ({ page }) => {
    await visit(page, '/my-agenda', { as: ATTENDEES.jonas });
    await expect(page.getByRole('heading', { name: /Jonas’s agenda/ })).toBeVisible();

    await page.getByRole('button', { name: /Switch attendee/ }).click();
    await page.getByRole('option', { name: /Kenji Nakamura/ }).click();
    await expect(page.getByRole('heading', { name: /Kenji’s agenda/ })).toBeVisible();
  });
});

test.describe('Travel between venues', () => {
  /*
   * Reads Jonas's seeded Day 4 trap: Aurora at 09:00, then the Foundry at 10:15.
   * The two slots are back to back, so nothing another lane books can land
   * between them. The shuttle (27 + a 9 min walk) misses a 30 minute gap; a
   * rideshare (18 + 9) makes it.
   */
  test('a cross-town hop the shuttle cannot make is flagged, and a one-venue day is not', async ({ page }) => {
    const days = await conferenceDays();
    await visit(page, '/my-agenda', { as: ATTENDEES.jonas, at: await momentOn(0, '07:00') });

    const day4 = page.getByTestId(`plan-day-${days[3]}`);
    const tight = day4.locator('[data-testid="agenda-travel-note"][data-kind="tight"]');
    await expect(tight).toHaveCount(1);
    await expect(tight).toBeVisible();
    await expect(tight).toContainText(/shuttle/i);
    await expect(tight).toContainText('Rideshare');

    // Day 1 is all Aurora
    await expect(page.getByTestId(`plan-day-${days[0]}`).getByTestId('agenda-travel-note')).toHaveCount(0);
  });
});

test.describe('Speaker view', () => {
  test('a speaking attendee sees their own sessions', async ({ page }) => {
    await visit(page, '/my-agenda', { as: ATTENDEES.amara });
    const panel = page.getByTestId('speaking-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('You are speaking');
    await expect(panel.getByRole('link')).not.toHaveCount(0);
  });

  test('a non-speaking attendee sees no speaker panel', async ({ page }) => {
    await visit(page, '/my-agenda', { as: ATTENDEES.kenji });
    await expect(page.getByTestId('speaking-panel')).toHaveCount(0);
  });
});
