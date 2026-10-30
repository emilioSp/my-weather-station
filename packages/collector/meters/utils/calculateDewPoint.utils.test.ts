// Verify dew point calculation during collector utility checks.

import { describe, expect, it } from 'vitest';

import { calculateDewPoint } from '#meters/utils/calculateDewPoint.util.ts';

describe('calculateDewPoint', () => {
  it('given 20 percent humidity and 12 degrees Celsius when calculating dew point then returns minus 10.3 degrees', () => {
    expect(calculateDewPoint({ humidity: 20, temperature: 12 })).toEqual(-10.3);
  });
});
