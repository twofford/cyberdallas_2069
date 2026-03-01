import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { NewVehiclePageClient } from './NewVehiclePageClient';

export default function NewVehiclePage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>New vehicle</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <NewVehiclePageClient />
        </section>
      </main>
    </RequireAuth>
  );
}
