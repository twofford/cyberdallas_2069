'use client';

import { useEntityFromListQuery } from '../../lib/useEntityFromListQuery';
import { InlineError } from '../../ui/InlineError';

type Item = {
  id: string;
  name: string;
  price: number;
  weight: number;
  type: string;
  shortDescription: string;
  longDescription: string;
};

export function ItemPageClient(props: { itemId: string }) {
  const { entity: item, busy, error } = useEntityFromListQuery<Item, { items: Item[] }>({
    id: props.itemId,
    query: /* GraphQL */ `
      query ItemDetail {
        items {
          id
          name
          price
          weight
          type
          shortDescription
          longDescription
        }
      }
    `,
    select: (data) => data.items,
  });

  if (busy) return <p>Loading item…</p>;
  if (error) return <InlineError>{error}</InlineError>;
  if (!item) return <p>Item not found.</p>;

  return (
    <>
      <h3>{item.name}</h3>
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
  );
}
