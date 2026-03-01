import { createYogaServer } from '@/server/graphql/yoga';

export async function queryServerGraphQL<T>(query: string): Promise<T> {
  const yoga = createYogaServer();
  const response = await yoga.fetch('http://localhost/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || body.errors?.length || !body.data) {
    const message = body.errors?.map((e) => e.message).join('\n') ?? 'Unknown GraphQL error';
    throw new Error(message);
  }

  return body.data;
}
