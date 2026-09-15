import { describe, expect, it } from 'vitest';
import {
  convertTemperature,
  formatTemperature,
  isTemperatureUnit,
  TEMPERATURE_UNITS,
} from '#utils/temperature-unit.util.ts';

describe('Temperature unit.util', () => {
  it('converts temperatures for the selected unit', () => {
    expect(
      convertTemperature({ celsius: 20, unit: TEMPERATURE_UNITS.FAHRENHEIT }),
    ).toEqual(68);
    expect(
      convertTemperature({ celsius: 20, unit: TEMPERATURE_UNITS.CELSIUS }),
    ).toEqual(20);
  });

  it('recognizes and formats supported temperature units', () => {
    expect(isTemperatureUnit('celsius')).toBe(true);
    expect(isTemperatureUnit('kelvin')).toBe(false);
    expect(
      formatTemperature({
        celsius: 20,
        unit: TEMPERATURE_UNITS.FAHRENHEIT,
        decimalPlaces: 0,
      }),
    ).toBe('68°F');
    expect(
      formatTemperature({ celsius: 20, unit: TEMPERATURE_UNITS.CELSIUS }),
    ).toBe('20.0°C');
  });
});
