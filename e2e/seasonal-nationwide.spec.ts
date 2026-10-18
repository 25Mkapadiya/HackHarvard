import { expect, test } from '@playwright/test';

test('state and month changes distinguish winter harvest and summer gaps', async ({ page }) => {
  await page.goto('#/search?state=FL&month=1&q=strawberry');
  const guide = page.getByRole('heading', { name: 'January · Florida', exact: true }).locator('..');
  await expect(guide.getByRole('button', { name: 'Strawberries', exact: true })).toBeVisible();
  await expect(guide.getByText('In season · harvest', { exact: true })).toBeVisible();
  await expect(guide.getByText('Source-backed state calendar', { exact: true })).toBeVisible();
  await page.getByLabel('Month', { exact: true }).selectOption('7');
  await expect(page.getByText('Outside documented harvest window', { exact: true })).toBeVisible();
  await page.getByLabel('State for seasonal guidance').selectOption('MA');
  await expect(page.getByText('In season · harvest', { exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('apple');
  await expect(page.getByText('Approximate regional calendar', { exact: true })).toBeVisible();
});

test('storage remains distinct from harvest and sources can be inspected', async ({ page }) => {
  await page.goto('#/search?state=MI&month=1&q=apple');
  await expect(page.getByText('Available from storage · not fresh harvest', { exact: true })).toBeVisible();
  await page.getByText('Calendar evidence', { exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Michigan State University Center for Regional Food Systems' }),
  ).toBeVisible();
  await expect(page.getByText(/Published: 2013-03-29/)).toBeVisible();
  await page.getByLabel('State for seasonal guidance').selectOption('WA');
  await expect(
    page.getByText('Documented availability · harvest unspecified', { exact: true }),
  ).toBeVisible();
});

test('food aliases connect to reported categories and distance filter', async ({ page }) => {
  await page.goto('#/search?state=MA&month=10&q=snap%20bean');
  await expect(page.getByRole('button', { name: 'Green beans', exact: true })).toBeVisible();
  await expect(page.getByText(/markets report vegetables; exact products unconfirmed/).first()).toBeVisible();
  await page.getByLabel('State for seasonal guidance').selectOption('NY');
  await expect(page.getByText('No matching non-sample category reports within 80 km.')).toBeVisible();
  const before = await page.getByRole('heading', { name: /^Markets in New York/ }).innerText();
  await page.getByText('Within 80 km of selected location, in this region', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Within 80 km/ })).toBeChecked();
  const after = await page.getByRole('heading', { name: /^Markets in New York/ }).innerText();
  expect(Number(after.match(/\((\d+)\)/)?.[1])).toBeLessThan(Number(before.match(/\((\d+)\)/)?.[1]));
  await page.getByRole('searchbox').fill('zz-no-such-market');
  await expect(page.getByRole('heading', { name: 'Markets in New York (0)' })).toBeVisible();
});

test('mobile state selection exposes unknown coverage without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/seasonal?state=AK&month=1&q=apple');
  await expect(page.getByRole('heading', { name: 'January · Alaska', exact: true })).toBeVisible();
  await expect(page.getByText('Seasonal information unknown', { exact: true })).toBeVisible();
  await expect(page.getByLabel('State for seasonal guidance')).toBeVisible();
  expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
  await page.screenshot({ path: 'test-results/seasonal-alaska-mobile.png', fullPage: true });
});
