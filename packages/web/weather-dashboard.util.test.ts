// Verify date formatting, range filtering, extrema, and signal values during dashboard checks.

import type { Measure } from '@wx/shared';
import { describe, expect, it } from 'vitest';

import {
  CHART_RANGES,
  chartRanges,
  filterMeasuresForRange,
  formatChartTime,
  formatMeasuredAt,
  formatMeasureValue,
  getLatestTimestamp,
  getRangeExtrema,
  getSignalPercentage,
} from '#weather-dashboard.util.ts';

const createMockedMeasure = (
  id: string,
  measuredAt: Temporal.Instant,
  temperature = 20,
): Measure => ({
  id,
  measuredAt: measuredAt.toString(),
  deviceId: 'device',
  deviceName: 'test meter',
  address: 'address',
  deviceType: 'indoor',
  temperature,
  dewPoint: temperature - 5,
  heatIndex: temperature + 1,
  humidity: 50,
  battery: 80,
  signalPowerDBM: -60,
});

describe('weather dashboard utilities', () => {
  it('given a UTC timestamp humidity and temperature when formatting dashboard values then returns local times percent and Fahrenheit', () => {
    const measuredAt = Temporal.Instant.from('2026-01-01T12:34:56Z');

    expect(formatMeasuredAt(measuredAt.toString())).toBe('01 Jan · 13:34:56');
    expect(formatChartTime(measuredAt.epochMilliseconds)).toEqual(['01 Jan', '13:34']);
    expect(formatMeasureValue({ value: 50.4, metric: 'humidity' })).toBe('50%');
    expect(
      formatMeasureValue({
        value: 20,
        metric: 'temperature',
        temperatureUnit: 'fahrenheit',
      }),
    ).toBe('68.0°F');
  });

  it('given readings before at and within the last day when filtering then includes only boundary and later readings', () => {
    const end = Temporal.Instant.from('2026-01-02T00:00:00Z');

    const measures = [
      createMockedMeasure('outside', Temporal.Instant.from('2025-12-31T23:59:59Z')),
      createMockedMeasure('edge', Temporal.Instant.from('2026-01-01T00:00:00Z')),
      createMockedMeasure('inside', Temporal.Instant.from('2026-01-01T12:00:00Z')),
    ];

    expect(
      filterMeasuresForRange({
        measures,
        range: chartRanges[CHART_RANGES.LAST_DAY],
        end: end.epochMilliseconds,
      }).map(({ id }) => id),
    ).toEqual(['edge', 'inside']);
  });

  it('given unsorted or empty readings when finding timestamps and extrema then returns the latest time dated extremes or null', () => {
    const oldest = createMockedMeasure('oldest', Temporal.Instant.from('2026-01-01T00:00:00Z'), 10);

    const older = createMockedMeasure('older', Temporal.Instant.from('2026-01-01T06:00:00Z'), 25);

    const newer = createMockedMeasure('newer', Temporal.Instant.from('2026-01-02T00:00:00Z'), 30);

    const newest = createMockedMeasure('newest', Temporal.Instant.from('2026-01-02T06:00:00Z'), 15);

    expect(getLatestTimestamp([oldest, older, newer, newest])).toBe(
      Temporal.Instant.from(newest.measuredAt).epochMilliseconds,
    );
    expect(getLatestTimestamp([])).toBeNull();
    expect(
      getRangeExtrema({
        measures: [older, newest, oldest, newer],
        metric: 'temperature',
      }),
    ).toEqual({
      low: 10,
      high: 30,
      lowMeasuredAt: oldest.measuredAt,
      highMeasuredAt: newer.measuredAt,
    });
    expect(getRangeExtrema({ measures: [], metric: 'temperature' })).toBeNull();
  });

  it('given close temperatures and tied readings when finding extrema then compares unrounded values and selects earliest ties', () => {
    const later = createMockedMeasure(
      'later',
      Temporal.Instant.from('2026-10-06T08:00:00Z'),
      18.01,
    );

    const earlier = createMockedMeasure(
      'earlier',
      Temporal.Instant.from('2026-10-06T06:00:00Z'),
      18.04,
    );

    expect(getRangeExtrema({ measures: [earlier, later], metric: 'temperature' })).toEqual({
      low: 18.01,
      high: 18.04,
      lowMeasuredAt: later.measuredAt,
      highMeasuredAt: earlier.measuredAt,
    });

    const repeatedMeasures = [later, { ...earlier, temperature: later.temperature }];

    expect(getRangeExtrema({ measures: repeatedMeasures, metric: 'temperature' })).toEqual({
      low: 18.01,
      high: 18.01,
      lowMeasuredAt: earlier.measuredAt,
      highMeasuredAt: earlier.measuredAt,
    });
  });

  it('given weak medium and strong signals when calculating percentages then returns zero fifty and one hundred', () => {
    expect(getSignalPercentage(-125)).toBe(0);
    expect(getSignalPercentage(-75)).toBe(50);
    expect(getSignalPercentage(-10)).toBe(100);
  });
});
