import * as React from 'react';
import type { ReactNode } from 'react';

import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body data-ui="cyberdallas">{children}</body>
    </html>
  );
}
