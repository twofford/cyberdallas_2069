import * as React from 'react';

import Link from 'next/link';

import { ItemPageClient } from './itemPageClient';

export default async function ItemPage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);

  return (
    <main style={{ padding: 24 }}>
      <h1>CyberDallas 2069</h1>

      <section>
        <h2>Item</h2>
        <p>
          <Link href="/home">Back to dashboard</Link>
        </p>
        <ItemPageClient itemId={params.id} />
      </section>
    </main>
  );
}
