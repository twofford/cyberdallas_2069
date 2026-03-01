'use client';

import * as React from 'react';
import Link from 'next/link';

import { graphqlFetch as graphQLFetch } from '../lib/graphqlFetch';
import { InlineError } from '../ui/InlineError';

type Campaign = { id: string; name: string };

type CampaignsData = {
  campaigns: Campaign[];
};

export function CampaignsClient() {
  const [data, setData] = React.useState<CampaignsData | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const result = await graphQLFetch<CampaignsData>({
          query: /* GraphQL */ `
            query CampaignsList {
              campaigns {
                id
                name
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

  if (busy) return <p>Loading campaigns…</p>;
  if (error) return <InlineError>{error}</InlineError>;

  const campaigns = data?.campaigns ?? [];
  if (!campaigns.length) return <p>None.</p>;

  return (
    <ul>
      {campaigns.map((campaign) => (
        <li key={campaign.id}>
          <Link href={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
        </li>
      ))}
    </ul>
  );
}
