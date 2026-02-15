'use client';

import * as React from 'react';

type AuthUser = { id: string; email: string };

async function graphQLFetch<T>(input: {
  query: string;
  variables?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'include',
    signal: input.signal,
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

export function AuthPanel(props: { onAuthed?: (user: AuthUser) => void } = {}) {
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [registerEmail, setRegisterEmail] = React.useState('');
  const [registerPassword, setRegisterPassword] = React.useState('');
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [me, setMe] = React.useState<AuthUser | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const bootstrapControllerRef = React.useRef<AbortController | null>(null);
  const hasAttemptedAuthRef = React.useRef(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    bootstrapControllerRef.current = controller;

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
          signal: controller.signal,
        });
        if (cancelled) return;
        if (hasAttemptedAuthRef.current) return;
        setMe(data.me);
        if (data.me) props.onAuthed?.(data.me);
      } catch (e) {
        if (cancelled) return;
        if (controller.signal.aborted) return;
        if (hasAttemptedAuthRef.current) return;
        const message = e instanceof Error ? e.message : 'Request failed';
        if (/not authenticated/i.test(message)) {
          setMe(null);
          setError(null);
          return;
        }
        setMe(null);
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [props.onAuthed]);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    hasAttemptedAuthRef.current = true;
    bootstrapControllerRef.current?.abort();
    setBusy(true);
    setError(null);
    try {
      const data = await graphQLFetch<{ register: { user: AuthUser } }>({
        query: /* GraphQL */ `
          mutation Register($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user {
                id
                email
              }
            }
          }
        `,
        variables: { email: registerEmail, password: registerPassword },
      });
      setMe(data.register.user);
      window.dispatchEvent(new Event('authTokenChanged'));
      props.onAuthed?.(data.register.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    hasAttemptedAuthRef.current = true;
    bootstrapControllerRef.current?.abort();
    setBusy(true);
    setError(null);
    try {
      const data = await graphQLFetch<{ login: { user: AuthUser } }>({
        query: /* GraphQL */ `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              user {
                id
                email
              }
            }
          }
        `,
        variables: { email: loginEmail, password: loginPassword },
      });
      setMe(data.login.user);
      window.dispatchEvent(new Event('authTokenChanged'));
      props.onAuthed?.(data.login.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await graphQLFetch<{ logout: boolean }>({
        query: /* GraphQL */ `
          mutation Logout {
            logout
          }
        `,
      });
    } catch {
      // Best-effort: even if the request fails, clear local UI state.
    } finally {
      hasAttemptedAuthRef.current = false;
      setMe(null);
      setBusy(false);
      window.dispatchEvent(new Event('authTokenChanged'));
    }
  }

  function switchMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setError(null);
  }

  return (
    <section data-auth-hydrated={hydrated ? 'true' : 'false'} data-auth-mode={mode}>
      <h2>Auth</h2>
      {me ? <p>Signed in as: {me.email}</p> : <p>Not signed in.</p>}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      {me ? (
        <button type="button" onClick={handleSignOut} disabled={busy}>
          Sign out
        </button>
      ) : null}

      <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        {!me && mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <h3>Login</h3>
            <label>
              Email
              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                type="email"
                required
                style={{ display: 'block', width: '100%' }}
              />
            </label>
            <label>
              Password
              <input
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                type="password"
                required
                style={{ display: 'block', width: '100%' }}
              />
            </label>
            <button type="submit" disabled={busy || !hydrated} aria-label="Login">
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              disabled={busy}
              aria-label="Switch to register"
            >
              Switch to register
            </button>
          </form>
        ) : null}

        {!me && mode === 'register' ? (
          <form onSubmit={handleRegister}>
            <h3>Register</h3>
            <label>
              Email
              <input
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                type="email"
                required
                style={{ display: 'block', width: '100%' }}
              />
            </label>
            <label>
              Password
              <input
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                type="password"
                required
                style={{ display: 'block', width: '100%' }}
              />
            </label>
            <button type="submit" disabled={busy || !hydrated} aria-label="Register">
              Register
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              disabled={busy}
              aria-label="Switch to login"
            >
              Switch to login
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
