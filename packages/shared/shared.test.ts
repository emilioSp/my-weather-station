import { describe, expect, it } from 'vitest';
import {
  deviceIdentifiersSchema,
  measureSchema,
  meterTypeSchema,
  normalizeUuid,
  toCamelCaseKeys,
  toSnakeCaseKeys,
  weatherReadingSchema,
} from './index.ts';

const reading = {
  temperature: 20,
  dewPoint: 10,
  heatIndex: 21,
  humidity: 50,
  battery: 80,
  signalPowerDBM: -55,
};

describe('case mapping', () => {
  it('maps nested values and arrays in both directions', () => {
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

  it('preserves primitive and null values', () => {
    expect(toCamelCaseKeys(null)).toBeNull();
    expect(toSnakeCaseKeys('value')).toBe('value');
  });
});

describe('normalizeUuid', () => {
  it('normalizes case, hyphens, and an omitted value', () => {
    expect(normalizeUuid('FD3D-ABCD')).toBe('fd3dabcd');
    expect(normalizeUuid()).toBe('');
  });
});

describe('shared schemas', () => {
  it('validates meter types and rejects other types', () => {
    expect(meterTypeSchema.safeParse('indoor').success).toBe(true);
    expect(meterTypeSchema.safeParse('other').success).toBe(false);
  });

  it('normalizes identifiers and requires one identifier', () => {
    expect(deviceIdentifiersSchema.parse({ deviceId: 'AbC' })).toEqual({
      deviceId: 'abc',
      address: null,
    });
    expect(deviceIdentifiersSchema.safeParse({}).success).toBe(false);
  });

  it('validates complete weather readings', () => {
    expect(weatherReadingSchema.safeParse(reading).success).toBe(true);
    expect(
      weatherReadingSchema.safeParse({ ...reading, battery: '80' }).success,
    ).toBe(false);
  });

  it('validates complete measures', () => {
    expect(
      measureSchema.safeParse({
        ...reading,
        id: '123e4567-e89b-12d3-a456-426614174000',
        deviceType: 'outdoor',
        measuredAt: '2026-01-01T00:00:00Z',
        address: 'AA:BB',
      }).success,
    ).toBe(true);
    expect(
      measureSchema.safeParse({ ...reading, id: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});
