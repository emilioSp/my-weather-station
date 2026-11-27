// Format weather metric values for dashboard cards and chart readouts.
import { chartMetricDetails, type WeatherMetric } from '#utils/weather-metrics.ts';

type FormatMeasurementValueInput = {
  value: number;
  metric: WeatherMetric;
};

export const formatMeasurementValue = ({ value, metric }: FormatMeasurementValueInput): string => {
  const { decimalPlaces, unit } = chartMetricDetails[metric];

  return `${value.toFixed(decimalPlaces)}${unit}`;
};
