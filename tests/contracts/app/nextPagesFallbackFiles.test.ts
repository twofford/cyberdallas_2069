import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const requiredFiles = ['pages/_app.tsx', 'pages/_document.tsx', 'pages/_error.tsx'] as const;

describe('Next pages fallback files', () => {
  it.each(requiredFiles)('includes %s for stable dev runtime fallback', (relativePath) => {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    expect(fs.existsSync(absolutePath)).toBe(true);
  });
});
