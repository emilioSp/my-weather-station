import { setTimeout } from 'node:timers/promises';
import type { Measure } from '@wx/shared';
import { closeDatabaseConnection } from './db/db.ts';
import { environment } from './environment.ts';
import NoCompleteReadingError from './errors/NoCompleteReadingError.ts';
import { createMeter } from './meters/meter.factory.ts';
import type { Meter } from './types.ts';

const readMeter = async (meterConfig: Meter): Promise<Measure> => {
  const meter = createMeter(meterConfig);
  return meter.read();
};

const run = async (): Promise<void> => {
  const measures: Measure[] = [];

  console.log(
    Temporal.Now.instant()
      .toZonedDateTimeISO('Europe/Rome')
      .toString({ smallestUnit: 'seconds' }),
  );
  for (const meter of environment.DEVICES) {
    try {
      measures.push(await readMeter(meter));
    } catch (error) {
      if (error instanceof NoCompleteReadingError) {
        console.error(error);
        continue;
      }
      throw error;
    }
  }

  console.log(JSON.stringify(measures, null, 2));
};

const FIVE_MINUTES = 300_000;

try {
  while (true) {
    await run();
    console.log(`sleep ${FIVE_MINUTES}ms`);
    console.log(
      `---------------------------------------------------------------------------------------`,
    );
    await setTimeout(FIVE_MINUTES);
  }
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await closeDatabaseConnection();
  process.exit(0);
}
