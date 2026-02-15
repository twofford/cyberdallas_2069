import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readGlobalsCss(): string {
  const filePath = path.resolve(process.cwd(), 'app', 'globals.css');
  return fs.readFileSync(filePath, 'utf8');
}

describe('globals.css', () => {
  it('adds terminal-style prefixes for headings and list items', () => {
    const css = readGlobalsCss();

    expect(css).toContain("body[data-ui='cyberdallas'] h2::before");
    expect(css).toContain("body[data-ui='cyberdallas'] li::before");
  });

  it('styles inline code and preformatted blocks', () => {
    const css = readGlobalsCss();

    expect(css).toContain("body[data-ui='cyberdallas'] code");
    expect(css).toContain("body[data-ui='cyberdallas'] pre");
  });

  it('adds extra terminal polish (selection, bracketed buttons, section headers)', () => {
    const css = readGlobalsCss();

    expect(css).toContain("body[data-ui='cyberdallas'] ::selection");
    expect(css).toContain("body[data-ui='cyberdallas'] button::before");
    expect(css).toContain("body[data-ui='cyberdallas'] button::after");
    expect(css).toContain("body[data-ui='cyberdallas'] section > h2::after");
  });
});
