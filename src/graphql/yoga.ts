import { createSchema, createYoga } from 'graphql-yoga';
import { GraphQLError } from 'graphql';

import { createDataSource, type DataSource } from './dataSource';
import { hashPassword, isValidEmail, issueAuthToken, verifyAuthToken, verifyPassword } from './auth';
import { sendCampaignInviteEmail } from '../email/mailer';
import type {
  CampaignRecord,
  CharacterRecord,
  CyberneticRecord,
  ItemRecord,
  StatsRecord,
  VehicleRecord,
  WeaponRecord,
} from './seed';

type YogaContext = {
  dataSource: DataSource;
  user: { id: string; email: string } | null;
  httpHeaders: Record<string, string>;
};

export function createYogaServer() {
  const dataSource = createDataSource();

  const SESSION_COOKIE_NAME = 'cyberdallasSession';

  function parseCookies(cookieHeader: string | null): Record<string, string> {
    if (!cookieHeader) return {};
    const out: Record<string, string> = {};
    for (const part of cookieHeader.split(';')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!key) continue;
      out[key] = value;
    }
    return out;
  }

  function getTokenFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const fromCookie = cookies[SESSION_COOKIE_NAME];
    if (fromCookie) return fromCookie;

    return null;
  }

  function getExpectedOriginsForRequest(request: Request): Set<string> {
    const allowed = new Set<string>();
    try {
      allowed.add(new URL(request.url).origin);
    } catch {
      // Ignore.
    }

    const appBaseUrl = process.env.APP_BASE_URL;
    if (appBaseUrl) {
      try {
        allowed.add(new URL(appBaseUrl).origin);
      } catch {
        // Ignore.
      }
    }

    return allowed;
  }

  function getHeaderOriginValue(request: Request): string | null {
    const origin = request.headers.get('origin');
    if (origin) return origin;

    const referer = request.headers.get('referer');
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  async function isGraphQLMutationRequest(request: Request): Promise<boolean> {
    if (request.method.toUpperCase() !== 'POST') return false;
    const contentType = request.headers.get('content-type') ?? '';
    if (!/application\/json/i.test(contentType)) return true;

    try {
      const cloned = request.clone();
      const body = (await cloned.json()) as { query?: unknown };
      const query = typeof body.query === 'string' ? body.query : '';
      return /^\s*mutation\b/.test(query);
    } catch {
      // If we can't parse the body, treat it as potentially state-changing.
      return true;
    }
  }

  function buildSessionCookie(token: string, nowMs: number = Date.now()): string {
    // Token payload is base64url JSON.
    const [payloadB64] = token.split('.');
    let maxAgeSeconds = 7 * 24 * 60 * 60;
    try {
      if (payloadB64) {
        const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson) as { exp?: number };
        if (typeof payload.exp === 'number') {
          const deltaMs = payload.exp - nowMs;
          maxAgeSeconds = Math.max(0, Math.floor(deltaMs / 1000));
        }
      }
    } catch {
      // Fall back to default max-age.
    }

    const parts = [`${SESSION_COOKIE_NAME}=${token}`, 'Path=/', `Max-Age=${maxAgeSeconds}`, 'HttpOnly', 'SameSite=Lax'];
    if (process.env.NODE_ENV === 'production') parts.push('Secure');
    return parts.join('; ');
  }

  function clearSessionCookie(): string {
    const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
    if (process.env.NODE_ENV === 'production') parts.push('Secure');
    return parts.join('; ');
  }

  function requireUser(ctx: YogaContext) {
    if (!ctx.user) throw new GraphQLError('Not authenticated');
    return ctx.user;
  }

  async function getUserFromRequest(request: Request): Promise<YogaContext['user']> {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const token = getTokenFromRequest(request);
    if (!token) return null;

    const userId = verifyAuthToken(token, secret);
    if (!userId) return null;

    return dataSource.getUserById(userId);
  }

  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      enum StatName {
        BRAWN
        CHARM
        INTELLIGENCE
        REFLEXES
        TECH
        LUCK
      }

      type Stats {
        brawn: Int!
        charm: Int!
        intelligence: Int!
        reflexes: Int!
        tech: Int!
        luck: Int!
      }

      type Skill {
        name: String!
        level: Int!
      }

      type StatBonus {
        stat: StatName!
        amount: Int!
      }

      type SkillBonus {
        name: String!
        amount: Int!
      }

      type Cybernetic {
        id: ID!
        name: String!
        shortDescription: String!
        longDescription: String!
        price: Int!
        batteryLife: Int!
        statBonuses: [StatBonus!]!
        skillBonuses: [SkillBonus!]!
      }

      enum WeaponType {
        MELEE
        RANGED
      }

      type Weapon {
        id: ID!
        name: String!
        price: Int!
        weight: Int!
        maxRange: Int!
        maxAmmoCount: Int!
        type: WeaponType!
        condition: Int!
        shortDescription: String!
        longDescription: String!
      }

      type Vehicle {
        id: ID!
        name: String!
        price: Int!
        shortDescription: String!
        longDescription: String!
        speed: Int!
        armor: Int!
      }

      enum ItemType {
        GENERAL
        CYBERDECK
        CONSUMABLE
        AMMO
        OTHER
      }

      type Item {
        id: ID!
        name: String!
        price: Int!
        weight: Int!
        shortDescription: String!
        longDescription: String!
        type: ItemType!
      }

      type Character {
        id: ID!
        name: String!
        isPublic: Boolean!
        speed: Int!
        hitPoints: Int!
        campaign: Campaign
        stats: Stats!
        skills: [Skill!]!
        cybernetics: [Cybernetic!]!
        weapons: [Weapon!]!
        items: [Item!]!
        vehicles: [Vehicle!]!
      }

      type Campaign {
        id: ID!
        name: String!
        characters: [Character!]!
      }

      type User {
        id: ID!
        email: String!
      }

      type AuthPayload {
        user: User!
      }

      type CampaignInviteToken {
        token: String!
        expiresAt: String!
      }

      type Query {
        characters: [Character!]!
        campaigns: [Campaign!]!
        ownerCampaigns: [Campaign!]!
        cybernetics: [Cybernetic!]!
        weapons: [Weapon!]!
        items: [Item!]!
        vehicles: [Vehicle!]!

        me: User
      }

      type Mutation {
        register(email: String!, password: String!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        logout: Boolean!
        joinCampaign(campaignId: ID!): Campaign!
        createCampaignInvite(campaignId: ID!, email: String!): CampaignInviteToken!
        acceptCampaignInvite(token: String!): Campaign!
      }
    `,
    resolvers: {
      Query: {
        characters: async (_parent: unknown, _args: unknown, ctx: YogaContext) => {
          const user = requireUser(ctx);
          return ctx.dataSource.listCharactersForUser(user.id);
        },
        campaigns: async (_parent: unknown, _args: unknown, ctx: YogaContext) => {
          const user = requireUser(ctx);
          return ctx.dataSource.listCampaignsForUser(user.id);
        },
        ownerCampaigns: async (_parent: unknown, _args: unknown, ctx: YogaContext) => {
          const user = requireUser(ctx);
          const campaigns = await ctx.dataSource.listCampaignsForUser(user.id);
          const owned: Array<CampaignRecord> = [];
          for (const campaign of campaigns) {
            const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId: campaign.id });
            if (role === 'OWNER') owned.push(campaign);
          }
          return owned;
        },
        cybernetics: async (_parent: unknown, _args: unknown, ctx: YogaContext) => ctx.dataSource.listCybernetics(),
        weapons: async (_parent: unknown, _args: unknown, ctx: YogaContext) => ctx.dataSource.listWeapons(),
        items: async (_parent: unknown, _args: unknown, ctx: YogaContext) => ctx.dataSource.listItems(),
        vehicles: async (_parent: unknown, _args: unknown, ctx: YogaContext) => ctx.dataSource.listVehicles(),
        me: async (_parent: unknown, _args: unknown, ctx: YogaContext) => ctx.user,
      },
      Mutation: {
        register: async (_parent: unknown, args: { email: string; password: string }, ctx: YogaContext) => {
          const email = args.email.trim().toLowerCase();
          const password = args.password;

          if (!isValidEmail(email)) throw new GraphQLError('Invalid email');
          if (password.length < 8) throw new GraphQLError('Password must be at least 8 characters');

          const existing = await ctx.dataSource.findUserByEmail(email);
          if (existing) throw new GraphQLError('User already exists');

          const passwordHash = await hashPassword(password);
          let user: { id: string; email: string };
          try {
            user = await ctx.dataSource.createUser({ email, passwordHash });
          } catch (error) {
            if (error instanceof Error && error.message === 'DUPLICATE_EMAIL') {
              throw new GraphQLError('User already exists');
            }
            throw error;
          }

          const secret = process.env.AUTH_SECRET;
          if (!secret) throw new GraphQLError('Server misconfigured: AUTH_SECRET is missing');

          const token = issueAuthToken(user.id, secret);
          ctx.httpHeaders['set-cookie'] = buildSessionCookie(token);
          return { user };
        },
        login: async (_parent: unknown, args: { email: string; password: string }, ctx: YogaContext) => {
          const email = args.email.trim().toLowerCase();
          const password = args.password;

          const user = await ctx.dataSource.findUserByEmail(email);
          if (!user) throw new GraphQLError('Invalid credentials');

          const ok = await verifyPassword(password, user.passwordHash);
          if (!ok) throw new GraphQLError('Invalid credentials');

          const secret = process.env.AUTH_SECRET;
          if (!secret) throw new GraphQLError('Server misconfigured: AUTH_SECRET is missing');

          const token = issueAuthToken(user.id, secret);
          ctx.httpHeaders['set-cookie'] = buildSessionCookie(token);
          return { user: { id: user.id, email: user.email } };
        },

        logout: async (_parent: unknown, _args: unknown, ctx: YogaContext) => {
          ctx.httpHeaders['set-cookie'] = clearSessionCookie();
          return true;
        },

        joinCampaign: async (_parent: unknown, args: { campaignId: string }, ctx: YogaContext) => {
          const user = requireUser(ctx);
          const campaignId = String(args.campaignId);

          const campaign = await ctx.dataSource.getCampaignById(campaignId);
          if (!campaign) throw new GraphQLError('Campaign not found');

          await ctx.dataSource.addUserToCampaign({ userId: user.id, campaignId });
          return campaign;
        },

        createCampaignInvite: async (
          _parent: unknown,
          args: { campaignId: string; email: string },
          ctx: YogaContext,
        ) => {
          const user = requireUser(ctx);
          const campaignId = String(args.campaignId);
          const email = args.email.trim().toLowerCase();

          if (!isValidEmail(email)) throw new GraphQLError('Invalid email');

          const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId });
          if (role !== 'OWNER') throw new GraphQLError('Not authorized');

          const ttlMs = 7 * 24 * 60 * 60 * 1000;
          const invite = await ctx.dataSource.createCampaignInvite({ campaignId, email, ttlMs });

          const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
          const inviteUrl = `${baseUrl.replace(/\/$/, '')}/invite?token=${encodeURIComponent(invite.token)}`;

          const campaign = await ctx.dataSource.getCampaignById(campaignId);
          if (!campaign) throw new GraphQLError('Campaign not found');

          await sendCampaignInviteEmail({
            to: email,
            campaignName: campaign.name,
            inviteUrl,
            expiresAtIso: invite.expiresAt,
          });

          return invite;
        },

        acceptCampaignInvite: async (_parent: unknown, args: { token: string }, ctx: YogaContext) => {
          const user = requireUser(ctx);
          const token = String(args.token);

          try {
            return await ctx.dataSource.acceptCampaignInvite({ token, userId: user.id, userEmail: user.email });
          } catch (error) {
            if (error instanceof Error && error.message === 'INVITE_EMAIL_MISMATCH') {
              throw new GraphQLError('Invite is for a different email');
            }
            if (error instanceof Error && error.message === 'INVITE_EXPIRED') {
              throw new GraphQLError('Invite has expired');
            }
            if (error instanceof Error && error.message === 'INVITE_ALREADY_USED') {
              throw new GraphQLError('Invite has already been used');
            }
            if (error instanceof Error && error.message === 'INVITE_NOT_FOUND') {
              throw new GraphQLError('Invite not found');
            }
            throw error;
          }
        },
      },
      Character: {
        isPublic: (character: CharacterRecord) => character.isPublic ?? false,
        speed: (character: CharacterRecord) => character.speed ?? 30,
        hitPoints: (character: CharacterRecord) => character.hitPoints ?? 5,
        campaign: async (character: CharacterRecord, _args: unknown, ctx: YogaContext) => {
          const campaignId = character.campaignId;
          if (!campaignId) return null;
          return ctx.dataSource.getCampaignById(campaignId);
        },
        stats: (character: CharacterRecord): StatsRecord => {
          const stats = character.stats ?? {};
          return {
            brawn: stats.brawn ?? 0,
            charm: stats.charm ?? 0,
            intelligence: stats.intelligence ?? 0,
            reflexes: stats.reflexes ?? 0,
            tech: stats.tech ?? 0,
            luck: stats.luck ?? 0,
          };
        },
        skills: (character: CharacterRecord) => character.skills ?? [],
        cybernetics: async (character: CharacterRecord, _args: unknown, ctx: YogaContext) => {
          const allCybernetics = await ctx.dataSource.listCybernetics();
          const ids = character.cyberneticIds ?? [];
          return ids
            .map((id) => allCybernetics.find((cybernetic) => cybernetic.id === id))
            .filter((cybernetic): cybernetic is CyberneticRecord => Boolean(cybernetic));
        },
        weapons: async (character: CharacterRecord, _args: unknown, ctx: YogaContext) => {
          const allWeapons = await ctx.dataSource.listWeapons();
          const ids = character.weaponIds ?? [];
          return ids
            .map((id) => allWeapons.find((weapon) => weapon.id === id))
            .filter((weapon): weapon is WeaponRecord => Boolean(weapon));
        },
        items: async (character: CharacterRecord, _args: unknown, ctx: YogaContext) => {
          const allItems = await ctx.dataSource.listItems();
          const ids = character.itemIds ?? [];
          return ids
            .map((id) => allItems.find((item) => item.id === id))
            .filter((item): item is ItemRecord => Boolean(item));
        },
        vehicles: async (character: CharacterRecord, _args: unknown, ctx: YogaContext) => {
          const allVehicles = await ctx.dataSource.listVehicles();
          const ids = character.vehicleIds ?? [];
          return ids
            .map((id) => allVehicles.find((vehicle) => vehicle.id === id))
            .filter((vehicle): vehicle is VehicleRecord => Boolean(vehicle));
        },
      },
      Campaign: {
        characters: async (campaign: CampaignRecord, _args: unknown, ctx: YogaContext) => {
          const user = requireUser(ctx);
          const visibleCharacters = await ctx.dataSource.listCharactersForUser(user.id);
          return visibleCharacters.filter((character) => character.campaignId === campaign.id);
        },
      },
      Cybernetic: {
        statBonuses: (cybernetic: CyberneticRecord) => cybernetic.statBonuses ?? [],
        skillBonuses: (cybernetic: CyberneticRecord) => cybernetic.skillBonuses ?? [],
      },
    },
  });

  return createYoga({
    schema,
    graphqlEndpoint: '/api/graphql',
    context: async ({ request }) => ({ dataSource, user: await getUserFromRequest(request), httpHeaders: {} }),
    maskedErrors: false,
    plugins: [
      {
        async onRequest({ request, endResponse }) {
          if (!(await isGraphQLMutationRequest(request))) return;

          const headerOrigin = getHeaderOriginValue(request);
          const allowed = getExpectedOriginsForRequest(request);

          // Enforce Origin/Referer checks for mutation requests to mitigate CSRF.
          if (!headerOrigin) {
            // Browsers include Origin for fetch POSTs; missing Origin is suspicious in production.
            if (process.env.NODE_ENV === 'production') {
              endResponse(new Response('Forbidden', { status: 403 }));
            }
            return;
          }

          if (!allowed.has(headerOrigin)) {
            endResponse(new Response('Forbidden', { status: 403 }));
          }
        },
      },
      {
        onExecutionResult({ result, setResult, context }) {
          const httpHeaders = (context as unknown as YogaContext).httpHeaders;
          if (!httpHeaders || Object.keys(httpHeaders).length === 0) return;

          if (!result) return;
          const isAsyncIterable = typeof (result as any)[Symbol.asyncIterator] === 'function';
          if (isAsyncIterable) return;

          const res = result as any;
          const next = {
            ...res,
            extensions: {
              ...(res.extensions ?? {}),
              http: {
                ...(res.extensions?.http ?? {}),
                headers: {
                  ...(res.extensions?.http?.headers ?? {}),
                  ...httpHeaders,
                },
              },
            },
          };
          setResult(next);
        },
      },
    ],
  });
}
