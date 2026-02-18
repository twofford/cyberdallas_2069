import { describe, expect, it } from 'vitest';
import { createYogaServer } from './yoga';

const GRAPHQL_URL = 'http://localhost/api/graphql';
const GRAPHQL_ORIGIN = 'http://localhost';

function cookiePairFromSetCookie(setCookie: string): string {
  // Convert `name=value; Path=/; HttpOnly; ...` into `name=value`
  return setCookie.split(';')[0] ?? '';
}

async function registerAndGetCookie(yoga: ReturnType<typeof createYogaServer>, email: string): Promise<string> {
  const response = await yoga.fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN },
    body: JSON.stringify({
      query: /* GraphQL */ `
        mutation Register($email: String!, $password: String!) {
          register(email: $email, password: $password) {
            user {
              id
            }
          }
        }
      `,
      variables: { email, password: 'correct-horse-battery-staple' },
    }),
  });

  expect(response.status).toBe(200);
  const setCookie = response.headers.get('set-cookie');
  expect(setCookie ?? '').toMatch(/HttpOnly/i);
  const cookieHeader = setCookie ? cookiePairFromSetCookie(setCookie) : '';
  expect(cookieHeader).toMatch(/=/);
  return cookieHeader;
}

describe('GraphQL Yoga server', () => {
  it('sets an httpOnly session cookie on register and supports cookie auth for me', async () => {
    const yoga = createYogaServer();

    const email = `cookie-auth+${Date.now()}@example.com`;
    const response = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user {
                id
                email
              }
            }
          }
        `,
        variables: { email, password: 'correct-horse-battery-staple' },
      }),
    });

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie ?? '').toMatch(/HttpOnly/i);

    const cookieHeader = setCookie ? cookiePairFromSetCookie(setCookie) : '';
    expect(cookieHeader).toMatch(/=/);

    const me = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Me {
            me {
              id
              email
            }
          }
        `,
      }),
    });

    expect(me.status).toBe(200);
    const meBody = await me.json();
    expect(meBody.errors).toBeUndefined();
    expect(meBody.data.me.email).toBe(email);
  });

  it('clears the session cookie on logout', async () => {
    const yoga = createYogaServer();

    const email = `cookie-logout+${Date.now()}@example.com`;
    const register = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user {
                id
              }
            }
          }
        `,
        variables: { email, password: 'correct-horse-battery-staple' },
      }),
    });

    const setCookie = register.headers.get('set-cookie');
    const cookieHeader = setCookie ? cookiePairFromSetCookie(setCookie) : '';

    const logout = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Logout {
            logout
          }
        `,
      }),
    });

    expect(logout.status).toBe(200);
    const logoutSetCookie = logout.headers.get('set-cookie');
    expect(logoutSetCookie ?? '').toMatch(/Max-Age=0|Expires=/i);

    const meAfter = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            me {
              id
            }
          }
        `,
      }),
    });
    expect(meAfter.status).toBe(200);
    const meAfterBody = await meAfter.json();
    expect(meAfterBody.errors).toBeUndefined();
    expect(meAfterBody.data.me).toBeNull();
  });

  it('treats configured admin emails as admins (can delete any character)', async () => {
    const yoga = createYogaServer();

    const adminEmail = `admin+${Date.now()}@example.com`;
    process.env.CYBERDALLAS_ADMIN_EMAILS = adminEmail;

    const ownerCookie = await registerAndGetCookie(yoga, `owner+${Date.now()}@example.com`);
    const adminCookie = await registerAndGetCookie(yoga, adminEmail);

    const create = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: ownerCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!) {
            createCharacter(name: $name) {
              id
            }
          }
        `,
        variables: { name: 'Owned Character' },
      }),
    });
    expect(create.status).toBe(200);
    const createBody = await create.json();
    expect(createBody.errors).toBeUndefined();
    const characterId = createBody.data.createCharacter.id as string;
    expect(characterId).toMatch(/^c_/);

    const del = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: adminCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Delete($id: ID!) {
            deleteCharacter(id: $id)
          }
        `,
        variables: { id: characterId },
      }),
    });
    expect(del.status).toBe(200);
    const delBody = await del.json();
    expect(delBody.errors).toBeUndefined();
    expect(delBody.data.deleteCharacter).toBe(true);
  });

  it('allows admins to create campaign invites without ownership', async () => {
    const yoga = createYogaServer();

    const adminEmail = `invite-admin+${Date.now()}@example.com`;
    process.env.CYBERDALLAS_ADMIN_EMAILS = adminEmail;
    const adminCookie = await registerAndGetCookie(yoga, adminEmail);

    const invite = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: adminCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Invite($campaignId: ID!, $email: String!) {
            createCampaignInvite(campaignId: $campaignId, email: $email) {
              token
              expiresAt
            }
          }
        `,
        variables: { campaignId: 'camp_1', email: `invitee+${Date.now()}@example.com` },
      }),
    });
    expect(invite.status).toBe(200);
    const inviteBody = await invite.json();
    expect(inviteBody.errors).toBeUndefined();
    expect(inviteBody.data.createCampaignInvite.token).toBeTruthy();
    expect(inviteBody.data.createCampaignInvite.expiresAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('allows signed-in users to create campaigns with startingMoney', async () => {
    const yoga = createYogaServer();

    const cookie = await registerAndGetCookie(yoga, `create-campaign+${Date.now()}@example.com`);

    const create = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateCampaign($name: String!, $startingMoney: Int) {
            createCampaign(name: $name, startingMoney: $startingMoney) {
              id
              name
              startingMoney
            }
          }
        `,
        variables: { name: 'New Campaign', startingMoney: 500 },
      }),
    });

    expect(create.status).toBe(200);
    const createBody = await create.json();
    expect(createBody.errors).toBeUndefined();
    expect(createBody.data.createCampaign.name).toBe('New Campaign');
    expect(createBody.data.createCampaign.startingMoney).toBe(500);

    const list = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Campaigns {
            campaigns {
              id
              name
            }
          }
        `,
      }),
    });

    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.errors).toBeUndefined();
    const found = (listBody.data.campaigns as Array<{ id: string; name: string }>).find((c) => c.id === createBody.data.createCampaign.id);
    expect(found?.name).toBe('New Campaign');
  });

  it('allows campaign owners to update campaign name and startingMoney', async () => {
    const yoga = createYogaServer();

    const cookie = await registerAndGetCookie(yoga, `update-campaign+${Date.now()}@example.com`);

    const create = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateCampaign($name: String!, $startingMoney: Int) {
            createCampaign(name: $name, startingMoney: $startingMoney) {
              id
              name
              startingMoney
            }
          }
        `,
        variables: { name: 'Before', startingMoney: 100 },
      }),
    });
    expect(create.status).toBe(200);
    const createBody = await create.json();
    expect(createBody.errors).toBeUndefined();
    const campaignId = createBody.data.createCampaign.id as string;

    const update = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation UpdateCampaign($campaignId: ID!, $name: String, $startingMoney: Int) {
            updateCampaign(campaignId: $campaignId, name: $name, startingMoney: $startingMoney) {
              id
              name
              startingMoney
            }
          }
        `,
        variables: { campaignId, name: 'After', startingMoney: 250 },
      }),
    });

    expect(update.status).toBe(200);
    const updateBody = await update.json();
    expect(updateBody.errors).toBeUndefined();
    expect(updateBody.data.updateCampaign.id).toBe(campaignId);
    expect(updateBody.data.updateCampaign.name).toBe('After');
    expect(updateBody.data.updateCampaign.startingMoney).toBe(250);
  });

  it('rejects campaign updates by non-owners', async () => {
    const yoga = createYogaServer();

    const ownerCookie = await registerAndGetCookie(yoga, `update-owner+${Date.now()}@example.com`);
    const otherCookie = await registerAndGetCookie(yoga, `update-other+${Date.now()}@example.com`);

    const create = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: ownerCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateCampaign($name: String!, $startingMoney: Int) {
            createCampaign(name: $name, startingMoney: $startingMoney) {
              id
            }
          }
        `,
        variables: { name: 'Owned Campaign', startingMoney: 0 },
      }),
    });
    expect(create.status).toBe(200);
    const createBody = await create.json();
    expect(createBody.errors).toBeUndefined();
    const campaignId = createBody.data.createCampaign.id as string;

    const update = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: otherCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation UpdateCampaign($campaignId: ID!, $name: String) {
            updateCampaign(campaignId: $campaignId, name: $name) {
              id
            }
          }
        `,
        variables: { campaignId, name: 'Hacked' },
      }),
    });

    expect(update.status).toBe(200);
    const updateBody = await update.json();
    expect(updateBody.data).toBeNull();
    expect(updateBody.errors?.[0]?.message ?? '').toMatch(/not authorized/i);
  });

  it('allows campaign owners to delete campaigns', async () => {
    const yoga = createYogaServer();

    const cookie = await registerAndGetCookie(yoga, `delete-campaign+${Date.now()}@example.com`);

    const create = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateCampaign($name: String!, $startingMoney: Int) {
            createCampaign(name: $name, startingMoney: $startingMoney) {
              id
              name
            }
          }
        `,
        variables: { name: 'To Delete', startingMoney: 0 },
      }),
    });

    expect(create.status).toBe(200);
    const createBody = await create.json();
    expect(createBody.errors).toBeUndefined();
    const campaignId = createBody.data.createCampaign.id as string;

    const del = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation DeleteCampaign($campaignId: ID!) {
            deleteCampaign(campaignId: $campaignId)
          }
        `,
        variables: { campaignId },
      }),
    });

    expect(del.status).toBe(200);
    const delBody = await del.json();
    expect(delBody.errors).toBeUndefined();
    expect(delBody.data.deleteCampaign).toBe(true);

    const list = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Campaigns {
            campaigns {
              id
              name
            }
          }
        `,
      }),
    });

    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.errors).toBeUndefined();
    const found = (listBody.data.campaigns as Array<{ id: string; name: string }>).find((c) => c.id === campaignId);
    expect(found).toBeUndefined();
  });

  it('rejects campaign deletes by non-owners', async () => {
    const yoga = createYogaServer();

    const ownerCookie = await registerAndGetCookie(yoga, `delete-owner+${Date.now()}@example.com`);
    const otherCookie = await registerAndGetCookie(yoga, `delete-other+${Date.now()}@example.com`);

    const create = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: ownerCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateCampaign($name: String!) {
            createCampaign(name: $name) {
              id
            }
          }
        `,
        variables: { name: 'Owned' },
      }),
    });

    expect(create.status).toBe(200);
    const createBody = await create.json();
    expect(createBody.errors).toBeUndefined();
    const campaignId = createBody.data.createCampaign.id as string;

    const del = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: otherCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation DeleteCampaign($campaignId: ID!) {
            deleteCampaign(campaignId: $campaignId)
          }
        `,
        variables: { campaignId },
      }),
    });

    expect(del.status).toBe(200);
    const delBody = await del.json();
    expect(delBody.data).toBeNull();
    expect(delBody.errors?.[0]?.message ?? '').toMatch(/not authorized/i);
  });

  it('rejects unauthenticated access to campaigns and characters', async () => {
    const yoga = createYogaServer();

    const response = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query PrivateData {
            campaigns {
              id
              name
            }
            characters {
              id
              name
            }
          }
        `,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.message ?? '').toMatch(/not authenticated/i);
  });

  it('returns characters with default speed and hit points', async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, 'yoga-characters@example.com');

    const response = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Characters {
            characters {
              id
              name
              speed
              hitPoints
            }
          }
        `,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.errors).toBeUndefined();
    expect(body.data.characters).toContainEqual({
      id: 'c_2',
      name: 'Street Thug',
      speed: 30,
      hitPoints: 3,
    });
    // Campaign-specific PCs should not be visible until the user joins those campaigns.
    expect(body.data.characters.map((c: { id: string }) => c.id)).not.toContain('c_1');
    expect(body.data.characters.map((c: { id: string }) => c.id)).not.toContain('c_3');
  });

  it("does not reveal other users' campaign characters to members", async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, 'yoga-membership@example.com');

    const join = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Join($campaignId: ID!) {
            joinCampaign(campaignId: $campaignId) {
              id
              name
            }
          }
        `,
        variables: { campaignId: 'camp_1' },
      }),
    });

    expect(join.status).toBe(200);
    const joinBody = await join.json();
    expect(joinBody.errors).toBeUndefined();
    expect(joinBody.data.joinCampaign).toEqual({ id: 'camp_1', name: 'Neon Rain' });

    const characters = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Characters {
            characters {
              id
              name
            }
          }
        `,
      }),
    });

    expect(characters.status).toBe(200);
    const charactersBody = await characters.json();
    expect(charactersBody.errors).toBeUndefined();
    const ids = (charactersBody.data.characters as Array<{ id: string }>).map((c) => c.id);

    // Still includes public archetypes.
    expect(ids).toContain('c_2');
    // Does not include other users' campaign PCs/NPCs.
    expect(ids).not.toContain('c_1');
    // camp_2 PCs still hidden.
    expect(ids).not.toContain('c_3');
  });

  it('allows joining a campaign via email invite (expires after 7 days)', async () => {
    const yoga = createYogaServer();

    const inviterEmail = `inviter+${Date.now()}@example.com`;
    const inviteeEmail = `invitee+${Date.now()}@example.com`;

    const inviterCookie = await registerAndGetCookie(yoga, inviterEmail);
    const inviteeCookie = await registerAndGetCookie(yoga, inviteeEmail);

    // Backdoor: inviter becomes a member so they can invite.
    const join = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: inviterCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation {
            joinCampaign(campaignId: "camp_1") {
              id
            }
          }
        `,
      }),
    });
    expect(join.status).toBe(200);
    const joinBody = await join.json();
    expect(joinBody.errors).toBeUndefined();

    const nowMs = Date.now();

    const invite = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: inviterCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateInvite($campaignId: ID!, $email: String!) {
            createCampaignInvite(campaignId: $campaignId, email: $email) {
              token
              expiresAt
            }
          }
        `,
        variables: { campaignId: 'camp_1', email: inviteeEmail },
      }),
    });

    expect(invite.status).toBe(200);
    const inviteBody = await invite.json();
    expect(inviteBody.errors).toBeUndefined();
    expect(inviteBody.data.createCampaignInvite.token).toBeTypeOf('string');
    expect(inviteBody.data.createCampaignInvite.expiresAt).toBeTypeOf('string');

    const expiresAtMs = Date.parse(inviteBody.data.createCampaignInvite.expiresAt as string);
    expect(Number.isNaN(expiresAtMs)).toBe(false);
    const deltaMs = expiresAtMs - nowMs;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    // Allow some runtime wiggle room.
    expect(deltaMs).toBeGreaterThan(sevenDaysMs - 60_000);
    expect(deltaMs).toBeLessThan(sevenDaysMs + 60_000);

    const accept = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: inviteeCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation AcceptInvite($token: String!) {
            acceptCampaignInvite(token: $token) {
              id
              name
            }
          }
        `,
        variables: { token: inviteBody.data.createCampaignInvite.token },
      }),
    });

    expect(accept.status).toBe(200);
    const acceptBody = await accept.json();
    expect(acceptBody.errors).toBeUndefined();
    expect(acceptBody.data.acceptCampaignInvite).toEqual({ id: 'camp_1', name: 'Neon Rain' });

    const campaigns = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: inviteeCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            campaigns {
              id
              name
            }
          }
        `,
      }),
    });

    expect(campaigns.status).toBe(200);
    const campaignsBody = await campaigns.json();
    expect(campaignsBody.errors).toBeUndefined();
    expect(campaignsBody.data.campaigns).toContainEqual({ id: 'camp_1', name: 'Neon Rain' });

    const characters = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: inviteeCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            characters {
              id
              name
            }
          }
        `,
      }),
    });

    expect(characters.status).toBe(200);
    const charactersBody = await characters.json();
    expect(charactersBody.errors).toBeUndefined();
    const ids = (charactersBody.data.characters as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain('c_2');
    expect(ids).not.toContain('c_1');
    expect(ids).not.toContain('c_3');
  });

  it('rejects accepting an invite for a different email', async () => {
    const yoga = createYogaServer();

    const inviterEmail = `inviter2+${Date.now()}@example.com`;
    const invitedEmail = `invited2+${Date.now()}@example.com`;
    const wrongUserEmail = `wrong2+${Date.now()}@example.com`;

    const inviterCookie = await registerAndGetCookie(yoga, inviterEmail);
    const wrongUserCookie = await registerAndGetCookie(yoga, wrongUserEmail);

    await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: inviterCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation {
            joinCampaign(campaignId: "camp_1") {
              id
            }
          }
        `,
      }),
    });

    const invite = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: inviterCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateInvite($campaignId: ID!, $email: String!) {
            createCampaignInvite(campaignId: $campaignId, email: $email) {
              token
              expiresAt
            }
          }
        `,
        variables: { campaignId: 'camp_1', email: invitedEmail },
      }),
    });

    expect(invite.status).toBe(200);
    const inviteBody = await invite.json();
    expect(inviteBody.errors).toBeUndefined();

    const accept = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: wrongUserCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation AcceptInvite($token: String!) {
            acceptCampaignInvite(token: $token) {
              id
            }
          }
        `,
        variables: { token: inviteBody.data.createCampaignInvite.token },
      }),
    });

    expect(accept.status).toBe(200);
    const acceptBody = await accept.json();
    expect(acceptBody.data).toBeNull();
    expect(acceptBody.errors?.[0]?.message ?? '').toMatch(/email/i);
  });

  it('allows only campaign owners to create invites', async () => {
    const yoga = createYogaServer();

    const ownerEmail = `owner+${Date.now()}@example.com`;
    const memberEmail = `member+${Date.now()}@example.com`;
    const thirdEmail = `third+${Date.now()}@example.com`;

    const ownerCookie = await registerAndGetCookie(yoga, ownerEmail);
    const memberCookie = await registerAndGetCookie(yoga, memberEmail);

    // Backdoor: first joiner becomes owner.
    const joinOwner = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: ownerCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation {
            joinCampaign(campaignId: "camp_1") {
              id
            }
          }
        `,
      }),
    });
    expect(joinOwner.status).toBe(200);
    const joinOwnerBody = await joinOwner.json();
    expect(joinOwnerBody.errors).toBeUndefined();

    // Owner creates an invite for member.
    const invite = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: ownerCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateInvite($campaignId: ID!, $email: String!) {
            createCampaignInvite(campaignId: $campaignId, email: $email) {
              token
              expiresAt
            }
          }
        `,
        variables: { campaignId: 'camp_1', email: memberEmail },
      }),
    });

    expect(invite.status).toBe(200);
    const inviteBody = await invite.json();
    expect(inviteBody.errors).toBeUndefined();

    // Member accepts invite.
    const accept = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: memberCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation AcceptInvite($token: String!) {
            acceptCampaignInvite(token: $token) {
              id
            }
          }
        `,
        variables: { token: inviteBody.data.createCampaignInvite.token },
      }),
    });
    expect(accept.status).toBe(200);
    const acceptBody = await accept.json();
    expect(acceptBody.errors).toBeUndefined();

    // Member should NOT be able to create invites.
    const memberInviteAttempt = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie: memberCookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateInvite($campaignId: ID!, $email: String!) {
            createCampaignInvite(campaignId: $campaignId, email: $email) {
              token
              expiresAt
            }
          }
        `,
        variables: { campaignId: 'camp_1', email: thirdEmail },
      }),
    });
    expect(memberInviteAttempt.status).toBe(200);
    const memberInviteAttemptBody = await memberInviteAttempt.json();
    expect(memberInviteAttemptBody.data).toBeNull();
    expect(memberInviteAttemptBody.errors?.[0]?.message ?? '').toMatch(/not authorized/i);
  });

  it('exposes minimal rules-aligned character details', async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, 'yoga-detailed@example.com');

    // Join camp_1 so we can associate a character with it.
    await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation {
            joinCampaign(campaignId: "camp_1") {
              id
            }
          }
        `,
      }),
    });

    const create = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create(
            $campaignId: ID!
            $name: String!
            $stats: StatsInput
            $skills: [SkillInput!]
            $cyberneticIds: [ID!]
            $weaponIds: [ID!]
            $vehicleIds: [ID!]
          ) {
            createCharacter(
              campaignId: $campaignId
              name: $name
              stats: $stats
              skills: $skills
              cyberneticIds: $cyberneticIds
              weaponIds: $weaponIds
              vehicleIds: $vehicleIds
            ) {
              id
            }
          }
        `,
        variables: {
          campaignId: 'camp_1',
          name: 'Nova',
          stats: { brawn: 2, charm: 4, intelligence: 6, reflexes: 7, tech: 5, luck: 1 },
          skills: [
            { name: 'Hacking', level: 6 },
            { name: 'Awareness', level: 4 },
          ],
          cyberneticIds: ['cy_1'],
          weaponIds: ['w_1', 'w_2'],
          vehicleIds: ['v_1'],
        },
      }),
    });

    expect(create.status).toBe(200);
    const createBody = await create.json();
    expect(createBody.errors).toBeUndefined();
    const createdId = createBody.data.createCharacter.id as string;

    const response = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query CharactersDetailed {
            characters {
              id
              name
              campaign {
                id
                name
              }
              stats {
                brawn
                charm
                intelligence
                reflexes
                tech
                luck
              }
              skills {
                name
                level
              }
              cybernetics {
                id
                name
                shortDescription
                longDescription
                price
                batteryLife
                statBonuses {
                  stat
                  amount
                }
                skillBonuses {
                  name
                  amount
                }
              }
              weapons {
                id
                name
                price
                weight
                maxRange
                maxAmmoCount
                type
                condition
                shortDescription
                longDescription
              }
              vehicles {
                id
                name
                price
                shortDescription
                longDescription
                speed
                armor
              }
            }
          }
        `,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.errors).toBeUndefined();

    const response2 = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: GRAPHQL_ORIGIN,
        cookie,
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query CharactersDetailed {
            characters {
              id
              name
              campaign {
                id
                name
              }
              stats {
                brawn
                charm
                intelligence
                reflexes
                tech
                luck
              }
              skills {
                name
                level
              }
              cybernetics {
                id
                name
                shortDescription
                longDescription
                price
                batteryLife
                statBonuses {
                  stat
                  amount
                }
                skillBonuses {
                  name
                  amount
                }
              }
              weapons {
                id
                name
                price
                weight
                maxRange
                maxAmmoCount
                type
                condition
                shortDescription
                longDescription
              }
              vehicles {
                id
                name
                price
                shortDescription
                longDescription
                speed
                armor
              }
            }
          }
        `,
      }),
    });

    expect(response2.status).toBe(200);
    const body2 = await response2.json();
    expect(body2.errors).toBeUndefined();

    const nova = (body2.data.characters as Array<{ id: string }>).find((c) => c.id === createdId);
    expect(nova).toEqual({
      id: createdId,
      name: 'Nova',
      campaign: {
        id: 'camp_1',
        name: 'Neon Rain',
      },
      stats: {
        brawn: 2,
        charm: 4,
        intelligence: 6,
        reflexes: 7,
        tech: 5,
        luck: 1,
      },
      skills: [
        { name: 'Hacking', level: 6 },
        { name: 'Awareness', level: 4 },
      ],
      cybernetics: [
        {
          id: 'cy_1',
          name: 'Reflex Booster',
          shortDescription: 'Boostes reflex response time.',
          longDescription: 'A spinal tap that accelerates motor response under stress.',
          price: 1200,
          batteryLife: 3,
          statBonuses: [{ stat: 'REFLEXES', amount: 1 }],
          skillBonuses: [],
        },
      ],
      weapons: [
        {
          id: 'w_1',
          name: 'Mono-Katana',
          price: 900,
          weight: 3,
          maxRange: 1,
          maxAmmoCount: 0,
          type: 'MELEE',
          condition: 100,
          shortDescription: 'A molecular-edged blade.',
          longDescription: 'A mono-molecular katana with a near-frictionless edge.',
        },
        {
          id: 'w_2',
          name: 'Smartpistol',
          price: 650,
          weight: 2,
          maxRange: 40,
          maxAmmoCount: 12,
          type: 'RANGED',
          condition: 100,
          shortDescription: 'A pistol with smart-link.',
          longDescription: 'A compact sidearm compatible with smart targeting links.',
        },
      ],
      vehicles: [
        {
          id: 'v_1',
          name: 'Street Bike',
          price: 2200,
          shortDescription: 'A loud, fast street bike.',
          longDescription: 'A stripped-down bike built for speed in tight alleys.',
          speed: 80,
          armor: 1,
        },
      ],
    });

    expect((body2.data.characters as Array<{ id: string }>).map((c) => c.id)).not.toContain('c_3');
  });

  it('exposes browseable catalogs for cybernetics, weapons, items, and vehicles', async () => {
    const yoga = createYogaServer();

    const response = await yoga.fetch('http://localhost/api/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Catalogs {
            cybernetics {
              id
              name
              shortDescription
              longDescription
              price
              batteryLife
            }
            weapons {
              id
              name
              price
              weight
              maxRange
              maxAmmoCount
              type
              condition
              shortDescription
              longDescription
            }
            items {
              id
              name
              price
              weight
              type
              shortDescription
              longDescription
            }
            vehicles {
              id
              name
              price
              shortDescription
              longDescription
              speed
              armor
            }
          }
        `,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.errors).toBeUndefined();
    expect(body.data.cybernetics.length).toBeGreaterThan(0);
    expect(body.data.weapons.length).toBeGreaterThan(0);
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.vehicles.length).toBeGreaterThan(0);
  });
});
