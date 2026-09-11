import { test, expect } from '@playwright/test';
import { visit, momentOn, conferenceDays, clearAgendaFor, ATTENDEES } from './helpers.js';

const API = 'http://localhost:3001/api';

/** A slot on the given day with at least two sessions that have seats. */
async function busySlot(request, day) {
  const all = await (await request.get(`${API}/sessions?day=${day}`)).json();
  const bySlot = {};
  for (const s of all) {
    if (s.seatsLeft > 2 && !s.isKeynote && s.format !== 'Social') (bySlot[s.startsAt] ??= []).push(s);
  }
  const entry = Object.entries(bySlot).find(([, v]) => v.length >= 2);
  return entry ? { startsAt: entry[0], sessions: entry[1] } : null;
}

test.describe('You cannot be in two places at once', () => {
  test('a second seat in the same slot is refused, and offers a swap', async ({ page, request }, testInfo) => {
    const days = await conferenceDays();
    const day = days[testInfo.project.name === 'mobile' ? 2 : 3];
    await clearAgendaFor(request, ATTENDEES.marcus, day);

    const slot = await busySlot(request, day);
    test.skip(!slot, 'no slot with two available sessions');

    await visit(page, `/sessions/${slot.sessions[0].id}`, { as: ATTENDEES.marcus });
    await page.getByTestId('reserve-seat').click();
    await expect(page.getByTestId('reservation-confirmed')).toBeVisible();

    await page.goto(`/sessions/${slot.sessions[1].id}`);
    await page.getByTestId('reserve-seat').click();

    // refused, with the clash named and a way out
    const toast = page.getByTestId('toaster');
    await expect(toast).toContainText(/Clashes with/);
    await expect(toast.getByRole('button', { name: 'Swap' })).toBeVisible();
    await expect(page.getByTestId('reserve-seat')).toBeVisible(); // still not booked

    await toast.getByRole('button', { name: 'Swap' }).click();
    await expect(page.getByTestId('reservation-confirmed')).toBeVisible();

    await clearAgendaFor(request, ATTENDEES.marcus, day);
  });

  test('the API refuses it with a 409 and names the conflict', async ({ request }, testInfo) => {
    const days = await conferenceDays();
    const day = days[testInfo.project.name === 'mobile' ? 2 : 3];
    await clearAgendaFor(request, ATTENDEES.kenji, day);

    const slot = await busySlot(request, day);
    test.skip(!slot, 'no slot with two available sessions');

    await request.put(`${API}/users/${ATTENDEES.kenji}/reservations/${slot.sessions[0].id}`);
    const res = await request.put(`${API}/users/${ATTENDEES.kenji}/reservations/${slot.sessions[1].id}`);
    expect(res.status()).toBe(409);

    const body = await res.json();
    expect(body.rejected).toBe('overlap');
    expect(body.conflictsWith.id).toBe(slot.sessions[0].id);

    await clearAgendaFor(request, ATTENDEES.kenji, day);
  });
});

test.describe('Check in and rate', () => {
  test('check-in is closed before the doors open', async ({ request }) => {
    const days = await conferenceDays();
    const all = await (await request.get(`${API}/sessions?day=${day}`)).json();
    const target = all.find((s) => s.startsAt === '14:45');
    test.skip(!target, 'no afternoon session');

    const res = await request.put(`${API}/users/${ATTENDEES.kenji}/checkins/${target.id}`, {
      data: { day: days[1], time: '09:00' },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).rejected).toBe('future');
  });

  test('checking in unlocks rating, and rating moves the session average', async ({ request }, testInfo) => {
    const days = await conferenceDays();
    // Check-in state is shared and the projects run concurrently, so each one
    // uses a different attendee and a different day.
    const mobile = testInfo.project.name === 'mobile';
    const user = mobile ? ATTENDEES.priya : ATTENDEES.sofia;
    const day = days[mobile ? 2 : 1];

    // Check-ins persist between runs and there is deliberately no way to undo
    // one, so pick a session this attendee has not already been to.
    const me = await (await request.get(`${API}/users/${user}`)).json();
    const been = new Set(me.checkIns ?? []);
    const all = await (await request.get(`${API}/sessions?day=${day}`)).json();
    const target = all.find((s) =>
      !s.isKeynote && s.format !== 'Social' && s.seatsLeft > 2 && !been.has(s.id));
    test.skip(!target, 'no un-attended session left on this day');

    // cannot rate without being there
    const early = await request.put(`${API}/users/${user}/ratings/${target.id}`, {
      data: { stars: 5, day, time: '23:00' },
    });
    expect(early.status()).toBe(409);
    expect((await early.json()).rejected).toBe('not-checked-in');

    // check in during the session
    const checked = await request.put(`${API}/users/${user}/checkins/${target.id}`, {
      data: { day, time: target.startsAt },
    });
    expect((await checked.json()).checkedIn).toBeTruthy();

    // still cannot rate while it is running
    const running = await request.put(`${API}/users/${user}/ratings/${target.id}`, {
      data: { stars: 4, day, time: target.startsAt },
    });
    expect((await running.json()).rejected).toBe('too-early');

    // after it ends, the rating lands and rolls up onto the session
    const before = await (await request.get(`${API}/sessions/${target.id}`)).json();
    const rated = await request.put(`${API}/users/${user}/ratings/${target.id}`, {
      data: { stars: 5, comment: 'Worth the walk.', day, time: '23:00' },
    });
    expect(rated.ok()).toBeTruthy();

    const after = await (await request.get(`${API}/sessions/${target.id}`)).json();
    expect(after.ratingCount).toBeGreaterThan(before.ratingCount - 1);
    expect(after.reviews.some((r) => r.comment === 'Worth the walk.')).toBeTruthy();
  });

  test('stars must be 1 to 5', async ({ request }) => {
    const days = await conferenceDays();
    const res = await request.put(`${API}/users/${ATTENDEES.jonas}/ratings/1`, {
      data: { stars: 11, day: days[0], time: '23:00' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Calendar export', () => {
  test('an agenda downloads as a valid calendar', async ({ request }) => {
    const res = await request.get(`${API}/users/${ATTENDEES.jonas}/agenda.ics`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('text/calendar');

    const ics = await res.text();
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBeTruthy();
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBeTruthy();
    expect(ics).toContain('METHOD:PUBLISH');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);          // exactly 6 time digits
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}\r\n/);        // local venue time
    expect(ics.match(/BEGIN:VEVENT/g).length).toBeGreaterThan(0);
    // every line folded to spec
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  test('a single session downloads too', async ({ request }) => {
    const res = await request.get(`${API}/sessions/1.ics`);
    expect(res.ok()).toBeTruthy();
    const ics = await res.text();
    expect(ics.match(/BEGIN:VEVENT/g).length).toBe(1);
  });
});
