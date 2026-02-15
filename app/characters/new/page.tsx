import Link from 'next/link';

import { RequireAuth } from '../../RequireAuth';
import { NewCharacterPageClient } from './NewCharacterPageClient';

export default function NewCharacterPage() {
  return (
    <RequireAuth>
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>

        <section>
          <h2>New character</h2>
          <p>
            <Link href="/home">Back to dashboard</Link>
          </p>
          <NewCharacterPageClient />
        </section>
      </main>
    </RequireAuth>
  );
}
