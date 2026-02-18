import Link from 'next/link';

import { PageShell } from '../../ui/PageShell';

import { CyberneticPageClient } from './cyberneticPageClient';

export default async function CyberneticPage(props: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await Promise.resolve(props.params);

  return (
    <PageShell>
      <section>
        <h2>Cybernetic</h2>
        <p>
          <Link href="/home">Back to dashboard</Link>
        </p>
        <CyberneticPageClient cyberneticId={params.id} />
      </section>
    </PageShell>
  );
}
