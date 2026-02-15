'use client';

import * as React from 'react';

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

async function graphQLFetch<T>(input: { query: string; variables?: Record<string, unknown> }): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: input.query, variables: input.variables }),
  });

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || body.errors?.length || !body.data) {
    const message = body.errors?.map((e) => e.message).join('\n') ?? 'Request failed';
    throw new Error(message);
  }
  return body.data;
}

export function WeaponPageClient(props: { weaponId: string }) {
  const [weapon, setWeapon] = React.useState<Weapon | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ weapons: Weapon[] }>({
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
        });

        if (cancelled) return;
        setWeapon(data.weapons.find((w) => w.id === props.weaponId) ?? null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setWeapon(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.weaponId]);

  if (busy) return <p>Loading weapon…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
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
