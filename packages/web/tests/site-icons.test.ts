// Verify static icon artwork and manifest metadata without starting a browser.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Site icon assets', () => {
  it('given the favicon asset when reading its SVG then contains the thermometer shape and theme colors', () => {
    const favicon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');

    expect(favicon).toContain('M160 64c-26.5 0-48 21.5-48 48');
    expect(favicon).toContain('fill="#b9e53b"');
    expect(favicon).toContain('fill="#10191b"');
  });

  it('given the web manifest when reading its metadata then declares the station name and Android icon sizes', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../public/site.webmanifest', import.meta.url), 'utf8'),
    );

    expect(manifest).toEqual({
      name: 'Weather station',
      short_name: 'Weather station',
      icons: [
        {
          src: 'android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });
  });
});
