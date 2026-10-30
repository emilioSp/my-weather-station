// Verify device name validation and trimming during collector configuration checks.

import { METER_TYPES } from '@wx/shared';
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
  it('given named devices with surrounding spaces when parsing configuration then trims device names', () => {
    const result = environmentSchema.parse(
      environmentInput([
        { type: METER_TYPES.INDOOR, deviceId: 'indoor-device', deviceName: ' Kitchen ' },
        { type: METER_TYPES.OUTDOOR, deviceId: 'outdoor-device', deviceName: 'Garden' },
      ]),
    );

    expect(result.DEVICES.map(({ deviceName }) => deviceName)).toEqual(['Kitchen', 'Garden']);
  });

  it('given a blank device name when parsing configuration then rejects it', () => {
    expect(
      environmentSchema.safeParse(
        environmentInput([
          { type: METER_TYPES.INDOOR, deviceId: 'indoor-device', deviceName: ' ' },
        ]),
      ).success,
    ).toBe(false);
  });

  it('given duplicate device names when parsing configuration then rejects them', () => {
    expect(
      environmentSchema.safeParse(
        environmentInput([
          { type: METER_TYPES.INDOOR, deviceId: 'indoor-device', deviceName: 'same' },
          { type: METER_TYPES.OUTDOOR, deviceId: 'outdoor-device', deviceName: 'same' },
        ]),
      ).success,
    ).toBe(false);
  });
});
