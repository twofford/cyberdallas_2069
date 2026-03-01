import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { PageShell } from '../../ui/PageShell';

import { ItemPageClient } from './itemPageClient';

export default async function ItemPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  return (
    <RequireAuth>
      <PageShell>
        <section>
          <h2>Item</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <ItemPageClient itemId={params.id} />
        </section>
      </PageShell>
    </RequireAuth>
  );
}
