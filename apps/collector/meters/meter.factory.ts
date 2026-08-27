import type { Meter, MeterInterface } from '#types.ts';
import { IndoorMeter } from './IndoorMeter.ts';
import { OutdoorMeter } from './OutdoorMeter.ts';

export const createMeter = (meter: Meter): MeterInterface => {
  if (meter.type === 'outdoor') return new OutdoorMeter(meter);
  if (meter.type === 'indoor') return new IndoorMeter(meter);

  throw new Error(`Unknown meter type ${meter.type}`);
};
