import Link from 'next/link';

import { queryServerGraphQL } from '../lib/serverGraphqlQuery';
import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { RouteButton } from '../ui/RouteButton';

type WeaponsQueryResult = {
  weapons: Array<{ id: string; name: string }>;
};

export default async function WeaponsPage() {
  const data = await queryServerGraphQL<WeaponsQueryResult>(/* GraphQL */ `
    query WeaponsList {
      weapons {
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

        <section>
          <h2>Weapons</h2>

          <p>
            <Link href="/home">Back to home</Link>
          </p>

          <p>
            <RouteButton href="/weapons/new">New weapon</RouteButton>
          </p>

          {data.weapons.length ? (
            <ul>
              {data.weapons.map((weapon) => (
                <li key={weapon.id}>
                  <Link href={`/weapons/${weapon.id}`}>{weapon.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>None.</p>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
