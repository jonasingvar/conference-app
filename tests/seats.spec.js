import { test, expect } from '@playwright/test';
import { visit, ATTENDEES } from './helpers.js';

const API = 'http://localhost:3001/api';

/**
 * Attendees start with seeded reservations, so a test must not assume a
 * session is un-reserved. Put the panel into a known state first.
 */
async function ensureNotReserved(page) {
  const release = page.getByTestId('release-seat');
  if (await release.isVisible().catch(() => false)) {
    await release.click();
    await page.getByTestId('reserve-seat').waitFor();
  }
}

/**
 * Seat counts are shared server state, and the desktop and mobile projects run
 * at the same time. Each project therefore works on a *different* session, so
 * the two never fight over the same counter.
 */
async function findSessions(request, testInfo) {
  const res = await request.get(`${API}/sessions?sort=popularity`);
  const all = await res.json();
  const spare = all.filter((s) => s.seatsLeft > 3 && !s.isKeynote && s.format !== 'Social');
  const offset = testInfo.project.name === 'mobile' ? 1 : 0;
  return {
    open: spare[offset * Math.floor(spare.length / 2)],
    full: all.find((s) => s.seatsLeft === 0),
  };
}

/**
 * The seed puts one session at capacity *and* gives Jonas a confirmed seat on
 * it. Plenty of other sessions happen to be full, so find this one by looking
 * for the reservation rather than just for a full room.
 */
async function findPromotionFixture(request) {
  const user = await (await request.get(`${API}/users/${ATTENDEES.jonas}`)).json();
  for (const r of user.reservations.filter((x) => x.status === 'confirmed')) {
    const seats = await (await request.get(
      `${API}/users/${ATTENDEES.jonas}/reservations/${r.sessionId}`)).json();
    if (seats.isFull) return r.sessionId;
  }
  return null;
}

