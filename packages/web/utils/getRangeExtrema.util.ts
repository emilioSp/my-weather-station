// Select metric extrema and earliest tied dates for dashboard history charts.
import type { Measure } from '@wx/shared';

import type { WeatherMetric } from '#utils/weather-metrics.ts';

export type RangeExtrema = {
  low: number;
  high: number;
  lowMeasuredAt: string;
  highMeasuredAt: string;
};

type GetRangeExtremaInput = {
  measures: Measure[];
  metric: WeatherMetric;
};

export const getRangeExtrema = ({
  measures,
  metric,
}: GetRangeExtremaInput): RangeExtrema | null => {
  if (measures.length === 0) {
    return null;
  }

  const { low, high } = measures.reduce(
    (result, measure) => {
      const isEarlierThanLow =
        Temporal.Instant.from(measure.measuredAt).epochMilliseconds <
        Temporal.Instant.from(result.low.measuredAt).epochMilliseconds;

      const isEarlierThanHigh =
        Temporal.Instant.from(measure.measuredAt).epochMilliseconds <
        Temporal.Instant.from(result.high.measuredAt).epochMilliseconds;

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
