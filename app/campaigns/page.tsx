import Link from 'next/link';

import { RequireAuth } from '../_components/RequireAuth';
import { SessionPanel } from '../_components/SessionPanel';
import { RouteButton } from '../ui/RouteButton';

import { CampaignsClient } from './CampaignsClient';

export default async function CampaignsPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <SessionPanel />

        <section>
          <h2>Campaigns</h2>

          <p>
            <Link href="/home">Back to home</Link>
          </p>

          <p>
            <RouteButton href="/campaigns/new">New campaign</RouteButton>
          </p>

          <CampaignsClient />
        </section>
      </main>
    </RequireAuth>
  );
}
