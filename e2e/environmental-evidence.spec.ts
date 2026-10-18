import { expect, test } from '@playwright/test';

test('recorded Syracuse apples use public study scenarios only after explicit opt-in', async ({ page }) => {
  await page.goto('#/search?view=purchases');
  await page.getByLabel('Find a market').fill('Syracuse');
  await page
    .getByLabel('Farmers market', { exact: true })
    .selectOption('central-ny-regional-market-syracuse-ny');
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
  await page.getByLabel('Visit date').fill('2026-10-17');
  await page.getByLabel('Product name', { exact: true }).fill('Apples');
  await page.getByLabel('Quantity (optional)', { exact: true }).fill('2');
  await page.getByLabel('Unit', { exact: true }).selectOption('kg');
  await page.getByLabel('Total spent USD').fill('12.34');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('One market visit recorded.');
  const food = page.getByRole('region', { name: 'Food miles difference (mass-weighted sum)', exact: true });
  const transport = page.getByRole('region', { name: 'Transportation CO₂e difference', exact: true });
  await expect(food.getByText('Unavailable', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Environmental comparison')).toHaveValue('');
  await page.getByLabel('Environmental comparison').selectOption('syracuse-direct-vs-wa');
  await expect(food.getByText('5,578 kg·mile', { exact: true })).toBeVisible();
  await expect(
    food.getByText('Modeled scenario — not observed purchase impact', { exact: true }),
  ).toBeVisible();
  await expect(transport.getByText('Unavailable', { exact: true })).toBeVisible();
  const source = page.getByRole('region', { name: 'Environmental evidence', exact: true });
  await source.locator('summary', { hasText: 'Apples' }).click();
  await expect(
    source.getByRole('link', { name: 'USDA ERS ERR-99 (2010), Table 3', exact: true }),
  ).toBeVisible();
  await expect(source.getByText(/Published 2010-06-21/)).toBeVisible();
  await page.getByLabel('Environmental comparison').selectOption('syracuse-regional-retail-vs-wa');
  await expect(transport.getByText('Unavailable', { exact: true })).toHaveCount(0);
  await expect(
    transport.getByText('Modeled scenario — not observed purchase impact', { exact: true }),
  ).toBeVisible();
  await expect(source.getByText(/This illustration compares two historical supermarket/)).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Total life-cycle CO₂e difference', exact: true })
      .getByText('Unavailable', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Recorded market spending', { exact: true }).locator('..').locator('dd'),
  ).toHaveText('$12.34 USD');
  await expect(page.getByText('Market visits', { exact: true }).locator('..').locator('dd')).toHaveText('1');
  await page.getByLabel('Environmental comparison').selectOption('');
  await expect(food.getByText('Unavailable', { exact: true })).toBeVisible();
});

test('a Boston apple purchase cannot inherit the Syracuse study distances', async ({ page }) => {
  await page.goto('#/search?view=purchases');
  await page.getByLabel('Find a market').fill('Copley');
  await page.getByLabel('Farmers market', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
  await page.getByLabel('Visit date').fill('2026-10-17');
  await page.getByLabel('Product name', { exact: true }).fill('Apples');
  await page.getByLabel('Quantity (optional)', { exact: true }).fill('1');
  await page.getByLabel('Total spent USD').fill('5');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('One market visit recorded.');
  await page.getByLabel('Environmental comparison').selectOption('syracuse-direct-vs-wa');
  await expect(
    page
      .getByRole('region', { name: 'Food miles difference (mass-weighted sum)', exact: true })
      .getByText('Unavailable', { exact: true }),
  ).toBeVisible();
  const evidence = page.getByRole('region', { name: 'Environmental evidence', exact: true });
  await evidence.locator('summary', { hasText: 'Apples' }).click();
  await expect(
    evidence.getByText('This comparison does not apply to the selected market location.', { exact: true }),
  ).toBeVisible();
});
