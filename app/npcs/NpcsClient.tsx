'use client';

import * as React from 'react';
import Link from 'next/link';

import { graphqlFetch as graphQLFetch } from '../lib/graphqlFetch';
import { InlineError } from '../ui/InlineError';

type Character = { id: string; name: string; isPublic: boolean };

type NpcsData = {
  characters: Character[];
};

export function NpcsClient() {
  const [data, setData] = React.useState<NpcsData | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const result = await graphQLFetch<NpcsData>({
          query: /* GraphQL */ `
            query Npcs {
              characters {
                id
                name
                isPublic
              }
            }
          `,
        });

        if (cancelled) return;
        setData(result);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : 'Request failed');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const npcs = React.useMemo(() => (data?.characters ?? []).filter((c) => c.isPublic), [data?.characters]);

  return (
    <section>
      <h2>NPCs</h2>
      {busy ? <p>Loading NPCs…</p> : null}
      {error ? <InlineError>{error}</InlineError> : null}

      {!busy && !error ? (
        npcs.length ? (
          <ul>
            {npcs.map((c) => (
              <li key={c.id}>
                <Link href={`/characters/${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>None.</p>
        )
      ) : null}
    </section>
  );
}
