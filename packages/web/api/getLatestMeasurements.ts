// Fetch the latest stored readings for the dashboard's configured devices.
import { requestWeatherApi } from '#api/utils/requestWeatherApi.util.ts';
import type { LatestMeasurements } from '#types.ts';

export const getLatestMeasurements = async (deviceNames: string[]): Promise<LatestMeasurements> =>
  requestWeatherApi<LatestMeasurements>({
    endpoint: '/get-latest-measure',
    query: deviceNames.map((deviceName) => ['device_names', deviceName]),
  });
