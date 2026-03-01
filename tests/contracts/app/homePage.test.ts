import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
  }),
}));

vi.mock('@/server/graphql/yoga', () => ({
  createYogaServer: () => ({
    fetch: async () =>
      new Response(
        JSON.stringify({
          data: {
            cybernetics: [{ id: 'cy_1', name: 'Neural Accelerator' }],
            weapons: [{ id: 'wp_1', name: 'Rail Pistol' }],
            items: [{ id: 'it_1', name: 'Medkit' }],
            vehicles: [{ id: 'vh_1', name: 'Street Bike' }],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      ),
  }),
}));

vi.mock('../../../app/_components/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: unknown }) => children,
}));

vi.mock('../../../app/_components/SessionPanel', () => ({
  SessionPanel: () => null,
}));

vi.mock('../../../app/_components/PrivateCampaignsAndCharacters', () => ({
  PrivateCampaignsAndCharacters: () => null,
}));

import HomePage from '../../../app/home/page';

describe('HomePage', () => {
  it('renders private and public sections', async () => {
    const element = await HomePage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('CyberDallas 2069');
    expect(html).toContain('Cybernetics');
    expect(html).toContain('Weapons');
    expect(html).toContain('Items');
    expect(html).toContain('Vehicles');
  });

  it('renders catalog create and view actions as buttons, without inline catalog lists', async () => {
    const element = await HomePage();
    const html = renderToStaticMarkup(element);

    expect(html).toMatch(/<button[^>]*>New cybernetic<\/button>/);
    expect(html).toMatch(/<button[^>]*>View cybernetics<\/button>/);
    expect(html).toMatch(/<button[^>]*>New weapon<\/button>/);
    expect(html).toMatch(/<button[^>]*>View weapons<\/button>/);
    expect(html).toMatch(/<button[^>]*>New item<\/button>/);
    expect(html).toMatch(/<button[^>]*>View items<\/button>/);
    expect(html).toMatch(/<button[^>]*>New vehicle<\/button>/);
    expect(html).toMatch(/<button[^>]*>View vehicles<\/button>/);

    expect(html).not.toContain('Neural Accelerator');
    expect(html).not.toContain('Rail Pistol');
    expect(html).not.toContain('Medkit');
    expect(html).not.toContain('Street Bike');
  });
});
