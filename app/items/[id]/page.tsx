import Link from 'next/link';

import { PageShell } from '../../ui/PageShell';

import { ItemPageClient } from './itemPageClient';

export default async function ItemPage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);

  return (
    <PageShell>
      <section>
        <h2>Item</h2>
        <p>
          <Link href="/home">Back to dashboard</Link>
        </p>
        <ItemPageClient itemId={params.id} />
      </section>
    </PageShell>
  );
}
