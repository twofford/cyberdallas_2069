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

test('register shows signed-in user and persists across reload', async ({ page }) => {
  const email = `alice+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');

  await switchToRegister(page);

  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();

  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();
  const campaignsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Campaigns' }) });
  await expect(campaignsSection.getByText('Neon Rain', { exact: true })).not.toBeVisible();
  const charactersSection = page.locator('section', { has: page.getByRole('heading', { name: 'Characters' }) });
  await expect(charactersSection.getByText('Street Thug', { exact: false })).toBeVisible();

  await page.reload();
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();
  await expect(campaignsSection.getByText('Neon Rain', { exact: true })).not.toBeVisible();
  await expect(charactersSection.getByText('Street Thug', { exact: false })).toBeVisible();
});

test('dashboard character links navigate to stats pages', async ({ page }) => {
  const email = `nav-char+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');
  await switchToRegister(page);

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();

  await expect(page).toHaveURL('/home');

  const charactersSection = page.locator('section', { has: page.getByRole('heading', { name: 'Characters' }) });
  const streetThug = charactersSection.getByRole('link', { name: 'Street Thug', exact: true });
  await expect(streetThug).toBeVisible();
  await streetThug.click();

  await expect(page).toHaveURL(/\/characters\//);
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skills' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cybernetics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weapons' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  await expect(page.getByText('Speed:', { exact: false })).toBeVisible();
  await expect(page.getByText('Hit Points:', { exact: false })).toBeVisible();
});

test('dashboard catalog links navigate to detail pages', async ({ page }) => {
  const email = `nav-catalog+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');
  await switchToRegister(page);

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();

  await expect(page).toHaveURL('/home');

  const cyberneticsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Cybernetics' }) });
  const cyberneticLink = cyberneticsSection.getByRole('link', { name: 'Reflex Booster', exact: true });
  await expect(cyberneticLink).toBeVisible();
  await cyberneticLink.click();
  await expect(page).toHaveURL(/\/cybernetics\//);
  await expect(page.getByRole('heading', { name: 'Cybernetic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reflex Booster' })).toBeVisible();

  await page.goto('/home');

  const weaponsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Weapons' }) });
  const weaponLink = weaponsSection.getByRole('link', { name: 'Mono-Katana', exact: true });
  await expect(weaponLink).toBeVisible();
  await weaponLink.click();
  await expect(page).toHaveURL(/\/weapons\//);
  await expect(page.getByRole('heading', { name: 'Weapon' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mono-Katana' })).toBeVisible();

  await page.goto('/home');

  const itemsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Items' }) });
  const itemLink = itemsSection.getByRole('link', { name: 'Cyberdeck (Starter)', exact: true });
  await expect(itemLink).toBeVisible();
  await itemLink.click();
  await expect(page).toHaveURL(/\/items\//);
  await expect(page.getByRole('heading', { name: 'Item' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cyberdeck (Starter)' })).toBeVisible();

  await page.goto('/home');

  const vehiclesSection = page.locator('section', { has: page.getByRole('heading', { name: 'Vehicles' }) });
  const vehicleLink = vehiclesSection.getByRole('link', { name: 'Street Bike', exact: true });
  await expect(vehicleLink).toBeVisible();
  await vehicleLink.click();
  await expect(page).toHaveURL(/\/vehicles\//);
  await expect(page.getByRole('heading', { name: 'Vehicle' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Street Bike' })).toBeVisible();
});

test('users can create new characters in their campaigns', async ({ page }) => {
  const email = `create-char+${Date.now()}@example.com`;
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

  const campaignsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Campaigns' }) });
  await expect(campaignsSection.getByText('Midnight Circuit')).toBeVisible();

  await page.getByRole('button', { name: /new character/i }).click();
  await expect(page).toHaveURL(/\/characters\/new$/);

  await page.getByLabel('Name', { exact: true }).fill('Razor');
  await page.getByRole('button', { name: 'Campaign', exact: true }).click();
  await page.getByRole('option', { name: 'Midnight Circuit', exact: true }).click();
  await page.getByLabel('Brawn').fill('3');
  await page.getByLabel('Reflexes').fill('2');

  await page.getByLabel('Hacking', { exact: true }).fill('6');

  await page.getByRole('checkbox', { name: 'Reflex Booster', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Mono-Katana', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Cyberdeck (Starter)', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Street Bike', exact: true }).check();

  const createButton = page.locator('form').getByRole('button', { name: /create character/i });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  await expect(page).toHaveURL(/\/characters\//);
  await expect(page.getByRole('heading', { name: /razor/i })).toBeVisible();

  await expect(page.getByText('Brawn: 3')).toBeVisible();
  await expect(page.getByText('Reflexes: 2')).toBeVisible();
  await expect(page.getByText('Hacking: 6')).toBeVisible();
  await expect(page.getByText('Reflex Booster')).toBeVisible();
  await expect(page.getByText('Mono-Katana')).toBeVisible();
  await expect(page.getByText('Cyberdeck (Starter)')).toBeVisible();
  await expect(page.getByText('Street Bike')).toBeVisible();

  await page.goto('/home');

  const charactersSectionAfter = page.locator('section', { has: page.getByRole('heading', { name: 'Characters' }) });
  const newCharacterLink = charactersSectionAfter.getByRole('link', { name: 'Razor', exact: true });
  await expect(newCharacterLink).toBeVisible();
  await newCharacterLink.click();

  await expect(page).toHaveURL(/\/characters\//);
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
});

test('login and register forms do not share input state', async ({ page }) => {
  await page.goto('/auth');

  const loginForm = page.locator('form', { has: page.getByRole('heading', { name: 'Login' }) });

  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeEnabled();
  await loginForm.getByLabel('Email').fill('login@example.com');
  await loginForm.getByLabel('Password').fill('login-pass');

  await page.getByRole('button', { name: 'Switch to register', exact: true }).click();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();
  await expect(registerForm.getByLabel('Email')).toHaveValue('');
  await expect(registerForm.getByLabel('Password')).toHaveValue('');

  await registerForm.getByLabel('Email').fill('reg@example.com');
  await registerForm.getByLabel('Password').fill('reg-pass');

  await page.getByRole('button', { name: 'Switch to login', exact: true }).click();

  const loginForm2 = page.locator('form', { has: page.getByRole('heading', { name: 'Login' }) });
  await expect(loginForm2.getByLabel('Email')).toHaveValue('login@example.com');
  await expect(loginForm2.getByLabel('Password')).toHaveValue('login-pass');
  await expect(page.getByRole('heading', { name: 'Register' })).toHaveCount(0);
});

test('signed-in users are redirected away from /auth', async ({ page }) => {
  const email = `redirect-auth+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');

  await switchToRegister(page);

  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();

  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();

  await page.goto('/auth');
  await expect(page).toHaveURL('/home');
  await expect(page.getByRole('heading', { name: 'Register' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Login' })).toHaveCount(0);
});

test('campaign owners see the invite form on their campaigns', async ({ page }) => {
  const email = `owner-ui+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');

  await switchToRegister(page);

  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();

  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_1' });
  await page.reload();

  const campaignsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Campaigns' }) });
  await expect(campaignsSection.getByText('Neon Rain')).toBeVisible();
  await expect(campaignsSection.getByLabel('Invite email')).toBeVisible();
  await expect(campaignsSection.getByRole('button', { name: 'Send invite' })).toBeVisible();

  await campaignsSection.getByLabel('Invite email').fill(`invitee+${Date.now()}@example.com`);
  await campaignsSection.getByRole('button', { name: 'Send invite' }).click();
  await expect(campaignsSection.getByText('Invite sent.')).toBeVisible();
});

test('campaign members who are not owners do not see the invite form', async ({ page }) => {
  const ownerEmail = `owner-member-ui+${Date.now()}@example.com`;
  const memberEmail = `member-ui+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');

  await switchToRegister(page);

  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();

  // Owner registers and becomes owner of camp_3.
  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(ownerEmail);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${ownerEmail}`)).toBeVisible();
  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_3' });

  // Sign out, then register member.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth');

  await switchToRegister(page);

  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();

  const registerForm2 = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm2.getByLabel('Email').fill(memberEmail);
  await registerForm2.getByLabel('Password').fill(password);
  await registerForm2.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${memberEmail}`)).toBeVisible();

  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_3' });
  await page.reload();

  const campaignsSection = page.locator('section', { has: page.getByRole('heading', { name: 'Campaigns' }) });
  await expect(campaignsSection.getByText('Synthetic Dawn', { exact: true })).toBeVisible();
  await expect(campaignsSection.getByLabel('Invite email')).toHaveCount(0);
  await expect(campaignsSection.getByRole('button', { name: 'Send invite' })).toHaveCount(0);
});

test('invalid login shows an error', async ({ page }) => {
  const email = `bob+${Date.now()}@example.com`;
  const password = 'valid-password-123';

  await page.goto('/auth');

  await switchToRegister(page);

  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();

  // Sign out to simulate a fresh session.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth');

  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeEnabled();

  const loginForm = page.locator('form', { has: page.getByRole('heading', { name: 'Login' }) });
  await loginForm.getByLabel('Email').fill(email);
  await loginForm.getByLabel('Password').fill('wrong-password');
  await loginForm.getByRole('button', { name: 'Login', exact: true }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});

test('sign out clears session and persists across reload', async ({ page }) => {
  const email = `carol+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');

  await switchToRegister(page);

  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth');

  await page.reload();
  await expect(page).toHaveURL('/auth');
});
