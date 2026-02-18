'use client';

import { useEntityFromListQuery } from '../../lib/useEntityFromListQuery';
import { InlineError } from '../../ui/InlineError';

type Vehicle = {
  id: string;
  name: string;
  price: number;
  speed: number;
  armor: number;
  shortDescription: string;
  longDescription: string;
};

export function VehiclePageClient(props: { vehicleId: string }) {
  const { entity: vehicle, busy, error } = useEntityFromListQuery<Vehicle, { vehicles: Vehicle[] }>({
    id: props.vehicleId,
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
    select: (data) => data.vehicles,
  });

  if (busy) return <p>Loading vehicle…</p>;
  if (error) return <InlineError>{error}</InlineError>;
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
