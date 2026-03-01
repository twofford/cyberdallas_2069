import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { PageShell } from '../../ui/PageShell';

import { VehiclePageClient } from './vehiclePageClient';

export default async function VehiclePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  return (
    <RequireAuth>
      <PageShell>
        <section>
          <h2>Vehicle</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <VehiclePageClient vehicleId={params.id} />
        </section>
      </PageShell>
    </RequireAuth>
  );
}
