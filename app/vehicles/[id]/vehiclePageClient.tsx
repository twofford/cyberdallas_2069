'use client';

import * as React from 'react';

type Vehicle = {
  id: string;
  name: string;
  price: number;
  speed: number;
  armor: number;
  shortDescription: string;
  longDescription: string;
};

async function graphQLFetch<T>(input: { query: string; variables?: Record<string, unknown> }): Promise<T> {
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

export function VehiclePageClient(props: { vehicleId: string }) {
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{ vehicles: Vehicle[] }>({
          query: /* GraphQL */ `
            query VehicleDetail {
              vehicles {
                id
                name
                price
                speed
                armor
                shortDescription
                longDescription
              }
            }
          `,
        });

        if (cancelled) return;
        setVehicle(data.vehicles.find((v) => v.id === props.vehicleId) ?? null);
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
  }, [props.vehicleId]);

  if (busy) return <p>Loading vehicle…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!vehicle) return <p>Vehicle not found.</p>;

  return (
    <>
      <h3>{vehicle.name}</h3>
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
  );
}
