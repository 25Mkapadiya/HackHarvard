import { expect, test } from '@playwright/test';
// Synthetic PNG fixture only: no real photo, receipt or personal information.
const image = {
  name: 'test-purchase.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
    'base64',
  ),
};
async function start(page: import('@playwright/test').Page) {
  await page.goto('#/search?view=purchases');
  await page.getByLabel('Find a market').fill('Copley');
  await page.getByLabel('Farmers market', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
}
test('private photo reference supports a reviewed manual visit without AI', async ({ page }) => {
  const externalWrites: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') externalWrites.push(request.url());
  });
  await start(page);
  await page.getByLabel('Take or upload a purchase photo', { exact: true }).check();
  await page.getByLabel('Upload a purchase photo', { exact: true }).setInputFiles(image);
  await expect(page.getByAltText('Selected purchase photo for your reference')).toBeVisible();
  await expect(page.getByText(/Automatic product recognition is not yet enabled/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send image for product suggestions' })).toHaveCount(0);
  await page.getByLabel('Product name', { exact: true }).fill('Apples');
  await page.getByLabel('Quantity (optional)', { exact: true }).fill('3');
  await page.getByLabel('Unit', { exact: true }).selectOption('each');
  await page.getByLabel('Total spent USD').fill('6.50');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Selected purchase photo for your reference' })).toHaveCount(0);
  await expect(page.getByText('Apples: 3 each · Item price unknown')).toBeVisible();
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
      .locator('dt', { hasText: /^Recorded market spending$/ })
      .locator('..')
      .locator('dd'),
  ).toHaveText('$6.50 USD');
  await expect(dashboard.getByText('Unavailable', { exact: true })).toHaveCount(5);
  expect(externalWrites).toEqual([]);
});
test('receipt preview, replacement, rejection and manual fallback work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await page.getByLabel('Product name', { exact: true }).fill('Bread');
  await page.getByLabel('Upload a receipt', { exact: true }).check();
  const input = page.getByLabel('Upload a receipt image', { exact: true });
  await input.setInputFiles(image);
  const preview = page.getByAltText('Selected receipt for your reference');
  await expect(preview).toBeVisible();
  const first = await preview.getAttribute('src');
  await input.setInputFiles({ ...image, name: 'second.png' });
  await expect(preview).not.toHaveAttribute('src', first!);
  await input.setInputFiles({
    name: 'not-an-image.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.getByRole('alert')).toContainText('not supported');
  await expect(preview).toBeVisible();
  await expect(page.getByText(/Automatic receipt extraction is not yet enabled/)).toBeVisible();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Bread');
  expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
  await page.screenshot({ path: 'test-results/receipt-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Remove image' }).click();
  await expect(preview).toHaveCount(0);
  await page.getByLabel('Enter purchases manually', { exact: true }).check();
  await page.getByLabel('Total spent USD').fill('4');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Edit information', exact: true }).click();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Bread');
});
test('keyboard users can review a multi-product manual purchase', async ({ page }) => {
  await start(page);
  await page.getByLabel('Enter purchases manually', { exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByLabel('Product name', { exact: true }).fill('Carrots');
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).nth(1).fill('Peas');
  await page.getByLabel('Total spent USD').fill('8');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review your trip' })).toBeVisible();
  await expect(page.getByText('Total spent: $8.00 USD · Counts as one visit.')).toBeVisible();
});
