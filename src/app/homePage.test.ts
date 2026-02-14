import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '../../app/home/page';

describe('HomePage', () => {
  it('renders private and public sections', async () => {
    const element = await HomePage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('CyberDallas 2069');

    expect(html).toContain('Checking session');
  });
});

