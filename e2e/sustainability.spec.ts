import { expect, test } from '@playwright/test';

test('both existing search URLs use one region-aware monthly page', async ({ page }) => {
  for (const route of ['search', 'seasonal']) {
    await page.goto(`#/${route}?region=verified-ma&month=6`);
    await expect(page.getByRole('heading', { name: 'In Season Search', exact: true })).toBeVisible();
    const guide = page.getByRole('heading', { name: /June · Massachusetts/ }).locator('..');
    await expect(guide.getByRole('button', { name: 'Strawberries', exact: true })).toBeVisible();
    await expect(guide.getByRole('button', { name: 'Pumpkins', exact: true })).toHaveCount(0);
    await page.getByLabel('Month', { exact: true }).selectOption('10');
    const october = page.getByRole('heading', { name: /October · Massachusetts/ }).locator('..');
    await expect(october.getByRole('button', { name: 'Pumpkins', exact: true })).toBeVisible();
    await expect(october.getByRole('button', { name: 'Strawberries', exact: true })).toHaveCount(0);
    await page.getByLabel('Growing region').selectOption('SW');
    await expect(page.getByLabel('Growing region')).toHaveValue('SW');
    await expect(page.getByRole('heading', { name: /Markets in Desert Southwest/ })).toBeVisible();
  }
});

test('manual multi-item purchases feed visit counts, spending and honest missing-data states', async ({
  page,
}) => {
  await page.goto('#/search?view=purchases');
  await expect(page.getByRole('heading', { name: 'Record a market visit' })).toBeVisible();
  await expect(page.getByText(/Tab-memory demo:/)).toBeVisible();
  await page.getByLabel('Find a market').fill('Copley');
  await page.getByLabel('Farmers market', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
  await page.getByLabel('Visit date').fill('2026-10-17');
  await page.getByLabel('Product name', { exact: true }).fill('Apples');
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await page.getByLabel('Unit', { exact: true }).selectOption('lb');
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).nth(1).fill('Bread');
  await page.getByLabel('Quantity', { exact: true }).nth(1).fill('1');
  await page.getByLabel('Unit', { exact: true }).nth(1).selectOption('loaf');
  await page.getByLabel('Total spent USD').fill('17.25');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await expect(page.getByText('Total spent: $17.25 USD · Counts as one visit.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit information', exact: true }).click();
  await expect(page.getByLabel('Product name', { exact: true }).first()).toHaveValue('Apples');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('One market visit recorded.');
  const dashboard = page.getByRole('region', { name: 'Sustainability dashboard' });
  await expect(
    dashboard
      .locator('dt', { hasText: /^Market visits$/ })
      .locator('..')
      .locator('dd'),
  ).toHaveText('1');
  await expect(
    dashboard
      .locator('dt', { hasText: /^Unique markets visited$/ })
      .locator('..')
      .locator('dd'),
  ).toHaveText('1');
  await expect(
    dashboard
      .locator('dt', { hasText: /^Recorded market spending$/ })
      .locator('..')
      .locator('dd'),
  ).toHaveText('$17.25 USD');
  await expect(dashboard.getByText('Unavailable', { exact: true })).toHaveCount(5);
  await dashboard.getByText(/2026-10-17 · .* · \$17.25 USD/).click();
  await expect(dashboard.getByText('Apples · 2 lb · Unknown item price')).toBeVisible();
  await page.getByRole('button', { name: 'Seasonal search', exact: true }).click();
  await page.getByRole('button', { name: 'Purchases & sustainability', exact: true }).click();
  await expect(
    dashboard
      .locator('dt', { hasText: /^Market visits$/ })
      .locator('..')
      .locator('dd'),
  ).toHaveText('1');
  await page.getByRole('button', { name: 'Clear purchase records', exact: true }).click();
  await expect(
    dashboard
      .locator('dt', { hasText: /^Market visits$/ })
      .locator('..')
      .locator('dd'),
  ).toHaveText('0');
});

test('memory purchases are not persisted across a reload', async ({ page }) => {
  await page.goto('#/search?view=purchases');
  await expect(page.getByText(/Nothing is saved to your account/)).toBeVisible();
  await page.getByLabel('Farmers market', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Apples');
  await page.getByLabel('Quantity', { exact: true }).fill('1');
  await page.getByLabel('Total spent USD').fill('1');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('One market visit recorded.');
  await expect(page.getByText('Market visits', { exact: true }).locator('..').locator('dd')).toHaveText('1');
  await page.reload();
  await expect(page.getByText('No visits recorded in this repository.')).toBeVisible();
});
