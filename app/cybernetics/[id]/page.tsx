import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { PageShell } from '../../ui/PageShell';

import { CyberneticPageClient } from './cyberneticPageClient';

export default async function CyberneticPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  return (
    <RequireAuth>
      <PageShell>
        <section>
          <h2>Cybernetic</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <CyberneticPageClient cyberneticId={params.id} />
        </section>
      </PageShell>
    </RequireAuth>
  );
}
