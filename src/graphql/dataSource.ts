import { getPrismaClient } from '../db/prisma';
import type {
  CampaignRecord,
  CharacterRecord,
  CyberneticRecord,
  ItemRecord,
  SkillRecord,
  StatsRecord,
  VehicleRecord,
  WeaponRecord,
} from './seed';
import { campaigns, characters, cybernetics, items, vehicles, weapons } from './seed';
import crypto from 'node:crypto';

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
};

export type DataSourceKind = 'inMemory' | 'prisma';

export type DataSource = {
  kind: DataSourceKind;
  getCampaignById(id: string): Promise<CampaignRecord | null>;
  listCampaigns(): Promise<CampaignRecord[]>;
  listCampaignsForUser(userId: string): Promise<CampaignRecord[]>;
  listCharacters(): Promise<CharacterRecord[]>;
  listCharactersForUser(userId: string): Promise<CharacterRecord[]>;
  createCharacter(input: {
    ownerId: string;
    campaignId?: string | null;
    name: string;
    stats?: Partial<StatsRecord>;
    skills?: SkillRecord[];
    cyberneticIds?: string[];
    weaponIds?: string[];
    itemIds?: string[];
    vehicleIds?: string[];
  }): Promise<CharacterRecord>;
  listCybernetics(): Promise<CyberneticRecord[]>;
  listWeapons(): Promise<WeaponRecord[]>;
  listItems(): Promise<ItemRecord[]>;
  listVehicles(): Promise<VehicleRecord[]>;

  addUserToCampaign(input: {
    userId: string;
    campaignId: string;
    role?: 'AUTO' | 'OWNER' | 'MEMBER';
  }): Promise<void>;

  getCampaignMembershipRole(input: { userId: string; campaignId: string }): Promise<'OWNER' | 'MEMBER' | null>;

  createCampaignInvite(input: { campaignId: string; email: string; ttlMs: number }): Promise<{ token: string; expiresAt: string }>;
  acceptCampaignInvite(input: {
    token: string;
    userId: string;
    userEmail: string;
    nowMs?: number;
  }): Promise<CampaignRecord>;

  getUserById(id: string): Promise<Pick<UserRecord, 'id' | 'email'> | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(input: { email: string; passwordHash: string }): Promise<Pick<UserRecord, 'id' | 'email'>>;
};

type InMemoryCampaignInvite = {
  id: string;
  token: string;
  email: string;
  campaignId: string;
  expiresAtMs: number;
  acceptedAtMs: number | null;
  acceptedByUserId: string | null;
  createdAtMs: number;
};

