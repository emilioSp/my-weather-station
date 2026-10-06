// Prepare measurement values and chart ranges for the weather dashboard.
import type { Measure } from '@wx/shared';
import {
  formatTemperature,
  type TemperatureUnit,
} from '#utils/temperature-unit.util.ts';

export const CHART_RANGES = {
  LAST_MONTH: 'LAST_MONTH',
  LAST_TWO_WEEKS: 'LAST_TWO_WEEKS',
  LAST_WEEK: 'LAST_WEEK',
  LAST_THREE_DAYS: 'LAST_THREE_DAYS',
  LAST_DAY: 'LAST_DAY',
  LAST_TWELVE_HOURS: 'LAST_TWELVE_HOURS',
  LAST_SIX_HOURS: 'LAST_SIX_HOURS',
} as const;

export const chartRanges = {
  [CHART_RANGES.LAST_MONTH]: { hours: 30 * 24, label: 'Last month' },
  [CHART_RANGES.LAST_TWO_WEEKS]: { hours: 14 * 24, label: 'Last 2 weeks' },
  [CHART_RANGES.LAST_WEEK]: { hours: 7 * 24, label: 'Last week' },
  [CHART_RANGES.LAST_THREE_DAYS]: { hours: 3 * 24, label: 'Last 3 days' },
  [CHART_RANGES.LAST_DAY]: { hours: 24, label: 'Last day' },
  [CHART_RANGES.LAST_TWELVE_HOURS]: { hours: 12, label: 'Last 12 hours' },
  [CHART_RANGES.LAST_SIX_HOURS]: { hours: 6, label: 'Last 6 hours' },
} as const;

export type ChartRangeKey = (typeof CHART_RANGES)[keyof typeof CHART_RANGES];

export type ChartRange = (typeof chartRanges)[ChartRangeKey];

export const chartRangeKeys = Object.values(CHART_RANGES);

export type WeatherMetric = 'temperature' | 'humidity' | 'dewPoint';

export const chartMetricDetails: Record<
  WeatherMetric,
  { label: string; unit: string; decimalPlaces: number }
> = {
  temperature: { label: 'Temperature', unit: '°C', decimalPlaces: 1 },
  humidity: { label: 'Humidity', unit: '%', decimalPlaces: 0 },
  dewPoint: { label: 'Dew point', unit: '°C', decimalPlaces: 1 },
};

export const formatMeasuredAt = (measuredAt: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome',
  })
    .format(new Date(measuredAt))
    .replace(',', ' ·');

export const formatChartTime = (measuredAt: number): [string, string] => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome',
  }).formatToParts(new Date(measuredAt));

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return [
    `${getPart('day')} ${getPart('month')}`,
    `${getPart('hour')}:${getPart('minute')}`,
  ];
};

export const formatMeasureValue = ({
  value,
  metric,
  temperatureUnit = 'celsius',
}: {
  value: number;
  metric: WeatherMetric;
  temperatureUnit?: TemperatureUnit;
}): string => {
  const { decimalPlaces, unit } = chartMetricDetails[metric];

  return metric === 'humidity'
    ? `${value.toFixed(decimalPlaces)}${unit}`
    : formatTemperature({
        celsius: value,
        unit: temperatureUnit,
        decimalPlaces,
      });
};

export const filterMeasuresForRange = ({
  measures,
  range,
  end,
}: {
  measures: Measure[];
  range: ChartRange;
  end: number;
}): Measure[] => {
  const start = end - range.hours * 60 * 60 * 1_000;

  return measures.filter(
    (measure) => new Date(measure.measuredAt).getTime() >= start,
  );
};

export const getLatestTimestamp = (measures: Measure[]): number | null => {
  const timestamps = measures.map((measure) =>
    new Date(measure.measuredAt).getTime(),
  );

  return timestamps.length === 0 ? null : Math.max(...timestamps);
};

export type RangeExtrema = {
  low: number;
  high: number;
  lowMeasuredAt: string;
  highMeasuredAt: string;
};

export const getRangeExtrema = ({
  measures,
  metric,
}: {
  measures: Measure[];
  metric: WeatherMetric;
}): RangeExtrema | null => {
  if (measures.length === 0) {
    return null;
  }

  const { low, high } = measures.reduce(
    (result, measure) => {
      const isEarlierThanLow =
        new Date(measure.measuredAt).getTime() <
        new Date(result.low.measuredAt).getTime();

      const isEarlierThanHigh =
        new Date(measure.measuredAt).getTime() <
        new Date(result.high.measuredAt).getTime();

      return {
        low:
          measure[metric] < result.low[metric] ||
          (measure[metric] === result.low[metric] && isEarlierThanLow)
            ? measure
            : result.low,
        high:
          measure[metric] > result.high[metric] ||
          (measure[metric] === result.high[metric] && isEarlierThanHigh)
            ? measure
            : result.high,
      };
    },
    { low: measures[0], high: measures[0] },
  );

  return {
    low: low[metric],
    high: high[metric],
    lowMeasuredAt: low.measuredAt,
    highMeasuredAt: high.measuredAt,
  };
};

export const getSignalPercentage = (signalPowerDBM: number): number =>
  Math.round(Math.max(0, Math.min(100, ((signalPowerDBM + 100) / 50) * 100)));
