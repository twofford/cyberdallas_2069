import * as React from 'react';

import Link from 'next/link';

import { VehiclePageClient } from './vehiclePageClient';

export default async function VehiclePage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);

  return (
    <main style={{ padding: 24 }}>
      <h1>CyberDallas 2069</h1>

      <section>
        <h2>Vehicle</h2>
        <p>
          <Link href="/home">Back to dashboard</Link>
        </p>
        <VehiclePageClient vehicleId={params.id} />
      </section>
    </main>
  );
}
