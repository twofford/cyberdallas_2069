import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

async function waitForAuthHydration(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator("section[data-auth-hydrated='true']")).toHaveCount(1);
}

async function switchToRegister(page: Page) {
  await waitForAuthHydration(page);
  await page.getByRole('button', { name: 'Switch to register', exact: true }).click();
  await expect(page.locator("section[data-auth-mode='register']")).toHaveCount(1);
}

async function joinCampaignBackdoor(input: { request: APIRequestContext; campaignId: string }) {
  const response = await input.request.post('/api/graphql', {
    headers: {
      'content-type': 'application/json',
    },
    data: {
      query: /* GraphQL */ `
        mutation Join($campaignId: ID!) {
          joinCampaign(campaignId: $campaignId) {
            id
          }
        }
      `,
      variables: { campaignId: input.campaignId },
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { data?: unknown; errors?: Array<{ message: string }> };
  expect(body.errors).toBeFalsy();
}

test('dashboard view buttons navigate to dedicated list pages for each entity type', async ({ page }) => {
  const email = `view-pages+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');
  await switchToRegister(page);

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL('/home');

  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_4' });
  await page.reload();

  await page.getByRole('button', { name: /view campaigns/i }).click();
  await expect(page).toHaveURL('/campaigns');
  await expect(page.getByRole('heading', { name: /campaigns/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Midnight Circuit', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /back to home/i }).click();
  await expect(page).toHaveURL('/home');

  await page.getByRole('button', { name: /view characters/i }).click();
  await expect(page).toHaveURL('/characters');
  await expect(page.getByRole('heading', { name: /characters/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Street Thug', exact: true })).toHaveCount(0);
  await expect(page.getByText('None.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /back to home/i }).click();
  await expect(page).toHaveURL('/home');

  await page.getByRole('button', { name: /view npcs/i }).click();
  await expect(page).toHaveURL('/npcs');
  await expect(page.getByRole('heading', { name: /npcs/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Street Thug', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /back to home/i }).click();
  await expect(page).toHaveURL('/home');

  await page.getByRole('button', { name: /view cybernetics/i }).click();
  await expect(page).toHaveURL('/cybernetics');
  await expect(page.getByRole('heading', { name: /cybernetics/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reflex Booster', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /back to home/i }).click();
  await expect(page).toHaveURL('/home');

  await page.getByRole('button', { name: /view weapons/i }).click();
  await expect(page).toHaveURL('/weapons');
  await expect(page.getByRole('heading', { name: /weapons/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mono-Katana', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /back to home/i }).click();
  await expect(page).toHaveURL('/home');

  await page.getByRole('button', { name: /view items/i }).click();
  await expect(page).toHaveURL('/items');
  await expect(page.getByRole('heading', { name: /items/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cyberdeck (Starter)', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /back to home/i }).click();
  await expect(page).toHaveURL('/home');

  await page.getByRole('button', { name: /view vehicles/i }).click();
  await expect(page).toHaveURL('/vehicles');
  await expect(page.getByRole('heading', { name: /vehicles/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Street Bike', exact: true })).toBeVisible();
});
