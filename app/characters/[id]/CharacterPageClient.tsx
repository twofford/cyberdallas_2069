'use client';

import * as React from 'react';

type Character = {
  id: string;
  name: string;
  speed: number;
  hitPoints: number;
  campaign: { id: string; name: string } | null;
  stats: {
    brawn: number;
    charm: number;
    intelligence: number;
    reflexes: number;
    tech: number;
    luck: number;
  };
  skills: Array<{ name: string; level: number }>;
  cybernetics: Array<{
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    batteryLife: number;
    statBonuses: Array<{ stat: string; amount: number }>;
    skillBonuses: Array<{ name: string; amount: number }>;
  }>;
  weapons: Array<{
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
  }>;
  items: Array<{
    id: string;
    name: string;
    price: number;
    weight: number;
    type: string;
    shortDescription: string;
    longDescription: string;
  }>;
  vehicles: Array<{
    id: string;
    name: string;
    price: number;
    speed: number;
    armor: number;
    shortDescription: string;
    longDescription: string;
  }>;
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

export function CharacterPageClient(props: { characterId: string }) {
  const [character, setCharacter] = React.useState<Character | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ characters: Character[] }>({
          query: /* GraphQL */ `
            query CharacterDetail {
              characters {
                id
                name
                speed
                hitPoints
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
                  shortDescription
                  longDescription
                  price
                  batteryLife
                  statBonuses {
                    stat
                    amount
                  }
                  skillBonuses {
                    name
                    amount
                  }
                }
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
                items {
                  id
                  name
                  price
                  weight
                  type
                  shortDescription
                  longDescription
                }
                vehicles {
                  id
                  name
                  price
                  speed
                  armor
                  shortDescription
                  longDescription
                }
              }
            }
          `,
        });

        if (cancelled) return;
        const found = data.characters.find((c) => c.id === props.characterId) ?? null;
        setCharacter(found);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setCharacter(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.characterId]);

  if (busy) return <p>Loading character…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!character) return <p>Character not found.</p>;

  return (
    <>
      <h3>{character.name}</h3>
      <p>{character.campaign?.name ?? 'Archetype'}</p>

      <section>
        <h2>Stats</h2>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <li>Speed: {character.speed}</li>
          <li>Hit Points: {character.hitPoints}</li>
          <li>Brawn: {character.stats.brawn}</li>
          <li>Charm: {character.stats.charm}</li>
          <li>Intelligence: {character.stats.intelligence}</li>
          <li>Reflexes: {character.stats.reflexes}</li>
          <li>Tech: {character.stats.tech}</li>
          <li>Luck: {character.stats.luck}</li>
        </ul>
      </section>

      <section>
        <h2>Skills</h2>
        {character.skills.length ? (
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {character.skills.map((skill) => (
              <li key={skill.name}>
                {skill.name}: {skill.level}
              </li>
            ))}
          </ul>
        ) : (
          <p>None.</p>
        )}
      </section>

      <section>
        <h2>Cybernetics</h2>
        {character.cybernetics.length ? (
          <ul>
            {character.cybernetics.map((cybernetic) => (
              <li key={cybernetic.id}>
                <strong>{cybernetic.name}</strong> — {cybernetic.shortDescription}
                <ul>
                  <li>Price: {cybernetic.price}</li>
                  <li>Battery life: {cybernetic.batteryLife}</li>
                  <li>{cybernetic.longDescription}</li>
                  {cybernetic.statBonuses.length ? (
                    <li>
                      Stat bonuses: {cybernetic.statBonuses.map((b) => `${b.stat}+${b.amount}`).join(', ')}
                    </li>
                  ) : null}
                  {cybernetic.skillBonuses.length ? (
                    <li>
                      Skill bonuses: {cybernetic.skillBonuses.map((b) => `${b.name}+${b.amount}`).join(', ')}
                    </li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>None.</p>
        )}
      </section>

      <section>
        <h2>Weapons</h2>
        {character.weapons.length ? (
          <ul>
            {character.weapons.map((weapon) => (
              <li key={weapon.id}>
                <strong>{weapon.name}</strong> — {weapon.shortDescription}
                <ul>
                  <li>Type: {weapon.type}</li>
                  <li>Price: {weapon.price}</li>
                  <li>Weight: {weapon.weight}</li>
                  <li>Range: {weapon.maxRange}</li>
                  <li>Max ammo: {weapon.maxAmmoCount}</li>
                  <li>Condition: {weapon.condition}</li>
                  <li>{weapon.longDescription}</li>
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>None.</p>
        )}
      </section>

      <section>
        <h2>Items</h2>
        {character.items.length ? (
          <ul>
            {character.items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong> — {item.shortDescription}
                <ul>
                  <li>Type: {item.type}</li>
                  <li>Price: {item.price}</li>
                  <li>Weight: {item.weight}</li>
                  <li>{item.longDescription}</li>
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>None.</p>
        )}
      </section>

      <section>
        <h2>Vehicles</h2>
        {character.vehicles.length ? (
          <ul>
            {character.vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <strong>{vehicle.name}</strong> — {vehicle.shortDescription}
                <ul>
                  <li>Price: {vehicle.price}</li>
                  <li>Speed: {vehicle.speed}</li>
                  <li>Armor: {vehicle.armor}</li>
                  <li>{vehicle.longDescription}</li>
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>None.</p>
        )}
      </section>
    </>
  );
}
