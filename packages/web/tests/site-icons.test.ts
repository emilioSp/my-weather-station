// Verify icon artwork, PNG dimensions, and manifest metadata without starting a browser.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Site icon assets', () => {
  it('given the favicon asset when reading its SVG then contains the thermometer shape and theme colors', () => {
    const favicon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');

    expect(favicon).toContain('M160 64c-26.5 0-48 21.5-48 48');
    expect(favicon).toContain('fill="#b9e53b"');
    expect(favicon).toContain('fill="#10191b"');
  });

  it.each([
    { label: 'Apple touch', file: 'apple-touch-icon.png', size: 180 },
    { label: 'Android 192px', file: 'android-chrome-192x192.png', size: 192 },
    { label: 'Android 512px', file: 'android-chrome-512x512.png', size: 512 },
  ])(
    'given the $label icon when reading its PNG header then matches the declared dimensions',
    ({ file, size }) => {
      const image = readFileSync(new URL(`../public/${file}`, import.meta.url));

      expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(image.subarray(12, 16).toString('ascii')).toBe('IHDR');
      expect(image.readUInt32BE(16)).toBe(size);
      expect(image.readUInt32BE(20)).toBe(size);
    },
  );

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
