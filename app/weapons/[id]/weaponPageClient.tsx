'use client';

import { useEntityFromListQuery } from '../../lib/useEntityFromListQuery';
import { InlineError } from '../../ui/InlineError';

type Weapon = {
  id: string;
  name: string;
  price: number;
  weight: number;
  maxRange: number;
  maxAmmoCount: number;
  type: string;
  condition: number;
  shortDescription: string;
  longDescription: string;
};

export function WeaponPageClient(props: { weaponId: string }) {
  const { entity: weapon, busy, error } = useEntityFromListQuery<Weapon, { weapons: Weapon[] }>({
    id: props.weaponId,
    query: /* GraphQL */ `
      query WeaponDetail {
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
      }
    `,
    select: (data) => data.weapons,
  });

  if (busy) return <p>Loading weapon…</p>;
  if (error) return <InlineError>{error}</InlineError>;
  if (!weapon) return <p>Weapon not found.</p>;

  return (
    <>
      <h3>{weapon.name}</h3>
      <p>{weapon.shortDescription}</p>
      <section>
        <h2>Details</h2>
        <ul>
          <li>Type: {weapon.type}</li>
          <li>Price: {weapon.price}</li>
          <li>Weight: {weapon.weight}</li>
          <li>Range: {weapon.maxRange}</li>
          <li>Max ammo: {weapon.maxAmmoCount}</li>
          <li>Condition: {weapon.condition}</li>
        </ul>
        <p>{weapon.longDescription}</p>
      </section>
    </>
  );
}
