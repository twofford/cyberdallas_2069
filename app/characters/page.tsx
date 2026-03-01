import Link from 'next/link';

import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { RouteButton } from '../ui/RouteButton';

import { CharactersClient } from './CharactersClient';

export default async function CharactersPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <SessionPanel />

        <section>
          <h2>Characters</h2>

          <p>
            <Link href="/home">Back to home</Link>
          </p>

          <p>
            <RouteButton href="/characters/new">New character</RouteButton>
          </p>

          <CharactersClient />
        </section>
      </main>
    </RequireAuth>
  );
}
