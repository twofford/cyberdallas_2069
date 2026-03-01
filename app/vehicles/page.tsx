import Link from 'next/link';

import { queryServerGraphQL } from '../lib/serverGraphqlQuery';
import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { RouteButton } from '../ui/RouteButton';

type VehiclesQueryResult = {
  vehicles: Array<{ id: string; name: string }>;
};

export default async function VehiclesPage() {
  const data = await queryServerGraphQL<VehiclesQueryResult>(/* GraphQL */ `
    query VehiclesList {
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

        <section>
          <h2>Vehicles</h2>

          <p>
            <Link href="/home">Back to home</Link>
          </p>

          <p>
            <RouteButton href="/vehicles/new">New vehicle</RouteButton>
          </p>

          {data.vehicles.length ? (
            <ul>
              {data.vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link href={`/vehicles/${vehicle.id}`}>{vehicle.name}</Link>
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
