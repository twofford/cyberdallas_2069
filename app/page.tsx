import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { verifyAuthToken } from '@/graphql/auth';

export default async function IndexPage() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) redirect('/auth');

  const cookieStore = await cookies();
  const token = cookieStore.get('cyberdallasSession')?.value ?? null;
  if (!token) redirect('/auth');

  const userId = verifyAuthToken(token, secret);
  if (!userId) redirect('/auth');

  redirect('/home');
}
