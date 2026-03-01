// Keep unit tests independent of local developer DB state.
// If you want DB-backed integration tests later, run them separately with an explicit DATABASE_URL.

// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
delete process.env.DATABASE_URL;

process.env.CYBERDALLAS_DATA_SOURCE = 'inMemory';

process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'test-secret';
