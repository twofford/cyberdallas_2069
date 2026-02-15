import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../../app/layout';

describe('RootLayout', () => {
  it('exposes a stable styling hook on <body>', () => {
    const html = renderToStaticMarkup(
      RootLayout({
        children: null,
      }),
    );

    expect(html).toContain('data-ui="cyberdallas"');
  });
});
