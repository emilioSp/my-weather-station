import type { Measure, Meter, WeatherReading } from '../types.ts';
import db from './db.ts';

type StoreMeasureInput = Meter & WeatherReading;

export const storeMeasure = async ({
  deviceId,
  type: deviceType,
  temperature,
  dewPoint,
  heatIndex,
  humidity,
  battery,
  signalPowerDBM,
}: StoreMeasureInput): Promise<Measure> => {
  const [storedMeasure]: Measure[] = await db('measures')
    .insert({
      deviceId,
      deviceType,
      temperature,
      dewPoint,
      heatIndex,
      humidity,
      battery,
      signalPowerDBM,
    })
    .returning('*');

  return storedMeasure;
};
