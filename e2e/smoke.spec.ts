import { expect, test } from '@playwright/test';

// Saturday July 11, 2026, 10:30 in Boston: plenty of markets are open.
const NOW = 'now=2026-07-11T10:30';

test('home lists markets open now, loaded from static data under the sub-path', async ({ page }) => {
  await page.goto(`#/?${NOW}`);
  await expect(page.getByRole('heading', { name: 'Open now near you' })).toBeVisible();
  await expect(page.getByText(/Open until/).first()).toBeVisible();
});

test('deep link to a market page works', async ({ page }) => {
  await page.goto(`#/market/copley-square-boston-ma?now=2026-07-14T12:00`);
  await expect(page.getByRole('heading', { level: 1, name: 'Copley Square Farmers Market' })).toBeVisible();
  await expect(page.getByText('Open until 6:00 PM').first()).toBeVisible();
});

test('a manager closure removes the market from "open now"', async ({ page }) => {
  await page.goto(`#/manager?now=2026-07-14T12:00`);
  await expect(page.getByText('Open until 6:00 PM', { exact: true })).toBeVisible();
  await page.getByLabel('Reason').fill('Closed due to rain');
  await page.getByRole('button', { name: 'Post closure' }).click();
  await expect(page.getByText('Closed due to rain')).toBeVisible();
  await expect(page.getByText('Open until 6:00 PM', { exact: true })).toHaveCount(0);
});
