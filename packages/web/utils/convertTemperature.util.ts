// Convert Celsius readings to the selected dashboard temperature unit.
import { TEMPERATURE_UNITS, type TemperatureUnit } from '#utils/temperature-unit.util.ts';

type ConvertTemperatureInput = {
  celsius: number;
  unit: TemperatureUnit;
};

export const convertTemperature = ({ celsius, unit }: ConvertTemperatureInput): number =>
  unit === TEMPERATURE_UNITS.FAHRENHEIT ? celsius * 1.8 + 32 : celsius;
