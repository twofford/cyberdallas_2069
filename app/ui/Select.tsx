'use client';

import * as React from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Select(props: {
  label: string;
  ariaLabel?: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const selected = props.options.find((o) => o.value === props.value);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <label>
      {props.label}
      <div data-select-root="true" ref={rootRef}>
        <button
          type="button"
          data-select-trigger="true"
          aria-label={props.ariaLabel ?? props.label}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={props.disabled}
          onClick={() => setOpen((prev) => !prev)}
        >
          {selected?.label ?? 'Select…'}
        </button>

        {open ? (
          <div data-select-listbox="true" role="listbox" aria-label={`${props.label} options`}>
            {props.options.map((o) => {
              const selected = o.value === props.value;
              const disabled = o.disabled === true;
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : 0}
                  data-select-option="true"
                  onClick={() => {
                    if (disabled) return;
                    props.onChange(o.value);
                    setOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      props.onChange(o.value);
                      setOpen(false);
                    }
                  }}
                >
                  {o.label}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </label>
  );
}
