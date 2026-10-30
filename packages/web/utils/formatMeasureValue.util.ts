// Format weather metric values for dashboard cards and chart readouts.
import { chartMetricDetails, type WeatherMetric } from '#utils/weather-metrics.ts';

type FormatMeasureValueInput = {
  value: number;
  metric: WeatherMetric;
};

export const formatMeasureValue = ({ value, metric }: FormatMeasureValueInput): string => {
  const { decimalPlaces, unit } = chartMetricDetails[metric];

  return `${value.toFixed(decimalPlaces)}${unit}`;
};
