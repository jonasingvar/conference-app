import { test, expect } from '@playwright/test';
import { visit, waitForResults } from './helpers.js';

test.describe('Schedule', () => {
  test('lists sessions for the selected day', async ({ page }) => {
    await visit(page, '/schedule');
    await waitForResults(page);
    await expect(page.getByTestId('result-count')).toContainText(/\d+ sessions on/);
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('switching day changes the results', async ({ page }) => {
    await visit(page, '/schedule');
    await waitForResults(page);
    const first = await page.getByTestId('result-count').textContent();

    await page.getByTestId('tab-2026-10-14').click();
    await waitForResults(page);
    await expect(page.getByTestId('result-count')).toContainText('Oct 14');
    await expect(page).toHaveURL(/day=2026-10-14/);
  });

  test('search narrows the list and survives a reload', async ({ page }) => {
    await visit(page, '/schedule');
    await waitForResults(page);

    await page.getByTestId('search-input').fill('agents');
    await waitForResults(page);
    const count = await page.getByTestId('result-count').textContent();
    expect(count).not.toContain('Loading');

    await expect(page).toHaveURL(/q=agents/);
    await page.reload();
    await expect(page.getByTestId('search-input')).toHaveValue('agents');
  });

  test('filtering by venue only returns that venue', async ({ page }) => {
    await visit(page, '/schedule?venue=2');
    await waitForResults(page);
    // Everything at the Foundry carries the cross-town chip.
    const cards = page.locator('article');
    await expect(cards.first()).toContainText('Foundry');
  });

  test('an impossible filter combination shows the empty state', async ({ page }) => {
    await visit(page, '/schedule?q=zzzznotathing');
    await expect(page.getByRole('heading', { name: /No sessions match/i })).toBeVisible();
  });
});
