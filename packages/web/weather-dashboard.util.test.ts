import type { Measure } from '@wx/shared';
import { describe, expect, it } from 'vitest';
import {
  CHART_RANGES,
  chartRanges,
  downsampleMeasures,
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
  it('formats dates and metric values', () => {
    const measuredAt = Temporal.Instant.from('2026-01-01T12:34:56Z');

    expect(formatMeasuredAt(measuredAt.toString())).toBe('01 Jan · 13:34:56');
    expect(formatChartTime(measuredAt.epochMilliseconds)).toEqual([
      '01 Jan',
      '13:34',
    ]);
    expect(formatMeasureValue({ value: 50.4, metric: 'humidity' })).toBe('50%');
    expect(
      formatMeasureValue({
        value: 20,
        metric: 'temperature',
        temperatureUnit: 'fahrenheit',
      }),
    ).toBe('68.0°F');
  });

  it('filters values at and within the selected range', () => {
    const end = Temporal.Instant.from('2026-01-02T00:00:00Z');
    const measures = [
      createMockedMeasure(
        'outside',
        Temporal.Instant.from('2025-12-31T23:59:59Z'),
      ),
      createMockedMeasure(
        'edge',
        Temporal.Instant.from('2026-01-01T00:00:00Z'),
      ),
      createMockedMeasure(
        'inside',
        Temporal.Instant.from('2026-01-01T12:00:00Z'),
      ),
    ];

    expect(
      filterMeasuresForRange({
        measures,
        range: chartRanges[CHART_RANGES.LAST_DAY],
        end: end.epochMilliseconds,
      }).map(({ id }) => id),
    ).toEqual(['edge', 'inside']);
  });

  it('gets latest timestamps and extrema including empty data', () => {
    const oldest = createMockedMeasure(
      'oldest',
      Temporal.Instant.from('2026-01-01T00:00:00Z'),
      10,
    );
    const older = createMockedMeasure(
      'older',
      Temporal.Instant.from('2026-01-01T06:00:00Z'),
      25,
    );
    const newer = createMockedMeasure(
      'newer',
      Temporal.Instant.from('2026-01-02T00:00:00Z'),
      30,
    );
    const newest = createMockedMeasure(
      'newest',
      Temporal.Instant.from('2026-01-02T06:00:00Z'),
      15,
    );

    expect(
      getLatestTimestamp({
        indoorMeasures: [oldest, older],
        outdoorMeasures: [newer, newest],
      }),
    ).toBe(Temporal.Instant.from(newest.measuredAt).epochMilliseconds);
    expect(
      getLatestTimestamp({ indoorMeasures: [], outdoorMeasures: [] }),
    ).toBeNull();
    expect(
      getRangeExtrema({
        measures: [older, newest, oldest, newer],
        metric: 'temperature',
      }),
    ).toEqual({ low: 10, high: 30 });
    expect(getRangeExtrema({ measures: [], metric: 'temperature' })).toBeNull();
  });

  it('keeps small measure lists and downsampled bucket extrema', () => {
    const start = Temporal.Instant.from('2026-01-01T00:00:00Z');
    const measures = Array.from({ length: 7 }, (_, index) =>
      createMockedMeasure(
        `${index}`,
        start.add({ seconds: index }),
        [3, 1, 2, 6, 4, 5, 7][index],
      ),
    );
    expect(
      downsampleMeasures({
        measures,
        metric: 'temperature',
        maximumBuckets: 3,
      }).map(({ id }) => id),
    ).toEqual(['0', '1', '3', '4', '6']);
    const smallMeasures = measures.slice(0, 5);
    expect(
      downsampleMeasures({
        measures: smallMeasures,
        metric: 'temperature',
        maximumBuckets: 3,
      }),
    ).toBe(smallMeasures);
  });

  it('constrains signal percentages', () => {
    expect(getSignalPercentage(-125)).toBe(0);
    expect(getSignalPercentage(-75)).toBe(50);
    expect(getSignalPercentage(-10)).toBe(100);
  });
});
