import Link from 'next/link';

import { RequireAuth } from '../../RequireAuth';
import { CampaignPageClient } from './CampaignPageClient';

export default async function CampaignPage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);

  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>Campaign</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <CampaignPageClient campaignId={params.id} />
        </section>
      </main>
    </RequireAuth>
  );
}
