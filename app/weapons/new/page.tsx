import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { NewWeaponPageClient } from './NewWeaponPageClient';

export default function NewWeaponPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>New weapon</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <NewWeaponPageClient />
        </section>
      </main>
    </RequireAuth>
  );
}
