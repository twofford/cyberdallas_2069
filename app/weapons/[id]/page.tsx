import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { PageShell } from '../../ui/PageShell';

import { WeaponPageClient } from './weaponPageClient';

export default async function WeaponPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  return (
    <RequireAuth>
      <PageShell>
        <section>
          <h2>Weapon</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <WeaponPageClient weaponId={params.id} />
        </section>
      </PageShell>
    </RequireAuth>
  );
}
