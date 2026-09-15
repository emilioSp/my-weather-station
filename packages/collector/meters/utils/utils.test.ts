import { describe, expect, it } from 'vitest';
import { calculateDewPoint } from '#meters/utils/calculateDewPoint.util.ts';
import { calculateHeatIndex } from '#meters/utils/calculateHeatIndex.util.ts';
import { formatMeasure } from '#meters/utils/formatMeasure.util.ts';

describe('meter calculations', () => {
  it('calculates dew point at a normal temperature', () => {
    expect(calculateDewPoint({ humidity: 20, temperature: 12 })).toBe(-10.3);
  });

  it('calculates simple and adjusted heat indexes', () => {
    expect(calculateHeatIndex({ temperature: 20, humidity: 50 })).toBe(19.7);
    expect(calculateHeatIndex({ temperature: 35, humidity: 10 })).toBe(31.9);
    expect(calculateHeatIndex({ temperature: 30, humidity: 90 })).toBe(40.8);
  });

  it('formats measured timestamps to UTC seconds', () => {
    expect(
      formatMeasure({
        id: '123e4567-e89b-12d3-a456-426614174000',
        deviceId: 'device',
        address: 'address',
        deviceType: 'indoor',
        temperature: 20,
        dewPoint: 10,
        heatIndex: 21,
        humidity: 50,
        battery: 80,
        signalPowerDBM: -50,
        measuredAt: '2026-01-01T12:34:56.789Z',
      }).measuredAt,
    ).toBe('2026-01-01T12:34:56+00:00[UTC]');
  });
});
