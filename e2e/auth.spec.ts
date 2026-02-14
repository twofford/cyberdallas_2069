import { expect, test } from '@playwright/test';

async function joinCampaignBackdoor(input: { request: any; campaignId: string }) {
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

  await expect(page.getByRole('button', { name: 'Register' })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register' }).click();

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

test('signed-in users are redirected away from /auth', async ({ page }) => {
  const email = `redirect-auth+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');

  await expect(page.getByRole('button', { name: 'Register' })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register' }).click();

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

  await expect(page.getByRole('button', { name: 'Register' })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register' }).click();
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

  await expect(page.getByRole('button', { name: 'Register' })).toBeEnabled();

  // Owner registers and becomes owner of camp_3.
  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(ownerEmail);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${ownerEmail}`)).toBeVisible();
  await joinCampaignBackdoor({ request: page.request, campaignId: 'camp_3' });

  // Sign out, then register member.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth');

  await expect(page.getByRole('button', { name: 'Register' })).toBeEnabled();

  const registerForm2 = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm2.getByLabel('Email').fill(memberEmail);
  await registerForm2.getByLabel('Password').fill(password);
  await registerForm2.getByRole('button', { name: 'Register' }).click();
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

  await expect(page.getByRole('button', { name: 'Register' })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();

  // Sign out to simulate a fresh session.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth');

  await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();

  const loginForm = page.locator('form', { has: page.getByRole('heading', { name: 'Login' }) });
  await loginForm.getByLabel('Email').fill(email);
  await loginForm.getByLabel('Password').fill('wrong-password');
  await loginForm.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});

test('sign out clears session and persists across reload', async ({ page }) => {
  const email = `carol+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  await page.goto('/auth');

  await expect(page.getByRole('button', { name: 'Register' })).toBeEnabled();

  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(email);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByText(`Signed in as: ${email}`)).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth');

  await page.reload();
  await expect(page).toHaveURL('/auth');
});
