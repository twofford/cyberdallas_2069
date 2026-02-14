import { createYogaServer } from '@/graphql/yoga';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const yoga = createYogaServer();

export async function GET(request: Request) {
  return yoga.fetch(request);
}

export async function POST(request: Request) {
  return yoga.fetch(request);
}
