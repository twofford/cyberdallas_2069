'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from '../../lib/graphqlFetch';
import { Select } from '../../ui/Select';
import { InlineError } from '../../ui/InlineError';

type Campaign = { id: string; name: string };

type Cybernetic = {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  batteryLife: number;
  statBonuses: Array<{ stat: string; amount: number }>;
  skillBonuses: Array<{ name: string; amount: number }>;
  campaign: Campaign | null;
  canEdit: boolean;
};

export function CyberneticPageClient(props: { cyberneticId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [cybernetic, setCybernetic] = React.useState<Cybernetic | null>(null);

  const [name, setName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [batteryLife, setBatteryLife] = React.useState('0');
  const [campaignId, setCampaignId] = React.useState('');

  const resetDrafts = React.useCallback((next: Cybernetic) => {
    setName(next.name);
    setShortDescription(next.shortDescription);
    setLongDescription(next.longDescription);
    setPrice(String(next.price));
    setBatteryLife(String(next.batteryLife));
    setCampaignId(next.campaign?.id ?? '');
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ campaigns: Campaign[]; cybernetics: Cybernetic[] }>({
          query: /* GraphQL */ `
            query CyberneticDetail {
              campaigns {
                id
                name
              }
              cybernetics {
                id
                name
                shortDescription
                longDescription
                price
                batteryLife
                canEdit
                campaign {
                  id
                  name
                }
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
        setCampaigns(data.campaigns);
        const found = data.cybernetics.find((c) => c.id === props.cyberneticId) ?? null;
        setCybernetic(found);
        if (found) resetDrafts(found);
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
  }, [props.cyberneticId, resetDrafts]);

  async function save() {
    if (!cybernetic) return;

    const trimmedName = name.trim();
    const trimmedShort = shortDescription.trim();
    const trimmedLong = longDescription.trim();
    const parsedPrice = Number(price);
    const parsedBatteryLife = Number(batteryLife);

    if (!trimmedName) return setError('Invalid cybernetic name');
    if (!trimmedShort) return setError('Invalid short description');
    if (!trimmedLong) return setError('Invalid long description');
    if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice < 0) return setError('Invalid price');
    if (!Number.isFinite(parsedBatteryLife) || !Number.isInteger(parsedBatteryLife) || parsedBatteryLife < 0) {
      return setError('Invalid battery life');
    }

    setBusy(true);
    setError(null);
    try {
      const data = await graphQLFetch<{ updateCybernetic: Cybernetic }>({
        query: /* GraphQL */ `
          mutation UpdateCybernetic(
            $id: ID!
            $campaignId: ID
            $name: String
            $shortDescription: String
            $longDescription: String
            $price: Int
            $batteryLife: Int
          ) {
            updateCybernetic(
              id: $id
              campaignId: $campaignId
              name: $name
              shortDescription: $shortDescription
              longDescription: $longDescription
              price: $price
              batteryLife: $batteryLife
            ) {
              id
              name
              shortDescription
              longDescription
              price
              batteryLife
              canEdit
              campaign {
                id
                name
              }
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
        variables: {
          id: cybernetic.id,
          campaignId: campaignId.trim() ? campaignId : null,
          name: trimmedName,
          shortDescription: trimmedShort,
          longDescription: trimmedLong,
          price: parsedPrice,
          batteryLife: parsedBatteryLife,
        },
      });

      setCybernetic(data.updateCybernetic);
      setEditing(false);
      resetDrafts(data.updateCybernetic);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!cybernetic) return;
    if (!cybernetic.canEdit) return;
    if (!window.confirm('Delete this cybernetic? This cannot be undone.')) return;

    setBusy(true);
    setError(null);
    try {
      await graphQLFetch<{ deleteCybernetic: boolean }>({
        query: /* GraphQL */ `
          mutation DeleteCybernetic($id: ID!) {
            deleteCybernetic(id: $id)
          }
        `,
        variables: { id: cybernetic.id },
      });
      router.push('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  if (busy && !cybernetic) return <p>Loading cybernetic…</p>;
  if (error && !cybernetic) return <InlineError>{error}</InlineError>;
  if (!cybernetic) return <p>Cybernetic not found.</p>;

  return (
    <>
      {error ? <InlineError>{error}</InlineError> : null}

      <h3>{cybernetic.name}</h3>
      <p>{cybernetic.campaign?.name ?? 'No campaign'}</p>

      {cybernetic.canEdit ? (
        <p>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  resetDrafts(cybernetic);
                }}
                disabled={busy}
              >
                Cancel
              </button>{' '}
              <button type="button" onClick={() => void save()} disabled={busy}>
                Save
              </button>{' '}
              <button type="button" onClick={() => void del()} disabled={busy}>
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setError(null);
                resetDrafts(cybernetic);
              }}
              disabled={busy}
            >
              Edit
            </button>
          )}
        </p>
      ) : null}

      {editing ? (
        <section>
          <h2>Edit</h2>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </label>
          <Select
            label="Campaign"
            ariaLabel="Campaign"
            value={campaignId}
            disabled={busy}
            options={[{ value: '', label: '(No campaign)' }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]}
            onChange={setCampaignId}
          />
          <label>
            Short description
            <input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} disabled={busy} />
          </label>
          <label>
            Long description
            <textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} disabled={busy} />
          </label>
          <label>
            Price
            <input type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} disabled={busy} />
          </label>
          <label>
            Battery life
            <input
              type="number"
              min={0}
              step={1}
              value={batteryLife}
              onChange={(e) => setBatteryLife(e.target.value)}
              disabled={busy}
            />
          </label>
        </section>
      ) : (
        <>
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
      )}
    </>
  );
}
