'use client';

import * as React from 'react';

import { useMe } from './lib/useMe';
import { PageShell } from './ui/PageShell';

export function RequireAuth(props: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<'checking' | 'authed' | 'redirecting'>('checking');
  const { me, loading } = useMe();

  React.useEffect(() => {
    if (loading) {
      setStatus('checking');
      return;
    }
    if (me) {
      setStatus('authed');
      return;
    }
    setStatus('redirecting');
    window.location.assign('/auth');
  }, [loading, me]);

  if (status !== 'authed') {
    return (
      <PageShell>
        <p>{status === 'checking' ? 'Checking session…' : 'Redirecting to sign in…'}</p>
      </PageShell>
    );
  }

  return <>{props.children}</>;
}
