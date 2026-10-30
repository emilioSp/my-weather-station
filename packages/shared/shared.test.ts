// Verify shared data transformations and schema validation during workspace checks.

import {
  METER_TYPES,
  deviceIdentifiersSchema,
  measureSchema,
  meterTypeSchema,
  weatherReadingSchema,
} from '@wx/shared';
import { normalizeUuid } from '@wx/shared/utils/normalizeUuid.util.ts';
import { toCamelCaseKeys } from '@wx/shared/utils/toCamelCaseKeys.util.ts';
import { toSnakeCaseKeys } from '@wx/shared/utils/toSnakeCaseKeys.util.ts';
import { describe, expect, it } from 'vitest';

const reading = {
  temperature: 20,
  dewPoint: 10,
  heatIndex: 21,
  humidity: 50,
  battery: 80,
  signalPowerDBM: -55,
};

describe('case mapping', () => {
  it('given nested objects and arrays when mapping keys in both directions then converts keys and preserves values', () => {
    const snake = {
      deviceId: 'DEVICE',
      signalPowerDBM: -55,
      nestedValue: [{ measuredAt: 'now' }],
    };

    expect(toSnakeCaseKeys(snake)).toEqual({
      device_id: 'DEVICE',
      signal_power_dbm: -55,
      nested_value: [{ measured_at: 'now' }],
    });
    expect(
      toCamelCaseKeys({
        device_id: 'DEVICE',
        signal_power_dbm: -55,
        nested_value: [{ measured_at: 'now' }],
      }),
    ).toEqual(snake);
  });

  it('given primitive and null values when mapping keys then preserves them', () => {
    expect(toCamelCaseKeys(null)).toBeNull();
    expect(toCamelCaseKeys('value')).toBe('value');
    expect(toSnakeCaseKeys('value')).toBe('value');
  });
});

describe('normalizeUuid', () => {
  it('given uppercase hyphenated or omitted identifiers when normalizing UUIDs then returns lowercase unhyphenated or empty strings', () => {
    expect(normalizeUuid('FD3D-ABCD')).toBe('fd3dabcd');
    expect(normalizeUuid()).toBe('');
  });
});

describe('shared schemas', () => {
  it('given indoor and unknown meter types when validating them then accepts indoor and rejects unknown', () => {
    expect(meterTypeSchema.safeParse(METER_TYPES.INDOOR).success).toBe(true);
    expect(meterTypeSchema.safeParse('other').success).toBe(false);
  });

  it('given uppercase or missing identifiers when validating them then normalizes the device ID and rejects missing identifiers', () => {
    expect(deviceIdentifiersSchema.parse({ deviceId: 'AbC' })).toEqual({
      deviceId: 'abc',
      address: null,
    });
    expect(deviceIdentifiersSchema.safeParse({}).success).toBe(false);
  });

  it('given numeric readings and a string battery value when validating readings then accepts numbers and rejects the string', () => {
    expect(weatherReadingSchema.safeParse(reading).success).toBe(true);
    expect(weatherReadingSchema.safeParse({ ...reading, battery: '80' }).success).toBe(false);
  });

  it('given a complete measure and an invalid UUID when validating measures then accepts the named measure and rejects the invalid UUID', () => {
    const result = measureSchema.safeParse({
      ...reading,
      id: '123e4567-e89b-12d3-a456-426614174000',
      deviceName: 'garden',
      deviceType: METER_TYPES.OUTDOOR,
      measuredAt: '2026-01-01T00:00:00Z',
      address: 'AA:BB',
    });

    expect(result).toMatchObject({ success: true, data: { deviceName: 'garden' } });
    expect(measureSchema.safeParse({ ...reading, id: 'not-a-uuid' }).success).toBe(false);
  });
});
