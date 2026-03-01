'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from '../../lib/graphqlFetch';
import { Select } from '../../ui/Select';
import { InlineError } from '../../ui/InlineError';

type Campaign = { id: string; name: string };

type ItemType = 'GENERAL' | 'CYBERDECK' | 'CONSUMABLE' | 'AMMO' | 'OTHER';

const ITEM_TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: 'GENERAL', label: 'General' },
  { value: 'CYBERDECK', label: 'Cyberdeck' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'AMMO', label: 'Ammo' },
  { value: 'OTHER', label: 'Other' },
];

type Item = {
  id: string;
  name: string;
  price: number;
  weight: number;
  type: ItemType;
  shortDescription: string;
  longDescription: string;
  campaign: Campaign | null;
  canEdit: boolean;
};

export function ItemPageClient(props: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [item, setItem] = React.useState<Item | null>(null);

  const [name, setName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [weight, setWeight] = React.useState('0');
  const [campaignId, setCampaignId] = React.useState('');
  const [type, setType] = React.useState<ItemType>('GENERAL');

  const resetDrafts = React.useCallback((next: Item) => {
    setName(next.name);
    setShortDescription(next.shortDescription);
    setLongDescription(next.longDescription);
    setPrice(String(next.price));
    setWeight(String(next.weight));
    setCampaignId(next.campaign?.id ?? '');
    setType(next.type);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ campaigns: Campaign[]; items: Item[] }>({
          query: /* GraphQL */ `
            query ItemDetail {
              campaigns {
                id
                name
              }
              items {
                id
                name
                price
                weight
                type
                shortDescription
                longDescription
                canEdit
                campaign {
                  id
                  name
                }
              }
            }
          `,
        });

        if (cancelled) return;
        setCampaigns(data.campaigns);
        const found = data.items.find((i) => i.id === props.itemId) ?? null;
        setItem(found);
        if (found) resetDrafts(found);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setItem(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.itemId, resetDrafts]);

  async function save() {
    if (!item) return;

    const trimmedName = name.trim();
    const trimmedShort = shortDescription.trim();
    const trimmedLong = longDescription.trim();
    const parsedPrice = Number(price);
    const parsedWeight = Number(weight);

    if (!trimmedName) return setError('Invalid item name');
    if (!trimmedShort) return setError('Invalid short description');
    if (!trimmedLong) return setError('Invalid long description');
    if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice < 0) return setError('Invalid price');
    if (!Number.isFinite(parsedWeight) || !Number.isInteger(parsedWeight) || parsedWeight < 0) return setError('Invalid weight');

    setBusy(true);
    setError(null);
    try {
      const data = await graphQLFetch<{ updateItem: Item }>({
        query: /* GraphQL */ `
          mutation UpdateItem(
            $id: ID!
            $campaignId: ID
            $name: String
            $shortDescription: String
            $longDescription: String
            $price: Int
            $weight: Int
            $type: ItemType
          ) {
            updateItem(
              id: $id
              campaignId: $campaignId
              name: $name
              shortDescription: $shortDescription
              longDescription: $longDescription
              price: $price
              weight: $weight
              type: $type
            ) {
              id
              name
              price
              weight
              type
              shortDescription
              longDescription
              canEdit
              campaign {
                id
                name
              }
            }
          }
        `,
        variables: {
          id: item.id,
          campaignId: campaignId.trim() ? campaignId : null,
          name: trimmedName,
          shortDescription: trimmedShort,
          longDescription: trimmedLong,
          price: parsedPrice,
          weight: parsedWeight,
          type,
        },
      });

      setItem(data.updateItem);
      setEditing(false);
      resetDrafts(data.updateItem);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!item) return;
    if (!item.canEdit) return;
    if (!window.confirm('Delete this item? This cannot be undone.')) return;

    setBusy(true);
    setError(null);
    try {
      await graphQLFetch<{ deleteItem: boolean }>({
        query: /* GraphQL */ `
          mutation DeleteItem($id: ID!) {
            deleteItem(id: $id)
          }
        `,
        variables: { id: item.id },
      });
      router.push('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  if (busy && !item) return <p>Loading item…</p>;
  if (error && !item) return <InlineError>{error}</InlineError>;
  if (!item) return <p>Item not found.</p>;

  return (
    <>
      {error ? <InlineError>{error}</InlineError> : null}

      <h3>{item.name}</h3>
      <p>{item.campaign?.name ?? 'No campaign'}</p>

      {item.canEdit ? (
        <p>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  resetDrafts(item);
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
                resetDrafts(item);
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
          <Select
            label="Type"
            ariaLabel="Type"
            value={type}
            disabled={busy}
            options={ITEM_TYPE_OPTIONS}
            onChange={(value) => setType(value as ItemType)}
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
            Weight
            <input type="number" min={0} step={1} value={weight} onChange={(e) => setWeight(e.target.value)} disabled={busy} />
          </label>
        </section>
      ) : (
        <>
          <p>{item.shortDescription}</p>
          <section>
            <h2>Details</h2>
            <ul>
              <li>Type: {item.type}</li>
              <li>Price: {item.price}</li>
              <li>Weight: {item.weight}</li>
            </ul>
            <p>{item.longDescription}</p>
          </section>
        </>
      )}
    </>
  );
}
