// Read weather measurements from PostgreSQL without changing their JSON keys.
import type { MeterType } from '@wx/shared';
import database from '@wx/shared/db.ts';

type MeasurementJson = {
  id: string;
  device_id: string | null;
  device_type: MeterType;
  device_name: string;
  address: string | null;
  measured_at: string;
  temperature: number;
  humidity: number;
  dew_point: number;
  heat_index: number;
  battery: number;
  signal_power_dbm: number;
};

export const readLatestMeasure = async (deviceName: string) => {
  const { rows } = await database.getClient().raw<{ rows: { measure: MeasurementJson }[] }>(
    `SELECT to_jsonb(measures) AS measure
     FROM measures
     WHERE device_name = ?
     ORDER BY measured_at DESC
     LIMIT 1`,
    [deviceName],
  );

  return rows[0]?.measure ?? null;
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
    .raw<{ rows: { history: Record<string, MeasurementJson[]> }[] }>(
      'SELECT public.get_chart_history(?::timestamptz, ?::timestamptz) AS history',
      [startAt, endAt],
    );

  return rows[0].history;
};
