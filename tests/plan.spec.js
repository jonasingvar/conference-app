import { test, expect } from '@playwright/test';
import { visit, ATTENDEES } from './helpers.js';

test.describe('My Plan', () => {
  test('saving a session from the schedule adds it to the plan', async ({ page }) => {
    await visit(page, '/schedule?view=list', { as: ATTENDEES.marcus });
    await expect(page.getByTestId('result-count')).not.toHaveText(/Loading/);

    const card = page.locator('article').first();
    const title = await card.getByRole('heading').innerText();
    const star = card.getByRole('button', { name: /my plan/i });

    const wasSaved = (await star.getAttribute('aria-pressed')) === 'true';
    if (wasSaved) await star.click();           // normalise to "not saved"
    await star.click();
    await expect(star).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/my-plan');
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
  });

  test('each attendee sees their own plan', async ({ page }) => {
    await visit(page, '/my-plan', { as: ATTENDEES.sofia });
    await expect(page.getByRole('heading', { name: /Sofia’s plan/ })).toBeVisible();

    await visit(page, '/my-plan', { as: ATTENDEES.kenji });
    await expect(page.getByRole('heading', { name: /Kenji’s plan/ })).toBeVisible();
  });

  test('switching attendee in the header changes the plan', async ({ page }) => {
    await visit(page, '/my-plan', { as: ATTENDEES.jonas });
    await expect(page.getByRole('heading', { name: /Jonas’s plan/ })).toBeVisible();

    await page.getByRole('button', { name: /Switch attendee/ }).click();
    await page.getByRole('option', { name: /Kenji Nakamura/ }).click();
    await expect(page.getByRole('heading', { name: /Kenji’s plan/ })).toBeVisible();
  });
});

test.describe('Speaker view', () => {
  test('a speaking attendee sees their own sessions', async ({ page }) => {
    await visit(page, '/my-plan', { as: ATTENDEES.amara });
    const panel = page.getByTestId('speaking-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('You are speaking');
    await expect(panel.getByRole('link')).not.toHaveCount(0);
  });

  test('a non-speaking attendee sees no speaker panel', async ({ page }) => {
    await visit(page, '/my-plan', { as: ATTENDEES.kenji });
    await expect(page.getByTestId('speaking-panel')).toHaveCount(0);
  });
});
