import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { NewItemPageClient } from './NewItemPageClient';

export default function NewItemPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>New item</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <NewItemPageClient />
        </section>
      </main>
    </RequireAuth>
  );
}
