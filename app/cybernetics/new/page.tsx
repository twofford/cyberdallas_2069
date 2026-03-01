import Link from 'next/link';

import { RequireAuth } from '../../_components/RequireAuth';
import { NewCyberneticPageClient } from './NewCyberneticPageClient';

export default function NewCyberneticPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>New cybernetic</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <NewCyberneticPageClient />
        </section>
      </main>
    </RequireAuth>
  );
}
