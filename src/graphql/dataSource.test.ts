import { describe, expect, it } from 'vitest';

// TODO: create src/graphql/dataSource.ts
import { createDataSource } from './dataSource';

describe('createDataSource', () => {
  it('defaults to in-memory when DATABASE_URL is unset', () => {
    const original = process.env.DATABASE_URL;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete process.env.DATABASE_URL;

    const dataSource = createDataSource();
    expect(dataSource.kind).toBe('inMemory');

    process.env.DATABASE_URL = original;
  });
});
