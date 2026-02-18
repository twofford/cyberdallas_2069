export type GraphQLFetchInput = {
  query: string;
  variables?: Record<string, unknown>;
  signal?: AbortSignal;
};

export async function graphqlFetch<T>(input: GraphQLFetchInput): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'include',
    signal: input.signal,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: input.query, variables: input.variables }),
  });

  let body: { data?: T; errors?: Array<{ message: string }> } | null = null;
  try {
    body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  } catch {
    // Intentionally fall through.
  }

  if (!response.ok || body?.errors?.length || !body?.data) {
    const message = body?.errors?.map((e) => e.message).join('\n') ?? 'Request failed';
    throw new Error(message);
  }

  return body.data;
}
