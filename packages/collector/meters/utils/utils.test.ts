// Verify derived weather values and timestamp formatting during collector utility checks.

import { METER_TYPES } from '@wx/shared';
import { describe, expect, it } from 'vitest';

import { calculateDewPoint } from '#meters/utils/calculateDewPoint.util.ts';
import { calculateHeatIndex } from '#meters/utils/calculateHeatIndex.util.ts';
import { formatMeasurement } from '#meters/utils/formatMeasurement.util.ts';

describe('meter calculations', () => {
  it('given 20 percent humidity and 12 degrees Celsius when calculating dew point then returns minus 10.3 degrees', () => {
    expect(calculateDewPoint({ humidity: 20, temperature: 12 })).toBe(-10.3);
  });

  it.each([
    { label: 'moderate', temperature: 20, humidity: 50, expected: 19.7 },
    { label: 'hot dry', temperature: 35, humidity: 10, expected: 31.9 },
    { label: 'hot humid', temperature: 30, humidity: 90, expected: 40.8 },
  ])(
    'given $label readings when calculating heat index then returns $expected degrees Celsius',
    ({ temperature, humidity, expected }) => {
      expect(calculateHeatIndex({ temperature, humidity })).toBe(expected);
    },
  );

  it('given a timestamp with milliseconds when formatting a measurement then returns UTC time at second precision', () => {
    expect(
      formatMeasurement({
        id: '123e4567-e89b-12d3-a456-426614174000',
        device_id: 'device',
        device_name: 'test meter',
        address: 'address',
        device_type: METER_TYPES.INDOOR,
        temperature: 20,
        dew_point: 10,
        heat_index: 21,
        humidity: 50,
        battery: 80,
        signal_power_dbm: -50,
        measured_at: '2026-01-01T12:34:56.789Z',
      }).measured_at,
    ).toBe('2026-01-01T12:34:56+00:00[UTC]');
  });
});
