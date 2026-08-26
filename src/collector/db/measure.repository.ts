import type {
  Advertisement,
  Measure,
  Meter,
  WeatherReading,
} from '../types.ts';
import db from './db.ts';

type StoreMeasureInput = Pick<Meter, 'type'> &
  Pick<Advertisement, 'deviceId' | 'address'> &
  WeatherReading;

export const storeMeasure = async ({
  deviceId,
  address,
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
      address,
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
