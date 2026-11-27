// Persist complete BLE readings and return the stored measurement row.

import type { Measurement, WeatherReading } from '@wx/shared';
import database from '@wx/shared/db.ts';

import type { Advertisement, Meter } from '#types.ts';

type StoreMeasurementInput = Pick<Meter, 'type' | 'deviceName'> &
  Pick<Advertisement, 'deviceId' | 'address'> &
  WeatherReading;

export const storeMeasurement = async ({
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
}: StoreMeasurementInput): Promise<Measurement> => {
  const [storedMeasurement] = await database
    .getClient()<Measurement>('measures')
    .insert({
      device_id: deviceId,
      address,
      device_name: deviceName,
      device_type: deviceType,
      temperature,
      dew_point: dewPoint,
      heat_index: heatIndex,
      humidity,
      battery,
      signal_power_dbm: signalPowerDBM,
    })
    .returning('*');

  return storedMeasurement;
};
