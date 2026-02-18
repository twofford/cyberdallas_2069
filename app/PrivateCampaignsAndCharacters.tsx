'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from './lib/graphqlFetch';
import { useMe } from './lib/useMe';
import { InlineError } from './ui/InlineError';

type Campaign = { id: string; name: string };

type Character = { id: string; name: string; isPublic: boolean; campaign: { id: string; name: string } | null };

type PrivateData = {
  campaigns: Campaign[];
  characters: Character[];
};

type OwnerCampaignsData = {
  ownerCampaigns: Array<{ id: string }>;
};

export function PrivateCampaignsAndCharacters() {
  const router = useRouter();
  const { me } = useMe();
  const signedIn = Boolean(me);
  const [data, setData] = React.useState<PrivateData | null>(null);
  const [ownerCampaignIds, setOwnerCampaignIds] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const refreshPrivateData = React.useCallback(async () => {
    const result = await graphQLFetch<PrivateData>({
      query: /* GraphQL */ `
        query PrivateCampaignsAndCharacters {
          campaigns {
            id
            name
          }
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

    const owners = await graphQLFetch<OwnerCampaignsData>({
      query: /* GraphQL */ `
        query OwnerCampaigns {
          ownerCampaigns {
            id
          }
        }
      `,
    });

    setData(result);
    setOwnerCampaignIds(new Set(owners.ownerCampaigns.map((c) => c.id)));
  }, []);

  React.useEffect(() => {
    if (!signedIn) {
      setData(null);
      setOwnerCampaignIds(new Set());
      setError(null);
      setBusy(false);
      return;
    }

    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        await refreshPrivateData();
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setOwnerCampaignIds(new Set());
          setError(e instanceof Error ? e.message : 'Request failed');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, refreshPrivateData]);

  return (
    <>
      <section>
        <h2>Campaigns</h2>
        {!signedIn ? (
          <p>Sign in to view campaigns.</p>
        ) : busy ? (
          <p>Loading campaigns…</p>
        ) : error ? (
          <InlineError>{error}</InlineError>
        ) : (
          <>
            <p>
              <button type="button" onClick={() => router.push('/campaigns/new')}>
                New campaign
              </button>
            </p>

            <ul>
              {(data?.campaigns ?? []).map((campaign) => (
                <li key={campaign.id}>
                  <Link href={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2>Characters</h2>
        {!signedIn ? (
          <p>Sign in to view characters.</p>
        ) : busy ? (
          <p>Loading characters…</p>
        ) : error ? (
          <InlineError>{error}</InlineError>
        ) : (
          <>
            <p>
              <button type="button" onClick={() => router.push('/characters/new')}>
                New character
              </button>
            </p>

            <ul>
              {(data?.characters ?? [])
                .filter((c) => !c.isPublic)
                .map((character) => (
                  <li key={character.id}>
                    <Link href={`/characters/${character.id}`}>{character.name}</Link> — {character.campaign?.name ?? 'No campaign'}
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2>NPCs</h2>
        {!signedIn ? (
          <p>Sign in to view NPCs.</p>
        ) : busy ? (
          <p>Loading NPCs…</p>
        ) : error ? (
          <InlineError>{error}</InlineError>
        ) : (
          <>
            <p>
              <Link href="/npcs">View all NPCs</Link>
            </p>

            {ownerCampaignIds.size ? (
              <p>
                <button type="button" onClick={() => router.push('/npcs/new')}>
                  New NPC
                </button>
              </p>
            ) : null}

            <ul>
              {(data?.characters ?? [])
                .filter((c) => c.isPublic)
                .map((npc) => (
                  <li key={npc.id}>
                    <Link href={`/characters/${npc.id}`}>{npc.name}</Link>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
