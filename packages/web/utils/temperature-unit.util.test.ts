import { describe, expect, it } from 'vitest';
import {
  convertTemperature,
  TEMPERATURE_UNITS,
} from '#utils/temperature-unit.util.ts';

describe('Temperature unit.util', () => {
  it('converts fahrenheit to celsius', () => {
    expect(
      convertTemperature({ celsius: 20, unit: TEMPERATURE_UNITS.FAHRENHEIT }),
    ).toEqual(68);
  });
});
