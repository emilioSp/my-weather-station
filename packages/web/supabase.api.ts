import { createClient } from '@supabase/supabase-js';
import { type Measure, toCamelCaseKeys } from '@wx/shared';
import { environment } from '#environment.ts';

const supabase = createClient(
  environment.SUPABASE_URL,
  environment.SUPABASE_PUBLISHABLE_KEY,
);

export type MeasureQueryResult = {
  rows: Measure[];
  error: Error | null;
};

export type MeasureHistory = Record<string, Measure[]>;

export type MeasureHistoryQueryResult = {
  history: MeasureHistory;
  error: Error | null;
};

type GetMeasuresInput = {
  deviceName: string;
};

type GetChartHistoryInput = {
  measuredAfter: Date;
  measuredBefore: Date;
};

export const toMeasureResult = ({
  data,
  error,
}: {
  data: unknown;
  error: Error | null;
}): MeasureQueryResult => ({
  rows: toCamelCaseKeys<Measure[]>(data ?? []),
  error,
});

export const toMeasureHistory = (data: unknown): MeasureHistory =>
  toCamelCaseKeys<MeasureHistory>(data ?? {});

export const getLatestMeasure = async ({
  deviceName,
}: GetMeasuresInput): Promise<MeasureQueryResult> => {
  const { data, error } = await supabase
    .from('measures')
    .select('*')
    .eq('device_name', deviceName)
    .order('measured_at', { ascending: false })
    .limit(1);

  return toMeasureResult({ data, error });
};

export const getLatestMeasures = async (): Promise<MeasureQueryResult> => {
  const results = await Promise.all(
    environment.DEVICES.map(({ deviceName }) =>
      getLatestMeasure({ deviceName }),
    ),
  );

  return {
    rows: results.flatMap(({ rows }) => rows),
    error: results.find(({ error }) => error !== null)?.error ?? null,
  };
};

export const getChartHistory = async ({
  measuredAfter,
  measuredBefore,
}: GetChartHistoryInput): Promise<MeasureHistoryQueryResult> => {
  const { data, error } = await supabase.rpc('get_chart_history', {
    p_start: measuredAfter.toISOString(),
    p_end: measuredBefore.toISOString(),
  });

  return {
    history: toMeasureHistory(data),
    error,
  };
};
