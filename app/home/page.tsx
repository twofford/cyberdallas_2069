import * as React from 'react';

import { PrivateCampaignsAndCharacters } from '../_components/PrivateCampaignsAndCharacters';
import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { RouteButton } from '../ui/RouteButton';

export default async function HomePage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <SessionPanel />

        <PrivateCampaignsAndCharacters />

        <section>
          <h2>Cybernetics</h2>
          <p>
            <RouteButton href="/cybernetics/new">New cybernetic</RouteButton>{' '}
            <RouteButton href="/cybernetics">View cybernetics</RouteButton>
          </p>
        </section>

        <section>
          <h2>Weapons</h2>
          <p>
            <RouteButton href="/weapons/new">New weapon</RouteButton>{' '}
            <RouteButton href="/weapons">View weapons</RouteButton>
          </p>
        </section>

        <section>
          <h2>Items</h2>
          <p>
            <RouteButton href="/items/new">New item</RouteButton>{' '}
            <RouteButton href="/items">View items</RouteButton>
          </p>
        </section>

        <section>
          <h2>Vehicles</h2>
          <p>
            <RouteButton href="/vehicles/new">New vehicle</RouteButton>{' '}
            <RouteButton href="/vehicles">View vehicles</RouteButton>
          </p>
        </section>
      </main>
    </RequireAuth>
  );
}
