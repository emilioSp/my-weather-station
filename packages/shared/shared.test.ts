// Verify shared transformations and schema contracts with independent, explicit scenarios.

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
  it('given nested camel-case objects and arrays when mapping to snake case then converts keys and preserves values', () => {
    expect(
      toSnakeCaseKeys({
        deviceId: 'DEVICE',
        signalPowerDBM: -55,
        nestedValue: [{ measuredAt: 'now' }],
      }),
    ).toEqual({
      device_id: 'DEVICE',
      signal_power_dbm: -55,
      nested_value: [{ measured_at: 'now' }],
    });
  });

  it('given nested snake-case objects and arrays when mapping to camel case then converts keys and preserves values', () => {
    expect(
      toCamelCaseKeys({
        device_id: 'DEVICE',
        signal_power_dbm: -55,
        nested_value: [{ measured_at: 'now' }],
      }),
    ).toEqual({
      deviceId: 'DEVICE',
      signalPowerDBM: -55,
      nestedValue: [{ measuredAt: 'now' }],
    });
  });

  it.each([
    { label: 'camel-case null', map: toCamelCaseKeys, input: null },
    { label: 'camel-case string', map: toCamelCaseKeys, input: 'value' },
    { label: 'snake-case string', map: toSnakeCaseKeys, input: 'value' },
  ])('given a $label input when mapping keys then preserves the input', ({ map, input }) => {
    expect(map(input)).toBe(input);
  });
});

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

  it('given a complete named measure when validating it then accepts the garden device name', () => {
    const result = measureSchema.safeParse({
      ...reading,
      id: '123e4567-e89b-12d3-a456-426614174000',
      deviceName: 'garden',
      deviceType: METER_TYPES.OUTDOOR,
      measuredAt: '2026-01-01T00:00:00Z',
      address: 'AA:BB',
    });

    expect(result).toMatchObject({ success: true, data: { deviceName: 'garden' } });
  });

  it('given an otherwise valid measure with an invalid UUID when validating it then reports only the ID format error', () => {
    const result = measureSchema.safeParse({
      ...reading,
      id: 'not-a-uuid',
      deviceName: 'garden',
      deviceType: METER_TYPES.OUTDOOR,
      measuredAt: '2026-01-01T00:00:00Z',
      address: 'AA:BB',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['id'], code: 'invalid_format', format: 'uuid' }),
    ]);
  });
});
