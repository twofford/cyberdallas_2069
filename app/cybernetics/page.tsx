import Link from 'next/link';

import { queryServerGraphQL } from '../lib/serverGraphqlQuery';
import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { RouteButton } from '../ui/RouteButton';

type CyberneticsQueryResult = {
  cybernetics: Array<{ id: string; name: string }>;
};

export default async function CyberneticsPage() {
  const data = await queryServerGraphQL<CyberneticsQueryResult>(/* GraphQL */ `
    query CyberneticsList {
      cybernetics {
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
          <h2>Cybernetics</h2>

          <p>
            <Link href="/home">Back to home</Link>
          </p>

          <p>
            <RouteButton href="/cybernetics/new">New cybernetic</RouteButton>
          </p>

          {data.cybernetics.length ? (
            <ul>
              {data.cybernetics.map((cybernetic) => (
                <li key={cybernetic.id}>
                  <Link href={`/cybernetics/${cybernetic.id}`}>{cybernetic.name}</Link>
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
