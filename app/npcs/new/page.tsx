import * as React from 'react';
import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { NewCharacterPageClient } from '../../characters/new/NewCharacterPageClient';

export default function NewNpcPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>New NPC</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <NewCharacterPageClient mode="npc" />
        </section>
      </main>
    </RequireAuth>
  );
}
