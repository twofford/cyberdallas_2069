import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const filePath = path.resolve(process.cwd(), 'app/characters/new/NewCharacterPageClient.tsx');

describe('NewCharacterPageClient checkbox layout', () => {
  it('marks checkbox labels for inline row layout', () => {
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('data-checkbox="true"');
  });
});
