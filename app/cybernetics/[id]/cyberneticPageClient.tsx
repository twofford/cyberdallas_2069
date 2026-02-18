'use client';

import { useEntityFromListQuery } from '../../lib/useEntityFromListQuery';
import { InlineError } from '../../ui/InlineError';

type Cybernetic = {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  batteryLife: number;
  statBonuses: Array<{ stat: string; amount: number }>;
  skillBonuses: Array<{ name: string; amount: number }>;
};

export function CyberneticPageClient(props: { cyberneticId: string }) {
  const { entity: cybernetic, busy, error } = useEntityFromListQuery<Cybernetic, { cybernetics: Cybernetic[] }>({
    id: props.cyberneticId,
    query: /* GraphQL */ `
      query CyberneticDetail {
        cybernetics {
          id
          name
          shortDescription
          longDescription
          price
          batteryLife
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
    select: (data) => data.cybernetics,
  });

  if (busy) return <p>Loading cybernetic…</p>;
  if (error) return <InlineError>{error}</InlineError>;
  if (!cybernetic) return <p>Cybernetic not found.</p>;

  return (
    <>
      <h3>{cybernetic.name}</h3>
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
  );
}
