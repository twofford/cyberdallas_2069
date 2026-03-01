import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const charactersClientPath = path.resolve(process.cwd(), 'app/characters/CharactersClient.tsx');
const characterPageClientPath = path.resolve(process.cwd(), 'app/characters/[id]/CharacterPageClient.tsx');
const newCharacterPageClientPath = path.resolve(process.cwd(), 'app/characters/new/NewCharacterPageClient.tsx');

describe('Character and NPC view rules', () => {
  it('filters public NPC records out of the View Characters list', () => {
    const source = fs.readFileSync(charactersClientPath, 'utf8');
    expect(source).toMatch(/filter\(\(character\)\s*=>\s*!character\.isPublic\)/);
  });

  it('uses NPC terminology instead of Archetype in character detail and creation UI labels', () => {
    const characterPageSource = fs.readFileSync(characterPageClientPath, 'utf8');
    const newCharacterSource = fs.readFileSync(newCharacterPageClientPath, 'utf8');

    expect(characterPageSource).toContain("'NPC'");
    expect(characterPageSource).not.toContain("'Archetype'");
    expect(characterPageSource).toContain('Public NPCs can’t belong to a campaign.');

    expect(newCharacterSource).toContain('Public NPC (visible to all players)');
    expect(newCharacterSource).not.toContain('Public archetype (visible to all players)');
  });
});
