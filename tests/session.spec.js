import { test, expect } from '@playwright/test';
import { visit } from './helpers.js';

test.describe('Session detail', () => {
  test('shows the full session record', async ({ page }) => {
    await visit(page, '/sessions/1');
    const detail = page.getByTestId('session-detail');
    await expect(page.getByTestId('session-title')).toBeVisible();
    await expect(detail).toContainText('About this session');
    await expect(detail.getByRole('heading', { name: /Speaker/ })).toBeVisible();
  });

  test('saving from the detail page toggles the button', async ({ page }) => {
    await visit(page, '/sessions/5');
    const save = page.getByTestId('save-session');
    const before = await save.innerText();
    await save.click();
    await expect(save).not.toHaveText(before);
  });

  test('off-site sessions warn about travel time', async ({ page }) => {
    // Find a Foundry session, then open it.
    await visit(page, '/schedule?venue=2&view=list');
    await expect(page.getByTestId('result-count')).not.toHaveText(/Loading/);
    await page.locator('article').first().getByRole('heading').click();

    await expect(page.getByTestId('travel-notice')).toBeVisible();
    await expect(page.getByTestId('travel-notice')).toContainText(/min/);
  });

  test('navigating from a session to its speaker works', async ({ page }) => {
    await visit(page, '/sessions/1');
    await page.getByRole('link', { name: /./ }).filter({ hasText: /Labs|Systems|AI|Research/ }).first().click();
    await expect(page.getByTestId('speaker-detail')).toBeVisible();
  });
});
