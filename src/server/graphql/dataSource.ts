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
  role: UserRole;
};

export type UserRole = 'USER' | 'ADMIN';

export type DataSourceKind = 'inMemory' | 'prisma';

export type DataSource = {
  kind: DataSourceKind;
  getCampaignById(id: string): Promise<CampaignRecord | null>;
  listCampaigns(): Promise<CampaignRecord[]>;
  listCampaignsForUser(userId: string): Promise<CampaignRecord[]>;
  createCampaign(input: { ownerId: string; name: string; startingMoney?: number }): Promise<CampaignRecord>;
  updateCampaign(input: {
    id: string;
    ownerId: string;
    actorRole?: UserRole;
    name?: string;
    startingMoney?: number;
  }): Promise<CampaignRecord>;
  deleteCampaign(input: { id: string; ownerId: string; actorRole?: UserRole }): Promise<void>;
  listCharacters(): Promise<CharacterRecord[]>;
  listCharactersForUser(userId: string): Promise<CharacterRecord[]>;
  createCharacter(input: {
    ownerId: string;
    campaignId?: string | null;
    name: string;
    isPublic?: boolean;
    money?: number;
    stats?: Partial<StatsRecord>;
    skills?: SkillRecord[];
    cyberneticIds?: string[];
    weaponIds?: string[];
    itemIds?: string[];
    vehicleIds?: string[];
  }): Promise<CharacterRecord>;
  updateCharacter(input: {
    id: string;
    ownerId: string;
    actorRole?: UserRole;
    campaignId?: string | null;
    name?: string;
    money?: number;
    stats?: Partial<StatsRecord>;
    skills?: SkillRecord[];
    cyberneticIds?: string[];
    weaponIds?: string[];
    itemIds?: string[];
  }): Promise<CharacterRecord>;
  deleteCharacter(input: { id: string; ownerId: string; actorRole?: UserRole }): Promise<void>;
  createCybernetic(input: {
    ownerId: string;
    campaignId?: string | null;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    batteryLife: number;
  }): Promise<CyberneticRecord>;
  updateCybernetic(input: {
    id: string;
    actorId: string;
    actorRole?: UserRole;
    campaignId?: string | null;
    name?: string;
    shortDescription?: string;
    longDescription?: string;
    price?: number;
    batteryLife?: number;
  }): Promise<CyberneticRecord>;
  deleteCybernetic(input: { id: string; actorId: string; actorRole?: UserRole }): Promise<void>;
  createWeapon(input: {
    ownerId: string;
    campaignId?: string | null;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    weight: number;
    maxRange: number;
    maxAmmoCount: number;
    type: WeaponRecord['type'];
    condition: number;
  }): Promise<WeaponRecord>;
  updateWeapon(input: {
    id: string;
    actorId: string;
    actorRole?: UserRole;
    campaignId?: string | null;
    name?: string;
    shortDescription?: string;
    longDescription?: string;
    price?: number;
    weight?: number;
    maxRange?: number;
    maxAmmoCount?: number;
    type?: WeaponRecord['type'];
    condition?: number;
  }): Promise<WeaponRecord>;
  deleteWeapon(input: { id: string; actorId: string; actorRole?: UserRole }): Promise<void>;
  createItem(input: {
    ownerId: string;
    campaignId?: string | null;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    weight: number;
    type: ItemRecord['type'];
  }): Promise<ItemRecord>;
  updateItem(input: {
    id: string;
    actorId: string;
    actorRole?: UserRole;
    campaignId?: string | null;
    name?: string;
    shortDescription?: string;
    longDescription?: string;
    price?: number;
    weight?: number;
    type?: ItemRecord['type'];
  }): Promise<ItemRecord>;
  deleteItem(input: { id: string; actorId: string; actorRole?: UserRole }): Promise<void>;
  createVehicle(input: {
    ownerId: string;
    campaignId?: string | null;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    speed: number;
    armor: number;
  }): Promise<VehicleRecord>;
  updateVehicle(input: {
    id: string;
    actorId: string;
    actorRole?: UserRole;
    campaignId?: string | null;
    name?: string;
    shortDescription?: string;
    longDescription?: string;
    price?: number;
    speed?: number;
    armor?: number;
  }): Promise<VehicleRecord>;
  deleteVehicle(input: { id: string; actorId: string; actorRole?: UserRole }): Promise<void>;
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

  getUserById(id: string): Promise<Pick<UserRecord, 'id' | 'email' | 'role'> | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(input: { email: string; passwordHash: string; role?: UserRole }): Promise<Pick<UserRecord, 'id' | 'email' | 'role'>>;
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
  const campaignStore: CampaignRecord[] = campaigns.map((c) => ({ ...c, startingMoney: c.startingMoney ?? 0 }));
  const characterStore: CharacterRecord[] = characters.map((c) => ({
    ...c,
    stats: c.stats ? { ...c.stats } : undefined,
    skills: c.skills ? [...c.skills] : undefined,
    cyberneticIds: c.cyberneticIds ? [...c.cyberneticIds] : undefined,
    weaponIds: c.weaponIds ? [...c.weaponIds] : undefined,
    vehicleIds: c.vehicleIds ? [...c.vehicleIds] : undefined,
    itemIds: c.itemIds ? [...c.itemIds] : undefined,
  }));
  const cyberneticStore: CyberneticRecord[] = cybernetics.map((c) => ({
    ...c,
    statBonuses: c.statBonuses ? [...c.statBonuses] : [],
    skillBonuses: c.skillBonuses ? [...c.skillBonuses] : [],
  }));
  const weaponStore: WeaponRecord[] = weapons.map((w) => ({ ...w }));
  const itemStore: ItemRecord[] = items.map((i) => ({ ...i }));
  const vehicleStore: VehicleRecord[] = vehicles.map((v) => ({ ...v }));

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

  function canManageCatalogEntity(input: {
    actorId: string;
    actorRole?: UserRole;
    ownerId?: string;
    campaignId?: string | null;
  }): boolean {
    if (input.actorRole === 'ADMIN') return true;
    if (input.ownerId && input.ownerId === input.actorId) return true;
    if (!input.campaignId) return false;
    const role = getMembershipsByUser(input.actorId).get(input.campaignId) ?? null;
    return role === 'OWNER';
  }

  return {
    kind: 'inMemory',
    async getCampaignById(id: string) {
      return campaignStore.find((c) => c.id === id) ?? null;
    },
    async listCampaigns() {
      return campaignStore;
    },
    async listCampaignsForUser(userId: string) {
      const memberships = getMembershipsByUser(userId);
      return campaignStore.filter((c) => memberships.has(c.id));
    },
    async createCampaign(input: { ownerId: string; name: string; startingMoney?: number }) {
      const record: CampaignRecord = {
        id: `camp_${crypto.randomUUID()}`,
        name: input.name,
        startingMoney: input.startingMoney ?? 0,
      };
      campaignStore.push(record);
      await this.addUserToCampaign({ userId: input.ownerId, campaignId: record.id, role: 'OWNER' });
      return record;
    },

    async updateCampaign(input: { id: string; ownerId: string; actorRole?: UserRole; name?: string; startingMoney?: number }) {
      const index = campaignStore.findIndex((c) => c.id === input.id);
      if (index === -1) throw new Error('CAMPAIGN_NOT_FOUND');
      const existing = campaignStore[index];
      if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin) {
        const role = getMembershipsByUser(input.ownerId).get(input.id) ?? null;
        if (role !== 'OWNER') throw new Error('NOT_AUTHORIZED');
      }

      const next: CampaignRecord = {
        ...existing,
        name: input.name !== undefined ? input.name : existing.name,
        startingMoney: input.startingMoney !== undefined ? input.startingMoney : (existing.startingMoney ?? 0),
      };
      campaignStore[index] = next;
      return next;
    },

    async deleteCampaign(input: { id: string; ownerId: string; actorRole?: UserRole }) {
      const index = campaignStore.findIndex((c) => c.id === input.id);
      if (index === -1) throw new Error('CAMPAIGN_NOT_FOUND');
      const existing = campaignStore[index];
      if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin) {
        const role = getMembershipsByUser(input.ownerId).get(input.id) ?? null;
        if (role !== 'OWNER') throw new Error('NOT_AUTHORIZED');
      }

      for (const c of characterStore) {
        if (c.campaignId === input.id) c.campaignId = undefined;
      }
      for (const c of cyberneticStore) {
        if (c.campaignId === input.id) c.campaignId = undefined;
      }
      for (const w of weaponStore) {
        if (w.campaignId === input.id) w.campaignId = undefined;
      }
      for (const i of itemStore) {
        if (i.campaignId === input.id) i.campaignId = undefined;
      }
      for (const v of vehicleStore) {
        if (v.campaignId === input.id) v.campaignId = undefined;
      }

      for (const memberships of campaignMembers.values()) {
        memberships.delete(input.id);
      }

      for (let i = invites.length - 1; i >= 0; i--) {
        if (invites[i]?.campaignId === input.id) invites.splice(i, 1);
      }

      campaignStore.splice(index, 1);
    },
    async listCharacters() {
      return characterStore;
    },
    async listCharactersForUser(userId: string) {
      return characterStore.filter((c) => isPublicCharacter(c) || isOwnedByUser(c, userId));
    },

    async createCharacter(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      isPublic?: boolean;
      money?: number;
      stats?: Partial<StatsRecord>;
      skills?: SkillRecord[];
      cyberneticIds?: string[];
      weaponIds?: string[];
      itemIds?: string[];
      vehicleIds?: string[];
    }) {
      const campaignId = input.campaignId ?? null;
      const campaign = campaignId ? campaignStore.find((c) => c.id === campaignId) : null;
      if (campaignId) {
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
        isPublic: input.isPublic ?? false,
        ownerId: input.ownerId,
        campaignId: campaignId ?? undefined,
        money: input.money ?? (campaign?.startingMoney ?? 0),
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

    async updateCharacter(input: {
      id: string;
      ownerId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      money?: number;
      stats?: Partial<StatsRecord>;
      skills?: SkillRecord[];
      cyberneticIds?: string[];
      weaponIds?: string[];
      itemIds?: string[];
    }) {
      const index = characterStore.findIndex((c) => c.id === input.id);
      if (index === -1) throw new Error('CHARACTER_NOT_FOUND');

      const existing = characterStore[index];
      if (!existing) throw new Error('CHARACTER_NOT_FOUND');
      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin && existing.ownerId !== input.ownerId) throw new Error('NOT_AUTHORIZED');

      if (input.campaignId !== undefined) {
        if (existing.isPublic) throw new Error('NOT_AUTHORIZED');
        if (input.campaignId) {
          const campaign = campaigns.find((c) => c.id === input.campaignId);
          if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
        }
      }

      const nextCampaignId =
        input.campaignId === undefined ? existing.campaignId : input.campaignId === null ? undefined : input.campaignId;

      const next: CharacterRecord = {
        ...existing,
        campaignId: nextCampaignId,
        name: input.name !== undefined ? input.name : existing.name,
        money: input.money !== undefined ? input.money : (existing.money ?? 0),
        stats: {
          ...(existing.stats ?? { brawn: 0, charm: 0, intelligence: 0, reflexes: 0, tech: 0, luck: 0 }),
          ...(input.stats ?? {}),
        },
        skills: input.skills !== undefined ? input.skills : (existing.skills ?? []),
        cyberneticIds: input.cyberneticIds !== undefined ? input.cyberneticIds : (existing.cyberneticIds ?? []),
        weaponIds: input.weaponIds !== undefined ? input.weaponIds : (existing.weaponIds ?? []),
        itemIds: input.itemIds !== undefined ? input.itemIds : (existing.itemIds ?? []),
      };

      characterStore[index] = next;
      return next;
    },

    async deleteCharacter(input: { id: string; ownerId: string; actorRole?: UserRole }) {
      const index = characterStore.findIndex((c) => c.id === input.id);
      if (index === -1) throw new Error('CHARACTER_NOT_FOUND');

      const existing = characterStore[index];
      if (!existing) throw new Error('CHARACTER_NOT_FOUND');
      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin && !isOwnedByUser(existing, input.ownerId)) throw new Error('NOT_AUTHORIZED');

      characterStore.splice(index, 1);
    },
    async createCybernetic(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      batteryLife: number;
    }) {
      const campaignId = input.campaignId ?? null;
      if (campaignId && !campaignStore.find((c) => c.id === campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');

      const created: CyberneticRecord = {
        id: `cy_${crypto.randomUUID()}`,
        name: input.name,
        shortDescription: input.shortDescription,
        longDescription: input.longDescription,
        price: input.price,
        batteryLife: input.batteryLife,
        ownerId: input.ownerId,
        campaignId: campaignId ?? undefined,
        statBonuses: [],
        skillBonuses: [],
      };
      cyberneticStore.push(created);
      return created;
    },
    async updateCybernetic(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      batteryLife?: number;
    }) {
      const index = cyberneticStore.findIndex((c) => c.id === input.id);
      if (index === -1) throw new Error('CYBERNETIC_NOT_FOUND');
      const existing = cyberneticStore[index];
      if (!existing) throw new Error('CYBERNETIC_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        if (!campaignStore.find((c) => c.id === input.campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const nextCampaignId =
        input.campaignId === undefined ? existing.campaignId : input.campaignId === null ? undefined : input.campaignId;
      const next: CyberneticRecord = {
        ...existing,
        campaignId: nextCampaignId,
        name: input.name !== undefined ? input.name : existing.name,
        shortDescription: input.shortDescription !== undefined ? input.shortDescription : existing.shortDescription,
        longDescription: input.longDescription !== undefined ? input.longDescription : existing.longDescription,
        price: input.price !== undefined ? input.price : existing.price,
        batteryLife: input.batteryLife !== undefined ? input.batteryLife : existing.batteryLife,
      };
      cyberneticStore[index] = next;
      return next;
    },
    async deleteCybernetic(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const index = cyberneticStore.findIndex((c) => c.id === input.id);
      if (index === -1) throw new Error('CYBERNETIC_NOT_FOUND');
      const existing = cyberneticStore[index];
      if (!existing) throw new Error('CYBERNETIC_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      cyberneticStore.splice(index, 1);
    },
    async createWeapon(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      weight: number;
      maxRange: number;
      maxAmmoCount: number;
      type: WeaponRecord['type'];
      condition: number;
    }) {
      const campaignId = input.campaignId ?? null;
      if (campaignId && !campaignStore.find((c) => c.id === campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');

      const created: WeaponRecord = {
        id: `w_${crypto.randomUUID()}`,
        name: input.name,
        shortDescription: input.shortDescription,
        longDescription: input.longDescription,
        price: input.price,
        weight: input.weight,
        maxRange: input.maxRange,
        maxAmmoCount: input.maxAmmoCount,
        type: input.type,
        condition: input.condition,
        ownerId: input.ownerId,
        campaignId: campaignId ?? undefined,
      };
      weaponStore.push(created);
      return created;
    },
    async updateWeapon(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      weight?: number;
      maxRange?: number;
      maxAmmoCount?: number;
      type?: WeaponRecord['type'];
      condition?: number;
    }) {
      const index = weaponStore.findIndex((w) => w.id === input.id);
      if (index === -1) throw new Error('WEAPON_NOT_FOUND');
      const existing = weaponStore[index];
      if (!existing) throw new Error('WEAPON_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        if (!campaignStore.find((c) => c.id === input.campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const nextCampaignId =
        input.campaignId === undefined ? existing.campaignId : input.campaignId === null ? undefined : input.campaignId;
      const next: WeaponRecord = {
        ...existing,
        campaignId: nextCampaignId,
        name: input.name !== undefined ? input.name : existing.name,
        shortDescription: input.shortDescription !== undefined ? input.shortDescription : existing.shortDescription,
        longDescription: input.longDescription !== undefined ? input.longDescription : existing.longDescription,
        price: input.price !== undefined ? input.price : existing.price,
        weight: input.weight !== undefined ? input.weight : existing.weight,
        maxRange: input.maxRange !== undefined ? input.maxRange : existing.maxRange,
        maxAmmoCount: input.maxAmmoCount !== undefined ? input.maxAmmoCount : existing.maxAmmoCount,
        type: input.type !== undefined ? input.type : existing.type,
        condition: input.condition !== undefined ? input.condition : existing.condition,
      };
      weaponStore[index] = next;
      return next;
    },
    async deleteWeapon(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const index = weaponStore.findIndex((w) => w.id === input.id);
      if (index === -1) throw new Error('WEAPON_NOT_FOUND');
      const existing = weaponStore[index];
      if (!existing) throw new Error('WEAPON_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      weaponStore.splice(index, 1);
    },
    async createItem(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      weight: number;
      type: ItemRecord['type'];
    }) {
      const campaignId = input.campaignId ?? null;
      if (campaignId && !campaignStore.find((c) => c.id === campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');

      const created: ItemRecord = {
        id: `i_${crypto.randomUUID()}`,
        name: input.name,
        shortDescription: input.shortDescription,
        longDescription: input.longDescription,
        price: input.price,
        weight: input.weight,
        type: input.type,
        ownerId: input.ownerId,
        campaignId: campaignId ?? undefined,
      };
      itemStore.push(created);
      return created;
    },
    async updateItem(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      weight?: number;
      type?: ItemRecord['type'];
    }) {
      const index = itemStore.findIndex((i) => i.id === input.id);
      if (index === -1) throw new Error('ITEM_NOT_FOUND');
      const existing = itemStore[index];
      if (!existing) throw new Error('ITEM_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        if (!campaignStore.find((c) => c.id === input.campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const nextCampaignId =
        input.campaignId === undefined ? existing.campaignId : input.campaignId === null ? undefined : input.campaignId;
      const next: ItemRecord = {
        ...existing,
        campaignId: nextCampaignId,
        name: input.name !== undefined ? input.name : existing.name,
        shortDescription: input.shortDescription !== undefined ? input.shortDescription : existing.shortDescription,
        longDescription: input.longDescription !== undefined ? input.longDescription : existing.longDescription,
        price: input.price !== undefined ? input.price : existing.price,
        weight: input.weight !== undefined ? input.weight : existing.weight,
        type: input.type !== undefined ? input.type : existing.type,
      };
      itemStore[index] = next;
      return next;
    },
    async deleteItem(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const index = itemStore.findIndex((i) => i.id === input.id);
      if (index === -1) throw new Error('ITEM_NOT_FOUND');
      const existing = itemStore[index];
      if (!existing) throw new Error('ITEM_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      itemStore.splice(index, 1);
    },
    async createVehicle(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      speed: number;
      armor: number;
    }) {
      const campaignId = input.campaignId ?? null;
      if (campaignId && !campaignStore.find((c) => c.id === campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');

      const created: VehicleRecord = {
        id: `v_${crypto.randomUUID()}`,
        name: input.name,
        shortDescription: input.shortDescription,
        longDescription: input.longDescription,
        price: input.price,
        speed: input.speed,
        armor: input.armor,
        ownerId: input.ownerId,
        campaignId: campaignId ?? undefined,
      };
      vehicleStore.push(created);
      return created;
    },
    async updateVehicle(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      speed?: number;
      armor?: number;
    }) {
      const index = vehicleStore.findIndex((v) => v.id === input.id);
      if (index === -1) throw new Error('VEHICLE_NOT_FOUND');
      const existing = vehicleStore[index];
      if (!existing) throw new Error('VEHICLE_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        if (!campaignStore.find((c) => c.id === input.campaignId)) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const nextCampaignId =
        input.campaignId === undefined ? existing.campaignId : input.campaignId === null ? undefined : input.campaignId;
      const next: VehicleRecord = {
        ...existing,
        campaignId: nextCampaignId,
        name: input.name !== undefined ? input.name : existing.name,
        shortDescription: input.shortDescription !== undefined ? input.shortDescription : existing.shortDescription,
        longDescription: input.longDescription !== undefined ? input.longDescription : existing.longDescription,
        price: input.price !== undefined ? input.price : existing.price,
        speed: input.speed !== undefined ? input.speed : existing.speed,
        armor: input.armor !== undefined ? input.armor : existing.armor,
      };
      vehicleStore[index] = next;
      return next;
    },
    async deleteVehicle(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const index = vehicleStore.findIndex((v) => v.id === input.id);
      if (index === -1) throw new Error('VEHICLE_NOT_FOUND');
      const existing = vehicleStore[index];
      if (!existing) throw new Error('VEHICLE_NOT_FOUND');

      if (
        !canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        })
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      vehicleStore.splice(index, 1);
    },
    async listCybernetics() {
      return cyberneticStore;
    },
    async listWeapons() {
      return weaponStore;
    },
    async listItems() {
      return itemStore;
    },
    async listVehicles() {
      return vehicleStore;
    },

    async addUserToCampaign(input: { userId: string; campaignId: string; role?: 'AUTO' | 'OWNER' | 'MEMBER' }) {
      const campaign = campaignStore.find((c) => c.id === input.campaignId);
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
      const campaign = campaignStore.find((c) => c.id === input.campaignId);
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

      const campaign = campaignStore.find((c) => c.id === invite.campaignId);
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      return campaign;
    },

    async getUserById(id: string) {
      const user = users.find((u) => u.id === id);
      return user ? { id: user.id, email: user.email, role: user.role } : null;
    },
    async findUserByEmail(email: string) {
      return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
    },
    async createUser(input: { email: string; passwordHash: string; role?: UserRole }) {
      const existing = users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
      if (existing) {
        throw new Error('DUPLICATE_EMAIL');
      }

      const id = `u_${users.length + 1}`;
      const user: UserRecord = { id, email: input.email, passwordHash: input.passwordHash, role: input.role ?? 'USER' };
      users.push(user);
      return { id: user.id, email: user.email, role: user.role };
    },
  };
}

function createPrismaDataSource(): DataSource {
  const prisma = getPrismaClient();

  function mapCharacterRow(row: {
    id: string;
    name: string;
    isPublic: boolean;
    money: number;
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
      money: row.money,
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

  function mapCyberneticRow(row: {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    batteryLife: number;
    ownerId: string | null;
    campaignId: string | null;
  }): CyberneticRecord {
    return {
      id: row.id,
      name: row.name,
      shortDescription: row.shortDescription,
      longDescription: row.longDescription,
      price: row.price,
      batteryLife: row.batteryLife,
      ownerId: row.ownerId ?? undefined,
      campaignId: row.campaignId ?? undefined,
      statBonuses: [],
      skillBonuses: [],
    };
  }

  function mapWeaponRow(row: {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    weight: number;
    maxRange: number;
    maxAmmoCount: number;
    type: WeaponRecord['type'];
    condition: number;
    ownerId: string | null;
    campaignId: string | null;
  }): WeaponRecord {
    return {
      id: row.id,
      name: row.name,
      shortDescription: row.shortDescription,
      longDescription: row.longDescription,
      price: row.price,
      weight: row.weight,
      maxRange: row.maxRange,
      maxAmmoCount: row.maxAmmoCount,
      type: row.type,
      condition: row.condition,
      ownerId: row.ownerId ?? undefined,
      campaignId: row.campaignId ?? undefined,
    };
  }

  function mapItemRow(row: {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    weight: number;
    type: ItemRecord['type'];
    ownerId: string | null;
    campaignId: string | null;
  }): ItemRecord {
    return {
      id: row.id,
      name: row.name,
      shortDescription: row.shortDescription,
      longDescription: row.longDescription,
      price: row.price,
      weight: row.weight,
      type: row.type,
      ownerId: row.ownerId ?? undefined,
      campaignId: row.campaignId ?? undefined,
    };
  }

  function mapVehicleRow(row: {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    speed: number;
    armor: number;
    ownerId: string | null;
    campaignId: string | null;
  }): VehicleRecord {
    return {
      id: row.id,
      name: row.name,
      shortDescription: row.shortDescription,
      longDescription: row.longDescription,
      price: row.price,
      speed: row.speed,
      armor: row.armor,
      ownerId: row.ownerId ?? undefined,
      campaignId: row.campaignId ?? undefined,
    };
  }

  async function canManageCatalogEntity(input: {
    actorId: string;
    actorRole?: UserRole;
    ownerId: string | null;
    campaignId: string | null;
  }): Promise<boolean> {
    if (input.actorRole === 'ADMIN') return true;
    if (input.ownerId && input.ownerId === input.actorId) return true;
    if (!input.campaignId) return false;
    const membership = await prisma.campaignMembership.findUnique({
      where: { userId_campaignId: { userId: input.actorId, campaignId: input.campaignId } },
      select: { role: true },
    });
    return membership?.role === 'OWNER';
  }

  return {
    kind: 'prisma',
    async getCampaignById(id: string) {
      const row = await prisma.campaign.findUnique({ where: { id }, select: { id: true, name: true, startingMoney: true } });
      return row ?? null;
    },
    async listCampaigns() {
      return prisma.campaign.findMany({
        select: { id: true, name: true, startingMoney: true },
      });
    },
    async listCampaignsForUser(userId: string) {
      return prisma.campaign.findMany({
        where: {
          memberships: {
            some: { userId },
          },
        },
        select: { id: true, name: true, startingMoney: true },
      });
    },
    async createCampaign(input: { ownerId: string; name: string; startingMoney?: number }) {
      const row = await prisma.campaign.create({
        data: {
          name: input.name,
          startingMoney: input.startingMoney ?? 0,
          memberships: {
            create: {
              userId: input.ownerId,
              role: 'OWNER',
            },
          },
        },
        select: { id: true, name: true, startingMoney: true },
      });
      return row;
    },

    async updateCampaign(input: { id: string; ownerId: string; actorRole?: UserRole; name?: string; startingMoney?: number }) {
      const existing = await prisma.campaign.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin) {
        const membership = await prisma.campaignMembership.findUnique({
          where: { userId_campaignId: { userId: input.ownerId, campaignId: input.id } },
          select: { role: true },
        });
        if (membership?.role !== 'OWNER') throw new Error('NOT_AUTHORIZED');
      }

      return prisma.campaign.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.startingMoney !== undefined ? { startingMoney: input.startingMoney } : {}),
        },
        select: { id: true, name: true, startingMoney: true },
      });
    },

    async deleteCampaign(input: { id: string; ownerId: string; actorRole?: UserRole }) {
      const existing = await prisma.campaign.findUnique({ where: { id: input.id }, select: { id: true } });
      if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin) {
        const membership = await prisma.campaignMembership.findUnique({
          where: { userId_campaignId: { userId: input.ownerId, campaignId: input.id } },
          select: { role: true },
        });
        if (membership?.role !== 'OWNER') throw new Error('NOT_AUTHORIZED');
      }

      await prisma.$transaction(async (tx) => {
        await tx.character.updateMany({
          where: { campaignId: input.id },
          data: { campaignId: null },
        });
        await tx.campaign.delete({ where: { id: input.id } });
      });
    },
    async listCharacters() {
      const rows = await prisma.character.findMany({
        select: {
          id: true,
          name: true,
          isPublic: true,
          money: true,
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
          ],
        },
        select: {
          id: true,
          name: true,
          isPublic: true,
          money: true,
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
      isPublic?: boolean;
      money?: number;
      stats?: Partial<StatsRecord>;
      skills?: SkillRecord[];
      cyberneticIds?: string[];
      weaponIds?: string[];
      itemIds?: string[];
      vehicleIds?: string[];
    }) {
      let money = input.money;
      if (money === undefined && input.campaignId) {
        const campaign = await prisma.campaign.findUnique({
          where: { id: input.campaignId },
          select: { startingMoney: true },
        });
        money = campaign?.startingMoney ?? 0;
      }

      const stats = input.stats ?? {};
      const row = await prisma.character.create({
        data: {
          name: input.name,
          isPublic: input.isPublic ?? false,
          money: money ?? 0,
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
          money: true,
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

    async updateCharacter(input: {
      id: string;
      ownerId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      money?: number;
      stats?: Partial<StatsRecord>;
      skills?: SkillRecord[];
      cyberneticIds?: string[];
      weaponIds?: string[];
      itemIds?: string[];
    }) {
      const existing = await prisma.character.findUnique({
        where: { id: input.id },
        select: { ownerId: true, isPublic: true },
      });
      if (!existing) throw new Error('CHARACTER_NOT_FOUND');
      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin && existing.ownerId !== input.ownerId) throw new Error('NOT_AUTHORIZED');
      if (existing.isPublic && input.campaignId !== undefined) throw new Error('NOT_AUTHORIZED');

      const stats = input.stats ?? {};
      const row = await prisma.$transaction(async (tx) => {
        if (input.skills !== undefined) {
          await tx.characterSkill.deleteMany({ where: { characterId: input.id } });
          if (input.skills.length > 0) {
            await tx.characterSkill.createMany({
              data: input.skills.map((skill) => ({
                characterId: input.id,
                name: skill.name,
                level: skill.level,
              })),
            });
          }
        }

        if (input.cyberneticIds !== undefined) {
          await tx.characterCybernetic.deleteMany({ where: { characterId: input.id } });
          if (input.cyberneticIds.length > 0) {
            await tx.characterCybernetic.createMany({
              data: input.cyberneticIds.map((cyberneticId) => ({ characterId: input.id, cyberneticId })),
            });
          }
        }

        if (input.weaponIds !== undefined) {
          await tx.characterWeapon.deleteMany({ where: { characterId: input.id } });
          if (input.weaponIds.length > 0) {
            await tx.characterWeapon.createMany({
              data: input.weaponIds.map((weaponId) => ({ characterId: input.id, weaponId })),
            });
          }
        }

        if (input.itemIds !== undefined) {
          await tx.characterItem.deleteMany({ where: { characterId: input.id } });
          if (input.itemIds.length > 0) {
            await tx.characterItem.createMany({
              data: input.itemIds.map((itemId) => ({ characterId: input.id, itemId })),
            });
          }
        }

        return tx.character.update({
          where: { id: input.id },
          data: {
            ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.money !== undefined ? { money: input.money } : {}),
            ...(stats.brawn !== undefined ? { brawn: stats.brawn } : {}),
            ...(stats.charm !== undefined ? { charm: stats.charm } : {}),
            ...(stats.intelligence !== undefined ? { intelligence: stats.intelligence } : {}),
            ...(stats.reflexes !== undefined ? { reflexes: stats.reflexes } : {}),
            ...(stats.tech !== undefined ? { tech: stats.tech } : {}),
            ...(stats.luck !== undefined ? { luck: stats.luck } : {}),
          },
          select: {
            id: true,
            name: true,
            isPublic: true,
            money: true,
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
      });

      return mapCharacterRow(row);
    },

    async deleteCharacter(input: { id: string; ownerId: string; actorRole?: UserRole }) {
      const existing = await prisma.character.findUnique({ where: { id: input.id }, select: { ownerId: true } });
      if (!existing) throw new Error('CHARACTER_NOT_FOUND');
      const isAdmin = input.actorRole === 'ADMIN';
      if (!isAdmin && existing.ownerId !== input.ownerId) throw new Error('NOT_AUTHORIZED');

      await prisma.$transaction(async (tx) => {
        await tx.characterSkill.deleteMany({ where: { characterId: input.id } });
        await tx.characterCybernetic.deleteMany({ where: { characterId: input.id } });
        await tx.characterWeapon.deleteMany({ where: { characterId: input.id } });
        await tx.characterItem.deleteMany({ where: { characterId: input.id } });
        await tx.characterVehicle.deleteMany({ where: { characterId: input.id } });
        await tx.character.delete({ where: { id: input.id } });
      });
    },
    async createCybernetic(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      batteryLife: number;
    }) {
      const row = await prisma.cybernetic.create({
        data: {
          name: input.name,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          price: input.price,
          batteryLife: input.batteryLife,
          ownerId: input.ownerId,
          campaignId: input.campaignId ?? null,
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          batteryLife: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapCyberneticRow(row);
    },
    async updateCybernetic(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      batteryLife?: number;
    }) {
      const existing = await prisma.cybernetic.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('CYBERNETIC_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true } });
        if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const row = await prisma.cybernetic.update({
        where: { id: input.id },
        data: {
          ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
          ...(input.longDescription !== undefined ? { longDescription: input.longDescription } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.batteryLife !== undefined ? { batteryLife: input.batteryLife } : {}),
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          batteryLife: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapCyberneticRow(row);
    },
    async deleteCybernetic(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const existing = await prisma.cybernetic.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('CYBERNETIC_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }
      await prisma.cybernetic.delete({ where: { id: input.id } });
    },
    async createWeapon(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      weight: number;
      maxRange: number;
      maxAmmoCount: number;
      type: WeaponRecord['type'];
      condition: number;
    }) {
      const row = await prisma.weapon.create({
        data: {
          name: input.name,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          price: input.price,
          weight: input.weight,
          maxRange: input.maxRange,
          maxAmmoCount: input.maxAmmoCount,
          type: input.type,
          condition: input.condition,
          ownerId: input.ownerId,
          campaignId: input.campaignId ?? null,
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          weight: true,
          maxRange: true,
          maxAmmoCount: true,
          type: true,
          condition: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapWeaponRow(row);
    },
    async updateWeapon(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      weight?: number;
      maxRange?: number;
      maxAmmoCount?: number;
      type?: WeaponRecord['type'];
      condition?: number;
    }) {
      const existing = await prisma.weapon.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('WEAPON_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true } });
        if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const row = await prisma.weapon.update({
        where: { id: input.id },
        data: {
          ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
          ...(input.longDescription !== undefined ? { longDescription: input.longDescription } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.weight !== undefined ? { weight: input.weight } : {}),
          ...(input.maxRange !== undefined ? { maxRange: input.maxRange } : {}),
          ...(input.maxAmmoCount !== undefined ? { maxAmmoCount: input.maxAmmoCount } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.condition !== undefined ? { condition: input.condition } : {}),
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          weight: true,
          maxRange: true,
          maxAmmoCount: true,
          type: true,
          condition: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapWeaponRow(row);
    },
    async deleteWeapon(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const existing = await prisma.weapon.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('WEAPON_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }
      await prisma.weapon.delete({ where: { id: input.id } });
    },
    async createItem(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      weight: number;
      type: ItemRecord['type'];
    }) {
      const row = await prisma.item.create({
        data: {
          name: input.name,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          price: input.price,
          weight: input.weight,
          type: input.type,
          ownerId: input.ownerId,
          campaignId: input.campaignId ?? null,
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          weight: true,
          type: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapItemRow(row);
    },
    async updateItem(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      weight?: number;
      type?: ItemRecord['type'];
    }) {
      const existing = await prisma.item.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('ITEM_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true } });
        if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const row = await prisma.item.update({
        where: { id: input.id },
        data: {
          ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
          ...(input.longDescription !== undefined ? { longDescription: input.longDescription } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.weight !== undefined ? { weight: input.weight } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          weight: true,
          type: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapItemRow(row);
    },
    async deleteItem(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const existing = await prisma.item.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('ITEM_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }
      await prisma.item.delete({ where: { id: input.id } });
    },
    async createVehicle(input: {
      ownerId: string;
      campaignId?: string | null;
      name: string;
      shortDescription: string;
      longDescription: string;
      price: number;
      speed: number;
      armor: number;
    }) {
      const row = await prisma.vehicle.create({
        data: {
          name: input.name,
          shortDescription: input.shortDescription,
          longDescription: input.longDescription,
          price: input.price,
          speed: input.speed,
          armor: input.armor,
          ownerId: input.ownerId,
          campaignId: input.campaignId ?? null,
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          speed: true,
          armor: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapVehicleRow(row);
    },
    async updateVehicle(input: {
      id: string;
      actorId: string;
      actorRole?: UserRole;
      campaignId?: string | null;
      name?: string;
      shortDescription?: string;
      longDescription?: string;
      price?: number;
      speed?: number;
      armor?: number;
    }) {
      const existing = await prisma.vehicle.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('VEHICLE_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }

      if (input.campaignId !== undefined && input.campaignId !== null) {
        const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true } });
        if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      }

      const row = await prisma.vehicle.update({
        where: { id: input.id },
        data: {
          ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
          ...(input.longDescription !== undefined ? { longDescription: input.longDescription } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.speed !== undefined ? { speed: input.speed } : {}),
          ...(input.armor !== undefined ? { armor: input.armor } : {}),
        },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          speed: true,
          armor: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return mapVehicleRow(row);
    },
    async deleteVehicle(input: { id: string; actorId: string; actorRole?: UserRole }) {
      const existing = await prisma.vehicle.findUnique({
        where: { id: input.id },
        select: { ownerId: true, campaignId: true },
      });
      if (!existing) throw new Error('VEHICLE_NOT_FOUND');
      if (
        !(await canManageCatalogEntity({
          actorId: input.actorId,
          actorRole: input.actorRole,
          ownerId: existing.ownerId,
          campaignId: existing.campaignId,
        }))
      ) {
        throw new Error('NOT_AUTHORIZED');
      }
      await prisma.vehicle.delete({ where: { id: input.id } });
    },
    async listCybernetics() {
      const rows = await prisma.cybernetic.findMany({
        select: {
          id: true,
          name: true,
          shortDescription: true,
          longDescription: true,
          price: true,
          batteryLife: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return rows.map(mapCyberneticRow);
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
          ownerId: true,
          campaignId: true,
        },
      });
      return rows.map(mapWeaponRow);
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
          ownerId: true,
          campaignId: true,
        },
      });
      return rows.map(mapItemRow);
    },
    async listVehicles() {
      const rows = await prisma.vehicle.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          shortDescription: true,
          longDescription: true,
          speed: true,
          armor: true,
          ownerId: true,
          campaignId: true,
        },
      });
      return rows.map(mapVehicleRow);
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
        select: { id: true, email: true, role: true },
      });
      return row ? { id: row.id, email: row.email, role: row.role } : null;
    },
    async findUserByEmail(email: string) {
      const row = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, passwordHash: true, role: true },
      });
      return row ?? null;
    },
    async createUser(input: { email: string; passwordHash: string; role?: UserRole }) {
      const row = await prisma.user.create({
        data: { email: input.email, passwordHash: input.passwordHash, ...(input.role ? { role: input.role } : {}) },
        select: { id: true, email: true, role: true },
      });
      return { id: row.id, email: row.email, role: row.role };
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
