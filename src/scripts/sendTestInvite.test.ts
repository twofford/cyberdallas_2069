import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// TODO: create src/scripts/sendTestInvite.ts
import { runSendTestInvite } from './sendTestInvite';

type FetchCall = {
  url: string;
  init: RequestInit;
};

function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function jsonResponseWithHeaders(body: unknown, headers: Record<string, string>, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('runSendTestInvite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('registers/logs in, joins campaign, and creates an invite', async () => {
    const calls: FetchCall[] = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });

      const bodyText = String((init?.body as string) ?? '');
      const parsed = bodyText ? (JSON.parse(bodyText) as any) : {};
      const query: string = parsed.query ?? '';

      if (query.includes('mutation Login')) {
        // Force the script down the register path first.
        return jsonResponse({ data: null, errors: [{ message: 'Invalid credentials' }] });
      }

      if (query.includes('mutation Register')) {
        return jsonResponseWithHeaders(
          {
            data: {
              register: {
                user: { id: 'u_1', email: 'owner@example.com' },
              },
            },
          },
          { 'set-cookie': 'cyberdallasSession=session_cookie_value; Path=/; HttpOnly; SameSite=Lax' },
        );
      }

      if (query.includes('joinCampaign')) {
        return jsonResponse({ data: { joinCampaign: { id: 'camp_1' } } });
      }

      if (query.includes('mutation CreateInvite')) {
        return jsonResponse({
          data: {
            createCampaignInvite: { token: 'invite_token_123', expiresAt: '2099-01-01T00:00:00.000Z' },
          },
        });
      }

      return jsonResponse({ data: null, errors: [{ message: 'Unexpected query' }] }, 400);
    });

    // @ts-expect-error - overriding global fetch for test
    globalThis.fetch = fetchMock;

    const result = await runSendTestInvite({
      graphqlUrl: 'http://localhost:3001/api/graphql',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password1234!',
      campaignId: 'camp_1',
      inviteEmail: 'invitee@example.com',
    });

    expect(result).toEqual({
      inviteToken: 'invite_token_123',
      expiresAt: '2099-01-01T00:00:00.000Z',
    });

    // Basic sanity: correct endpoint and auth headers used for join + invite.
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls.every((c) => c.url === 'http://localhost:3001/api/graphql')).toBe(true);

    const joinCall = calls.find((c) => String(c.init.body ?? '').includes('joinCampaign'))!;
    expect((joinCall.init.headers as Record<string, string>).cookie).toBe('cyberdallasSession=session_cookie_value');
    expect((joinCall.init.headers as Record<string, string>).origin).toBe('http://localhost:3001');

    const inviteCall = calls.find((c) => String(c.init.body ?? '').includes('mutation CreateInvite'))!;
    expect((inviteCall.init.headers as Record<string, string>).cookie).toBe('cyberdallasSession=session_cookie_value');
    expect((inviteCall.init.headers as Record<string, string>).origin).toBe('http://localhost:3001');

    const inviteParsed = JSON.parse(String(inviteCall.init.body)) as any;
    expect(inviteParsed.variables).toEqual({ campaignId: 'camp_1', email: 'invitee@example.com' });
  });
});
