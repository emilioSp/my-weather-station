// Verify configured device order, names, and icons during web configuration checks.

import { describe, expect, it } from 'vitest';

import { environmentSchema } from '#environment.ts';

const environmentInput = (devices: unknown[]) => ({
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key',
  VITE_DEVICES: JSON.stringify(devices),
});

describe('web environment', () => {
  it('given ordered named devices with supported icons when parsing configuration then preserves device order and icons', () => {
    const result = environmentSchema.parse(
      environmentInput([
        { deviceName: 'garden', icon: 'FaSeedling' },
        { deviceName: 'kitchen', icon: 'FaKitchenSet' },
        { deviceName: 'living room', icon: 'FaCouch' },
        { deviceName: 'bedroom', icon: 'FaBed' },
      ]),
    );

    expect(result.VITE_DEVICES).toEqual([
      { deviceName: 'garden', icon: 'FaSeedling' },
      { deviceName: 'kitchen', icon: 'FaKitchenSet' },
      { deviceName: 'living room', icon: 'FaCouch' },
      { deviceName: 'bedroom', icon: 'FaBed' },
    ]);
  });

  it.each([
    ['invalid JSON', '{not-json}'],
    ['blank name', JSON.stringify([{ deviceName: ' ', icon: 'FaSeedling' }])],
    [
      'duplicate names',
      JSON.stringify([
        { deviceName: 'same', icon: 'FaSeedling' },
        { deviceName: 'same', icon: 'FaBed' },
      ]),
    ],
    ['unsupported icon', JSON.stringify([{ deviceName: 'kitchen', icon: 'FaCloud' }])],
  ])('given %s when parsing configuration then rejects it', (_caseName, devices) => {
    expect(
      environmentSchema.safeParse({
        ...environmentInput([]),
        VITE_DEVICES: devices,
      }).success,
    ).toBe(false);
  });
});
