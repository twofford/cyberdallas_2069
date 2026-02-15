import * as React from 'react';

import Link from 'next/link';

import { RequireAuth } from '../../RequireAuth';
import { CharacterPageClient } from './CharacterPageClient';

export default async function CharacterPage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);
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
