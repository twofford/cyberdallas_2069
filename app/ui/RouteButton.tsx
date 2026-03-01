'use client';

import * as React from 'react';

type RouteButtonProps = {
  href: string;
  children: React.ReactNode;
};

export function RouteButton({ href, children }: RouteButtonProps) {
  return (
    <button type="button" onClick={() => window.location.assign(href)}>
      {children}
    </button>
  );
}
