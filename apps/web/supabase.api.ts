import { createClient } from '@supabase/supabase-js';
import { type Measure, type MeterType, toCamelCaseKeys } from '@wx/shared';
import { environment } from '#environment.ts';

const supabase = createClient(
  environment.VITE_SUPABASE_URL,
  environment.VITE_SUPABASE_PUBLISHABLE_KEY,
);

export type MeasureQueryResult = {
  rows: Measure[];
  error: Error | null;
};

export type MeasureHistory = {
  indoor: Measure[];
  outdoor: Measure[];
};

export type MeasureHistoryQueryResult = {
  history: MeasureHistory;
  error: Error | null;
};

type GetMeasuresInput = {
  deviceType: MeterType;
};

type GetChartHistoryInput = {
  measuredAfter: Date;
  measuredBefore: Date;
};

const toMeasureResult = ({
  data,
  error,
}: {
  data: unknown;
  error: Error | null;
}): MeasureQueryResult => ({
  rows: toCamelCaseKeys<Measure[]>(data ?? []),
  error,
});

export const getLatestMeasure = async ({
  deviceType,
}: GetMeasuresInput): Promise<MeasureQueryResult> => {
  const { data, error } = await supabase
    .from('measures')
    .select('*')
    .eq('device_type', deviceType)
    .order('measured_at', { ascending: false })
    .limit(1);

  return toMeasureResult({ data, error });
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
    history: toCamelCaseKeys<MeasureHistory>(
      data ?? { indoor: [], outdoor: [] },
    ),
    error,
  };
};
