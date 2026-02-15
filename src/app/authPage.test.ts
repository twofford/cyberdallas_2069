import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

let cookieValue: string | undefined;

vi.mock('next/headers', () => {
  return {
    cookies: async () => ({
      get: () => (cookieValue ? { value: cookieValue } : undefined),
    }),
  };
});

vi.mock('next/navigation', () => {
  return {
    redirect: (url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    },
  };
});

vi.mock('@/graphql/auth', () => {
  return {
    verifyAuthToken: vi.fn(() => null),
  };
});

function setCookieValue(value: string | null) {
  cookieValue = value ?? undefined;
}

describe('AuthPage', () => {
  it('renders the login form by default with a toggle to register', async () => {
    process.env.AUTH_SECRET = 'test-secret';
    setCookieValue(null);

    const { default: AuthPage } = await import('../../app/auth/page');
    const element = await AuthPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('CyberDallas 2069');
    expect(html).toContain('Login');
    expect(html).toContain('Switch to register');
    expect(html).not.toContain('<h3>Register</h3>');
  });

  it('redirects to /home when already signed in', async () => {
    process.env.AUTH_SECRET = 'test-secret';

    setCookieValue('session-token');

    const auth = await import('@/graphql/auth');
    vi.mocked(auth.verifyAuthToken).mockReturnValueOnce('user_1');

    const { default: AuthPage } = await import('../../app/auth/page');
    await expect(AuthPage()).rejects.toThrow('NEXT_REDIRECT:/home');
  });
});
