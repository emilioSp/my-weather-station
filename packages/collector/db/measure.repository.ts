// Persist complete measurements and map stored rows at the collector database boundary.

import type { Measure, WeatherReading } from '@wx/shared';
import { toCamelCaseKeys } from '@wx/shared/utils/toCamelCaseKeys.util.ts';
import { toSnakeCaseKeys } from '@wx/shared/utils/toSnakeCaseKeys.util.ts';

import database from '#db/db.ts';
import type { Advertisement, Meter } from '#types.ts';

type StoreMeasureInput = Pick<Meter, 'type' | 'deviceName'> &
  Pick<Advertisement, 'deviceId' | 'address'> &
  WeatherReading;

export const storeMeasure = async ({
  deviceId,
  address,
  deviceName,
  type: deviceType,
  temperature,
  dewPoint,
  heatIndex,
  humidity,
  battery,
  signalPowerDBM,
}: StoreMeasureInput): Promise<Measure> => {
  const [storedMeasure] = await database
    .getClient()('measures')
    .insert(
      toSnakeCaseKeys({
        deviceId,
        address,
        deviceName,
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
