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

type Weapon = {
  id: string;
  name: string;
  price: number;
  weight: number;
  maxRange: number;
  maxAmmoCount: number;
  type: WeaponType;
  condition: number;
  shortDescription: string;
  longDescription: string;
  campaign: Campaign | null;
  canEdit: boolean;
};

export function WeaponPageClient(props: { weaponId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [weapon, setWeapon] = React.useState<Weapon | null>(null);

  const [name, setName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [weight, setWeight] = React.useState('0');
  const [maxRange, setMaxRange] = React.useState('0');
  const [maxAmmoCount, setMaxAmmoCount] = React.useState('0');
  const [condition, setCondition] = React.useState('0');
  const [campaignId, setCampaignId] = React.useState('');
  const [type, setType] = React.useState<WeaponType>('MELEE');

  const resetDrafts = React.useCallback((next: Weapon) => {
    setName(next.name);
    setShortDescription(next.shortDescription);
    setLongDescription(next.longDescription);
    setPrice(String(next.price));
    setWeight(String(next.weight));
    setMaxRange(String(next.maxRange));
    setMaxAmmoCount(String(next.maxAmmoCount));
    setCondition(String(next.condition));
    setCampaignId(next.campaign?.id ?? '');
    setType(next.type);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ campaigns: Campaign[]; weapons: Weapon[] }>({
          query: /* GraphQL */ `
            query WeaponDetail {
              campaigns {
                id
                name
              }
              weapons {
                id
                name
                price
                weight
                maxRange
                maxAmmoCount
                type
                condition
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
        const found = data.weapons.find((w) => w.id === props.weaponId) ?? null;
        setWeapon(found);
        if (found) resetDrafts(found);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setWeapon(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.weaponId, resetDrafts]);

  async function save() {
    if (!weapon) return;

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
      const data = await graphQLFetch<{ updateWeapon: Weapon }>({
        query: /* GraphQL */ `
          mutation UpdateWeapon(
            $id: ID!
            $campaignId: ID
            $name: String
            $shortDescription: String
            $longDescription: String
            $price: Int
            $weight: Int
            $maxRange: Int
            $maxAmmoCount: Int
            $type: WeaponType
            $condition: Int
          ) {
            updateWeapon(
              id: $id
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
              name
              price
              weight
              maxRange
              maxAmmoCount
              type
              condition
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
          id: weapon.id,
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

      setWeapon(data.updateWeapon);
      setEditing(false);
      resetDrafts(data.updateWeapon);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!weapon) return;
    if (!weapon.canEdit) return;
    if (!window.confirm('Delete this weapon? This cannot be undone.')) return;

    setBusy(true);
    setError(null);
    try {
      await graphQLFetch<{ deleteWeapon: boolean }>({
        query: /* GraphQL */ `
          mutation DeleteWeapon($id: ID!) {
            deleteWeapon(id: $id)
          }
        `,
        variables: { id: weapon.id },
      });
      router.push('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  if (busy && !weapon) return <p>Loading weapon…</p>;
  if (error && !weapon) return <InlineError>{error}</InlineError>;
  if (!weapon) return <p>Weapon not found.</p>;

  return (
    <>
      {error ? <InlineError>{error}</InlineError> : null}

      <h3>{weapon.name}</h3>
      <p>{weapon.campaign?.name ?? 'No campaign'}</p>

      {weapon.canEdit ? (
        <p>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  resetDrafts(weapon);
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
                resetDrafts(weapon);
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
            <input
              type="number"
              min={0}
              step={1}
              value={maxRange}
              onChange={(e) => setMaxRange(e.target.value)}
              disabled={busy}
            />
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
        </section>
      ) : (
        <>
          <p>{weapon.shortDescription}</p>
          <section>
            <h2>Details</h2>
            <ul>
              <li>Type: {weapon.type}</li>
              <li>Price: {weapon.price}</li>
              <li>Weight: {weapon.weight}</li>
              <li>Range: {weapon.maxRange}</li>
              <li>Max ammo: {weapon.maxAmmoCount}</li>
              <li>Condition: {weapon.condition}</li>
            </ul>
            <p>{weapon.longDescription}</p>
          </section>
        </>
      )}
    </>
  );
}
