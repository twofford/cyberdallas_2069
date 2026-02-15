'use client';

import * as React from 'react';

type Item = {
  id: string;
  name: string;
  price: number;
  weight: number;
  type: string;
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

export function ItemPageClient(props: { itemId: string }) {
  const [item, setItem] = React.useState<Item | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ items: Item[] }>({
          query: /* GraphQL */ `
            query ItemDetail {
              items {
                id
                name
                price
                weight
                type
                shortDescription
                longDescription
              }
            }
          `,
        });

        if (cancelled) return;
        setItem(data.items.find((i) => i.id === props.itemId) ?? null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setItem(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.itemId]);

  if (busy) return <p>Loading item…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!item) return <p>Item not found.</p>;

  return (
    <>
      <h3>{item.name}</h3>
      <p>{item.shortDescription}</p>
      <section>
        <h2>Details</h2>
        <ul>
          <li>Type: {item.type}</li>
          <li>Price: {item.price}</li>
          <li>Weight: {item.weight}</li>
        </ul>
        <p>{item.longDescription}</p>
      </section>
    </>
  );
}
