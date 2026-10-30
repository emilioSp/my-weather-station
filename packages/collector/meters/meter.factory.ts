// Select the configured meter strategy when initializing collector reads.

import { METER_TYPES, type MeterType } from '@wx/shared';

import { IndoorMeter } from '#meters/IndoorMeter.ts';
import { OutdoorMeter } from '#meters/OutdoorMeter.ts';
import type { Meter, MeterInterface } from '#types.ts';

function assertMeterType(type: unknown): asserts type is MeterType {
  if (type !== METER_TYPES.OUTDOOR && type !== METER_TYPES.INDOOR) {
    throw new Error(`Unknown meter type ${type}`);
  }
}

export const createMeter = (meter: Meter): MeterInterface => {
  assertMeterType(meter.type);

  return meter.type === METER_TYPES.OUTDOOR ? new OutdoorMeter(meter) : new IndoorMeter(meter);
};
