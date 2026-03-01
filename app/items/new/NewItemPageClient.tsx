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

export function NewItemPageClient() {
  const router = useRouter();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [weight, setWeight] = React.useState('0');
  const [campaignId, setCampaignId] = React.useState('');
  const [type, setType] = React.useState<ItemType>('GENERAL');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ campaigns: Campaign[] }>({
          query: /* GraphQL */ `
            query NewItemForm {
              campaigns {
                id
                name
              }
            }
          `,
        });
        if (cancelled) return;
        setCampaigns(data.campaigns);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate() {
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
      const data = await graphQLFetch<{ createItem: { id: string } }>({
        query: /* GraphQL */ `
          mutation CreateItem(
            $campaignId: ID
            $name: String!
            $shortDescription: String!
            $longDescription: String!
            $price: Int!
            $weight: Int!
            $type: ItemType!
          ) {
            createItem(
              campaignId: $campaignId
              name: $name
              shortDescription: $shortDescription
              longDescription: $longDescription
              price: $price
              weight: $weight
              type: $type
            ) {
              id
            }
          }
        `,
        variables: {
          campaignId: campaignId.trim() ? campaignId : null,
          name: trimmedName,
          shortDescription: trimmedShort,
          longDescription: trimmedLong,
          price: parsedPrice,
          weight: parsedWeight,
          type,
        },
      });

      router.push(`/items/${data.createItem.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading campaigns…</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onCreate();
      }}
    >
      {error ? <InlineError>{error}</InlineError> : null}

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

      <p>
        <button type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create item'}
        </button>
      </p>
    </form>
  );
}
