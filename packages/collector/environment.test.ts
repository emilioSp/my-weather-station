import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  Object.assign(process.env, {
    DEVICES: '[{"type":"indoor","deviceId":"test","deviceName":"test meter"}]',
    POSTGRES_HOST: '127.0.0.1',
    POSTGRES_PORT: '54322',
    POSTGRES_DB: 'postgres',
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
  });
});

import { environmentSchema } from '#environment.ts';

const environmentInput = (devices: unknown[]) => ({
  DEVICES: JSON.stringify(devices),
  POSTGRES_HOST: '127.0.0.1',
  POSTGRES_PORT: '54322',
  POSTGRES_DB: 'postgres',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
});

describe('environment', () => {
  it('accepts named devices and trims their names', () => {
    const result = environmentSchema.safeParse(
      environmentInput([
        { type: 'indoor', deviceId: 'indoor-device', deviceName: ' Kitchen ' },
        { type: 'outdoor', deviceId: 'outdoor-device', deviceName: 'Garden' },
      ]),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DEVICES.map(({ deviceName }) => deviceName)).toEqual([
        'Kitchen',
        'Garden',
      ]);
    }
  });

  it('rejects blank device names', () => {
    expect(
      environmentSchema.safeParse(
        environmentInput([
          { type: 'indoor', deviceId: 'indoor-device', deviceName: ' ' },
        ]),
      ).success,
    ).toBe(false);
  });

  it('rejects duplicate device names', () => {
    expect(
      environmentSchema.safeParse(
        environmentInput([
          { type: 'indoor', deviceId: 'indoor-device', deviceName: 'same' },
          { type: 'outdoor', deviceId: 'outdoor-device', deviceName: 'same' },
        ]),
      ).success,
    ).toBe(false);
  });
});
