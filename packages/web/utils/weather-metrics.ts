// Define supported weather metrics and their chart display details.
export const WEATHER_METRICS = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  DEW_POINT: 'dewPoint',
} as const;

export type WeatherMetric = (typeof WEATHER_METRICS)[keyof typeof WEATHER_METRICS];

export const chartMetricDetails: Record<
  WeatherMetric,
  { label: string; unit: string; decimalPlaces: number }
> = {
  temperature: { label: 'Temperature', unit: '°C', decimalPlaces: 1 },
  humidity: { label: 'Humidity', unit: '%', decimalPlaces: 0 },
  dewPoint: { label: 'Dew point', unit: '°C', decimalPlaces: 1 },
};
