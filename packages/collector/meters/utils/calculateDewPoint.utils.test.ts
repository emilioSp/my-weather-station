import { describe, expect, it } from 'vitest';
import { calculateDewPoint } from '#meters/utils/calculateDewPoint.util.ts';

describe('calculateDewPoint', () => {
  it('it returns the correct dew point', () => {
    expect(calculateDewPoint({ humidity: 20, temperature: 12 })).toEqual(-10.3);
  });
});
