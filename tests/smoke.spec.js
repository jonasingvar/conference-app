import { test, expect } from '@playwright/test';
import { visit, failOnPageErrors, waitForResults, ATTENDEES } from './helpers.js';

/**
 * Smoke suite: every route renders, with no console errors and no horizontal
 * overflow. Runs on desktop and mobile. If a change breaks the app shell,
 * this is what catches it.
 */

const ROUTES = [
  { path: '/', name: 'Home', heading: /The model is the easy part/i },
  { path: '/schedule', name: 'Schedule', heading: /The schedule/i },
  { path: '/speakers', name: 'Speakers', heading: /^Speakers$/i },
  { path: '/my-plan', name: 'My Plan', heading: /plan$/i },
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
