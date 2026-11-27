// Fetch measurements grouped by device when loading a dashboard chart range.
import { requestWeatherApi } from '#api/utils/requestWeatherApi.util.ts';
import type { MeasurementHistory } from '#types.ts';

type GetChartHistoryInput = {
  measuredAfter: Date;
  measuredBefore: Date;
};

export const getChartHistory = async ({
  measuredAfter,
  measuredBefore,
}: GetChartHistoryInput): Promise<MeasurementHistory> =>
  requestWeatherApi<MeasurementHistory>({
    endpoint: '/get-chart-history',
    query: { start_date: measuredAfter.toISOString(), end_date: measuredBefore.toISOString() },
  });
