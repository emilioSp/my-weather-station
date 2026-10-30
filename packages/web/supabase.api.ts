// Query stored measurements through the browser's shared Supabase client.
import { createClient } from '@supabase/supabase-js';

import { environment } from '#environment.ts';
import type { MeasureHistoryQueryResult, MeasureQueryResult } from '#types.ts';
import { toMeasureHistory } from '#utils/toMeasureHistory.util.ts';
import { toMeasureResult } from '#utils/toMeasureResult.util.ts';

type GetLatestMeasureInput = {
  deviceName: string;
};

type GetChartHistoryInput = {
  measuredAfter: Temporal.Instant;
  measuredBefore: Temporal.Instant;
};

export class SupabaseApi {
  private readonly client = createClient(
    environment.SUPABASE_URL,
    environment.SUPABASE_PUBLISHABLE_KEY,
  );

  public async getLatestMeasure({
    deviceName,
  }: GetLatestMeasureInput): Promise<MeasureQueryResult> {
    const { data, error } = await this.client
      .from('measures')
      .select('*')
      .eq('device_name', deviceName)
      .order('measured_at', { ascending: false })
      .limit(1);

    return toMeasureResult({ data, error });
  }

  public async getLatestMeasures(): Promise<MeasureQueryResult> {
    const results = await Promise.all(
      environment.DEVICES.map(({ deviceName }) => this.getLatestMeasure({ deviceName })),
    );

    return {
      rows: results.flatMap(({ rows }) => rows),
      error: results.find(({ error }) => error !== null)?.error ?? null,
    };
  }

  public async getChartHistory({
    measuredAfter,
    measuredBefore,
  }: GetChartHistoryInput): Promise<MeasureHistoryQueryResult> {
    const { data, error } = await this.client.rpc('get_chart_history', {
      p_start: measuredAfter.toString({ smallestUnit: 'millisecond' }),
      p_end: measuredBefore.toString({ smallestUnit: 'millisecond' }),
    });

    return { history: toMeasureHistory(data), error };
  }
}

export default new SupabaseApi();
