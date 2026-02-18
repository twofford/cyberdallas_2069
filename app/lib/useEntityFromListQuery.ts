'use client';

import * as React from 'react';

import { graphqlFetch } from './graphqlFetch';

type UseEntityFromListQueryParams<TEntity extends { id: string }, TData> = {
  id: string;
  query: string;
  variables?: Record<string, unknown>;
  select: (data: TData) => TEntity[];
};

type UseEntityFromListQueryResult<TEntity> = {
  entity: TEntity | null;
  busy: boolean;
  error: string | null;
};

export function useEntityFromListQuery<TEntity extends { id: string }, TData>(
  params: UseEntityFromListQueryParams<TEntity, TData>,
): UseEntityFromListQueryResult<TEntity> {
  const [entity, setEntity] = React.useState<TEntity | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const selectRef = React.useRef(params.select);

  React.useEffect(() => {
    selectRef.current = params.select;
  }, [params.select]);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphqlFetch<TData>({ query: params.query, variables: params.variables });
        if (cancelled) return;
        const list = selectRef.current(data);
        setEntity(list.find((i) => i.id === params.id) ?? null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setEntity(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id, params.query, params.variables]);

  return { entity, busy, error };
}
