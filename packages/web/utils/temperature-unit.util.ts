// Validate and format temperature units for dashboard display and browser storage.
export const TEMPERATURE_UNITS = {
  CELSIUS: 'celsius',
  FAHRENHEIT: 'fahrenheit',
} as const;

export const temperatureUnits = [TEMPERATURE_UNITS.CELSIUS, TEMPERATURE_UNITS.FAHRENHEIT] as const;

export type TemperatureUnit = (typeof temperatureUnits)[number];

export const isTemperatureUnit = (value: unknown): value is TemperatureUnit =>
  temperatureUnits.some((unit) => unit === value);
