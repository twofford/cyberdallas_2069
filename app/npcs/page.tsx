import * as React from 'react';
import Link from 'next/link';

import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { NpcsClient } from './NpcsClient';

export default async function NpcsPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <SessionPanel />

        <p>
          <Link href="/home">Back to home</Link>
        </p>

        <NpcsClient />
      </main>
    </RequireAuth>
  );
}
