import { expect, test, type Page } from '@playwright/test';
async function start(page: Page) {
  await page.goto('#/search?view=purchases');
  await page.getByLabel('Find a market').fill('Copley');
  await page.getByLabel('Farmers market', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
}
test('mobile manual-only entry requires quantities, supports corrections and updates one visit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByText(/recognition|upload a receipt|purchase photo/i)).toHaveCount(0);
  await page.getByLabel('Visit date', { exact: true }).fill('2026-10-17');
  await page.getByLabel('Product name', { exact: true }).fill('Apples');
  await page.getByLabel('Total spent USD').fill('7.29');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your trip' })).toHaveCount(0);
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveAttribute('required', '');
  await page.getByLabel('Quantity', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your trip' })).toHaveCount(0);
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await page.getByLabel('Unit', { exact: true }).selectOption('lb');
  await page.getByLabel('Item price USD (optional)', { exact: true }).fill('0.29');
  await page.getByText('Vendor or origin (optional)', { exact: true }).click();
  await page.getByLabel('Vendor / farm name (optional)', { exact: true }).fill('Test farm');
  await page.getByLabel('Product origin (optional)', { exact: true }).fill('Unknown');
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).nth(1).fill('Carrots');
  await page.getByRole('button', { name: 'Remove product 2' }).click();
  expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
  await page.screenshot({ path: 'test-results/manual-purchase-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await expect(page.getByText('October 17, 2026', { exact: true })).toBeVisible();
  await expect(page.getByText('Vendor / farm (self-reported): Test farm')).toBeVisible();
  await page.getByRole('button', { name: 'Edit information', exact: true }).click();
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('2');
  await page.getByLabel('Quantity', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('One market visit recorded.');
  await expect(page.getByText('Market visits', { exact: true }).locator('..').locator('dd')).toHaveText('1');
  await expect(
    page.getByText('Recorded market spending', { exact: true }).locator('..').locator('dd'),
  ).toHaveText('$7.29 USD');
  await expect(page.getByText(/This visit is recorded only in this tab/)).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Sustainability dashboard' }).getByText('Unavailable', { exact: true }),
  ).toHaveCount(5);
});
test('keyboard review rejects ambiguous currency and duplicate trips do not add visits', async ({ page }) => {
  await start(page);
  async function fill() {
    await page.getByLabel('Visit date', { exact: true }).fill('2026-10-17');
    await page.getByLabel('Product name', { exact: true }).fill('Apples');
    await page.getByLabel('Quantity', { exact: true }).fill('1');
    await page.getByLabel('Unit', { exact: true }).selectOption('each');
    await page.getByLabel('Total spent USD').fill('2');
  }
  await fill();
  await page.getByLabel('Total spent USD').fill('2.001');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('at most two decimal places');
  await page.getByLabel('Total spent USD').fill('2');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('One market visit recorded.');
  await page.getByRole('button', { name: 'Record another visit' }).click();
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
  await fill();
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'This trip was already recorded; no additional visit counted.',
  );
  await expect(page.getByText('Market visits', { exact: true }).locator('..').locator('dd')).toHaveText('1');
  await expect(
    page.getByText('Recorded market spending', { exact: true }).locator('..').locator('dd'),
  ).toHaveText('$2.00 USD');
});
