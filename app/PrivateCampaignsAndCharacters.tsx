'use client';

import * as React from 'react';

type Campaign = { id: string; name: string };

type AuthUser = { id: string; email: string };

type Character = { id: string; name: string; campaign: { id: string; name: string } | null };

type PrivateData = {
  campaigns: Campaign[];
  characters: Character[];
};

type OwnerCampaignsData = {
  ownerCampaigns: Array<{ id: string }>;
};

async function graphQLFetch<T>(input: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
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

export function PrivateCampaignsAndCharacters() {
  const [signedIn, setSignedIn] = React.useState(false);
  const [data, setData] = React.useState<PrivateData | null>(null);
  const [ownerCampaignIds, setOwnerCampaignIds] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [inviteBusy, setInviteBusy] = React.useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = React.useState<string | null>(null);

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
        setError(null);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Request failed';
        if (/not authenticated/i.test(message)) {
          setSignedIn(false);
          setError(null);
          return;
        }
        setSignedIn(false);
        setError(message);
      }
    }

    refreshMe();

    const onChanged = () => {
      refreshMe();
    };
    window.addEventListener('authTokenChanged', onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('authTokenChanged', onChanged);
    };
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

        if (!cancelled) setData(result);
        if (!cancelled) setOwnerCampaignIds(new Set(owners.ownerCampaigns.map((c) => c.id)));
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
  }, [signedIn]);

  async function sendInvite(campaignId: string, email: string) {
    if (!signedIn) return;
    setInviteBusy(campaignId);
    setInviteStatus(null);
    try {
      await graphQLFetch<{ createCampaignInvite: { token: string; expiresAt: string } }>({
        query: /* GraphQL */ `
          mutation Invite($campaignId: ID!, $email: String!) {
            createCampaignInvite(campaignId: $campaignId, email: $email) {
              token
              expiresAt
            }
          }
        `,
        variables: { campaignId, email },
      });
      setInviteStatus('Invite sent.');
    } catch (e) {
      setInviteStatus(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setInviteBusy(null);
    }
  }

  return (
    <>
      <section>
        <h2>Campaigns</h2>
        {!signedIn ? (
          <p>Sign in to view campaigns.</p>
        ) : busy ? (
          <p>Loading campaigns…</p>
        ) : error ? (
          <p style={{ color: 'crimson' }}>{error}</p>
        ) : (
          <ul>
            {(data?.campaigns ?? []).map((campaign) => (
              <li key={campaign.id}>
                {campaign.name}
                {ownerCampaignIds.has(campaign.id) ? (
                  <InviteForm
                    disabled={inviteBusy === campaign.id}
                    onSend={(email) => sendInvite(campaign.id, email)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {inviteStatus ? <p>{inviteStatus}</p> : null}
      </section>

      <section>
        <h2>Characters</h2>
        {!signedIn ? (
          <p>Sign in to view characters.</p>
        ) : busy ? (
          <p>Loading characters…</p>
        ) : error ? (
          <p style={{ color: 'crimson' }}>{error}</p>
        ) : (
          <ul>
            {(data?.characters ?? []).map((character) => (
              <li key={character.id}>
                {character.name} — {character.campaign?.name ?? 'Archetype'}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function InviteForm(props: { disabled: boolean; onSend: (email: string) => void }) {
  const [email, setEmail] = React.useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSend(email);
        setEmail('');
      }}
      style={{ marginTop: 8 }}
    >
      <label>
        Invite email
        <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={props.disabled} />
      </label>
      <button type="submit" disabled={props.disabled || !email.trim()}>
        {props.disabled ? 'Sending…' : 'Send invite'}
      </button>
    </form>
  );
}
