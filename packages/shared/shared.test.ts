// Verify shared transformations and schema contracts with independent, explicit scenarios.

import {
  METER_TYPES,
  deviceIdentifiersSchema,
  measurementSchema,
  meterTypeSchema,
  weatherReadingSchema,
} from '@wx/shared';
import { normalizeUuid } from '@wx/shared/utils/normalizeUuid.util.ts';
import { describe, expect, it } from 'vitest';

const reading = {
  temperature: 20,
  dewPoint: 10,
  heatIndex: 21,
  humidity: 50,
  battery: 80,
  signalPowerDBM: -55,
};

const storedMeasurement = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  device_id: 'abc',
  device_name: 'garden',
  device_type: METER_TYPES.OUTDOOR,
  measured_at: '2026-01-01T00:00:00Z',
  address: null,
  temperature: 20,
  humidity: 50,
  dew_point: 10,
  heat_index: 21,
  battery: 80,
  signal_power_dbm: -55,
};

describe('normalizeUuid', () => {
  it.each([
    { label: 'uppercase hyphenated ID', input: 'FD3D-ABCD', expected: 'fd3dabcd' },
    { label: 'omitted ID', input: undefined, expected: '' },
  ])('given an $label when normalizing then returns "$expected"', ({ input, expected }) => {
    expect(normalizeUuid(input)).toBe(expected);
  });
});

describe('shared schemas', () => {
  it('given an indoor meter type when validating it then accepts indoor', () => {
    expect(meterTypeSchema.parse(METER_TYPES.INDOOR)).toBe(METER_TYPES.INDOOR);
  });

  it('given an unknown meter type when validating it then reports an invalid type value', () => {
    expect(meterTypeSchema.safeParse('other').error?.issues).toEqual([
      expect.objectContaining({ path: [], code: 'invalid_value' }),
    ]);
  });

  it('given an uppercase device ID when validating identifiers then lowercases it and defaults the address to null', () => {
    expect(deviceIdentifiersSchema.parse({ deviceId: 'AbC' })).toEqual({
      deviceId: 'abc',
      address: null,
    });
  });

  it('given no device ID or address when validating identifiers then reports that an identifier is required', () => {
    expect(deviceIdentifiersSchema.safeParse({}).error?.issues).toEqual([
      expect.objectContaining({ path: [], message: 'A device ID or address is required' }),
    ]);
  });

  it('given numeric weather values when validating a reading then preserves the values', () => {
    expect(weatherReadingSchema.parse(reading)).toEqual(reading);
  });

  it('given an otherwise valid reading with a string battery when validating it then reports only the battery type error', () => {
    expect(weatherReadingSchema.safeParse({ ...reading, battery: '80' }).error?.issues).toEqual([
      expect.objectContaining({ path: ['battery'], code: 'invalid_type', expected: 'number' }),
    ]);
  });

  it('given a stored measurement when validating it then preserves the snake-case fields', () => {
    expect(measurementSchema.parse(storedMeasurement)).toEqual(storedMeasurement);
  });

  it('given an otherwise valid measurement with an invalid UUID when validating it then reports only the ID format error', () => {
    const result = measurementSchema.safeParse({
      ...storedMeasurement,
      id: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['id'], code: 'invalid_format', format: 'uuid' }),
    ]);
  });
});
