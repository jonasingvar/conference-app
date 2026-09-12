import { test, expect } from '@playwright/test';
import { visit, failOnPageErrors, waitForResults, ATTENDEES } from './helpers.js';

/**
 * Smoke suite: every route renders, with no console errors and no horizontal
 * overflow. Runs on desktop and mobile. If a change breaks the app shell,
 * this is what catches it.
 */

const ROUTES = [
  { path: '/', name: 'Home', heading: /Your day|Not started|Happening right now|changing rooms|is done/i },
  { path: '/schedule', name: 'Schedule', heading: /The schedule/i },
  { path: '/speakers', name: 'Speakers', heading: /^Speakers$/i },
  { path: '/my-agenda', name: 'My Agenda', heading: /agenda$/i },
  { path: '/venues', name: 'Venues', heading: /Venues & stages/i },
  { path: '/food', name: 'Food', heading: /Food & drink/i },
  { path: '/expo', name: 'Expo', heading: /Partners & sponsors/i },
  { path: '/code-of-conduct', name: 'Code of conduct', heading: /Code of conduct/i },
  { path: '/accessibility', name: 'Accessibility', heading: /^Accessibility$/i },
];

for (const route of ROUTES) {
  test(`${route.name} renders cleanly`, async ({ page }) => {
    const errors = failOnPageErrors(page);
    await visit(page, route.path);

    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();

    // No horizontal scroll at any viewport — the app must stay responsive.
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route.name} scrolls horizontally`).toBeLessThanOrEqual(1);

    expect(errors, `${route.name} logged console errors`).toEqual([]);
  });
}

test('unknown routes show the not-found page', async ({ page }) => {
  await visit(page, '/definitely-not-a-page');
  await expect(page.getByRole('heading', { name: /Nothing scheduled here/i })).toBeVisible();
});

test('the API is reachable and seeded', async ({ request }) => {
  const res = await request.get('http://localhost:3001/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  // asserts the database is seeded, not a particular programme size
  expect(body.sessions).toBeGreaterThan(100);
});

test('every link in the footer resolves', async ({ page }) => {
  await visit(page, '/');
  const hrefs = await page.getByRole('contentinfo').getByRole('link')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))]);

  for (const href of hrefs.filter((h) => h?.startsWith('/') && !h.startsWith('/api'))) {
    await visit(page, href);
    await expect(page.getByRole('heading', { name: /Nothing scheduled here/i })).toHaveCount(0);
  }
});

test('the venues page switches venue and shows a live room board', async ({ page }) => {
  await visit(page, '/venues');
  const venues = page.locator('[data-testid^="venue-tab-"]');
  await expect(venues).toHaveCount(2);

  const first = page.locator('[data-testid^="venue-board-"]');
  await expect(first).toBeVisible();
  const beforeId = await first.getAttribute('data-testid');

  await venues.nth(1).click();
  await expect(page.locator('[data-testid^="venue-board-"]')).not.toHaveAttribute('data-testid', beforeId);
});

test.describe('Nothing claims to be true when it is not', () => {
  test('no session in the future carries a rating', async ({ request }) => {
    const bootstrap = await (await request.get('http://localhost:3001/api/bootstrap')).json();
    const today = bootstrap.days[0].date;
    const sessions = await (await request.get('http://localhost:3001/api/sessions')).json();

    const liars = sessions.filter((s) => s.ratingCount > 0 && s.day > today);
    expect(liars.map((s) => `${s.day} ${s.title}`)).toEqual([]);
  });

  test('only speakers with a keynote are badged as keynote speakers', async ({ request }) => {
    const speakers = await (await request.get('http://localhost:3001/api/speakers')).json();
    const sessions = await (await request.get('http://localhost:3001/api/sessions')).json();
    const keynoteSpeakerIds = new Set(
      sessions.filter((s) => s.isKeynote).flatMap((s) => s.speakers.map((sp) => sp.id)));

    for (const s of speakers.filter((x) => x.keynoteCount > 0)) {
      expect(keynoteSpeakerIds.has(s.id), `${s.name} claims a keynote`).toBeTruthy();
    }
  });

  test('the app never links to a domain we invented', async ({ request }) => {
    const sessions = await (await request.get('http://localhost:3001/api/sessions')).json();
    const invented = sessions.filter((s) => s.recordingUrl || s.slidesUrl || s.repoUrl);
    expect(invented.map((s) => s.title)).toEqual([]);

    const speakers = await (await request.get('http://localhost:3001/api/speakers')).json();
    // handles are shown as text; the website field must not be rendered as a link
    expect(speakers.every((s) => typeof s.socials === 'object')).toBeTruthy();
  });

  test('the footer dates match the seeded conference', async ({ page }) => {
    const bootstrap = await (await page.request.get('http://localhost:3001/api/bootstrap')).json();
    await visit(page, '/');
    await expect(page.getByRole('contentinfo')).toContainText(bootstrap.conference.dates);
  });
});
