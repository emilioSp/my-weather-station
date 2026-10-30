// Verify temperature conversion, unit validation, and display formatting during web checks.

import { describe, expect, it } from 'vitest';

import {
  convertTemperature,
  formatTemperature,
  isTemperatureUnit,
  TEMPERATURE_UNITS,
} from '#utils/temperature-unit.util.ts';

describe('Temperature unit.util', () => {
  it('given 20 degrees Celsius when converting temperatures then returns 68 Fahrenheit or 20 Celsius', () => {
    expect(convertTemperature({ celsius: 20, unit: TEMPERATURE_UNITS.FAHRENHEIT })).toEqual(68);
    expect(convertTemperature({ celsius: 20, unit: TEMPERATURE_UNITS.CELSIUS })).toEqual(20);
  });

  it('given Celsius Fahrenheit and Kelvin when validating and formatting units then rejects Kelvin and formats supported units', () => {
    expect(isTemperatureUnit('celsius')).toBe(true);
    expect(isTemperatureUnit('kelvin')).toBe(false);
    expect(
      formatTemperature({
        celsius: 20,
        unit: TEMPERATURE_UNITS.FAHRENHEIT,
        decimalPlaces: 0,
      }),
    ).toBe('68°F');
    expect(formatTemperature({ celsius: 20, unit: TEMPERATURE_UNITS.CELSIUS })).toBe('20.0°C');
  });
});
