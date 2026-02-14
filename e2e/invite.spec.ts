import { expect, test } from '@playwright/test';

async function graphqlPost<T>(input: { request: any; query: string; variables?: any }): Promise<T> {
  const response = await input.request.post('/api/graphql', {
    headers: {
      'content-type': 'application/json',
    },
    data: {
      query: input.query,
      variables: input.variables,
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  expect(body.errors).toBeFalsy();
  expect(body.data).toBeTruthy();
  return body.data!;
}

test('accept invite hides button after success', async ({ page }) => {
  const ownerEmail = `owner-invite+${Date.now()}@example.com`;
  const inviteeEmail = `invitee-ui+${Date.now()}@example.com`;
  const password = 'correct-horse-battery-staple';

  // Warm up route compilation first. In dev mode, initial compilation can reset
  // module state; doing this early avoids losing in-memory invites mid-test.
  await page.goto('/invite?token=warmup');
  await expect(page.getByText('Invite token detected.')).toBeVisible();

  // Owner: register and become OWNER of camp_1.
  await graphqlPost<{ register: { user: { id: string } } }>({
    request: page.request,
    query: /* GraphQL */ `
      mutation Register($email: String!, $password: String!) {
        register(email: $email, password: $password) {
          user {
            id
          }
        }
      }
    `,
    variables: { email: ownerEmail, password },
  });

  const campaignId = 'camp_2';
  const campaignName = 'Chrome Syndicate';

  await graphqlPost<{ joinCampaign: { id: string } }>({
    request: page.request,
    query: /* GraphQL */ `
      mutation Join($campaignId: ID!) {
        joinCampaign(campaignId: $campaignId) {
          id
        }
      }
    `,
    variables: { campaignId },
  });

  const invite = await graphqlPost<{ createCampaignInvite: { token: string } }>({
    request: page.request,
    query: /* GraphQL */ `
      mutation CreateInvite($campaignId: ID!, $email: String!) {
        createCampaignInvite(campaignId: $campaignId, email: $email) {
          token
        }
      }
    `,
    variables: { campaignId, email: inviteeEmail },
  });

  const inviteToken = invite.createCampaignInvite.token;

  await page.goto(`/invite?token=${encodeURIComponent(inviteToken)}`);
  await expect(page.getByText('Invite token detected.')).toBeVisible();

  // Invitee registers on the invite page.
  const registerForm = page.locator('form', { has: page.getByRole('heading', { name: 'Register' }) });
  await registerForm.getByLabel('Email').fill(inviteeEmail);
  await registerForm.getByLabel('Password').fill(password);
  await registerForm.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText(`Signed in as: ${inviteeEmail}`)).toBeVisible();

  // Accept invite.
  await page.getByRole('button', { name: 'Accept invite' }).click();
  await expect(page.getByText(`Joined campaign: ${campaignName}`)).toBeVisible();

  // Button should no longer be shown after a successful accept.
  await expect(page.getByRole('button', { name: 'Accept invite' })).toHaveCount(0);
});
