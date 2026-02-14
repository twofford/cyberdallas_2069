import { describe, expect, it } from 'vitest';

import { issueAuthToken, verifyAuthToken } from './auth';

describe('auth tokens', () => {
  it('expires tokens based on exp', () => {
    const secret = 'test-secret';

    const token = issueAuthToken('user_1', secret, 10, 0);

    expect(verifyAuthToken(token, secret, 1)).toBe('user_1');
    expect(verifyAuthToken(token, secret, 9)).toBe('user_1');

    expect(verifyAuthToken(token, secret, 10)).toBeNull();
    expect(verifyAuthToken(token, secret, 999)).toBeNull();
  });
});
