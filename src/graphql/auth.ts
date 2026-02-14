import crypto from 'node:crypto';

export function isValidEmail(email: string): boolean {
  // Intentionally simple (no DNS/MX checks) for app-level validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type ScryptParams = { N: number; r: number; p: number };

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}

function getScryptParamsFromEnv(): ScryptParams | null {
  const n = parsePositiveInt(process.env.PASSWORD_SCRYPT_N);
  const r = parsePositiveInt(process.env.PASSWORD_SCRYPT_R);
  const p = parsePositiveInt(process.env.PASSWORD_SCRYPT_P);

  if (n === null && r === null && p === null) return null;

  return {
    N: n ?? 16384,
    r: r ?? 8,
    p: p ?? 1,
  };
}

function serializeScryptParams(params: ScryptParams): string {
  return `N=${params.N},r=${params.r},p=${params.p}`;
}

function parseScryptParams(serialized: string): ScryptParams | null {
  const parts = serialized.split(',').map((p) => p.trim());
  const kv: Record<string, string> = {};
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) kv[key] = value;
  }

  const N = parsePositiveInt(kv.N);
  const r = parsePositiveInt(kv.r);
  const p = parsePositiveInt(kv.p);
  if (N === null || r === null || p === null) return null;
  return { N, r, p };
}

function scryptAsync(password: string, salt: Buffer, keylen: number, params: ScryptParams | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const callback = (err: NodeJS.ErrnoException | null, derivedKey: unknown) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    };

    if (!params) {
      crypto.scrypt(password, salt, keylen, callback);
      return;
    }

    const options: crypto.ScryptOptions = { N: params.N, r: params.r, p: params.p };
    crypto.scrypt(password, salt, keylen, options, callback);
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const params = getScryptParamsFromEnv();
  const hash = await scryptAsync(password, salt, 32, params);

  if (!params) {
    return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
  }

  return `scrypt$${serializeScryptParams(params)}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const parts = passwordHash.split('$');

  if (parts[0] !== 'scrypt') return false;

  let params: ScryptParams | null = null;
  let saltPart: string | undefined;
  let expectedPart: string | undefined;

  if (parts.length === 3) {
    // Legacy format: scrypt$<salt>$<hash>
    saltPart = parts[1];
    expectedPart = parts[2];
  } else if (parts.length === 4) {
    // Parameterized format: scrypt$N=...,r=...,p=...$<salt>$<hash>
    params = parseScryptParams(parts[1] ?? '');
    if (!params) return false;
    saltPart = parts[2];
    expectedPart = parts[3];
  } else {
    return false;
  }

  if (!saltPart || !expectedPart) return false;

  const salt = Buffer.from(saltPart, 'base64url');
  const expected = Buffer.from(expectedPart, 'base64url');
  const actual = await scryptAsync(password, salt, expected.length, params);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

type TokenPayload = {
  sub: string;
  iat: number;
  exp: number;
};

function hmacSha256Base64Url(input: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(input).digest('base64url');
}

const DEFAULT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function issueAuthToken(
  userId: string,
  secret: string,
  ttlMs: number = DEFAULT_TOKEN_TTL_MS,
  issuedAtMs: number = Date.now(),
): string {
  const iat = issuedAtMs;
  const payload: TokenPayload = { sub: userId, iat, exp: iat + ttlMs };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = hmacSha256Base64Url(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export function verifyAuthToken(token: string, secret: string, nowMs: number = Date.now()): string | null {
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expected = hmacSha256Base64Url(payloadB64, secret);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as Partial<TokenPayload>;
    if (typeof payload.sub !== 'string') return null;
    if (typeof payload.exp !== 'number') return null;
    if (nowMs >= payload.exp) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
