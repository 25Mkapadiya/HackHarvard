import { expect, test } from '@playwright/test';

test('account routes have accessible fields and links under the Pages sub-path', async ({ page }) => {
  await page.goto('#/signup');
  await expect(page.getByRole('heading', { level: 1, name: 'Join Market Day' })).toBeVisible();
  await expect(page.getByLabel('Display name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveAttribute('type', 'email');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.getByLabel('Confirm password')).toHaveAttribute('type', 'password');

  await page.getByRole('link', { name: 'Already have an account? Log in' }).click();
  await expect(page).toHaveURL(/\/HackHarvard\/#\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'autocomplete',
    'current-password',
  );
  await page.getByRole('link', { name: 'Back to Market Day' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fresh food, close to home' })).toBeVisible();
});

test('account form translations work on a phone without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/signup');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Únete a Market Day' })).toBeVisible();
  await expect(page.getByLabel('Nombre para mostrar')).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
  expect(await page.evaluate<boolean>('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
    true,
  );
});
