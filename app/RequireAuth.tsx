'use client';

import * as React from 'react';

type AuthUser = { id: string; email: string };

async function graphQLFetch<T>(input: { query: string; variables?: Record<string, unknown> }): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: input.query, variables: input.variables }),
  });

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || body.errors?.length || !body.data) {
    const message = body.errors?.map((e) => e.message).join('\n') ?? 'Request failed';
    throw new Error(message);
  }
  return body.data;
}

export function RequireAuth(props: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<'checking' | 'authed' | 'redirecting'>('checking');

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await graphQLFetch<{ me: AuthUser | null }>({
          query: /* GraphQL */ `
            query Me {
              me {
                id
                email
              }
            }
          `,
        });

        if (cancelled) return;
        if (data.me) {
          setStatus('authed');
          return;
        }
        setStatus('redirecting');
        window.location.assign('/auth');
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Request failed';
        if (/not authenticated/i.test(message)) {
          setStatus('redirecting');
          window.location.assign('/auth');
          return;
        }
        setStatus('redirecting');
        window.location.assign('/auth');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== 'authed') {
    return (
      <main style={{ padding: 24 }}>
        <h1>CyberDallas 2069</h1>
        <p>{status === 'checking' ? 'Checking session…' : 'Redirecting to sign in…'}</p>
      </main>
    );
  }

  return <>{props.children}</>;
}
