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
  it('given a UTC timestamp when formatting a measurement then returns Rome time including seconds', () => {
    expect(formatMeasuredAt('2026-01-01T12:34:56Z')).toBe('01 Jan · 13:34:56');
  });

  it('given a UTC timestamp when formatting a chart label then returns the Rome date and minute', () => {
    expect(formatChartTime(Date.parse('2026-01-01T12:34:56Z'))).toEqual(['01 Jan', '13:34']);
  });

  it.each([
    { label: 'humidity', value: 50.4, metric: WEATHER_METRICS.HUMIDITY, expected: '50%' },
    { label: 'temperature', value: 20, metric: WEATHER_METRICS.TEMPERATURE, expected: '20.0°C' },
  ])(
    'given a $label value when formatting it then returns $expected',
    ({ value, metric, expected }) => {
      expect(formatMeasureValue({ value, metric })).toBe(expected);
    },
  );

  describe.each([
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
  ])('Rome formatting: $label', ({ label, measuredAt, date, time }) => {
    it(`given ${label} when formatting a measurement then shows the Rome date and time with seconds`, () => {
      expect(formatMeasuredAt(measuredAt)).toBe(`${date} · ${time}:59`);
    });

    it(`given ${label} when formatting a chart label then shows the Rome date and minute`, () => {
      expect(formatChartTime(Date.parse(measuredAt))).toEqual([date, time]);
    });
  });

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

  it('given unordered readings when finding the latest timestamp then returns 2 January at 06:00 UTC', () => {
    const { oldest, older, newer, newest }: ExtremaFixture = JSON.parse(
      readFileSync(
        new URL('../tests/fixtures/dashboard/unsorted-extrema.json', import.meta.url),
        'utf8',
      ),
    );

    expect(getLatestTimestamp([older, newest, oldest, newer])).toBe(
      Date.parse('2026-01-02T06:00:00Z'),
    );
  });

  it('given no readings when finding the latest timestamp then returns null', () => {
    expect(getLatestTimestamp([])).toBeNull();
  });

  it('given no readings when finding temperature extrema then returns null', () => {
    expect(getRangeExtrema({ measures: [], metric: WEATHER_METRICS.TEMPERATURE })).toBeNull();
  });

  it('given unordered temperature readings with tied extremes when finding extrema then returns the earliest low and high dates', () => {
    const { oldest, older, newer, newest }: ExtremaFixture = JSON.parse(
      readFileSync(
        new URL('../tests/fixtures/dashboard/unsorted-extrema.json', import.meta.url),
        'utf8',
      ),
    );

    expect(
      getRangeExtrema({
        measures: [older, newest, oldest, newer],
        metric: WEATHER_METRICS.TEMPERATURE,
      }),
    ).toEqual({
      low: 10,
      high: 30,
      lowMeasuredAt: '2026-01-01T00:00:00Z',
      highMeasuredAt: '2026-01-02T00:00:00Z',
    });
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

  it.each([
    { label: 'weak', signal: -125, expected: 0 },
    { label: 'medium', signal: -75, expected: 50 },
    { label: 'strong', signal: -10, expected: 100 },
  ])(
    'given a $label signal when calculating its percentage then returns $expected percent',
    ({ signal, expected }) => {
      expect(getSignalPercentage(signal)).toBe(expected);
    },
  );
});
