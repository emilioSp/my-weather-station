// Verify date formatting, range filtering, extrema, and signal values during dashboard checks.

import { readFileSync } from 'node:fs';

import type { Measure } from '@wx/shared';
import { describe, expect, it } from 'vitest';

import { CHART_RANGES, chartRanges } from '#utils/chart-ranges.ts';
import { filterMeasuresForRange } from '#utils/filterMeasuresForRange.util.ts';
import { formatChartTime } from '#utils/formatChartTime.util.ts';
import { formatMeasuredAt } from '#utils/formatMeasuredAt.util.ts';
import { formatMeasureValue } from '#utils/formatMeasureValue.util.ts';
import { getLatestTimestamp } from '#utils/getLatestTimestamp.util.ts';
import { getRangeExtrema } from '#utils/getRangeExtrema.util.ts';
import { getSignalPercentage } from '#utils/getSignalPercentage.util.ts';
import { TEMPERATURE_UNITS } from '#utils/temperature-unit.util.ts';
import { WEATHER_METRICS } from '#utils/weather-metrics.ts';

type ExtremaFixture = {
  oldest: Measure;
  older: Measure;
  newer: Measure;
  newest: Measure;
};

type TemperaturePair = {
  earlier: Measure;
  later: Measure;
};

describe('weather dashboard utilities', () => {
  it('given a UTC timestamp humidity and temperature when formatting dashboard values then returns local times percent and Fahrenheit', () => {
    const measuredAt = Temporal.Instant.from('2026-01-01T12:34:56Z');

    expect(formatMeasuredAt(measuredAt.toString())).toBe('01 Jan · 13:34:56');
    expect(formatChartTime(measuredAt.epochMilliseconds)).toEqual(['01 Jan', '13:34']);
    expect(formatMeasureValue({ value: 50.4, metric: WEATHER_METRICS.HUMIDITY })).toBe('50%');
    expect(
      formatMeasureValue({
        value: 20,
        metric: WEATHER_METRICS.TEMPERATURE,
        temperatureUnit: TEMPERATURE_UNITS.FAHRENHEIT,
      }),
    ).toBe('68.0°F');
  });

  it('given readings before at and within the last day when filtering then includes only boundary and later readings', () => {
    const end = Temporal.Instant.from('2026-01-02T00:00:00Z');

    const measures: Measure[] = JSON.parse(
      readFileSync(
        new URL('../tests/fixtures/dashboard/range-boundaries.json', import.meta.url),
        'utf8',
      ),
    );

    expect(
      filterMeasuresForRange({
        measures,
        range: chartRanges[CHART_RANGES.LAST_DAY],
        end: end.epochMilliseconds,
      }).map(({ id }) => id),
    ).toEqual(['edge', 'inside']);
  });

  it('given unsorted or empty readings when finding timestamps and extrema then returns the latest time dated extremes or null', () => {
    const { oldest, older, newer, newest }: ExtremaFixture = JSON.parse(
      readFileSync(
        new URL('../tests/fixtures/dashboard/unsorted-extrema.json', import.meta.url),
        'utf8',
      ),
    );

    expect(getLatestTimestamp([oldest, older, newer, newest])).toBe(
      Temporal.Instant.from(newest.measuredAt).epochMilliseconds,
    );
    expect(getLatestTimestamp([])).toBeNull();
    expect(
      getRangeExtrema({
        measures: [older, newest, oldest, newer],
        metric: WEATHER_METRICS.TEMPERATURE,
      }),
    ).toEqual({
      low: 10,
      high: 30,
      lowMeasuredAt: oldest.measuredAt,
      highMeasuredAt: newer.measuredAt,
    });
    expect(getRangeExtrema({ measures: [], metric: WEATHER_METRICS.TEMPERATURE })).toBeNull();
  });

  it('given close temperatures when finding extrema then compares unrounded values', () => {
    const { earlier, later }: TemperaturePair = JSON.parse(
      readFileSync(
        new URL('../tests/fixtures/dashboard/close-temperatures.json', import.meta.url),
        'utf8',
      ),
    );

    expect(
      getRangeExtrema({ measures: [earlier, later], metric: WEATHER_METRICS.TEMPERATURE }),
    ).toEqual({
      low: 18.01,
      high: 18.04,
      lowMeasuredAt: later.measuredAt,
      highMeasuredAt: earlier.measuredAt,
    });
  });

  it('given tied temperatures in reverse time order when finding extrema then selects the earliest dates', () => {
    const { earlier, later }: TemperaturePair = JSON.parse(
      readFileSync(
        new URL('../tests/fixtures/dashboard/tied-temperatures.json', import.meta.url),
        'utf8',
      ),
    );

    expect(
      getRangeExtrema({ measures: [later, earlier], metric: WEATHER_METRICS.TEMPERATURE }),
    ).toEqual({
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
