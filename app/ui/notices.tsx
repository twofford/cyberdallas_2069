'use client';

import * as React from 'react';

export type NoticeKind = 'error' | 'warning' | 'info';

export type Notice = {
  id: string;
  kind: NoticeKind;
  message: string;
};

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useNotices() {
  const [notices, setNotices] = React.useState<Notice[]>([]);

  const clear = React.useCallback(() => setNotices([]), []);

  const push = React.useCallback((kind: NoticeKind, message: string) => {
    setNotices((prev) => [...prev, { id: randomId(), kind, message }]);
  }, []);

  const pushError = React.useCallback((message: string) => push('error', message), [push]);
  const pushWarning = React.useCallback((message: string) => push('warning', message), [push]);
  const pushInfo = React.useCallback((message: string) => push('info', message), [push]);

  const remove = React.useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const setFromError = React.useCallback(
    (err: unknown, fallbackMessage = 'Request failed') => {
      const message = err instanceof Error ? err.message : fallbackMessage;
      setNotices([{ id: randomId(), kind: 'error', message }]);
    },
    [],
  );

  return {
    notices,
    clear,
    push,
    pushError,
    pushWarning,
    pushInfo,
    remove,
    setFromError,
  };
}

export function Notices(props: { notices: Notice[]; onDismiss?: (id: string) => void }) {
  const hasErrors = props.notices.some((n) => n.kind === 'error');
  if (!props.notices.length) return null;

  return (
    <div
      role={hasErrors ? 'alert' : undefined}
      aria-live={hasErrors ? 'assertive' : 'polite'}
      style={{
        border: '1px solid color-mix(in srgb, CanvasText 25%, transparent)',
        padding: '10px 12px',
        margin: '10px 0',
      }}
    >
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {props.notices.map((n) => (
          <li
            key={n.id}
            style={{
              color: n.kind === 'error' ? 'crimson' : undefined,
              margin: 0,
              paddingLeft: 0,
              listStyle: 'disc',
            }}
          >
            {n.message}{' '}
            {props.onDismiss ? (
              <button
                type="button"
                data-icon-button="true"
                aria-label="Dismiss message"
                title="Dismiss"
                onClick={() => props.onDismiss?.(n.id)}
                style={{
                  marginTop: 0,
                  marginLeft: 8,
                  width: 18,
                  height: 18,
                  padding: 0,
                  lineHeight: 1,
                  display: 'inline-grid',
                  placeItems: 'center',
                  verticalAlign: 'middle',
                }}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TooltipNotice(props: { message: string | null; kind?: NoticeKind }) {
  if (!props.message) return null;
  const kind: NoticeKind = props.kind ?? 'error';

  return (
    <div
      role={kind === 'error' ? 'alert' : undefined}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      style={{
        flex: '1 1 320px',
        minWidth: 0,
        maxWidth: '100%',
        padding: '10px 12px',
        border: '1px solid color-mix(in srgb, CanvasText 25%, transparent)',
        background: 'Canvas',
        color: kind === 'error' ? 'crimson' : 'CanvasText',
        fontSize: 14,
        lineHeight: 1.2,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
      }}
    >
      {props.message}
    </div>
  );
}
