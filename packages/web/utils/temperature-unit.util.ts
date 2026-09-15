export const TEMPERATURE_UNITS = {
  CELSIUS: 'celsius',
  FAHRENHEIT: 'fahrenheit',
} as const;

export const temperatureUnits = [
  TEMPERATURE_UNITS.CELSIUS,
  TEMPERATURE_UNITS.FAHRENHEIT,
] as const;

export type TemperatureUnit = (typeof temperatureUnits)[number];

export const isTemperatureUnit = (value: unknown): value is TemperatureUnit =>
  temperatureUnits.includes(value as TemperatureUnit);

export const convertTemperature = ({
  celsius,
  unit,
}: {
  celsius: number;
  unit: TemperatureUnit;
}): number =>
  unit === TEMPERATURE_UNITS.FAHRENHEIT ? celsius * 1.8 + 32 : celsius;

export const formatTemperature = ({
  celsius,
  unit,
  decimalPlaces = 1,
}: {
  celsius: number;
  unit: TemperatureUnit;
  decimalPlaces?: number;
}): string =>
  `${convertTemperature({ celsius, unit }).toFixed(decimalPlaces)}°${unit === TEMPERATURE_UNITS.CELSIUS ? 'C' : 'F'}`;
