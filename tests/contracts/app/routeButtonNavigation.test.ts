import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const routeButtonPath = path.resolve(process.cwd(), 'app/ui/RouteButton.tsx');

describe('RouteButton navigation', () => {
  it('uses hard navigation via window.location.assign to avoid chunk transition failures', () => {
    const source = fs.readFileSync(routeButtonPath, 'utf8');

    expect(source).toContain('window.location.assign(href)');
    expect(source).not.toContain('router.push(href)');
  });
});
