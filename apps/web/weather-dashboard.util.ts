import type { Measure } from '@wx/shared';

export const chartRanges = [
  { hours: 30 * 24, label: 'Last month' },
  { hours: 14 * 24, label: 'Last 2 weeks' },
  { hours: 7 * 24, label: 'Last week' },
  { hours: 3 * 24, label: 'Last 3 days' },
  { hours: 24, label: 'Last day' },
  { hours: 12, label: 'Last 12 hours' },
  { hours: 6, label: 'Last 6 hours' },
] as const;

export type ChartRange = (typeof chartRanges)[number];
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
}: {
  value: number;
  metric: WeatherMetric;
}): string => {
  const { decimalPlaces, unit } = chartMetricDetails[metric];
  return `${value.toFixed(decimalPlaces)}${unit}`;
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

export const getLatestTimestamp = ({
  indoorMeasures,
  outdoorMeasures,
}: {
  indoorMeasures: Measure[];
  outdoorMeasures: Measure[];
}): number | null => {
  const timestamps = [...indoorMeasures, ...outdoorMeasures].map((measure) =>
    new Date(measure.measuredAt).getTime(),
  );

  return timestamps.length === 0 ? null : Math.max(...timestamps);
};

export const getRangeExtrema = ({
  measures,
  metric,
}: {
  measures: Measure[];
  metric: WeatherMetric;
}): { low: number; high: number } | null => {
  if (measures.length === 0) {
    return null;
  }

  const values = measures.map((measure) => measure[metric]);
  return { low: Math.min(...values), high: Math.max(...values) };
};

export const downsampleMeasures = ({
  measures,
  metric,
  maximumBuckets = 900,
}: {
  measures: Measure[];
  metric: WeatherMetric;
  maximumBuckets?: number;
}): Measure[] => {
  if (measures.length <= maximumBuckets * 2) {
    return measures;
  }

  const bucketSize = Math.ceil(measures.length / maximumBuckets);
  const samples = new Map<string, Measure>();

  for (let start = 0; start < measures.length; start += bucketSize) {
    const bucket = measures.slice(start, start + bucketSize);
    const lowest = bucket.reduce((result, measure) =>
      measure[metric] < result[metric] ? measure : result,
    );
    const highest = bucket.reduce((result, measure) =>
      measure[metric] > result[metric] ? measure : result,
    );

    samples.set(lowest.id, lowest);
    samples.set(highest.id, highest);
  }

  return [...samples.values()].sort(
    (first, second) =>
      new Date(first.measuredAt).getTime() -
      new Date(second.measuredAt).getTime(),
  );
};

export const getSignalPercentage = (signalPowerDBM: number): number =>
  Math.round(Math.max(0, Math.min(100, ((signalPowerDBM + 100) / 50) * 100)));
