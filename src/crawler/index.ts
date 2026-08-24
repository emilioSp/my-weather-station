import { environment } from './environment.ts';
import { createMeter } from './meter.factory.ts';
import type { Meter, WeatherReading } from './types.ts';

type MeterReading = WeatherReading & Meter;

const readMeter = async (meterConfig: Meter): Promise<MeterReading> => {
  const meter = createMeter(meterConfig);
  const reading = await meter.read();
  return { ...meter.getMeter(), ...reading };
};

const run = async (): Promise<void> => {
  const readings: MeterReading[] = [];

  for (const meter of environment.DEVICES) {
    readings.push(await readMeter(meter));
  }

  console.log(JSON.stringify(readings, null, 2));
};

try {
  await run();
  process.exit(0);
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
