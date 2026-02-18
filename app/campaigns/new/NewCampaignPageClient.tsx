'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { graphqlFetch as graphQLFetch } from '../../lib/graphqlFetch';
import { Notices, TooltipNotice, useNotices } from '../../ui/notices';

type CreateCampaignMutation = { createCampaign: { id: string } };

export function NewCampaignPageClient() {
  const router = useRouter();
  const notices = useNotices();

  const [name, setName] = React.useState('');
  const [startingMoney, setStartingMoney] = React.useState('0');
  const [busy, setBusy] = React.useState(false);
  const [createTooltipError, setCreateTooltipError] = React.useState<string | null>(null);

  function parseStartingMoney(input: string): number | undefined {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.max(0, parsed);
  }

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    notices.clear();
    setCreateTooltipError(null);

    try {
      await graphQLFetch<CreateCampaignMutation>({
        query: /* GraphQL */ `
          mutation CreateCampaign($name: String!, $startingMoney: Int) {
            createCampaign(name: $name, startingMoney: $startingMoney) {
              id
            }
          }
        `,
        variables: {
          name: trimmed,
          startingMoney: parseStartingMoney(startingMoney),
        },
      });

      router.push('/home');
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed';
      setCreateTooltipError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onCreate();
      }}
    >
      <Notices notices={notices.notices} onDismiss={notices.remove} />

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
      </label>

      <label>
        Starting money
        <input
          type="number"
          min={0}
          value={startingMoney}
          onChange={(e) => setStartingMoney(e.target.value)}
          disabled={busy}
        />
      </label>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '100%',
          flexWrap: 'wrap',
          marginTop: 12,
        }}
      >
        <button
          type="submit"
          aria-label="Create campaign"
          disabled={busy || !name.trim()}
          onClick={() => setCreateTooltipError(null)}
          style={{ flex: '0 0 auto' }}
        >
          {busy ? 'Creating…' : 'Create campaign'}
        </button>
        <TooltipNotice message={createTooltipError} />
      </div>
    </form>
  );
}
