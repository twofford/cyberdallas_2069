import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

async function waitForAuthHydration(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator("section[data-auth-hydrated='true']")).toHaveCount(1);
}

async function gotoWithRetry(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      const isAbort = error instanceof Error && /ERR_ABORTED/i.test(error.message);
      if (!isAbort || attempt === 1) throw error;
    }
  }
}

async function switchToRegister(page: Page) {
  await waitForAuthHydration(page);
  await page.getByRole('button', { name: 'Switch to register', exact: true }).click();
  await expect(page.locator("section[data-auth-mode='register']")).toHaveCount(1);
}

async function registerViaUi(input: { page: Page; email: string; password: string }) {
  const { page, email, password } = input;
  await gotoWithRetry(page, '/auth');
  await switchToRegister(page);

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();

  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();
}

async function loginViaUi(input: { page: Page; email: string; password: string }) {
  const { page, email, password } = input;
  await gotoWithRetry(page, '/auth');
  await waitForAuthHydration(page);

  const loginForm = page.locator('form', { has: page.getByRole('heading', { name: 'Login' }) });
  await loginForm.getByLabel('Email').fill(email);
  await loginForm.getByLabel('Password').fill(password);
  await loginForm.getByRole('button', { name: 'Login', exact: true }).click();

  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();
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

async function createCatalogEntityFromUi(input: {
  page: Page;
  newLinkName: string;
  createButtonName: string;
  name: string;
  fieldValues: Array<{ label: string; value: string }>;
  campaignName?: string;
}) {
  const { page, newLinkName, createButtonName, name, fieldValues, campaignName } = input;

  await page.goto('/home');
  await page.getByRole('button', { name: new RegExp(newLinkName, 'i') }).click();
  await expect(page).toHaveURL(/\/new$/);

  await page.getByLabel('Name', { exact: true }).fill(name);

  if (campaignName) {
    await page.getByRole('button', { name: 'Campaign', exact: true }).click();
    await page.getByRole('option', { name: campaignName, exact: true }).click();
  }

  for (const field of fieldValues) {
    await page.getByLabel(field.label, { exact: true }).fill(field.value);
  }

  await page.locator('form').getByRole('button', { name: new RegExp(createButtonName, 'i') }).click();
  await expect(page).toHaveURL(/\/(cybernetics|weapons|items|vehicles)\//);
  await expect(page.getByRole('heading', { name: new RegExp(name, 'i') })).toBeVisible();

  return page.url();
}

test('users can create, edit, and delete cybernetics, weapons, items, and vehicles from dedicated pages', async ({ page }) => {
  const email = `catalog-ui+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';
  await registerViaUi({ page, email, password });

  const created = [
    {
      newLinkName: 'New cybernetic',
      createButtonName: 'Create cybernetic',
      name: 'UI Cybernetic',
      updatedName: 'UI Cybernetic Updated',
      fieldValues: [
        { label: 'Short description', value: 'Cyber short' },
        { label: 'Long description', value: 'Cyber long' },
        { label: 'Price', value: '120' },
        { label: 'Battery life', value: '3' },
      ],
    },
    {
      newLinkName: 'New weapon',
      createButtonName: 'Create weapon',
      name: 'UI Weapon',
      updatedName: 'UI Weapon Updated',
      fieldValues: [
        { label: 'Short description', value: 'Weapon short' },
        { label: 'Long description', value: 'Weapon long' },
        { label: 'Price', value: '200' },
        { label: 'Weight', value: '4' },
        { label: 'Max range', value: '20' },
        { label: 'Max ammo count', value: '12' },
        { label: 'Condition', value: '100' },
      ],
    },
    {
      newLinkName: 'New item',
      createButtonName: 'Create item',
      name: 'UI Item',
      updatedName: 'UI Item Updated',
      fieldValues: [
        { label: 'Short description', value: 'Item short' },
        { label: 'Long description', value: 'Item long' },
        { label: 'Price', value: '50' },
        { label: 'Weight', value: '1' },
      ],
    },
    {
      newLinkName: 'New vehicle',
      createButtonName: 'Create vehicle',
      name: 'UI Vehicle',
      updatedName: 'UI Vehicle Updated',
      fieldValues: [
        { label: 'Short description', value: 'Vehicle short' },
        { label: 'Long description', value: 'Vehicle long' },
        { label: 'Price', value: '500' },
        { label: 'Speed', value: '80' },
        { label: 'Armor', value: '2' },
      ],
    },
  ] as const;

  for (const entity of created) {
    const url = await createCatalogEntityFromUi({
      page,
      newLinkName: entity.newLinkName,
      createButtonName: entity.createButtonName,
      name: entity.name,
      fieldValues: entity.fieldValues,
    });

    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByLabel('Name', { exact: true }).fill(entity.updatedName);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByRole('heading', { name: new RegExp(entity.updatedName, 'i') })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByRole('button', { name: /delete/i }).click();
    await expect(page).toHaveURL('/home');

    await page.goto(url);
    await expect(page.getByText(/not found/i)).toBeVisible();
  }
});

test('catalog edit controls are hidden from non-creators but visible to campaign owners', async ({ page }) => {
  const ownerEmail = `catalog-owner-ui+${Date.now()}@example.com`;
  const creatorEmail = `catalog-creator-ui+${Date.now()}@example.com`;
  const otherEmail = `catalog-other-ui+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await registerViaUi({ page, email: ownerEmail, password });
  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_5' });

  await page.getByRole('button', { name: /sign out/i }).click();
  await registerViaUi({ page, email: creatorEmail, password });
  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_5' });

  const entityUrl = await createCatalogEntityFromUi({
    page,
    newLinkName: 'New cybernetic',
    createButtonName: 'Create cybernetic',
    name: 'Campaign Cybernetic',
    campaignName: 'Ghost Protocol',
    fieldValues: [
      { label: 'Short description', value: 'short' },
      { label: 'Long description', value: 'long' },
      { label: 'Price', value: '100' },
      { label: 'Battery life', value: '2' },
    ],
  });

  await page.goto('/home');
  await page.getByRole('button', { name: /sign out/i }).click();
  await registerViaUi({ page, email: otherEmail, password });
  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_5' });

  await page.goto(entityUrl);
  await expect(page.getByRole('button', { name: /edit/i })).toHaveCount(0);

  await page.goto('/home');
  await page.getByRole('button', { name: /sign out/i }).click();
  await loginViaUi({ page, email: ownerEmail, password });

  await page.goto(entityUrl);
  await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
});
