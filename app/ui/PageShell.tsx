import * as React from 'react';

type PageShellProps = {
  title?: string;
  children: React.ReactNode;
};

export function PageShell(props: PageShellProps) {
  return (
    <React.Fragment>
      <main style={{ padding: 24 }}>
        <h1>{props.title ?? 'CyberDallas 2069'}</h1>
        {props.children}
      </main>
    </React.Fragment>
  );
}
