import { expect, test, type Page } from '@playwright/test';
async function record(page: Page, date: string) {
  await page.goto('#/search?view=purchases');
  await page.getByLabel('Find a market').fill('Copley Square');
  await page.getByLabel('Farmers market', { exact: true }).selectOption('copley-square-boston-ma');
  await page.getByRole('button', { name: 'Enter purchases', exact: true }).click();
  await page.getByLabel('Visit date', { exact: true }).fill(date);
  await page.getByLabel('Product name', { exact: true }).fill('Apple');
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await page.getByLabel('Unit', { exact: true }).selectOption('lb');
  await page.getByLabel('Total spent USD').fill('10');
  await page.getByRole('button', { name: 'Confirm information', exact: true }).click();
  await page.getByRole('button', { name: 'Submit visit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('One market visit recorded.');
}
test('recorded purchases expose separate regional origin choices without changing historical evidence', async ({
  page,
}) => {
  await record(page, '2026-10-17');
  const panel = page.getByRole('region', { name: 'Illustrative regional scenario', exact: true });
  await expect(panel.getByText(/They do not measure the actual origin or emissions/)).toBeVisible();
  const choice = panel.getByLabel('Illustration for Apple, entry 1');
  await expect(choice).toHaveValue('');
  await choice.selectOption('apples-MA-NY-vs-WA');
  await expect(panel.getByText(/Selected food-distance coverage: 1\/1/)).toBeVisible();
  await expect(panel.getByText(/No verified CO₂e avoided is claimed/)).toBeVisible();
  await expect(page.getByText('Market visits', { exact: true }).locator('..').locator('dd')).toHaveText('1');
  await expect(
    page.getByText('Recorded market spending', { exact: true }).locator('..').locator('dd'),
  ).toHaveText('$10.00 USD');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
  await panel.getByRole('heading', { name: 'Illustrative regional scenario' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/regional-transport-mobile.png', fullPage: true });
});
test('single seasonal regional alternative appears automatically after normal purchase entry', async ({
  page,
}) => {
  await record(page, '2026-07-17');
  const panel = page.getByRole('region', { name: 'Illustrative regional scenario', exact: true });
  await expect(panel.getByText(/One reviewed illustration applies automatically/)).toBeVisible();
  await expect(panel.getByRole('combobox')).toHaveCount(0);
  await expect(panel.getByText(/Product coverage: 1\/1/)).toContainText('1 have a selected illustration');
  await expect(
    page
      .getByText('Food miles difference (mass-weighted sum)', { exact: true })
      .locator('..')
      .getByText('Unavailable', { exact: true }),
  ).toBeVisible();
});
