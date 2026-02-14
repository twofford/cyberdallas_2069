'use client';

import * as React from 'react';

import { AuthPanel } from '../AuthPanel';

export function AuthPageClient() {
  return (
    <main style={{ padding: 24 }}>
      <h1>CyberDallas 2069</h1>
      <AuthPanel onAuthed={() => window.location.assign('/home')} />
    </main>
  );
}
