'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { AuthPanel } from '../AuthPanel';

type AuthUser = { id: string; email: string };

async function graphQLFetch<T>(input: { query: string; variables?: unknown }): Promise<T> {
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

export function InviteAcceptClient() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [signedIn, setSignedIn] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [acceptedCampaign, setAcceptedCampaign] = React.useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function refreshMe() {
      try {
        const result = await graphQLFetch<{ me: AuthUser | null }>({
          query: /* GraphQL */ `
            query Me {
              me {
                id
                email
              }
            }
          `,
        });
        if (cancelled) return;
        setSignedIn(Boolean(result.me));
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Request failed';
        if (/not authenticated/i.test(message)) {
          setSignedIn(false);
          return;
        }
        setSignedIn(false);
        setStatus(message);
      }
    }

    refreshMe();

    const onChanged = () => refreshMe();
    window.addEventListener('authTokenChanged', onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('authTokenChanged', onChanged);
    };
  }, []);

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
        <button onClick={acceptInvite} disabled={!tokenFromUrl || busy}>
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
