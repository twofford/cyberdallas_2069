'use client';

import * as React from 'react';
import Link from 'next/link';

import { graphqlFetch as graphQLFetch } from '../lib/graphqlFetch';
import { InlineError } from '../ui/InlineError';

type Character = {
  id: string;
  name: string;
  isPublic: boolean;
  campaign: { id: string; name: string } | null;
};

type CharactersData = {
  characters: Character[];
};

export function CharactersClient() {
  const [data, setData] = React.useState<CharactersData | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const result = await graphQLFetch<CharactersData>({
          query: /* GraphQL */ `
            query CharactersList {
              characters {
                id
                name
                isPublic
                campaign {
                  id
                  name
                }
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

  if (busy) return <p>Loading characters…</p>;
  if (error) return <InlineError>{error}</InlineError>;

  const characters = (data?.characters ?? []).filter((character) => !character.isPublic);
  if (!characters.length) return <p>None.</p>;

  return (
    <ul>
      {characters.map((character) => {
        const location = character.campaign?.name ?? 'No campaign';

        return (
          <li key={character.id}>
            <Link href={`/characters/${character.id}`}>{character.name}</Link> — {location}
          </li>
        );
      })}
    </ul>
  );
}
