// Select metric extrema and earliest tied dates for dashboard history charts.
import type { Measurement } from '@wx/shared';

import type { WeatherMetric } from '#utils/weather-metrics.ts';

export type RangeExtrema = {
  low: number;
  high: number;
  lowMeasuredAt: string;
  highMeasuredAt: string;
};

type GetRangeExtremaInput = {
  measurements: Measurement[];
  metric: WeatherMetric;
};

export const getRangeExtrema = ({
  measurements,
  metric,
}: GetRangeExtremaInput): RangeExtrema | null => {
  if (measurements.length === 0) {
    return null;
  }

  const { low, high } = measurements.reduce(
    (result, measurement) => {
      const isEarlierThanLow =
        Date.parse(measurement.measured_at) < Date.parse(result.low.measured_at);

      const isEarlierThanHigh =
        Date.parse(measurement.measured_at) < Date.parse(result.high.measured_at);

      return {
        low:
          measurement[metric] < result.low[metric] ||
          (measurement[metric] === result.low[metric] && isEarlierThanLow)
            ? measurement
            : result.low,
        high:
          measurement[metric] > result.high[metric] ||
          (measurement[metric] === result.high[metric] && isEarlierThanHigh)
            ? measurement
            : result.high,
      };
    },
    { low: measurements[0], high: measurements[0] },
  );

  return {
    low: low[metric],
    high: high[metric],
    lowMeasuredAt: low.measured_at,
    highMeasuredAt: high.measured_at,
  };
};