function generateInviteToken(): string {
  // URL-safe token.
  return crypto.randomBytes(24).toString('base64url');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createInMemoryDataSource(): DataSource {
  const users: UserRecord[] = [];
  const campaignMembers = new Map<string, Map<string, 'OWNER' | 'MEMBER'>>();
  const invites: InMemoryCampaignInvite[] = [];
  const characterStore: CharacterRecord[] = characters.map((c) => ({
    ...c,
    stats: c.stats ? { ...c.stats } : undefined,
    skills: c.skills ? [...c.skills] : undefined,
    cyberneticIds: c.cyberneticIds ? [...c.cyberneticIds] : undefined,
    weaponIds: c.weaponIds ? [...c.weaponIds] : undefined,
    vehicleIds: c.vehicleIds ? [...c.vehicleIds] : undefined,
    itemIds: c.itemIds ? [...c.itemIds] : undefined,
  }));

  function getMembershipsByUser(userId: string): Map<string, 'OWNER' | 'MEMBER'> {
    const existing = campaignMembers.get(userId);
    if (existing) return existing;
    const created = new Map<string, 'OWNER' | 'MEMBER'>();
    campaignMembers.set(userId, created);
    return created;
  }

  function anyOwnerExists(campaignId: string): boolean {
    for (const memberships of campaignMembers.values()) {
      if (memberships.get(campaignId) === 'OWNER') return true;
    }
    return false;
  }

  function isPublicCharacter(character: CharacterRecord): boolean {
    return character.isPublic === true;
  }

  function isOwnedByUser(character: CharacterRecord, userId: string): boolean {
    return character.ownerId === userId;
  }

  function isCharacterInMemberCampaign(character: CharacterRecord, userId: string): boolean {
    if (!character.campaignId) return false;
    return getMembershipsByUser(userId).has(character.campaignId);
  }

  return {
    kind: 'inMemory',
    async getCampaignById(id: string) {
      return campaigns.find((c) => c.id === id) ?? null;
    },
    async listCampaigns() {
      return campaigns;
    },
    async listCampaignsForUser(userId: string) {
      const memberships = getMembershipsByUser(userId);
      return campaigns.filter((c) => memberships.has(c.id));
    },
    async listCharacters() {
      return characterStore;
    },
    async listCharactersForUser(userId: string) {
      return characterStore.filter((c) => isPublicCharacter(c) || isOwnedByUser(c, userId) || isCharacterInMemberCampaign(c, userId));
    },

    async createCharacter(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      stats?: Partial<StatsRecord>;
      skills?: SkillRecord[];
      cyberneticIds?: string[];
      weaponIds?: string[];
      itemIds?: string[];
      vehicleIds?: string[];
    }) {
      const campaignId = input.campaignId ?? null;
      if (campaignId) {
        const campaign = campaigns.find((c) => c.id === campaignId);
        if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const s = input.stats ?? {};
      const stats: StatsRecord = {
        brawn: s.brawn ?? 0,
        charm: s.charm ?? 0,
        intelligence: s.intelligence ?? 0,
        reflexes: s.reflexes ?? 0,
        tech: s.tech ?? 0,
        luck: s.luck ?? 0,
      };

      const character: CharacterRecord = {
        id: `c_${crypto.randomUUID()}`,
        name: input.name,
        isPublic: false,
        ownerId: input.ownerId,
        campaignId: campaignId ?? undefined,
        speed: 30,
        hitPoints: 5,
        stats,
        skills: input.skills ?? [],
        cyberneticIds: input.cyberneticIds ?? [],
        weaponIds: input.weaponIds ?? [],
        itemIds: input.itemIds ?? [],
        vehicleIds: input.vehicleIds ?? [],
      };

      characterStore.push(character);
      return character;
    },
    async listCybernetics() {
      return cybernetics;
    },
    async listWeapons() {
      return weapons;
    },
    async listItems() {
      return items;
    },
    async listVehicles() {
      return vehicles;
    },

    async addUserToCampaign(input: { userId: string; campaignId: string; role?: 'AUTO' | 'OWNER' | 'MEMBER' }) {
      const campaign = campaigns.find((c) => c.id === input.campaignId);
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

      const memberships = getMembershipsByUser(input.userId);
      const desiredRole =
        input.role === 'OWNER' || input.role === 'MEMBER'
          ? input.role
          : anyOwnerExists(input.campaignId)
            ? 'MEMBER'
            : 'OWNER';

      // Only upgrade; never downgrade.
      const existing = memberships.get(input.campaignId);
      if (existing === 'OWNER') return;
      memberships.set(input.campaignId, desiredRole);
    },

    async getCampaignMembershipRole(input: { userId: string; campaignId: string }) {
      const memberships = getMembershipsByUser(input.userId);
      return memberships.get(input.campaignId) ?? null;
    },

    async createCampaignInvite(input: { campaignId: string; email: string; ttlMs: number }) {
      const campaign = campaigns.find((c) => c.id === input.campaignId);
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

      const nowMs = Date.now();
      const invite: InMemoryCampaignInvite = {
        id: `inv_${crypto.randomUUID()}`,
        token: generateInviteToken(),
        email: normalizeEmail(input.email),
        campaignId: input.campaignId,
        expiresAtMs: nowMs + input.ttlMs,
        acceptedAtMs: null,
        acceptedByUserId: null,
        createdAtMs: nowMs,
      };
      invites.push(invite);
      return { token: invite.token, expiresAt: new Date(invite.expiresAtMs).toISOString() };
    },

    async acceptCampaignInvite(input: { token: string; userId: string; userEmail: string; nowMs?: number }) {
      const invite = invites.find((i) => i.token === input.token);
      if (!invite) throw new Error('INVITE_NOT_FOUND');

      if (invite.acceptedAtMs) throw new Error('INVITE_ALREADY_USED');

      const nowMs = input.nowMs ?? Date.now();
      if (nowMs > invite.expiresAtMs) throw new Error('INVITE_EXPIRED');

      if (normalizeEmail(input.userEmail) !== invite.email) throw new Error('INVITE_EMAIL_MISMATCH');

      await this.addUserToCampaign({ userId: input.userId, campaignId: invite.campaignId, role: 'MEMBER' });
      invite.acceptedAtMs = nowMs;
      invite.acceptedByUserId = input.userId;

      const campaign = campaigns.find((c) => c.id === invite.campaignId);
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      return campaign;
    },

    async getUserById(id: string) {
      const user = users.find((u) => u.id === id);
      return user ? { id: user.id, email: user.email } : null;
    },
    async findUserByEmail(email: string) {
      return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
    },
    async createUser(input: { email: string; passwordHash: string }) {
      const existing = users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
      if (existing) {
        throw new Error('DUPLICATE_EMAIL');
      }

      const id = `u_${users.length + 1}`;
      const user: UserRecord = { id, email: input.email, passwordHash: input.passwordHash };
      users.push(user);
      return { id: user.id, email: user.email };
    },
  };
}

function createPrismaDataSource(): DataSource {
  const prisma = getPrismaClient();

  function mapCharacterRow(row: {
    id: string;
    name: string;
    isPublic: boolean;
    speed: number;
    hitPoints: number;
    brawn: number;
    charm: number;
    intelligence: number;
    reflexes: number;
    tech: number;
    luck: number;
    ownerId: string | null;
    campaignId: string | null;
    skills: Array<{ name: string; level: number }>;
    cybernetics: Array<{ cyberneticId: string }>;
    weapons: Array<{ weaponId: string }>;
    items: Array<{ itemId: string }>;
    vehicles: Array<{ vehicleId: string }>;
  }): CharacterRecord {
    return {
      id: row.id,
      name: row.name,
      isPublic: row.isPublic,
      speed: row.speed,
      hitPoints: row.hitPoints,
      ownerId: row.ownerId ?? undefined,
      campaignId: row.campaignId ?? undefined,
      stats: {
        brawn: row.brawn,
        charm: row.charm,
        intelligence: row.intelligence,
        reflexes: row.reflexes,
        tech: row.tech,
        luck: row.luck,
      },
      skills: row.skills,
      cyberneticIds: row.cybernetics.map((c) => c.cyberneticId),
      weaponIds: row.weapons.map((w) => w.weaponId),
      itemIds: row.items.map((i) => i.itemId),
      vehicleIds: row.vehicles.map((v) => v.vehicleId),
    };
  }

  return {
    kind: 'prisma',
    async getCampaignById(id: string) {
      const row = await prisma.campaign.findUnique({ where: { id }, select: { id: true, name: true } });
      return row ?? null;
    },
    async listCampaigns() {
      const rows = await prisma.campaign.findMany({
        select: { id: true, name: true },
      });
      return rows;
    },
    async listCampaignsForUser(userId: string) {
      const rows = await prisma.campaign.findMany({
        where: {
          memberships: {
            some: { userId },
          },
        },
        select: { id: true, name: true },
      });
      return rows;
    },
    async listCharacters() {
      const rows = await prisma.character.findMany({
        select: {
          id: true,
          name: true,
          isPublic: true,
          speed: true,
          hitPoints: true,
          brawn: true,
          charm: true,
          intelligence: true,
          reflexes: true,
          tech: true,
          luck: true,
          ownerId: true,
          campaignId: true,
          skills: { select: { name: true, level: true } },
          cybernetics: { select: { cyberneticId: true } },
          weapons: { select: { weaponId: true } },
          items: { select: { itemId: true } },
          vehicles: { select: { vehicleId: true } },
        },
      });

      return rows.map(mapCharacterRow);
    },
    async listCharactersForUser(userId: string) {
      const rows = await prisma.character.findMany({
        where: {
          OR: [
            { isPublic: true },
            { ownerId: userId },
            {
              campaign: {
                memberships: {
                  some: { userId },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          isPublic: true,
          speed: true,
          hitPoints: true,
          brawn: true,
          charm: true,
          intelligence: true,
          reflexes: true,
          tech: true,
          luck: true,
          ownerId: true,
          campaignId: true,
          skills: { select: { name: true, level: true } },
          cybernetics: { select: { cyberneticId: true } },
          weapons: { select: { weaponId: true } },
          items: { select: { itemId: true } },
          vehicles: { select: { vehicleId: true } },
        },
      });

      return rows.map(mapCharacterRow);
    },

    async createCharacter(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      stats?: Partial<StatsRecord>;
      skills?: SkillRecord[];
      cyberneticIds?: string[];
      weaponIds?: string[];
      itemIds?: string[];
      vehicleIds?: string[];
    }) {
      const stats = input.stats ?? {};
      const row = await prisma.character.create({
        data: {
          name: input.name,
          isPublic: false,
          ownerId: input.ownerId,
          campaignId: input.campaignId ?? null,
          ...(stats.brawn !== undefined ? { brawn: stats.brawn } : {}),
          ...(stats.charm !== undefined ? { charm: stats.charm } : {}),
          ...(stats.intelligence !== undefined ? { intelligence: stats.intelligence } : {}),
          ...(stats.reflexes !== undefined ? { reflexes: stats.reflexes } : {}),
          ...(stats.tech !== undefined ? { tech: stats.tech } : {}),
          ...(stats.luck !== undefined ? { luck: stats.luck } : {}),

          ...(input.skills?.length
            ? {
                skills: {
                  create: input.skills.map((skill) => ({
                    name: skill.name,
                    level: skill.level,
                  })),
                },
              }
            : {}),
          ...(input.cyberneticIds?.length
            ? { cybernetics: { create: input.cyberneticIds.map((cyberneticId) => ({ cyberneticId })) } }
            : {}),
          ...(input.weaponIds?.length ? { weapons: { create: input.weaponIds.map((weaponId) => ({ weaponId })) } } : {}),
          ...(input.itemIds?.length ? { items: { create: input.itemIds.map((itemId) => ({ itemId })) } } : {}),
          ...(input.vehicleIds?.length
            ? { vehicles: { create: input.vehicleIds.map((vehicleId) => ({ vehicleId })) } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          isPublic: true,
          speed: true,
          hitPoints: true,
          brawn: true,
          charm: true,
          intelligence: true,
          reflexes: true,
          tech: true,
          luck: true,
          ownerId: true,
          campaignId: true,
          skills: { select: { name: true, level: true } },
          cybernetics: { select: { cyberneticId: true } },
          weapons: { select: { weaponId: true } },
          items: { select: { itemId: true } },
          vehicles: { select: { vehicleId: true } },
        },
      });

      return mapCharacterRow(row);
    },
    async listCybernetics() {
      return prisma.cybernetic.findMany({
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          batteryLife: true,
        },
      });
    },
    async listWeapons() {
      const rows = await prisma.weapon.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          weight: true,
          maxRange: true,
          maxAmmoCount: true,
          type: true,
          condition: true,
          shortDescription: true,
          longDescription: true,
        },
      });
      return rows.map((row) => ({
        ...row,
        type: row.type,
      }));
    },
    async listItems() {
      const rows = await prisma.item.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          weight: true,
          type: true,
          shortDescription: true,
          longDescription: true,
        },
      });
      return rows.map((row) => ({
        ...row,
        type: row.type,
      }));
    },
    async listVehicles() {
      return prisma.vehicle.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          shortDescription: true,
          longDescription: true,
          speed: true,
          armor: true,
        },
      });
    },

    async addUserToCampaign(input: { userId: string; campaignId: string; role?: 'AUTO' | 'OWNER' | 'MEMBER' }) {
      await prisma.$transaction(async (tx) => {
        const ownerCount = await tx.campaignMembership.count({
          where: { campaignId: input.campaignId, role: 'OWNER' },
        });

        const desiredRole =
          input.role === 'OWNER' || input.role === 'MEMBER'
            ? input.role
            : ownerCount > 0
              ? 'MEMBER'
              : 'OWNER';

        await tx.campaignMembership.upsert({
          where: { userId_campaignId: { userId: input.userId, campaignId: input.campaignId } },
          update: desiredRole === 'OWNER' ? { role: 'OWNER' } : {},
          create: { userId: input.userId, campaignId: input.campaignId, role: desiredRole },
        });
      });
    },

    async getCampaignMembershipRole(input: { userId: string; campaignId: string }) {
      const row = await prisma.campaignMembership.findUnique({
        where: { userId_campaignId: { userId: input.userId, campaignId: input.campaignId } },
        select: { role: true },
      });
      return row?.role ?? null;
    },

    async createCampaignInvite(input: { campaignId: string; email: string; ttlMs: number }) {
      const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true } });
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

      const token = generateInviteToken();
      const expiresAt = new Date(Date.now() + input.ttlMs);

      await prisma.campaignInvite.create({
        data: {
          token,
          email: normalizeEmail(input.email),
          campaignId: input.campaignId,
          expiresAt,
        },
        select: { id: true },
      });

      return { token, expiresAt: expiresAt.toISOString() };
    },

    async acceptCampaignInvite(input: { token: string; userId: string; userEmail: string; nowMs?: number }) {
      const invite = await prisma.campaignInvite.findUnique({
        where: { token: input.token },
        select: {
          token: true,
          email: true,
          campaignId: true,
          expiresAt: true,
          acceptedAt: true,
        },
      });

      if (!invite) throw new Error('INVITE_NOT_FOUND');
      if (invite.acceptedAt) throw new Error('INVITE_ALREADY_USED');

      const nowMs = input.nowMs ?? Date.now();
      if (nowMs > invite.expiresAt.getTime()) throw new Error('INVITE_EXPIRED');

      if (normalizeEmail(input.userEmail) !== normalizeEmail(invite.email)) throw new Error('INVITE_EMAIL_MISMATCH');

      await prisma.$transaction(async (tx) => {
        await tx.campaignMembership.upsert({
          where: { userId_campaignId: { userId: input.userId, campaignId: invite.campaignId } },
          update: {},
          create: { userId: input.userId, campaignId: invite.campaignId, role: 'MEMBER' },
        });

        await tx.campaignInvite.update({
          where: { token: input.token },
          data: {
            acceptedAt: new Date(nowMs),
            acceptedByUserId: input.userId,
          },
          select: { id: true },
        });
      });

      const campaign = await prisma.campaign.findUnique({ where: { id: invite.campaignId }, select: { id: true, name: true } });
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      return campaign;
    },

    async getUserById(id: string) {
      const row = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });
      return row ?? null;
    },
    async findUserByEmail(email: string) {
      const row = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, passwordHash: true },
      });
      return row ?? null;
    },
    async createUser(input: { email: string; passwordHash: string }) {
      const row = await prisma.user.create({
        data: { email: input.email, passwordHash: input.passwordHash },
        select: { id: true, email: true },
      });
      return row;
    },
  };
}

export function createDataSource(): DataSource {
  const override = process.env.CYBERDALLAS_DATA_SOURCE;
  if (override === 'inMemory') {
    return createInMemoryDataSource();
  }
  if (override === 'prisma') {
    return createPrismaDataSource();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return createInMemoryDataSource();
  }
  return createPrismaDataSource();
}
