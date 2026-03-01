'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from '../../lib/graphqlFetch';
import { Select } from '../../ui/Select';
import { InlineError } from '../../ui/InlineError';

type Campaign = { id: string; name: string };

type Vehicle = {
  id: string;
  name: string;
  price: number;
  speed: number;
  armor: number;
  shortDescription: string;
  longDescription: string;
  campaign: Campaign | null;
  canEdit: boolean;
};

export function VehiclePageClient(props: { vehicleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);

  const [name, setName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [speed, setSpeed] = React.useState('0');
  const [armor, setArmor] = React.useState('0');
  const [campaignId, setCampaignId] = React.useState('');

  const resetDrafts = React.useCallback((next: Vehicle) => {
    setName(next.name);
    setShortDescription(next.shortDescription);
    setLongDescription(next.longDescription);
    setPrice(String(next.price));
    setSpeed(String(next.speed));
    setArmor(String(next.armor));
    setCampaignId(next.campaign?.id ?? '');
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ campaigns: Campaign[]; vehicles: Vehicle[] }>({
          query: /* GraphQL */ `
            query VehicleDetail {
              campaigns {
                id
                name
              }
              vehicles {
                id
                name
                price
                speed
                armor
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
        const found = data.vehicles.find((v) => v.id === props.vehicleId) ?? null;
        setVehicle(found);
        if (found) resetDrafts(found);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setVehicle(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.vehicleId, resetDrafts]);

  async function save() {
    if (!vehicle) return;

    const trimmedName = name.trim();
    const trimmedShort = shortDescription.trim();
    const trimmedLong = longDescription.trim();
    const parsedPrice = Number(price);
    const parsedSpeed = Number(speed);
    const parsedArmor = Number(armor);

    if (!trimmedName) return setError('Invalid vehicle name');
    if (!trimmedShort) return setError('Invalid short description');
    if (!trimmedLong) return setError('Invalid long description');
    if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice < 0) return setError('Invalid price');
    if (!Number.isFinite(parsedSpeed) || !Number.isInteger(parsedSpeed) || parsedSpeed < 0) return setError('Invalid speed');
    if (!Number.isFinite(parsedArmor) || !Number.isInteger(parsedArmor) || parsedArmor < 0) return setError('Invalid armor');

    setBusy(true);
    setError(null);
    try {
      const data = await graphQLFetch<{ updateVehicle: Vehicle }>({
        query: /* GraphQL */ `
          mutation UpdateVehicle(
            $id: ID!
            $campaignId: ID
            $name: String
            $shortDescription: String
            $longDescription: String
            $price: Int
            $speed: Int
            $armor: Int
          ) {
            updateVehicle(
              id: $id
              campaignId: $campaignId
              name: $name
              shortDescription: $shortDescription
              longDescription: $longDescription
              price: $price
              speed: $speed
              armor: $armor
            ) {
              id
              name
              price
              speed
              armor
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
          id: vehicle.id,
          campaignId: campaignId.trim() ? campaignId : null,
          name: trimmedName,
          shortDescription: trimmedShort,
          longDescription: trimmedLong,
          price: parsedPrice,
          speed: parsedSpeed,
          armor: parsedArmor,
        },
      });

      setVehicle(data.updateVehicle);
      setEditing(false);
      resetDrafts(data.updateVehicle);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!vehicle) return;
    if (!vehicle.canEdit) return;
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return;

    setBusy(true);
    setError(null);
    try {
      await graphQLFetch<{ deleteVehicle: boolean }>({
        query: /* GraphQL */ `
          mutation DeleteVehicle($id: ID!) {
            deleteVehicle(id: $id)
          }
        `,
        variables: { id: vehicle.id },
      });
      router.push('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  if (busy && !vehicle) return <p>Loading vehicle…</p>;
  if (error && !vehicle) return <InlineError>{error}</InlineError>;
  if (!vehicle) return <p>Vehicle not found.</p>;

  return (
    <>
      {error ? <InlineError>{error}</InlineError> : null}

      <h3>{vehicle.name}</h3>
      <p>{vehicle.campaign?.name ?? 'No campaign'}</p>

      {vehicle.canEdit ? (
        <p>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  resetDrafts(vehicle);
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
                resetDrafts(vehicle);
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
            Speed
            <input type="number" min={0} step={1} value={speed} onChange={(e) => setSpeed(e.target.value)} disabled={busy} />
          </label>
          <label>
            Armor
            <input type="number" min={0} step={1} value={armor} onChange={(e) => setArmor(e.target.value)} disabled={busy} />
          </label>
        </section>
      ) : (
        <>
          <p>{vehicle.shortDescription}</p>
          <section>
            <h2>Details</h2>
            <ul>
              <li>Price: {vehicle.price}</li>
              <li>Speed: {vehicle.speed}</li>
              <li>Armor: {vehicle.armor}</li>
            </ul>
            <p>{vehicle.longDescription}</p>
          </section>
        </>
      )}
    </>
  );
}