// Each test picks a different session per project, so they can run in parallel.
test.describe('Seat reservation', () => {
  test('reserving moves the seat count, and releasing gives it back', async ({ page, request }, testInfo) => {
    const { open } = await findSessions(request, testInfo);
    await visit(page, `/sessions/${open.id}`, { as: ATTENDEES.kenji });
    await ensureNotReserved(page);

    const count = page.getByTestId('seat-count');
    const start = await count.innerText();

    await page.getByTestId('reserve-seat').click();
    await expect(page.getByTestId('reservation-confirmed')).toBeVisible();
    await expect(count).not.toHaveText(start);

    await page.getByTestId('release-seat').click();
    await expect(page.getByTestId('reserve-seat')).toBeVisible();
    await expect(count).toHaveText(start); // no leaked seat
  });

  test('a reservation is server state and survives a reload', async ({ page, request }, testInfo) => {
    const { open } = await findSessions(request, testInfo);
    await visit(page, `/sessions/${open.id}`, { as: ATTENDEES.sofia });
    await ensureNotReserved(page);

    await page.getByTestId('reserve-seat').click();
    await expect(page.getByTestId('reservation-confirmed')).toBeVisible();
    const held = await page.getByTestId('seat-count').innerText();

    await page.reload();
    await expect(page.getByTestId('reservation-confirmed')).toBeVisible();
    await expect(page.getByTestId('seat-count')).toHaveText(held);

    await page.getByTestId('release-seat').click();
    await expect(page.getByTestId('reserve-seat')).toBeVisible();
  });

  test('a full session offers the waitlist instead of a seat', async ({ page, request }, testInfo) => {
    const { full } = await findSessions(request, testInfo);
    test.skip(!full, 'no session is at capacity');

    await visit(page, `/sessions/${full.id}`, { as: ATTENDEES.kenji });
    await ensureNotReserved(page);
    await expect(page.getByTestId('seats-left')).toContainText('Full');
    await expect(page.getByTestId('reserve-seat')).toContainText(/waitlist/i);

    await page.getByTestId('reserve-seat').click();
    await expect(page.getByTestId('reservation-waitlisted')).toBeVisible();
    // joining a waitlist must not consume a seat
    await expect(page.getByTestId('seats-left')).toContainText('Full');

    await page.getByTestId('release-seat').click();
    await expect(page.getByTestId('reserve-seat')).toBeVisible();
  });

  test('reserving twice does not take two seats', async ({ request }, testInfo) => {
    const { open } = await findSessions(request, testInfo);
    const url = `${API}/users/${ATTENDEES.marcus}/reservations/${open.id}`;

    const first = await (await request.put(url)).json();
    const second = await (await request.put(url)).json();
    expect(second.seatsTaken).toBe(first.seatsTaken);
    expect(second.status).toBe('confirmed');

    await request.delete(url);
  });

  test('releasing a seat promotes whoever waited longest', async ({ request }, testInfo) => {
    // Mutates one shared fixture session, so only one project runs it.
    test.skip(testInfo.project.name !== 'desktop', 'single-project test');
    const sessionId = await findPromotionFixture(request);
    test.skip(!sessionId, 'no full session with a confirmed holder');

    const waiter = `${API}/users/${ATTENDEES.kenji}/reservations/${sessionId}`;
    const holder = `${API}/users/${ATTENDEES.jonas}/reservations/${sessionId}`;

    // Clear anyone else queued from an earlier run so the promotion order is
    // unambiguous. Removing a *waitlisted* entry does not free a seat.
    for (const id of Object.values(ATTENDEES)) {
      if (id !== ATTENDEES.jonas) {
        await request.delete(`${API}/users/${id}/reservations/${sessionId}`);
      }
    }

    const queued = await (await request.put(waiter)).json();
    expect(queued.status).toBe('waitlisted');

    // The seeded holder gives up their confirmed seat.
    const released = await (await request.delete(holder)).json();
    expect(released.promoted).toBe(ATTENDEES.kenji);

    // Kenji now holds a real seat, and the room is still full.
    const after = await (await request.get(`${API}/users/${ATTENDEES.kenji}/reservations/${sessionId}`)).json();
    expect(after.status).toBe('confirmed');
    expect(after.isFull).toBeTruthy();

    // put the fixture back
    await request.delete(waiter);
    await request.put(holder);
  });

});

test.describe('Waitlists', () => {
  test('the programme actually contains full sessions with queues', async ({ request }) => {
    const all = await (await request.get(`${API}/sessions`)).json();
    const full = all.filter((s) => s.isFull);
    expect(full.length, 'no sold-out sessions to waitlist onto').toBeGreaterThan(3);
    expect(full.some((s) => s.waitlistCount > 0), 'no session has a queue').toBeTruthy();
  });

  test('a full session shows the queue length in the listing', async ({ page, request }) => {
    const all = await (await request.get(`${API}/sessions`)).json();
    const queued = all.find((s) => s.isFull && s.waitlistCount > 0);
    test.skip(!queued, 'no queued session');

    await visit(page, `/schedule?day=${queued.day}&view=list`);
    const card = page.locator('article').filter({ hasText: queued.title }).first();
    await expect(card).toContainText(/Full · \d+ waiting/);
  });

  test('joining a queue reports a position behind the people already there', async ({ page, request }) => {
    const all = await (await request.get(`${API}/sessions`)).json();
    const queued = all.find((s) => s.isFull && s.waitlistCount > 0);
    test.skip(!queued, 'no queued session');

    await visit(page, `/sessions/${queued.id}`, { as: ATTENDEES.kenji });
    const release = page.getByTestId('release-seat');
    if (await release.isVisible().catch(() => false)) {
      await release.click();
      await page.getByTestId('reserve-seat').waitFor();
    }

    await page.getByTestId('reserve-seat').click();
    const panel = page.getByTestId('reservation-waitlisted');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Position \d+ of \d+/);
    await expect(panel).toContainText(/ahead of you|next in line/);

    await page.getByTestId('release-seat').click();
    await expect(page.getByTestId('reserve-seat')).toBeVisible();
  });
});
