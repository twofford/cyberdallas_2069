import Link from 'next/link';

import { PageShell } from '../../ui/PageShell';

import { WeaponPageClient } from './weaponPageClient';

export default async function WeaponPage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);

  return (
    <PageShell>
      <section>
        <h2>Weapon</h2>
        <p>
          <Link href="/home">Back to dashboard</Link>
        </p>
        <WeaponPageClient weaponId={params.id} />
      </section>
    </PageShell>
  );
}
