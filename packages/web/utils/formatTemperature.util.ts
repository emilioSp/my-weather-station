// Format temperatures with their selected unit for dashboard display.
import { convertTemperature } from '#utils/convertTemperature.util.ts';
import { TEMPERATURE_UNITS, type TemperatureUnit } from '#utils/temperature-unit.util.ts';

type FormatTemperatureInput = {
  celsius: number;
  unit: TemperatureUnit;
  decimalPlaces?: number;
};

export const formatTemperature = ({
  celsius,
  unit,
  decimalPlaces = 1,
}: FormatTemperatureInput): string =>
  `${convertTemperature({ celsius, unit }).toFixed(decimalPlaces)}°${unit === TEMPERATURE_UNITS.CELSIUS ? 'C' : 'F'}`;
