import { expect, test } from '@playwright/test';

test('mobile local reporting supports aliases, review/edit, deduplication and reset without affecting search', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/search?view=reports');
  await expect(page.getByRole('heading', { name: 'What did you find at this market?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Public submission unavailable' })).toBeDisabled();
  const writes: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
  });
  await page.getByLabel('Find a reporting market').fill('Copley');
  await page.getByLabel('Market for product report').selectOption({ index: 1 });
  await page.getByLabel('Date observed', { exact: true }).fill('2026-10-17');
  await page.getByLabel('Search observed products').fill('snap bean');
  await page.getByLabel('Green beans', { exact: true }).check();
  await page.getByLabel('Search observed products').fill('apple');
  await page.getByLabel('Apples', { exact: true }).check();
  await page.getByRole('button', { name: 'Remove Green beans' }).click();
  await page.getByLabel('Search observed products').fill('carrot');
  await page.getByLabel('Carrots', { exact: true }).check();
  await page.getByRole('button', { name: 'Review report', exact: true }).click();
  await expect(page.getByText('Apples · observed · unverified customer')).toBeVisible();
  await page.getByRole('button', { name: 'Edit report' }).click();
  await page.getByRole('button', { name: 'Remove Carrots' }).click();
  await page.getByLabel('Report notes (optional)').fill('Observed near the entrance');
  await page.getByRole('button', { name: 'Review report', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add to local demo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Nothing was uploaded or saved permanently');
  await expect(page.getByRole('heading', { name: 'Temporary demo observations (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Review report', exact: true }).click();
  await page.getByRole('button', { name: 'Add to local demo' }).click();
  await expect(page.getByRole('status')).toContainText('no duplicates added');
  expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
  await page.evaluate('window.scrollTo(0, 0)');
  await page.screenshot({ path: 'test-results/market-reports-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'test-results/market-reports-desktop.png', fullPage: true });
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Seasonal search', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Markets in/ })).toBeVisible();
  await expect(page.getByText('Observed near the entrance')).toHaveCount(0);
  await page.getByRole('button', { name: 'Report observed products · local demo' }).click();
  await expect(page.getByRole('heading', { name: 'Temporary demo observations (0)' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Temporary demo observations (0)' })).toBeVisible();
});

test('navigation has one search entry and retains both route aliases', async ({ page }) => {
  await page.goto('#/seasonal?state=MA&month=10&q=apple');
  await expect(page.getByRole('heading', { name: 'In Season Search', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main', exact: true });
  await expect(nav.getByRole('link', { name: 'In Season Search', exact: true })).toHaveCount(1);
  await expect(nav.locator('a[href="#/seasonal"]')).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'My rewards', exact: true })).toHaveCount(1);
  await nav.getByRole('link', { name: 'In Season Search', exact: true }).click();
  await expect(page).toHaveURL(/#\/search/);
  await expect(page.getByRole('heading', { name: 'In Season Search', exact: true })).toBeVisible();
});
