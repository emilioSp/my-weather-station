// Resolve weather measurement read requests before querying PostgreSQL.
import { readChartHistory, readLatestMeasure } from '#repository/measurement.repository.ts';
import type { ChartHistoryQuery } from '#schema/measurement.schema.ts';

// TODO: Use a measurement response type shared with the UI when it switches to this API.
export const getLatestMeasure = async (deviceName: string) => readLatestMeasure(deviceName);

// TODO: Use a chart history response type shared with the UI when it switches to this API.
export const getChartHistory = async ({ start_date, end_date }: ChartHistoryQuery) => {
  const now = Temporal.Now.instant();
  const end = end_date && Temporal.Instant.compare(end_date, now) < 0 ? end_date : now;
  const cutoff = end.subtract({ hours: 31 * 24 });
  const start = Temporal.Instant.compare(start_date, cutoff) < 0 ? cutoff : start_date;

  return readChartHistory({ start, end });
};
