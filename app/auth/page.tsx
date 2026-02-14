import * as React from 'react';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { verifyAuthToken } from '@/graphql/auth';

import { AuthPageClient } from './AuthPageClient';

export default async function AuthPage() {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    const cookieStore = await cookies();
    const token = cookieStore.get('cyberdallasSession')?.value ?? null;
    if (token) {
      const userId = verifyAuthToken(token, secret);
      if (userId) redirect('/home');
    }
  }

  return <AuthPageClient />;
}
