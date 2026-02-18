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

  it('uses campaign startingMoney for new characters created in that campaign', async () => {
    const yoga = createYogaServer();

    const email = `starting-money+${Date.now()}@example.com`;
    const cookieHeader = await registerAndGetCookie(yoga, email);

    const createdCampaign = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieHeader },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation CreateCampaign($name: String!, $startingMoney: Int) {
            createCampaign(name: $name, startingMoney: $startingMoney) {
              id
            }
          }
        `,
        variables: { name: 'Money Test', startingMoney: 1234 },
      }),
    });
    expect(createdCampaign.status).toBe(200);
    const createdCampaignBody = await createdCampaign.json();
    expect(createdCampaignBody.errors).toBeUndefined();
    const campaignId = createdCampaignBody.data.createCampaign.id as string;

    const response = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieHeader },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($campaignId: ID!, $name: String!) {
            createCharacter(campaignId: $campaignId, name: $name) {
              id
              money
            }
          }
        `,
        variables: { campaignId, name: 'Newbie' },
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.createCharacter.money).toBe(1234);
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

  it("does not reveal other users' campaign characters to members", async () => {
    const yoga = createYogaServer();
    const cookieA = await registerAndGetCookie(yoga, `create-char-a+${Date.now()}@example.com`);
    const cookieB = await registerAndGetCookie(yoga, `create-char-b+${Date.now()}@example.com`);

    const joinAResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieA },
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
    expect(joinAResponse.status).toBe(200);
    const joinABody = await joinAResponse.json();
    expect(joinABody.errors).toBeUndefined();

    const joinBResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieB },
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
    expect(joinBResponse.status).toBe(200);
    const joinBBody = await joinBResponse.json();
    expect(joinBBody.errors).toBeUndefined();

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieA },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($campaignId: ID!, $name: String!) {
            createCharacter(campaignId: $campaignId, name: $name) {
              id
              name
              campaign {
                id
              }
            }
          }
        `,
        variables: { campaignId: 'camp_1', name: 'Boss NPC' },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    expect(createBody.data.createCharacter.name).toBe('Boss NPC');

    const listResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieB },
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

    const names = (listBody.data.characters as Array<{ name: string }>).map((c) => c.name);
    expect(names).not.toContain('Boss NPC');
  });

  it('allows campaign owners to create public archetypes (no campaign) visible to all users', async () => {
    const yoga = createYogaServer();

    const ownerCookie = await registerAndGetCookie(yoga, `arch-owner+${Date.now()}@example.com`);
    const otherCookie = await registerAndGetCookie(yoga, `arch-other+${Date.now()}@example.com`);

    // Become OWNER of camp_1 (first member becomes owner).
    const joinOwner = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: ownerCookie },
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
    expect(joinOwner.status).toBe(200);
    const joinOwnerBody = await joinOwner.json();
    expect(joinOwnerBody.errors).toBeUndefined();

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: ownerCookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!, $isPublic: Boolean!) {
            createCharacter(name: $name, isPublic: $isPublic) {
              id
              name
              isPublic
              campaign {
                id
              }
            }
          }
        `,
        variables: { name: 'Public Thug', isPublic: true },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    expect(createBody.data.createCharacter.name).toBe('Public Thug');
    expect(createBody.data.createCharacter.isPublic).toBe(true);
    expect(createBody.data.createCharacter.campaign).toBeNull();

    const listResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: otherCookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Characters {
            characters {
              id
              name
              isPublic
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
    const found = (listBody.data.characters as Array<{ name: string; isPublic: boolean; campaign: { id: string } | null }>).find(
      (c) => c.name === 'Public Thug',
    );
    expect(found).toBeTruthy();
    expect(found?.isPublic).toBe(true);
    expect(found?.campaign).toBeNull();
  });

  it('rejects creating public archetypes for non-owners', async () => {
    const yoga = createYogaServer();

    const ownerCookie = await registerAndGetCookie(yoga, `arch-owner2+${Date.now()}@example.com`);
    const memberCookie = await registerAndGetCookie(yoga, `arch-member+${Date.now()}@example.com`);

    // Establish an OWNER for camp_1.
    await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: ownerCookie },
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

    // Second user becomes MEMBER.
    const joinMember = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: memberCookie },
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
    expect(joinMember.status).toBe(200);

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: memberCookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!, $isPublic: Boolean!) {
            createCharacter(name: $name, isPublic: $isPublic) {
              id
            }
          }
        `,
        variables: { name: 'Nope', isPublic: true },
      }),
    });

    expect(createResponse.status).toBe(200);
    const body = await createResponse.json();
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.message ?? '').toMatch(/not authorized|not authenticated/i);
  });
});

describe('updateCharacter', () => {
  it('allows the owner to update a character name and stats', async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, `update-char-owner+${Date.now()}@example.com`);

    const joinResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
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
    expect(joinResponse.status).toBe(200);

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!) {
            createCharacter(name: $name) {
              id
              name
              stats {
                brawn
              }
            }
          }
        `,
        variables: { name: 'Editable' },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    const characterId = String(createBody.data.createCharacter.id);
    expect(createBody.data.createCharacter.name).toBe('Editable');
    expect(createBody.data.createCharacter.stats.brawn).toBe(0);

    const updateResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Update(
            $id: ID!
            $campaignId: ID
            $name: String!
            $money: Int
            $stats: StatsInput
            $skills: [SkillInput!]
            $cyberneticIds: [ID!]
            $weaponIds: [ID!]
            $itemIds: [ID!]
          ) {
            updateCharacter(
              id: $id
              campaignId: $campaignId
              name: $name
              money: $money
              stats: $stats
              skills: $skills
              cyberneticIds: $cyberneticIds
              weaponIds: $weaponIds
              itemIds: $itemIds
            ) {
              id
              name
              campaign {
                id
              }
              money
              stats {
                brawn
                reflexes
              }
              skills {
                name
                level
              }
              cybernetics {
                id
              }
              weapons {
                id
              }
              items {
                id
              }
            }
          }
        `,
        variables: {
          id: characterId,
          campaignId: 'camp_1',
          name: 'Edited',
          money: 1234,
          stats: { brawn: 4, reflexes: 2 },
          skills: [
            { name: 'Hacking', level: 3 },
            { name: 'Street Smarts', level: 2 },
          ],
          cyberneticIds: ['cy_1'],
          weaponIds: ['w_1'],
          itemIds: ['i_1'],
        },
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody.errors).toBeUndefined();
    expect(updateBody.data.updateCharacter.id).toBe(characterId);
    expect(updateBody.data.updateCharacter.name).toBe('Edited');
    expect(updateBody.data.updateCharacter.campaign.id).toBe('camp_1');
    expect(updateBody.data.updateCharacter.money).toBe(1234);
    expect(updateBody.data.updateCharacter.stats.brawn).toBe(4);
    expect(updateBody.data.updateCharacter.stats.reflexes).toBe(2);
    expect(updateBody.data.updateCharacter.skills).toEqual([
      { name: 'Hacking', level: 3 },
      { name: 'Street Smarts', level: 2 },
    ]);
    expect((updateBody.data.updateCharacter.cybernetics as Array<{ id: string }>).map((c) => c.id)).toContain('cy_1');
    expect((updateBody.data.updateCharacter.weapons as Array<{ id: string }>).map((w) => w.id)).toContain('w_1');
    expect((updateBody.data.updateCharacter.items as Array<{ id: string }>).map((i) => i.id)).toContain('i_1');

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
              money
              stats {
                brawn
                reflexes
              }
              skills {
                name
                level
              }
              cybernetics {
                id
              }
              weapons {
                id
              }
              items {
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

    const found = (
      listBody.data.characters as Array<{
        id: string;
        name: string;
        campaign: { id: string } | null;
        money: number;
        stats: { brawn: number; reflexes: number };
        skills: Array<{ name: string; level: number }>;
        cybernetics: Array<{ id: string }>;
        weapons: Array<{ id: string }>;
        items: Array<{ id: string }>;
      }>
    ).find(
      (c) => c.id === characterId,
    );
    expect(found).toBeTruthy();
    expect(found?.name).toBe('Edited');
    expect(found?.campaign?.id).toBe('camp_1');
    expect(found?.money).toBe(1234);
    expect(found?.stats.brawn).toBe(4);
    expect(found?.stats.reflexes).toBe(2);
    expect(found?.skills).toEqual([
      { name: 'Hacking', level: 3 },
      { name: 'Street Smarts', level: 2 },
    ]);
    expect(found?.cybernetics.map((c) => c.id)).toContain('cy_1');
    expect(found?.weapons.map((w) => w.id)).toContain('w_1');
    expect(found?.items.map((i) => i.id)).toContain('i_1');
  });

  it('rejects updates by non-owners', async () => {
    const yoga = createYogaServer();
    const cookieA = await registerAndGetCookie(yoga, `update-char-a+${Date.now()}@example.com`);
    const cookieB = await registerAndGetCookie(yoga, `update-char-b+${Date.now()}@example.com`);

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieA },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!) {
            createCharacter(name: $name) {
              id
            }
          }
        `,
        variables: { name: 'Private' },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    const characterId = String(createBody.data.createCharacter.id);

    const updateResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieB },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Update($id: ID!, $name: String!) {
            updateCharacter(id: $id, name: $name) {
              id
            }
          }
        `,
        variables: { id: characterId, name: 'Hacked' },
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody.data).toBeNull();
    expect(updateBody.errors?.[0]?.message ?? '').toMatch(/not authorized|not authenticated/i);
  });
});

describe('deleteCharacter', () => {
  it('allows the owner to delete a character', async () => {
    const yoga = createYogaServer();
    const cookie = await registerAndGetCookie(yoga, `delete-char-owner+${Date.now()}@example.com`);

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!) {
            createCharacter(name: $name) {
              id
            }
          }
        `,
        variables: { name: 'Deletable' },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    const characterId = String(createBody.data.createCharacter.id);

    const deleteResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Delete($id: ID!) {
            deleteCharacter(id: $id)
          }
        `,
        variables: { id: characterId },
      }),
    });

    expect(deleteResponse.status).toBe(200);
    const deleteBody = await deleteResponse.json();
    expect(deleteBody.errors).toBeUndefined();
    expect(deleteBody.data.deleteCharacter).toBe(true);

    const listResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Characters {
            characters {
              id
            }
          }
        `,
      }),
    });

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.errors).toBeUndefined();
    const ids = (listBody.data.characters as Array<{ id: string }>).map((c) => c.id);
    expect(ids).not.toContain(characterId);
  });

  it('rejects deletes by non-owners', async () => {
    const yoga = createYogaServer();
    const cookieA = await registerAndGetCookie(yoga, `delete-char-a+${Date.now()}@example.com`);
    const cookieB = await registerAndGetCookie(yoga, `delete-char-b+${Date.now()}@example.com`);

    const createResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieA },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Create($name: String!) {
            createCharacter(name: $name) {
              id
            }
          }
        `,
        variables: { name: 'Private' },
      }),
    });

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.errors).toBeUndefined();
    const characterId = String(createBody.data.createCharacter.id);

    const deleteResponse = await yoga.fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: GRAPHQL_ORIGIN, cookie: cookieB },
      body: JSON.stringify({
        query: /* GraphQL */ `
          mutation Delete($id: ID!) {
            deleteCharacter(id: $id)
          }
        `,
        variables: { id: characterId },
      }),
    });

    expect(deleteResponse.status).toBe(200);
    const deleteBody = await deleteResponse.json();
    expect(deleteBody.data).toBeNull();
    expect(deleteBody.errors?.[0]?.message ?? '').toMatch(/not authorized|not authenticated/i);
  });
});
