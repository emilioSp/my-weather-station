// Read weather measurements from PostgreSQL without changing their JSON keys.
import type { Measurement } from '@wx/shared';
import database from '@wx/shared/db.ts';

export const readLatestMeasurement = async (deviceName: string) => {
  const { rows } = await database.getClient().raw<{ rows: { measurement: Measurement }[] }>(
    `SELECT to_jsonb(measures) AS measurement
     FROM measures
     WHERE device_name = ?
     ORDER BY measured_at DESC
     LIMIT 1`,
    [deviceName],
  );

  return rows[0]?.measurement ?? null;
};

type ReadChartHistoryInput = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};

export const readChartHistory = async ({ start, end }: ReadChartHistoryInput) => {
  // Round inward to PostgreSQL's microsecond precision so a bound cannot admit an out-of-range reading.
  const startAt = start.toString({ smallestUnit: 'microsecond', roundingMode: 'ceil' });
  const endAt = end.toString({ smallestUnit: 'microsecond', roundingMode: 'floor' });

  const { rows } = await database
    .getClient()
    .raw<{ rows: { history: Record<string, Measurement[]> }[] }>(
      'SELECT public.get_chart_history(?::timestamptz, ?::timestamptz) AS history',
      [startAt, endAt],
    );

  return rows[0].history;
};
