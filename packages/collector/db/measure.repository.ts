import type { Measure, WeatherReading } from '@wx/shared';
import { toCamelCaseKeys, toSnakeCaseKeys } from '@wx/shared';
import db from '#db/db.ts';
import type { Advertisement, Meter } from '#types.ts';

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
  const [storedMeasure] = await db('measures')
    .insert(
      toSnakeCaseKeys({
        deviceId,
        address,
        deviceType,
        temperature,
        dewPoint,
        heatIndex,
        humidity,
        battery,
        signalPowerDBM,
      }),
    )
    .returning('*');

  return toCamelCaseKeys<Measure>(storedMeasure);
};
