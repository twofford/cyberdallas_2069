import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const componentPath = path.resolve(process.cwd(), 'app/_components/PrivateCampaignsAndCharacters.tsx');

describe('PrivateCampaignsAndCharacters', () => {
  it('renders New NPC before View NPCs in the same action row', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/<p>(?:(?!<\/p>).)*New NPC(?:(?!<\/p>).)*View NPCs(?:(?!<\/p>).)*<\/p>/s);
  });
});
