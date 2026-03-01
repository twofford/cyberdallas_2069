import Link from 'next/link';

import { queryServerGraphQL } from '../lib/serverGraphqlQuery';
import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { RouteButton } from '../ui/RouteButton';

type ItemsQueryResult = {
  items: Array<{ id: string; name: string }>;
};

export default async function ItemsPage() {
  const data = await queryServerGraphQL<ItemsQueryResult>(/* GraphQL */ `
    query ItemsList {
      items {
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
          <h2>Items</h2>

          <p>
            <Link href="/home">Back to home</Link>
          </p>

          <p>
            <RouteButton href="/items/new">New item</RouteButton>
          </p>

          {data.items.length ? (
            <ul>
              {data.items.map((item) => (
                <li key={item.id}>
                  <Link href={`/items/${item.id}`}>{item.name}</Link>
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
