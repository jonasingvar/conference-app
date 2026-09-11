import { test, expect } from '@playwright/test';
import { visit } from './helpers.js';

test.describe('Speakers', () => {
  test('the unfiltered page is tiered, not one flat list', async ({ page }) => {
    await visit(page, '/speakers');
    await expect(page.getByTestId('headline-speakers')).toBeVisible();
    await expect(page.getByTestId('presenting-speakers')).toBeVisible();
    await expect(page.getByTestId('all-speakers')).toBeVisible();
    await expect(page.getByRole('heading', { name: /The headliners/i })).toBeVisible();
  });

  test('searching collapses the tiers into one result grid', async ({ page }) => {
    await visit(page, '/speakers?q=Diallo');
    await expect(page.getByTestId('headline-speakers')).toHaveCount(0);
    await expect(page.getByTestId('speaker-count')).toContainText(/speaker/);
  });

  test('speakers have real portraits, not just initials', async ({ page }) => {
    await visit(page, '/speakers');
    const portraits = page.getByTestId('headline-speakers').locator('img');
    await expect(portraits.first()).toBeVisible();
    const src = await portraits.first().getAttribute('src');
    expect(src).toMatch(/^\/avatars\/speaker-\d{3}\.jpg$/);

    // and the file is actually served
    const res = await page.request.get(new URL(src, page.url()).toString());
    expect(res.ok()).toBeTruthy();
  });

  test('sorting by A–Z reorders the list', async ({ page }) => {
    await visit(page, '/speakers?q=a&sort=name');
    const first = await page.locator('h3').first().innerText();
    await visit(page, '/speakers?q=a&sort=sessions');
    const other = await page.locator('h3').first().innerText();
    expect(first).not.toEqual(other);
  });
});
