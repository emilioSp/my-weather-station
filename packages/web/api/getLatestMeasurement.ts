// Fetch the latest stored measurement for a device when loading current dashboard readings.
import type { Measurement } from '@wx/shared';

import { requestWeatherApi } from '#api/utils/requestWeatherApi.util.ts';
import { toWeatherApiError } from '#api/utils/toWeatherApiError.util.ts';
import type { LatestMeasurementQueryResult } from '#types.ts';

export const getLatestMeasurement = async (
  deviceName: string,
): Promise<LatestMeasurementQueryResult> => {
  try {
    const measurement = await requestWeatherApi<Measurement | null>({
      endpoint: '/get-latest-measure',
      query: { device_name: deviceName },
    });

    return { measurement, error: null };
  } catch (cause) {
    return { measurement: null, error: toWeatherApiError(cause) };
  }
};
