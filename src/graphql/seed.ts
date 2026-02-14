export type StatName = 'BRAWN' | 'CHARM' | 'INTELLIGENCE' | 'REFLEXES' | 'TECH' | 'LUCK';

export type StatsRecord = {
  brawn: number;
  charm: number;
  intelligence: number;
  reflexes: number;
  tech: number;
  luck: number;
};

export type SkillRecord = {
  name: string;
  level: number;
};

export type StatBonusRecord = {
  stat: StatName;
  amount: number;
};

export type SkillBonusRecord = {
  name: string;
  amount: number;
};

export type CyberneticRecord = {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  batteryLife: number;
  statBonuses?: StatBonusRecord[];
  skillBonuses?: SkillBonusRecord[];
};

export type WeaponType = 'MELEE' | 'RANGED';

export type WeaponRecord = {
  id: string;
  name: string;
  price: number;
  weight: number;
  maxRange: number;
  maxAmmoCount: number;
  type: WeaponType;
  condition: number;
  shortDescription: string;
  longDescription: string;
};

export type VehicleRecord = {
  id: string;
  name: string;
  price: number;
  shortDescription: string;
  longDescription: string;
  speed: number;
  armor: number;
};

export type ItemType = 'GENERAL' | 'CYBERDECK' | 'CONSUMABLE' | 'AMMO' | 'OTHER';

export type ItemRecord = {
  id: string;
  name: string;
  price: number;
  weight: number;
  shortDescription: string;
  longDescription: string;
  type: ItemType;
};

export type CampaignRecord = {
  id: string;
  name: string;
};

export type CharacterRecord = {
  id: string;
  name: string;
  isPublic?: boolean;
  speed?: number;
  hitPoints?: number;
  stats?: Partial<StatsRecord>;
  skills?: SkillRecord[];
  campaignId?: string;
  cyberneticIds?: string[];
  weaponIds?: string[];
  vehicleIds?: string[];
  itemIds?: string[];
};

// Minimal in-memory seed data for tests/dev.

export const campaigns: CampaignRecord[] = [
  {
    id: 'camp_1',
    name: 'Neon Rain',
  },
  {
    id: 'camp_2',
    name: 'Chrome Syndicate',
  },
  {
    id: 'camp_3',
    name: 'Synthetic Dawn',
  },
];

export const cybernetics: CyberneticRecord[] = [
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
];

export const weapons: WeaponRecord[] = [
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
];

export const vehicles: VehicleRecord[] = [
  {
    id: 'v_1',
    name: 'Street Bike',
    price: 2200,
    shortDescription: 'A loud, fast street bike.',
    longDescription: 'A stripped-down bike built for speed in tight alleys.',
    speed: 80,
    armor: 1,
  },
];

export const items: ItemRecord[] = [
  {
    id: 'i_1',
    name: 'Cyberdeck (Starter)',
    price: 1500,
    weight: 2,
    shortDescription: 'A starter-grade cyberdeck.',
    longDescription: 'A basic cyberdeck with limited RAM and disk space.',
    type: 'CYBERDECK',
  },
];

export const characters: CharacterRecord[] = [
  {
    id: 'c_1',
    name: 'Nova',
    isPublic: false,
    speed: 30,
    hitPoints: 5,
    campaignId: 'camp_1',
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
    cyberneticIds: ['cy_1'],
    weaponIds: ['w_1', 'w_2'],
    vehicleIds: ['v_1'],
    itemIds: ['i_1'],
  },
  {
    id: 'c_2',
    name: 'Street Thug',
    isPublic: true,
    speed: 30,
    hitPoints: 3,
    stats: {
      brawn: 3,
      charm: 1,
      intelligence: 1,
      reflexes: 3,
      tech: 0,
      luck: 0,
    },
    skills: [{ name: 'Intimidation', level: 2 }],
  },
  {
    id: 'c_3',
    name: 'Ghost',
    isPublic: false,
    speed: 30,
    hitPoints: 5,
    campaignId: 'camp_2',
    stats: {
      brawn: 1,
      charm: 2,
      intelligence: 7,
      reflexes: 6,
      tech: 8,
      luck: 1,
    },
    skills: [{ name: 'Hacking', level: 8 }],
  },
];
