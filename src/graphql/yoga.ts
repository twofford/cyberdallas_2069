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
  user: { id: string; email: string; role: 'USER' | 'ADMIN' } | null;
  httpHeaders: Record<string, string>;
};

const PREDEFINED_SKILLS = [
  'Athleticism',
  'Awareness',
  'Connections',
  'Deception',
  'Driving',
  'Engineering',
  'Explosives',
  'Hacking',
  'Influence',
  'Intimidation',
  'Investigation',
  'Marksmanship',
  'Martial Arts',
  'Medicine',
  'Melee Combat',
  'Piloting',
  'Seduction',
  'Stealth',
  'Street Smarts',
  'Tracking',
] as const;

const PREDEFINED_SKILL_BY_LOWER = new Map(PREDEFINED_SKILLS.map((s) => [s.toLowerCase(), s] as const));

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

  function isAdmin(user: YogaContext['user']): boolean {
    return user?.role === 'ADMIN';
  }

  function adminEmailSet(): Set<string> {
    const raw = process.env.CYBERDALLAS_ADMIN_EMAILS ?? '';
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  function isAdminEmail(email: string): boolean {
    return adminEmailSet().has(email.trim().toLowerCase());
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

      input StatsInput {
        brawn: Int
        charm: Int
        intelligence: Int
        reflexes: Int
        tech: Int
        luck: Int
      }

      type Skill {
        name: String!
        level: Int!
      }

      input SkillInput {
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
        canEdit: Boolean!
        money: Int!
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
        startingMoney: Int!
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
        createCampaign(name: String!, startingMoney: Int): Campaign!
        updateCampaign(campaignId: ID!, name: String, startingMoney: Int): Campaign!
        deleteCampaign(campaignId: ID!): Boolean!
        createCharacter(
          campaignId: ID
          name: String!
          isPublic: Boolean
          stats: StatsInput
          skills: [SkillInput!]
          cyberneticIds: [ID!]
          weaponIds: [ID!]
          itemIds: [ID!]
          vehicleIds: [ID!]
        ): Character!
        updateCharacter(
          id: ID!
          campaignId: ID
          name: String
          money: Int
          stats: StatsInput
          skills: [SkillInput!]
          cyberneticIds: [ID!]
          weaponIds: [ID!]
          itemIds: [ID!]
          vehicleIds: [ID!]
        ): Character!
        deleteCharacter(id: ID!): Boolean!
        createCampaignInvite(campaignId: ID!, email: String!): CampaignInviteToken!
        acceptCampaignInvite(token: String!): Campaign!
      }
    `,
    resolvers: {
      Query: {
        characters: async (_parent: unknown, _args: unknown, ctx: YogaContext) => {
          const user = requireUser(ctx);
          if (isAdmin(user)) return ctx.dataSource.listCharacters();
          return ctx.dataSource.listCharactersForUser(user.id);
        },
        campaigns: async (_parent: unknown, _args: unknown, ctx: YogaContext) => {
          const user = requireUser(ctx);
          if (isAdmin(user)) return ctx.dataSource.listCampaigns();
          return ctx.dataSource.listCampaignsForUser(user.id);
        },
        ownerCampaigns: async (_parent: unknown, _args: unknown, ctx: YogaContext) => {
          const user = requireUser(ctx);
          if (isAdmin(user)) return ctx.dataSource.listCampaigns();
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
          let user: { id: string; email: string; role: 'USER' | 'ADMIN' };
          try {
            user = await ctx.dataSource.createUser({ email, passwordHash, ...(isAdminEmail(email) ? { role: 'ADMIN' } : {}) });
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
          return { user: { id: user.id, email: user.email } };
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

        createCampaign: async (_parent: unknown, args: { name: string; startingMoney?: number | null }, ctx: YogaContext) => {
          const user = requireUser(ctx);
          const name = String(args.name ?? '').trim();
          if (!name) throw new GraphQLError('Invalid campaign name');
          if (name.length > 128) throw new GraphQLError('Invalid campaign name');

          const startingMoneyRaw = args.startingMoney;
          const startingMoney =
            startingMoneyRaw === null || startingMoneyRaw === undefined ? undefined : Number(startingMoneyRaw);
          if (startingMoney !== undefined) {
            if (!Number.isFinite(startingMoney) || !Number.isInteger(startingMoney) || startingMoney < 0) {
              throw new GraphQLError('Invalid starting money');
            }
          }

          return ctx.dataSource.createCampaign({ ownerId: user.id, name, ...(startingMoney !== undefined ? { startingMoney } : {}) });
        },

        updateCampaign: async (
          _parent: unknown,
          args: { campaignId: string; name?: string | null; startingMoney?: number | null },
          ctx: YogaContext,
        ) => {
          const user = requireUser(ctx);
          const campaignId = String(args.campaignId ?? '').trim();
          if (!campaignId) throw new GraphQLError('Campaign not found');

          const nameRaw = args.name;
          const name = nameRaw === null || nameRaw === undefined ? undefined : String(nameRaw).trim();
          if (name !== undefined) {
            if (!name) throw new GraphQLError('Invalid campaign name');
            if (name.length > 128) throw new GraphQLError('Invalid campaign name');
          }

          const startingMoneyRaw = args.startingMoney;
          const startingMoney =
            startingMoneyRaw === null || startingMoneyRaw === undefined ? undefined : Number(startingMoneyRaw);
          if (startingMoney !== undefined) {
            if (!Number.isFinite(startingMoney) || !Number.isInteger(startingMoney) || startingMoney < 0) {
              throw new GraphQLError('Invalid starting money');
            }
          }

          if (!isAdmin(user)) {
            const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId });
            if (role !== 'OWNER') throw new GraphQLError('Not authorized');
          }

          try {
            return await ctx.dataSource.updateCampaign({
              id: campaignId,
              ownerId: user.id,
              actorRole: user.role,
              ...(name !== undefined ? { name } : {}),
              ...(startingMoney !== undefined ? { startingMoney } : {}),
            });
          } catch (error) {
            if (error instanceof Error && error.message === 'CAMPAIGN_NOT_FOUND') throw new GraphQLError('Campaign not found');
            if (error instanceof Error && error.message === 'NOT_AUTHORIZED') throw new GraphQLError('Not authorized');
            throw error;
          }
        },

        deleteCampaign: async (_parent: unknown, args: { campaignId: string }, ctx: YogaContext) => {
          const user = requireUser(ctx);
          const campaignId = String(args.campaignId ?? '').trim();
          if (!campaignId) throw new GraphQLError('Campaign not found');

          if (!isAdmin(user)) {
            const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId });
            if (role !== 'OWNER') throw new GraphQLError('Not authorized');
          }

          try {
            await ctx.dataSource.deleteCampaign({ id: campaignId, ownerId: user.id, actorRole: user.role });
            return true;
          } catch (error) {
            if (error instanceof Error && error.message === 'CAMPAIGN_NOT_FOUND') throw new GraphQLError('Campaign not found');
            if (error instanceof Error && error.message === 'NOT_AUTHORIZED') throw new GraphQLError('Not authorized');
            throw error;
          }
        },

        createCharacter: async (
          _parent: unknown,
          args: {
            campaignId?: string | null;
            name: string;
            isPublic?: boolean | null;
            stats?: Partial<StatsRecord> | null;
            skills?: Array<{ name: string; level: number }> | null;
            cyberneticIds?: string[] | null;
            weaponIds?: string[] | null;
            itemIds?: string[] | null;
            vehicleIds?: string[] | null;
          },
          ctx: YogaContext,
        ) => {
          const user = requireUser(ctx);
          const campaignIdRaw = args.campaignId;
          const campaignId = campaignIdRaw === null || campaignIdRaw === undefined ? null : String(campaignIdRaw).trim();
          const campaignIdOrNull = campaignId?.length ? campaignId : null;
          const name = String(args.name ?? '').trim();
          const isPublic = args.isPublic === true;

          if (!name) throw new GraphQLError('Invalid character name');

          if (isPublic && campaignIdOrNull) {
            throw new GraphQLError('Public characters cannot belong to a campaign');
          }

          if (isPublic) {
            if (isAdmin(user)) {
              // Admins may create public archetypes.
            } else {
            const campaigns = await ctx.dataSource.listCampaignsForUser(user.id);
            let isOwnerSomewhere = false;
            for (const campaign of campaigns) {
              const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId: campaign.id });
              if (role === 'OWNER') {
                isOwnerSomewhere = true;
                break;
              }
            }
            if (!isOwnerSomewhere) throw new GraphQLError('Not authorized');
            }
          }

          if (campaignIdOrNull) {
            const campaign = await ctx.dataSource.getCampaignById(campaignIdOrNull);
            if (!campaign) throw new GraphQLError('Campaign not found');

            if (!isAdmin(user)) {
              const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId: campaignIdOrNull });
              if (!role) throw new GraphQLError('Not authorized');
            }
          }

          function parseOptionalStat(value: unknown): number | undefined {
            if (value === null || value === undefined) return undefined;
            if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return undefined;
            if (value < 0 || value > 10) return undefined;
            return value;
          }

          const statsIn = (args.stats ?? {}) as Partial<Record<keyof StatsRecord, unknown>>;
          const stats: Partial<StatsRecord> = {
            brawn: parseOptionalStat(statsIn.brawn),
            charm: parseOptionalStat(statsIn.charm),
            intelligence: parseOptionalStat(statsIn.intelligence),
            reflexes: parseOptionalStat(statsIn.reflexes),
            tech: parseOptionalStat(statsIn.tech),
            luck: parseOptionalStat(statsIn.luck),
          };
          for (const [key, value] of Object.entries(stats)) {
            if (value === undefined) continue;
            if (typeof value !== 'number') throw new GraphQLError(`Invalid stat: ${key}`);
          }

          const skillsIn = Array.isArray(args.skills) ? args.skills : [];
          const skills = skillsIn
            .map((s) => {
              const maybe = s as { name?: unknown; level?: unknown };
              const rawLevel = maybe?.level;
              const level = typeof rawLevel === 'number' ? rawLevel : Number.NaN;
              return { name: String(maybe?.name ?? '').trim(), level };
            })
            .filter((s) => s.name.length > 0);

          const seenSkillNames = new Set<string>();
          for (const skill of skills) {
            if (skill.name.length > 64) throw new GraphQLError('Invalid skill name');
            if (typeof skill.level !== 'number' || !Number.isInteger(skill.level) || skill.level < 0 || skill.level > 10) {
              throw new GraphQLError('Invalid skill level');
            }
            const normalized = skill.name.toLowerCase();
            if (seenSkillNames.has(normalized)) throw new GraphQLError('Duplicate skill');
            seenSkillNames.add(normalized);

            const canonical = PREDEFINED_SKILL_BY_LOWER.get(normalized);
            if (canonical) skill.name = canonical;
          }

          const cyberneticIds = (Array.isArray(args.cyberneticIds) ? args.cyberneticIds : []).map(String).filter(Boolean);
          const weaponIds = (Array.isArray(args.weaponIds) ? args.weaponIds : []).map(String).filter(Boolean);
          const itemIds = (Array.isArray(args.itemIds) ? args.itemIds : []).map(String).filter(Boolean);
          const vehicleIds = (Array.isArray(args.vehicleIds) ? args.vehicleIds : []).map(String).filter(Boolean);

          async function validateIds(kind: string, ids: string[], allowedIds: Set<string>) {
            for (const id of ids) {
              if (!allowedIds.has(id)) throw new GraphQLError(`Unknown ${kind}: ${id}`);
            }
          }

          if (cyberneticIds.length) {
            const allowed = new Set((await ctx.dataSource.listCybernetics()).map((c) => c.id));
            await validateIds('cybernetic', cyberneticIds, allowed);
          }
          if (weaponIds.length) {
            const allowed = new Set((await ctx.dataSource.listWeapons()).map((w) => w.id));
            await validateIds('weapon', weaponIds, allowed);
          }
          if (itemIds.length) {
            const allowed = new Set((await ctx.dataSource.listItems()).map((i) => i.id));
            await validateIds('item', itemIds, allowed);
          }
          if (vehicleIds.length) {
            const allowed = new Set((await ctx.dataSource.listVehicles()).map((v) => v.id));
            await validateIds('vehicle', vehicleIds, allowed);
          }

          const hasAnyStat = Object.values(stats).some((v) => typeof v === 'number');
          return ctx.dataSource.createCharacter({
            ownerId: user.id,
            campaignId: campaignIdOrNull,
            name,
            isPublic,
            stats: hasAnyStat ? stats : undefined,
            skills: skills.length ? skills : undefined,
            cyberneticIds: cyberneticIds.length ? cyberneticIds : undefined,
            weaponIds: weaponIds.length ? weaponIds : undefined,
            itemIds: itemIds.length ? itemIds : undefined,
            vehicleIds: vehicleIds.length ? vehicleIds : undefined,
          });
        },

        updateCharacter: async (
          _parent: unknown,
          args: {
            id: string;
            campaignId?: string | null;
            name?: string | null;
            money?: number | null;
            stats?: Partial<StatsRecord> | null;
            skills?: Array<{ name: string; level: number }> | null;
            cyberneticIds?: string[] | null;
            weaponIds?: string[] | null;
            itemIds?: string[] | null;
          },
          ctx: YogaContext,
        ) => {
          const user = requireUser(ctx);
          const id = String(args.id ?? '').trim();
          if (!id) throw new GraphQLError('Character not found');

          const campaignIdSpecified = args.campaignId !== undefined;
          const campaignIdTrimmed =
            args.campaignId === null || args.campaignId === undefined ? args.campaignId : String(args.campaignId).trim();
          const campaignIdOrNull =
            campaignIdTrimmed === undefined ? undefined : campaignIdTrimmed === null ? null : campaignIdTrimmed.length ? campaignIdTrimmed : null;

          if (campaignIdSpecified && campaignIdOrNull) {
            const campaign = await ctx.dataSource.getCampaignById(campaignIdOrNull);
            if (!campaign) throw new GraphQLError('Campaign not found');

            if (!isAdmin(user)) {
              const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId: campaignIdOrNull });
              if (!role) throw new GraphQLError('Not authorized');
            }
          }

          const nameRaw = args.name;
          const name = nameRaw === null || nameRaw === undefined ? undefined : String(nameRaw).trim();
          if (name !== undefined && !name) throw new GraphQLError('Invalid character name');

          const moneyRaw = args.money;
          const money = moneyRaw === null || moneyRaw === undefined ? undefined : moneyRaw;
          if (money !== undefined) {
            if (typeof money !== 'number' || !Number.isFinite(money) || !Number.isInteger(money) || money < 0) {
              throw new GraphQLError('Invalid money');
            }
          }

          function parseOptionalStat(value: unknown): number | undefined {
            if (value === null || value === undefined) return undefined;
            if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return undefined;
            if (value < 0 || value > 10) return undefined;
            return value;
          }

          const statsIn = (args.stats ?? {}) as Partial<Record<keyof StatsRecord, unknown>>;
          const stats: Partial<StatsRecord> = {
            brawn: parseOptionalStat(statsIn.brawn),
            charm: parseOptionalStat(statsIn.charm),
            intelligence: parseOptionalStat(statsIn.intelligence),
            reflexes: parseOptionalStat(statsIn.reflexes),
            tech: parseOptionalStat(statsIn.tech),
            luck: parseOptionalStat(statsIn.luck),
          };
          for (const [key, value] of Object.entries(stats)) {
            if (value === undefined) continue;
            if (typeof value !== 'number') throw new GraphQLError(`Invalid stat: ${key}`);
          }

          const hasAnyStat = Object.values(stats).some((v) => typeof v === 'number');

          const skillsIn = args.skills === null || args.skills === undefined ? undefined : Array.isArray(args.skills) ? args.skills : [];
          const skills = (skillsIn ?? [])
            .map((s) => {
              const maybe = s as { name?: unknown; level?: unknown };
              const rawLevel = maybe?.level;
              const level = typeof rawLevel === 'number' ? rawLevel : Number.NaN;
              return { name: String(maybe?.name ?? '').trim(), level };
            })
            .filter((s) => s.name.length > 0);

          if (skillsIn !== undefined) {
            const seenSkillNames = new Set<string>();
            for (const skill of skills) {
              if (skill.name.length > 64) throw new GraphQLError('Invalid skill name');
              if (typeof skill.level !== 'number' || !Number.isInteger(skill.level) || skill.level < 0 || skill.level > 10) {
                throw new GraphQLError('Invalid skill level');
              }
              const normalized = skill.name.toLowerCase();
              if (seenSkillNames.has(normalized)) throw new GraphQLError('Duplicate skill');
              seenSkillNames.add(normalized);

              const canonical = PREDEFINED_SKILL_BY_LOWER.get(normalized);
              if (canonical) skill.name = canonical;
            }
          }

          const cyberneticIdsIn = args.cyberneticIds === null || args.cyberneticIds === undefined ? undefined : args.cyberneticIds;
          const weaponIdsIn = args.weaponIds === null || args.weaponIds === undefined ? undefined : args.weaponIds;
          const itemIdsIn = args.itemIds === null || args.itemIds === undefined ? undefined : args.itemIds;

          const cyberneticIds = (Array.isArray(cyberneticIdsIn) ? cyberneticIdsIn : []).map(String).filter(Boolean);
          const weaponIds = (Array.isArray(weaponIdsIn) ? weaponIdsIn : []).map(String).filter(Boolean);
          const itemIds = (Array.isArray(itemIdsIn) ? itemIdsIn : []).map(String).filter(Boolean);

          async function validateIds(kind: string, ids: string[], allowedIds: Set<string>) {
            for (const id of ids) {
              if (!allowedIds.has(id)) throw new GraphQLError(`Unknown ${kind}: ${id}`);
            }
          }

          if (cyberneticIdsIn !== undefined) {
            const allowed = new Set((await ctx.dataSource.listCybernetics()).map((c) => c.id));
            await validateIds('cybernetic', cyberneticIds, allowed);
          }
          if (weaponIdsIn !== undefined) {
            const allowed = new Set((await ctx.dataSource.listWeapons()).map((w) => w.id));
            await validateIds('weapon', weaponIds, allowed);
          }
          if (itemIdsIn !== undefined) {
            const allowed = new Set((await ctx.dataSource.listItems()).map((i) => i.id));
            await validateIds('item', itemIds, allowed);
          }

          const hasAnyChange =
            campaignIdSpecified ||
            name !== undefined ||
            money !== undefined ||
            hasAnyStat ||
            skillsIn !== undefined ||
            cyberneticIdsIn !== undefined ||
            weaponIdsIn !== undefined ||
            itemIdsIn !== undefined;
          if (!hasAnyChange) throw new GraphQLError('No changes');

          try {
            return await ctx.dataSource.updateCharacter({
              id,
              ownerId: user.id,
              actorRole: user.role,
              ...(campaignIdSpecified ? { campaignId: campaignIdOrNull ?? null } : {}),
              ...(name !== undefined ? { name } : {}),
              ...(money !== undefined ? { money } : {}),
              ...(hasAnyStat ? { stats } : {}),
              ...(skillsIn !== undefined ? { skills } : {}),
              ...(cyberneticIdsIn !== undefined ? { cyberneticIds } : {}),
              ...(weaponIdsIn !== undefined ? { weaponIds } : {}),
              ...(itemIdsIn !== undefined ? { itemIds } : {}),
            });
          } catch (error) {
            if (error instanceof Error && error.message === 'CHARACTER_NOT_FOUND') throw new GraphQLError('Character not found');
            if (error instanceof Error && error.message === 'NOT_AUTHORIZED') throw new GraphQLError('Not authorized');
            if (error instanceof Error && error.message === 'CAMPAIGN_NOT_FOUND') throw new GraphQLError('Campaign not found');
            throw error;
          }
        },

        deleteCharacter: async (_parent: unknown, args: { id: string }, ctx: YogaContext) => {
          const user = requireUser(ctx);
          const id = String(args.id ?? '').trim();
          if (!id) throw new GraphQLError('Character not found');

          try {
            await ctx.dataSource.deleteCharacter({ id, ownerId: user.id, actorRole: user.role });
            return true;
          } catch (error) {
            if (error instanceof Error && error.message === 'CHARACTER_NOT_FOUND') throw new GraphQLError('Character not found');
            if (error instanceof Error && error.message === 'NOT_AUTHORIZED') throw new GraphQLError('Not authorized');
            throw error;
          }
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

          if (!isAdmin(user)) {
            const role = await ctx.dataSource.getCampaignMembershipRole({ userId: user.id, campaignId });
            if (role !== 'OWNER') throw new GraphQLError('Not authorized');
          }

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
        canEdit: (character: CharacterRecord, _args: unknown, ctx: YogaContext) => {
          const user = ctx.user;
          if (!user) return false;
          if (user.role === 'ADMIN') return true;
          return character.ownerId === user.id;
        },
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
          const visibleCharacters = isAdmin(user) ? await ctx.dataSource.listCharacters() : await ctx.dataSource.listCharactersForUser(user.id);
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
          const maybeAsyncIterable = result as unknown as { [Symbol.asyncIterator]?: unknown };
          const isAsyncIterable = typeof maybeAsyncIterable?.[Symbol.asyncIterator] === 'function';
          if (isAsyncIterable) return;

          const res = result as unknown as {
            extensions?: {
              http?: {
                headers?: Record<string, string>;
              };
            };
            [key: string]: unknown;
          };
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
