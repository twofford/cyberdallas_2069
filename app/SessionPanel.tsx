'use client';

import * as React from 'react';

import { graphqlFetch as graphQLFetch } from './lib/graphqlFetch';
import { LOGOUT_MUTATION } from './lib/graphqlQueries';
import { useMe } from './lib/useMe';

export function SessionPanel() {
  const { me } = useMe();
  const [busy, setBusy] = React.useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await graphQLFetch<{ logout: boolean }>({
        query: LOGOUT_MUTATION,
      });
    } catch {
      // Best-effort.
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event('authTokenChanged'));
      window.location.assign('/auth');
    }
  }

  return (
    <section>
      <h2>Session</h2>
      <p>{me ? `Signed in as: ${me.email}` : 'Signed in.'}</p>
      <button type="button" onClick={signOut} disabled={busy}>
        Sign out
      </button>
    </section>
  );
}
