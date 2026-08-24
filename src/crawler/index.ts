import { environment } from './environment.ts';
import { readOutdoorMeter } from './outdoorMeter.service.ts';
import type { Meter, WeatherReading } from './types.ts';

type MeterReading = WeatherReading & Pick<Meter, 'deviceId'>;

const readMeter = async ({ deviceId, type }: Meter): Promise<MeterReading> => {
  if (type !== 'outdoor') {
    throw new Error(`Meter type "${type}" is not supported yet`);
  }

  const reading = await readOutdoorMeter(deviceId);
  return { deviceId, ...reading };
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
