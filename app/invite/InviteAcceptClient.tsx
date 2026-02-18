'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { AuthPanel } from '../AuthPanel';

import { graphqlFetch as graphQLFetch } from '../lib/graphqlFetch';
import { useMe } from '../lib/useMe';

export function InviteAcceptClient() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const { me, error: meError } = useMe();
  const signedIn = Boolean(me);
  const [status, setStatus] = React.useState<string | null>(null);
  const [acceptedCampaign, setAcceptedCampaign] = React.useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!meError) return;
    if (/not authenticated/i.test(meError)) return;
    setStatus((prev) => prev ?? meError);
  }, [meError]);

  async function acceptInvite() {
    if (!tokenFromUrl) return;
    if (!signedIn) return;

    setBusy(true);
    setStatus(null);
    try {
      const result = await graphQLFetch<{ acceptCampaignInvite: { id: string; name: string } }>({
        query: /* GraphQL */ `
          mutation AcceptInvite($token: String!) {
            acceptCampaignInvite(token: $token) {
              id
              name
            }
          }
        `,
        variables: { token: tokenFromUrl },
      });
      setAcceptedCampaign(result.acceptCampaignInvite);
      setStatus(`Joined campaign: ${result.acceptCampaignInvite.name}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Campaign Invite</h1>

      {!tokenFromUrl ? <p>Missing invite token.</p> : <p>Invite token detected.</p>}

      <AuthPanel />

      {!signedIn ? (
        <p>Sign in to accept this invite.</p>
      ) : acceptedCampaign ? (
        <p>Invite accepted.</p>
      ) : (
        <button type="button" onClick={acceptInvite} disabled={!tokenFromUrl || busy}>
          {busy ? 'Accepting…' : 'Accept invite'}
        </button>
      )}

      {status ? <p>{status}</p> : null}

      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
  );
}
