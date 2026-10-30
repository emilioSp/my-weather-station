// Format weather metric values for dashboard cards and chart readouts.
import { formatTemperature } from '#utils/formatTemperature.util.ts';
import { TEMPERATURE_UNITS, type TemperatureUnit } from '#utils/temperature-unit.util.ts';
import { chartMetricDetails, WEATHER_METRICS, type WeatherMetric } from '#utils/weather-metrics.ts';

type FormatMeasureValueInput = {
  value: number;
  metric: WeatherMetric;
  temperatureUnit?: TemperatureUnit;
};

export const formatMeasureValue = ({
  value,
  metric,
  temperatureUnit = TEMPERATURE_UNITS.CELSIUS,
}: FormatMeasureValueInput): string => {
  const { decimalPlaces, unit } = chartMetricDetails[metric];

  return metric === WEATHER_METRICS.HUMIDITY
    ? `${value.toFixed(decimalPlaces)}${unit}`
    : formatTemperature({
        celsius: value,
        unit: temperatureUnit,
        decimalPlaces,
      });
};
