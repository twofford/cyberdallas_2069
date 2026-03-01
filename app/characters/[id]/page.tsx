import * as React from 'react';

import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { CharacterPageClient } from './CharacterPageClient';

export default async function CharacterPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>Character</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <CharacterPageClient characterId={params.id} />
        </section>
      </main>
    </RequireAuth>
  );
}
