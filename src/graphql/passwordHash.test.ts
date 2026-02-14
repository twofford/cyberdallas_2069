import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './auth';

describe('password hashing', () => {
  it('uses legacy scrypt format by default', async () => {
    const originalN = process.env.PASSWORD_SCRYPT_N;
    const originalR = process.env.PASSWORD_SCRYPT_R;
    const originalP = process.env.PASSWORD_SCRYPT_P;

    delete process.env.PASSWORD_SCRYPT_N;
    delete process.env.PASSWORD_SCRYPT_R;
    delete process.env.PASSWORD_SCRYPT_P;

    try {
      const hash = await hashPassword('correct-horse-battery-staple');
      expect(hash.split('$')[0]).toBe('scrypt');
      expect(hash.split('$')).toHaveLength(3);
      await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
      await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
    } finally {
      if (originalN !== undefined) process.env.PASSWORD_SCRYPT_N = originalN;
      else delete process.env.PASSWORD_SCRYPT_N;
      if (originalR !== undefined) process.env.PASSWORD_SCRYPT_R = originalR;
      else delete process.env.PASSWORD_SCRYPT_R;
      if (originalP !== undefined) process.env.PASSWORD_SCRYPT_P = originalP;
      else delete process.env.PASSWORD_SCRYPT_P;
    }
  });

  it('supports parameterized scrypt format (faster for E2E)', async () => {
    const originalN = process.env.PASSWORD_SCRYPT_N;
    const originalR = process.env.PASSWORD_SCRYPT_R;
    const originalP = process.env.PASSWORD_SCRYPT_P;

    process.env.PASSWORD_SCRYPT_N = '1024';
    process.env.PASSWORD_SCRYPT_R = '8';
    process.env.PASSWORD_SCRYPT_P = '1';

    try {
      const hash = await hashPassword('correct-horse-battery-staple');
      expect(hash.split('$')[0]).toBe('scrypt');
      expect(hash.split('$')).toHaveLength(4);
      await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
      await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
    } finally {
      if (originalN !== undefined) process.env.PASSWORD_SCRYPT_N = originalN;
      else delete process.env.PASSWORD_SCRYPT_N;
      if (originalR !== undefined) process.env.PASSWORD_SCRYPT_R = originalR;
      else delete process.env.PASSWORD_SCRYPT_R;
      if (originalP !== undefined) process.env.PASSWORD_SCRYPT_P = originalP;
      else delete process.env.PASSWORD_SCRYPT_P;
    }
  });
});
