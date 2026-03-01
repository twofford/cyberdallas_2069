'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from '../../lib/graphqlFetch';
import { Select } from '../../ui/Select';
import { InlineError } from '../../ui/InlineError';

type Campaign = { id: string; name: string };

type WeaponType = 'MELEE' | 'RANGED';

const WEAPON_TYPE_OPTIONS: Array<{ value: WeaponType; label: string }> = [
  { value: 'MELEE', label: 'Melee' },
  { value: 'RANGED', label: 'Ranged' },
];

export function NewWeaponPageClient() {
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
  const [maxRange, setMaxRange] = React.useState('0');
  const [maxAmmoCount, setMaxAmmoCount] = React.useState('0');
  const [condition, setCondition] = React.useState('100');
  const [campaignId, setCampaignId] = React.useState('');
  const [type, setType] = React.useState<WeaponType>('MELEE');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ campaigns: Campaign[] }>({
          query: /* GraphQL */ `
            query NewWeaponForm {
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
    const parsedMaxRange = Number(maxRange);
    const parsedMaxAmmoCount = Number(maxAmmoCount);
    const parsedCondition = Number(condition);

    if (!trimmedName) return setError('Invalid weapon name');
    if (!trimmedShort) return setError('Invalid short description');
    if (!trimmedLong) return setError('Invalid long description');
    if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice < 0) return setError('Invalid price');
    if (!Number.isFinite(parsedWeight) || !Number.isInteger(parsedWeight) || parsedWeight < 0) return setError('Invalid weight');
    if (!Number.isFinite(parsedMaxRange) || !Number.isInteger(parsedMaxRange) || parsedMaxRange < 0) return setError('Invalid max range');
    if (!Number.isFinite(parsedMaxAmmoCount) || !Number.isInteger(parsedMaxAmmoCount) || parsedMaxAmmoCount < 0) {
      return setError('Invalid max ammo count');
    }
    if (!Number.isFinite(parsedCondition) || !Number.isInteger(parsedCondition) || parsedCondition < 0) {
      return setError('Invalid condition');
    }

    setBusy(true);
    setError(null);
    try {
      const data = await graphQLFetch<{ createWeapon: { id: string } }>({
        query: /* GraphQL */ `
          mutation CreateWeapon(
            $campaignId: ID
            $name: String!
            $shortDescription: String!
            $longDescription: String!
            $price: Int!
            $weight: Int!
            $maxRange: Int!
            $maxAmmoCount: Int!
            $type: WeaponType!
            $condition: Int!
          ) {
            createWeapon(
              campaignId: $campaignId
              name: $name
              shortDescription: $shortDescription
              longDescription: $longDescription
              price: $price
              weight: $weight
              maxRange: $maxRange
              maxAmmoCount: $maxAmmoCount
              type: $type
              condition: $condition
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
          maxRange: parsedMaxRange,
          maxAmmoCount: parsedMaxAmmoCount,
          type,
          condition: parsedCondition,
        },
      });

      router.push(`/weapons/${data.createWeapon.id}`);
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
        options={WEAPON_TYPE_OPTIONS}
        onChange={(value) => setType(value as WeaponType)}
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

      <label>
        Max range
        <input type="number" min={0} step={1} value={maxRange} onChange={(e) => setMaxRange(e.target.value)} disabled={busy} />
      </label>

      <label>
        Max ammo count
        <input
          type="number"
          min={0}
          step={1}
          value={maxAmmoCount}
          onChange={(e) => setMaxAmmoCount(e.target.value)}
          disabled={busy}
        />
      </label>

      <label>
        Condition
        <input
          type="number"
          min={0}
          step={1}
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          disabled={busy}
        />
      </label>

      <p>
        <button type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create weapon'}
        </button>
      </p>
    </form>
  );
}
