'use client';

import * as React from 'react';

import { graphqlFetch } from './graphqlFetch';
import { ME_QUERY } from './graphqlQueries';

export type AuthUser = { id: string; email: string };

type MeData = { me: AuthUser | null };

type UseMeResult = {
  me: AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: (options?: { signal?: AbortSignal }) => Promise<void>;
};

export function useMe(): UseMeResult {
  const [me, setMe] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);

  const refresh = React.useCallback(async (options?: { signal?: AbortSignal }) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await graphqlFetch<MeData>({ query: ME_QUERY, signal: options?.signal });
      if (requestId !== requestIdRef.current) return;
      setMe(data.me);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      const message = e instanceof Error ? e.message : 'Request failed';
      setMe(null);
      setError(message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const onChanged = () => {
      refresh();
    };

    window.addEventListener('authTokenChanged', onChanged);
    return () => {
      window.removeEventListener('authTokenChanged', onChanged);
    };
  }, [refresh]);

  return { me, loading, error, refresh };
}
