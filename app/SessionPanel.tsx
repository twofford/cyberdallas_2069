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

export function SessionPanel() {
  const [me, setMe] = React.useState<AuthUser | null>(null);
  const [busy, setBusy] = React.useState(false);

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
        if (!cancelled) setMe(data.me);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await graphQLFetch<{ logout: boolean }>({
        query: /* GraphQL */ `
          mutation Logout {
            logout
          }
        `,
      });
    } catch {
      // Best-effort.
    } finally {
      setMe(null);
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
