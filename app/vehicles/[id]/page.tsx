import Link from 'next/link';

import { PageShell } from '../../ui/PageShell';

import { VehiclePageClient } from './vehiclePageClient';

export default async function VehiclePage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);

  return (
    <PageShell>
      <section>
        <h2>Vehicle</h2>
        <p>
          <Link href="/home">Back to dashboard</Link>
        </p>
        <VehiclePageClient vehicleId={params.id} />
      </section>
    </PageShell>
  );
}
