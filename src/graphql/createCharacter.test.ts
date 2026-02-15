import { describe, expect, it } from 'vitest';

import { createYogaServer } from './yoga';

const GRAPHQL_URL = 'http://localhost/api/graphql';
const GRAPHQL_ORIGIN = 'http://localhost';

function cookiePairFromSetCookie(setCookie: string): string {
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

describe('createCharacter', () => {
  it('requires campaign membership to create a character', async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, `create-char+${Date.now()}@example.com`);

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($campaignId: ID!, $name: String!) {
            createCharacter(campaignId: $campaignId, name: $name) {
              id
            }
          }
        `,
        variables: { campaignId: 'camp_1', name: 'Razor' },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.data).toBeNull();
    expect(createBody.errors?.[0]?.message ?? '').toMatch(/not authorized|not authenticated/i);
  });

  it('allows creating a character with no campaign and lists it for the owner', async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, `create-char-solo+${Date.now()}@example.com`);

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!) {
            createCharacter(name: $name) {
              id
              name
              campaign {
                id
              }
            }
          }
        `,
        variables: { name: 'Solo' },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    expect(createBody.data.createCharacter.name).toBe('Solo');
    expect(createBody.data.createCharacter.campaign).toBeNull();

    const listResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Characters {
            characters {
              id
              name
              campaign {
                id
              }
            }
          }
        `,
      }),
    });

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.errors).toBeUndefined();
    const found = (listBody.data.characters as Array<{ id: string; name: string; campaign: { id: string } | null }>).find(
      (c) => c.name === 'Solo',
    );
    expect(found).toBeTruthy();
    expect(found?.campaign).toBeNull();
  });

  it('creates a character for a member campaign and lists it', async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, `create-char-member+${Date.now()}@example.com`);

    const joinResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Join($campaignId: ID!) {
            joinCampaign(campaignId: $campaignId) {
              id
            }
          }
        `,
        variables: { campaignId: 'camp_1' },
      }),
    });

    expect(joinResponse.status).toBe(200);
    const joinBody = await joinResponse.json();
    expect(joinBody.errors).toBeUndefined();

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create(
            $campaignId: ID!
            $name: String!
            $stats: StatsInput
            $skills: [SkillInput!]
            $cyberneticIds: [ID!]
            $weaponIds: [ID!]
            $itemIds: [ID!]
            $vehicleIds: [ID!]
          ) {
            createCharacter(
              campaignId: $campaignId
              name: $name
              stats: $stats
              skills: $skills
              cyberneticIds: $cyberneticIds
              weaponIds: $weaponIds
              itemIds: $itemIds
              vehicleIds: $vehicleIds
            ) {
              id
              name
              isPublic
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
              }
              weapons {
                id
                name
              }
              items {
                id
                name
              }
              vehicles {
                id
                name
              }
            }
          }
        `,
        variables: {
          campaignId: 'camp_1',
          name: 'Razor',
          stats: { brawn: 3, reflexes: 2 },
          skills: [{ name: 'Hacking', level: 6 }],
          cyberneticIds: ['cy_1'],
          weaponIds: ['w_1'],
          itemIds: ['i_1'],
          vehicleIds: ['v_1'],
        },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    expect(createBody.data.createCharacter.name).toBe('Razor');
    expect(createBody.data.createCharacter.isPublic).toBe(false);
    expect(createBody.data.createCharacter.campaign.id).toBe('camp_1');
    expect(createBody.data.createCharacter.stats.brawn).toBe(3);
    expect(createBody.data.createCharacter.stats.reflexes).toBe(2);
    expect(createBody.data.createCharacter.skills).toEqual([{ name: 'Hacking', level: 6 }]);
    expect((createBody.data.createCharacter.cybernetics as Array<{ id: string }>).map((c) => c.id)).toContain('cy_1');
    expect((createBody.data.createCharacter.weapons as Array<{ id: string }>).map((w) => w.id)).toContain('w_1');
    expect((createBody.data.createCharacter.items as Array<{ id: string }>).map((i) => i.id)).toContain('i_1');
    expect((createBody.data.createCharacter.vehicles as Array<{ id: string }>).map((v) => v.id)).toContain('v_1');

    const listResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Characters {
            characters {
              id
              name
              campaign {
                id
              }
            }
          }
        `,
      }),
    });

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.errors).toBeUndefined();

    const found = (listBody.data.characters as Array<{ id: string; name: string; campaign: { id: string } | null }>).find(
      (c) => c.name === 'Razor',
    );
    expect(found).toBeTruthy();
    expect(found?.campaign?.id).toBe('camp_1');
  });
});
