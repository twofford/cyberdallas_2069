import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../../app/_components/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: unknown }) => children,
}));

vi.mock('../../../app/characters/new/NewCharacterPageClient', () => ({
  NewCharacterPageClient: ({ mode }: { mode?: 'character' | 'npc' }) =>
    React.createElement('div', { 'data-testid': 'new-character-page-client' }, mode ?? 'character'),
}));

import NewNpcPage from '../../../app/npcs/new/page';

describe('NewNpcPage', () => {
  it('renders NPC creation page content with npc mode form', () => {
    const html = renderToStaticMarkup(React.createElement(NewNpcPage));

    expect(html).toContain('CyberDallas 2069');
    expect(html).toContain('New NPC');
    expect(html).toContain('Back to dashboard');
    expect(html).toContain('new-character-page-client');
    expect(html).toContain('npc');
  });
});
