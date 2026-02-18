'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from '../../lib/graphqlFetch';
import { InlineError } from '../../ui/InlineError';

type Campaign = { id: string; name: string; startingMoney: number };

type CampaignDetailQuery = {
  campaigns: Campaign[];
  ownerCampaigns: Array<{ id: string }>;
};

export function CampaignPageClient(props: { campaignId: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [isOwner, setIsOwner] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [editing, setEditing] = React.useState(false);

  const [editName, setEditName] = React.useState('');
  const [editStartingMoney, setEditStartingMoney] = React.useState('0');
  const [editBusy, setEditBusy] = React.useState(false);
  const [editStatus, setEditStatus] = React.useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteBusy, setInviteBusy] = React.useState(false);
  const [inviteStatus, setInviteStatus] = React.useState<string | null>(null);

  const resetDraftsFromCampaign = React.useCallback((next: Campaign) => {
    setEditName(next.name);
    setEditStartingMoney(String(next.startingMoney));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<CampaignDetailQuery>({
          query: /* GraphQL */ `
            query CampaignDetail {
              campaigns {
                id
                name
                startingMoney
              }
              ownerCampaigns {
                id
              }
            }
          `,
        });

        if (cancelled) return;
        const found = data.campaigns.find((c) => c.id === props.campaignId) ?? null;
        setCampaign(found);
        setIsOwner(data.ownerCampaigns.some((c) => c.id === props.campaignId));

        if (found) {
          resetDraftsFromCampaign(found);
        } else {
          setEditName('');
          setEditStartingMoney('0');
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setCampaign(null);
        setIsOwner(false);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.campaignId, resetDraftsFromCampaign]);

  async function saveCampaignEdits() {
    const name = editName.trim();
    if (!name) {
      setEditStatus('Invalid campaign name');
      return;
    }

    const startingMoneyStr = editStartingMoney.trim();
    if (!startingMoneyStr) {
      setEditStatus('Invalid starting money');
      return;
    }

    const startingMoney = Number(startingMoneyStr);
    if (!Number.isFinite(startingMoney) || !Number.isInteger(startingMoney) || startingMoney < 0) {
      setEditStatus('Invalid starting money');
      return;
    }

    setEditBusy(true);
    setEditStatus(null);

    try {
      const data = await graphQLFetch<{ updateCampaign: Campaign }>({
        query: /* GraphQL */ `
          mutation UpdateCampaign($campaignId: ID!, $name: String, $startingMoney: Int) {
            updateCampaign(campaignId: $campaignId, name: $name, startingMoney: $startingMoney) {
              id
              name
              startingMoney
            }
          }
        `,
        variables: { campaignId: props.campaignId, name, startingMoney },
      });

      setCampaign(data.updateCampaign);
      resetDraftsFromCampaign(data.updateCampaign);
      setEditStatus(null);
      setEditing(false);
    } catch (e) {
      setEditStatus(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteCampaign() {
    if (!campaign) return;
    if (!isOwner) return;
    if (editBusy) return;

    const ok = window.confirm('Delete this campaign? This cannot be undone.');
    if (!ok) return;

    setEditBusy(true);
    setEditStatus(null);
    try {
      await graphQLFetch<{ deleteCampaign: boolean }>({
        query: /* GraphQL */ `
          mutation DeleteCampaign($campaignId: ID!) {
            deleteCampaign(campaignId: $campaignId)
          }
        `,
        variables: { campaignId: props.campaignId },
      });

      router.push('/home');
    } catch (e) {
      setEditStatus(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setEditBusy(false);
    }
  }

  async function sendInvite() {
    const email = inviteEmail.trim();
    if (!email) return;

    setInviteBusy(true);
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
        variables: { campaignId: props.campaignId, email },
      });

      setInviteEmail('');
      setInviteStatus('Invite sent.');
    } catch (e) {
      setInviteStatus(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setInviteBusy(false);
    }
  }

  if (busy) return <p>Loading campaign…</p>;
  if (error) return <InlineError>{error}</InlineError>;
  if (!campaign) return <p>Campaign not found.</p>;

  return (
    <>
      <h3>{campaign.name}</h3>
      <ul>
        <li>Starting money: {campaign.startingMoney}</li>
      </ul>

      {isOwner ? (
        <>
          <p>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditStatus(null);
                    if (campaign) resetDraftsFromCampaign(campaign);
                  }}
                  disabled={editBusy}
                >
                  Cancel
                </button>{' '}
                <button type="button" onClick={() => void saveCampaignEdits()} disabled={editBusy}>
                  {editBusy ? 'Saving…' : 'Save'}
                </button>
                {' '}
                <button type="button" onClick={() => void deleteCampaign()} disabled={editBusy}>
                  Delete
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setEditStatus(null);
                  resetDraftsFromCampaign(campaign);
                }}
                disabled={editBusy}
              >
                Edit
              </button>
            )}
          </p>

          {editing ? (
            <section>
              <h2>Edit</h2>
              <label>
                Name
                <input value={editName} onChange={(e) => setEditName(e.target.value)} disabled={editBusy} />
              </label>
              <label>
                Starting money
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editStartingMoney}
                  onChange={(e) => setEditStartingMoney(e.target.value)}
                  disabled={editBusy}
                />
              </label>
              {editStatus ? <p>{editStatus}</p> : null}
            </section>
          ) : null}
        </>
      ) : null}

      {isOwner ? (
        <section>
          <h2>Invite</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendInvite();
            }}
          >
            <label>
              Invite email
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={inviteBusy} />
            </label>
            <button type="submit" disabled={inviteBusy || !inviteEmail.trim()}>
              {inviteBusy ? 'Sending…' : 'Send invite'}
            </button>
          </form>
          {inviteStatus ? <p>{inviteStatus}</p> : null}
        </section>
      ) : null}
    </>
  );
}
