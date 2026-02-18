import * as React from 'react';

type InlineErrorProps = {
  children: React.ReactNode;
};

export function InlineError(props: InlineErrorProps) {
  return (
    <React.Fragment>
      <p style={{ color: 'crimson' }}>{props.children}</p>
    </React.Fragment>
  );
}
