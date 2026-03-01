'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from '../../lib/graphqlFetch';
import { Select } from '../../ui/Select';
import { InlineError } from '../../ui/InlineError';

type Campaign = { id: string; name: string };

export function NewCyberneticPageClient() {
  const router = useRouter();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [batteryLife, setBatteryLife] = React.useState('0');
  const [campaignId, setCampaignId] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ campaigns: Campaign[] }>({
          query: /* GraphQL */ `
            query NewCyberneticForm {
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
      const data = await graphQLFetch<{ createCybernetic: { id: string } }>({
        query: /* GraphQL */ `
          mutation CreateCybernetic(
            $campaignId: ID
            $name: String!
            $shortDescription: String!
            $longDescription: String!
            $price: Int!
            $batteryLife: Int!
          ) {
            createCybernetic(
              campaignId: $campaignId
              name: $name
              shortDescription: $shortDescription
              longDescription: $longDescription
              price: $price
              batteryLife: $batteryLife
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
          batteryLife: parsedBatteryLife,
        },
      });

      router.push(`/cybernetics/${data.createCybernetic.id}`);
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

      <p>
        <button type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create cybernetic'}
        </button>
      </p>
    </form>
  );
}
