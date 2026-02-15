import * as React from 'react';
import Link from 'next/link';

import { createYogaServer } from '@/graphql/yoga';
import { PrivateCampaignsAndCharacters } from '../PrivateCampaignsAndCharacters';
import { RequireAuth } from '../RequireAuth';
import { SessionPanel } from '../SessionPanel';

type PublicCatalogQueryResult = {
  cybernetics: Array<{ id: string; name: string }>;
  weapons: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string }>;
};

async function queryGraphQL<T>(query: string): Promise<T> {
  const yoga = createYogaServer();
  const response = await yoga.fetch('http://localhost/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || body.errors?.length || !body.data) {
    const message = body.errors?.map((e) => e.message).join('\n') ?? 'Unknown GraphQL error';
    throw new Error(message);
  }
  return body.data;
}

export default async function HomePage() {
  const data = await queryGraphQL<PublicCatalogQueryResult>(/* GraphQL */ `
    query PublicCatalogs {
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
  `);

  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <SessionPanel />

        <PrivateCampaignsAndCharacters />

        <section>
          <h2>Cybernetics</h2>
          <ul>
            {data.cybernetics.map((cybernetic) => (
              <li key={cybernetic.id}>
                <Link href={`/cybernetics/${cybernetic.id}`}>{cybernetic.name}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Weapons</h2>
          <ul>
            {data.weapons.map((weapon) => (
              <li key={weapon.id}>
                <Link href={`/weapons/${weapon.id}`}>{weapon.name}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Items</h2>
          <ul>
            {data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/items/${item.id}`}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Vehicles</h2>
          <ul>
            {data.vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <Link href={`/vehicles/${vehicle.id}`}>{vehicle.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </RequireAuth>
  );
}
