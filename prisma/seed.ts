import { PrismaClient, ItemType, WeaponType } from '@prisma/client';

import {
  campaigns,
  characters,
  cybernetics,
  items,
  vehicles,
  weapons,
} from '../src/graphql/seed';

const prisma = new PrismaClient();

async function main() {
  for (const campaign of campaigns) {
    await prisma.campaign.upsert({
      where: { id: campaign.id },
      update: { name: campaign.name },
      create: { id: campaign.id, name: campaign.name },
    });
  }

  for (const cybernetic of cybernetics) {
    await prisma.cybernetic.upsert({
      where: { id: cybernetic.id },
      update: {
        name: cybernetic.name,
        shortDescription: cybernetic.shortDescription,
        longDescription: cybernetic.longDescription,
        price: cybernetic.price,
        batteryLife: cybernetic.batteryLife,
      },
      create: {
        id: cybernetic.id,
        name: cybernetic.name,
        shortDescription: cybernetic.shortDescription,
        longDescription: cybernetic.longDescription,
        price: cybernetic.price,
        batteryLife: cybernetic.batteryLife,
      },
    });
  }

  for (const weapon of weapons) {
    await prisma.weapon.upsert({
      where: { id: weapon.id },
      update: {
        name: weapon.name,
        price: weapon.price,
        weight: weapon.weight,
        maxRange: weapon.maxRange,
        maxAmmoCount: weapon.maxAmmoCount,
        type: weapon.type === 'RANGED' ? WeaponType.RANGED : WeaponType.MELEE,
        condition: weapon.condition,
        shortDescription: weapon.shortDescription,
        longDescription: weapon.longDescription,
      },
      create: {
        id: weapon.id,
        name: weapon.name,
        price: weapon.price,
        weight: weapon.weight,
        maxRange: weapon.maxRange,
        maxAmmoCount: weapon.maxAmmoCount,
        type: weapon.type === 'RANGED' ? WeaponType.RANGED : WeaponType.MELEE,
        condition: weapon.condition,
        shortDescription: weapon.shortDescription,
        longDescription: weapon.longDescription,
      },
    });
  }

  for (const item of items) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        price: item.price,
        weight: item.weight,
        shortDescription: item.shortDescription,
        longDescription: item.longDescription,
        type: ItemType[item.type],
      },
      create: {
        id: item.id,
        name: item.name,
        price: item.price,
        weight: item.weight,
        shortDescription: item.shortDescription,
        longDescription: item.longDescription,
        type: ItemType[item.type],
      },
    });
  }

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: vehicle.id },
      update: {
        name: vehicle.name,
        price: vehicle.price,
        shortDescription: vehicle.shortDescription,
        longDescription: vehicle.longDescription,
        speed: vehicle.speed,
        armor: vehicle.armor,
      },
      create: {
        id: vehicle.id,
        name: vehicle.name,
        price: vehicle.price,
        shortDescription: vehicle.shortDescription,
        longDescription: vehicle.longDescription,
        speed: vehicle.speed,
        armor: vehicle.armor,
      },
    });
  }

  for (const character of characters) {
    const stats = character.stats ?? {};

    await prisma.character.upsert({
      where: { id: character.id },
      update: {
        name: character.name,
        isPublic: character.isPublic ?? false,
        speed: character.speed ?? 30,
        hitPoints: character.hitPoints ?? 5,
        brawn: stats.brawn ?? 0,
        charm: stats.charm ?? 0,
        intelligence: stats.intelligence ?? 0,
        reflexes: stats.reflexes ?? 0,
        tech: stats.tech ?? 0,
        luck: stats.luck ?? 0,
        campaignId: character.campaignId ?? null,
      },
      create: {
        id: character.id,
        name: character.name,
        isPublic: character.isPublic ?? false,
        speed: character.speed ?? 30,
        hitPoints: character.hitPoints ?? 5,
        brawn: stats.brawn ?? 0,
        charm: stats.charm ?? 0,
        intelligence: stats.intelligence ?? 0,
        reflexes: stats.reflexes ?? 0,
        tech: stats.tech ?? 0,
        luck: stats.luck ?? 0,
        campaignId: character.campaignId ?? null,
      },
    });

    if (character.skills?.length) {
      await prisma.characterSkill.createMany({
        data: character.skills.map((skill) => ({
          characterId: character.id,
          name: skill.name,
          level: skill.level,
        })),
        skipDuplicates: true,
      });
    }

    if (character.cyberneticIds?.length) {
      await prisma.characterCybernetic.createMany({
        data: character.cyberneticIds.map((cyberneticId) => ({
          characterId: character.id,
          cyberneticId,
        })),
        skipDuplicates: true,
      });
    }

    if (character.weaponIds?.length) {
      await prisma.characterWeapon.createMany({
        data: character.weaponIds.map((weaponId) => ({
          characterId: character.id,
          weaponId,
        })),
        skipDuplicates: true,
      });
    }

    if (character.itemIds?.length) {
      await prisma.characterItem.createMany({
        data: character.itemIds.map((itemId) => ({
          characterId: character.id,
          itemId,
        })),
        skipDuplicates: true,
      });
    }

    if (character.vehicleIds?.length) {
      await prisma.characterVehicle.createMany({
        data: character.vehicleIds.map((vehicleId) => ({
          characterId: character.id,
          vehicleId,
        })),
        skipDuplicates: true,
      });
    }
  }

  const [campaignCount, characterCount, cyberneticCount, weaponCount, itemCount, vehicleCount] =
    await Promise.all([
      prisma.campaign.count(),
      prisma.character.count(),
      prisma.cybernetic.count(),
      prisma.weapon.count(),
      prisma.item.count(),
      prisma.vehicle.count(),
    ]);

  console.log('Seeded:', {
    campaigns: campaignCount,
    characters: characterCount,
    cybernetics: cyberneticCount,
    weapons: weaponCount,
    items: itemCount,
    vehicles: vehicleCount,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
