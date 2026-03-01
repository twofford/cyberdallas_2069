'use client';

import * as React from 'react';

import { graphqlFetch as graphQLFetch } from '../lib/graphqlFetch';
import { useMe } from '../lib/useMe';
import { InlineError } from '../ui/InlineError';
import { RouteButton } from '../ui/RouteButton';

type OwnerCampaignsData = {
  ownerCampaigns: Array<{ id: string }>;
};

export function PrivateCampaignsAndCharacters() {
  const { me } = useMe();
  const signedIn = Boolean(me);
  const [ownerCampaignIds, setOwnerCampaignIds] = React.useState<Set<string>>(new Set());
  const [ownerBusy, setOwnerBusy] = React.useState(false);
  const [ownerError, setOwnerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!signedIn) {
      setOwnerCampaignIds(new Set());
      setOwnerBusy(false);
      setOwnerError(null);
      return;
    }

    let cancelled = false;
    setOwnerBusy(true);
    setOwnerError(null);

    (async () => {
      try {
        const owners = await graphQLFetch<OwnerCampaignsData>({
          query: /* GraphQL */ `
            query OwnerCampaigns {
              ownerCampaigns {
                id
              }
            }
          `,
        });

        if (cancelled) return;
        setOwnerCampaignIds(new Set(owners.ownerCampaigns.map((c) => c.id)));
      } catch (e) {
        if (cancelled) return;
        setOwnerCampaignIds(new Set());
        setOwnerError(e instanceof Error ? e.message : 'Request failed');
      } finally {
        if (!cancelled) setOwnerBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return (
    <>
      <section>
        <h2>Campaigns</h2>
        {!signedIn ? (
          <p>Sign in to view campaigns.</p>
        ) : (
          <p>
            <RouteButton href="/campaigns/new">New campaign</RouteButton>{' '}
            <RouteButton href="/campaigns">View campaigns</RouteButton>
          </p>
        )}
      </section>

      <section>
        <h2>Characters</h2>
        {!signedIn ? (
          <p>Sign in to view characters.</p>
        ) : (
          <p>
            <RouteButton href="/characters/new">New character</RouteButton>{' '}
            <RouteButton href="/characters">View characters</RouteButton>
          </p>
        )}
      </section>

      <section>
        <h2>NPCs</h2>
        {!signedIn ? (
          <p>Sign in to view NPCs.</p>
        ) : (
          <>
            <p>
              {!ownerBusy && !ownerError && ownerCampaignIds.size ? (
                <>
                  <button type="button" onClick={() => window.location.assign('/npcs/new')}>
                    New NPC
                  </button>
                  {' '}
                </>
              ) : null}
              <RouteButton href="/npcs">View NPCs</RouteButton>
            </p>

            {ownerBusy ? <p>Checking NPC creation permissions…</p> : null}
            {ownerError ? <InlineError>{ownerError}</InlineError> : null}
          </>
        )}
      </section>
    </>
  );
}
