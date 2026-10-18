import { expect, test } from '@playwright/test';

test('guests are guided to login and invalid callback secrets leave browser history', async ({ page }) => {
  await page.goto('#/account');
  await expect(page.getByRole('heading', { name: 'My account', exact: true })).toBeVisible();
  await expect(
    page.getByText('Log in to manage your account or participate in the community.'),
  ).toBeVisible();
  await page.goto('?error=access_denied&error_description=private-test-detail');
  await expect(page).toHaveURL(/\/HackHarvard\/#\/auth\/callback$/);
  await expect(page.getByRole('alert')).toContainText('This link is missing, expired, or already used.');
  await expect(page.getByText('private-test-detail')).toHaveCount(0);
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
});

for (const width of [1280, 390])
  test(`community feed layout at ${width}px (mocked read API, no cloud writes)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/rest/v1/rpc/community_feed', async (route) =>
      route.fulfill({
        json: [
          {
            id: '00000000-0000-0000-0000-000000000011',
            author_id: '00000000-0000-0000-0000-000000000012',
            author: {
              id: '00000000-0000-0000-0000-000000000012',
              kind: 'vendor',
              display_name: 'Browser test fixture farm',
              image_path: null,
            },
            market: null,
            market_id: null,
            body: 'Browser test fixture: fresh seasonal produce.',
            category: 'seasonal',
            image_path: null,
            expires_at: null,
            created_at: '2026-10-18T12:00:00Z',
            like_count: 2,
            comment_count: 0,
            liked: false,
            saved: false,
            following: false,
            verified: false,
            expired: false,
          },
        ],
      }),
    );
    await page.goto('#/feed');
    await expect(page.getByRole('heading', { level: 1, name: 'Feed' })).toBeVisible();
    await expect(page.getByText('Browser test fixture: fresh seasonal produce.')).toBeVisible();
    await page.getByRole('button', { name: 'Latest', exact: true }).click();
    await expect(page).toHaveURL(/mode=latest/);
    expect(await page.evaluate<boolean>('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
      true,
    );
    await page.screenshot({
      path: `node_modules/.cache/community-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  });
