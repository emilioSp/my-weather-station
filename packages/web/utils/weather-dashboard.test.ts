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
  it('given a UTC timestamp humidity and temperature when formatting dashboard values then returns local times percent and Celsius', () => {
    const measuredAt = new Date('2026-01-01T12:34:56Z');

    expect(formatMeasuredAt(measuredAt.toISOString())).toBe('01 Jan · 13:34:56');
    expect(formatChartTime(measuredAt.getTime())).toEqual(['01 Jan', '13:34']);
    expect(formatMeasureValue({ value: 50.4, metric: WEATHER_METRICS.HUMIDITY })).toBe('50%');
    expect(
      formatMeasureValue({
        value: 20,
        metric: WEATHER_METRICS.TEMPERATURE,
      }),
    ).toBe('20.0°C');
  });

  it.each([
    {
      label: 'winter midnight',
      measuredAt: '2026-01-06T23:35:59Z',
      date: '07 Jan',
      time: '00:35',
    },
    {
      label: 'summer midnight',
      measuredAt: '2026-07-06T23:35:59Z',
      date: '07 Jul',
      time: '01:35',
    },
    {
      label: 'spring daylight saving jump',
      measuredAt: '2026-03-29T01:35:59Z',
      date: '29 Mar',
      time: '03:35',
    },
    {
      label: 'autumn daylight saving rollback',
      measuredAt: '2026-10-25T01:35:59Z',
      date: '25 Oct',
      time: '02:35',
    },
  ])(
    'given $label when formatting a measurement then shows the Rome date and time',
    ({ measuredAt, date, time }) => {
      expect(formatMeasuredAt(measuredAt)).toBe(`${date} · ${time}:59`);
      expect(formatChartTime(Date.parse(measuredAt))).toEqual([date, time]);
    },
  );

  it('given readings before at and within the last day when filtering then includes only boundary and later readings', () => {
    const end = new Date('2026-01-02T00:00:00Z');

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
        end: end.getTime(),
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

    expect(getLatestTimestamp([oldest, older, newer, newest])).toBe(Date.parse(newest.measuredAt));
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

  it.each([
    { label: 'temperature', metric: WEATHER_METRICS.TEMPERATURE, low: 18, high: 25 },
    { label: 'humidity', metric: WEATHER_METRICS.HUMIDITY, low: 40, high: 70 },
    { label: 'dew point', metric: WEATHER_METRICS.DEW_POINT, low: 8, high: 12 },
  ])(
    'given unordered tied $label readings when finding extrema then selects the earliest low and high dates',
    ({ metric, low, high }) => {
      const measures: Measure[] = JSON.parse(
        readFileSync(
          new URL('../tests/fixtures/dashboard/unordered-metric-ties.json', import.meta.url),
          'utf8',
        ),
      );

      expect(getRangeExtrema({ measures, metric })).toEqual({
        low,
        high,
        lowMeasuredAt: '2026-10-06T06:00:00Z',
        highMeasuredAt: '2026-10-06T09:00:00Z',
      });
    },
  );

  it('given weak medium and strong signals when calculating percentages then returns zero fifty and one hundred', () => {
    expect(getSignalPercentage(-125)).toBe(0);
    expect(getSignalPercentage(-75)).toBe(50);
    expect(getSignalPercentage(-10)).toBe(100);
  });
});
