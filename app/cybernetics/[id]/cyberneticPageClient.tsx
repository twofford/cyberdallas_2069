'use client';

import * as React from 'react';

type Cybernetic = {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  batteryLife: number;
  statBonuses: Array<{ stat: string; amount: number }>;
  skillBonuses: Array<{ name: string; amount: number }>;
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

export function CyberneticPageClient(props: { cyberneticId: string }) {
  const [cybernetic, setCybernetic] = React.useState<Cybernetic | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ cybernetics: Cybernetic[] }>({
          query: /* GraphQL */ `
            query CyberneticDetail {
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
            }
          `,
        });

        if (cancelled) return;
        setCybernetic(data.cybernetics.find((c) => c.id === props.cyberneticId) ?? null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setCybernetic(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.cyberneticId]);

  if (busy) return <p>Loading cybernetic…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!cybernetic) return <p>Cybernetic not found.</p>;

  return (
    <>
      <h3>{cybernetic.name}</h3>
      <p>{cybernetic.shortDescription}</p>
      <section>
        <h2>Details</h2>
        <ul>
          <li>Price: {cybernetic.price}</li>
          <li>Battery life: {cybernetic.batteryLife}</li>
          {cybernetic.statBonuses.length ? (
            <li>Stat bonuses: {cybernetic.statBonuses.map((b) => `${b.stat}+${b.amount}`).join(', ')}</li>
          ) : (
            <li>Stat bonuses: None.</li>
          )}
          {cybernetic.skillBonuses.length ? (
            <li>Skill bonuses: {cybernetic.skillBonuses.map((b) => `${b.name}+${b.amount}`).join(', ')}</li>
          ) : (
            <li>Skill bonuses: None.</li>
          )}
        </ul>
        <p>{cybernetic.longDescription}</p>
      </section>
    </>
  );
}
